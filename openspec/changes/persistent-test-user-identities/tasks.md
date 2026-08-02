## 1. Test-username helper

- [ ] 1.1 Add `is_test_username(username: str | None) -> bool` to `server/const.py` next to `reserved()`, returning `bool(username) and username.startswith(TEST_PREFIX)`. Leave `TEST_PREFIX` itself unchanged so existing `startswith(TEST_PREFIX)` checks elsewhere keep working
- [ ] 1.2 Confirm by grep which modules already test the prefix (`server/tournament_director.py`) and leave them as they are — this change adds a helper, it does not refactor existing call sites

## 2. Keep test users out of the registered-user cache

- [ ] 2.1 In `Users.__setitem__` (`server/users.py`), treat a test username like an anon user: skip the `cache_access` entry (and pop any existing one). Gate on `self.app_state.anon_as_test_users and is_test_username(username)`
- [ ] 2.2 In `Users.is_registered_cache_only`, return `False` for a test user, alongside the existing `user.anon or user.bot or reserved(...)` exclusions. Note it is a `@staticmethod` today — if it needs the app-state flag, either make it an instance method or pass the flag in; pick whichever keeps `prune_registered_cache`'s call site simple
- [ ] 2.3 Verify `prune_registered_cache` needs no change: entries with no `cache_access` are already skipped via `last_access is None`

## 3. Reconstruct test users on lookup miss

- [ ] 3.1 In `Users.get()`, add a `TEST_PREFIX` branch immediately after the existing `ANON_PREFIX` branch and **before** the `db.user` query: construct `User(self.app_state, username=username)`, store it in `self.app_state.users`, return it. Gate on `anon_as_test_users`
- [ ] 3.2 Confirm the reconstructed user gets `anon=False` in this mode — `User.__init__` only sets `self.anon` in the `username is None` branch, so check what `anon` defaults to when a username is supplied and set it explicitly if needed
- [ ] 3.3 Confirm no `db.user` query is issued for a test username, and that `NONE_USER` is no longer reachable for one

## 4. Readable name generation (no new data — reuse `PIECE_OPTION_NAMES`)

- [ ] 4.1 In `server/user.py`, build the word list once at module level from `PIECE_OPTION_NAMES` (imported from `server/catalogued_rules.py`): CamelCase each value — split on non-alphanumerics, capitalise each word, join — and dedupe. All 38 entries are usable this way; 37 distinct words remain after `janggi elephant`'s two spellings collapse
- [ ] 4.2 Add a `_generate_test_username(users)` helper that joins **two different** words and prefixes with `TEST_PREFIX` → `Test–KnightCannon`, `Test–AmazonPawn`. Reject any pair whose full username would exceed 20 characters (the limit in `server/login.py` / `USERNAME_PREFIX_RE`), leaving 824 admissible names; precompute the admissible pairs or apply the length check at pick time, whichever reads better — either way do the work once, not per call
- [ ] 4.3 On collision, retry a bounded number of times, then apply an incrementing numeric suffix until unique. The suffix must **replace** trailing characters, not extend past 20: truncate the pair to `20 - len(TEST_PREFIX) - len(str(n))` before appending, so `Test–ArchbishopQueen` (already 20) yields `Test–ArchbishopQuee2`. Never drop or shorten the suffix to fit — that would return a name already in use. Keep incrementing until unused; piece words contain no digits, so distinct counters give distinct names and the loop terminates
- [ ] 4.4 In `User.__init__`, use the helper for the `username is None` case instead of `TEST_PREFIX + id8()`, only when `anon_as_test_users` is set; the anonymous path keeps `ANON_PREFIX + id8()`
- [ ] 4.5 Leave `id8()` and `server/newid.py` untouched — they are used for game ids elsewhere. Do **not** add a new module or word list; the only new import is `PIECE_OPTION_NAMES` from `catalogued_rules`, which imports nothing but the standard library, so no cycle is introduced

## 5. Tests

- [ ] 5.1 Retention: a test user idle beyond the TTL is not returned by `prune_registered_cache`, while an equivalent registered user is
- [ ] 5.2 Reconstruction: `await users.get("Test–SomeName")` on an empty store returns a `User` with that username, stores it, and issues no db query (assert with a db mock/spy); `NONE_USER` is not returned
- [ ] 5.3 Mode off: with `anon_as_test_users` false, a `Test–…` username falls through to the normal db path, and cache behaviour for registered users is unchanged
- [ ] 5.4 Names: format matches prefix + two CamelCased `PIECE_OPTION_NAMES` values, is alphanumeric after the prefix, multi-word entries such as `shogi pawn` yield `ShogiPawn` rather than being skipped, the two words always differ, and a forced-collision case yields a unique suffixed name without looping
- [ ] 5.5 Length: every name the generator can produce is at most 20 characters including the prefix, and the admissible-pair count is 824
- [ ] 5.6 Suffix truncation: with `Test–ArchbishopQueen` already taken, the generator returns `Test–ArchbishopQuee2` — 20 characters, suffix intact; and with that also taken it returns a further name that is still unused and still 20 characters or fewer
- [ ] 5.7 Explicit usernames bypass the generator

## 6. Verification

- [ ] 6.1 `uv run ruff format .`, `uv run ruff check .`, `uv run pyright`
- [ ] 6.2 `env PYTHONPATH=server uv run python -m unittest discover -s tests`
- [ ] 6.3 Manual: start the harness (`~/dev/ai-scripts/pychess-harness.sh`), note the four generated usernames are readable, distinct and fit the player bars, leave the windows idle past 30 minutes, then interact again and confirm the usernames are unchanged and the "Game category filter" modal does not reappear
- [ ] 6.4 Manual: `docker compose restart server`, then reload a browser and confirm it keeps its previous test username rather than being issued a new one
