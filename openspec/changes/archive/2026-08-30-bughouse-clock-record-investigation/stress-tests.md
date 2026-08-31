# Bughouse clock stress tests

A living playbook, started 2026-08-30. These are meant to be **re-run periodically**, not invented
again each time — the first pass cost most of a session to build, and it found two real bugs.

Everything here needs the four-window harness in ROUND mode. The helpers are in
`~/dev/ai-scripts/pychess-board.js`: `PB.clocks()`, `PB.invariant()`, `PB.netInstall()`,
`PB.offline()`, `PB.online()`, `PB.netState()`.

## The oracle: what "out of sync" means

Two independent checks, and the first is much the stronger because it works inside ONE window:

1. **The invariant** (`PB.invariant()`). With no increment — and bughouse must never have one — each
   board always has exactly one clock running, so both boards have burned the same wall time and
   `aw + ab == bw + bb`. The four difference badges therefore carry exactly **two** values, `+d` and
   `-d`, with teammates equal. Three or four distinct magnitudes means the clocks have diverged.
   Tolerance ~1s: the badge renders `Math.round(diff / 1000)`.
2. **Cross-window comparison** (`PB.clocks()` in all four). A **stopped** clock must match to the
   second in every window. A **running** clock must match after normalising for the gap between the
   two readings — each result carries its own `at`.

**Blind spot.** The invariant only sees a divergence that is UNEQUAL between the boards. Anything
that shifts both boards by the same amount passes it, so check 2 — against the seat's owner, which is
the authoritative clock — is the only thing that catches that class.

## Rules of engagement

- **Never leave a client disconnected longer than ~60s.** `ABANDON_TIMEOUT` is 30s, doubled for
  `base >= 3` (`server/user.py:123,409`), and an abandoned game ends the test. See
  [[harness-abandon-threshold]].
- **Prefer `PB.offline()` to freezing the browser.** A `SIGSTOP` stops the page's JS as well, so it
  cannot premove or queue anything, and the clock stops ticking locally — a different scenario, and
  the one most likely to trip the abandon timeout.
- **Install `PB.netInstall()` early** and let it sit a few seconds: the socket is captured from the
  app's own pings, and cannot be closed before it has been seen.
- Time control 60+0, four separate players unless the test is specifically about simul.

## Executed

### S1 — hard reload of the window whose clock is running · CLEAN
Reload p3 mid-game while its own clock ticks. Normalised to the 19.1s between readings, its view
matched p1 exactly; stopped clocks identical. **Refresh alone desyncs nothing.**

### S2 — freeze a client with SIGSTOP · INCONCLUSIVE, and it cost the game
Intended 20s, ran ~2.5 minutes because `pkill -f` matched its own shell, and the game was ABANDONED.
Produced finding 6 by accident (see below) but nothing about clocks.

### S3 — offline · premove · opponent moves · reconnect · **FOUND THE BUG**
p3 offline (JS still running), premove armed, p1 moves on board A, p3 back online.
- The **premove behaved correctly**: opponent's move applied, premove fired and was accepted.
- The **clocks broke**: p3's view of board B white was 222s below the owner's. `PB.invariant()`
  showed `+259/+41` and `-41/-259` — two magnitudes where there must be one.
- A full page reload fetched the **same wrong value**, so it is not a one-off of the reconnect path.
- **Cure**: board B's first move corrected every window at once, with no reload.
- **Cause NOT yet established.** The first explanation offered — a stale clock origin carrying the
  lobby wait — was disproved by S6 below; do not repeat it. The distinguishing feature of this game
  is that board A had moved and board B had not. S6b is the experiment that settles it.

### S4 — the abandon path · FOUND A SECOND BUG (finding 6)
While a client was frozen past the timeout, the game ended and **only two of four players were
told**; the other two ticked on for nine minutes. Cause: `abandon_game()` broadcasts without
`full=True` (spectators only) and its direct fallback names the one-board `wplayer`/`bplayer` pair.

## Remaining — with the suspicion behind each

### S5 — queued own move stacked under a premove · EXECUTED 2026-08-30 · **FOUND A SEVERE BUG**
Game `4G3ZyGze`. p3 (A-black, on move) went offline, played its real move `e7e5` (queued locally),
armed a premove `g8f6` on top, and reconnected ~20s later.

```
12:15:49.013  RECONNECT  movesQueued: [{move:'e7e5', clocks:[-1,-1], ...}]
12:15:49.013  play_move  'e7e5'  [3261663, 2363702] [2025345, 3600000] 'a'
12:15:49.060  Got USER move Test-KnightFers  g8f6     <-- premove released in the same instant
12:15:49.064  ERROR: Exception in game play_move() g8f6
              ValueError: Invalid move 'g8f6'
              game_bug.py:237 piece_to_partner -> fairy_board.py:406 -> SystemError from pyffish
```

**Four consequences, in descending order of severity:**

1. **The game ended as `status=10` (INVALIDMOVE), result `b` — awarded AGAINST the player who had
   merely been disconnected.** Reconnecting cost p3 the game.
2. **The game wedged for the others first**: every window showed all four clocks stopped, and White,
   whose turn it legitimately was, could not select a piece — no dests at all.
3. **Only two of four clients were told it had ended.** p4 and p2 showed `0-1`; p1 and p3 showed no
   result and frozen clocks. Finding 6 is therefore NOT specific to the abandon path.
4. **The clock record grew a phantom entry**: all four arrays hold **4 entries for 2 plies** (`m` has
   two moves). A rejected move still appended to `ply_clocks`. This is the missing piece for
   `ZdoeZseB`'s mismatched array lengths — an append that happens for some arrays and not others
   leaves them uneven.

**Suspected race**, in `updateBothBoardsAndClocksOnFullBoardMsg`:

```ts
// prevent sending premove/predrop when (auto)reconnecting websocked asks server to (re)sends the same board to us
if (this.boardA.premove && this.boardA.turnColor == this.seats.myColor('a')) this.boardA.performPremove();
```

The guard exists because someone already knew this was hazardous, but on reconnect the board message
can describe the state BEFORE the queued move is applied. `turnColor` is then still the reconnecting
player's colour, the client concludes it is its turn, and releases a premove that the queued move has
just made illegal.

**Also observed, and a separate question**: the queued move was recorded with the SERVER's clocks at
reconnect time, not the client's at the moment it was played — p3's own clock read 39:42 when it
moved and 39:23 after the replay. The player is billed for the outage. `handle_reconnect_bughouse`
does this deliberately ("on reconnect use server time"), but it is a policy worth revisiting.

### S5b — the same, without a premove · EXECUTED 2026-08-30 · CLEAN
Same sequence minus the premove: offline, real move queued, reconnect. Exactly one message went out,
the move replayed, the game continued, `PB.invariant()` `ok:true`. **The replay path is safe; the
premove release is the fault.**

### S5c — root localised, and FIXED
Re-ran S5 with `WebSocket.prototype.send` wrapped to capture stacks. Two messages, 34ms apart:

```
.046  {"type":"reconnect","movesQueued":[{"move":"b8c6","ply":4}]}   at WebsocketHeartbeatJs.onOpen
.080  {"type":"move","move":"g8f6","ply":4}                          at GameControllerBughouse.processInput
```

**`processInput` is chessgroundx's own premove path** — not the explicit `performPremove()` calls at
`roundCtrl.ts:758/833`, so guarding those would have achieved nothing. Both messages carry the SAME
ply: the client had not advanced past its own queued move, so when the reconnect snapshot put the
board back to "my turn", chessground released the premove by itself.

**Fix** (`updateBothBoardsAndClocksOnFullBoardMsg`): cancel the premove on any board that has an
unacknowledged queued move, before the snapshot is applied. Scoped that way on purpose — a premove
armed WITHOUT a queued move is the ordinary case and must still fire on reconnect.

**Verified on `Hr5pqpT2`**: the ordinary premove still fired correctly after an opponent's move; then
the full S5 sequence produced ONE message (the reconnect), `premoveArmed: 0`, game alive,
`result: null`, `ok:true`, and zero server errors for the whole game.

### S5c — original S5 wording, kept for the record
Go offline, make a real move (it queues), then premove on top of it, then come back. **Suspicion**:
`handle_reconnect_bughouse` replays queued moves with the SERVER's clocks
(`game_clocks[0]`, `game_clocks[1]`; the client's own values are commented out) — and during the
stale-origin window those are exactly the wrong numbers. Two moves replayed in one batch may also
record two plies with the same timestamp.

### S6 — reconnect before either board has moved · EXECUTED 2026-08-30 · SERVER IS CLEAN
Game `4G3ZyGze`, seek deliberately left waiting **84s** in the lobby, reconnect forced before any
move, inbound `board` message captured:

```
server sent   clocks: [3555411, 3600000]   clocksB: [3555411, 3600000]
true value    3600000 - (1788090618951 - 1788090574353) = 3555411
```

Exact to the millisecond on both boards, and the reconnecting window's own display was equally
correct (`ok: true`). **So the server's running-clock adjustment is right, the clock origin is the
game's start and not the game object's construction, and lobby waiting time does not leak in.**

This kills the first explanation offered for S3 (a stale origin carrying lobby time). It was wrong:
`GameBug` is constructed inside `new_game_bughouse()`, which `utils_bug.py:535` calls only once all
four seats are filled — construction IS the start.

### S6b — reconnect with ONE board moved and the other not · NEXT, and now the prime suspect
The exact shape of S3: board A has moves, board B has none, then a client goes offline and comes
back. That asymmetry is the only difference between S3 (222s of error) and S6 (perfect), so it is
where the fault lives. **Run it with the payload logger installed from the start**, so the server's
`clocks`/`clocksB` can be compared against what the window actually renders — that separates "the
server sent a wrong number" from "the client rendered the wrong one", which S3 could not.

**Suspicions, in order.** (1) The client renders a board from the LAST STEP's `clocks`/`clocksB`
rather than the live values, and a step's values for a board that did not move are a non-owner's
report — finding 4's poison, read back. (2) `Clock.duration` may not track a RUNNING clock, so what a
mover sends for the three seats it does not own is whatever those clocks held when they last started.
Both would explain S3 and neither would show in S6, where no step exists yet.

### S5d — the ply-marker guard, IMPLEMENTED and tested 2026-08-30 · ALL PASS
`roundCtrl.ts` now keeps `unconfirmedMove` per board — in memory, set when a move is sent, cleared
when any message shows the server dealt with it. While a board is ahead of the server it is not an
invitation to move: dests are emptied and the premove is not released. Three runs on `d0cEddrd`:

| test | result |
|:--|:--|
| queued move + premove, reconnect | ONE message out (the reconnect), no illegal move, game alive, **premove preserved** |
| opponent then moves | the preserved premove fired correctly — `f6/g8` |
| human move during the held-open window | pawn selects but `dests: []`, no move made, nothing sent, **queued move not overwritten** |

The window was held open by killing the socket the instant the stale snapshot arrived, which is
also the technique for reproducing this at leisure instead of racing 43ms.

### S5e — the difference badges go stale while a seat is paused · NEW FINDING, pre-existing
Found while checking S5d. `wireClockDifferences()` refreshes a badge inside `clock.onTick()`, so a
badge only updates while its OWN clock runs. With White to move on both boards, both black badges
freeze at whatever the difference was when Black last ran — measured **44s stale** while the clocks
themselves agreed to the second:

```
computed from clocks:  aw - bw = 114     bb - ab = 114     <- invariant holds
rendered badges:       aw +114, bw -114  bb +158, ab -158  <- the two paused seats
```

Cosmetic, not a desync — but it means **finding 3 must be verified against clock VALUES, not the
badges**. `PB.invariant()` was reading badges and has been corrected to compute from the clocks and
report `badgesFresh` separately.

**FIXED same day.** Two causes, one remedy. A tick used to refresh only the ticking seat and its
same-colour counterpart — and those two run together, so the OTHER pair was never touched by a tick
at all; and `setTime()` (every resync) reached the clock text but never the badges. `roundCtrl.ts`
now has `renderClockDifferences()`, which recomputes all four from the clocks' live values, called
both from the tick and explicitly after the `setTime` pair in `updateClocks()`.

Verified through a full drift-and-resync cycle: before `[286,285]`, offline `[311,310]`, after
reconnect `[318,317]` — badges tracking the computed values at every stage with `badgesFresh: true`,
including the two seats that never ticked.

### S7 — both players of one board offline, reconnecting in each order · EXECUTED 2026-08-30 · CLEAN
A then B, and B then A, with a move made in between. The suspicion was that the position each holds
diverges and the later reconnect replays a move computed against a stale position — an INVALID move
reaching the server, the worst outcome on this list. It does not happen, in either order, with
**zero server errors for the whole game**.

**Variant A — the player whose premove depends on the other's move reconnects FIRST.** p1's snapshot
lacked `b8c6`, so it was still Black's turn and the **premove was correctly held** — nothing sent but
the reconnect itself. p3 then reconnected, `b8c6` applied and was broadcast, and p1's `Nb1-c3` fired
at the right moment.

**Variant B — the queued move reconnects first.** p3's `h7h6` applied, p1's snapshot contained it, and
the premove was **released legitimately** as `f1e2`.

Both orders end with the game alive, invariant `ok` and badges fresh. The log also shows the stale
`localStorage` entry being handled exactly as designed — `move already played - probably resent twice
after multiple reconnects`, then the real move going through: the leaky pending-move cache is harmless
in practice.

**What S7 could NOT construct, and why it is impossible.** The two-queued-moves case — both board-A
players holding unsent moves at once — cannot occur: the second player can only move after seeing the
first player's move, which means that move already reached the server. A premove is the only thing the
waiting player can arm, and premoves behave correctly in both orders.

### S8 — premove invalidated by the opponent's move · EXECUTED 2026-08-30 · CLEAN
Game `sLF5O6kj`, board A after `1.e4 d5`. p3 armed the premove `d5xe4`; p1 then played `e4-e5`, so the
capture target was gone by the time the premove was due to fire.

```
p3 after the opponent's move:
{ gameOver: false, inv: true, lastA: ["e4","e5"], premoveStillArmed: 0, sentByMe: [], result: null }
```

**The premove was silently discarded and nothing was sent.** chessgroundx re-checks `canMove` inside
`playPremove` at fire time, so a premove made obsolete by the opponent's move never becomes a move —
no illegal move reaches the server, and the game continues normally. This closes the concern that
server confirmation of the previous ply is no guarantee the position is still what the premove assumed.

### S9 — simul (one user on two seats) · EXECUTED 2026-08-30 · the ZdoeZseB signatures did NOT reproduce
Game `Pe7KfYvc`: p1 held A-white + B-black, p4 held A-black + B-white — the `ZdoeZseB` shape. Five
plies played across both boards, then ended by abandon so the record would be written.

```
cw  len=6  [3600000, 3599180, 3496861, 3496861, 3496861, 3496861]
cb  len=6  [3600000, 3600000, 3600000, 3600000, 3522756, 3522756]
cwB len=6  [3600000, 3550776, 3550776, 3550776, 3550776, 3483186]
cbB len=6  [3600000, 3600000, 3600000, 3534328, 3534328, 3534328]
```

**All four equal length, all non-increasing.** Neither of `ZdoeZseB`'s signatures — the array that was
one entry short, and the clock that went UP — appears in a clean simul. So simul alone does not cause
them; that game also had hard reloads mid-game, and the extra-entry mechanism is now known from S5
(a REJECTED move still appends to `ply_clocks`, giving 4 entries for 2 plies).

**What simul does add: finding 4 reaches the mover's OWN second seat.** `sendMove` pauses only the
clock that moved, and reads the other three from `Clock.duration`, which for a running clock still
holds its start value. In a simul one of those three is the mover's own other seat:

```
15:56:24  p1 moves e2e4 on 'a'   clocksB = [3550776, 3600000]
                                              ^^^^^^^ B-black is p1's OWN seat, running 54s,
                                                      reported as untouched
```

**The invariant held throughout**, with one transient 2s blip at a move boundary that settled within
seconds. And finding 6's notification gap is masked here: with only two users, `abandon_game`'s
one-board fallback (`wplayer`/`bplayer`) happens to reach the other one — the gap needs board-B-only
players to miss.

### S9b — A SIMUL GAME CANNOT BE RESIGNED · NEW BUG · **FIXED 2026-08-30**
Found while trying to end `Pe7KfYvc`. Resignation is a two-step team action: one player offers, their
PARTNER confirms (`roundControls.ts:133-162`). In a simul the partner is the SAME user, and the
offering player's own button is left `disabled` in the `resignWaiting` state — so the confirm can
never be pressed. Measured: after the offer, `#resign` is `disabled` with title still "Resign", and a
second click does nothing.

Neither team can resign a simul game. The only exits are mate, flag, abandon, or an invalid move —
which is how this test game had to be ended.

**FIXED, and the client half alone would not have been enough.** The server drops the second press
too: `partner_of()` on a team of `[X, X]` is None, so `pending == partner` is False and the next line
returns on "already asked". Both ends changed:

- `bug/wsr_bug.py` `handle_resign_request_bughouse()` — a team of one distinct user may confirm its
  own offer: `pending == partner or (team_is_one_user and pending == user.username)`. Nothing loosens
  for a normal team, where `partner` is a real name and `team_is_one_user` is False.
- `round/roundCtrl.ts` `onMsgResignOffer()` — the offer goes to the whole team, so the asker receives
  it too and the sender test is what distinguishes "waiting" from "confirm". In a simul the asker IS
  the confirmer, so that test is qualified with `!iAmTheWholeTeam` and the existing `resign-confirm`
  rendering does the rest. No new visual state.

**Verified on `lTuwVqZB`** (JanggiCannonKni x2 vs AiWokBishop x2): first press turned the button from
`disabled`/"Resign" into `resign-confirm`/"Confirm resignation"; second press ended the game, both
windows `1-0`, clocks stopped, stored `status=2 result=a`.

**Regression on a four-player game `VG3CmXq4`**: the offerer's button still goes `disabled`, a second
press by the same player still does nothing (game alive), and the PARTNER still sees
`resign-confirm` and ends it with one press (`0-1`).

### S10 — server stall rather than socket close · EXECUTED 2026-08-30 · FOUND A LASTING DESYNC · **FIXED**
`docker compose pause server` for ~30s on game `sLF5O6kj`, with a move made during the stall.

**The client handles the stall correctly.** The heartbeat noticed before the move was even made
(`netState` showed one socket CLOSING and one CONNECTING), so the move was queued rather than sent
into the void — `sent: []` — applied locally, invariant `ok`. On unpause the queued move was replayed
and applied. The suspicion that the client would not notice is WRONG.

**But the mover's own clock is left 20s wrong, permanently:**

| window | `bw` (STOPPED, so it must be identical everywhere) |
|:--|--:|
| p4 — the mover, owner of that clock | **3558** |
| p1 | 3538 |
| p3 | 3538 |
| the server's record of the move | **3538** |

Chain: `sendMove` paused p4's clock locally at 3558 and queued the move; on reconnect
`handle_reconnect_bughouse` replayed it with the SERVER's clocks (the client's are discarded — "on
reconnect use server time"), recording 3538 and charging p4 for the stall; the confirmation then hit
the *"message about the move i just made"* branch, which updates clocks **only `if (clock.running)`**
— and p4's clock is paused, so the correction was skipped. p4 keeps 3558.

That `if (running)` guard was added FOR the reconnect case (its comment says so), but it only covers
the branch where the clock is still running; the case where the client paused it and the server
disagrees falls through.

**RE-RUN 2026-08-30 on `aMyeueDb`, and the mechanism is now exact.** `docker compose pause server`
at 18:54:21, B-white played `e2e4` at 18:54:28 (its clock paused locally at 3576), unpause 18:55:31.
The client reconnected at that instant and resent via `movesQueued` with `clocks:[-1,-1]` — which is
also where task 5.4's mysterious `-1` comes from: `recordPendingMove` stores placeholders, so the
server MUST use its own clocks on a replay.

| window | `bw` (STOPPED — must be identical everywhere) | `bb` |
|:--|--:|--:|
| the mover, owner of that clock | **3576** | 3521 |
| A-white | 3513 | 3567 |
| B-black | 3513 | 3521 |

63 seconds, exactly the stall, and permanent. The mover charged the stall to `bb` (running locally
after it applied its own move) while the server charged it to `bw` (whose turn it still was). Both
pictures are internally consistent, so `PB.invariant()` is `ok` in every window — this is the
canonical case for why the cross-window oracle exists.

**Why no snapshot ever corrects it** — the part that was guessed wrong before. The client decides
"this is a full snapshot" with `full = msg.steps.length > 1`, and neither message on this path
qualifies:

- the reconnect board message arrives BEFORE the queued move is replayed (`ply:0`, one step), so it
  cannot carry the corrected clock;
- the post-replay broadcast is `game.get_board()` with no `full=True` (`bug/utils_bug.py`), so it is
  a single step and takes the single-move path, where the `myMove` branch discards the clocks
  because the mover's own clock is already paused.

The correct value is in that message the whole time (`clocksB:[3513287, 3600000]`); the client just
refuses it.

**FIXED 2026-08-30, client-side, no protocol change.** Nikolay's call: the client already knows
which moves it resent, so it can decide for itself; a full board snapshot would ship the entire move
history to correct one clock, and would also force a movelist scroll as a side effect.

- `socket/pendingMoves.ts` — `loadPendingMoves()` marks every entry it puts into `movesQueued` with
  `resent: true` (local bookkeeping, never sent), and a new `consumePendingMove(gameId, board, move)`
  drops the entry the server has just acknowledged and reports whether it had been resent.
- `round/roundCtrl.ts` — the confirmation branch calls it for EVERY confirmation and ORs the result
  into the existing condition: `if (replayed || clock.running)`. The `if (running)` guard is
  untouched for normal moves, so nobody is charged the network round-trip.

**Re-run of the identical scenario after the fix** (paused 19:14:58, move at 19:15:05 with `aw`
paused locally at 2339, unpaused 19:15:53): the mover's own clock moved **2339 -> 2291**, accepting
the server's value and the stall charge, and all four windows agree — `aw` 2291 and `bw` 3513
everywhere. The mover's cache went to `{}` on confirmation, the first time this cache has ever been
bounded.

**Residual, known and accepted:** an entry whose confirmation the client never sees (a missed
message, or a move confirmed before this code existed) is never consumed and is resent on every later
reconnect, where the server dedupes it harmlessly. Closing that would mean also dropping entries when
a full snapshot already contains the move.

**Lesson for the oracle**: the single-window invariant CANNOT see this — every window is internally
consistent (p4: boardA 7109 / boardB 7108; p1: 7092 / 7091). Only cross-window comparison of a
STOPPED clock catches it. Run both checks, always.

### S11 — rapid alternating moves on both boards · EXECUTED 2026-08-30 · CLEAN, and it re-caught finding 4
No disconnection at all. The suspicion was that `move_lock` serialises plies from two boards while
`ts` is stamped at receipt, so a burst might reorder or collapse entries. It does not.

Six moves on game `sLF5O6kj`, alternating boards as fast as the harness can drive four windows
(A-black, B-black, B-white, A-white, A-black, B-black — roughly one every 20-30s, which is the floor
for cross-window driving: only one browser can be selected at a time, so genuinely simultaneous
clicks are not reachable from here. Premove bursts, S5/S7, are the closest thing to true simultaneity.)

**Live checks — all four windows, after the burst:**

| | `ab` (stopped) | `bb` (stopped) | `aw` (running) | `bw` (running) |
|:--|--:|--:|--:|--:|
| p1 @ ...928305 | 3478 | 2879 | 2697 | 3296 |
| p4 @ ...940462 | 3478 | 2879 | 2685 | 3284 |
| p2 @ ...891522 | 3478 | 2879 | — | — |
| p3 @ ...904880 | 3478 | 2879 | — | — |

Stopped clocks identical everywhere; running clocks differ by exactly the gap between readings
(12s apart, 12s lower). `PB.invariant()` `ok` with `badgesFresh: true` in every window.

**The record (resigned to force the write, then read from mongo):**

```
m   len=10   o  [1,0,0,0,0,1,1,0,0,1]      # 1 = board B, verified against the click timestamps
ts  len=11   monotonic, each entry within 50ms of the click that caused it
cw  len=11   [3600000, 3538354, 3091357, 3091357, 3046954 x3, 2751899 x3]
cb  len=11   [3600000, 3600000, 3600000, 3562451, 3562451, 3511985 x3, 3478595, 3478595]
cwB len=11   [3600000, 3538354 x6, 3332860 x4]
cbB len=11   [3600000, 3600000, 3599958, 3599957, 3599958, 3599957, 2988769 x4, 2879553]
```

**All four arrays the same length (plies + 1), nothing reordered, nothing collapsed, and every seat's
own-move progression strictly decreasing.** The burst itself is clean.

**But `cbB` goes UP by 1ms at index 4** (`3599957 -> 3599958`), and the same array reads 3599958 — 42ms
consumed — at plies 2..5, when board B's black had in fact been on move for up to **447 seconds**. So
this is a plain four-player game with no disconnect producing a **447-second wrong value in the
record**, and the `ZdoeZseB` "clock went UP" signature in miniature. It is finding 4 (a client
reporting clocks it does not own), reproduced straight out of the stored document rather than from a
live window — and a bigger error than the 132s measured before.

Fixture: `sLF5O6kj.mongo.json`.

### Bonus observation — a player-initiated resignation DOES reach all four seats
Ending S11's game exercised the contrast with finding 6. After p1 offered and p2 confirmed, all four
windows showed `0-1`, all four clocks stopped, and every window read the identical four values
(`aw 2644 / ab 3478 / bw 3243 / bb 2879`). The notification gap in finding 6 is specific to endings the
SERVER decides on its own; the client-initiated path is correct and is the model the others should
follow.

## The runbook — every snippet these tests are made of

Kept verbatim so a re-run is copy-and-paste rather than re-derivation, and so this suite can later be
lifted into integration tests. Everything below was executed as written on 2026-08-30.

### 0. Bring the harness up, in ROUND mode
Run the `bughouse-harness` skill (never the raw script from memory). Then start the helper server once
per session and load `PB` into each window — **always with a cache-buster**, a stale copy of the
helpers has cost real debugging time:

```bash
# once per session; a plain http.server will NOT do, the fetch needs CORS
python3 - <<'PY2' &
import http.server, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*'); super().end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1', 8099),
    functools.partial(H, directory='/home/rockefeller/dev/ai-scripts')).serve_forever()
PY2
```

```js
const t = await (await fetch('http://127.0.0.1:8099/pychess-board.js?cb='+Date.now())).text(); (0,eval)(t);
({me:PB.myName(), seats:PB.mySeats().map(s=>s.boardName+s.colour), boards:PB.boards().map(b=>b.sel+' '+b.boardName+' '+b.orientation)})
```

Game setup: 60+0 (`PB.configure({variant:'bughouse', minutes:60})`), p1 creates and picks white, then
p2, p3, p4 each `PB.joinSeat(0)`. Seats come out p1 A-white, p2 B-black, p3 A-black, p4 B-white.

### 1. Find which browser is which tile
`list_connected_browsers` gives four deviceIds with no tile names, and the names are NOT in tile order.
Select each, `tabs_context_mcp` for its tabId, then ask the page who it is (`PB.myName()`,
`PB.mySeats()`). On 2026-08-30 the mapping was Browser 4 = p1, Browser 3 = p2, Browser 1 = p3,
Browser 2 = p4 — **re-derive it every session, do not reuse those.**

### 2. Calibrate click coordinates per window
Extension clicks are in SCREENSHOT space; `PB.coords()` returns CSS space. They differ whenever the
viewport is wider than the capture (a 1701px window captured at 1568px = factor 0.92181) or the page
has been zoomed. Measure it instead of assuming — no screenshot needed:

```js
window.__probe=[]; document.addEventListener('mousedown', e=>window.__probe.push([e.clientX,e.clientY]), true); 'armed'
// then one computer click at (100,100), then:
({probe:window.__probe})   // [[100,100]] means factor 1
```

### 3. Make a move
```js
PB.myNextMove()                       // scripted line, self-locating
PB.coords('#mainboard','g1')          // or any square, CSS space
```
then two `computer` left_clicks (from-square, to-square) at those coordinates times the factor from
step 2. Check `PB.selected(sel)` first — clicking an already-selected piece deselects it.

### 4. Log what this window sends, and watch its premoves
```js
window.__out=[]; const proto=WebSocket.prototype; const orig=proto.send;
if(!window.__logged){ window.__logged=true; proto.send=function(d){
  try{ const s=String(d); if(s.includes('"type":"move"')||s.includes('movesQueued'))
    window.__out.push({at:Date.now(), data:s.slice(0,110)}); }catch(e){} return orig.apply(this,arguments); }; }
'logging'
```

The standard post-condition probe, used by S3, S5, S7 and S8:

```js
({ lastA: PB.lastMove('#mainboard'),
   premoveStillArmed: [...document.querySelectorAll('#mainboard square')]
       .filter(s=>s.className.includes('current-premove')).length,
   sentByMe: window.__out.map(x=>x.data.slice(0,70)),
   gameOver: document.querySelector('.round-app.bug')?.className.includes('game-over'),
   result: document.querySelector('.result')?.textContent?.trim()||null,
   inv: PB.invariant() })
```

### 5. Take a window offline WITHOUT freezing it
```js
window.__out=[]; const r=PB.offline(); await new Promise(x=>setTimeout(x,1200)); ({offline:r, netState:PB.netState()})
// ...make the move / arm the premove...
const on=PB.online(); await new Promise(x=>setTimeout(x,7000)); ({on, sent:window.__out.map(x=>x.data)})
```
`PB.netInstall()` must have run a few seconds earlier — the socket is captured from the app's own
pings. Also useful: the pending-move cache the client keeps for the reconnect,
`localStorage.getItem('bug-pending-moves:'+document.body.dataset.gameid)`.

### 6. The two other ways to break a client
```bash
pkill -STOP -f "profiles/p[3]"   # freeze the whole profile (S2). BRACKETS, or pkill freezes its own shell.
sleep 20
pkill -CONT -f "profiles/p[3]"

docker compose pause server      # server stall, S10 — client stays alive and queues
sleep 30
docker compose unpause server
```
Both are on the ~60s abandon clock. `PB.offline()` is preferred wherever it fits.

### 7. Force the record to be written, then read it
The document's move/clock arrays are only written when the game ENDS. Resign in two steps — the
offerer, then the PARTNER confirms (a simul cannot do this at all, see S9b):

```js
document.querySelector('button#resign').click()          // in the offerer's window
// partner's window then shows title "Confirm resignation" / class resign-confirm:
document.querySelector('button#resign').click()
```

```bash
# NOTE: the container is mongo 4.4 — `mongosh` does not exist, and auth is required.
docker compose exec -T mongodb mongo --quiet -u admin -p pass --authenticationDatabase admin \
  pychess-variants --eval 'var g=db.game.findOne({_id:"sLF5O6kj"});
    print(JSON.stringify({m:g.m,o:g.o,ts:g.ts,cw:g.cw,cb:g.cb,cwB:g.cwB,cbB:g.cbB,s:g.s,r:g.r,b:g.b,i:g.i}))'
```

What to assert on the result — this is the part that should become a real test:
- `cw`, `cb`, `cwB`, `cbB` all have length `len(m) + 1` (the ply-0 dummy);
- `ts` has the same length and is strictly increasing;
- `o[i]` is 1 for board B, 0 for board A, and matches the order the moves were actually made;
- each seat's values are **non-increasing** — any rise is finding 4;
- each seat's value changes only on plies that seat played.

### 8. Verify moves and errors from the server log
```bash
docker compose logs server --tail 400 | grep <gameId> | grep "Got USER move"
docker compose logs server --tail 400 | grep -i "invalid\|error\|traceback"
```
Never `docker compose logs server` without `--tail` — it reads the whole log and times out.

## Status after the first full pass (2026-08-30)

| | |
|---|---|
| **fixed & verified** | double-counted elapsed (`nextClock.pause`), clock read-back (`utils_bug.py`), premove/input guard (`unconfirmedMove`), badge refresh on resync |
| **passing** | S1, S3, S5, S5b, S5d, S6, S6b, S7 (both orders), S8, S11 |
| **found AND fixed** | finding 6 / S4 — three one-board assumptions (`finally_logic`, `abandon_game` x2) plus `handle_game_user_connected`; finding 4 — reframed as a display bug, fixed by reconstruction in `analysisClock`; S10 — the mover's clock after a server-clock replay; S9b — a simul can be resigned |
| **found bugs, not yet fixed** | none — S9b was the last, fixed 2026-08-30 |
| **disproved on re-test** | "an invalid move ends the game silently" (all four ARE notified) and "a client offline when the game ends is never told" (the reconnect board message carries the status and the client reads it) |
| **known gap, untested** | a page RELOAD between sending a move and its confirmation loses the in-memory `unconfirmedMove` marker, leaving that one snapshot unguarded |

## After any fix

Re-run S1, S3 and S6 at minimum; S3 is the regression test for the origin bug, and S6 for the window
the invariant cannot see.
