## MODIFIED Requirements

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

#### Scenario: One seat container serves the whole round page
- **WHEN** round code needs a seat by coordinates, by relation, or by viewer position — including for clock lookups
- **THEN** it resolves it on `ctrl.seats`, no second `SeatConfiguration` instance exists on the page, and the seat it gets back is the same object identity the analysis-shared container holds

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

## ADDED Requirements

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
