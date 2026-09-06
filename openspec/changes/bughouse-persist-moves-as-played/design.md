# Persisting a bughouse ply

## What the one-board path does, and why each part is there

`Game.save_move(move, cur_color, previous_fen, previous_ply)`, called from `play_move()`:

- `$set` the current fen, the move time and the status; `$push` the encoded move onto `m`.
- **`$push`, not `$set`** — "single new value per ply... to keep the wire payload O(1) regardless of
  game length". The obvious implementation was considered and rejected on cost.
- **A compare-and-set filter**, which is the interesting part:

      {"_id": id, "f": previous_fen, "s": {"$lte": STARTED},
       f"m.{previous_ply}": {"$exists": False},
       f"m.{previous_ply - 1}": {"$exists": True}}

  The write applies only if the stored position is still the pre-move one, the game is unfinished,
  this ply is not already recorded, and the previous ply is. Optimistic concurrency on the document,
  and it makes a duplicate or out-of-order write a no-op rather than a corruption.
- **Per-ply clocks pushed one side at a time**, with `save_game()` writing both arrays whole at the
  end "so the document is always consistent on close".
- `pop_move_from_db()` exists for takebacks, which only makes sense if the document is expected to
  track the live game.

## What bughouse needs that differs

| | one board | bughouse |
|---|---|---|
| position | one fen | two, and the pocket state that goes with each |
| ply -> board | not needed | `o`, which board each ply belongs to |
| clocks | `cw`, `cb` | `cw`, `cb`, `cwB`, `cbB` |
| the compare-and-set anchor | `f` = previous fen | the ply index, and the fen of the board that moved |

None of it is new information: `save_game()` builds all four clock arrays and `o` today. The change
is when, not what.

## Ordering, which is the only hard part

Out-of-order writes are not a performance problem, they are a correctness one: `m` is a list decoded
positionally, so two plies applied in the wrong order decode to a different game.

Three options, in increasing order of machinery:

1. **Await it inline, as the one-board path does.** Ordering is free because `play_move()` already
   holds `game.move_lock`. Costs a database round trip inside the move handler. This is the fallback
   the proposal names, and it is what every other variant already lives with.
2. **A per-game serial queue.** One `asyncio.Queue` filled under the move lock and drained by one
   worker task per game. Ordering is structural — one producer under a lock, one consumer — and the
   move handler returns immediately. The worker is also the natural place to drain-then-finalise when
   the game ends, so `save_game()` cannot race the last ply.
3. **A chained future.** Keep the previous write's task and `await` it before starting the next.
   Fewer moving parts than a queue, but it makes every writer a link in a chain nobody owns, and a
   single failure poisons the tail.

**Recommendation: 2**, with 1 as the stated fallback. The queue is about fifteen lines and it gives
the one property that matters — order — without argument, plus a place to put the end-of-game drain.

## The accepted risk, precisely

A restart between the in-memory apply and the queued write loses that ply. The game resumes one ply
behind, the four clients hold a position one ply ahead, and the client-side rule from
`reconnect-sync-controller` sees a snapshot whose ply is LOWER than its own.

That is exactly the signal that distinguishes this from every other reconnect case, and it is why
the two changes are complements: the server makes the window small, and the client refuses to act
when it happens anyway.

**What must not happen** is the window silently widening. If the queue can grow, a slow database
turns a one-ply risk into a many-ply one. Bound it: if the queue is not empty when the next ply
arrives, that is worth a log line, and if it exceeds a small depth the writer should fall back to
awaiting inline.

## Open Questions

- Does `load_game_bug_from_doc` reconstruct correctly from a PARTIAL document — moves but no final
  clock arrays? It has never been asked to; the read-side offset correction it carries was written
  against completed games.
- Should the compare-and-set filter anchor on the global ply, the per-board ply, or both? The global
  ply is what `m` is indexed by; the per-board fen is what proves we are applying to the right board.
- Is `o` pushed per ply too, or derived? It is `0 if boardName == "a" else 1` per step, so it must be
  pushed in lockstep with `m` or the two lists drift.
