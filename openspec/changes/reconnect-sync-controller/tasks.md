# Tasks

## 1. Finish the analysis before writing anything

The design document has the shape of it. These are the parts that need reading the code again with
the question in hand, and they come first because the enumeration is the deliverable — the class is
only where it ends up living.

- [ ] 1.1 Confirm the message ordering on a real reconnection: snapshot before replay, and whether
      anything can reverse it. `wsr.py` sends the board on connect; the client sends `reconnect` on
      open. Prove it with the log rather than from reading.
- [ ] 1.2 Walk every reader of the resend cache and the ahead-of-server field and record which case
      each exists for. Four cache entry points, two field sites, and the comments already name most
      of the cases — they are the raw material for the enumeration.
- [ ] 1.3 Establish what the server does with each queued move: played, deduplicated silently,
      refused because the game is over, or raised as invalid. One of those four produces no message
      at all, which is what the client has to survive.
- [ ] 1.4 Answer candidate defect 1 in Design: is the dests gate missing after a page RELOAD, where
      the field is empty and the cache is not? Reason it through first, then reproduce it if the
      reasoning says it is reachable.
- [ ] 1.5 Decide whether the analysis page shares any of this or only R1/R2/R11.

## 2. The enumeration

The first pass is written: `analysis-current-behaviour.md` has the events, the eleven state
variables, the case table with the code for each row, the effect vocabulary every answer is built
from, and seven asymmetries to argue about.


- [x] 2.1 Write the case list out in full — R1-R12 and any the analysis adds — each with its
      trigger and its answer in the six terms Design lists.
      DONE: the cases live in `reconnectController.ts`, each commented with the histories that reach it and what narrows it further.
- [ ] 2.2 Mark each case with how it is reached today, naming the code that handles it. A case with
      no current handler is a finding; so is a piece of current code that belongs to no case.
- [ ] 2.3 Check the enumeration is exhaustive over the state that distinguishes cases, rather than
      being a list of the situations we happen to have met.

## 3. The controller

- [ ] 3.0 **K9 — refuse a snapshot that went backwards.** A snapshot whose ply is LOWER than ours,
      in a game that is not over, is not a legitimate state in any scenario except a server that has
      been rolled back. Every other case in this design assumes the snapshot is authoritative because
      the server knows more than we do; this is the one case where that is false, and nothing detects
      it today. Detecting it is one comparison; what to DO is a decision — refuse and hold, or accept
      and warn — and it belongs to the controller because it is the only place that knows both plies.

- [x] 3.1 Define what it is given and what it returns: the message and the client's state in, a
      decision in the six terms out. Returning a DECISION rather than performing the work is what
      lets the cases be compared, and tested, without a socket.
      DONE: `BoardDecision {playable, clocksFromServer, because}` — data, so a case can be read and compared without a socket.
- [x] 3.2 Move the resend cache under it, so the cache has one owner rather than four callers.
      DONE: `pendingMoves.ts` has exactly one caller now.
- [x] 3.3 Move the ahead-of-server field under it, keeping the two answers distinct — see the
      requirement; collapsing them is the obvious simplification and it is wrong in both directions.
      DONE: kept distinct via the three-valued `outstanding()`.
- [ ] 3.4 Express the clock rules as part of the decision: which seats resync, which keep their
      local value, and which win on conflict.
- [x] 3.5 Reduce the round controller to consulting it — ideally at the two points that matter, the
      socket opening and a board message arriving.

## 4. Behaviour is preserved

- [x] 4.1a THE ONE DELIBERATE CHANGE, and the bed's one real finding. `reconcile()` searches a
      board's WHOLE history rather than only its last move. Matching the last move covers Q2 and Q7
      and misses Q3, where the opponent replied on top of ours: the last move is then theirs, ours
      never matches, and the entry survives to the end of the game. The shipped code says so about
      itself — "a snapshot taken after the opponent has replied shows their move here, not ours" —
      and left it to `clearPendingMoves()`. Q3 failed before the controller and passes after it.
- [ ] 4.1b `unknown` is still answered as `no`, isolated in `treatsUnknownAsAhead()` with the
      argument for both answers beside it. MOVED, NOT DECIDED — deliberately, so this change does
      not do two things at once. Flipping it is now one line in one place rather than six call sites.

      DONE: five points: socket open, move sent, own move confirmed, snapshot, game end. No reconnect state left on the round controller.
- [ ] 4.1 For every case, state what it did before and what it does after. Identical, or recorded.
- [ ] 4.2 The four measured incidents stay fixed: the 63s richer mover, the 397s light board, the
      44s handed back, the premove into a passed ply. Each has a game id in the code comments.
- [x] 4.3 The cosmetic review point about clearing the confirmed move is addressed in passing, as
      part of 3.2 — not as its own change.

## 5. Verify

      DONE: the cache has one owner; and the review's finding is now fixed one level deeper — see 4.1a.
- [ ] 5.1 Reuse the clock stress tests:
      `openspec/changes/archive/2026-08-30-bughouse-clock-record-investigation/stress-tests.md`
      holds S1-S11 with the runbook — the offline/stall/freeze snippets are exactly this subject, and
      S1-S11 map almost one-to-one onto the case table: S1 -> C-open-first, S3 -> C-snap-predates-ours,
      S5 -> C-open-resend with a premove, S6 -> C-snap-sync, S7 -> resend ordering, S9 -> two queued
      moves, S10 -> C-move-mine-replayed, S11 -> the `latestPly` asymmetries. No bug the suite found
      is still open, so a re-run is regression cover, not discovery.
      USE `PB.offline()`, NOT SIGSTOP — freezing stops the page's JS, so it cannot premove, and it
      courts the 60s abandon timeout. And BOTH oracles: `PB.invariant()` is blind to an error that
      shifts both boards alike, which is how S10's 20s hid from it; cross-window comparison of a
      STOPPED clock is the only check that catches that class.

### The two tests the suite is missing, and they are the two this change turns on

S3 differs from S6 in TWO variables at once — a premove was armed, AND board A had moved while board
B had not — and its 222s error was never explained. Each of the following isolates one of them. Run
both with the payload logger installed from the start, so the server's `clocks`/`clocksB` can be
compared against what the window actually renders: that is what separates "the server sent a wrong
number" from "the client rendered the wrong one", which S3 could not do.

| | premove armed | opponent moved while away | status |
|---|---|---|---|
| S6 | no | no | run, clean to the millisecond |
| **S12** | **no** | **yes** | **never run — the baseline** |
| **S6b** | no | yes, one board only | designed, never run |
| S3 | yes | yes | run, 222s error, cause unknown |

- [ ] 5.1a **S12 — the plain reconnect, which nothing has ever tested on its own.** Nothing of ours
      pending, no premove armed: go offline while it is the OPPONENT's move, let them move, come
      back. This is C-snap-sync, the plainest reconnect there is and the baseline every other case is
      measured against — and it exists in the suite only as a confound inside S3. If it is CLEAN
      while S3 is not, the premove is implicated; if it is dirty too, the premove is exonerated and
      the board-asymmetry suspicion stands.
- [ ] 5.1b **S6b — reconnect with ONE board moved and the other not.** Carried over unrun from the
      2026-08-30 pass, where it is marked "NEXT, and now the prime suspect": it is the exact shape of
      S3 minus the premove's other half. Its two recorded suspicions, in order — (1) the client
      renders a board from the LAST STEP's `clocks`/`clocksB` rather than the live values, and a
      step's values for a board that did not move are a non-owner's report; (2) `Clock.duration` may
      not track a RUNNING clock, so what a mover sends for the three seats it does not own is
      whatever those clocks held when they last started.
- [x] 5.2 Reconnect with a move in flight, on one board and on both (simul).
      DONE: Q1, Q4, Q9 in the bed.
- [x] 5.3 Reload with a move in flight, which is the case the two records diverge on — C-snap-reload-pending,
      candidate defect 1. S1 reloads but with nothing pending, so the suite does not cover this
      either. Hold the window open with the trick S5d used: kill the socket the instant the stale
      snapshot arrives, rather than racing 43ms.
      DONE: Q7 and Q8 in the bed, both passing.
- [ ] 5.4 Reconnect into a game that ended while away, and into one where the position moved past
      our queued move.
- [ ] 5.4a **The server restart, B4/T4/K9.** Restart the server mid-game and reconnect all four
      windows. Needs `test-users-survive-restart` first, or the windows return as new anonymous
      browsers with no seats and the test measures the wrong thing. Expect the rollback until
      `bughouse-persist-moves-as-played` lands; the point of running it before then is to see the
      client refuse it rather than accept it.
- [ ] 5.5 Cross-window comparison, not single-window: the 63s bug was invisible inside one window
      because each window was internally consistent.
- [x] 5.6 Frontend gates.

## 6. Not in this change

      DONE: typecheck clean, 294/294 jest.
- [ ] 6.1 The three stale clock values in a move message. Documented as deprecated in `sendMove`;
      shrinking them is its own change.
- [ ] 6.2 The two premove quirks recorded in `round-clocks-are-client-authoritative`.
- [ ] 6.3 Any server change. `handle_reconnect_bughouse` and the duplicate branch are inputs.
