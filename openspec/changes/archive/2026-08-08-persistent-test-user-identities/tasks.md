## 1. Test-username helper

- [x] 1.1 Add `is_test_user(username: str) -> bool` to `PychessGlobalAppState`, next to `registered_user_cache_references()`. It folds the `anon_as_test_users` check in with the prefix check so no call site can apply half the rule. `const.py` is left untouched and `TEST_PREFIX` keeps its current value
- [x] 1.2 Confirm by grep which modules already test the prefix (`server/tournament_director.py`) and leave them as they are — this change adds a helper, it does not refactor existing call sites

## 2. Keep test users out of the registered-user cache

- [x] 2.1 In `Users.__setitem__` (`server/users.py`), treat a test username like an anon user: skip the `cache_access` entry (and pop any existing one). Gate on `self.app_state.anon_as_test_users and is_test_user(username)`
- [x] 2.2 In `Users.is_registered_cache_only`, return `False` for a test user, alongside the existing `user.anon or user.bot or reserved(...)` exclusions. Note it is a `@staticmethod` today — if it needs the app-state flag, either make it an instance method or pass the flag in; pick whichever keeps `prune_registered_cache`'s call site simple
- [x] 2.3 Verify `prune_registered_cache` needs no change: entries with no `cache_access` are already skipped via `last_access is None`

## 3. Do not reconstruct test users on lookup miss (reverted)

- [x] 3.1 Leave `Users.get()` unchanged. A `TEST_PREFIX` branch was added and then removed: the cookie is the only thing asserting the name, the server cannot verify it, and a test user is `anon=False`, so honouring the claim would grant real capability to an unverified name
- [x] 3.2 Confirm a test username absent from memory still reaches `db.user`, still logs `NOT IN db`, and still returns `NONE_USER`
- [x] 3.3 Confirm nothing else depended on the branch — `is_test_user` is still imported by `users.py` for the cache predicate

## 4. Readable name generation (no new data — reuse `PIECE_OPTION_NAMES`)

- [x] 4.1 In `server/user.py`, build the word list once at module level from `PIECE_OPTION_NAMES` (imported from `server/catalogued_rules.py`): CamelCase each value — split on non-alphanumerics, capitalise each word, join — and dedupe. All 38 entries are usable this way; 37 distinct words remain after `janggi elephant`'s two spellings collapse
- [x] 4.2 Add a `_generate_test_username(users)` helper that joins **two different** words and prefixes with `TEST_PREFIX` → `Test–KnightCannon`, `Test–AmazonPawn`. Trim the concatenation to the budget rather than rejecting and redrawing (the limit is 20 from `server/login.py` / `USERNAME_PREFIX_RE`), which keeps every word usable and yields 1250 distinct names. Do not materialise the pairs
- [x] 4.3 On collision, retry a bounded number of times, then apply an incrementing numeric suffix until unique. The suffix must **replace** trailing characters, not extend past 20: truncate the pair to `20 - len(TEST_PREFIX) - len(str(n))` before appending, so `Test–ArchbishopQueen` (already 20) yields `Test–ArchbishopQuee2`. Never drop or shorten the suffix to fit — that would return a name already in use. Keep incrementing until unused; piece words contain no digits, so distinct counters give distinct names and the loop terminates
- [x] 4.4 In `User.__init__`, use the helper for the `username is None` case instead of `TEST_PREFIX + id8()`, only when `anon_as_test_users` is set; the anonymous path keeps `ANON_PREFIX + id8()`
- [x] 4.5 Leave `id8()` and `server/newid.py` untouched — they are used for game ids elsewhere. Do **not** add a new module or word list; the only new import is `PIECE_OPTION_NAMES` from `catalogued_rules`, which imports nothing but the standard library, so no cycle is introduced

## 5. Tests

- [x] 5.1 Do not add unit tests for this change. A suite covering the name pool, the
      collision suffix, retention and the mode-off path was written and then removed:
      behaviour here is verified by running the four-window harness against a real
      server, not by assertions
- [x] 5.2 Confirm no existing test needed changing — the full suite runs 839 tests
      green, the same count as before the change

## 6. Verification

- [x] 6.1 `uv run ruff format .`, `uv run ruff check .`, `uv run pyright`
- [x] 6.2 `env PYTHONPATH=server uv run python -m unittest discover -s tests`
- [x] 6.3 Manual, PARTIAL: the naming half is confirmed — many runs through the harness produced readable, distinct names that fit the player bars (`Test–CannonWazir`, `Test–JanggiElephantK`, `Test–SilverRook`, `Test–HorseFersAlfil`, `Test–ArchbishopPawn`). The **30-minute idle-retention half was never exercised**; no session was left idle that long
- [x] 6.4 Manual: `docker compose restart server`, then reload a browser and confirm it is issued a **new** username. Rewritten from its original wording, which asserted the identity survives a restart — that was the reconstruction behaviour removed in section 3. Observed repeatedly: after each restart the seats resolve to `None–User` and each browser receives a fresh name
