# Design — extract-two-board-analysis-pgn

## Context

After `adopt-two-board-players-in-analysis` (archived 2026-07-25), the PGN surface in `AnalysisControllerBughouse` consists of: `pgnText(moveText)` (the single shared 11-tag header builder, reading names from `seats`), `getPgn()` (tree branch via `renderBughouseTreePgnMoveText`, legacy branch building `1A.`/`1B.`-countered mainline text), `renderFENAndPGN(pgn)` (patches `#copyfen` button stubs, sets `#fullfen`, patches `#pgntext` into `vpgn`), and `checkStatus()` (embed guard + regenerate + render). Call sites: constructor initial render, `onMsgBoard`, `goPly` (both branches), and `sendMove` via `activateTreePath` → `goPly` → `checkStatus`. The pure move-text renderers already live in `analysisTreeTwoBoards.ts`; `movetimeChart.ts`/`analysisClock.ts` set the precedent for controller-taking free-function modules in `analysis/`.

## Goals / Non-Goals

**Goals:**

- All PGN string building and FEN/PGN-panel DOM rendering lives in `client/two-board/analysis/pgn.ts`; the controller contains no PGN assembly code.
- Byte-identical PGN output and DOM-identical panel rendering.
- Unit tests for the pure parts (header, legacy move text) with a minimal stub controller, no DOM.

**Non-Goals:**

- No implementation of the stubbed download-PGN/copy-UCI/PNG buttons (they move as-is, still `console.log`).
- No change to `analysisTreeTwoBoards.ts` (tree/line move-text renderers stay put; `pgn.ts` composes them).
- No move of `copyTreeLinePgn` — it is tree-context-menu behavior (menu state + clipboard), not PGN assembly; it keeps delegating to the shared renderers.
- No PGN work on the round page or single-board analysis.

## Decisions

1. **Free functions taking the controller, `import type` for the controller type.** Mirrors `movetimeChart(ctrl)`/`renderClocks(ctrl)`. `pgn.ts` needs `seats`, `steps`, `ply`, `variant`, `boardA`/`boardB` fullfens, `analysisTree`, `isAnalysisBoard`, `model['embed']`, and writes `ctrl.vpgn` — a type-only import of `AnalysisControllerBughouse` gives typing without a runtime edge back into the controller module, keeping the acyclic-imports requirement trivially satisfied.

2. **Module API (names final at implementation, shapes fixed):**
   - `getPgn(ctrl): string` — moved as-is, both branches; the header builder becomes a module-private function (it has exactly one caller site family).
   - `renderFENAndPGN(ctrl, pgn): void` — moved as-is, assigns `ctrl.vpgn`.
   - `updateFENAndPGN(ctrl): void` — the former `checkStatus` body (embed guard + `getPgn` + render); the controller's `checkStatus` call sites call this. The pure legacy move-text loop may be split into a module-private `mainlineMoveText(ctrl)` for direct unit testing.

3. **Controller state stays on the controller.** `vpgn` (retained vnode) and `pgn` (imported-PGN string field) remain fields; the module reads/writes them via the ctrl parameter. Moving state out would change lifetimes for no benefit.

4. **Tests use a stub controller object.** The pure functions only touch data fields (`seats`, `steps`, `ply`, `variant.name`, `boardA.home`); a hand-built stub with a real `TwoBoardSeats` exercises header names, tag order, `1A.`/`1B.` counters, and the `sanSAN ?? san` fallback without jsdom.

## Risks / Trade-offs

- [Silent PGN drift during the move] → capture the full PGN string for a sample game before/after (the existing Playwright smoke asserts the header tags; the new jest spec pins tag order and move counters).
- [Hidden coupling via `this` in moved methods] → the methods only touch the fields listed in decision 1; typecheck enforces completeness after the move.
- [Type-only import regressing to a value import later] → `import type` syntax plus the existing acyclic-imports spec requirement cover it; oxlint flags unused value imports.

## Open Questions

- None.
