# What the client does today, as a case table

Derived by reading the shipped code, not from the comments alone. Every row names the code that
implements it. This is the picture to agree on BEFORE deciding how to express it.

## 1. The events

Only six things happen. Everything below is one of them meeting the state in section 2.

| | event | raised by |
|---|---|---|
| **E1** | the socket opens | `sockets.ts` `onOpen` — fires on the FIRST open too, not only on reconnection |
| **E2** | a board message arrives carrying MANY steps | `onMsgBoard`, `full = msg.steps.length > 1` |
| **E3** | a board message arrives carrying ONE step, made by me | `updateSingleBoardAndClocks`, `myMove` true |
| **E4** | a board message arrives carrying ONE step, made by someone else | same, `myMove` false |
| **E5** | the game ends | `checkStatus`, from a board message or `gameEnd` |
| **E6** | the player commits a move | `sendMove` |

## 2. The state a decision depends on

An earlier draft of this table had a column called "survives reload", which was a category error: it
annotated every fact with one particular event's effect on it. A reload is an event like any other.
What each fact actually has is a CLEARING SET — the events that reset it — and reload is one column
of that matrix, not a property of the state.

Two things do distinguish it, and they are narrower than "it survives":

- **It is the only clearing the client cannot observe afterwards.** Every other clearing is itself a
  fact we hold: the confirmation arrived, the game ended, the socket closed. A new page cannot tell
  "I never had a move outstanding" from "I had one and forgot".
- **It clears by mechanism, not by meaning.** Every other clearing has a reason — we drop the cache
  entry BECAUSE the server showed us the move. A reload drops whatever was in RAM, which has no
  relation to what the facts mean. Clearing by mechanism is what produces incoherent combinations,
  and that is the whole of candidate defect 1.

`E0` below is the page beginning. It is not a protocol event; it is the birth of the client, and its
only effect is that every in-memory fact starts absent.

| | fact | written by | cleared by | can the server rebuild it? |
|---|---|---|---|---|
| **F1** | position, ply, steps, status | E2, E3, E4 | E0 | **yes** — a snapshot is exactly this |
| **F2** | clock values | E2, E3, E4, E6 | E0 | **yes**, with the authority rules in section 3 |
| **F3** | a queued move for this board | E6 | E3 (confirmed), E2 (snapshot shows it), E5 (game over) | **NO — nobody can** |
| **F4** | that queued move has been resent | E1 | with F3 | no, and meaningless without F3 |
| **F5** | we are ahead of the server on this board | E6 | E3, E2-showing-it, **E0** | no — see below |
| **F6** | a premove is armed | the player | firing it, E0 | no, and losing it is acceptable |
| **F7** | we are a spectator, our seats, our colours | the page | — | yes |

**F3 is the only row that matters for persistence, and "survives reload" is not why.** It is the only
fact NO ONE ELSE HAS. The server can hand back position, ply, turn and clocks whenever we ask; it
cannot hand back a move that never reached it. That is the justification for the durable cache, and
it does not mention reload.

**F5 is where the incoherence lives.** Its clearing set contains E0, and E0 is in no other row's
clearing set except the rebuildable ones. So F5 is the one unrebuildable fact that a reload destroys
— which is the same as saying: the guard and the thing it guards have different clearing sets, and
any time that is true there is a window where one exists without the other.

### The three-valued question, which replaces asking about reloads

Per board, the client wants one answer: **is a move of ours outstanding?** F3 and F5 together give
three, not two:

| F3 queued | F5 ahead | answer | meaning |
|---|---|---|---|
| — | — | **no** | nothing of ours is in flight |
| yes | yes | **yes** | this page sent it and has not been answered |
| yes | — | **unknown** | something is queued and THIS PAGE never observed its fate |
| — | yes | *degenerate* | only after E5: `clearPendingMoves()` drops F3 and leaves F5 standing |

**`unknown` is the whole of the reload problem, stated without mentioning reloads.** It is simply the
state of holding a queued move whose outcome nobody on this page saw. A reload is one way to arrive
there; it is not the only conceivable one and it is not what defines it.

THE CURRENT CODE ANSWERS `unknown` AS IF IT WERE `no`. The gate reads F5 alone, so a page in
`unknown` leaves its board playable while a resend is in flight. Whether that is reachable is
candidate defect 1; what the answer SHOULD be is a decision this analysis does not take. The two
candidates:

- **treat `unknown` as `yes`** — gate the board until something answers. Safe; costs a briefly
  unplayable board in the case where nothing was really outstanding.
- **treat `unknown` as `no`** — today's behaviour. Costs the window the defect describes.

The degenerate row is worth one line of its own: `clearPendingMoves()` on game end does not clear
F5, so a game that ends with a move in flight leaves the gate set for the life of the page. It is
harmless today only because a finished game's board is made unmovable by other means.

### Two derived predicates

- `latestPly` = no ply yet **or** `msg.ply === ply + 1` **or** (snapshot **and** `msg.ply > ply`). It
  means "advance the view to this", and it alone decides whether `ply` advances.
- `replayed` = the confirmation consumed a queued move carrying F4. It means "the server replayed
  this with ITS clocks", which makes our local clock the stale one.

### The other axis: authority

Lifetime says what we still know. **Authority says who is allowed to be right when we and the server
disagree**, and it is a separate question with its own answers: normally the local ticking clock,
except for a replayed move, where the server charged a stall our paused value never saw. Between
them these two axes generate every case in section 3.

## 3. The cases

Each row: what identifies it, what the client does, and where. `S`-numbers from the earlier draft are
replaced by the `F`-facts and the three-valued answer above.

### On the socket opening — E1

| case | identified by | what the client does | code |
|---|---|---|---|
| **C-open-empty** | nothing queued on either board | sends `{reconnect, movesQueued: []}` — a no-op the server still handles | `sockets.ts:19-21` |
| **C-open-resend** | a move is queued | sends every cached move, marks each `resent` (F4), oldest ply first | `loadPendingMoves` |
| **C-open-first** | no ply yet, nothing queued | indistinguishable from C-open-empty in the code — the first connection and a reconnection take the same path | — |

The server answers a resend in one of four ways, and **one of them is silence**: played and
broadcast; deduplicated and returned silently; refused because the game is finished; or raised as
invalid, ending the game. Only the first produces E3.

### On a snapshot — E2

Always applies in full. The snapshot is authoritative for position; it is NOT allowed to make a
board playable.

| case | identified by | what the client does | code |
|---|---|---|---|
| **C-snap-sync** | the answer is `no` on both boards | steps replaced, both boards set, both clocks resynced (paused first), premoves may fire | `updateBothBoardsAndClocksOnFullBoardMsg` |
| **C-snap-contains-ours** | `yes`, and the snapshot's last step for that board IS our move | clears F5, reconciles F3 — **no confirmation will ever come, this is the only clearing** | `roundCtrl.ts:867-878` |
| **C-snap-predates-ours** | `yes`, and it does not | board drawn as the server sees it, then its legal-move map EMPTIED; premove suppressed for that board | `roundCtrl.ts:898-901, 920-923` |
| **C-snap-unknown** | `unknown` — F3 without F5 | reconcile still fires; **nothing empties the map**, because the gate reads F5 and this page has none | candidate defect 1 |
| **C-snap-spectator** | we are a spectator | separate path, no gate, no cache | `updateBoardsAndClocksSpectors` |

### On a single move — E3 / E4

| case | identified by | what the client does | code |
|---|---|---|---|
| **C-move-mine** | the move is ours | clears F5 for that board; consumes F3 (learning `replayed`); sets the board; syncs partner pocket. Clocks resynced **only if** `replayed` or the mover's clock is still running — otherwise the locally paused value stands | `roundCtrl.ts:999-1035` |
| **C-move-mine-replayed** | ours, and `replayed` | as above, and **the server's clocks win** although our clock is not running: the server charged the stall to us and our paused value never saw it | same |
| **C-move-theirs-latest** | not ours, `latestPly` | clocks resynced, board set, partner pocket patched, notification, premove fires | `roundCtrl.ts:975-998` |
| **C-move-theirs-stale** | not ours, not `latestPly` | **clocks are still resynced, the board is NOT updated**, no premove | same — the `updateClocks` call sits outside the `latestPly` branch |

### On the game ending — E5

| case | identified by | what the client does | code |
|---|---|---|---|
| **C-end** | the game is over | every clock paused, F3 cleared for the whole game (F5 is NOT — see the degenerate row), final position selected | `checkStatus`, `roundCtrl.ts:694` |
| **C-end-while-away** | the game's end first seen in a snapshot after reconnecting | the resend from C-open-resend was already refused by the server in silence; the cache is cleared here, which is what bounds it | same |

### On committing a move — E6

| case | identified by | what the client does | code |
|---|---|---|---|
| **C-send** | — | pauses the mover's clock, writes F3 with clocks blanked to `[-1,-1]`, sets F5, sends, starts the opponent's clock | `sendMove` |
| **C-send-premove** | a premove was armed | additionally restores `duration + increment` first, so the player is not charged the dispatch latency | `sendMove:488-496` |

The `[-1,-1]` blanking is why the server must replay with its own clocks, which is why `replayed`
exists, which is why C-move-mine-replayed is a case at all. One decision, three consequences.

## 4. What the client can be made to do — the effect vocabulary

Every case above is some combination of exactly these. A controller's answer should be expressible
in this vocabulary and nothing else:

| effect | values |
|---|---|
| movelist | replace all steps / append one / leave alone |
| view ply | advance to this ply / stay where the reader is |
| board position | set from message / leave |
| partner pocket | patch from message / leave |
| legal moves | recompute from the position / **empty** |
| clocks | resync both from the message / keep local / server wins on this seat |
| premove | may fire / suppressed |
| resend cache | write / consume / reconcile / clear all |
| ahead-of-server | set / clear |
| sound and notification | move, check, game end / silent |

## 5. Asymmetries the analysis turned up

Not defects until argued. Each is somewhere the current code treats two similar situations
differently, and a controller will have to either reproduce it deliberately or drop it.

1. **`latestPly` gates the opponent's move but not mine.** C-move-mine applies the board with no
   `latestPly` test at all; C-move-theirs-latest does. So a confirmation of my own move repaints the
   board even when the view is behind.
2. **`this.ply` advances only on `latestPly`.** With (1), a confirmation that is not `latestPly`
   applies the position but leaves `ply` stale — the two can disagree.
3. **Clocks resync on a stale opponent move (C-move-theirs-stale) but the board does not.** The
   comment says the mover's own value is the trustworthy one, so this may well be deliberate; it is
   not stated anywhere.
4. **The guard and the thing it guards have different clearing sets** — F5 is cleared by E0 and F3
   is not, so `unknown` exists at all. This is the review's step 6, followed one step further than
   the review followed it. Stated this way it is not about reloads: it is about a guard that can be
   absent while what it guards is present.
5. **The first connection is a reconnection** as far as the code is concerned — C-open-first.
6. **Spectators go through a parallel implementation** rather than the same one with no seats.
7. **A finished game's cache is cleared by `checkStatus`**, which is reached from a board message —
   so the clearing depends on receiving one, and the resend that preceded it was already refused in
   silence.

## 6. What this implies about the shape

Written down because the table says it, not because a state machine was wanted in advance:

- **These are not transitions between long-lived states.** There is no "reconnecting" state the
  client sits in. Every row above is a CLASSIFICATION of one event against a handful of facts. A
  state machine would have to invent states to hold what is really just a decision procedure.
- **The classification is nearly independent per board.** Only the movelist and `ply` are shared;
  the gate, the cache, the clocks and the premove are all per board. A per-board decision, taken
  twice, would collapse several of the special cases — including the simul case, which is currently
  special only because two boards can each hold a pending move.
- **The answer wants to be data, not action.** Every case's answer is a combination from section 4.
  A function returning that combination can be read, compared and tested without a socket, a server
  or a clock; a function that performs it can only be traced.

## 7. Open questions this analysis cannot settle

- Is asymmetry 4 reachable — and separately, what SHOULD `unknown` answer? The first is a question
  about this code; the second is a design decision that stands whether or not the window is
  reachable today. Reasoning on the first is in `design.md`.
- Are asymmetries 1-3 deliberate? Nothing records a reason, and the code they are in has been
  through measured incidents, so the prior should be that they are load-bearing.
- Should the spectator path merge into the player one? It has no cache, no gate and no premove, so
  it is the same table with three columns always empty.
