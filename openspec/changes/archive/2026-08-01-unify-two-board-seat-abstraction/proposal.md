## Why

`client/two-board/common/players.ts` and `client/two-board/seatsState.ts` each mix two different concerns — pure seat/player *abstraction* (what a seat/player *is*) and seat *configuration* (the concrete set of all four seats plus lookup/relation methods) — and they do it inconsistently with each other. `players.ts` defines `Seat`/`TwoBoardPlayer`/`Team` alongside the `TwoBoardSeats` configuration container (`.all` property); `seatsState.ts` defines the round-only `RoundSeat` abstraction alongside a second, round-only configuration container `SeatsState` (`.seats` property) that wraps `TwoBoardSeats` and re-implements its own parallel coordinate lookup (`seatAt`/`seatsOn` next to `byBoardAndColor`) instead of building on it. The round and analysis controllers end up going through two differently-shaped "all four seats" containers for what is conceptually the same lookup surface, and any new seat-relative logic has to decide which container's method set to extend.

## What Changes

- Split seat-related code into exactly two files by concern:
  - One file holding only seat/player **abstractions**: `TwoBoardPlayer`, the base `Seat` class, `Team` — no lookup or "all seats" logic.
  - One file holding the seat **configuration**: a single generic container abstraction (`SeatConfiguration<S extends Seat>`) providing every identification method needed by either page (coordinate lookup, viewer-relative lookup, spectator check, team lookup, partner/opponent/opponent's-partner relations, initial top-color placement), so both the base `Seat`-typed container (built by a `twoBoardSeats(model, viewer)` factory function) and a `RoundSeat`-typed configuration (`SeatsState`) share one implementation instead of two.
- Remove `SeatsState`'s duplicate coordinate-lookup methods (`seatAt`, `seatsOn`) in favor of the shared configuration container's lookup methods, keeping only genuinely round-only presentation/behavior (the DOM-rendering clock/clock-difference widgets, `setConnecting`, `getClock`, `setPresence`, `updateClocks`, the last-server-confirmed clock bookkeeping used for premove math) as round-specific code built on top of that container.
- No behavior change anywhere: viewer-relative lookup, relation lookup, team lookup, `initialTopColor` precedence, recorded-clock-time reads, and round's clock/clock-difference rendering must all produce identical results to today.

### New Capabilities
(none — this refactors existing behavior)

### Modified Capabilities
- `bughouse-client-controllers`: the "Single player-info abstraction for the four bughouse seats" requirement changes from describing `TwoBoardSeats` (`common/players.ts`) plus a separate, duplicating `SeatsState` (`seatsState.ts`) to describing one two-file split — a seat/player abstractions file and a generic seat-configuration file — with round-only presentation state built on top of the shared configuration rather than wrapping a second copy of its lookup logic.

## Impact

- `client/two-board/common/players.ts` — deleted; contents redistributed into the two files below.
- `client/two-board/common/seat.ts` (new) — `TwoBoardPlayer`, `Seat`, `Team`.
- `client/two-board/common/seatConfiguration.ts` (new) — `SeatConfiguration<S extends Seat>`, the `twoBoardSeats(model, viewer)` factory function, and the relocated `playerInfoData`/`clockTimeAt`.
- `client/two-board/seatsState.ts` — deleted; `RoundSeat` and `SeatsState` move into `round/`, unchanged in behavior.
- `client/two-board/round/roundSeat.ts` (new) — `RoundSeat`.
- `client/two-board/round/seatsState.ts` (new) — `SeatsState extends SeatConfiguration<RoundSeat>`.
- `client/two-board/twoBoardCtrl.ts`, `client/two-board/round/roundCtrl.ts`, `client/two-board/analysis/analysisClock.ts`, `client/two-board/analysis/movetimeChart.ts`, `client/two-board/common/gameInfo.ts` — import paths for `Seat`/`TwoBoardPlayer`/`Team`/`RoundSeat`/the configuration container change; `analysisClock.ts`'s `renderClocks` additionally passes a recorded step's `clocks`/`clocksB` tuple straight through instead of reconstructing it via a per-seat `clockTimeAt` loop (behaviorally identical, simpler).
- `tests/twoBoardPlayers.test.ts`, `tests/twoBoardAnalysisPgn.test.ts` and a new `tests/twoBoardRoundSeats.test.ts` — updated/added for the new file layout and container shape.

## Design History

An earlier pass also promoted "the clock time currently displayed for this seat" and "this seat's time difference vs. its counterpart" to shared mutable state on `Seat` (`clockTime`/`difference` fields), reasoning that both pages track a similar concept. This was reverted: nothing needs a *stored* mirror of these values — round's tick handler and `differenceOf`-equivalent math already worked fine as local variables (exactly as before this change), and analysis can always recompute the same values on demand from recorded step data when it needs them. Storing them added indirection with no consumer that couldn't already get the value more simply. See `design.md`'s Decisions for the fuller account, kept for anyone revisiting this later.
