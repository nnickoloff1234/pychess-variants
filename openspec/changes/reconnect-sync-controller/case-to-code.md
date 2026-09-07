# Every branch, and the code that answers it

Task 2.2. One row per branch of the decision tree in `reconnectController.ts`, naming the code that
decides it today. The task defines two kinds of finding, and both turned up:

- **a case with no handler** — something the tree names that nothing implements;
- **a piece of current code that belongs to no case** — something that decides, without the tree
  saying it decides anything.

Line numbers are from the working tree on 2026-09-07.

## Branch 1 — a connection is established

| branch | decided by | notes |
|---|---|---|
| 1 | `sockets.ts:18` `ctrl.reconnect.socketOpened()` | the only entry; a first connection and a reconnection are the same path |
| 1.1 / 1.2 split | `reconnectController.ts:445` `decide()` via `waiting(board)` | the split is "is a move waiting", asked of both records |
| 1.1.1 the game has finished | `reconnectController.ts:424` `decide()`, `finished` flag; set by `roundCtrl.ts:687` `reconnect.gameEnded()` from `checkStatus` | |
| 1.1.2 nothing changed | `reconnectController.ts:455` `decide()` final return | shares its return with 1.1.3 and 1.2.1 — the three are one answer |
| 1.1.3 moves happened | same | |
| 1.1.4 the position went backwards | `reconnectController.ts:353` `wentBackwards()`, reported at `roundCtrl.ts:878` | added 2026-09-06; see task 3.0 |
| 1.2.1 the position contains it | `reconnectController.ts:391` `reconcile()`, `history.includes(ours)` | whole history, not the last move |
| 1.2.2 the position cannot accept it | `reconcile()`, `!playableNow(...)`; the predicate is supplied at `roundCtrl.ts:886` from `ffishBoard.legalMoves()` | the controller has no board, so legality is asked of the caller |
| 1.2.3 not contained, but playable | `decide()`, `waiting(board)` -> `playable: false` | applied at `roundCtrl.ts:923-924` by emptying the dests map |
| 1.2.3.1 the server plays it | server: `bug/utils_bug.play_move()` | the client learns of it as branch 2.2 |
| 1.2.3.2 the server stays silent | server: `lastmovePerBoardAndUser` in `game_bug.play_move()` | no message at all; the client forgets the move by seeing it in a later position (1.2.1) |
| 1.2.3.3 the server refuses it | server: the `status > STARTED` guard | |
| 1.2.3.4 the server rejects it | server: `utils_bug.play_move()` resync branch | since `bughouse-reject-invalid-move-without-ending` |

## Branch 2 — one move arrives

| branch | decided by | notes |
|---|---|---|
| 2.1 somebody else made it | `reconnectController.moveArrived()`, `mine` false | moved into the controller 2026-09-07 |
| 2.1.1 it is the next move | `moveArrived()`, `place === 'next'` | position, clocks, premove release |
| 2.1.2 it is older than what we show | `moveArrived()`, `place === 'older'` | clocks only, position untouched |
| 2.1.3 it is further ahead than the next | `moveArrived()`, `place === 'ahead'` | NEW branch — was finding 3 below; clocks only, and reported |
| 2.2 our own move comes back | `moveArrived()` -> `ourMoveCameBack()`, `mine` true | |
| 2.2.1 sent once and waited | `ourMoveCameBack()`, `consumePendingMove` false | clocks kept — unless the caller's running check fires |
| 2.2.2 sent again after a break | the same, true | clocks taken |

## Finding 1 — branch 2.1 is decided outside the controller — FIXED 2026-09-07

2.1 and 2.2 sit in the same function, twelve lines apart, and only 2.2 consults the controller
(`ownMoveConfirmed`). 2.1 answers entirely from `latestPly` and `myMove`, which are computed in
`onMsgBoard` from the message.

The tree has said this since it was written. What the audit adds is the cost, which is not
theoretical: **`seen` — the record branch 1.1.4 compares against — is fed from confirmations of our
own moves and from snapshots, and NOT from other people's moves, because those never reach the
class.** So a rollback that loses only an opponent move we were told about through 2.1 is
undetectable. The detection gap and the ownership gap are the same gap.

**FIXED.** `moveArrived(board, move, mine, place)` returns a `MoveDecision`
(`applyPosition`, `takeClocks`, `releasePremove`, `movesMissing`, `because`) and
`updateSingleBoardAndClocks` carries it out. Every move now passes through the class, so `seen` is
fed from all three sources and 1.1.4 covers an opponent's move as well as our own — asserted by
`2.1.1 somebody else's move IS remembered, so 1.1.4 can miss it later`.

The clock condition stays deliberately in two halves: the controller answers "was this resent", the
caller ORs in "is this seat's clock still running", which is a fact about a `Clock` object the
controller has never held. Task 3.4 is where that division gets settled.

## Finding 2 — the playable gate is applied in one path and not the other — FIXED 2026-09-07

`decide()` returns `playable: false` and `roundCtrl.ts:923-924` enforces it by emptying the dests
map. Nothing enforces it afterwards: `setState()` ends in `setDests()` (`gameCtrl.ts:143`), which
recomputes our legal moves from the fen it was handed. Every single-move message calls `setState`,
so **any single move re-opens the board it touches**, whatever the controller last decided. The
premove release is the same shape: gated on `decision.playable` at `:949` in the full path, ungated
at `:1026` in the single path.

**A FIRST ATTEMPT TO SHOW THIS WAS UNREACHABLE WAS WRONG, AND THE WAY IT WAS WRONG IS THE MORE
USEFUL FINDING.** The argument ran: a board is shut only while a move of ours is unacknowledged;
for the opponent to move on that board the server must think it is their turn; our move is
unacknowledged, so the server still thinks it is ours; therefore no opponent move can arrive there.

The third step is invalid. **UNACKNOWLEDGED IS A FACT ABOUT WHAT WE KNOW, NOT ABOUT WHAT THE SERVER
HOLDS.** The server may have received our move, applied it, broadcast it, and had that broadcast die
with the socket it was written to. Nothing about our own records licenses a conclusion about its
state. The only things that do are the messages it sends us.

BRANCH 1.2.3.2 ALREADY SAYS THIS — "the server stays silent (it already had that move)" — and it is
in this file's own tree, a few lines above where the argument was written. A move we are still
waiting on may be a move the server has held all along and will never mention again. Any reasoning
that assumes otherwise contradicts the enumeration it is supposed to be auditing.

**SO THE FINDING STANDS WITHOUT A REACHABILITY ARGUMENT, AND IS BETTER FOR IT.** The client cannot
know whether the board ought to re-open, because that depends on state only the server has. What it
can do is apply its own decision consistently, which is the whole premise of this change: decide
from what has arrived, never from what the other end must be thinking.

**AND THEN IT TURNED OUT TO BE REACHABLE, BY THE CHEAPEST ROUTE THERE IS.** A second attempt to
show it unreachable examined only the paths a MESSAGE can take. `goPly()` is not a message: it is
the READER, clicking a move in the list (`movelist.ts:694`) or pressing an arrow key
(`roundCtrl.ts:270-273`), and on returning to the last ply it calls `setDests()` outright. So a
player who glances at the move list while waiting for their move to be confirmed — the most natural
thing to do at exactly that moment — got their board back. Staged as scenario **R1**, which failed
before the fix:

    FAIL R1  gate_holds  shut after the snapshot, and after reading the move list: False

`locked` had been declared as a check in the bed since it was written and asserted by NO scenario,
which is why the gate had never been tested at all.

**FIXED as `GameController.movesAllowed`**, a PREDICATE consulted by `setDests()` rather than an
overwrite applied after it, so all four writers honour it and one place knows the rule. Wired once
in the round controller's constructor:

    this.boardA.movesAllowed = () => !this.isGameOver() && !this.reconnect.waiting('a');

It is the mirror of `snapshot(history, playableNow)`, where the controller borrows a board it does
not have; here a board borrows a controller it does not have. Defaults to allowing everything, so
the analysis page and every single-board game are untouched.

**ASKED, NOT STORED — and the first attempt got that wrong.** It was written as a boolean field on
the board, mirrored from the controller by a `syncMoveGates()` helper called after every
interaction with it. That is a THIRD place the same fact lives, beside the controller's records and
chessground's map, and each copy needs a moment where somebody remembers to update it. Both
problems that shape produced showed up immediately:

- setting the flag did not apply it, because `setDests()` only reads it when it runs — the first
  version set it AFTER the snapshot's own `setState()` and **Q11 regressed on the spot**;
- releasing it could not simply recompute, because `setDests()` would restore the moves of whatever
  position is showing and the reader may have scrolled back, where `goPly()` disabled the board on
  purpose. So the sync had to run BEFORE each caller's `setState()`.

Both of those are ordering rules that exist only because the answer was cached. The predicate has
no such moment: it is evaluated when the answer is needed, cannot be stale, and needs no sync calls
at all — the four were deleted and every scenario still passes. A gate that depends on somebody
remembering to refresh it is the bug being fixed, not the fix.

## Finding 3 — a case the tree does not name — FIXED 2026-09-07 as branch 2.1.3

`latestPly` for a single move is `msg.ply === this.ply + 1` (`roundCtrl.ts:1078`). That is false for
a move that is older than ours — branch 2.1.2, correctly — AND for one that is further ahead than
the next. The tree names only the first. Both get 2.1.2's answer: take the clocks, leave the
position.

Worse, `this.ply` advances only when `latestPly` (`:1080`), so a single gap latches: every later
move is also "not the next one", and the board never catches up until a full snapshot arrives.

**Reachability, honestly: low.** A websocket delivers in order and does not drop messages while it
is open, and any break that loses one ends with a reconnection, which is answered with a full board
message and recovers. It was recorded because the tree claims to be exhaustive over what a message
can be, and this was a shape it did not cover.

**FIXED.** `latestPly` is replaced, for this question, by `MovePlace = 'next' | 'older' | 'ahead'`,
computed in `onMsgBoard` before `this.ply` advances. `latestPly` keeps its own job — what the move
list scrolls to. Branch 2.1.3 takes the clocks, leaves the position, and reports; the skipped move
is deliberately NOT recorded in `seen`, or the hole just reported would become invisible to 1.1.4.

## Finding 4 — nothing else

Every other line in `updateSingleBoardAndClocks` is effect, not decision: sound, notification,
pocket repair from the partner fen, rendering. The three-way split at `onMsgBoard:1094`
(`isInitialBoardMessage || full` -> spectator or player) is dispatch, and the spectator path is
outside this tree entirely — a spectator has no move waiting and no board to shut.

## The rule the fixes converged on

Stated by Nikolay while reviewing finding 2, and it explains all three fixes better than the
"one boolean, two questions" framing did:

> **A full board message is a reset of everything the client holds, except a move waiting to be
> sent.**

Everything the client holds is a copy of something the server can restate — the position, the
pockets, the clocks, the move list, which ply is on screen. The server can hand all of it back
whenever asked. The one thing it cannot hand back is a move that never reached it, which is why
`pendingMoves` is durable and why `reconcile()` exists to decide that move's fate rather than
letting the snapshot silently overwrite it.

Read that way, `this.ply` was a straightforward violation: a copy of what the message just said,
guarded by a condition about scrolling. And `dests` was the same violation one layer down — a copy
of what the position allows, which anything could recompute without asking whether the one
exception applied.

An armed premove is the case the rule does not settle, and it is left open as task 6.3.

## What this leaves for 2.3

The enumeration is exhaustive over the state it names — is a move waiting, is the game over, does
the position contain it, can the position accept it, and now where an arriving move sits relative to
what we show. Findings 1 and 3 are fixed. **Finding 2 is the one that remains**: the playable gate is
still enforced only in the full-message path, and a single move still re-opens the board it touches
through `setState` -> `setDests`. Now that branch 2.1 is decided in the controller, the decision to
enforce there is one field away — but it is a behaviour change rather than a move, so it is not part
of task 2.2.
