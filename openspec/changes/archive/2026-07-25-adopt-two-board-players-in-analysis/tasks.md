# Tasks — adopt-two-board-players-in-analysis

## 1. Extend the TwoBoardPlayers/Team vocabulary

- [x] 1.1 Add optional `format` parameter to `Team.name()` in `client/two-board/common/players.ts` (default identity) and remove the adoption TODO comment
- [x] 1.2 Add `TwoBoardPlayers.teamOf(player): Team` (identity lookup over `teams`)
- [x] 1.3 Move the top-color computation from the `SeatsState` constructor into `TwoBoardPlayers.initialTopColor(board)` and make `SeatsState` consume it (seat position 0/1 mapping stays in `SeatsState`)
- [x] 1.4 Add free function `clockTimeAt(step, player)` exported from `players.ts` (selects `step.clocks`/`step.clocksB` by the player's board, indexes by the player's color; undefined-safe for steps without clocks)
- [x] 1.5 Extend the existing jest tests for `players.ts`: `name()`/`name(displayUsername)` output, `teamOf` for all four seats, `initialTopColor` for spectator, participant, and simul (same username on both boards) viewers, and `clockTimeAt` for both boards/colors plus missing-clocks steps

## 2. Adopt in analysis-side consumers

- [x] 2.1 `analysisCtrl.ts`: extract a single private PGN-header helper reading names via `players.byBoardAndColor(...)`; both `getPgn()` branches use it; verify output is byte-identical for a sample game
- [x] 2.2 `analysisCtrl.ts`: delete the dead `embed` field (constructor assignment and declaration; `checkStatus` keeps reading `this.model['embed']`)
- [x] 2.3 `movetimeChart.ts`: derive the mover's team via `players.byBoardAndColor(...)` + `teamOf(...).teamNumber`, removing the inlined pairing rule; name the four team series from `Team.name()`
- [x] 2.4 `movetimeChart.ts` + `analysisClock.ts`: read recorded times via `clockTimeAt(step, player)` (mover time and ply-0 bookkeeping in the chart; per-board `[white, black]` pairs in `renderClocks`), removing all hand-indexing of `step.clocks`/`step.clocksB`; verify chart values and rendered clocks are unchanged
- [x] 2.5 `common/movelist.ts`: replace the three team-name concatenation sites with `team.name(displayUsername)` / `team.name()` as appropriate
- [x] 2.6 `common/gameInfo.ts`: construct `TwoBoardPlayers` from `(model, model.username)`, change `playerInfo` to take a `TwoBoardPlayer`, and build the two rows by seat lookup preserving the exact current order and icons (row 2 renders white-B before black-A)

## 3. Viewer-oriented analysis boards

- [x] 3.1 `analysisCtrl.ts`: set both boards' initial orientation from `opposite(players.initialTopColor(board))`, replacing the hardcoded `boardB` `'black'`; confirm spectator and plain-analysis-board orientations are unchanged
- [x] 3.2 Check `tests/test_gui.py` / `tests/test_e2e.py` for bughouse-analysis orientation assumptions and adjust if any

## 4. Seat-centric restructure (user-directed)

- [x] 4.1 Split `Seat` (boardName, color, player) from `TwoBoardPlayer` (identity only) in `players.ts`; rename container to `TwoBoardSeats`; relations and `teamOf` become seat-in/seat-out, coordinate-resolved; `clockTimeAt(step, seat)`
- [x] 4.2 `RoundSeat` extends the shared `Seat`; `SeatsState` builds RoundSeats from `seats.all` and resolves the clock-difference counterpart via seat relations + `seatAt(board, color)`
- [x] 4.3 Controllers hold `seats: TwoBoardSeats` (was `players`); all consumers (roundCtrl, movelist, movetimeChart, analysisClock, analysisCtrl, gameInfo) access players through seats
- [x] 4.4 Update jest tests to the seat-centric API; drop cross-team viewer tests (invariant: one person never on both teams; simul = both seats of one team)

## 5. Verification

- [x] 5.1 `yarn typecheck` and `yarn test` pass
- [x] 5.2 Manual/Playwright smoke on the analysis page (server with `-a`): open a finished bughouse game as a participant (viewer-oriented boards) and as a spectator (unchanged), scroll plies, flip/switch boards, check PGN tab and movetime chart tooltips
- [x] 5.3 Round-page smoke: clocks, player bars, and clock-difference indicators unchanged (SeatsState now sourcing `initialTopColor` from the container)
