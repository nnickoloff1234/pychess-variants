## Why

When the server runs with `-a` (`anon_as_test_users`), a guest browser is given a `Test–xxxxxxxx` identity instead of an anonymous one. That identity silently dies after 30 minutes of inactivity, and the browser is handed a brand-new username.

The mechanism is an asymmetry between the anonymous and test paths:

- `User.__init__` builds the test user with `anon = not anon_as_test_users`, i.e. **`anon=False`**. `Users.__setitem__` only records `cache_access` for non-anon, non-bot, non-reserved users, so test users are treated as *registered* users and become eviction candidates.
- `_registered_user_cache_cleanup` sweeps every 5 minutes and evicts anything idle beyond `REGISTERED_USER_CACHE_TTL` (30 minutes).
- Test users have no Mongo document. After eviction `Users.get()` finds no `db.user` row, logs `users.get() … NOT IN db` and returns `NONE_USER`.
- The session cookie is still perfectly valid — `MAX_AGE` is a year — but it now names a user the server no longer knows, so the next websocket materialises a *new* `Test–…` user.

Anonymous users never hit this: `Users.get()` has an `ANON_PREFIX` branch that reconstructs the `User` object from the username on demand. Test users have no equivalent branch, **and** unlike anon users they are eviction candidates to begin with. Either half alone would be survivable; together they guarantee identity loss.

The cost lands entirely on local testing, which is the only place this mode runs:

- player identities churn mid-session, so "who is p3?" stops being answerable
- the **"Game category filter"** modal is shown once per new user, so it reappears over the board — during a live four-browser bughouse test it covered three of four windows mid-game
- the same cookie-names-an-unknown-user situation is what leaves a reconnecting client looping instead of recovering (not addressed here — see the non-goals in design.md)

Separately, `TEST_PREFIX + id8()` produces names like `Test–a6NDUQuc` — eight characters from `ascii_letters + digits`. They are impossible to hold in your head, impossible to tell apart at a glance in a four-window grid, and impossible to say out loud.

## What Changes

- **Test users stop being cache-eviction candidates.** `Users` treats a `TEST_PREFIX` username the same way it treats an anon user: no `cache_access` entry, and `is_registered_cache_only` never selects it. A test identity then lives as long as the process does.
- **A test username is still never reconstructed from the cookie.** `Users.get()` is deliberately left alone: a test name absent from memory still falls through to Mongo, still returns `NONE_USER`, and the browser is still issued a fresh identity. The server has no way to verify such a name — only the client's cookie asserts it — and a test user is `anon=False`, so honouring the claim would grant seek, rated-path and tournament capability to an unverified name. Sessions therefore survive idle time, but not a server restart.
- **Readable generated names, reusing a list the server already has.** Test usernames become `Test–` + **two** CamelCased piece names drawn from the existing `PIECE_OPTION_NAMES` map in `server/catalogued_rules.py` — `Test–KnightCannon`, `Test–AmazonPawn`, `Test–SilverDragonHorse` — with an incrementing numeric suffix only on collision. No new word list, no new module, no new data file. CamelCasing the multi-word and hyphenated entries (`shogi pawn` → `ShogiPawn`, `fers-alfil` → `FersAlfil`) makes all 38 entries usable, yielding 37 distinct words; pairing two different words gives **824 usable names** once the whole username is capped at the 20 characters `server/login.py` already allows a registered name. Names stay alphanumeric after the prefix, so nothing downstream — profile URLs, Mongo `_id`s, the `startswith(TEST_PREFIX)` checks in `tournament_director.py` — has to change.
- No behaviour change whatsoever when `anon_as_test_users` is false: the anonymous path, registered users, bots and reserved names are untouched, and the registered-user cache keeps evicting real idle users exactly as now.

### New Capabilities
- `test-user-identities`: how the `-a` test-user mode mints, names and retains guest identities — lifetime rules, reconstruction on lookup miss, and the username format.

### Modified Capabilities
(none — no existing spec covers user or session handling)

## Impact

- `server/users.py` — `__setitem__`, `__getitem__` and `is_registered_cache_only` learn about `TEST_PREFIX` through one shared `_in_registered_cache()` predicate. `get()` is unchanged.
- `server/user.py` — username generation for the `username is None` case picks from `PIECE_OPTION_NAMES`, adding one import from `server/catalogued_rules.py`. That module imports only the standard library, so no cycle is introduced. No new module and no new word list.
- `server/pychess_global_app_state.py` — gains the small `is_test_user()` method. `TEST_PREFIX` keeps its current value so existing prefix checks keep working; `const.py` is untouched.
- Tests — none added. The change is verified by the existing suite staying green and by running the four-window local harness.
- No client-side change. No change to the Mongo schema — test users remain memory-only by design.
