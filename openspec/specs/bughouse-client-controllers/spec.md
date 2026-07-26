# bughouse-client-controllers

## Purpose

Structural requirements for the bughouse client controller layer (`client/two-board/`): a single shared controller core for two-board state, subclassing for round vs analysis concerns, an acyclic controller module graph, and behavior parity guarantees for structural refactors. Established by the `refactor-bughouse-ctrl-shared-logic` change (2026-07-18); extended to the seat-centric abstraction and viewer-oriented analysis boards by the `adopt-two-board-players-in-analysis` change (2026-07-25) and to isolated analysis PGN, engine-evaluation, and tree-navigation modules by the `extract-two-board-analysis-pgn`, `extract-two-board-analysis-engine`, and `extract-two-board-analysis-tree` changes (2026-07-25).

## Requirements

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

### Requirement: No circular imports among bughouse controller modules
The module dependency graph of `client/two-board/` controller files SHALL be acyclic: `round/roundCtrl.ts` and `analysis/analysisCtrl.ts` MUST NOT import each other, directly or transitively through `common/gameCtrl.ts`. Shared free functions (`swap`, `switchBoards`, `initBoardSettings`) SHALL live in the shared base module `client/two-board/twoBoardCtrl.ts` and accept the base controller type.

#### Scenario: Switching boards from either page
- **WHEN** `switchBoards` is invoked from a round controller or an analysis controller
- **THEN** the same shared implementation swaps the board DOM/grid areas and redraws both chessgrounds, with no import of the round module by the analysis module or vice versa

### Requirement: Consumers type against the base class
Modules that operate on "either bughouse controller" (`common/movelist.ts`, `common/gameCtrl.ts`) SHALL use the base class type instead of the union `AnalysisControllerBughouse | RoundControllerBughouse` wherever only shared members are accessed, and SHALL obtain team/player information from the base's `seats` member — no `instanceof` narrowing or type assertions for player identity. Narrowing to a concrete subclass SHALL only occur where genuinely subclass-only members (e.g. clocks, analysis tree accessors) are needed. Where `movelist.ts` narrows to analysis-tree-capable controllers, it SHALL narrow directly against `AnalysisControllerBughouse`'s `tree` member (a property-presence check, not `instanceof`) rather than through a separately maintained structural mirror-type interface.

#### Scenario: Movelist renders for both controllers
- **WHEN** `updateMovelist`/`selectMove`/`createMovelistButtons` are called with either controller
- **THEN** they compile against the base type and render output identical to pre-refactor behavior for both the round and analysis pages

#### Scenario: Team names without casts
- **WHEN** the movelist renders the game result line with team names
- **THEN** it reads them from `ctrl.seats` on the base type, with the former `teamsOf` `instanceof`+cast bridge removed

#### Scenario: Tree narrowing without a mirror type
- **WHEN** the movelist needs to render tree-specific UI (variation rows, context menu, collapse controls) for a controller that may or may not have an analysis tree
- **THEN** it narrows via `ctrl.tree?.hasAnalysisTree()` against the real `AnalysisControllerBughouse` type, and no duplicated structural interface re-declaring the tree controller's method signatures exists in `movelist.ts`

### Requirement: Behavior parity across the refactor
The refactor SHALL NOT change any user-visible behavior of bughouse round play or analysis, with one deliberate exception: the initial orientation of the analysis boards for a viewer who participated in the analyzed game (viewer-oriented boards, per the "Viewer-oriented initial board orientation on the analysis page" requirement). Known divergences between the two controllers (e.g. round-only chat markers in the step loop, analysis-only eval stamping) SHALL be preserved in the respective subclass, not unified.

#### Scenario: Round play smoke
- **WHEN** a bughouse game is played after the refactor (moves on both boards, clock updates, game end)
- **THEN** moves, sounds, clocks, movelist, chat markers, and game-over controls behave exactly as before

#### Scenario: Analysis smoke
- **WHEN** a finished bughouse game is opened on the analysis page and the user scrolls plies, toggles the engine, and switches/flips boards
- **THEN** board states, evals, movelist, and PGN output behave exactly as before, except the documented initial-orientation change for participants

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
- **WHEN** the bughouse PGN header (WhiteA/BlackA/WhiteB/BlackB tags) is built in the analysis PGN module (`client/two-board/analysis/pgn.ts`)
- **THEN** the names come from `seats.byBoardAndColor(board, color).player.username`, the header is built by that module's single shared helper used by both the tree and legacy PGN paths, and the output is byte-identical to before

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

### Requirement: Viewer-oriented initial board orientation on the analysis page
The bughouse analysis page SHALL derive each board's initial chessground orientation from `seats.initialTopColor(board)` (the bottom color being the opposite of the top color) instead of hardcoded values. For spectators and for the plain analysis board (no game, viewer not among the players), the resulting orientations SHALL be identical to the previous hardcoded behavior (board A white at the bottom, board B black at the bottom). `flipBoards` and `switchBoards` SHALL continue to operate relative to the initial orientation.

#### Scenario: Participant opens their own game's analysis
- **WHEN** a player of the analyzed bughouse game opens the analysis page
- **THEN** each board is oriented as that player experienced it during the game (their own color, and on the partner board their partner's color, at the bottom)

#### Scenario: Spectator or plain analysis board
- **WHEN** a non-participant opens a game's analysis page, or anyone opens the variant analysis board without a game
- **THEN** board A is oriented white-at-bottom and board B black-at-bottom, exactly as before this change

### Requirement: PGN logic isolated in a dedicated analysis module
Bughouse-analysis PGN functionality SHALL live in `client/two-board/analysis/pgn.ts` as free functions taking the analysis controller (type-only controller import, no runtime edge back into the controller module): full PGN text generation for both the tree-based and legacy mainline paths (including the single shared header builder and the `1A.`/`1B.` move counters), the FEN/PGN panel rendering (`#copyfen` buttons, `#fullfen` value, `#pgntext`), and the refresh logic combining them. `AnalysisControllerBughouse` MUST NOT contain PGN string assembly; it keeps only the retained-vnode/PGN state fields and delegating call sites. The pure tree/line move-text renderers remain in `analysisTreeTwoBoards.ts` and are composed by the module.

#### Scenario: PGN output is unchanged
- **WHEN** the analysis page generates the PGN for a game or analysis-board session (tree path or legacy mainline path) after the extraction
- **THEN** the produced PGN text — header tags, tag order, move counters, terminator — is byte-identical to before, and the FEN & PGN tab renders identically

#### Scenario: Controller stays free of PGN assembly
- **WHEN** the analysis controller needs PGN text or a panel refresh (constructor render, board message ingestion, ply navigation, move entry)
- **THEN** it calls the `pgn.ts` module functions; no header-tag or move-text string building exists in `analysisCtrl.ts`

#### Scenario: Pure parts are unit-tested
- **WHEN** the jest suite runs
- **THEN** the module's pure output (header tags from the `seats` container, legacy mainline move text with per-board counters and the `sanSAN ?? san` fallback) is covered by tests using a stub controller with no DOM

### Requirement: Engine evaluation isolated in a dedicated analysis module
Bughouse-analysis engine evaluation SHALL live in `client/two-board/analysis/engine.ts` as an engine controller class instantiated by the analysis controller (`ctrl.engine`; type-only controller import, no runtime edge back into the controller module). The engine controller SHALL own the engine subsystem's state (Fairy-Stockfish message/prompt wiring, readiness, ffish handle and notation object, PV engine board, depth/multipv/arrow settings, and the PV/score/info retained vnodes) and behavior (UCI `info` line parsing, engine start/stop per board, go-deeper, PV/score/gauge/best-move-arrow rendering, PV-move clicking, and the engine toggle inputs). `AnalysisControllerBughouse` MUST NOT contain engine state or UCI/PV-rendering code; it keeps only delegating call sites (construction, stop/refresh/go around ply navigation and move entry, server-eval score stamping). Score formatting (`buildScoreStr`) and UCI eval-line parsing SHALL be exported pure functions. Per-board `localAnalysis` flags remain on the board controllers, and the page module wires `window['onFSFline']` to the engine controller.

#### Scenario: Engine behavior is unchanged
- **WHEN** a user toggles either board's engine checkbox, scrolls plies, enters moves, requests more depth, or clicks a PV move after the extraction
- **THEN** engine start/stop, PV lines (multipv 1–5), score/gauge/arrow rendering, and the engine-termination error dialog behave exactly as before

#### Scenario: Controller stays free of engine code
- **WHEN** the analysis controller needs engine interaction (constructor setup, `goPly`/`sendMove` stop-and-restart, info-line reset on board messages)
- **THEN** it calls `ctrl.engine` methods or the exported pure helpers; no UCI strings, eval parsing, or PV/score/gauge rendering exists in `analysisCtrl.ts`

#### Scenario: Pure parts are unit-tested
- **WHEN** the jest suite runs
- **THEN** score formatting (mate/cp values, sign handling per color) and UCI eval-line parsing (depth, multipv, cp/mate scores, bounds, nodes, pv extraction) are covered by unit tests with no DOM or engine required

### Requirement: Analysis-tree navigation isolated in a dedicated module
Bughouse-analysis tree navigation SHALL live in `client/two-board/analysis/analysisTree.ts` as an `AnalysisTreeController` class instantiated by the analysis controller (`ctrl.tree`; type-only controller import, no runtime edge back into the controller module). The tree controller SHALL own the tree state (`analysisTree`, `analysisPath`, `treeForkIndex`, `treeContextMenu`) and behavior (tree initialization, path/node lookup and navigation, mainline/branch/line/fork traversal, context-menu open/close, collapse/expand and its localStorage persistence, variation promotion/forcing/deletion, and recording a played move into the tree). `AnalysisControllerBughouse` MUST NOT contain tree-path/node logic; it keeps only the `tree` member, the Mousetrap key-binding wiring (delegating to `ctrl.tree`), and board-orchestration methods (`goPly`, `sendMove`) that call into the tree controller for tree state but perform their own board/FEN/sound/render work.

#### Scenario: Tree behavior is unchanged
- **WHEN** a user navigates plies/branches/variations via keyboard, movelist clicks, or the tree context menu (open/close, copy line, promote/force variation, delete node, collapse/expand) after the extraction
- **THEN** the resulting tree state, active path, movelist rendering, and PGN output are identical to before

#### Scenario: Controller stays free of tree logic
- **WHEN** the analysis controller needs tree interaction (construction, `goPly`'s tree-driven branch, `sendMove` recording a played move, Mousetrap bindings)
- **THEN** it calls `ctrl.tree` methods; no tree-path/node computation exists in `analysisCtrl.ts` outside of board-orchestration methods that read tree state via the tree controller

#### Scenario: Pure parts are unit-tested
- **WHEN** the jest suite runs
- **THEN** tree-controller navigation (path/node lookup, branch/line/fork traversal, context-menu coordinate math, collapse-path persistence round-trip through a stubbed `localStorage`) is covered by unit tests against a real `AnalysisTree` fixture, without a live analysis page
