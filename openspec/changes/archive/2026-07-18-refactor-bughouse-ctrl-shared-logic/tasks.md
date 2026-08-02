# Tasks: refactor-bughouse-ctrl-shared-logic

## 1. Create the shared module

- [x] 1.1 Create `client/bug/twoBoardCtrl.ts` with `abstract class TwoBoardController`: shared fields (`boardA`, `boardB`, `model`, `gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `home`, `steps`, `ply`, `plyA`, `plyB`, `vmovelist`, `moveControls`, `settings`) and abstract members (`sendMove(board, move)`, `goPly(ply)`, `flipBoards`, `switchBoards`)
- [x] 1.2 Implement the base constructor: parse shared model fields, construct `boardA`/`boardB` from the six DOM elements, wire `partnerCC`/`parent`, call `createMovelistButtons(this)` and set `vmovelist` (verify against both current constructors that only truly common steps move; preserve subclass ordering for the rest)
- [x] 1.3 Move `swap`, `switchBoards`, `initBoardSettings` from `roundCtrl.bug.ts` into `twoBoardCtrl.ts`; retype `switchBoards(ctrl: TwoBoardController)`
- [x] 1.4 Add shared protected helpers: `stampStepPlys(step, idx)` (plyA/plyB bookkeeping used by round `updateSteps` and analysis `onMsgBoard`) and `stepCapture(step, board)` (the duplicated "960 castling is not capture" detection)

## 2. Convert RoundControllerBughouse

- [x] 2.1 Make `RoundControllerBughouse extends TwoBoardController`; delete fields/constructor code now owned by the base; keep round-only setup (playersState, clocks/flag callbacks, game controls, chat view, socket-last ordering, Mousetrap bindings) in place and order
- [x] 2.2 Rewrite `updateSteps` to use `stampStepPlys`, keeping the chat-marker emissions (ply 0, ply 4, game end) inline in the round subclass
- [x] 2.3 Use `stepCapture` in round `goPly`; keep round-specific movable/dests gating and clock behavior untouched
- [x] 2.4 Update imports of `swap`/`switchBoards`/`initBoardSettings` (`analysisCtrl.bug.ts`, any others) to `twoBoardCtrl.ts`; remove the `AnalysisControllerBughouse` import from `roundCtrl.bug.ts`

## 3. Convert AnalysisControllerBughouse

- [x] 3.1 Make `AnalysisControllerBughouse extends TwoBoardController`; delete duplicated fields/constructor code; keep analysis-only setup (ffish load, tree init, engine/pv DOM, tabs, `onMsgBoard(model.board)` call position) in place and order
- [x] 3.2 Rewrite the step loop in analysis `onMsgBoard` to use `stampStepPlys`, keeping eval stamping (`step.analysis` → `ceval`/`scoreStr`) inline in the subclass
- [x] 3.3 Use `stepCapture` in both analysis `goPly` paths (tree and legacy); leave tree/engine/`plyVari` logic untouched

## 4. Retype consumers

- [x] 4.1 `gameCtrl.bug.ts`: change `parent` to `TwoBoardController`; drop now-unneeded imports
- [x] 4.2 `movelist.bug.ts`: replace the `AnalysisControllerBughouse | RoundControllerBughouse` union with `TwoBoardController` where only shared members are used; keep `instanceof RoundControllerBughouse` narrowing in `teamsOf` and the `TreeCtrl` cast for analysis-only members
- [x] 4.3 Sweep remaining `client/bug/` importers (`round.bug.ts`, `analysis.bug.ts`, `movetimeChart.bug.ts`, `analysisClock.bug.ts`, `playersState.bug.ts`, `roundCtrl.bug.socket.ts`) for type/import fallout
- [x] 4.4 Verify no import cycle remains among `twoBoardCtrl.ts`, `roundCtrl.bug.ts`, `analysisCtrl.bug.ts`, `gameCtrl.bug.ts` (e.g. `npx madge --circular client/bug` or manual import audit)

## 5. Verify

- [x] 5.1 `yarn typecheck` and `yarn test` pass; `yarn dev` builds clean
- [x] 5.2 Smoke bughouse round page (server with `-a`): moves on both boards, clocks, sounds, movelist scroll, chat markers, game-over buttons
- [x] 5.3 Smoke bughouse analysis page: ply scrolling (tree and arrows), engine toggle on both boards, switch/flip boards, PGN/FEN output unchanged
