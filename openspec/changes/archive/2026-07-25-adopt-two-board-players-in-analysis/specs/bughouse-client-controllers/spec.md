# bughouse-client-controllers — delta for adopt-two-board-players-in-analysis

## ADDED Requirements

### Requirement: Viewer-oriented initial board orientation on the analysis page
The bughouse analysis page SHALL derive each board's initial chessground orientation from `seats.initialTopColor(board)` (the bottom color being the opposite of the top color) instead of hardcoded values. For spectators and for the plain analysis board (no game, viewer not among the players), the resulting orientations SHALL be identical to the previous hardcoded behavior (board A white at the bottom, board B black at the bottom). `flipBoards` and `switchBoards` SHALL continue to operate relative to the initial orientation.

#### Scenario: Participant opens their own game's analysis
- **WHEN** a player of the analyzed bughouse game opens the analysis page
- **THEN** each board is oriented as that player experienced it during the game (their own color, and on the partner board their partner's color, at the bottom)

#### Scenario: Spectator or plain analysis board
- **WHEN** a non-participant opens a game's analysis page, or anyone opens the variant analysis board without a game
- **THEN** board A is oriented white-at-bottom and board B black-at-bottom, exactly as before this change

## MODIFIED Requirements

### Requirement: Single player-info abstraction for the four bughouse seats
The bughouse client SHALL represent the four seats (white/black × board a/b) as `Seat` objects (`client/two-board/common/players.ts`), each holding its board+color coordinates (`boardName`, `color`) and the `player: TwoBoardPlayer` sitting there. `TwoBoardPlayer` SHALL carry pure person identity only (`username`, `title`, `rating`) — no seat coordinates; there is one player instance per seat (in simul mode the same username appears in two seats as two instances). One person can never occupy seats of both teams; in simul mode one person occupies both seats of the same team.

Seat-relative logic SHALL be keyed by seat coordinates, and per-player questions SHALL identify the player's seat(s) first and then use the seat logic. The seats SHALL be owned by a `TwoBoardSeats` container constructed from the page model and viewer username only (no DOM, no controller references), providing: coordinate lookup (`byBoardAndColor(board, color): Seat`), viewer-relative accessors (`me(board): Seat | undefined`, `myColor(board)`, `isSpectator()`, `myTeam()`), seat relations (`partnerOf`, `opponentOf`, `opponentsPartnerOf` — `Seat` in, `Seat` out, computed from coordinates), team lookup (`teamOf(seat)` — coordinate-resolved, so any `Seat`-shaped input works), and the viewer-relative initial screen placement `initialTopColor(board)` — the color rendered at the top of that board for this viewer, defined by seat precedence: (1) if the viewer occupies a seat on the given board, the opposite of that seat's color; (2) otherwise, if the viewer occupies a seat on the other board, the opposite of their partner's color on the given board (equivalently, the viewer's own color on the other board); (3) otherwise (spectator) the canonical orientations: black on top of board a, white on top of board b.

`teams: [Team, Team]` SHALL hold `Team` objects composed of their two `Seat`s, a `teamNumber` label ('1'/'2'), and a `name(format?)` method returning both usernames joined with '+', each passed through the optional formatter (default: identity). A pure recorded-clock-time accessor `clockTimeAt(step, seat)` SHALL be exported alongside the container, returning the seat's recorded time from the step's per-board clock arrays.

The two-board controllers SHALL hold this container as `seats: TwoBoardSeats`, and any logic that accesses players MUST go through the seats. Player-identity and team questions in the two-board client modules — including analysis PGN header tags, the movetime chart's team series, the movelist's team-name lines, and the game-info team rows — MUST be answered through these accessors rather than ad-hoc color/board arithmetic, raw model player keys, or parallel scalar fields, and recorded-clock-time reads in analysis modules MUST go through `clockTimeAt` rather than hand-indexing `step.clocks`/`step.clocksB` by color and board. Recorded times remain per-step data; live-clock state (`Clock`, flagging, clock differences) remains round-only in `SeatsState`/`RoundSeat` — `RoundSeat` SHALL extend the shared `Seat` with its round-only presentation (clock, clock difference, player bar, screen position) — and MUST NOT be introduced on the analysis page.

#### Scenario: Viewer-relative lookup
- **WHEN** round-play logic needs the viewer's seat or color on a board (flag callbacks, movable gating, premove/myMove checks, orientation)
- **THEN** it obtains it from `seats.myColor(board)`/`seats.me(board)` and behaves identically to the previous `myColor`/`partnerColor` map lookups, including the simul case where one username occupies seats on both boards (two separate `Seat` instances)

#### Scenario: Relation lookup
- **WHEN** logic needs the seat of a partner, opponent, or opponent's partner (e.g. the clock-difference counterpart: same color, other board)
- **THEN** it identifies the starting seat and the relation accessors return the correct related `Seat` per bughouse team structure (team 1 = white-A + black-B, team 2 = black-A + white-B)

#### Scenario: Team lookup from a mover
- **WHEN** the movetime chart classifies a step by the team of the seat that moved
- **THEN** it resolves the mover seat via `byBoardAndColor(step.boardName, moverColor)` and reads `teamOf(moverSeat).teamNumber`, with no inlined color/board pairing rule, producing series assignments identical to the previous hand-rolled computation

#### Scenario: Team names via one formatter-aware method
- **WHEN** the movelist renders team-name lines (result line and header sites) or any consumer needs a team label
- **THEN** it calls `team.name()` for raw usernames or `team.name(displayUsername)` for display names, and no call site concatenates team usernames itself

#### Scenario: PGN header tags from the container
- **WHEN** the analysis controller builds the bughouse PGN header (WhiteA/BlackA/WhiteB/BlackB tags)
- **THEN** the names come from `seats.byBoardAndColor(board, color).player.username`, the header is built by a single shared helper used by both the tree and legacy PGN paths, and the output is byte-identical to before

#### Scenario: Game-info team rows from the container
- **WHEN** `gameInfoBug` renders the two player rows
- **THEN** each row's players are obtained from the `TwoBoardSeats` container by seat lookup (row 1: white-A + black-B; row 2: white-B + black-A) and the rendered markup (order, icons, links, ratings) is identical to before

#### Scenario: Recorded clock times via the seat accessor
- **WHEN** the analysis page renders the per-position clocks (`analysisClock.ts`) or the movetime chart computes per-move times (`movetimeChart.ts`)
- **THEN** each recorded time is obtained via `clockTimeAt(step, seat)` for the relevant seat, no call site selects `step.clocks` vs `step.clocksB` or indexes by color itself, and the rendered clocks and chart values are identical to before

#### Scenario: Seat placement math defined once
- **WHEN** the round page computes which color sits at the top of each board for the current viewer (`SeatsState`) or the analysis page computes initial orientations
- **THEN** both read `seats.initialTopColor(board)`; the computation exists only in `TwoBoardSeats` and follows the seat-precedence definition (own seat on the board → its opposite color on top; else seat on the other board → the partner's opposite color on top; else the canonical spectator orientations)

#### Scenario: Unit-tested pure logic
- **WHEN** the jest suite runs
- **THEN** `TwoBoardSeats` accessor semantics (including `Seat` composition, `Team` composition, `teamNumber`, `name()`/`name(format)` output, `teamOf` for all four seats, `initialTopColor` for spectator/participant/simul viewers, `clockTimeAt` for both boards and colors including steps with missing clock arrays, and username equivalence with the legacy `teamFirst`/`teamSecond` tuples) are covered by unit tests with no DOM required

### Requirement: Shared bughouse controller base class
The bughouse client SHALL provide a single abstract base controller (`TwoBoardController` in `client/two-board/twoBoardCtrl.ts`) that owns two-board state and logic common to live play and analysis: `boardA`/`boardB` construction and cross-wiring, shared model fields (`gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `home`), the shared `seats: TwoBoardSeats` instance, `steps` with `ply`/`plyA`/`plyB` bookkeeping, capture detection for a step, and movelist button setup. `RoundControllerBughouse` and `AnalysisControllerBughouse` SHALL extend this base and contain only round-specific (socket, clocks, offers, chat) or analysis-specific (engine, analysis tree, PGN) logic respectively; round-only presentation state (`SeatsState` in `client/two-board/seatsState.ts`, formerly `PlayersState`) SHALL attach its per-seat concerns (clock, clock difference) via `RoundSeat` objects that extend the shared `Seat` and derive screen-position mappings from the shared `seats` instance instead of duplicating identity fields.

#### Scenario: Step ply bookkeeping is defined once
- **WHEN** either controller ingests steps (round `updateSteps` full/single paths, analysis `onMsgBoard`)
- **THEN** the plyA/plyB counting and per-step stamping is performed by the single shared base implementation, and both controllers produce step lists identical to pre-refactor behavior

#### Scenario: Board wiring is defined once
- **WHEN** a bughouse round page or analysis page constructs its controller
- **THEN** both boards are created and cross-wired (`partnerCC`, `parent`) by the base constructor, and each board's `parent` is typed as the base class

#### Scenario: One seats instance per page
- **WHEN** either controller is constructed
- **THEN** the base constructor creates the single `TwoBoardSeats` instance that all consumers (round presentation state, analysis, movelist) share

### Requirement: Consumers type against the base class
Modules that operate on "either bughouse controller" (`common/movelist.ts`, `common/gameCtrl.ts`) SHALL use the base class type instead of the union `AnalysisControllerBughouse | RoundControllerBughouse` wherever only shared members are accessed, and SHALL obtain team/player information from the base's `seats` member — no `instanceof` narrowing or type assertions for player identity. Narrowing to a concrete subclass SHALL only occur where genuinely subclass-only members (e.g. clocks, analysis tree accessors) are needed.

#### Scenario: Movelist renders for both controllers
- **WHEN** `updateMovelist`/`selectMove`/`createMovelistButtons` are called with either controller
- **THEN** they compile against the base type and render output identical to pre-refactor behavior for both the round and analysis pages

#### Scenario: Team names without casts
- **WHEN** the movelist renders the game result line with team names
- **THEN** it reads them from `ctrl.seats` on the base type, with the former `teamsOf` `instanceof`+cast bridge removed

### Requirement: Behavior parity across the refactor
The refactor SHALL NOT change any user-visible behavior of bughouse round play or analysis, with one deliberate exception: the initial orientation of the analysis boards for a viewer who participated in the analyzed game (viewer-oriented boards, per the "Viewer-oriented initial board orientation on the analysis page" requirement). Known divergences between the two controllers (e.g. round-only chat markers in the step loop, analysis-only eval stamping) SHALL be preserved in the respective subclass, not unified.

#### Scenario: Round play smoke
- **WHEN** a bughouse game is played after the refactor (moves on both boards, clock updates, game end)
- **THEN** moves, sounds, clocks, movelist, chat markers, and game-over controls behave exactly as before

#### Scenario: Analysis smoke
- **WHEN** a finished bughouse game is opened on the analysis page and the user scrolls plies, toggles the engine, and switches/flips boards
- **THEN** board states, evals, movelist, and PGN output behave exactly as before, except the documented initial-orientation change for participants
