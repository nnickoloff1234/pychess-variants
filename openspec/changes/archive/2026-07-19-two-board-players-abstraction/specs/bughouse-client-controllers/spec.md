# bughouse-client-controllers — delta for two-board-players-abstraction

## ADDED Requirements

### Requirement: Single player-info abstraction for the four bughouse seats
The bughouse client SHALL represent each of the four seats (white/black × board a/b) as a `TwoBoardPlayer` object (`username`, `title`, `rating`, `color`, `boardName`) owned by a `TwoBoardPlayers` container (`client/two-board/common/players.ts`). `TwoBoardPlayers` SHALL be constructed from the page model and viewer username only (no DOM, no controller references) and SHALL provide the accessors used across the controllers: seat lookup by board+color, viewer-relative accessors (`me(board)`, `myColor(board)`, `isSpectator()`, `myTeam()`), relation accessors from any player (`partnerOf`, `opponentOf`, `opponentsPartnerOf`), and `teams: [Team, Team]` where `Team` holds its two `TwoBoardPlayer`s, a `teamNumber` label ('1'/'2'), and a `name()` method returning both usernames joined with '+'. Player-identity questions in the two-board controllers MUST be answered through these accessors rather than ad-hoc color/board arithmetic or parallel scalar fields.

#### Scenario: Viewer-relative lookup
- **WHEN** round-play logic needs the viewer's color on a board (flag callbacks, movable gating, premove/myMove checks, orientation)
- **THEN** it obtains it from `players.myColor(board)`/`players.me(board)` and behaves identically to the previous `myColor`/`partnerColor` map lookups, including the simul case where one username occupies seats on both boards

#### Scenario: Relation lookup
- **WHEN** logic needs a player's partner, opponent, or opponent's partner (e.g. the clock-difference counterpart: same color, other board)
- **THEN** the relation accessors return the correct `TwoBoardPlayer` per bughouse team structure (team 1 = white-A + black-B, team 2 = black-A + white-B)

#### Scenario: Unit-tested pure logic
- **WHEN** the jest suite runs
- **THEN** `TwoBoardPlayers` accessor semantics (including `Team` composition, `teamNumber`, `name()` output, and username equivalence with the legacy `teamFirst`/`teamSecond` tuples) are covered by unit tests with no DOM required

## MODIFIED Requirements

### Requirement: Shared bughouse controller base class
The bughouse client SHALL provide a single abstract base controller (`TwoBoardController` in `client/two-board/twoBoardCtrl.ts`) that owns two-board state and logic common to live play and analysis: `boardA`/`boardB` construction and cross-wiring, shared model fields (`gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `home`), the shared `players: TwoBoardPlayers` instance, `steps` with `ply`/`plyA`/`plyB` bookkeeping, capture detection for a step, and movelist button setup. `RoundControllerBughouse` and `AnalysisControllerBughouse` SHALL extend this base and contain only round-specific (socket, clocks, offers, chat) or analysis-specific (engine, analysis tree, PGN) logic respectively; round-only presentation state (`SeatsState` in `client/two-board/seatsState.ts`, formerly `PlayersState`) SHALL attach its per-seat concerns (clock, clock difference) to the shared players via `RoundSeat` wrappers and derive screen-position mappings from the shared `players` instance instead of duplicating identity fields.

#### Scenario: Step ply bookkeeping is defined once
- **WHEN** either controller ingests steps (round `updateSteps` full/single paths, analysis `onMsgBoard`)
- **THEN** the plyA/plyB counting and per-step stamping is performed by the single shared base implementation, and both controllers produce step lists identical to pre-refactor behavior

#### Scenario: Board wiring is defined once
- **WHEN** a bughouse round page or analysis page constructs its controller
- **THEN** both boards are created and cross-wired (`partnerCC`, `parent`) by the base constructor, and each board's `parent` is typed as the base class

#### Scenario: One players instance per page
- **WHEN** either controller is constructed
- **THEN** the base constructor creates the single `TwoBoardPlayers` instance that all consumers (round presentation state, analysis, movelist) share

### Requirement: Consumers type against the base class
Modules that operate on "either bughouse controller" (`common/movelist.ts`, `common/gameCtrl.ts`) SHALL use the base class type instead of the union `AnalysisControllerBughouse | RoundControllerBughouse` wherever only shared members are accessed, and SHALL obtain team/player information from the base's `players` member — no `instanceof` narrowing or type assertions for player identity. Narrowing to a concrete subclass SHALL only occur where genuinely subclass-only members (e.g. clocks, analysis tree accessors) are needed.

#### Scenario: Movelist renders for both controllers
- **WHEN** `updateMovelist`/`selectMove`/`createMovelistButtons` are called with either controller
- **THEN** they compile against the base type and render output identical to pre-refactor behavior for both the round and analysis pages

#### Scenario: Team names without casts
- **WHEN** the movelist renders the game result line with team names
- **THEN** it reads them from `ctrl.players` on the base type, with the former `teamsOf` `instanceof`+cast bridge removed
