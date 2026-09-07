# Tasks

## 1. Persist

- [x] 1.1 Write the test user to `db.user` when it is created, on the `-a` path only.
      `User.persist_test_identity()` (`server/user.py`), called from all THREE guest-creation
      sites — `views/__init__.py`, `websocket_utils.py` and `puzzle.py`. The third was missed by
      the original impact note; a browser whose first stateful action is a puzzle creates a guest
      down that path.
- [x] 1.2 Confirm the reconstructed user comes back with `anon` False and whatever else the
      test-user branch depends on. `_load_registered_user()` passes `username=`, so `anon` takes
      its default of False, and `perfs`/`pperfs` arrive as `{}` rather than `None`, which also
      skips the `RatingResetError` guard that only fires for `perfs=None`. Verified live: the
      restored user renders the lobby and holds its preference.
- [x] 1.3 Confirm production writes nothing. Double-guarded: `is_test_user()` is
      `anon_as_test_users and username.startswith(TEST_PREFIX)`, so it is False in production
      whatever the name; and without `-a` a guest is built with `anon=True` and an `Anon-` name,
      which fails the prefix test as well. Measured after this change with `-a` ON:
      `{test: 4, anon: 0, none: 0, total: 4}` — only test users ever gain a document.

## 2. Seats and games

- [x] 2.1 DONE — unblocked once `bughouse-persist-moves-as-played` landed, and verified live rather
      than reasoned. A bughouse game now persists each ply, so a restart leaves a real game in the
      database for a reconstructed user to be the seat holder OF, which is what could not be
      observed before.

      Measured on game `o7bSAD9B` across a real `docker compose restart server`: the game came back
      from its document with all its moves, and `Test–FersKnight` — an identity that itself survived
      only because of this change — was recognised as board A white and PLAYED ON, `g1f3` being
      accepted and appended at the right index. Both halves had to work for that single move to
      land: the player had to be the same user, and the game had to be the same game.

- [x] 2.2 DONE — all four windows kept their identities across the same restart and each returned to
      its own seat: `Test–FersKnight` (A white), `Test–ClobberChancell` (B black),
      `Test–AlfilJanggiElep` (A black), `Test–KnightFersAlfil` (B white). `db.user` still held
      exactly four documents afterwards, so nothing was duplicated on the way back.

## 3. Housekeeping

- [x] 3.1 REJECTED — accepted debt, Nikolay 2026-09-06. Test-user documents accumulate one per
      browser on a development database. They are already identifiable by the `Test-` prefix
      (`db.user.find({_id:/^Test/})`), so a manual sweep is available if one is ever wanted; no
      automatic cleanup is being built.
- [x] 3.2 REJECTED — accepted debt, Nikolay 2026-09-06. `_generate_test_username()` still checks
      only the in-memory store, so a restarted server can re-mint a name that exists in the
      database. The consequence is bounded and benign: `persist_test_identity()` catches
      `DuplicateKeyError` and reuses the existing document, which is the correct outcome anyway —
      the same name IS the same identity. The residual risk is a new browser inheriting an old
      browser's ratings, which does not matter for a `-a` guest.

## 4. Verify

- [x] 4.1 Restart the server mid-session with `-a` and confirm all four harness windows keep their
      names. Done 2026-09-06 across a full `docker compose restart server`:
      p1 `Test–FersKnight`, p2 `Test–ClobberChancell`, p3 `Test–AlfilJanggiElep`,
      p4 `Test–KnightFersAlfil` — all four identical before and after, `db.user` still holding
      exactly 4 documents afterwards (no duplicate insert on the way back).
      The GAME surviving the restart is out of scope — see 5.1.
- [x] 4.2 Confirm the category modal does NOT reappear after a restart. `ct: "all"` is now on each
      document; after the restart every window reported `game_category_intro = "False"` and no
      `#game-category-intro` element. Before this change `db.user` held no test-user document at
      all, so that write landed nowhere and the modal returned on every restart.
- [x] 4.3 Confirm the cookie rule still holds. Observed on the first restart of this change: the
      browsers still carried cookies naming the PREVIOUS run's users, whose documents did not
      exist; the server logged `users.get() Test–CentaurBanner NOT IN db` and the browser was
      issued a NEW identity rather than being handed the asserted name.
- [x] 4.4 Python gates. `ruff format` (779 files unchanged), `ruff check` (all passed),
      `pyrefly check` (0 errors), `unittest discover` — 1081 tests, OK (skipped=1).

## 5. Not in this change

- [x] 5.1 Whether the GAME survives the restart with its moves was `bughouse-persist-moves-as-played`,
      which landed the same day and is archived alongside this. This change only ever made the
      PLAYERS survive; the two together are what make a restart survivable, and 2.1 above is the
      single measurement that needed both.
