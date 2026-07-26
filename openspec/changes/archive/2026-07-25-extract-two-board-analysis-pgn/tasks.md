# Tasks — extract-two-board-analysis-pgn

## 1. Extract the module

- [x] 1.1 Create `client/two-board/analysis/pgn.ts` with `getPgn(ctrl)`, `renderFENAndPGN(ctrl, pgn)`, and `updateFENAndPGN(ctrl)` (former `checkStatus` body), moving the header builder and legacy mainline move-text loop as module-private functions; controller type via `import type`
- [x] 1.2 Capture the current PGN output for a sample game (tree and legacy paths) before switching call sites, for byte-identity comparison

## 2. Slim the controller

- [x] 2.1 Delete `pgnText`, `getPgn`, `renderFENAndPGN`, `checkStatus` from `analysisCtrl.ts`; update all call sites (constructor initial render, `onMsgBoard`, both `goPly` branches) to the module functions; `vpgn`/`pgn` fields stay on the controller
- [x] 2.2 Verify no PGN string assembly remains in `analysisCtrl.ts` (grep for tag literals and move-counter math) and that `copyTreeLinePgn` still delegates to `analysisTreeTwoBoards.ts` renderers unchanged

## 3. Tests and verification

- [x] 3.1 New jest spec for the module's pure output: header tags/order from a real `TwoBoardSeats`, legacy mainline move text (`1A.`/`1B.` counters, `sanSAN ?? san` fallback), stub controller, no DOM
- [x] 3.2 `yarn typecheck`, `yarn test`, and lint pass; compare captured PGN output byte-for-byte
- [x] 3.3 Browser smoke (existing scratchpad harness): FEN & PGN tab renders with correct tags on a live game's analysis page; no console/page errors
