## Context

`-a` / `anon_as_test_users` exists so a local server treats guest browsers as ordinary logged-in users rather than anonymous ones — they can seek, play rated-path games, join tournaments. `User.__init__` implements that with a single line:

```python
self.anon = not self.app_state.anon_as_test_users
self.username = (TEST_PREFIX if ... else ANON_PREFIX) + id8()
```

Everything downstream keys off `user.anon`, so a test user looks exactly like a registered user — including to the registered-user cache. `Users.__setitem__` records `cache_access` for any non-anon, non-bot, non-reserved user; `_registered_user_cache_cleanup` evicts anything idle past `REGISTERED_USER_CACHE_TTL` (30 min); and `Users.get()` resolves a cache miss by reading `db.user`. Test users have no such row, so the miss returns `NONE_USER` and the browser's identity is gone despite a year-long session cookie.

Anonymous users are immune only because `Users.get()` special-cases their prefix and rebuilds the object. The fix is to give test users the same two properties: don't evict them, and be able to rebuild them.

Constraints:
- The mode is dev-only (`tournament_director.py` already gates on `settings.DEV and app_state.anon_as_test_users`), so nothing here may alter behaviour when the flag is off.
- Test users are deliberately **memory-only**. Writing them to `db.user` would pollute a real database, leaderboards and rating tables.
- `TEST_PREFIX` must keep its current value; `startswith(TEST_PREFIX)` checks exist outside `users.py`.

## Goals / Non-Goals

**Goals:**
- A test identity survives for the lifetime of the server process, regardless of idle time.
- A test identity survives a server restart, because the browser's cookie still names it and the server can rebuild it.
- Test usernames are readable and distinguishable at a glance across four browser windows.

**Non-Goals:**
- Persisting test users to Mongo, or preserving their ratings/history across a restart.
- Changing anonymous-user behaviour, the registered-user cache for real users, or anything at all when `anon_as_test_users` is false.
- Fixing the separate `/wsl` 302 reconnect loop. Reconstruction on miss should remove one of its triggers, but that bug is tracked on its own and this change does not claim it.

## Decisions

### 1. Identify test users by prefix, gated on the mode

At the two points that matter there is no `User` object to inspect — `Users.get()` receives only a username string — so the signal has to be the prefix. Add one helper (`is_test_username(username)` alongside `reserved()` in `const.py`) and use it in `Users`.

Every use is additionally gated on `app_state.anon_as_test_users`. A real account whose name began with `Test–` would otherwise be caught by the prefix branch and silently rebuilt as a guest instead of loaded from Mongo. Gating on the flag means production behaviour is unreachable from this code path, not merely unlikely.

*Alternative considered:* add an `is_test` attribute to `User`. Rejected — it does not help `get()`, which must decide before any `User` exists.

### 2. Keep test users out of the registered-user cache

Two touch points, mirroring how anon users are already excluded:
- `Users.__setitem__` — do not record `cache_access` for a test username, so `prune_registered_cache` never even considers it (it skips entries with `last_access is None`).
- `Users.is_registered_cache_only` — return `False` for a test user, so an entry that predates this change (or arrives by another path) is still protected.

Both, rather than either alone, because `__setitem__` governs new entries while `is_registered_cache_only` is the actual eviction predicate; belt and braces here is one line each.

*Alternative considered:* raise `REGISTERED_USER_CACHE_TTL`. Rejected — it postpones the failure instead of removing it, and the TTL also governs real registered users in production, where 30 minutes is the intended behaviour.

*Alternative considered:* set `anon=True` for test users. Rejected, and this is the important one: `anon` is not a bookkeeping flag, it gates real capability — `is_anon_restricted_seek`, rated-game eligibility, the `anon=not app_state.anon_as_test_users` arguments in `puzzle.py` and `websocket_utils.py`. Flipping it would strip test users of exactly the abilities the mode exists to grant.

### 3. Reconstruct a test user on lookup miss

`Users.get()` gains a branch directly beside the existing anon one:

```python
if username.startswith(ANON_PREFIX):
    ...                                   # existing
if app_state.anon_as_test_users and is_test_username(username):
    user = User(self.app_state, username=username)   # anon defaults False in this mode
    self.app_state.users[username] = user
    return user
```

placed **before** the `db.user` lookup, so a test username never reaches Mongo and never returns `NONE_USER`.

The reconstructed user starts from defaults — no ratings, no history. That is a deliberate trade-off: it preserves *identity* (the name, hence the session, hence no category-filter modal and no confusion about which window is who) without pretending to preserve *state* that was only ever in memory. For a throwaway dev identity, the name is the part that matters.

### 4. Readable names from the existing piece-name map

Replace `TEST_PREFIX + id8()` with `TEST_PREFIX + <PieceName><PieceName>` — two *different* CamelCased entries from `PIECE_OPTION_NAMES` in `server/catalogued_rules.py`: `Test–KnightCannon`, `Test–AmazonPawn`, `Test–SilverDragonHorse`.

This introduces **no new data**. `PIECE_OPTION_NAMES` already exists as a 38-entry `dict[str, str]` of piece labels. CamelCasing — split on any non-alphanumeric character, capitalise each word, join — makes the multi-word and hyphenated entries usable too (`shogi pawn` → `ShogiPawn`, `fers-alfil` → `FersAlfil`, `ai-wok` → `AiWok`), so nothing has to be discarded. The two spellings of `janggi elephant` collapse to one, leaving 37 distinct words. Every word is alphanumeric and starts with a letter, so no filtering for digit-initial names is needed.

**Why two words.** One word gives only 37 names — too few for a machine that runs the four-window harness repeatedly, so the numeric suffix would become the norm rather than the exception, and `Test–Knight2` vs `Test–Knight3` is exactly the low-distinguishability problem this change exists to fix. Two ordered distinct words give 1332 combinations.

**Length cap.** `server/login.py` rejects a registered username longer than 20 characters, and `USERNAME_PREFIX_RE` in `utils.py` encodes the same bound. Generated names honour it: pairs whose total length would exceed 20 including the 5-character prefix are not offered, which leaves **824** names. Without the cap the worst case is `Test–BreakthroughPawnJanggiElephant` at 35 characters — unreadable in a player bar, which defeats the purpose. 824 is ample: collisions stay rare and the suffix stays a fallback.

The cap applies to the **final** username, suffix included. A collision suffix therefore *replaces* trailing characters of the pair rather than extending past 20: for an `N`-digit suffix the pair is truncated to `20 - len(TEST_PREFIX) - N` characters first. `Test–ArchbishopQueen` is already exactly 20, so its first collision yields `Test–ArchbishopQuee2`, not `Test–ArchbishopQueen2`. Dropping the suffix instead — the obvious reading of "cap the name at 20" — would return a name that is already taken, which is the one thing the generator must never do.

Note that test usernames already fall outside `USERNAME_PREFIX_RE` regardless, because `TEST_PREFIX` contains an en-dash. The cap is adopted for display sanity and consistency with the site's own notion of a reasonable name, not because any validator would reject a longer one.

`server/user.py` gains one import from `catalogued_rules`, which imports only the standard library, so there is no cycle. The list of admissible pairs (or the word list plus a length check at pick time) is built once at module import, not per call.

Generation checks the candidate against `app_state.users` and retries; after a bounded number of attempts it applies an incrementing numeric suffix (`Test–KnightCannon2`), truncating as above, and keeps incrementing until the result is unused. Termination and uniqueness are both safe: piece words contain no digits, so the trailing digits of a suffixed name unambiguously encode the counter, distinct counters give distinct strings, and the store is finite.

*Alternative considered:* a single piece name (`Test–Knight`). Rejected — 37 names is too small a pool, as above.

*Alternative considered:* variant names from the `VARIANTS` registry (`Test–Shogi`). 71 entries and already imported by `user.py`, but a username that is also a variant name reads like a variant rather than a participant — confusing in a lobby listing variants beside players. The import advantage is negligible given `catalogued_rules` is dependency-free.

*Alternative considered:* curated adjective/noun lists (`Test–BraveKnight`). Rejected — inventing and maintaining new word lists for no gain over a list the server already ships.

*Alternative considered:* the piece names in `catalogued_betza.py`. Rejected — only 17, and embedded in diagram definitions rather than exposed as a reusable list.

*Note on i18n:* the translated user-facing variant strings (`display_name`, e.g. `THREE CHECK`) are uppercase and contain spaces, so they are unsuitable as usernames; `PIECE_OPTION_NAMES` values are the cleaner handle.

Only the `username is None` branch of `User.__init__` changes; an explicitly supplied username is still used verbatim, which is what reconstruction in decision 3 relies on.

## Risks / Trade-offs

- **[Test users now accumulate for the process lifetime]** → By construction they are never evicted. Each is a small in-memory object and the mode is dev-only, so this is acceptable; if a long-lived dev server ever showed pressure, the fix would be a separate sweep keyed on "no sockets and no games for a very long time", not re-enabling the registered-user TTL.
- **[Reconstruction hides a genuinely unknown user]** → After a restart, any `Test–` name a browser presents is accepted and materialised. That is the intent, but it means a stale cookie from a previous dev session resurrects that name rather than issuing a fresh one. Preferable to today's behaviour, and confined to the dev flag.
- **[A registered account could be named with the test prefix]** → Mitigated by gating every prefix branch on `anon_as_test_users`, so the branch cannot execute in production regardless of the name.
- **[Name pool exhaustion]** → 824 admissible pairs make exhaustion implausible in a dev session, and bounded retries plus a numeric suffix guarantee termination and uniqueness regardless; the failure mode is an uglier, truncated name such as `Test–ArchbishopQuee2`, never a hang, a duplicate, or a name over 20 characters.
