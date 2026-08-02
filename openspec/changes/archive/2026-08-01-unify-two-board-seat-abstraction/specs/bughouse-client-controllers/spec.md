## MODIFIED Requirements

### Requirement: Single player-info abstraction for the four bughouse seats
The bughouse client SHALL represent the four seats (white/black × board a/b) as `Seat` objects (`client/two-board/common/seat.ts`), each holding its board+color coordinates (`boardName`, `color`) and the `player: TwoBoardPlayer` sitting there. `TwoBoardPlayer` SHALL carry pure person identity only (`username`, `title`, `rating`) — no seat coordinates; there is one player instance per seat (in simul mode the same username appears in two seats as two instances). One person can never occupy seats of both teams; in simul mode one person occupies both seats of the same team. `common/seat.ts` SHALL contain only these abstractions (`TwoBoardPlayer`, `Seat`, `Team`) — no "all four seats" lookup logic, no DOM-touching code, and no dependency on step/analysis-tree types.

Seat-relative logic SHALL be keyed by seat coordinates, and per-player questions SHALL identify the player's seat(s) first and then use the seat logic. A single generic container, `SeatConfiguration<S extends Seat>` (`client/two-board/common/seatConfiguration.ts`), SHALL provide every seat-identification method needed by either page, for any `Seat` subtype: coordinate lookup (`byBoardAndColor(board, color): S`), board-scoped lookup (`seatsOn(board): S[]`), viewer-relative accessors (`me(board): S | undefined`, `myColor(board)`, `isSpectator()`, `myTeam()`), seat relations (`partnerOf`, `opponentOf`, `opponentsPartnerOf` — `S` in, `S` out, computed from coordinates), team lookup (`teamOf(seat)` — coordinate-resolved, so any `Seat`-shaped input works), and the viewer-relative initial screen placement `initialTopColor(board)` — the color rendered at the top of that board for this viewer, defined by seat precedence: (1) if the viewer occupies a seat on the given board, the opposite of that seat's color; (2) otherwise, if the viewer occupies a seat on the other board, the opposite of their partner's color on the given board (equivalently, the viewer's own color on the other board); (3) otherwise (spectator) the canonical orientations: black on top of board a, white on top of board b. `SeatConfiguration`'s constructor SHALL take the four already-built seats (of type `S`) and the viewer username only — it SHALL NOT itself know how to build seats from the page model or from step data, so the same implementation serves any seat type.

The base seat-identity container (informally "TwoBoardSeats") SHALL be built by a factory function, `twoBoardSeats(model, viewer): SeatConfiguration<Seat>` (same file as `SeatConfiguration`) — not a subclass and not a type alias, since `SeatConfiguration<Seat>` needs no name of its own any more than `SeatConfiguration<RoundSeat>` does — constructed from the page model and viewer username only (no DOM, no controller references); it SHALL build the four base `Seat`s via `playerInfoData` (a page-model-parsing helper local to this file) and pass them to `SeatConfiguration`'s constructor. The two-board controllers SHALL hold this container as `seats: SeatConfiguration<Seat>`, and any logic that accesses players MUST go through the seats.

`teams: [Team, Team]` SHALL hold `Team` objects composed of their two `Seat`s, a `teamNumber` label ('1'/'2'), and a `name(format?)` method returning both usernames joined with '+', each passed through the optional formatter (default: identity); `Team` remains non-generic (always holds base `Seat`-typed members, regardless of which `SeatConfiguration<S>` produced it), since no consumer needs a team member's subtype-specific fields accessed through the team itself. A pure recorded-clock-time lookup, `clockTimeAt(step, seat): number | undefined`, SHALL be exported from `common/seatConfiguration.ts` (not `common/seat.ts`) as a standalone function — not a method on `Seat` — taking both a step and a seat and returning the seat's recorded time from the step's per-board clock arrays; keeping it outside `Seat` means the abstractions file never imports step/analysis-tree types. It is used for arbitrary single-seat lookups (e.g. the movetime chart, walking a mover seat one at a time without knowing its board ahead of time at the call site).

Player-identity and team questions in the two-board client modules — including analysis PGN header tags, the movetime chart's team series, the movelist's team-name lines, and the game-info team rows — MUST be answered through these accessors rather than ad-hoc color/board arithmetic, raw model player keys, or parallel scalar fields.

Live-clock rendering (the ticking DOM widget, flagging) and the DOM rendering of a difference value remain round-only, unchanged in behavior from before this refactor. `RoundSeat` (`client/two-board/round/roundSeat.ts`) SHALL extend the shared `Seat` with its round-only presentation — a ticking `clock: Clock`, a `difference: ClockDifference` rendering widget, a player bar, screen position, and a `clocktime` bookkeeping field (the last server-confirmed clock value, used only for premove clock-plus-increment math) — and MUST NOT be introduced on the analysis page. `SeatsState` (`client/two-board/round/seatsState.ts`) SHALL extend `SeatConfiguration<RoundSeat>` directly — inheriting `byBoardAndColor`, `seatsOn`, and every relation/team/viewer-relative accessor rather than re-implementing a parallel lookup — and SHALL expose the four round seats as `all` (the same property name the base container uses), keeping only round-only presentation behavior of its own: per-seat clock construction, the tick callback (computing the clock-difference display from the ticking seat's live time and its `opponentsPartnerOf` counterpart's live time, exactly as before this refactor), `setConnecting`, `getClock`, `setPresence`, and `updateClocks`.

#### Scenario: Viewer-relative lookup
- **WHEN** round-play logic needs the viewer's seat or color on a board (flag callbacks, movable gating, premove/myMove checks, orientation)
- **THEN** it obtains it from `seats.myColor(board)`/`seats.me(board)` and behaves identically to the previous `myColor`/`partnerColor` map lookups, including the simul case where one username occupies seats on both boards (two separate `Seat` instances)

#### Scenario: Relation lookup
- **WHEN** logic needs the seat of a partner, opponent, or opponent's partner (e.g. the clock-difference counterpart: same color, other board)
- **THEN** it identifies the starting seat and the relation accessors return the correct related seat, of the same type as the container (`Seat` from the base container, `RoundSeat` from `SeatsState`), per bughouse team structure (team 1 = white-A + black-B, team 2 = black-A + white-B)

#### Scenario: Round seat configuration shares the identification container
- **WHEN** `SeatsState` resolves a relation (e.g. the clock-difference counterpart via `opponentsPartnerOf`) or a coordinate lookup (`byBoardAndColor`/`seatsOn`) for round-only presentation
- **THEN** it uses its own inherited `SeatConfiguration<RoundSeat>` methods directly — the already-`RoundSeat`-typed result requires no second lookup through the base container — and produces the same seat as the pre-refactor two-step lookup (resolve via the base container, then re-find in `SeatsState`'s own array)

#### Scenario: Round's clock-difference computation is unchanged
- **WHEN** any of the four round clocks ticks
- **THEN** the tick handler resolves the `opponentsPartnerOf` counterpart via `SeatsState`'s inherited relation accessor, computes the live time of both the ticking seat and its counterpart, and renders the difference through each seat's own `difference: ClockDifference` widget — the same computation as before this refactor, with no intermediate stored state on either seat

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
- **THEN** each row's players are obtained from the base seat container by seat lookup (row 1: white-A + black-B; row 2: white-B + black-A) and the rendered markup (order, icons, links, ratings) is identical to before

#### Scenario: Recorded clock times via the seat accessor
- **WHEN** the movetime chart computes per-move times for a specific mover seat (`movetimeChart.ts`)
- **THEN** each recorded time is obtained via `clockTimeAt(step, seat)` for the relevant seat, no call site selects `step.clocks` vs `step.clocksB` or indexes by color itself, and the chart values are identical to before

#### Scenario: Analysis clock rendering reads a recorded step's clock pair directly
- **WHEN** the analysis page renders the per-position clocks (`analysisClock.ts`) for a board whose recorded step carries a `clocks`/`clocksB` pair
- **THEN** it passes that pair straight to the clock-rendering function (no per-seat reconstruction via `clockTimeAt`, since the pair is already in the exact shape needed) and the rendered clocks are identical to before

#### Scenario: Seat placement math defined once
- **WHEN** the round page computes which color sits at the top of each board for the current viewer (`SeatsState`'s construction, before its own `RoundSeat`s exist) or the analysis page computes initial orientations
- **THEN** both read `initialTopColor(board)` from the shared base container (since `SeatsState` needs it before its own seats are built); the computation exists only in `SeatConfiguration` and follows the seat-precedence definition (own seat on the board → its opposite color on top; else seat on the other board → the partner's opposite color on top; else the canonical spectator orientations)

#### Scenario: Unit-tested pure logic
- **WHEN** the jest suite runs
- **THEN** `SeatConfiguration`/the base container's accessor semantics (including `Seat` composition, `Team` composition, `teamNumber`, `name()`/`name(format)` output, `teamOf` for all four seats, `initialTopColor` for spectator/participant/simul viewers, `clockTimeAt` for both boards and colors including steps with missing clock arrays, and username equivalence with the legacy `teamFirst`/`teamSecond` tuples) are covered by unit tests with no DOM required, and `SeatsState`'s inherited `SeatConfiguration<RoundSeat>` behavior (coordinate lookup, relations) plus its tick-driven clock-difference rendering and `updateClocks` bookkeeping are covered without duplicating those cases
