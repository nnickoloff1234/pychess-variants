## ADDED Requirements

### Requirement: A test user is a database user

A test user created under `anon_as_test_users` SHALL be written to `db.user`, as a registered user
is, so that its identity outlives the process that minted it.

THIS IS PARITY, NOT A NEW CAPABILITY. Registered users already survive a restart for exactly one
reason: `Users.get()` queries `db.user` and finds a document. Test users do not survive because there
is no document to find — `db.user` holds no test-user record at all. Giving them one closes the
difference without introducing any new trust: the identity is verified against the database, exactly
as everyone else's is.

WHAT THE ABSENCE COSTS IS THE ABILITY TO TEST A WHOLE CLASS OF BEHAVIOUR. Seats in a running game are
held by username, so a browser issued a new name cannot reclaim its seat, and a server restart during
a game cannot be observed as anything but four strangers arriving. In production the fallback is
worse: a guest without `-a` is anonymous, and anonymous users are barred from bughouse seeks
altogether.

A PREFERENCE WRITTEN AGAINST THE DOCUMENT SHALL NOW TAKE EFFECT. `set_game_category` writes `ct` to
the user document and has been writing it nowhere; with a document present, a test user's answer to
the first-visit category filter persists across restarts as a registered user's does.

TEST-USER DOCUMENTS SHALL BE IDENTIFIABLE AND REMOVABLE. They are created by a development mode and
accumulate one per browser; a development database SHALL be able to shed them without touching real
accounts.

#### Scenario: A test user survives a restart
- **WHEN** the server restarts with `-a` and a browser holding its session cookie reconnects
- **THEN** the lookup finds the user's document and materialises the same identity
- **AND** it may reclaim the seat it held in a game restored from the database

#### Scenario: Production writes nothing
- **WHEN** the server runs without `anon_as_test_users`
- **THEN** no test user exists to persist and `db.user` is untouched

#### Scenario: The category answer sticks
- **WHEN** a test user answers the first-visit category filter and the server later restarts
- **THEN** the answer is remembered and the modal is not shown again

## MODIFIED Requirements

### Requirement: A test username is not reconstructed from the session cookie
`Users.get()` SHALL NOT materialise a `User` for a test username that is absent from the in-memory store AND absent from the database. Such a lookup SHALL follow the existing path unchanged — query `db.user`, find no document, and return `NONE_USER` — so a name asserted only by a session cookie never becomes a non-anonymous identity.

The reason is capability, not tidiness: a test user has `anon` set to `False` and may create seeks, play rated-path games and enter tournaments, and the server has nothing against which to verify a name it does not already hold. THAT REASONING IS UNCHANGED, AND SO IS THE RULE. What changed is only that a test user now HAS a database record — see "A test user is a database user" — so the same lookup that used to find nothing now finds a document, and the identity is verified against it exactly as a registered user's is. A cookie is still not evidence; a document is.

#### Scenario: A restart restores the identity from the database
- **WHEN** a browser holding a valid session cookie naming a test user reconnects after the server has restarted, so the in-memory store is empty
- **THEN** the lookup finds the persisted document and returns that user, under the same name

#### Scenario: An unverified name does not become a user
- **WHEN** a test username absent from both `app_state.users` and `db.user` is looked up
- **THEN** no `User` is created for it and none is stored, regardless of whether `anon_as_test_users` is enabled
