# Tasks

Carried out of `2026-09-07-reconnect-sync-controller`, which was archived with these open. The task
numbers there are given so the original wording can be found.

Sections 1 to 4 are that inheritance. **Section 5 is not**: it is work found and finished while
deciding 1.1, written down here because the whole point of this change is that work nobody recorded
is work nobody can find. Its numbers are this file's own and do not map to the archived change.

## 1. The clock rules (was 3.4)

- [x] 1.1 DECIDED AND DONE 2026-09-12: one field, and the controller owns it. Nikolay's call,
      from four options — fold it in, pass `clockRunning` in as an argument, move the whole
      decision to the caller, or delete the caller's half and let the next message heal it.

      THE FACT THE CALLER WAS SUPPLYING WAS ALREADY IN THE CLASS, which is what made the choice
      easy. `this.ahead[board]` is set by `moveSent()` and kept in memory on purpose — "a claim
      this page is making, and a page that has just started has made none" — so reading it before
      the delete in `ourMoveCameBack()` answers "did THIS page send this move", which is exactly
      what "did `sendMove()` ever pause this seat's clock in this page's lifetime" means. No new
      parameter, no `Clock`, and the rule is now reachable from the unit bed.

      `takeClocks: resent || !sentByThisPage`, and `roundCtrl` ORs in nothing.

      `Clock.running` WAS A SYMPTOM, NOT THE FACT, and that is the defect the task sensed without
      naming. `updateClocks()` flips that flag itself, so every full board message leaving us on
      the move turned the caller's half true for reasons unrelated to who sent what. It agreed with
      the intent by coincidence — the same shape as the two ordering traps already fixed here.

      THE PREREQUISITE THIS FILE RECORDED IS SETTLED BY CONSTRUCTION, not by luck. Storage lost
      while THIS page sent the move: `sentByThisPage` is true, so the local reading is kept — right,
      because `sendMove()` did pause it here. A previous page instance sent it: false, so the
      server's pair wins — right, and it is the case the old OR was accidentally covering.

      A NEW BRANCH, BECAUSE THE RULE NOW HAS THREE ANSWERS. 2.2.3 — "ours, but this page never
      sent it" — is in the tree, in the prose and in `because`. And one unit test flipped: it
      asserted `takeClocks === false` for a confirmation we were not holding, under the name
      "changes nothing", which was the controller's rule and never the app's. The two agree now.

      Verified live on `lCClCH9c`: 2.2.1 keeps the mover's own clock to the digit (bb 22:31 across
      its own confirmation, `ownClockUnchanged`), and 2.1.1 still takes the pair (p4 reading the
      mover's exact 22:31).

- [x] 1.2 DONE 2026-09-12, in the same pass and by the same decision.
      `SnapshotDecision.takeAllClocks` — `snapshot()` returns it beside the two boards' answers,
      because every clock being replaced together is true of no other message and so belongs to
      the game rather than to a board. `roundCtrl`'s `if (!this.isGameOver())` became
      `if (decision.takeAllClocks)`.

      WHAT MAKES IT EXPRESSIBLE NOW is that the answer is not always the same. This type used to
      refuse the clocks and said why: a `clocksFromServer` flag had been true in every branch and
      read by nobody. `takeAllClocks` is false for branch 1.1.1, a position for a finished game.

      THE ORDERING IS LOAD-BEARING AND WAS CHECKED FIRST: `onMsgBoard` calls `checkStatus(msg)` —
      which calls `gameEnded()` on a final status, and pauses all four clocks — BEFORE it
      dispatches to either branch. So `finished` is already set when `snapshot()` is asked, and
      the field gives the same answer the caller's status guard did, from the object that owns the
      branch.

      Verified live by replaying a server-issued full board message with a final status onto one
      window: all four values identical before and after, none running. The message carried
      clocks (a 20:55/47:19, b 45:43/22:32) that differed from the display, so a wrong `true` would
      have moved `aw` 20:45→20:55 and `bw` 45:33→45:43. It moved neither.
- [x] 1.3 The tree header already describes the rules in prose. Whatever is built, the prose and the
      code SHALL agree, and the prose is the one that must not be quietly outgrown.

      DONE 2026-09-12 with 1.1 and 1.2, three edits to the header. The tree gained branch 2.2.3.
      "OUR OWN MOVE" is rewritten around the test that actually decides it — did THIS page pause
      that clock — with both ways for the answer to be no, and a paragraph saying plainly that
      "is the clock running" is a symptom of it and not the rule. The whole-game paragraph now
      names `takeAllClocks` and states the finished-game case, which the prose had never covered.

      What the prose no longer says, deliberately: that the clock decision is split between two
      objects. It is not, any more.

      READ FOR 1.1 ON 2026-09-12, so it is not re-derived. No carrier of a live defect was found:
      everywhere one half of the OR is true alone, taking the server's clocks is also the right
      answer, so the split is safe by coincidence rather than by rule. Two specifics worth having:

      - IN THE ONLY FLOW WHERE A CLOCK GOES UNPAUSED BY `sendMove()` — a resend after a break —
        BOTH HALVES ARE TRUE TOGETHER. `loadPendingMoves()` marks every queued entry `resent: true`
        before the message goes out, so the confirmation is 2.2.2 (`takeClocks: true`) anyway; and
        on a reloaded page the snapshot has already restarted our clock, so `running` is true too.
        The caller's half is therefore not covering a case the controller's half misses here.
      - ITS ONLY INDEPENDENT DOMAIN IS A LOST DURABLE RECORD: storage blocked or cleared, so
        `consumePendingMove()` answers false while the server still confirms. `pendingMoves.ts`
        guards every storage access and no-ops silently, so that case is reachable. Check it before
        deleting the half — it is the one thing keeping the OR alive.
      - `Clock.running` IS NOT THE FACT THE COMMENT CLAIMS. It says "whether `sendMove()` ever
        paused this seat's clock in this page's lifetime"; `updateClocks()` itself flips the flag
        (`pause(false)` then `start()`), so every full board message where the server still has us
        on the move turns it true for unrelated reasons. Whatever 1.1 builds, it should pass the
        fact it means, not this proxy — the same ordering trap that produced the `pushMove` and
        `setDests` bugs already fixed in this file.

## 2. The flicker (was 6.4)

- [x] 2.1 DECIDED 2026-09-07: the repaint is wrong and the move is held optimistically.
      `BoardDecision.replay` carries the move; `roundCtrl.replayPendingMove()` puts it back on the
      board after the snapshot. The strand-the-client risk the task named does not arise, because
      2.4 below makes 1.2.2 able to see a refusal for the first time.

- [x] 2.4 A BUG FOUND WHILE DOING 2.1, and the reason 2.1 is safe. `snapshot()` ran at the TOP of
      `updateBothBoardsAndClocksOnFullBoardMsg`, before `setState()`, so 1.2.2's legality callback
      read ffish while it still held the PRE-message position. A round-page move is never pushed to
      ffish — only the analysis page calls `playMove()` — so ffish sat at the position the move was
      generated from, where it is legal by construction, and the callback answered "yes" whatever
      the server had just said.

      What it cost: branch 1.2.3.4 could not self-heal as the tree claims. The invalid-move resync
      (`server/bug/utils_bug.py:679`) delivers a full board on a STILL-OPEN socket, so no
      reconnection follows and nothing resends. The move stayed pending, the board stayed shut, the
      reader's clock stayed stopped, and the server went on waiting for a move it had thrown away.

      Fixed by consulting after the repaint. Scenario Q11 went from FAIL to PASS on this change
      alone.

- [x] 2.2 DONE 2026-09-12. The frame is asserted in the scenario that was already staging it, and a
      twin covers the other door.

      `optimistic_move_shown` — a new check: while the server still holds our move, the board shows
      it. Exactly the ordinary probe the task predicted, because `hold_first_move` makes the frame a
      steady state. Q11 was producing the observation and throwing it away: it lived only inside
      `_check_playable_gate_held`'s FAILURE message, so a passing run never looked at it. Added to
      Q11's `expect`, and the ctx key it reads was renamed `stale_last_move` →
      `shown_before_confirmation`, because "stale" describes the world before the replay landed and
      what the page shows there is now our own move put back.

      **Q12 — `move_in_flight_reconnect`**, Q11's twin through the other door, and the difference is
      the one 1.1 turns on. Q11 is B3: the page is destroyed, its in-memory record of the move dies,
      and the confirmation arrives as branch 2.2.3 where the server's clocks win. Q12 is B1: the
      socket drops, the page and the record live, the move is resent, and the confirmation is 2.2.2.
      Both show the move while the server holds it. No second move is played in Q12 on purpose —
      Q11 plays one because its subject is the overwrite race, and mixing them would let a failure
      in one read as a failure in the other.

      Q11 ok (4 checks, `one_move_lost_at_most` skipped — no second move was made, because the gate
      now holds where it once did not). Q12 ok on all six.

      **Q12 DOES NOT ASSERT `invariant`, AND THE OMISSION IS A FINDING.** It fails by construction:
      `handle_reconnect_bughouse` samples `get_clocks_for_board_msg(full=True)` BEFORE taking the
      game lock, so a held move never charges the held interval to that board while the other
      board's clock ticks on locally. Measured `boardA 7192` against `boardB 7180` — a 12s gap for a
      ~12s hold. A real reconnect has no such lock, and the hand-run 40s outage in 4.1's S5 the same
      day left the invariant intact, which is the control. Asserting it here would test the staging.

      **A DETOUR WORTH RECORDING, BECAUSE THE FIRST DIAGNOSIS WAS WRONG.** The first run died on
      startup: pymongo 4.17 passes `sort=` on every bulk update, mongomock 4.3 rejects it, and
      `init_from_db`'s video upsert raised `TypeError` before the first scenario. That looked like
      dependency drift and was written up here as needing a pin in `pyproject.toml`. IT IS NOT.

      The bed was being run against the MAIN checkout's server code, and the fork already carries
      the fix — `_upsert_static_docs` guards with `if is_test_run() or _is_mongomock(collection)`,
      added when the layout matrix bed hit this same wall and documented as "a fact about mongomock,
      not about pytest". Upstream master has no such guard. So there is nothing to pin and nothing
      to shim: **the bed runs clean in the fork**, which is where it lives and now where everything
      lives. The shim that briefly existed in `reconnect_matrix/__main__.py` is deleted.

      It is also a small argument for the one-checkout rule adopted the same day: the whole problem
      was an artifact of running a fork test bed against a different branch's server.

      **WHERE IT RAN.** In the fork, after provisioning it (`yarn install`, `uv sync --extra dev`) —
      it had neither `node_modules` nor playwright, which is why it could not run there before. The
      full frontend gate set passes there too. The temporary copy of the bed in the main checkout
      has been deleted, so there is one copy again.

      **Full bed: 30 PASS / 0 FAIL / 1 N/A**, against the 29 / 0 / 1 of 2026-09-07. The row set was
      diffed against the catalogue rather than trusted on the count: 31 rows run, 31 catalogued,
      none missing on either side, and the single N/A is still N7, which is `collapsed` — not a
      distinct case — rather than a scenario that quietly stopped running. The +1 is Q12.

- [x] 2.3 NOTED 2026-09-07, and the kinship is closer than the task guessed. `bughouse-restored-
      game-loose-ends` 1.1 is a restored game rendering with no last-move highlight; the flicker was
      a repaint dropping the reader's own move. Both are "what a repaint carries", and BOTH turned
      out to be about ORDER rather than content — the highlight is missing because the fact is not
      carried through `load_game_bug_from_doc()`, the move vanished because the repaint ran before
      the decision that knew about it. Worth reading the ordering-trap section of the tree before
      taking 1.1 there.

- [x] 2.5 DONE 2026-09-07 — `clock_runs_for_side_to_move`, on the 22 scenarios that already assert
      the invariant. It asks the server's game object whose turn it is per board, then asserts that
      seat's clock is running and the other's is not.

      `invariant` STRUCTURALLY CANNOT CATCH THIS. Start the wrong seat's clock and each board still
      has exactly one running and the totals still balance — the player watches their opponent's
      time drain while the server charges them. Q1 caught the `pushMove` defect only through
      `playable` ("selection refused"), a symptom two steps from the disease; a clock regression
      that did not also shut the board would have gone straight through.

      It also settles the question the clock group raised: 22 real assertions across four distinct
      turn combinations, all agreeing, so there is NO clock defect on reconnect, refresh or restart
      today. That makes 1.1-1.3 a cleanup for when the clocks are next touched rather than a fix.

## 3. Premoves (was 6.2 and 6.5)

- [x] 3.1 DECIDED 2026-09-07: an armed premove SURVIVES a full board message. It is an intention
      about a position that has not arrived, not a copy of anything the server holds, so a snapshot
      has nothing to restate about it. A page refresh is the one exception and it is physics rather
      than policy — `premovable.current` lives in chessground's memory and dies with the page, while
      the pending MOVE survives only because it is written to storage.

      Implemented as `BoardDecision.releasePremove`. Branch 1's premove rule had been an expression
      at a call site (`playable && premove && turnColor === myColor`), so half of it lived in the
      caller and no test could reach it — the same split still open for the clocks in task 1. The
      caller now passes in the one fact the controller cannot hold (whose turn the arriving position
      leaves it), the way it already answers 1.2.2's legality question. Ten unit tests, and a new
      "WHAT A PREMOVE IS, AND WHAT ENDS ONE" section in the tree.

- [x] 3.2 COVERED, and it found a bug. N6 already staged the case; what it lacked was any check on
      the premove — it asserted the cache, the invariant and the opponent's move, so a discarded
      premove passed. `premove_fired` added, asked of the SERVER because a premove chessground threw
      away is indistinguishable in the DOM from one never armed.

      N9 is new and covers the harder shape: the premove armed BEHIND a move the server has not
      acknowledged, so the board is shut. IT FAILED, and `armed at the time=True` ruled out the
      obvious explanation — the premove was armed and then lost.

      Cause: `setState()` calls `setDests()` before the consultation, so while our move was still
      pending the map was set EMPTY; `reconcile()` then cleared the move and opened the board, and
      nothing recomputed. `playPremove` reads `movable.dests`, and discards the premove whether or
      not it plays it. Beyond the premove this also left the board open and destless after any
      reconnect that cleared a pending move. Fixed by recomputing dests once the decision is known.

      Both scenarios pass; all three moves reach the server in each.
- [x] 3.3 The two premove quirks in the `round-clocks-are-client-authoritative` note are BOTH
      ALREADY FIXED, verified 2026-09-07 — the note was stale and has been corrected. `setTime()`
      now runs before `msgClocks` is read, so what is sent is what is shown; and the branch uses
      `b.boardName` throughout with no hardcoded `'a'`/`'b'` left, so premoving on one board no
      longer touches the other's seat. The seat refactor closed both in passing.
- [x] 3.4 FIXED AND VERIFIED 2026-09-07. The reader is returned to the live position before the
      premove is released, and only when one is armed — a reader browsing without one is left alone.
      Snapping them forward is not the yank R2/R3 guard against: those protect a reader who is NOT
      trying to move, and arming a premove is an explicit statement that you intend to.

      Scenario R4 covers it, and NEEDS NO BREAK OF ANY KIND, which makes it the most ordinary case
      in the bed. Confirmed by reverting the fix: R4 fails with the premove missing from the server
      record, passes with it. Bed 29 PASS / 0 FAIL / 1 N/A.

      The original description, kept because the correction is the point:

      A PREMOVE IS SILENTLY DESTROYED IF THE READER SCROLLS WHILE IT IS ARMED. Found
      2026-09-07, and first recorded here with the symptom BACKWARDS — as "a premove can be
      dispatched against boards showing history". It cannot be dispatched; chessground refuses, and
      then throws it away.

      The sequence: the premove survives the scroll (`configure()` with a new fen does not touch
      `premovable.current`), but `renderPly` clears `movable.color`/`dests` for a reader who is not
      at the end. When the opponent's move arrives, `place` is 'next' so `releasePremove` is true,
      while `readerAtEnd` is false so the board is never repainted. `performPremove()` then reaches
      chessground's `playPremove`, whose `canMove` needs `movable.color` and gets `undefined` — so
      nothing is played, and `unsetPremove(state)` runs OUTSIDE the `if` and discards it anyway.

      The reader is left with no premove, no move sent, and their clock running while they believe
      they have already moved.

      NO TECHNICAL REASON IT MUST BE SO. A premove is an intention about the live position, stored
      as (orig, dest); scrolling does not invalidate it and does not erase it. The obstacle is
      coupling inside chessground: "send the premove" and "animate it on the displayed board" are
      one call, which declines when the displayed board is not the live one.

      Three readings, to decide with 3.1:
        (a) return the reader to the live position, then release. Arming a premove is an explicit
            declaration of intent to move, so being snapped back when the turn arrives is expected
            rather than a yank — R2/R3 protect a reader who is NOT trying to move. Simplest.
        (b) decouple: read `premovable.current`, send the UCI, leave the reader where they are. The
            scroll survives, but the reader does not see their own move land.
        (c) keep it armed when it cannot fire — wrong: the opportunity has passed and it would
            later apply to a position it was not composed against.

## 4. Verification debt (was 5.1)

- [x] 4.1 DONE 2026-09-12 on game `lCClCH9c`: THREE RE-RUN, FOUR RETIRED. The task's own argument
      for retiring — "nothing since obviously touches them" — had expired by the time it was read:
      1.1, 1.2 and 5.3 changed which clocks are taken in three branches, so the three tests that
      touch those paths were run rather than assumed.

      **S1 — hard reload of the window whose clock is running · CLEAN.** Reloaded p1 mid-game with
      its own clock ticking. Stopped clocks identical to the second across the reload and across
      windows (`ab 2839`, `bb 1351`); running clocks within 0.7s of the reference after normalising
      the 38.7s between readings; invariant held. Same verdict as 2026-08-30, and it now also covers
      `SnapshotDecision.takeAllClocks`.

      **S11 — rapid alternating moves on both boards · CLEAN.** Six moves, alternating boards
      (A d2d4, B Bf4g5, A d7d6, B h7h6, A Bf1e2, B Bg5f4), then all four windows read in turn:

        p4 @ ...409992   ab 2774*  bb 1291*  aw 426  bw 1909
        p2 @ ...421067   ab 2763*  bb 1280*  aw 426  bw 1909
        p1 @ ...432324   ab 2752*  bb 1269*  aw 426  bw 1909
        p3 @ ...443261   ab 2741*  bb 1258*  aw 426  bw 1909

      The stopped pair is identical in all four windows — the cross-window oracle, the only one that
      catches an error shifting both boards alike — and each running clock falls exactly with the
      gap between readings (11s per ~11s step). Invariant ok everywhere, `boardA 3200 == boardB 3200`.

      **S5 — queued own move stacked under a premove · CLEAN, and the behaviour has changed since
      2026-08-30.** p3 (A-black, on move) went offline with `PB.offline()`, played `g8f6` (queued),
      attempted a premove `e5d4` on top, and came back after a self-timed 40s outage.

      Then: the premove fired in the same instant as the replayed move, pyffish raised
      `ValueError: Invalid move`, and the game ended `status=10` INVALIDMOVE **against the player who
      had merely been disconnected**.

      Now: exactly ONE game message went out on reconnect — the `reconnect` carrying the queued move —
      and `handle_reconnect_bughouse` played `g8f6` once, with no exception and no status change. The
      game stayed alive.

      THE PREMOVE IS NO LONGER CANCELLED, IT IS WITHHELD, and that is a different mechanism from the
      2026-08-30 fix. That fix cancelled a premove on any board holding an unacknowledged move; the
      2026-09-07 decision reversed it — a snapshot does not end a premove — and branch 1.2.3's
      `releasePremove: false` withholds it instead ("releasing here would put a second move in flight
      behind the first"). Measured: `premoveArmed: 2` after the reconnect with no move message sent,
      then the premove fired by itself the moment White played `h2h3`, arriving as `e5d4`. Two
      messages from that window across the whole sequence, `premoveArmed: 0` after, cache cleared,
      invariant ok. Nothing lost and nothing fired early, which is a better answer than cancelling.

      STILL TRUE AND STILL NOT A BUG: the replayed move is recorded with the SERVER's clocks at
      reconnect time, so the outage is billed to the player who was disconnected. Deliberate in
      `handle_reconnect_bughouse` ("on reconnect use server time"); the 2026-08-30 note calling it
      a policy worth revisiting stands, and is not this change's business.

      **RETIRED, with reasons:**

      - **S2 — freeze a client with SIGSTOP.** Inconclusive by construction: freezing the browser
        stops the page's JS too, so it cannot premove, queue or tick, and it courts the ~60s abandon
        timeout — it cost the game last time and produced nothing about clocks. The playbook itself
        now prefers `PB.offline()`, which S3, S5 and S7 use. Retired as a technique, not deferred.
      - **S4 — the abandon path.** Exercises the server's abandon task, which today's work does not
        touch: every change here is client-side clock arithmetic. It also ends the game by design,
        so re-running it costs the harness its game for no coverage of the changed code.
      - **S8 — premove invalidated by the opponent's move.** Clean in 2026-08-30, and its ground was
        covered incidentally today: S5's withheld premove was released by an opponent's move and
        behaved correctly. Nothing in 1.1/1.2/5.3 reaches premove invalidation.
      - **S9 — simul, one user on two seats.** Did not reproduce the `ZdoeZseB` signatures it was
        written for, and simul seating is orthogonal to which clocks a message replaces. If the
        `ZdoeZseB` shape ever recurs, this is worth reviving — it is retired as unproductive, not as
        answered.

## 5. Fixed while deciding 1.1 — not carried from the archived change

Both were found by reading the code for 1.1 and both were verified in the four-window harness on
game `lCClCH9c`, 2026-09-12. Neither was on anybody's list.

- [x] 5.1 THE CALLER FED THE DECISION FACTS OUT OF `this.steps`, NOT OUT OF THE MESSAGE. FIXED.

      `updateSingleBoardAndClocks` took `lastStepA`/`lastStepB` from `this.steps`, which holds the
      arriving move only when it was pushed — and `updateSteps` pushes a single move only when
      `ply === this.steps.length`, the very test that produces `place === 'next'`. So for 'older'
      and 'ahead' the turn colour, the mover, the ownership answer and the move itself all
      described a DIFFERENT ply.

      What it cost, three things. `updateClocks()` is handed that turn colour and it decides which
      of the two clocks restarts, so 2.1.3 could start the seat the server does NOT have on the
      move. A wrong `mine` could route somebody else's out-of-order move into branch 2.2, where
      the position is applied unconditionally and `movesMissing` is false — the missing-move
      report lost. And on a page whose `steps` is still empty, which is exactly the case the
      `full` test documents (a broadcast landing between the socket opening and the snapshot),
      `this.steps[-1]` was `undefined` and `onMsgBoard` THREW before any decision was consulted.
      The graceful 2.1.3 that comment promises was unreachable on a fresh load.

      Now one `step` parameter, the message's own, and `lastStep`/`lastStepA`/`lastStepB` are
      confined to the `full` branch where `updateSteps` has just rebuilt them from that same
      message.

- [x] 5.2 A REGRESSION THE FIRST ATTEMPT AT 5.1 CAUSED, kept here because it is the durable part.

      A LIVE step fills only the board its move happened on — `move_a = move if board == "a" else
      ""` in `server/bug/game_bug.py` — while the LOADER fills both boards' last moves into every
      step (`server/bug/utils_bug.py`). Reading the partner board's last move off an arriving
      single move therefore read `""`, and the repaint blanked the other board's highlight.
      Measured: p3 reported `lastMoveB: []` immediately after a board-a move.

      So the partner board's last move is the ONE fact a single-move message does not carry, and
      it is read from `this.steps` deliberately. Both fens are always sent, so everything else
      still comes from the message. Do not "simplify" this back.

      It is also the answer to a question 5.1 raised and could not settle by reading: a step's
      `move`/`moveB` pair means different things depending on which path built it.

- [x] 5.3 BRANCH 2.1.2 TAKES NO CLOCKS. DECIDED AND DONE 2026-09-12; it used to take that board's
      pair, and the sub-question belonged to 1.1 rather than to any task here.

      The old rule was inherited from a misreading the branch's own note admitted — "the reader has
      scrolled back". Scrolling cannot produce 'older': `place` is decided against `steps.length`,
      the game we hold, while the reader's cursor is `readerAtEnd` and is the caller's business. So
      the branch only ever means the MESSAGE is behind.

      And such a message is stale in its clocks by exactly as much as it is stale in its ply.
      `get_board()` builds a single-move message from `steps[-1]` with `last_move_clocks` read at
      that same instant, so a message's ply and its times always agree — the server cannot send an
      old ply with fresh clocks. Taking the pair therefore set that board BACKWARDS, and
      `updateClocks()` writes both seats, so the harmless half cannot be taken without the other.

      MEASURED BOTH WAYS, by recording a real single-move message off the live socket, advancing
      the game past it, and re-dispatching it as 'older':

        old rule: bw 49:29 running -> 50:08 stopped, bb 51:38 stopped -> 53:01 RUNNING, and the
                  invariant false. Both values set back, and the wrong clock started from the
                  stale message's turn colour.
        new rule: bw 47:37 -> 47:36 (one ordinary tick), bb 51:21 -> 51:21, invariant true either
                  side of the replay, position untouched.

      Nothing is lost by declining the duplicate-of-the-last-move case too: a reload restored the
      corrupted window from the snapshot, and 2.1.1 still takes the pair on a real move — `bw` at
      the mover's exact 46:44 across windows after the fix.

      TWO CONSEQUENCES FOR THE TASKS ABOVE. The caller's OR cannot reach this branch, because
      `myMove` is false in all of 2.1 — so no `Clock.running` reading can resurrect the old
      behaviour. And `takeClocks` is now false in two of six branches, which removes the argument
      that it is a nearly-always-true field: folding 1.1's other half into it is more attractive
      than it was when this change was written.

## 6. Not in this change

These are pointers, not work. They carry no checkbox on purpose: an open box here inflates what this
change still owes.

- The three stale clock values in a move message — that is `bughouse-shrink-ply-clock-record`, which
  exists and describes exactly it.
