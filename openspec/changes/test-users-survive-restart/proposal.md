## Why

A server restart mid-game is a real event — it is what a deploy looks like — and nothing has ever
tested what four bughouse clients do when it happens. It cannot be tested, because the restart
destroys the testers along with the server: `-a` test identities live only in `app_state.users`, so
every harness window comes back as a different browser and the game is unreachable for a reason that
has nothing to do with the thing under test.

**A new identity is not a workaround, because a new identity cannot take the seat.** Seats are held
by username. And in production the fallback is worse still: without `-a` a guest is anonymous, and
`is_anon_restricted_seek()` — `user.anon and (day > 0 or server_variant.two_boards)` — bars anonymous
users from creating OR joining a bughouse seek at all.

REGISTERED USERS ALREADY SURVIVE A RESTART, because they have a database document and `Users.get()`
finds it. Test users do not: `db.user` holds no `Test–…` document at all. That is the whole
difference, and closing it needs no new trust in anything.

**Nothing about cookie trust changes.** The rule that a test username is not reconstructed from a
session cookie stays, and stays for the reason it was written: such a user has `anon` set to `False`
and may create seeks, play rated-path games and enter tournaments, and a name asserted only by a
cookie must not become one. Its own words already describe what will now happen — "query `db.user`,
find no document, and return `NONE_USER`" — and with a document present the same path finds one. The
identity is verified against the database exactly as a registered user's is; only the restart
scenario in that requirement stops being true.

## What Changes

- A test user created under `-a` SHALL be written to `db.user`, as a registered user is.
- After a restart it is therefore found by the existing lookup, keeps its name, and can reclaim the
  seat it held in a game restored from the database.
- **A side effect worth having**: `set_game_category` writes `ct` to the user document, which today
  does nothing because there is no document. Once there is one, the first-visit category modal stops
  reappearing after every restart — a long-standing harness annoyance that has its own paragraph in
  the harness skill.
- Test-user documents SHALL be identifiable and cleanable, so a development database does not
  accumulate them without bound.

## Impact

- `server/user.py` — the test-user creation path, and `Users.get()` if the reconstructed user needs
  anything the registered path does not already give it.
- `db.user` — gains documents on a `-a` server only. In production `is_test_user()` is False whatever
  the name, so nothing is written and nothing changes.
- `openspec/specs/test-user-identities` — one requirement MODIFIED, one ADDED. The cookie rule is
  kept.
- No client change.
- `reconnect-sync-controller` and `bughouse-persist-moves-as-played` both depend on this: neither can
  be tested across a restart without it.

## Capabilities

- `test-user-identities`
