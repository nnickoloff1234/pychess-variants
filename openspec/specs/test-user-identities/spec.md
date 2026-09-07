# test-user-identities Specification

## Purpose
TBD - created by archiving change persistent-test-user-identities. Update Purpose after archive.
## Requirements
### Requirement: Test-user identities persist for the server's lifetime
When the server runs with `anon_as_test_users` enabled (`-a`), a guest browser SHALL keep the same `Test–…` identity for as long as its session cookie is valid, regardless of how long it stays idle. Test users SHALL NOT be subject to the registered-user cache TTL that governs real registered users.

`Users` SHALL exclude test usernames from the registered-user cache at both points that control eviction: it SHALL NOT record a `cache_access` entry for them when they are stored, and `is_registered_cache_only` SHALL report `False` for them so the pruning sweep never selects them. Eviction of genuine registered users SHALL be unchanged, including the existing TTL and sweep interval.

A test username SHALL be recognised by the `TEST_PREFIX` prefix, and the check SHALL be made through `app_state.is_test_user()`, which requires `anon_as_test_users` to be enabled, so that no test-user behaviour is reachable when the flag is off — even for a real account whose name happens to begin with that prefix.

#### Scenario: An idle test user is not evicted
- **WHEN** a test user has been idle for longer than the registered-user cache TTL and the cleanup sweep runs
- **THEN** the user remains in `app_state.users`, is not reported as evicted, and its username continues to resolve to the same `User` object

#### Scenario: Real registered users are still evicted
- **WHEN** a registered (non-test, non-bot, non-reserved) user with no sockets, games, seeks or background work has been idle beyond the TTL and the sweep runs
- **THEN** it is evicted exactly as before this change

#### Scenario: The category-filter modal does not reappear after idling
- **WHEN** a browser with an established test identity is idle past the old TTL and then interacts with the site again
- **THEN** it is still the same user, so the first-visit "Game category filter" modal is not shown again

#### Scenario: The mode being off changes nothing
- **WHEN** the server runs without `anon_as_test_users`
- **THEN** guests are anonymous users as before, no test-user branch executes, and the registered-user cache behaves identically to before this change

### Requirement: A test username is not reconstructed from the session cookie
`Users.get()` SHALL NOT materialise a `User` for a test username that is absent from the in-memory store AND absent from the database. Such a lookup SHALL follow the existing path unchanged — query `db.user`, find no document, and return `NONE_USER` — so a name asserted only by a session cookie never becomes a non-anonymous identity.

The reason is capability, not tidiness: a test user has `anon` set to `False` and may create seeks, play rated-path games and enter tournaments, and the server has nothing against which to verify a name it does not already hold. THAT REASONING IS UNCHANGED, AND SO IS THE RULE. What changed is only that a test user now HAS a database record — see "A test user is a database user" — so the same lookup that used to find nothing now finds a document, and the identity is verified against it exactly as a registered user's is. A cookie is still not evidence; a document is.

#### Scenario: A restart restores the identity from the database
- **WHEN** a browser holding a valid session cookie naming a test user reconnects after the server has restarted, so the in-memory store is empty
- **THEN** the lookup finds the persisted document and returns that user, under the same name

#### Scenario: A restart issues a new identity
- **WHEN** a browser's session cookie names a test user that is absent from both `app_state.users` and `db.user` — a name minted before test users were persisted, or one whose document has been removed — and it reconnects after a restart
- **THEN** the lookup returns `NONE_USER`, and the browser is issued a new test identity with a newly generated name

KEPT UNDER ITS ORIGINAL NAME, AND NARROWED. It used to describe EVERY restart, which was true only
because a test user had no document to find. It now describes the case where there is genuinely
nothing to find. The rule underneath never changed and is why both this scenario and the one above
exist: a name is honoured when the database verifies it and not otherwise. A cookie was never
evidence, and still is not.

#### Scenario: An unverified name does not become a user
- **WHEN** a test username absent from both `app_state.users` and `db.user` is looked up
- **THEN** no `User` is created for it and none is stored, regardless of whether `anon_as_test_users` is enabled

### Requirement: Test usernames are readable and unique
A generated test username SHALL be `TEST_PREFIX` followed by two **different** CamelCased piece names drawn from the existing `PIECE_OPTION_NAMES` map in `server/catalogued_rules.py` (for example `Test–KnightCannon`, `Test–AmazonPawn`, `Test–SilverDragonHorse`), rather than eight random characters. The implementation SHALL NOT introduce a new word list, data file or module for this.

Multi-word and hyphenated entries SHALL be CamelCased rather than discarded — split on non-alphanumeric characters, capitalise each word, join — so `shogi pawn` becomes `ShogiPawn` and `fers-alfil` becomes `FersAlfil`. All 38 entries are then usable, yielding 37 distinct words after duplicates collapse.

A generated name SHALL NOT exceed 20 characters including the prefix and any collision suffix, matching the limit `server/login.py` imposes on registered usernames. A pair whose concatenation exceeds the budget SHALL be trimmed to fit rather than rejected and redrawn, so every ordered pair of two different words is usable; 1332 pairs yield 1250 distinct names once trimming collapses duplicates. After the prefix the name SHALL contain only ASCII letters and, when a collision suffix is required, digits — so profile URLs, Mongo `_id` compatibility and existing `startswith(TEST_PREFIX)` checks are unaffected.

Generation SHALL check the candidate against the existing users and retry on collision, and after a bounded number of attempts SHALL apply an incrementing numeric suffix. Applying a suffix SHALL truncate the piece-name pair so that the suffix fits within the 20-character bound — the suffix replaces trailing characters and SHALL NOT be dropped or shortened to satisfy the bound, since a name returned without its suffix would be one already in use. The generator SHALL keep incrementing until the result is not in use, so it always terminates and always yields an unused name.

Only the "no username supplied" path of user construction SHALL use the generator; an explicitly supplied username SHALL still be used verbatim.

#### Scenario: Generated names are readable
- **WHEN** a new test user is created
- **THEN** its username is the test prefix followed by two CamelCased piece names, and contains no random character soup

#### Scenario: Multi-word piece names are usable
- **WHEN** the generator draws an entry such as `shogi pawn`, `fers-alfil` or `ai-wok`
- **THEN** it contributes `ShogiPawn`, `FersAlfil`, `AiWok` to the pair rather than being skipped, and the result is alphanumeric after the prefix

#### Scenario: Names stay within the username length limit
- **WHEN** the generator pairs two long words such as `BreakthroughPawn` and `JanggiElephant`
- **THEN** the concatenation is trimmed to the budget rather than redrawn, and every generated name is at most 20 characters including the prefix

#### Scenario: A collision suffix truncates rather than overflows
- **WHEN** a pair that already fills the 20 characters, such as `Test–ArchbishopQueen`, is taken and a suffix is needed
- **THEN** the result is `Test–ArchbishopQuee2` — the suffix replaces the trailing characters, the name is still 20 characters, and the suffix is not dropped

#### Scenario: Collisions always yield an unused name
- **WHEN** every pair the generator tries is already taken, and a truncated suffixed candidate is itself already in use
- **THEN** the counter is incremented and the process repeats until a name not present in `app_state.users` is produced, without looping indefinitely

#### Scenario: The two words differ
- **WHEN** any name is generated
- **THEN** its two piece names are not the same word, so `Test–PawnPawn` is never produced

#### Scenario: Explicit usernames are untouched
- **WHEN** a `User` is constructed with an explicit username
- **THEN** that username is used exactly as given and the generator is not invoked

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

