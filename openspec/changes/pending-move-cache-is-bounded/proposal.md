## Why

The resend cache says what bounds it, and the claim is false. `clearPendingMoves()` is documented as
the thing that "finally bounds the cache: a finished game can never accept a resend, so whatever is
left is dead weight, and the key itself goes with it" — and it is reachable from exactly one place,
`ReconnectController.gameEnded()`, which `roundCtrl.checkStatus()` calls when a final status arrives.
**That requires a page to be open on the game at the moment it ends.** Nothing sweeps the entry of a
game that ended while the reader was elsewhere, and nothing ever will, because no later page load
looks at any key but its own.

MEASURED 2026-09-12 in the four harness profiles, while finishing `reconnect-follow-ups`. Two of them
held entries for games long over:

```
p2  6 keys   bug-pending-moves:BLYVhtPZ, :EUWIZJie, :JJgZzLhJ, :PHdCmezP, :pm1Q2PCu, :sLF5O6kj
p3  11 keys  the same shape, including :4G3ZyGze, :Hr5pqpT2, :W2sRSUat, :d0cEddrd, :plDcK2Ot
```

Each holds a move that was never confirmed — a queued move whose game ended before it landed, or one
the server silently deduplicated — and each will sit in `localStorage` for as long as the profile
lives.

**WHAT IT DOES NOT COST, so the size of the fix matches the size of the problem.** Keys are per game
id, so a stale entry can never be resent into a different game: `loadPendingMoves(gameId)` reads one
key and no other. There is no wrong move waiting to happen. The cost is unbounded growth in a store
with a hard quota, and a comment that tells the next reader the opposite of the truth — which is the
part that would have cost an afternoon.

Recorded here rather than inside the archived change that found it, because a finished game's record
is a poor place to keep something nobody did.

## What Changes

- The cache SHALL be bounded by something that does not require a page to witness a game's end.
- **Which mechanism is the open question**, and the three obvious answers are not equal:
  - **Sweep on load** — a round page deletes every `bug-pending-moves:*` key but its own. Simplest,
    and wrong as stated: two tabs on two live games would each delete the other's entry, which is
    the one thing the cache exists to prevent.
  - **An age and a limit** — stamp each entry when it is written and drop entries past an age (or
    past a count) on load. Needs a field the entry does not have today, and the field is the only
    real work.
  - **Ask the server** — a page could learn that a cached game is finished and clear it. Correct and
    far too expensive for the harm.
- No change to the resend path, the matching rule, or what a confirmation does. This is about what
  happens to an entry nobody comes back for.
- The doc comment on `clearPendingMoves()` SHALL stop claiming to bound the cache on its own.

## Capabilities

### Modified Capabilities

- `two-board-reconnect-sync`: what bounds the resend cache. The existing requirements say when an
  entry is cleared by a confirmation and by a snapshot; neither covers the entry nobody returns for.

## Impact

- `client/two-board/socket/pendingMoves.ts` — `clearPendingMoves()` and its comment, the stored
  entry's shape if it gains a timestamp, and `loadPendingMoves()` if the sweep happens there.
- No server change, no protocol change, and nothing a stored game holds.

## Not in this change

- `client/result.ts`'s unknown-status fallback is a bare `'*'`, so an unrecognised status announces
  "Game over — * • X won" while `case 11` already reads "Unknown reason". Unreachable from a correct
  server — it took a deliberately doctored status to produce it on 2026-09-12 — and a one-line change
  whenever somebody is in that file. Written down only so the next person to see a `*` knows what it
  is.
