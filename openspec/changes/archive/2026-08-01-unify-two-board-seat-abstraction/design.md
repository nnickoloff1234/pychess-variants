## Context

Today seat-related code is split across two files that each mix two concerns:

- `client/two-board/common/players.ts`: the pure abstractions (`TwoBoardPlayer`, `Seat`, `Team`, `clockTimeAt`) **and** the "all four seats" configuration container `TwoBoardSeats` (property `.all`), including the page-model parsing helper `playerInfoData` that builds seats from `PyChessModel`.
- `client/two-board/seatsState.ts`: the round-only `RoundSeat` abstraction (`Seat` subclass adding clock/clock-difference/player-bar/position) **and** a second, round-only configuration container `SeatsState` (property `.seats`) that wraps a `TwoBoardSeats` instance and re-implements its own coordinate lookup (`seatAt`, `seatsOn`) instead of sharing `byBoardAndColor`.

Both containers answer the same questions (coordinate lookup, viewer-relative lookup, team/relation lookup, initial orientation) but are two independent implementations with different property names and, in `SeatsState`'s case, an extra layer of indirection through the base container just to resolve relations before re-looking-up in its own array.

## Goals / Non-Goals

**Goals:**
- One file defines seat/player abstractions only: `TwoBoardPlayer`, `Seat` (base), `Team`.
- One generic, reusable seat-configuration abstraction provides every identification method (coordinate lookup, viewer-relative lookup, spectator check, team lookup, partner/opponent/opponent's-partner relations, initial top-color placement) for *any* `Seat` subtype, so round and analysis share one implementation instead of two.
- Round-only presentation (`RoundSeat`'s DOM-rendering clock/clock-difference widgets, and `SeatsState`'s connecting/presence/update-clocks behavior) is built on top of the shared abstraction/configuration rather than duplicating lookup logic — but is otherwise **behaviorally unchanged** from today.
- No behavior change anywhere.

**Non-Goals:**
- No shared `clockTime`/`difference` state on `Seat` (explored and reverted — see Decisions).
- No new analysis-only `Seat` subclass — analysis has no per-seat presentation state today and none is being added; it continues to use the base `Seat`/the base `SeatConfiguration<Seat>` container directly.
- No change to `Team`'s shape or to team composition rules (still exactly `[Seat, Seat]`, still team 1 = white-A+black-B / team 2 = black-A+white-B).
- No change to `client/clock.ts`'s `Clock` (the site-wide ticking/DOM class used well beyond bughouse) — it remains as-is.

## Decisions

1. **New file `client/two-board/common/seat.ts`** holds only the abstractions: `TwoBoardPlayer`, `Seat`, `Team`. No lookup/"all seats" logic, no DOM imports, no `Step` import.

2. **New file `client/two-board/common/seatConfiguration.ts`** holds a generic container `SeatConfiguration<S extends Seat>` with the full identification surface used by either page: `all: [S, S, S, S]`, `teams: [Team, Team]`, `byBoardAndColor`, `seatsOn(board)` (new — generalizes `SeatsState.seatsOn`), `me`, `myColor`, `isSpectator`, `myTeam`, `teamOf`, `partnerOf`, `opponentOf`, `opponentsPartnerOf`, `initialTopColor`. Its constructor takes the four already-built seats (in `[wA, bA, wB, bB]` order) and the viewer username — it does not know how to build seats from a page model, so it works for any `Seat` subtype.
   - `Team` stays **non-generic** (`[Seat, Seat]`): nothing needs a team member's `RoundSeat`-only fields accessed *through* a `Team` — round code that needs those looks the seat up again by coordinates on its own `RoundSeat`-typed container.
   - The base seat-identity container (informally "TwoBoardSeats") is built by a plain function, `twoBoardSeats(model, viewer): SeatConfiguration<Seat>` — not a subclass and not a type alias for `SeatConfiguration<Seat>`. Two intermediate designs were tried and rejected here: a `class TwoBoardSeats extends SeatConfiguration<Seat>` (added no field/method of its own — a factory function is what a different-construction-signature-only need calls for, not inheritance), then `type TwoBoardSeats = SeatConfiguration<Seat>` plus the factory (still asymmetric for no benefit, since `SeatConfiguration<RoundSeat>` gets no alias). The settled shape: nothing named `TwoBoardSeats` exists in the code at all, only in prose describing the concept.
   - `clockTimeAt(step: Step, seat: Seat): number | undefined` (the recorded-time-from-a-step lookup) moves here too, as a standalone function — **not** a method on `Seat` — so that the abstractions file never imports `Step`. It's used by `movetimeChart.ts`'s per-seat lookups (walking an arbitrary mover seat one at a time, where the board isn't known ahead of time at the call site).

3. **`RoundSeat` moves to `client/two-board/round/roundSeat.ts`**, next to the controller that's the only consumer of its DOM/clock behavior — it still `extends Seat` from `common/seat.ts`, unchanged in shape: `clock: Clock`, `difference: ClockDifference`, `vplayer: VNode`, `clocktime: number`.

4. **`seatsState.ts` moves to `client/two-board/round/seatsState.ts`** and `SeatsState` extends the shared container directly: `class SeatsState extends SeatConfiguration<RoundSeat>`, dropping the duplicate `seatAt`/`seatsOn` methods (inherited `byBoardAndColor`/`seatsOn` replace them) and the property rename `seats` → inherited `all`. Construction still reads `ctrl.seats.all`/`ctrl.seats.initialTopColor(...)` (the base container) once, to get each seat's coordinates/identity and initial screen position before wrapping each in a `RoundSeat`, then calls `super([wA, bA, wB, bB], ctrl.username)`. The tick-handler wiring, `setConnecting`, `getClock`, `setPresence`, and `updateClocks` are otherwise **byte-for-byte the same logic as before this change** — only the relation lookup (`this.opponentsPartnerOf(seat)`, now resolved directly on the `RoundSeat`-typed container instead of through a wrapped base `TwoBoardSeats` plus a second re-lookup) changed.

5. **Explored and reverted: shared `clockTime`/`difference` state on `Seat`.** The idea was to promote "the clock time currently displayed for this seat" and "this seat's time difference vs. its counterpart" to mutable fields on `Seat`, common to round and analysis, updated differently per page (round: live ticking; analysis: per-ply recompute) but stored/computed identically — plus a `SeatConfiguration.setClockTimes(board, clocks)` write method and a `differenceOf(seat)` computation method. This went through several iterations (a version where round's `updateClocks` also fed the shared state from server-relayed clock values — wrong, reverted; a version where only analysis fed it, round left alone) before being removed entirely. The reasons:
   - **Nothing needs the stored value.** The *only* consumer of `Seat.clockTime` was `differenceOf`, and `differenceOf` was only ever called from inside the same tick handler that had just freshened both seats' `clockTime` moments earlier — so the field never actually saved a real computation or avoided any staleness that wouldn't otherwise be a problem. Round's original code already computed everything it needed as local variables (`diff`, `otherMillis` via a `liveTime()` helper) with no field needed at all.
   - **Round's ground truth is never server-relayed values.** A server board message is a resync point for `Clock`'s internal state and the round-only `clocktime` premove bookkeeping — never treated as "the current time" for display purposes, which is always the locally-ticking `Clock`. Feeding a shared `clockTime` field from `updateClocks`'s `msgClocks` would have made that field's *meaning* silently drift between "what the client clock says" (most of the time) and "what the server said" (briefly after each message) — establishing the wrong precedent for a field whose entire point was to mean "what's currently shown."
   - **Analysis doesn't need a stored mirror either.** `clockTimeAt(step, seat)` is already a cheap, pure, always-fresh way to get a value on demand; there's no staleness risk to guard against by caching it in a field, so the field bought nothing there either.
   - Net effect: `Seat` has no `clockTime`/`difference` fields, `SeatConfiguration` has no `setClockTimes`/`differenceOf` methods, `RoundSeat`'s fields keep their original names (no `clocktime`/`clockTime` or `difference`/`differenceView` collision to avoid, since there's nothing on the base `Seat` to collide with), and `analysisClock.ts`'s `renderClocks` passes a recorded step's `clocks`/`clocksB` tuple straight to `renderClocksCC` rather than reconstructing the same array via a per-seat `clockTimeAt` loop — algebraically identical output, less code.

## Risks / Trade-offs

- [Risk] Generic class (`SeatConfiguration<S extends Seat>`) is a new pattern in this codebase's client code → Mitigation: the generic parameter is used exactly the way `Seat`/`RoundSeat` already relate (subtype), and all four methods that return `S` (`byBoardAndColor`, `me`, `partnerOf`, `opponentOf`, `opponentsPartnerOf`) are directly unit-testable against both instantiations.
- [Risk] Moving `RoundSeat`/`SeatsState` into `round/` changes several import paths → Mitigation: only two files import `seatsState.ts` today (`roundCtrl.ts`, `socket/sockets.ts` — the latter turned out not to need an import change at all, since it only accessed `ctrl.seatsState` through the `RoundControllerBughouse` type) and the compiler surfaces every stale import; `yarn typecheck` is part of the verification gate.
- [Trade-off] `SeatsState` no longer independently owns its lookup implementation, so any future round-only lookup override would need a documented reason to diverge from the shared container rather than just editing `SeatsState` in isolation — acceptable, since divergence was exactly the problem being fixed.

## Migration Plan

1. Create `common/seat.ts` with `TwoBoardPlayer`/`Seat`/`Team` moved from `players.ts`.
2. Create `common/seatConfiguration.ts` with `SeatConfiguration<S>`, the `twoBoardSeats(model, viewer)` factory function, and the relocated `playerInfoData`/`clockTimeAt`; delete `players.ts`.
3. Update the `players.ts` import sites (`twoBoardCtrl.ts`, `analysisClock.ts`, `movetimeChart.ts`, `gameInfo.ts`) and the test files to import from the two new modules.
4. Create `round/roundSeat.ts` with `RoundSeat` moved from `seatsState.ts`, importing `Seat` from `common/seat.ts`, unchanged in shape.
5. Create `round/seatsState.ts` with `SeatsState extends SeatConfiguration<RoundSeat>`, built from `ctrl.seats.all`; delete the old `two-board/seatsState.ts`.
6. Update `roundCtrl.ts`'s import path and its `seatAt`/`seats` call sites to `byBoardAndColor`/`all`.
7. Update the test files' import paths; add `tests/twoBoardRoundSeats.test.ts` for `SeatsState`'s inherited `SeatConfiguration<RoundSeat>` behavior (coordinate lookup, relations resolving directly to `RoundSeat` with no second lookup) and its tick-handler/`updateClocks` behavior.
8. `yarn typecheck && yarn test`, lint, then a browser smoke pass (round page: clocks/difference/presence/premove/orientation; analysis page: clocks/movetime chart/PGN header) per the spec's existing behavior-parity scenarios.

## Open Questions

- None outstanding. If review surfaces a preference to keep `SeatsState`'s current top-level `two-board/` location instead of moving it into `round/`, that's a low-risk, easily-reverted deviation from step 5 alone.
