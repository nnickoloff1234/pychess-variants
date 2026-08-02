## ADDED Requirements

### Requirement: Test-user identities persist for the server's lifetime
When the server runs with `anon_as_test_users` enabled (`-a`), a guest browser SHALL keep the same `Test–…` identity for as long as its session cookie is valid, regardless of how long it stays idle. Test users SHALL NOT be subject to the registered-user cache TTL that governs real registered users.

`Users` SHALL exclude test usernames from the registered-user cache at both points that control eviction: it SHALL NOT record a `cache_access` entry for them when they are stored, and `is_registered_cache_only` SHALL report `False` for them so the pruning sweep never selects them. Eviction of genuine registered users SHALL be unchanged, including the existing TTL and sweep interval.

A test username SHALL be recognised by the `TEST_PREFIX` prefix, and every such branch SHALL additionally require `anon_as_test_users` to be enabled, so that no test-user behaviour is reachable when the flag is off — even for a real account whose name happens to begin with that prefix.

#### Scenario: An idle test user is not evicted
- **WHEN** a test user has been idle for longer than the registered-user cache TTL and the cleanup sweep runs
- **THEN** the user remains in `app_state.users`, is not reported as evicted, and its username continues to resolve to the same `User` object

#### Scenario: Real registered users are still evicted
- **WHEN** a registered (non-test, non-bot, non-reserved) user with no sockets, games, seeks or background work has been idle beyond the TTL and the sweep runs
- **THEN** it is evicted exactly as before this change

#### Scenario: The mode being off changes nothing
- **WHEN** the server runs without `anon_as_test_users`
- **THEN** guests are anonymous users as before, no test-user branch executes, and the registered-user cache behaves identically to before this change

### Requirement: A test user is reconstructable from its username
`Users.get()` SHALL resolve a test username that is absent from the in-memory store by constructing a `User` for it and storing it, mirroring the existing reconstruction of anonymous users. This branch SHALL be evaluated **before** the `db.user` lookup, so a test username never reaches the database and never falls through to `NONE_USER`.

The reconstructed user SHALL carry the same capability as a freshly minted test user — in particular `anon` is `False` while the mode is enabled — but SHALL NOT be expected to retain ratings, game history or other state that existed only in memory. Test users SHALL remain memory-only; nothing in this change writes them to `db.user`.

#### Scenario: Session survives a server restart
- **WHEN** a browser holding a valid session cookie naming a test user reconnects after the server has restarted, so the in-memory store is empty
- **THEN** `Users.get()` rebuilds that user from the username, the browser keeps its identity and username, and it is not issued a new one

#### Scenario: Lookup miss does not degrade to the null user
- **WHEN** a test username is requested that is not in `app_state.users`
- **THEN** a `User` for it is created and returned, no `db.user` query is issued for it, and `NONE_USER` is not returned

#### Scenario: The category-filter modal does not reappear
- **WHEN** a browser with an established test identity is idle past the old TTL and then interacts with the site again
- **THEN** it is still the same user, so the first-visit "Game category filter" modal is not shown again

### Requirement: Test usernames are readable and unique
A generated test username SHALL be `TEST_PREFIX` followed by two **different** CamelCased piece names drawn from the existing `PIECE_OPTION_NAMES` map in `server/catalogued_rules.py` (for example `Test–KnightCannon`, `Test–AmazonPawn`, `Test–SilverDragonHorse`), rather than eight random characters. The implementation SHALL NOT introduce a new word list, data file or module for this.

Multi-word and hyphenated entries SHALL be CamelCased rather than discarded — split on non-alphanumeric characters, capitalise each word, join — so `shogi pawn` becomes `ShogiPawn` and `fers-alfil` becomes `FersAlfil`. All 38 entries are then usable, yielding 37 distinct words after duplicates collapse.

A generated name SHALL NOT exceed 20 characters including the prefix and any collision suffix, matching the limit `server/login.py` imposes on registered usernames. Pairs that would exceed 20 characters unsuffixed SHALL NOT be offered, leaving 824 admissible names. After the prefix the name SHALL contain only ASCII letters and, when a collision suffix is required, digits — so profile URLs, Mongo `_id` compatibility and existing `startswith(TEST_PREFIX)` checks are unaffected.

Generation SHALL check the candidate against the existing users and retry on collision, and after a bounded number of attempts SHALL apply an incrementing numeric suffix. Applying a suffix SHALL truncate the piece-name pair so that the suffix fits within the 20-character bound — the suffix replaces trailing characters and SHALL NOT be dropped or shortened to satisfy the bound, since a name returned without its suffix would be one already in use. The generator SHALL keep incrementing until the result is not in use, so it always terminates and always yields an unused name.

Only the "no username supplied" path of user construction SHALL use the generator; an explicitly supplied username SHALL still be used verbatim, which is what reconstruction depends on.

#### Scenario: Generated names are readable
- **WHEN** a new test user is created
- **THEN** its username is the test prefix followed by two CamelCased piece names, and contains no random character soup

#### Scenario: Multi-word piece names are usable
- **WHEN** the generator draws an entry such as `shogi pawn`, `fers-alfil` or `ai-wok`
- **THEN** it contributes `ShogiPawn`, `FersAlfil`, `AiWok` to the pair rather than being skipped, and the result is alphanumeric after the prefix

#### Scenario: Names stay within the username length limit
- **WHEN** the generator would pair two long words such as `BreakthroughPawn` and `JanggiElephant`
- **THEN** that pair is not offered, and every generated name is at most 20 characters including the prefix

#### Scenario: A collision suffix truncates rather than overflows
- **WHEN** a pair that already fills the 20 characters, such as `Test–ArchbishopQueen`, is taken and a suffix is needed
- **THEN** the result is `Test–ArchbishopQuee2` — the suffix replaces the trailing characters, the name is still 20 characters, and the suffix is not dropped

#### Scenario: A truncated name is still unused
- **WHEN** a suffix is applied and the truncated result is itself already in use
- **THEN** the counter is incremented and the process repeats until an unused name is produced; a name already present in `app_state.users` is never returned

#### Scenario: The two words differ
- **WHEN** any name is generated
- **THEN** its two piece names are not the same word, so `Test–PawnPawn` is never produced

#### Scenario: Collisions still yield a unique name
- **WHEN** every pair the generator tries is already taken
- **THEN** it appends an incrementing numeric suffix and returns a username not present in `app_state.users`, without looping indefinitely

#### Scenario: Explicit usernames are untouched
- **WHEN** a `User` is constructed with an explicit username
- **THEN** that username is used exactly as given and the generator is not invoked
