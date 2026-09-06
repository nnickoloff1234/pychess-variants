## Why

Reconnecting is the hardest thing this client does and the only thing it does with no name. What
happens when a socket comes back is decided in at least six places, none of which announces that
reconnection is its subject:

- `sockets.ts` `onOpen` — resends whatever the cache holds, on every open, including the first.
- `pendingMoves.ts` — a localStorage cache with four entry points (`record`, `consume`, `reconcile`,
  `clear`), each covering a case the others cannot.
- `roundCtrl.unconfirmedMove` — an in-memory field, per board, that empties the legal-move map so a
  board we are ahead of cannot be moved on.
- `onMsgBoard` — decides `latestPly` and whether this is a snapshot or a single move.
- `updateBothBoardsAndClocksOnFullBoardMsg` — reconciles the cache, applies the snapshot, and
  re-gates the boards.
- `updateClocks` — pauses both clocks before setting them, because a snapshot re-setting a running
  clock subtracts the elapsed time twice.

To answer "what happens if I reload while my move is in flight and my partner has moved twice", a
reader has to hold all six in their head at once and know which fields are set. Every one of those
places carries a comment explaining the case it handles, and the comments are good — they are the
evidence that the knowledge exists and has nowhere to live.

THE CURRENT BEHAVIOUR IS TREATED AS CORRECT. It is the product of measured incidents, each recorded
in the code: a resent move leaving the mover 63s richer than the record (`aMyeueDb`), a snapshot
double-subtracting until a board that had not moved in 19 minutes read 19 minutes short
(`4G3ZyGze`), a reconnect handing board A black 44s back (`d0cEddrd`), a premove firing into a ply
the server had passed and ending the game as INVALIDMOVE. This change is a REWRITE OF THE
EXPRESSION, not of the decisions: where the analysis finds the current code does something
surprising, the burden is on the analysis to explain why the current code is right, and only a case
it cannot explain is a candidate defect.

## What Changes

- **Enumerate the cases.** Every state the client can be in when a connection comes back, as an
  explicit list with a name each: what was pending, what the server did with it, what happened while
  we were away, and whether the page survived. Written down before any code moves.
- **One controller.** A class whose only subject is reconnection and resynchronisation. It is given
  the server's message and the client's state and it says which case this is and what follows from
  it — what to accept, what to overwrite, which clocks change and how, which moves are replayed or
  dropped, and whether each board may be moved on.
- **One or two consultation points.** The round controller asks it, rather than six places each
  deciding a piece.
- **Each case states its answer in the same terms**, so two cases can be compared by reading them
  rather than by tracing them.
- The review comment about clearing the confirmed move is addressed IN PASSING, as part of giving
  the cache one owner. The review itself is recorded in `review-pr-2323.md`, with the status of each
  of its points — both of its asks are already implemented and NEITHER IS COMMITTED.

## Impact

- `client/two-board/round/roundCtrl.ts` — `sendMove`, `onMsgBoard`, `updateBothBoardsAndClocksOnFullBoardMsg`,
  `updateSingleBoardAndClocks`, `updateClocks`, the `unconfirmedMove` field.
- `client/two-board/socket/pendingMoves.ts` — becomes the controller's storage rather than a module
  four call sites share.
- `client/two-board/socket/sockets.ts` — `onOpen` asks the controller what to send.
- No server change is planned. `handle_reconnect_bughouse` and the duplicate-move branch in
  `utils_bug.py` are inputs to the analysis, not targets.
- Behaviour is intended to be unchanged. Anything that must change is a finding, recorded with its
  case.

## Capabilities

- `two-board-reconnect-sync`
