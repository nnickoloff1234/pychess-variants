# Extract AnalysisTree navigation out of the two-board analysis controller

## Why

After the PGN and engine extractions, `AnalysisControllerBughouse` (758 lines) is now dominated by analysis-tree bookkeeping: tree state (`analysisTree`, `analysisPath`, `treeForkIndex`, `treeContextMenu`), ~30 path/node navigation methods, context-menu state, collapse-state persistence, and Mousetrap key bindings — all keyed off the tree, not the boards. Isolating it continues the established decomposition (`pgn.ts`, `engine.ts`) and, as a direct side effect, lets the movelist module drop its `TreeCtrl` mirror type — a duplicated, hand-maintained shadow of the controller's tree API that exists only because tree access needed structural typing. That mirror type was flagged as known debt in the `refactor-bughouse-ctrl-shared-logic` review (2026-07-18) and deferred; this change resolves it as a natural consequence of the extraction, per that review's own guidance ("fixing them is fair game to suggest once").

## What Changes

- New module `client/two-board/analysis/analysisTree.ts` exporting `AnalysisTreeController`, instantiated by the analysis controller as `ctrl.tree` (type-only controller import, no runtime edge back into the controller module). It owns: the tree state fields, all `getTree*`/`activateTree*`/`pathIsTree*`/`*TreeVariation`/`*TreeCollapsed`/context-menu methods, collapse-state localStorage persistence, `initAnalysisTreeAtPly`, `getTreeNodeForPly`, and the tree-navigation Mousetrap bindings.
- `AnalysisControllerBughouse` keeps: the `tree` member, `goPly`'s board-mutation logic (still calling `this.tree.getTreeNodeForPly(ply)` for the tree-driven branch's node lookup), `sendMove`'s tree-extension call (delegating the "add this played move to the tree" step to the tree module, keeping move/board mechanics in `sendMove`), and construction wiring. No tree-path/node logic remains in the controller.
- `client/two-board/common/movelist.ts`: the ~26-line `TreeCtrl` mirror-type interface is removed; call sites (`ctrl.getTreeXxx()`, `ctrl.analysisTree`, `ctrl.hasAnalysisTree()`, etc., ~22 references) are updated to `ctrl.tree.xxx`, narrowing via `ctrl.tree.hasAnalysisTree()` directly against the real `AnalysisControllerBughouse` type instead of the duplicated structural interface.
- `client/two-board/analysis/analysisClock.ts` and `pgn.ts` (2 lightweight call sites) update similarly.
- Behavior parity: tree navigation, keyboard shortcuts, context menu, collapse/expand, variation promotion/deletion, and PGN line copy behave exactly as before.
- Naming note: this introduces `client/two-board/analysis/analysisTree.ts` alongside the pre-existing `client/analysis/analysisTree.ts` (shared pure tree data-structure/algorithms module, imported by this one) and `client/two-board/analysis/analysisTreeTwoBoards.ts` (PGN move-text rendering over trees). Different paths, no import collision, but flagged here as a deliberate choice per explicit instruction.
- Jest coverage for the pure parts (context-menu coordinate math, collapse-path persistence round-trip, node/path navigation against a real tree) — previously untestable as private/instance methods entangled with DOM.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `bughouse-client-controllers`: new requirement isolating analysis-tree navigation in a dedicated module, controller free of tree-path/node logic (mirrors the PGN and engine module requirements); movelist's tree-consumer typing requirement updates to reference the real controller type instead of a mirrored structural interface.

## Impact

- `client/two-board/analysis/analysisTree.ts` — new module (~300 lines moved).
- `client/two-board/analysis/analysisCtrl.ts` — tree fields/methods removed; `tree` member + delegating call sites added.
- `client/two-board/common/movelist.ts` — `TreeCtrl` mirror type removed; ~22 call sites updated to `ctrl.tree.*`.
- `client/two-board/analysis/analysisClock.ts`, `pgn.ts` — 2 call sites updated.
- `tests/` — new jest spec for tree-controller navigation, context-menu math, and collapse persistence.
- No server, i18n, wire-format, or user-visible changes.
