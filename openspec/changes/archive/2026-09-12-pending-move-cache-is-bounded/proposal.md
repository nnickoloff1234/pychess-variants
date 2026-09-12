## Why

`clearPendingMoves()` claimed to be "what finally bounds the cache". It is not, and the claim is what
this change removes.

It runs from `ReconnectController.gameEnded()`, which a page calls on the final status it receives —
so it needs a page open on the game at the moment the game ends. Nothing in `pendingMoves.ts` looks at
any key but its own: every read and write goes through `pendingMovesStorageKey(gameId)`. A game that
ended while the reader was elsewhere therefore keeps its entry, and the comment said the opposite.

**THIS STARTED LIFE AS A BOUNDING CHANGE AND WAS CUT DOWN, SO THE INVESTIGATION IS THE POINT.**
Written on 2026-09-12 after counting 6 stale keys in one harness profile and 11 in another and calling
them proof of a live leak. Nikolay asked whether the reconnect controller had not already handled
this. It substantially had, and the keys were not proof of anything:

- **The two clearing paths that matter arrived on 2026-09-06** (`0f8794557`) — `consumePendingMove()`
  on a confirmation and `reconcilePendingMove()` when a snapshot shows the server already holds the
  move. The second closed the real defect, which was a client waiting forever for a confirmation that
  a deduplicated resend never produces, and resending on every reconnection. Before that date nothing
  cleared anything at all.
- **Every stale key traced to a game from before those paths existed**: `sLF5O6kj`, `4G3ZyGze`,
  `Hr5pqpT2`, `d0cEddrd`, `W2sRSUat` and `PHdCmezP` to the 2026-08-30 clock-record investigation,
  `JJgZzLhJ` to the 2026-08-23 analysis layout work, `pm1Q2PCu` to 2026-08-22. August residue that no
  code of its era would have cleaned — not evidence of present-day behaviour.
- **The residual gap is real and negligible.** An orphan needs all three of: a move that was never
  confirmed, a page that left before the game ended, and a reader who never opens that game again —
  reopening it clears the entry either way. It is ~150 bytes against a multi-megabyte quota, and it
  can never be resent into another game, because every read is keyed by game id.

So there is nothing to bound. What remains is a comment that sent a reader hunting for a sweep that
does not exist, which is the one thing here that actually cost an afternoon.

## What Changes

- The doc comment on `clearPendingMoves()` stops claiming to bound the cache, says what it does bound
  (this game's entry, with a page present), and records the orphan case as measured and accepted.
- **Nothing else.** No sweep, no age stamp, no count cap, no change to the resend path, the matching
  rule, or what a confirmation does. The three mechanisms this proposal originally weighed — sweep on
  load, an age or a count, ask the server — are all declined, and the reason is written above rather
  than left for someone to rediscover.

## Capabilities

None. A comment correction changes no behaviour, so there is no delta to apply: the requirement this
change first proposed — that the cache be bounded without a page to witness the end — is withdrawn
rather than met. `two-board-reconnect-sync` already states when an entry is cleared by a confirmation
and by a snapshot, and that remains the whole of the rule.

## Impact

- `client/two-board/socket/pendingMoves.ts` — the comment on `clearPendingMoves()`.
- No behaviour change, no server change, no protocol change, nothing stored differently. Archived with
  `--skip-specs` for that reason.

## Not in this change

- `client/result.ts`'s unknown-status fallback is a bare `'*'`, so an unrecognised status would
  announce "Game over — * • X won" while `case 11` already reads "Unknown reason". Unreachable from a
  correct server — it took a deliberately doctored status to produce it on 2026-09-12 — and a one-line
  change whenever somebody is next in that file.
