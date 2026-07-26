# bughouse-client-controllers — delta for extract-two-board-analysis-engine

## ADDED Requirements

### Requirement: Engine evaluation isolated in a dedicated analysis module
Bughouse-analysis engine evaluation SHALL live in `client/two-board/analysis/engine.ts` as an engine controller class instantiated by the analysis controller (`ctrl.engine`; type-only controller import, no runtime edge back into the controller module). The engine controller SHALL own the engine subsystem's state (Fairy-Stockfish message/prompt wiring, readiness, ffish handle and notation object, PV engine board, depth/multipv/arrow settings, and the PV/score/info retained vnodes) and behavior (UCI `info` line parsing, engine start/stop per board, go-deeper, PV/score/gauge/best-move-arrow rendering, PV-move clicking, and the engine toggle inputs). `AnalysisControllerBughouse` MUST NOT contain engine state or UCI/PV-rendering code; it keeps only delegating call sites (construction, stop/refresh/go around ply navigation and move entry, server-eval score stamping). Score formatting (`buildScoreStr`) and UCI eval-line parsing SHALL be exported pure functions. Per-board `localAnalysis` flags remain on the board controllers, and the page module wires `window['onFSFline']` to the engine controller.

#### Scenario: Engine behavior is unchanged
- **WHEN** a user toggles either board's engine checkbox, scrolls plies, enters moves, requests more depth, or clicks a PV move after the extraction
- **THEN** engine start/stop, PV lines (multipv 1–5), score/gauge/arrow rendering, and the engine-termination error dialog behave exactly as before

#### Scenario: Controller stays free of engine code
- **WHEN** the analysis controller needs engine interaction (constructor setup, `goPly`/`sendMove` stop-and-restart, info-line reset on board messages)
- **THEN** it calls `ctrl.engine` methods or the exported pure helpers; no UCI strings, eval parsing, or PV/score/gauge rendering exists in `analysisCtrl.ts`

#### Scenario: Pure parts are unit-tested
- **WHEN** the jest suite runs
- **THEN** score formatting (mate/cp values, sign handling per color) and UCI eval-line parsing (depth, multipv, cp/mate scores, bounds, nodes, pv extraction) are covered by unit tests with no DOM or engine required
