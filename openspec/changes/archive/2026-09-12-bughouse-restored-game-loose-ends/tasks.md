# Tasks

## 1. The last-move highlight

- [x] 1.1 ALREADY TRUE, AND THE PROPOSAL'S PREMISE WAS STALE — checked 2026-09-12 before writing any
      code. `load_game_bug_from_doc()` fills `move` AND `moveB` in every step it builds ("no matter
      on which board the ply is happening i always need both fens and moves for both boards"), and
      the client's snapshot path reads each board's highlight off those steps. Nothing to carry.

- [x] 1.2 CONFIRMED FROM THE SCENARIO BED RATHER THAN THE HARNESS, which was cheaper and is
      repeatable. Both restart scenarios were already measuring the partner board's highlight and
      throwing it away:

        T4  lastA=['e5','e7']  lastB=['e4','e2']    restart under us
        T8  lastA=['f3','g1']  lastB=['e4','e2']    restart, rollback, then a move

      Both boards, at different plies, after a restart. (T5 and T6 read `lastB=[]` because their
      stagings never play on board B — absence of a move, not absence of a highlight.)

- [x] 1.3 WHAT WAS ACTUALLY MISSING WAS THE ASSERTION. `_check_client_matches_server` reads our own
      board alone, so the partner board's highlight was captured on every restart scenario and
      checked on none — it could have regressed silently at any time. Added
      `both_boards_highlighted`, on T4 and T8, which reports per board and skips a board the server
      has no move on. Run: T4 `a: server e7e5, client ['e5','e7']; b: server e2e4, client
      ['e4','e2']`; T8 the same shape.

      `PB.myNextMove()` was the original symptom (it reads the highlight and proposed `e2e4` into a
      position where e2 was empty). Nothing reproduces that today, and this check is what would
      catch it returning.

## 2. The dropped map

- [x] 2.1 REBUILT IN `load_game_bug_from_doc()`. The seat is derived exactly as `play_move()` derives
      it — from the colour to move on that board, here from that board's ply parity, which the loop
      already computes for the clocks (`mover_color`). The parity assumption this task said to check
      before trusting was already in use one line away, so it is not an assumption any more.

- [x] 2.2 MEASURED BOTH WAYS on scenario T6, which is the whole reason this mattered:

        without the fix:  "Game Nr4Tki2T refused invalid move e2e4 by ReconCamT6; resyncing that
                           client"                                        -> branch 1.2.3.4
        with the fix:     "move already played - probably resent twice after multiple reconnects"
                                                                          -> branch 1.2.3.2

      T6 PASSES EITHER WAY, which is why the bed never caught this and why the log is the oracle: both
      endings leave the client in step, so the defect was never a wrong outcome — it was the same
      input answered two ways depending on nothing but whether the server had restarted.

- [x] 2.3 The note in `reconnectController.ts` said the asymmetry as a standing fact. It now says it
      as history, names the rebuild, and quotes both log lines.

## 3. The dropped offers

- [x] 3.1 DECIDED 2026-09-12, Nikolay's call: NEITHER RESTORED NOR ANNOUNCED. Restoring means
      persisting an intention in the document, which it has never held; announcing means either
      detecting a restart — which a client cannot distinguish from any other reconnection — or
      cancelling offers on every socket drop, which needs a server hook and a message the clients do
      not have. Both are far past what the case is worth. The brief was the simplest thing that is
      consistent, not the kindest thing to a user.

- [x] 3.2 AND IT IS ALREADY BOUNDED, which is what makes doing nothing defensible rather than lazy.
      Read the handlers to find out what a press on a stale control does:

      - `handle_draw_bughouse` sees `draw_offer_team is None`, so "accept" is taken as a NEW offer
        from the presser's team and broadcast to all four with `full=True`.
      - `handle_resign_request_bughouse` sees `pending is None`, so "confirm" is taken as a fresh
        request and sent to the team.

      So the control does the wrong thing exactly once, no game ends wrongly, nothing is left stuck,
      and the press itself tells every client the new truth. A client that reloaded shows nothing and
      was right all along. What does NOT help, and was checked: the next move clears nothing, because
      `cancel_team_offers_on_move` only speaks when the server still holds the offer.

      Recorded where the two fields are declared in `game_bug.py`, so the next reader meets the
      decision and the reasoning at the state itself. No behaviour was added.

## 4. Verify

- [x] 4.1 `both_boards_highlighted` on T4 and T8 — see 1.3. A scenario of its own was not written:
      the two restart scenarios already stage exactly this and were already measuring it, and a third
      that restarts a game only to look at the highlight would add a minute to the bed for a fact
      those two now assert.
- [x] 4.2 Python gates, the full bed, and the frontend gates for the comment in
      `reconnectController.ts`.
