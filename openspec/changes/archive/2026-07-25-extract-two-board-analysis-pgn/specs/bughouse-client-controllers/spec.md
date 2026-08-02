# bughouse-client-controllers — delta for extract-two-board-analysis-pgn

## ADDED Requirements

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
