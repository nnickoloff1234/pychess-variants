## 1. Abstractions file

- [x] 1.1 Create `client/two-board/common/seat.ts` with `TwoBoardPlayer`, `Seat`, `Team` moved verbatim from `client/two-board/common/players.ts`
- [x] 1.2 Verify `seat.ts` has no DOM imports, no `Step`/analysis-tree imports, and no "all four seats" lookup logic

## 2. Seat-configuration file

- [x] 2.1 Create `client/two-board/common/seatConfiguration.ts` with a generic `SeatConfiguration<S extends Seat>` class: constructor `(seats: [S, S, S, S], viewer: string)`, `all`, `teams` (built from the four seats, `Team` stays non-generic), `byBoardAndColor`, `seatsOn(board)`, `me`, `myColor`, `isSpectator`, `myTeam`, `teamOf`, `partnerOf`, `opponentOf`, `opponentsPartnerOf`, `initialTopColor` — moved from `TwoBoardSeats` in `players.ts`
- [x] 2.2 Move `clockTimeAt(step: Step, seat: Seat): number | undefined` here from `players.ts` as a standalone function (not a `Seat` method)
- [x] 2.3 In the same file, add a `twoBoardSeats(model, viewer): SeatConfiguration<Seat>` factory function, moving `playerInfoData` here (from `players.ts`) to build the four base `Seat`s and return `new SeatConfiguration([wA, bA, wB, bB], viewer)` — a factory function rather than a subclass (a class here would add no field/method over `SeatConfiguration<Seat>`), and no type alias either (`SeatConfiguration<RoundSeat>` gets no alias elsewhere, so `SeatConfiguration<Seat>` shouldn't either — the type is just written out at every use site; both of these were tried and reverted during review, see `design.md` Decision 2)
- [x] 2.4 Delete `client/two-board/common/players.ts`
- [x] 2.5 Update imports in `client/two-board/twoBoardCtrl.ts`, `client/two-board/analysis/analysisClock.ts`, `client/two-board/analysis/movetimeChart.ts`, `client/two-board/common/gameInfo.ts` (missed in the original task list, also imported `players.ts`) to pull from `common/seat.ts`/`common/seatConfiguration.ts` instead
- [x] 2.6 Update `twoBoardCtrl.ts`'s call sites from `new TwoBoardSeats(model, viewer)` to `twoBoardSeats(model, viewer)` (no `new`); same in `gameInfo.ts` and the test files; `TwoBoardController.seats`'s type is `SeatConfiguration<Seat>` directly

## 3. Round-only seat files

- [x] 3.1 Create `client/two-board/round/roundSeat.ts` with `RoundSeat` moved verbatim from `client/two-board/seatsState.ts`, importing `Seat` from `common/seat.ts` — no field renames, since there's nothing on the base `Seat` for `difference`/`clocktime` to collide with
- [x] 3.2 Create `client/two-board/round/seatsState.ts` with `SeatsState extends SeatConfiguration<RoundSeat>`: constructor `(ctrl: RoundControllerBughouse)` reads `ctrl.seats.all`/`ctrl.seats.initialTopColor(...)` (the base container) to build each `RoundSeat` with its screen position, then calls `super([wA, bA, wB, bB], ctrl.username)`
- [x] 3.3 Keep the tick-handler wiring, `setConnecting`, `getClock`, `setPresence`, `updateClocks` exactly as before (byte-for-byte the same computation) — only the relation lookup (`this.opponentsPartnerOf(seat)`, now resolved directly on the `RoundSeat`-typed container) changed; drop the old `seatAt`/`seatsOn` methods (now inherited)
- [x] 3.4 Delete `client/two-board/seatsState.ts`
- [x] 3.5 Update the import in `client/two-board/round/roundCtrl.ts` to the new `round/seatsState.ts` path (no change needed in `client/two-board/socket/sockets.ts`, which only accessed `ctrl.seatsState` through the `RoundControllerBughouse` type, no direct import)

## 4. Call-site updates for unified naming

- [x] 4.1 In `roundCtrl.ts`, replace `this.seatsState.seatAt(...)` with `this.seatsState.byBoardAndColor(...)` and `this.seatsState.seats` with `this.seatsState.all` at every call site
- [x] 4.2 Grep the client tree for any other remaining `seatsState.seats`/`.seatAt(` (pre-refactor names) and update — none found beyond the test files (handled in group 5)

## 5. Test updates

- [x] 5.1 Update `tests/twoBoardPlayers.test.ts` and `tests/twoBoardAnalysisPgn.test.ts` imports to `common/seatConfiguration.ts` and `new TwoBoardSeats(...)` → `twoBoardSeats(...)`
- [x] 5.2 Add `tests/twoBoardRoundSeats.test.ts`: `SeatsState` construction from a minimal ctrl stub, relation lookups resolving directly to `RoundSeat` (`opponentsPartnerOf` involutive on the round-typed container), seat placement/position, the tick handler's clock-difference rendering (invoking `Clock.tickCallbacks[0]` directly and asserting the rendered `.clock-difference` DOM text, rather than any stored state field), and `setConnecting`/`getClock`/`setPresence`/`updateClocks` round-only behavior (including that `updateClocks` writes `clocktime`, and that a started seat's clock fires one synchronous tick via `Clock.start()`)

## 6. Verification

- [x] 6.1 Confirm by grep that no file still references `common/players`, the top-level `client/two-board/seatsState.ts`, or a stale `.seatAt(`
- [x] 6.2 `yarn typecheck`, `yarn test`, lint pass (34/34 suites, 179/179 tests, 0 lint issues)
- [x] 6.3 Browser smoke via a real two-browser Playwright run (`scratchpad/smoke_two_board_seats.py`, modeled on `tests/test_bughouse_lobby_flow.py`'s seek/accept flow — the claude-in-chrome extension can't reach this container's dev server, so this ran in-process against `aiohttp_server`+mongomock instead): round page — both seats' names render, all 4 clock widgets tick, all 4 clock-difference indicators render ("0", correct pre-move value), flip/switch don't crash, no page errors. Analysis page (via `?ply=`, same in-progress game) — reached, PGN panel renders, no page errors; landed on ply 0 since the scripted flow never played a move, so the recorded-step-driven analysis clock render wasn't exercised in-browser (only unit-tested)

## Design history (superseded work, kept for context)

An earlier pass introduced shared `clockTime`/`difference` state on `Seat` plus `SeatConfiguration.setClockTimes`/`differenceOf` methods, reasoning that round and analysis both needed a common "current time for this seat" concept. Review established this added indirection with no actual consumer that couldn't already get the value more simply (round already computed everything locally; analysis can recompute from `clockTimeAt` on demand), and that round's version of it was actively wrong (briefly feeding the shared state from server-relayed clock values, when round's ground truth is only ever the locally-ticking clock). All of it was removed: `Seat` has no `clockTime`/`difference` fields, `SeatConfiguration` has no `setClockTimes`/`differenceOf`, `RoundSeat`/`SeatsState`'s clock/difference code is unchanged from before this refactor, and `analysisClock.ts`'s `renderClocks` was simplified to pass a recorded step's `clocks`/`clocksB` tuple straight through (algebraically identical to the previous per-seat `clockTimeAt` reconstruction, just simpler). See `design.md` Decision 5 for the full reasoning.
