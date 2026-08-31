## Why

Bughouse clock data does not add up. This change opened on 2026-08-23 holding three unexplained
findings; on 2026-08-30 two of them were **reproduced from scratch on a fresh game and solved**, and
a third, unrelated corruption appeared while doing it. The change is repurposed here around what is
now known, and what is left to decide.

**What the original report got wrong, so it is not repeated.** It treated the recording as the prime
suspect and said "we do not yet know what it should say". The record is fine: `cw` / `cb` / `cwB` /
`cbB` hold each seat's clock exactly as the client reported it. It is the **read-back** that is
wrong, and only for a game that has left the server's memory. The original also called `JJgZzLhJ`
"the only bughouse game we have with hand-played clocks" and built an urgency on it — that is no
longer true, and it never needed to be: the bug is reproducible on demand in about five minutes.

### Finding 1 — SOLVED: the analysis page reads a finished game's clocks two plies late

Only when the game is rebuilt from the database. Measured on one game, before and after a server
restart, at the same URL and the same ply: served from memory the page showed the true final clocks;
rebuilt from MongoDB it showed both discriminating seats two plies back. `mongo[i] == client[i+2]`,
all four arrays, every index.

The cause is two errors either side of one loop in `server/bug/utils_bug.py`, which add:

1. **The base clock is counted twice.** `ply_clocks` is initialised with the starting time and
   `game_bug.py:345` saves it whole, so `cw[0]` is already the base in the document — then
   `utils_bug.py:144-147` inserts the base again. The one-board path does not do this: `game.py:583`
   saves `self.clocks_w[1:]` and `utils.py:380` re-adds it. Bughouse omits the `[1:]`.
2. **The step for move `ply` is `steps[ply + 1]` but reads index `ply`.** `steps[0]` is the initial
   position, pushed before the loop; inside it, `utils_bug.py:204-211` assigns `clocktimes_w[ply]`.

This is why it was never noticed in play: a live game, or one analysed straight after it ends, is
served from memory and is correct.

### Finding 2 — SOLVED, and it needs no fix: the zeros are premoves and the rest was measurement

Two separate mistakes were being counted as one defect.

**Most of the zeros were not zeros.** `game_bug_clocks.py:82-83` appends BOTH boards' clock pairs on
EVERY ply, so a seat's value changes only on its own moves and is copied forward on the others. A
think time taken as the difference between consecutive entries is therefore 0 for every ply that
seat did not play — on the fresh fixture that flags all 10 of 10 plies. Derived properly, by walking
each seat's own moves, `PHdCmezP` has **no zeros at all** and `JJgZzLhJ` has **7**, which are exactly
the "from the record" figures the original report gave. Its other count, 10 of 32 from the page, was
the shifted read and is gone with finding 1.

**The 7 that remain are premoves, and are correct.** Proved from the `ts` array without running a
game: those seven plies have a wall-clock gap of **0.041-0.060s** since the previous move on their
board, while all 25 non-zero plies have **1.6-465s**. Two orders of magnitude apart with no overlap
— a network round trip, the queued premove firing the instant the opponent's move lands.
`roundCtrl.ts:358-361` then deliberately restores the turn's starting value so the dispatch latency
is not billed to the player. The player really did spend no time.

The same table shows the record is accurate: on every non-zero ply the think time matches the wall
gap to within 30-50ms.

**So nothing is recorded wrongly and nothing needs changing on the server.** The bughouse chart
already derives per seat (`client/two-board/analysis/movetimeChart.ts:189-203`); the `steps[ply-2]`
formula the original report blamed belongs to the ONE-BOARD chart, a different file. What is left is
presentation: a premove is drawn at the same 2% floor as a very fast real move.

### Finding 3 — REFRAMED: a spec to verify, not a definition to choose

The original write-up turned a stated invariant into a preference. Corrected, in Nikolay's words:
the four values are not all equal, but **the two teammates' values must be equal, and a team-1
player's value must be exactly the negation of any team-2 player's** — two magnitudes, `+d` and
`-d`, with about a second of rounding tolerance.

**It follows from how clocks work rather than being chosen.** With no increment — and bughouse is
not supposed to allow one — each board always has exactly one clock running, so both boards have
consumed the same wall time at every instant, `wA + bA == wB + bB`, and the existing formula yields
`+d` / `-d` automatically. The current implementation is therefore not known to be wrong.

**And the original measurement could not test it.** Those numbers came from the per-ply arrays,
which snapshot only at moves, so a board mid-think has unrecorded time. The disagreement is
predicted by (board A's in-progress think) - (board B's) on **31 of 32 plies within a second**, and
the headline "up to 465s" was one player thinking for 465s. A granularity artifact, not a defect.

What remains is verification in two places: the **live round page**, where the invariant should
simply hold, and the **movetime plot**, where it cannot be checked at all today — which is what the
next finding is about.

### Finding 5 — the record has no value for a seat that was still thinking

When a ply is recorded, the seat on move on the OTHER board has spent time that no array holds:
their entry still reads what it read when their turn began. That is why finding 3 cannot be checked
on the movetime plot, and why a think time for a move in progress cannot be drawn at all.

Two candidate remedies, neither chosen. **Reconstruct it** from `ts` — a seat's clock at ply *i* is
their value at the start of their turn minus `ts[i] - ts[turn start]`, and the arithmetic is already
known to work: run backwards it predicted the recorded disagreement on 31 of 32 plies within a
second. **Or record it** — the client already sends all four clocks and three of them are its view
of seats it does not own, today discarded as noise; they could be kept, or the server could stamp
its own view of the running seats when it processes the ply.

The first changes nothing stored and works on every game already in the database; the second is more
direct but changes what is written. To be investigated in detail before choosing.

### Finding 6 — a game the SERVER decides is over is not reliably announced to the players

Two independent gaps with one symptom, found on two different days. In both, players are left with
running clocks on a game that is finished and stored — measured nine minutes past the end in one case
— and in both, which players find out is essentially luck.

| how the game ends | who tells the clients | verdict |
|:--|:--|:--|
| **flag** (`clock.py:136,277`) | `round_broadcast(..., full=True)` | correct — this is the reference |
| **abandon**, board A player leaves (`user.py:413`) | `round_broadcast(...)` **without `full=True`** | `broadcast.py:36` includes players only when it is set, so it reaches SPECTATORS ONLY. A direct fallback then names `game.wplayer`/`game.bplayer` — the one-board pair — so it can only ever reach a board A seat. |
| **abandon**, board B player leaves (`wsr.py:328`) | nothing — **the game never ends at all** | `finally_logic` schedules the abandon task only `if user in (game.wplayer, game.bplayer)`, board A's pair. A board B player falls to the `else` and is treated as a departing SPECTATOR. Reproduced 2026-08-30 on `YpTfT5AB`: B-white disconnected, and 3+ minutes later the game was still `STARTED` with no abandon task ever created. |
| **invalid move** (`game_bug.py:287-291`) | **all four players — this row was WRONG** | DISPROVED 2026-08-30 by direct test (below). `GameBug.play_move`'s blanket `except Exception` swallows the error internally, so `bug/utils_bug.play_move` never sees one, `invalid_move` stays False, and both notifications run: the `full=True` board broadcast AND the `gameEnd` loop over `set(game.non_bot_players)`. That loop is already the correct shape. |
| **any ending, for a client that is OFFLINE when it fires** | the reconnect tells it — NO GAP | the board message carries `status`/`result`, and `roundCtrl.onMsgBoard` reads them and calls `checkStatus()`. Verified on `BhlL70iT`: a window offline across an abandon showed no result and running clocks, and displayed `1-0` with stopped clocks the moment it reconnected. `4G3ZyGze`'s silent windows were `PB.offline()` BLOCKING reconnection, a harness artifact. |

Measured for abandon (`ctlVer5h`): p1 and p3 got the result, p2 and p4 ticked on for nine minutes.

**Re-measured 2026-08-30 on `YpTfT5AB`, both halves in one game.** First B-white disconnected: no
abandon task, game still live after three minutes — the `wsr.py:328` row above. Then A-black
(`bplayerA`) disconnected: the abandon fired on schedule (17:37:51, stored `status=7 result=a`) and
of the three remaining players **exactly one** was told —

| window | seat | result shown | clocks |
|:--|:--|:--|:--|
| Browser 4 | A-white = `wplayer` | **1-0** | stopped |
| Browser 3 | B-black | none | **still running** |
| Browser 2 | B-white | none | **still running** |

which is the `opp_name` fallback delivering to its single hard-coded recipient. The two board B
players kept playing a finished, saved game.
Measured for invalid move (`4G3ZyGze`): p4 and p2 showed `0-1`, p1 and p3 showed no result and frozen
clocks — and White, whose turn it was, could not move. **That reading was wrong about the cause.**
Re-tested 2026-08-30 on `FzqEmrhj` by sending a well-formed but illegal move (`a1a4`, rook blocked by
its own pawn) straight down a player's websocket: the server logged
`ERROR: Exception in game FzqEmrhj play_move() a1a4`, stored `status=10 result=b`, and **all four
windows showed `0-1`, game-over, clocks stopped** — the sender included. The invalid-move path
notifies everyone. `4G3ZyGze`'s two silent clients were part of the offline/premove tests and were
DISCONNECTED when the `gameEnd` was pushed; nothing re-delivers it on reconnect, which is the new
row in the table above and explains frozen clocks with no result line exactly.

**So it is a FAMILY of one-board assumptions, not one bug** — but the members are now known exactly,
and the invalid-move path is NOT one of them:

| site | enclosing def | what it gets wrong |
|:--|:--|:--|
| `wsr.py:330` | `finally_logic()` | `user in (game.wplayer, game.bplayer)` decides who gets an abandon task — board A only, so a board B player's disconnect ends nothing |
| `user.py:413` | `User.abandon_game()` | `round_broadcast(game, response)` without `full=True` — spectators only |
| `user.py:415-419` | `User.abandon_game()` | `opp_name` resolves to ONE username from board A's pair |
| `wsr.py:1191` | `handle_game_user_connected()` | same membership test; only board A's two get `clear_seeks()` |

`bug/utils_bug.play_move`'s `for u in set(game.non_bot_players)` is the shape all of these should
take. `Game.non_bot_players` (`game.py:200`, a list of at most two) and `GameBug.non_bot_players`
(`game_bug.py:404`, a SET, so a simul's doubled seat collapses to one user) already give "the unique
users playing this game" on both classes.

**The general question this raises, and it is the reason to treat these together**: every ending the
SERVER decides on its own has to push the news, because no client has a reason to ask. Flag does it,
these two do not, and nothing enumerates the set — abort, draw-by-agreement handled elsewhere, and
whatever is added later. The fix should make "the server ended the game" a single path that always
announces to all four seats, rather than three call sites that each remember or forget.

**Deferred by agreement** — recorded here, to be worked on after the clock bugs.

### Finding 4 — REFRAMED: storing non-owned clocks is fine; RENDERING them is the defect

Reproduced 2026-08-30 on a clean four-player game with **no reload, no disconnect and no simul**. A
move message carries all four clocks; only the mover's is authoritative, and `update_clocks()` stores
all four. Measured: the board A mover reported board B white as having spent 1.1s when it had spent
about 133s — a **132-second error**, persisted, and drawn on the analysis page as that seat's clock
at that ply.

**Reproduced again, larger, straight out of the stored document** (`sLF5O6kj`, S11, four separate
players, no disconnect). `cbB` reads `3599958` — 42ms consumed — for plies 2..5, when board B's black
had in fact been on move for up to **447 seconds**; and between two of those plies it rises,
`3599957 -> 3599958`. That rise is `ZdoeZseB`'s "a clock went UP" signature, reproduced here in a
plain game, which removes the last reason to think the simul or the reloads caused it. Only the
magnitude of `ZdoeZseB` (18 minutes) is still unaccounted for, and the short-array anomaly is now
explained separately by S5 (a rejected move still appends to `ply_clocks`).

**Nikolay's decision, 2026-08-30 — do not stop storing them.** *"What is wrong with the server storing
the clock values for the clocks the user doesn't own? A problem will be only if it uses those values to
update any clocks. Just storing them is good, we can cross-check and investigate discrepancies later."*

**And it does not use them.** Traced end to end: `update_clocks()` runs at `game_bug.py:235`, BEFORE
`boards[board].push(move)`, so `cur_color` is the MOVER's colour and the only value that escapes into
authoritative state is `last_move_clocks[board][cur_color]` — the mover's own seat on the mover's own
board. Everything that could run a clock reads from there: `restart()`, `get_clocks_for_board_msg()`
and the flag stopwatch. The move broadcast sends those same authoritative values, and the round page
updates from `msg.clocks`, not from the steps (`roundCtrl.ts:816-821` is commented out).
`movetimeChart.ts:194-200` is safe too — it works out who moved on each step and reads only that
seat's entry.

**Exactly one consumer treats a stored copy as fact**, and it is the one the original bug report was
looking at:

```ts
// client/two-board/analysis/analysisClock.ts:59-64
if (lastStep.clocks)  renderClocksCC(ctrl.clockView, lastStep.clocks,  ctrl.boardA, '');
if (lastStep.clocksB) renderClocksCC(ctrl.clockView, lastStep.clocksB, ctrl.boardB, '.bug');
```

All four values are rendered verbatim, so scrolling to a ply shows one true clock and up to three
copies — `sLF5O6kj`'s 447-second entry drawn as that seat's clock. That is the round-vs-analysis
discrepancy this change opened on.

**So finding 4 collapses into finding 5.** The display needs a RUNNING seat's clock at a recorded ply;
the stored copy is not it and was never meant to be; reconstructing from `ts` answers both. Nothing
about storage changes, every game already in the database keeps its diagnostic value, and `o` makes a
copied entry identifiable after the fact — entry *i* is authoritative for whichever seat moved at ply
*i*.

That is the same class of defect as `ZdoeZseB`'s original symptom, so the three ingredients below are
NOT required to produce a wrong recorded clock. What they may still explain is the magnitude there —
18 minutes lost on a first move, and one array a whole entry shorter than the other three.

#### The original `ZdoeZseB` observation, still unexplained in degree

Game `ZdoeZseB`, 2026-08-30: board B white drops 60:00 → **41:14** on its first move and then rises
to 41:25 — a clock going UP in a game with no increment — board A white reads 18:18 one move into a
game 90 seconds old, and `cbB` holds **10 entries where the other three hold 11**.

That game was a **simul** (one user holding two seats) and was **hard-reloaded several times
mid-game**; its moves were replayed from `movesQueued` on reconnect. The clean four-player game
played the same day shows none of it. Which of those three ingredients does it is unknown, and
finding out is the first piece of work here.

## What Changes

Everything below is **done and verified in a live four-window game**, except where marked.

1. **Finding 1 — FIXED on read, storage untouched.** Nikolay's call: *"we shouldn't mess with how
   data is stored, we want old data to still be readable, ideally now correctly read."* The four
   `insert(0, base_clock_time)` calls are gone and `clocktimes_*[ply]` became `[ply + 1]`, both in
   `load_game()`. No document changes, no migration, every game ever played now reads correctly.
2. **Finding 2 — no code change needed.** The zeros were copied-forward entries of seats that had
   not moved, and the 7 real zeros are premoves. `data.md` has been re-derived from a fresh game
   (`sLF5O6kj`), which was the only job it left. Whether a premove should LOOK different from a
   0.2s move on the chart is a design call, deliberately still open (task 3.4).
3. **Finding 3 — VERIFIED, not changed.** The invariant held in every window through the whole
   S1-S11 suite, and the one case where it did not (S10) was a client bug, now fixed.
4. **Finding 4 — REFRAMED and fixed at the consumer.** Storing all four clocks is fine and stays:
   nothing authoritative reads the three non-owned values. The one place that rendered them as fact
   was `analysisClock`, now fixed by reconstruction. Deprecation comments mark the fields at every
   site that produces, stores, passes or types them.
5. **Finding 5 — SOLVED, and without `ts`.** `reconstructMainlineClocks()` derives all four clocks
   at a recorded ply from the movers' authoritative entries alone, using the no-increment invariant.
   Cross-checked against the independent `ts` route on 52 plies across three games, agreeing within
   ~50ms.
6. **Finding 6 — FIXED, and it was a family of one-board assumptions**: `finally_logic()` (who gets
   an abandon task at all), `abandon_game()` (broadcast without `full=True`, plus a one-name
   fallback) and `handle_game_user_connected()` (seek clearing). All now use `non_bot_players`.
7. **Three bugs found by the stress suite, all fixed**: S10 (the mover's own clock after a
   server-clock replay), S9b (a simul could not be resigned), plus the earlier double-counted
   elapsed and the premove/input guard. Two suspicions were DISPROVED on re-test and should not be
   revived: an invalid move does notify all four players, and a client offline when the game ends
   does learn the result on reconnect.

**Left deliberately undone**: task 3.4 (the premove presentation call) and task 6.4 (shrinking the
per-ply record and `MsgMove` to the mover's single number, now that nothing reads the other three).

## Capabilities

### New Capabilities

- `bughouse-clock-record`: what a bughouse game's clock history means — what is recorded per ply,
  what a client may derive from it, what survives a round trip through the database, and what a
  difference indicator asserts.

### Modified Capabilities

None. `bughouse-round-layout` covers where the clocks and their indicators are drawn and how they
are sized; nothing here changes their placement.

## Impact

- `server/bug/utils_bug.py` — **changed**: `load_game()` no longer prepends the base and reads
  `clocktimes_*[ply + 1]`. Gates run: `ruff format`, `ruff check`, `pyright`, 1031 unittest OK.
- `server/bug/game_bug.py` — unchanged, and deliberately: `:345` still saves the four arrays whole,
  ply-0 entry included, so old documents keep their meaning.
- `server/bug/game_bug_clocks.py` — unchanged. `update_clocks()` appending both boards on every ply
  is correct for what the arrays are: a per-ply snapshot of all four clocks.
- `client/two-board/analysis/movetimeChart.ts` — unchanged and already correct; it was being fed
  shifted values, which is why its output was wrong.
- `client/two-board/round/roundCtrl.ts` — `wireClockDifferences()`, for finding 3 only.
- Python gates apply to every server change here; frontend gates only if finding 3 is taken up.

## Stress tests

`stress-tests.md` in this directory is a living playbook. As of 2026-08-30 the **whole suite S1-S11
has been executed at least once**: it records each scenario's result, the oracle for detecting a
desync, and — in "The runbook" section — every snippet each test is made of, verbatim, so a re-run is
copy-and-paste and the suite can later be lifted into integration tests. Four bugs are still open
from it (findings 4 and 6, S9b, S10). The helpers live in `~/dev/ai-scripts/pychess-board.js`
(`PB.clocks`, `PB.invariant`, `PB.netInstall`, `PB.offline`, `PB.online`, `PB.netState`).

## Evidence

- `JJgZzLhJ.mongo.json` and `data.md` — the original 32-ply fixture, both tables, all 33 indices.
- `PHdCmezP.mongo.json` — the 2026-08-30 fixture: four separate players, standard line on both
  boards, ended by resignation, 10 plies, no reloads. The reproduction recipe is in `tasks.md` 2.6.
- `sLF5O6kj.mongo.json` — the stress-test game: 10 plies alternating between the two boards, several
  disconnect and stall experiments (S5-S11) along the way, ended by resignation. It carries finding
  4's 447-second error and the 1ms rise in `cbB`, and its arrays are all the correct length, which is
  what makes it the counter-example to `ZdoeZseB`'s short array.
