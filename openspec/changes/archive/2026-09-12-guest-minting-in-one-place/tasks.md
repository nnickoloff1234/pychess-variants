# Tasks

## 0. Status

**Done 2026-09-12.** The code was written earlier on `bughouse-two-board-upstream` and never reached
the fork; this change is it arriving, with the record it never had. Verified by the Python gates and
by the suites that touch guest minting.

## 1. Port

- [x] 1.1 `mint_guest_user(app_state, request, session, *, arriving_at)` in `server/user.py`, holding
      the five steps in their existing order: `enforce_new_anonymous_identity_limit`, construct the
      `User` from `effective_theme`/`effective_game_category`, register in `app_state.users`,
      `await user.persist_test_identity()`, then stamp `session["user_name"]` and
      `REQUEST_NEW_SESSION_KEY`.
- [x] 1.2 The three entry points call it: `views/__init__.py` (`arriving_at="page"`),
      `websocket_utils.py` (`"websocket"`), `puzzle.py` (`"puzzle"`). Each loses its copy, and
      `puzzle.py` and `websocket_utils.py` lose the imports the copy needed
      (`enforce_new_anonymous_identity_limit`, `REQUEST_NEW_SESSION_KEY`, `effective_theme`).
- [x] 1.3 `websocket_utils.py` keeps its import deferred to call time, and now says why: `user`
      imports this module, and that cycle is the reason the copy lived here instead of being shared.
      The websocket path also keeps its own `_WS_SESSION_CHANGED_KEY` stamp, which is not part of the
      shared rule — only that path re-saves the session onto a prepared response.

- [x] 1.4 **`server/pychess_global_app_state.py` WAS NOT PORTED, AND THAT IS THE POINT OF THIS TASK.**
      The same upstream commit deletes `_is_mongomock()` from `_upsert_static_docs`' guard, leaving
      only `is_test_run()`. That guard is what lets the app start against a mock database driven by
      something other than pytest — both scenario beds — and it exists only in the fork. Taking the
      file wholesale would have removed it and broken the beds, which is exactly the kind of thing a
      four-file `git checkout` from another branch does quietly. Checked after porting: the guard is
      still there.

## 2. Verify

- [x] 2.1 Python gates in the fork: `ruff format` (806 files unchanged), `ruff check` (all passed),
      `pyrefly check` (0 errors, 26 suppressed), and CI's separate `pytest tests/test_simul.py`
      (40 passed).
- [x] 2.2 The suites that touch guest minting: `test_login`, `test_request_protection`,
      `test_anon_seek_restrictions`, `test_account_api` — 60 passed.
- [x] 2.3 Full `unittest discover -s tests`: **Ran 1178 tests, OK (skipped=1)**. Worth the run rather
      than the four suites alone, because the three call sites are reached by anything that renders a
      page, opens a socket or loads the puzzle page as a guest — which is most of the bed.

## 3. Not in this change

- The `movesAllowed` relocation on the same branch — `client/gameCtrl.ts` loses the base-class field
  and `client/two-board/common/gameCtrl.ts` gains a prototype method — is a structural choice rather
  than a fix, and the fork works as it stands. Left where it is deliberately; copying that file alone
  into the fork produces `error TS2425`, base property against subclass method.
