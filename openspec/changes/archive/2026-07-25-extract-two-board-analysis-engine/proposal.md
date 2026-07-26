# Extract engine evaluation out of the two-board analysis controller

## Why

After the PGN extraction, the largest remaining block in `AnalysisControllerBughouse` is engine evaluation: Fairy-Stockfish process wiring (postMessage, variants.ini stdin-prompt loading, readiness), UCI `info` line parsing, engine start/stop per board, and PV/score/gauge/best-move-arrow rendering — roughly 15 fields and 15 methods (~450 lines) tangled into the controller. It is a cohesive subsystem with its own lifecycle and state, and isolating it continues the established decomposition (`pgn.ts`, `movetimeChart.ts`, `analysisClock.ts`), leaving the controller focused on boards, steps, and tree navigation.

## What Changes

- New module `client/two-board/analysis/engine.ts` owning the engine-evaluation subsystem as an engine controller class instantiated by the analysis controller (`ctrl.engine`), holding the engine state that currently lives on the analysis controller: ffish handle + notation object, FSF stdin-prompt queue and debug/error state, `isEngineReady`, `maxDepth`/`multipv`/`arrow` settings, `fsfEngineBoard`, and the PV/score/info retained vnodes (`vscore`, `vscorePartner`, `vinfo`, `vpvlines`).
- Methods moved: `fsfPostMessage`, `loadVariantsIntoFsfEngine`, `installFsfPromptQueue`, `restoreFsfPrompt`, `onFSFline` (UCI parsing incl. `EVAL_REGEX`), `engineGo`, `engineStop`, `onMoreDepth`, `pvboxIni`, `pvView`, `clearPvlines`, `renderInput` (engine toggle checkboxes), `makePvMove`, `drawEval`, `onMsgAnalysis`, `notation2ffishjs`, and `buildScoreStr` (exported as a pure function — it is score formatting used by both the engine and server-eval stamping in `onMsgBoard`).
- The analysis controller keeps delegating call sites only: constructor engine setup, `goPly`/`sendMove` stop/refresh/go, `onMsgBoard` server-eval score stamping via the pure `buildScoreStr`. Per-board `localAnalysis` flags stay on the boards.
- `analysis.ts` window hook update: `window['onFSFline'] = ctrl.engine.onFSFline`.
- Behavior parity: engine toggling, PV lines, score/gauge/arrow rendering, go-deeper, and PV-move clicking behave exactly as before.
- Jest coverage for the pure parts (`buildScoreStr` mate/cp/sign cases, UCI eval-line regex parsing) — previously untestable as private members.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `bughouse-client-controllers`: new requirement isolating engine evaluation in a dedicated analysis module, with the controller free of UCI/engine/PV-rendering code (mirrors the existing PGN-module requirement).

## Impact

- `client/two-board/analysis/engine.ts` — new module (~450 lines moved).
- `client/two-board/analysis/analysisCtrl.ts` — engine fields/methods removed; `engine` member + delegating call sites added.
- `client/two-board/analysis/analysis.ts` — window hook points at `ctrl.engine.onFSFline`.
- `tests/` — new jest spec for score formatting and UCI line parsing.
- No server, i18n, wire-format, or user-visible changes.
