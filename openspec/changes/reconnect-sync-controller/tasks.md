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
- [x] 2.2 DONE 2026-09-07 — `case-to-code.md`, one row per branch naming the code that decides it,
      with line numbers. Both kinds of finding the task defines turned up:

      **Finding 1 — branch 2.1 is decided outside the controller** (`roundCtrl.ts:1004`), which the
      tree already said. What the audit adds is the cost: `seen`, the record branch 1.1.4 compares
      against, is fed from our own confirmations and from snapshots but NOT from other people's
      moves, because those never reach the class. A rollback that loses only an opponent move we
      were told about through 2.1 is undetectable. The detection gap and the ownership gap are the
      same gap, which is why moving 2.1 is worth more than it looks.

      **Finding 2 — the playable gate is applied in one path and not the other.** `decide()` shuts a
      board by emptying its dests map (`roundCtrl.ts:923`), and `setState()` ends in `setDests()`,
      so every single-move message re-opens the board it touches. The premove release is the same
      shape: gated on `decision.playable` in the full path, ungated in the single path.

      An argument that this was unreachable was written here first and was WRONG, in a way worth
      keeping: it inferred what the server holds from the fact that we have not been told. A move
      being unacknowledged says only that no message has reached us — the server may have received
      it, applied it, broadcast it, and had that broadcast die with the socket. Branch 1.2.3.2, "the
      server stays silent (it already had that move)", exists for exactly that case, so the argument
      contradicted the tree it was auditing. See `case-to-code.md`, finding 2.

      The finding stands without a reachability argument and is better for it: the client cannot
      know whether the board ought to re-open, because that depends on state only the server has. It
      can only apply its own decision consistently, which is this change's whole premise — decide
      from what has arrived, never from what the other end must be thinking.

      THEN IT PROVED REACHABLE ANYWAY, and by the cheapest route: `goPly()` is not a message but the
      READER, and returning to the last ply calls `setDests()` outright. Pressing left then right
      handed a shut board straight back. Scenario **R1** stages it and failed before the fix. The
      second unreachability attempt was wrong for a different reason than the first — it examined
      only what a MESSAGE can do and never asked what the reader can do.

      **FIXED 2026-09-07** as `GameController.movesAllowed`, a predicate `setDests()` consults
      rather than an overwrite applied after it — the mirror of `snapshot(history, playableNow)`,
      where the controller borrows a board it does not have. Written first as a cached boolean kept
      in step by a sync helper, which reintroduced the same disease in miniature (a third copy of
      one fact, with ordering rules to keep it fresh, and Q11 regressing when one was missed). The
      predicate removed the copy, the sync calls and both ordering rules. See `case-to-code.md`.

      **Finding 3 — a case the tree does not name.** `latestPly` is `msg.ply === this.ply + 1`,
      which is false both for a move OLDER than ours (2.1.2, correctly) and for one AHEAD by more
      than one, which the tree does not cover. Both get 2.1.2's answer, and `this.ply` only advances
      when `latestPly`, so a single gap latches until a full snapshot arrives. Reachability is low —
      a websocket delivers in order, and any break that loses a message ends in a reconnection that
      is answered with a full board message — but the tree claims to be exhaustive over what a
      message can be, and this is a shape it does not cover.
- [x] 2.3 DONE 2026-09-07, and it found one gap, which 2.2 had already exposed and which is now
      closed. The distinguishing state is: is a move waiting on this board, is the game over, does
      the arriving position contain the waiting move, can it accept it, is the arriving position
      older than one we were shown, whose move is arriving, and where that move sits relative to
      what we show. The last of those was the gap — "is this the next move" was asked as a boolean
      and has three answers, so a move AHEAD of us by more than one was answered as though it were
      behind us. Now `MovePlace`, branch 2.1.3.

      The enumeration is over that state rather than over remembered incidents: every branch is
      reachable from a combination of it, and every combination lands on a branch. What it is NOT
      exhaustive over is the SERVER's behaviour under 1.2.3 — played, silent, refused, rejected —
      which is four outcomes this class cannot distinguish by looking, and which the scenario bed
      covers instead.

## 3. The controller

- [x] 3.0 **K9 — a snapshot that went backwards.** DONE 2026-09-06 as branch 1.1.4.

      THE CASE, as originally stated: a snapshot whose position is older than ours, in a game that is
      not over, is not a legitimate state in any scenario except a server that has been rolled back.
      Every other case in this design assumes the snapshot is authoritative because the server knows
      more than we do; this is the one case where that is false. Detecting it is one comparison; what
      to DO was a decision — refuse and hold, or accept and warn — and it belongs to the controller
      because it is the only place that knows both positions.

      **NO LONGER HYPOTHETICAL — reproduced on demand 2026-09-06 as scenario T5.** Per-ply
      persistence (`bughouse-persist-moves-as-played`) applies a ply, broadcasts it, and queues the
      write; a process that dies in between leaves the document one ply short. Dropping that write
      deliberately (`reconnect_matrix/delays.py::drop_move_persistence`) stages it every time.
      Before the fix the bed reported:

          FAIL T5  no_silent_rollback  ROLLED BACK: was showing ['f3','g1'] (g1f3), now shows
                                       ['e5','e7']; the server's record is ['e2e4','e7e5']

      **WHICH BRANCH IT TOOK BEFORE 1.1.4 EXISTED, AND WHY THAT WAS THE WRONG ONE.** The lost move was ours and was
      CONFIRMED before the restart, so `ownMoveConfirmed()` cleared both records and nothing is
      waiting. The reconnection therefore enters `1.1 nothing was waiting to be sent`, finds a game
      that is not over and a position that differs from ours, and takes `1.1.3 moves happened while
      we were away` — "take the position, the move list and all four clocks, jump to the newest
      move". Here moves UN-happened, and 1.1.3 walked the reader backwards without a murmur: the
      game did not end, `PB.invariant()` stayed true, and nothing anywhere said anything was wrong.

      So the tree needed a sibling under 1.1 — the position that arrived is OLDER than ours — and it
      is the exact question `2.1.2 it is older than what we are already showing` already answers for
      a SINGLE move. The asymmetry is the finding: one move going backwards is handled, a whole
      position going backwards is not.

      **AND IT IS RECOVERABLE MORE OFTEN THAN IT LOOKS.** When the lost ply was OURS, the server's
      position is exactly the one our move was legal in, so the existing `1.2.3 send the move again`
      does the right thing unchanged. The only reason it does not fire is that the record was
      dropped on a confirmation the restart then revoked. **A confirmation is not durable** — the
      client treats "the server acknowledged it" as final, and asynchronous persistence makes that
      untrue. Worth deciding explicitly: keep the record until the move is known PERSISTED (a
      protocol change, and it re-couples the move to database latency), or compare plies on
      reconnect and resend what is missing from a history we still hold.

      When the lost ply was the OPPONENT'S, nothing on this client can restore it and the honest
      answer is to accept the server's position and SAY SO rather than roll back in silence.

      **WHAT WAS BUILT, AND THE DECISION BEHIND IT.** Branch 1.1.4 in the tree: the position is
      ACCEPTED, because a move the server cannot remember did not survive and this is the only
      truth left; the board STAYS PLAYABLE, deliberately unlike 1.2.3, because nothing of ours is
      in flight and replaying the lost move is the whole of the repair available to the reader —
      shutting the board would block it; and the fact is REPORTED, because the harm in this branch
      is not the rollback, which cannot be undone from here, but accepting one in silence.

      `BoardDecision.rolledBack` carries it and `roundCtrl` warns on it, once per board, named by
      branch. Detection compares MOVES, not move numbers, for the same reason `reconcile()` does.
      `seen` is in memory like `ahead`, so a RELOADED page cannot detect a rollback — it has no
      earlier position of its own to weigh the new one against, which is honest rather than a gap.

      **THE REMAINING GAP, and it is exactly the width of 2.1's absence.** `seen` is fed from a
      confirmation of our own move and from a snapshot. It is NOT fed from the opponent's single
      moves, because branch 2.1 is still decided in `updateSingleBoardAndClocks` and never reaches
      this class — so a rollback that loses only an opponent move we were told about separately
      goes undetected. It closes when 2.1 moves here (task 2.2).

      **NOT DONE, AND A REAL OPTION: repair rather than report.** When the lost ply was ours, the
      server's position is exactly the one it was legal in, so resending would restore the game
      outright. It is not done because the resend path runs from `socketOpened()` — the move would
      go out on the NEXT reconnection rather than now — so doing it properly means giving the
      controller a way to ask for a send, which is a larger change than this one.

      Covered in `tests/reconnectController.test.ts` by five tests numbered 1.1.4 and one numbered
      1.1.3 — the guard that a position which merely moved ON is not a rollback, which belongs to
      1.1.3 rather than to the new branch — and by scenario T5, which now passes:
      `rolled back ... and SAID SO (branch 1.1.4)`.

      NUMBERING IS PURELY ADDITIVE. 1.1.4 was appended after 1.1.3; nothing was renumbered, no
      number is reused, and every branch number cited anywhere in the client, the unit tests, the
      scenario bed and these tasks resolves to a branch the tree defines. Audited, not assumed.

- [x] 3.1 Define what it is given and what it returns: the message and the client's state in, a
      decision in the six terms out. Returning a DECISION rather than performing the work is what
      lets the cases be compared, and tested, without a socket.
      DONE: `BoardDecision {playable, clocksFromServer, because}` — data, so a case can be read and compared without a socket.
- [x] 3.2 Move the resend cache under it, so the cache has one owner rather than four callers.
      DONE: `pendingMoves.ts` has exactly one caller now.
- [x] 3.3 Move the ahead-of-server field under it, keeping the two answers distinct — see the
      requirement; collapsing them is the obvious simplification and it is wrong in both directions.
      DONE: kept distinct via the three-valued `outstanding()`.
- [ ] 3.4 PARTLY DONE 2026-09-07 — `MoveDecision.takeClocks` now carries the branch-2 rule, so the
      single-move path no longer decides it inline. What is still split is the OTHER half of that
      condition: `roundCtrl` ORs in "this seat's clock is still running", which is a fact about a
      `Clock` object the controller has never held. Settling it means either handing the controller
      that fact or moving the whole clock decision out. Branch 1's four-clock rule is still applied
      by the caller and is not expressed as a decision at all.
      Original: Express the clock rules as part of the decision: which seats resync, which keep their
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

- [ ] 6.4 **THE FLICKER: a full board message repaints away a move that is still pending, and
      nothing tests that it does.** Raised by Nikolay 2026-09-07, to be addressed, not now.

      A player who moves and then reconnects before the server confirms watches their move vanish
      and come back: `updateSteps(full)` clears the steps, `boardA.setState()` repaints to the
      server's position, and the move only reappears when the confirmation arrives (branch 2.2).
      It is deliberate — the alternative, keeping our optimistic position, strands us somewhere the
      server has never been if the move is ultimately rejected — and the shut board exists BECAUSE
      of the flicker, so a reader who has just watched their move disappear cannot simply play it
      again (which is the Q11 race).

      WHAT IS NOT TESTED IS THE FLICKER ITSELF. Q1 and Q8 assert the round trip's endpoints and R1
      asserts the board is shut in between; no scenario looks at the intermediate frame. So the
      unconditional reset could be made conditional and every test would still pass. Asserting a
      transient frame is fiddly — probably a MutationObserver or a screenshot at the right moment —
      which is why it is recorded rather than done.

      Worth deciding at the same time: whether the move should be repainted away at all, or held
      optimistically until the server has spoken. That is a product question, not a mechanical one.

- [ ] 6.3 **DOES AN ARMED PREMOVE SURVIVE A FULL BOARD MESSAGE, AND SHOULD IT?** Opened 2026-09-07
      while establishing what a full message resets, and deliberately not folded into that fix.

      THE RULE THAT PROMPTED IT: a full board message is a reset of everything the client holds,
      because everything it holds is a copy of something the server can restate — the sole
      exception being a move waiting to be sent, which the server never had. Applying that rule,
      `updateSteps(full)` clears the steps, the chat and the move list; the boards, pockets and all
      four clocks are replaced; `this.ply` now is too (task 3.3b). **An armed premove is not.**
      Nothing in `roundCtrl` or `gameCtrl` clears `board.premove` on a board message; it is set by
      `setPremove` and cleared by `unsetPremove`, which chessground calls on its own terms.

      WHY IT MIGHT BE RIGHT: the tree already says a premove may stay ARMED while a board is shut,
      because "a premove is an intention for a position that has not arrived yet". An intention is
      arguably not a copy of server state at all, which would put it beside the pending move as a
      second thing only the client has.

      WHY IT MIGHT BE WRONG: a premove is composed against a specific position, and a snapshot may
      have replaced that position with one where the intended move is meaningless or means
      something else. The tree's own concern is a premove FIRING into a position we know is behind;
      surviving a reset that changed the position underneath it is the same worry one step earlier.

      WHAT WOULD SETTLE IT: a scenario that arms a premove, delivers a full board message whose
      position makes the premove illegal, and asks what happens when the turn comes. N6 arms a
      premove across a reconnect but the position is unchanged, so it cannot distinguish the two
      readings. Until then this is an unstated behaviour rather than a known-good one.
- [ ] 6.3 Any server change. `handle_reconnect_bughouse` and the duplicate branch are inputs.
