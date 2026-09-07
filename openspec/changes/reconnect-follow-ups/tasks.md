# Tasks

Carried out of `2026-09-07-reconnect-sync-controller`, which was archived with these open. The task
numbers there are given so the original wording can be found.

## 1. The clock rules (was 3.4)

- [ ] 1.1 Decide whether the controller is given the fact it lacks — is this seat's clock still
      running — or whether the whole clock decision moves out to the caller. Either settles it; what
      cannot stand is the current split, which works only because each side happens to see the half
      it needs.
- [ ] 1.2 Express branch 1's rule as a decision too: a whole position replaces all four clocks. It is
      applied by the caller today and stated nowhere.
- [ ] 1.3 The tree header already describes the rules in prose. Whatever is built, the prose and the
      code SHALL agree, and the prose is the one that must not be quietly outgrown.

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

- [ ] 2.2 Cover the intermediate frame with a scenario. NOW MUCH EASIER than the task assumed:
      `delays.py:hold_first_move` turns the frame into a steady state, so the assertion is an
      ordinary probe rather than a MutationObserver. Q11 already reports the board "showing
      ['e4','e2']" while the gate holds, which is the property, but it is incidental to that
      scenario's own checks rather than asserted.

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

- [ ] 4.1 S1, S2, S4, S5, S8, S9 and S11 of the clock stress suite were not re-run on 2026-09-06 —
      only S3, S6b, S7 and S10 were. Re-run them, or retire each with a reason. They were clean or
      fixed in the 2026-08-30 pass and nothing since obviously touches them, which is an argument for
      retiring rather than for assuming.

## 5. Not in this change

These are pointers, not work. They carry no checkbox on purpose: an open box here inflates what this
change still owes.

- The three stale clock values in a move message — that is `bughouse-shrink-ply-clock-record`, which
  exists and describes exactly it.
