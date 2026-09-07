# Tasks

## 1. Establish the ground truth first

- [x] 1.1 Reproduce the rollback. Done 2026-09-06 on game `XIfTJArb`: three moves played (board A
      `e4 e5`, board B `e4`), server restarted, and the document still read `m: []`. On reconnect the
      four clients kept their own board but took the server's clocks, which came back rolled up —
      `bw` 3583 -> 3599 — and `PB.invariant()` went FALSE, the windows now internally inconsistent.
      A hard reload then took the server's snapshot whole and showed the real damage: **ply 0, no
      moves, both boards at full time, `invariant` true**. Consistent and completely wrong, which is
      exactly the silent rollback the proposal describes.
- [x] 1.2 Confirm `active_game_filter` matches a bughouse document. It does:
      `{"r": "d", "$or": [{"s": -2}, {"s": -1}]}` against a document holding `r: "d"`, `s: -1`
      (`STARTED`, written at insert and never updated before this change).
- [x] 1.3 Check whether `load_game_bug_from_doc` copes with a partial document. It did NOT: the four
      `clocktimes_*` locals were bound inside `if "cw" in doc:` / `if "cwB" in doc:` but read
      unconditionally in the ply loop, so a document without clock history raised `NameError` inside
      the loop's bare `except`, which swallowed it and broke out — a game that loads silently with
      no moves. They are now defaulted before the lookups.

## 2. The writer

- [x] 2.1 `GameBug._queue_move_persist()` beside `save_game()`, pushing the move, the board marker
      `o`, the ply's four clock values and `ts`, and setting both fens and the status.
      `insert_game_to_db_bughouse()` now seeds `o`, `ts` and the four clock arrays so the pushes
      land in arrays that already carry the leading entry `load_game_bug_from_doc()` expects.
- [x] 2.2 Compare-and-set filter: unfinished game, this ply absent, previous ply present. A
      duplicate or out-of-order write is a no-op; a miss is logged rather than raised.
- [x] 2.3 `save_game()` still writes the authoritative arrays whole at the end, after draining.

## 3. Ordering

- [x] 3.1 One `asyncio.Queue` per game, drained by one worker task. Ordering is structural: the
      producer runs under `game.move_lock` (`wsr.py` wraps the whole bughouse move path in it), and
      there is exactly one consumer. **The payload is built synchronously at enqueue time** — by the
      time the worker runs, the game may be plies further on, and a payload that read `self.boards`
      then would persist the wrong position under this ply's index.
- [x] 3.2 `save_game()` awaits `_finish_move_persistence()` before writing, so the last ply cannot
      race the close.
- [x] 3.3 Queue depth beyond `MOVE_PERSIST_QUEUE_WARN_DEPTH` (3) logs a warning naming the depth, so
      a slow database cannot quietly widen the one-ply loss window into many.
- [x] 3.4 Not needed — the queue was about as much code as the design predicted and the synchronous
      fallback was not reached.

## 4. Recovery

- [x] 4.1 Restore from a partial document. Verified on `o7bSAD9B` across a real restart: position,
      ply, board interleaving and both boards' clocks all correct (see 5.1 for the numbers).
- [x] 4.2 Pockets. Played `1.e4 e5 2.Nf3 d5 3.exd5` on board A so the captured pawn crosses to board
      B, then restarted. The document held `fenB ... [p]`, and after the restart the restored game
      showed board B's pocket as `1,0,0,0,0` — one pawn, right board. Rebuilt by replay, as expected,
      and now confirmed rather than assumed.
- [x] 4.3 A restored game can be played on. After the restart, board A's white played `g1f3` into the
      restored position; it was accepted and appended at index 3 with `o` and all four clock arrays
      growing in lockstep, `cw` gaining `3314861` — the mover's own clock, matching what that window
      displayed.

## 5. Verify

- [x] 5.1 Restart mid-game with all four windows connected and `test-users-survive-restart` in place.
      Done on `o7bSAD9B`. The moves survived and the clocks came back right:
      `ab` 3587 and `bw` 3582 exact to the millisecond values in the document, and the two RUNNING
      clocks matched prediction to within rounding — `aw` 3405 against 3406 predicted, `bb` 3410
      against 3410 — where prediction is `last_move_clocks - (now - last move on that board)`.
- [x] 5.2 DONE by injection, 2026-09-06. `reconnect_matrix/delays.py::drop_move_persistence(after_n)`
      lets the first N plies persist and then stops persisting, which reproduces the consequence of
      a process dying between the in-memory apply and the queued write — deterministically, where
      the real window is milliseconds wide. Paired with `restart_server()`, which evicts the game
      from `app_state.games` so the next socket rebuilds it from the document, exactly as
      `load_game()` would after a deploy.

      Staged as scenario **T5**, and the loss is exactly one ply as designed. What the client does
      with it is the finding: it accepts the older position in silence.

          FAIL T5  no_silent_rollback  ROLLED BACK: was showing ['f3','g1'] (g1f3), now shows
                                       ['e5','e7']; the server's record is ['e2e4','e7e5']

      The game does not end, `no_invalid_move` passes and `PB.invariant()` stays true — nothing
      anywhere reports a problem. This is `reconnect-sync-controller` task 3.0 (K9), which is where
      the fix belongs; see the branch analysis recorded there.

- [x] 5.3 Not applicable — the asynchronous queue was adopted, so no synchronous latency to measure.
- [x] 5.4 Python gates: `ruff format`, `ruff check` (all passed), `pyrefly` (0 errors), and
      `unittest discover` — 1081 tests, OK (skipped=1).

## 6. What else changed meaning once `m` is non-empty mid-game

Persisting moves made two dormant conditions reachable for the first time. Both were found by
asking what else reads the move list, not by seeing them fail — and they masked each other, so the
first fix is what exposed the second.

- [x] 6.1 **A restored game believed it had already been saved.** `load_game_bug_from_doc()` had
      `if mlist or (game.tournamentId is not None and doc["s"] > STARTED)`, where the one-board path
      has `if (mlist or game.tournamentId is not None) and doc["s"] > STARTED`. The status test
      governs both clauses there and only the second one here, so a non-empty move list ALONE set
      `saved`. Harmless while `doc["m"]` was always `[]` for a game in progress; with per-ply
      persistence it is true of every restored game, and `save_game()` opens with
      `if self.saved: return`. A game that survived a restart would have refused to write its own
      ending — no result, no ratings, no final clock arrays. Brackets corrected to match one-board.

- [x] 6.2 **A restored game then crashed trying to save.** With 6.1 fixed, `save_game()` ran for the
      first time on a rebuilt game and died on `"ts": [x["ts"] for x in self.steps]` with
      `KeyError: 'ts'` — the steps rebuilt by `load_game_bug_from_doc()` never carried `ts`. The
      resignation was applied in memory and the document kept saying the game was still in progress,
      which from a client's side is indistinguishable from working. Fixed on both sides: the loader
      now sets `step["ts"]` from the document, and `save_game()` reads it with `.get(..., 0)` so a
      game stored before `ts` existed can still write its ending.

- [x] 6.3 Guarded by scenario **T7**, which ends a game that has been through a restart and asserts
      against the DOCUMENT rather than the in-memory game — the only oracle that can tell 7.2 from
      success.

- [ ] 6.4 NOT A DEFECT, WORTH KNOWING: the compare-and-set filter means a single failed write stops
      every later one, because each ply's filter requires the previous ply to be present. So a
      transient database error truncates the document at that point rather than leaving a hole in
      the middle of `m`, which is the failure mode the decoder can actually survive.

## 7. Not in this change

- [ ] 7.1 The client's response to a rolled-back snapshot — `reconnect-sync-controller` task 3.0.
- [ ] 7.2 Takebacks. Bughouse has none, so no `pop_move_from_db()` analogue is needed.
- [x] 7.3 CARRIED FORWARD to `bughouse-restored-game-loose-ends`, not fixed here: a restored game
      renders without its last-move highlight on either board, because the restore path does not
      send a per-board `lastmove`. Cosmetic — position, pockets and clocks are all correct — but it
      also misleads `PB.myNextMove()` in the harness, which reads the highlight to locate its place.
- [x] 7.4 CARRIED FORWARD to the same change: a restart drops `lastmovePerBoardAndUser` (the
      duplicate-move guard) and any pending `draw_offer_team` / `resign_offer`, none of which are in
      the document. The first changes which branch a resent move takes — see scenario T6, which
      passes either way — and the second means an offer outstanding across a restart vanishes
      server-side while the clients may still be showing it.
