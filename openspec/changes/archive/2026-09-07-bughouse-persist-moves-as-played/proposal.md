## Why

**A bughouse game does not survive a server restart, and it fails in the worst possible way: it comes
back empty.**

Every other variant persists each move as it is played. `Game.save_move()` runs inside `play_move()`
on every ply and is built for exactly this: `$push` rather than `$set` so the payload is O(1)
whatever the game length, a compare-and-set filter on the previous FEN and the ply indices so a
duplicated or concurrent write cannot corrupt the record, and per-ply clock history, with
`save_game()` overwriting the authoritative arrays at the end.

`GameBug` has none of it. `save_game()` is its only writer, guarded by `if self.saved: return` and
reached only from `game_ended()`. From creation until termination the document holds what was
inserted at the start: `"m": []`.

The consequence is not that the game is lost. It is restored — `init_from_db` matches it, because the
insert writes `"r": R2C["*"]` which is `"d"`, exactly what `active_game_filter` looks for, and
`"s"` is STARTED. `load_game_bug_from_doc` then decodes `doc["m"]`, which is empty, and
`gameClocks.restart("a")` starts the clocks. **Four clients reconnect successfully to a game that
believes it is at ply 0 with full clocks.** Every mechanism on the client is built to trust the
snapshot, so it will accept the rollback and discard the real game; the resend cache will then offer
the server a move from a position it no longer knows about.

A silent rollback is worse than a failure, and this one is a bughouse-only gap in a mechanism the
platform already has, uses and has hardened.

## What Changes

- Persist each bughouse move as it is played, one write per ply, so a restored game resumes where it
  was rather than at the start.
- **Asynchronously, but in order.** The in-memory game stays the authority and the move response is
  not delayed by a database round trip. Ordering is not optional: moves applied out of order produce
  a document that decodes to a different game.
- **The accepted risk, stated deliberately**: a restart between a move and its persistence loses that
  move, and the game resumes one ply behind. That is a bounded, comprehensible failure — someone's
  move is reverted — and it is preferred to paying database latency on every move.
- If ordered asynchrony proves awkward, do it synchronously and accept the latency. Simplicity first;
  the single-board path is already synchronous and nobody has complained.
- Persist what a bughouse game actually needs: both boards' positions, the board each ply belongs to,
  and both boards' clock history. `save_game()` already computes all of it — it just does so once.

## Impact

- `server/bug/game_bug.py` — a per-ply writer beside `save_game()`, and the ordering machinery.
- `server/bug/utils_bug.py` — `play_move()`, which is where a ply becomes a fact.
- `server/bug/game_bug_clocks.py` — per-ply clock values, already computed for the end-of-game write.
- `load_game_bug_from_doc` — verify it reconstructs from a partial document, which it has never had
  to do.
- No client change. The client's side of this is `reconnect-sync-controller`, which should refuse a
  rolled-back snapshot whatever the server does.

## Capabilities

- `bughouse-clock-record`
