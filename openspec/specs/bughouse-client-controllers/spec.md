# bughouse-client-controllers

## Purpose

Structural requirements for the bughouse client controller layer (`client/two-board/`): a single shared controller core for two-board state, subclassing for round vs analysis concerns, an acyclic controller module graph, and behavior parity guarantees for structural refactors. Established by the `refactor-bughouse-ctrl-shared-logic` change (2026-07-18); extended to the seat-centric abstraction and viewer-oriented analysis boards by the `adopt-two-board-players-in-analysis` change (2026-07-25); to isolated analysis PGN, engine-evaluation, and tree-navigation modules by the `extract-two-board-analysis-pgn`, `extract-two-board-analysis-engine`, and `extract-two-board-analysis-tree` changes (2026-07-25); to a controller free of direct DOM manipulation by the `dom-free-two-board-analysis-ctrl` change (2026-07-26); and to the shared base and round controllers by the `dom-free-two-board-ctrl-core` change (2026-07-26); and to widgets owning their own placeholder vnodes instead of being found by id by the `two-board-widgets-own-placeholder-vnodes` change (2026-07-26).
## Requirements
### Requirement: Shared bughouse controller base class
The bughouse client SHALL provide a single abstract base controller (`TwoBoardController` in `client/two-board/twoBoardCtrl.ts`) that owns two-board state and logic common to live play and analysis: `boardA`/`boardB` construction and cross-wiring, shared model fields (`gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `home`), the shared `seats: SeatConfiguration<Seat>` instance, `steps` with `ply`/`plyA`/`plyB` bookkeeping, capture detection for a step, and movelist button setup. `RoundControllerBughouse` and `AnalysisControllerBughouse` SHALL extend this base and contain only round-specific (socket, clocks, offers, chat) or analysis-specific (engine, analysis tree, PGN) logic respectively; round-only presentation state (`SeatsState` in `client/two-board/round/seatsState.ts`, formerly `PlayersState`) SHALL attach its per-seat concerns (clock, clock difference) via `RoundSeat` objects that extend the shared `Seat` and derive screen-position mappings from the shared `seats` instance instead of duplicating identity fields.

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
The refactor SHALL NOT change any user-visible behavior of bughouse round play or analysis, with two deliberate exceptions: the initial orientation of the analysis boards for a viewer who participated in the analyzed game (viewer-oriented boards, per the "Viewer-oriented initial board orientation on the analysis page" requirement), and the initial visibility of the `#chart-movetime` movetime-chart placeholder for a real, in-progress game with zero moves played (per the "Analysis controller performs no direct DOM manipulation" requirement — this case now shows an empty chart placeholder where it previously stayed hidden, since `isAnalysisBoard` is the only signal available at static-template-build time and does not distinguish "no game" from "a game with no moves yet"). Known divergences between the two controllers (e.g. round-only chat markers in the step loop, analysis-only eval stamping) SHALL be preserved in the respective subclass, not unified.

#### Scenario: Round play smoke
- **WHEN** a bughouse game is played after the refactor (moves on both boards, clock updates, game end)
- **THEN** moves, sounds, clocks, movelist, chat markers, and game-over controls behave exactly as before

#### Scenario: Analysis smoke
- **WHEN** a finished bughouse game is opened on the analysis page and the user scrolls plies, toggles the engine, and switches/flips boards
- **THEN** board states, evals, movelist, and PGN output behave exactly as before, except the documented initial-orientation change for participants and the documented zero-move chart-placeholder visibility change

### Requirement: Single player-info abstraction for the four bughouse seats
The bughouse client SHALL represent the four seats (white/black × board a/b) as `Seat` objects (`client/two-board/common/seat.ts`), each holding its board+color coordinates (`boardName`, `color`) and the `player: TwoBoardPlayer` sitting there. `TwoBoardPlayer` SHALL carry pure person identity only (`username`, `title`, `rating`) — no seat coordinates; there is one player instance per seat (in simul mode the same username appears in two seats as two instances). One person can never occupy seats of both teams; in simul mode one person occupies both seats of the same team. `common/seat.ts` SHALL contain only these abstractions (`TwoBoardPlayer`, `Seat`, `Team`) — no "all four seats" lookup logic, no DOM-touching code, and no dependency on step/analysis-tree types.

There SHALL be exactly one seat type (`Seat`) and exactly one seat container per page. No round-specific seat subclass and no second `SeatConfiguration` instance SHALL exist; `ctrl.seats` is the only seat container on either page. `Seat` SHALL carry one round-oriented member, `clock?: Clock` — the seat's live ticking clock — assigned by the round controller once per page after the round seat views exist, and left `undefined` on the analysis page, which SHALL NOT read it. This single optional field is preferred over a round-only `Seat` subtype, because a subtype would require a second container holding duplicate coordinates and players; everything else a round seat needs is view state and lives in the seat's view (see "Round seat views own their markup and are keyed by screen slot").

Seat-relative logic SHALL be keyed by seat coordinates, and per-player questions SHALL identify the player's seat(s) first and then use the seat logic. A single generic container, `SeatConfiguration<S extends Seat>` (`client/two-board/common/seatConfiguration.ts`), SHALL provide every seat-identification method needed by either page, for any `Seat` subtype: coordinate lookup (`byBoardAndColor(board, color): S`), board-scoped lookup (`seatsOn(board): S[]`), viewer-relative accessors (`me(board): S | undefined`, `myColor(board)`, `isSpectator()`, `myTeam()`), seat relations (`partnerOf`, `opponentOf`, `opponentsPartnerOf` — `S` in, `S` out, computed from coordinates), team lookup (`teamOf(seat)` — coordinate-resolved, so any `Seat`-shaped input works), and the viewer-relative initial screen placement `initialTopColor(board)` — the color rendered at the top of that board for this viewer, defined by seat precedence: (1) if the viewer occupies a seat on the given board, the opposite of that seat's color; (2) otherwise, if the viewer occupies a seat on the other board, the opposite of their partner's color on the given board (equivalently, the viewer's own color on the other board); (3) otherwise (spectator) the canonical orientations: black on top of board a, white on top of board b. `SeatConfiguration`'s constructor SHALL take the four already-built seats (of type `S`) and the viewer username only — it SHALL NOT itself know how to build seats from the page model or from step data. It SHALL remain generic even though only `SeatConfiguration<Seat>` is instantiated today, since the genericity is what lets the constructor stay build-agnostic.

The seat container SHALL be built by a factory function, `twoBoardSeats(model, viewer): SeatConfiguration<Seat>` (same file as `SeatConfiguration`) — not a subclass and not a type alias — constructed from the page model and viewer username only (no DOM, no controller references); it SHALL build the four base `Seat`s via `playerInfoData` (a page-model-parsing helper local to this file), with `clock` left unset, and pass them to `SeatConfiguration`'s constructor. The two-board controllers SHALL hold this container as `seats: SeatConfiguration<Seat>`, and any logic that accesses players MUST go through the seats.

`teams: [Team, Team]` SHALL hold `Team` objects composed of their two `Seat`s, a `teamNumber` label ('1'/'2'), and a `name(format?)` method returning both usernames joined with '+', each passed through the optional formatter (default: identity). A pure recorded-clock-time lookup, `clockTimeAt(step, seat): number | undefined`, SHALL be exported from `common/seatConfiguration.ts` (not `common/seat.ts`) as a standalone function — not a method on `Seat` — taking both a step and a seat and returning the seat's recorded time from the step's per-board clock arrays; keeping it outside `Seat` means the abstractions file never imports step/analysis-tree types. It is used for arbitrary single-seat lookups (e.g. the movetime chart, walking a mover seat one at a time without knowing its board ahead of time at the call site).

Player-identity and team questions in the two-board client modules — including analysis PGN header tags, the movetime chart's team series, the movelist's team-name lines, and the game-info team rows — MUST be answered through these accessors rather than ad-hoc color/board arithmetic, raw model player keys, or parallel scalar fields.

Live-clock behavior (ticking, flagging, applying server clock updates, the connecting indicator) remains round-only and unchanged in behavior. `RoundControllerBughouse` SHALL own it directly — constructing each seat's `Clock` against its view's clock element, wiring the flag callbacks and the per-clock tick callback that renders the clock-difference indicators, and exposing `updateClocks`, `setConnecting` and `setPresence` — operating on `ctrl.seats`. No intermediate round-seat container class SHALL exist.

#### Scenario: Viewer-relative lookup
- **WHEN** round-play logic needs the viewer's seat or color on a board (flag callbacks, movable gating, premove/myMove checks, orientation)
- **THEN** it obtains it from `seats.myColor(board)`/`seats.me(board)` and behaves identically to the previous `myColor`/`partnerColor` map lookups, including the simul case where one username occupies seats on both boards (two separate `Seat` instances)

#### Scenario: Relation lookup
- **WHEN** logic needs the seat of a partner, opponent, or opponent's partner (e.g. the clock-difference counterpart: same color, other board)
- **THEN** it identifies the starting seat and the relation accessors return the correct related seat per bughouse team structure (team 1 = white-A + black-B, team 2 = black-A + white-B)

#### Scenario: Round seat configuration shares the identification container
- **WHEN** round code needs a seat by coordinates, by relation, or by viewer position — including for clock lookups
- **THEN** it resolves it directly on `ctrl.seats`, the shared `SeatConfiguration<Seat>`; no round-specific seat container or `Seat` subclass exists, no second `SeatConfiguration` instance exists on the page, and the seat returned is the same object identity the analysis-shared container holds

#### Scenario: Clocks are reachable from the seat
- **WHEN** round code needs a seat's live clock (flag wiring, the premove clock-plus-increment math in `sendMove`, the `clocks`/`clocksB` values sent with a move, pausing every clock at game end)
- **THEN** it reads `seat.clock` on the seat resolved from `ctrl.seats`, and the values sent and displayed are identical to those produced by the previous `SeatsState.getClock(board, color)` path

#### Scenario: Analysis leaves the clock unset
- **WHEN** the analysis page constructs its seats and renders any of its views
- **THEN** every seat's `clock` is `undefined`, no analysis code path reads it, and no `Clock` instance is created by the analysis page

#### Scenario: Round's clock-difference computation is unchanged
- **WHEN** any of the four round clocks ticks
- **THEN** the tick handler resolves the `opponentsPartnerOf` counterpart on `ctrl.seats`, computes the live time of both the ticking seat and its counterpart from their `Clock`s, and renders the difference through each seat's *view* — the same computation and the same rendered values as before this change, with no stored state on either seat

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
- **THEN** each row's players are obtained from the seat container by seat lookup (row 1: white-A + black-B; row 2: white-B + black-A) and the rendered markup (order, icons, links, ratings) is identical to before

#### Scenario: Recorded clock times via the seat accessor
- **WHEN** the movetime chart computes per-move times for a specific mover seat (`movetimeChart.ts`)
- **THEN** each recorded time is obtained via `clockTimeAt(step, seat)` for the relevant seat, no call site selects `step.clocks` vs `step.clocksB` or indexes by color itself, and the chart values are identical to before

#### Scenario: Analysis clock rendering reads a recorded step's clock pair directly
- **WHEN** the analysis page renders the per-position clocks (`analysisClock.ts`) for a board whose recorded step carries a `clocks`/`clocksB` pair
- **THEN** it passes that pair straight to the clock-rendering function (no per-seat reconstruction via `clockTimeAt`, since the pair is already in the exact shape needed) and the rendered clocks are identical to before

#### Scenario: Seat placement math defined once
- **WHEN** the round controller maps its seats to their screen slots, or the analysis page computes initial orientations
- **THEN** both read `initialTopColor(board)` from the seat container; the computation exists only in `SeatConfiguration` and follows the seat-precedence definition (own seat on the board → its opposite color on top; else seat on the other board → the partner's opposite color on top; else the canonical spectator orientations)

#### Scenario: Unit-tested pure logic
- **WHEN** the jest suite runs
- **THEN** `SeatConfiguration`'s accessor semantics (including `Seat` composition, `Team` composition, `teamNumber`, `name()`/`name(format)` output, `teamOf` for all four seats, `initialTopColor` for spectator/participant/simul viewers, and `clockTimeAt` for both boards and colors including steps with missing clock arrays) are covered by unit tests with no DOM required, and the round page's clock construction, tick-driven clock-difference rendering, `updateClocks` effects and presence rendering are covered against `RoundSeatView` plus the round controller's clock methods, without duplicating the container cases

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

### Requirement: Analysis controller performs no direct DOM manipulation
`AnalysisControllerBughouse` SHALL NOT create DOM elements or set styles/classes directly (no `document.getElementById`/`classList`/`style` mutation, no `patch()` calls building ad-hoc elements). All static, unconditional DOM setup SHALL live in `client/two-board/analysis/analysis.ts`'s initial markup instead; any setup that genuinely depends on runtime data unavailable at static-template-build time SHALL be decided from `model` in `analysis.ts` when a template-time-available signal suffices, or delegated to the dedicated rendering module already responsible for that DOM area (e.g. `analysisClock.ts`, `movetimeChart.ts`, `pgn.ts`, `engine.ts`) — never left inline in the controller.

#### Scenario: Static setup lives in the view
- **WHEN** the analysis page is constructed
- **THEN** the `gaugePartner` element's `flipped` class and the four `anal-clock-*` elements' `.anal-clock.*` classes are present from `analysis.ts`'s initial render, with no controller code assigning them afterward

#### Scenario: Model-decided visibility replaces a runtime DOM toggle
- **WHEN** the analysis page is constructed for a real game (`isAnalysisBoard` false) versus the plain variant analysis board (`isAnalysisBoard` true)
- **THEN** `#chart-movetime`'s initial visibility is decided by `analysis.ts` from `isAnalysisBoard` at render time, with no controller code toggling its `style.display` afterward

### Requirement: Shared base and round controllers hold no VNode/HTMLElement-typed fields or inline DOM code
`TwoBoardController` (`twoBoardCtrl.ts`) and `RoundControllerBughouse` (`roundCtrl.ts`) SHALL NOT declare `VNode`/`HTMLElement`-typed fields, nor contain inline `document.*`/`patch()`/`h()` calls in class methods — with the sole exception of the constructor's `HTMLElement` mount-point parameters used to construct the chessground boards, `roundCtrl.ts`'s tab-focus (`document.hidden`/`visibilitychange`) tracking (neither of which is DOM content rendering), and `twoBoardCtrl.ts`'s pre-existing `swap`/`switchBoards`/`initBoardSettings` free functions (out of scope for this change). `AnalysisControllerBughouse` (`analysisCtrl.ts`) SHALL likewise hold no dead write-only `VNode` field left over from a prior extraction.

Retained-vnode state that snabbdom's `patch(oldVnode, newVnode)` genuinely needs for incremental diffing (as opposed to state that is written but never read back) SHALL be owned by a small view-state class instantiated once by the controller and held via a non-DOM-typed member, in the module already responsible for that DOM area — not a bare controller field and not a bare module-level variable. Fields confirmed dead (written but never read back) SHALL be deleted outright, not relocated.

#### Scenario: Dead fields removed
- **WHEN** `AnalysisControllerBughouse` is constructed and its PGN panel is rendered, or `TwoBoardController` is constructed and its movelist buttons are rendered
- **THEN** no `vpgn` field exists on the analysis controller and no `moveControls` field exists on the base controller; the underlying `patch()` calls in `pgn.ts`/`movelist.ts` still run exactly as before, just without assigning their result to a controller field

#### Scenario: Movelist retained-vnode state owned by its rendering module
- **WHEN** the movelist is updated (tree navigation, a new move, a result) after this change
- **THEN** `common/movelist.ts` diffs against its own retained-vnode state (not a `TwoBoardController.vmovelist` field) and the movelist updates in place exactly as before, with no scroll-position reset

#### Scenario: Round dialog and game-controls retained-vnode state owned by a dedicated round-view class
- **WHEN** a draw/rematch offer dialog is shown, updated, or cleared, or the game-controls buttons transition to their post-game state, after this change
- **THEN** `RoundControlsView` (`client/two-board/round/roundControls.ts`, not `roundCtrl.ts`) owns the retained vnode(s) and performs the diffed `patch()` calls, and the rendered result is pixel-for-pixel identical to before

#### Scenario: Remaining ad-hoc round DOM code relocated
- **WHEN** chat is rendered, the extension-choice widget is cleaned up, the abort button is cleared, the rematch button is inserted, the online-status icon is patched, or the player-bar/info-wrap orientation is swapped, after this change
- **THEN** the DOM-authoring code for each lives in the dedicated round-view module (or another already-appropriate module), and `roundCtrl.ts` calls into it rather than calling `document.*`/`patch()`/`h()` inline

#### Scenario: Behavior is unchanged
- **WHEN** a bughouse round is played (moves, clock updates, draw/resign/rematch offers, game end, board flip/switch) or an analysis session is used, after this change
- **THEN** all rendered output and behavior is identical to before this change — this is a pure code-motion refactor with no new deliberate behavior exceptions

### Requirement: Analysis-page widgets own their placeholder vnode instead of being found by id
Each of the five stateful two-board analysis widgets — the movelist (`MovelistView`), the engine panel (`EngineController`), the PGN panel (`PgnView`), the per-position analysis clocks, and the movetime chart (`MovetimeChartView`) — SHALL be constructed with no `ctrl` reference and no `document.*` access, building and storing its own placeholder vnode(s) purely. `client/two-board/analysis/analysis.ts` (and `client/two-board/round/round.ts` for the shared movelist) SHALL construct each widget's object during its synchronous view-building code and embed the object's placeholder vnode(s) directly in the returned tree, instead of writing a raw `h(...)` placeholder literal itself. The real controller's constructor (`AnalysisControllerBughouse`, and `TwoBoardController`/`RoundControllerBughouse` for the shared movelist) SHALL accept these pre-built objects as constructor parameters instead of instantiating them internally, and SHALL hand itself to whichever objects need `ctrl` for their first content-bearing render (or ongoing lifetime), exactly once, at the same point in construction where that widget's initial rendering already happens today.

#### Scenario: Movelist placeholder owned by MovelistView
- **WHEN** the analysis page or the round page is constructed
- **THEN** the `#movelist` element originates from `MovelistView`'s own placeholder-vnode construction, embedded by `analysis.ts`/`round.ts`, not from a raw `h('div#movelist')` literal in either view file, and the base controller receives the `MovelistView` instance as a constructor parameter

#### Scenario: Engine panel placeholders owned by EngineController, ctrl attached once
- **WHEN** the analysis page is constructed
- **THEN** `#score`/`#scorePartner`/`#info`/`#pv1`-`#pv5` originate from `EngineController`'s own constructor (no `document.getElementById`/`querySelector` lookups for them), and `EngineController.attachCtrl(ctrl)` is called exactly once, immediately after the real controller's own construction, before any other engine method runs — performing the `#input`/`#inputPartner` checkboxes' one ctrl-dependent initial render

#### Scenario: PGN panel placeholders owned by PgnView
- **WHEN** the analysis page is constructed
- **THEN** the `#copyfen` and `#pgntext` regions originate from `PgnView`'s own constructor-built placeholders, and the PGN panel's first ctrl-dependent content render happens via a `PgnView` method taking `ctrl`, called at the point `renderFENAndPGN` runs today

#### Scenario: Analysis clocks keyed by physical position, not color
- **WHEN** the analysis page is constructed and later has its boards flipped or switched
- **THEN** the clock view object's four retained placeholders are keyed by physical position (main-top, main-bottom, bug-top, bug-bottom), and color-to-position resolution continues to happen at render time exactly as before, so clock rendering after a flip/switch is unaffected by this change

#### Scenario: Movetime chart container owned by MovetimeChartView
- **WHEN** the analysis page is constructed and the movetime chart is (re)rendered
- **THEN** `Highcharts.chart(...)` is called against `MovetimeChartView`'s own retained element reference instead of the string id `'chart-movetime'`, and Highcharts' existing recreate-the-whole-chart-on-every-call behavior is unchanged

#### Scenario: Behavior is unchanged
- **WHEN** the analysis or round page is used after this change (movelist updates, engine toggling, PGN panel content, clock rendering across flip/switch, movetime chart display)
- **THEN** all rendered output and behavior is identical to before this change — this is a pure construction-time wiring change, with no change to any widget's re-render/update logic

#### Scenario: Contiguous multi-element widgets expose one composed-view method
- **WHEN** a widget's owned elements are always rendered together as one fixed-structure, contiguous block in the page view file's markup (the engine panel's checkboxes/score/info/scorePartner; the PGN panel's copyfen/pgntext pair)
- **THEN** the widget exposes a single method returning that whole composed block (`EngineController.renderPanel()`/`pvPanel()`, `PgnView.placeholders()`), and the page view file calls just that method instead of reassembling individual per-leaf placeholders; widgets whose elements are not contiguous (`AnalysisClockView`'s four clocks, interleaved with chessground board-wrapper divs it doesn't own) correctly keep separate per-element placeholder methods

### Requirement: Round seat views own their markup and are keyed by screen slot
Each of the four bughouse round seats SHALL have its DOM authored by a `RoundSeatView` (`client/two-board/round/roundSeatView.ts`), constructed with no `ctrl` reference and no `document.*` access. A `RoundSeatView` SHALL be keyed by screen slot only — `(position: 0 | 1, board: 'a' | 'b')`, where position 0 is the top of that board pre-flip — since that is all the information its markup depends on, and it is available before any seat, model or controller is.

`RoundSeatView` SHALL build its markup once in its constructor and expose it through a single composed view method returning that seat's whole `div.info-wrap{position}{.bug}` subtree — clock wrap, clock holder, clock element, clock-difference element, berserk slot, player bar root, misc-info slot — not one placeholder accessor per leaf element. `client/two-board/round/round.ts` SHALL construct the four views during its synchronous view-building code and embed those composed vnodes directly, instead of writing the four near-identical inline blocks it does today, and SHALL pass the four instances to `RoundControllerBughouse` as a constructor parameter (as it already does for `MovelistView`).

After the page's initial patch, `RoundSeatView` SHALL patch only leaf vnodes it retains — never the composed block — so that the inline `style.gridArea` values written imperatively by `swapClockGridAreasForFlip`/`swapClockGridAreasForSwitch` survive every subsequent render. It SHALL expose the round-only rendering operations: constructing this seat's `Clock` against its own clock element, rendering the clock-difference value, rendering the player bar, and setting the online/offline presence icon. The `showOnlineIcon` free function in `roundControls.ts` SHALL be removed, its fixed-slot behavior (position 1, board a) preserved through the corresponding view.

The player bar SHALL render under a root selector the view owns from the start — `round-player{position}`, plus the `bug` class for board b, plus id `rplayer{position}{board}` — with only its contents patched in, so the root element is never replaced and those classes and ids persist. The bar SHALL still be built by the single shared `player()` function in `client/player.ts`, which SHALL gain two optional trailing parameters: `online` (the presence icon's state) and `root` (the root selector, defaulting to `'round-' + id`). The round seat view SHALL pass its own root selector, because on the bughouse page the root selector and the presence-icon id genuinely diverge — the root tag must not vary per board, so that `round-player{0,1}.bug` matches, while the icon id must stay unique per board. Callers that pass neither parameter — the single-board round page — SHALL get markup identical to before.

#### Scenario: Round seat markup originates from the view
- **WHEN** the bughouse round page is constructed
- **THEN** each `div.info-wrap{position}{.bug}` block and every element inside it (`#clock{position}{board}`, `#difference{position}{board}`, `#berserk{position}{board}`, the player bar root, `#misc-info{position}{board}`) originates from a `RoundSeatView`'s own constructor-built vnode embedded by `round.ts`, `round.ts` contains no raw `h()` literal for any of them, and no round code looks any of them up by id

#### Scenario: Clocks and difference indicators bind without id lookup
- **WHEN** the round controller creates the four seats' clocks and the clock-difference widgets
- **THEN** each `Clock` and `ClockDifference` is constructed against the vnode its `RoundSeatView` already holds, with no `document.getElementById` call anywhere in the path, and the clocks tick and the difference indicators render exactly as before this change

#### Scenario: Player bar keeps its root element
- **WHEN** a player bar is rendered, and again whenever it is re-rendered
- **THEN** its root element is `round-player{position}` carrying the `bug` class on board b and the id `rplayer{position}{board}`, unchanged across renders, and the `i-side#player{position}{board}` presence icon inside it is patched in place
- **AND** as a deliberate consequence, the existing stylesheet rules `round-player0.bug`, `round-player1.bug` and `main.bug round-player{0,1}` apply to the bughouse round player bars, which they did not before — this is the one intentional visual change in this change

#### Scenario: Presence rendering goes through the view
- **WHEN** a user-present or user-disconnected message arrives, or the viewer's own connection is confirmed on user-connected
- **THEN** the online/offline icon is patched through the relevant `RoundSeatView`(s) — resolved from the seats of that username for present/disconnected, and from the fixed position-1/board-a slot for the viewer's own confirmation — producing the same icon classes as before

#### Scenario: Flip and switch survive later renders
- **WHEN** the boards are flipped or switched, and the clocks then tick, a move lands, or a player bar re-renders
- **THEN** the `.info-wrap*` blocks keep the `style.gridArea` values the flip/switch handlers wrote, because no code patches the composed block vnode after the page's initial patch

#### Scenario: Single-board round page unaffected
- **WHEN** a non-bughouse round page renders its player bars
- **THEN** it calls `player(id, title, name, rating, level)` with neither of the new optional parameters, and the markup is byte-identical to before this change

