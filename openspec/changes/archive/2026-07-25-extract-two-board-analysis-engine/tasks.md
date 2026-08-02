# Tasks — extract-two-board-analysis-engine

## 1. Extract the module

- [x] 1.1 Create `client/two-board/analysis/engine.ts` with an `EngineController` class (back-reference to the analysis controller via `import type`): move the FSF wiring (`fsfPostMessage`, `loadVariantsIntoFsfEngine`, `installFsfPromptQueue`, `restoreFsfPrompt`), `onFSFline`, `engineGo`/`engineStop`/`onMoreDepth`, PV rendering (`pvboxIni`, `pvView`, `clearPvlines`, `drawEval`, `makePvMove`), `renderInput`, `onMsgAnalysis`, `notation2ffishjs`, the module constants (`EVAL_REGEX`, `maxDepth`, `maxThreads`, `emptySan`), and the state fields listed in design decision 2
- [x] 1.2 Export pure `buildScoreStr(color, ceval)` and `parseUciInfoLine(line)`; `onFSFline` and `onMsgBoard` compose them

## 2. Slim the controller and rewire

- [x] 2.1 Remove the moved fields/methods from `analysisCtrl.ts`; add `engine: EngineController` and delegate at all call sites (constructor setup incl. ffish load and checkbox/vnode init, `goPly` both branches, `sendMove`, `onMsgBoard` score stamping + info reset)
- [x] 2.2 Update `analysis.ts`: `window['onFSFline'] = ctrl.engine.onFSFline`
- [x] 2.3 Verify by grep that no moved field/method names or UCI strings remain in `analysisCtrl.ts` and that no other module referenced the moved members

## 3. Tests and verification

- [x] 3.1 New jest spec: `buildScoreStr` (mate/cp, sign per color, missing score) and `parseUciInfoLine` (full info line, multipv, mate, bounds, non-matching lines)
- [x] 3.2 `yarn typecheck`, `yarn test`, lint pass
- [x] 3.3 Browser smoke: existing harness plus toggling the engine checkbox on the analysis page — assert PV/score elements react when FSF wasm boots, with a no-page-errors floor otherwise; flip/scroll still clean
