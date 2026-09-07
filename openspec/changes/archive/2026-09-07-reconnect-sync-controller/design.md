# Reconnection, as it works today

The first half of this document is ANALYSIS of the shipped implementation, which is taken as
correct. The second half is the case enumeration the controller has to encode. Nothing here proposes
a behaviour change; the candidate defects at the end are questions, not decisions.

## What the two sides actually do

**Client, on every socket open** (`sockets.ts`): reads the localStorage cache and sends
`{type: 'reconnect', gameId, movesQueued}` — always, including the first open of a fresh page, where
the cache is normally empty. Marks each queued entry `resent: true` on the way out.

**Server, on every connection** (`wsr.py`): sends presence for the other players, then
`game_user_connected`, then a FULL board message — before it has seen the client's `reconnect`.

**Server, on `reconnect`** (`wsr_bug.py`): replays each queued move through `play_move()` with the
SERVER's current clocks, ignoring the client's — it must, because the queued copy carries
`[-1, -1]`. `utils_bug.py` drops a move it has already seen from that user on that board
(`lastmovePerBoardAndUser`), logging "move already played - probably resent twice" and RETURNING
WITHOUT BROADCASTING.

**The ordering that follows**: snapshot first, replay second. The client is therefore routinely
shown a state that omits its own in-flight move, and only afterwards told the move was played.

## The state the client holds

| | where | survives reload | cleared by |
|---|---|---|---|
| the resend cache | localStorage, per game, per board | YES | confirmation, snapshot reconcile, game end |
| `unconfirmedMove` | in-memory field, per board | NO | confirmation, snapshot showing the move |
| `ply`, `steps` | in-memory | NO | — |
| clock values | local ticking `Clock` | NO | resynced by any message carrying clocks |

The two "is a move outstanding" answers are deliberately separate, and the split is the single most
important fact in the current design: the FIELD is what gates the boards, the CACHE is what gets
resent. A page reload empties one and not the other.

## The clock rule, as the code applies it

The local `Clock` is the source of truth for what is displayed; server values are a resync point
only. Three consequences the current code encodes:

1. **A snapshot pauses before it sets.** `setTime()` writes `duration` and `start()` returns early
   when already running, so setting a server value on a running clock subtracts the elapsed time a
   second time — the server has already deducted it. Measured `4G3ZyGze`: board A 57s light, board B
   397s light.
2. **A resent move's local clock is the stale one.** The server replayed it with its own clocks and
   charged the stall to the seat whose turn it still was — ours. So on `replayed`, the server's
   value wins even though our clock is not running. Measured `aMyeueDb`: mover 3576 against 3513
   everywhere else, permanently.
3. **A set does not reach the difference badges**, so any resync calls `renderClockDifferences()`.

## The cases

Named so a reader can say which one they are in. `P` = a move of ours the server has not answered.

### Main

- **R1 Nothing pending, nothing missed.** Snapshot equals local state. Accept clocks as a resync;
  boards and steps unchanged; nothing replayed.
- **R2 Nothing pending, the game moved on.** Snapshot is ahead. Accept fen, steps, clocks; jump to
  the latest ply even if the reader had scrolled back — deliberately, so a dropped connection does
  not strand them in history. A premove must not fire into a ply that has passed.
- **R3 P, and the server has it.** The snapshot's last step for that board IS our move. Clear the
  field, reconcile the cache, resend nothing. No confirmation will arrive, because the server
  answered before we asked.
- **R4 P, and the server never saw it.** The snapshot predates our move. Resend from the cache; the
  board must be UNPLAYABLE until the confirmation arrives, or the player — who has just watched
  their move vanish — plays it again into a ply the server is about to pass. On confirmation, the
  server's clocks win (rule 2 above).

### Corner

- **R5 The resend is a duplicate.** The server already had the move and drops it silently. NO
  message comes back. The only thing that clears the cache is the snapshot reconcile, which is why
  `reconcilePendingMove()` exists separately from `consumePendingMove()`.
- **R6 Two moves pending (simul).** One user holding both seats of a team can have a move
  outstanding on each board. `movesQueued[0]` is processed first; the order is the ply order.
- **R7 The snapshot arrives before the replay.** The normal ordering, and the reason R4's gate
  cannot be "wait until the snapshot agrees with us".
- **R8 Page reload with a cached move.** The cache holds it, the field does not exist. See the open
  questions — this is the case where the two answers diverge most.
- **R9 The game ended while we were away.** The server refuses moves in a finished game. The cache
  must be cleared rather than resent forever; `clearPendingMoves()` on game end is what bounds it.
- **R10 The replayed move is no longer legal.** `play_move()` raises, the server sets INVALIDMOVE
  and awards the game against the resending player's team. The most expensive outcome in the list.
- **R11 Spectator.** No seats, no cache, no gate: snapshot only.
- **R12 Our clock ran out while we were away.** The flag is the server's to call; the client's local
  clock has been paused since the disconnect and must not claim otherwise.

### What each case has to answer

The controller returns the same shape for every case, so cases can be compared by reading:

| | |
|---|---|
| accept | which of fen, steps, ply, status, result are taken from the message |
| overwrite | what local state is discarded, and what is kept in preference to the message |
| clocks | per seat: resync from the message, or keep the local value, and which one wins on conflict |
| moves | what is resent, what is dropped, what is replayed into the movelist |
| playable | per board, whether the legal-move map is populated or emptied |
| cache | what happens to each board's cache entry |

## Candidate defects — questions for the analysis, not conclusions

1. **R8: is the dests gate missing after a page reload?** `unconfirmedMove` is memory-only, so on a
   reload it is empty while the cache still holds a move. Between the snapshot and the confirmation
   the board is therefore playable, which is the exact condition R4's gate exists to prevent. It may
   be unreachable — if the server has the move the snapshot contains it, and if it does not, moving
   again is legitimate — but the window where the resend is in flight looks open. To be answered by
   reasoning first and a stress test second.
2. **`onOpen` resends on the FIRST open too**, where "reconnect" is a misnomer. Harmless today
   because a fresh cache is empty, but it makes the first connection and a reconnection the same
   code path, which is part of why the subject has no name.
3. **Three of the four clock values in a move message are known-stale** and documented as such in
   `sendMove`. They are not read on the server, but they are recorded. Out of scope here; noted so
   the controller does not enshrine them.
4. **The premove quirks** recorded in `round-clocks-are-client-authoritative`: the premove branch
   sends `clocktime + increment` while rendering something else, and gates on `moveColor` without
   checking which board it is on. Both predate this work and both touch what a reconnect sees.

## Open Questions

- Does the analysis page need any of this? It has no moves to send, but it does reconnect. Probably
  R1/R2/R11 only.
- Should the controller own the socket's `onOpen` payload, or only answer questions about it?
- Is a state machine the right shape, or a decision procedure over the state table? The cases are
  not transitions between long-lived states so much as a classification of one event.
