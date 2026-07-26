# Design — extract-two-board-analysis-tree

## Context

`AnalysisControllerBughouse` currently owns: tree state (`analysisTree?: AnalysisTree`, `analysisPath: string`, `treeForkIndex: number`, `treeContextMenu?`), ~30 methods (`hasAnalysisTree`, `initAnalysisTreeAtPly`, the `getTree*` family, `activateTreePath`/`activateTreeMainlinePly`, `pathIsTreeMainline`/`pathIsTreeForcedVariation`, `canPromoteTreeVariation`, `someTreeCollapsed`, context-menu open/close, `copyTreeLinePgn`, `toggleTreeCollapsed`/`collapseAllTree`/`expandAllTree`, `promoteTreeVariation`/`forceTreeVariation`/`deleteTreeNode`, branch/line navigation, `selectTreeFork`, collapse persistence (`treeCollapsedStorageKey`/`applyTreeCollapsedPaths`/`saveTreeCollapsedPaths`), `revealTreePath`), plus 8 Mousetrap key bindings wired in the constructor that call these methods directly. External consumers: `common/movelist.ts` (the dominant one, ~22 references, currently narrowed through a hand-maintained `TreeCtrl` mirror-type interface — a structural duplicate of ~26 tree method signatures, created because the real class can't be `instanceof`-narrowed without a value import that would reintroduce the known chat→roundCtrl-style TDZ risk); `analysisClock.ts` (`hasAnalysisTree?.()`/`getTreeCurrentNode?.()?.step`, one line); `pgn.ts` (`hasAnalysisTree()`/`analysisTree`, two lines). `goPly`'s tree-driven branch and `sendMove` both touch the tree but are fundamentally board/step orchestration, not tree bookkeeping.

## Goals / Non-Goals

**Goals:**

- All tree state and path/node/context-menu logic lives in `client/two-board/analysis/analysisTree.ts` as `AnalysisTreeController` (`ctrl.tree`); the controller contains no tree-path/node logic.
- Remove the `TreeCtrl` mirror-type interface in `movelist.ts` (known deferred-review debt), replacing it with direct typing against the real controller.
- Byte/DOM-identical behavior for every tree interaction (navigation, keybindings, context menu, collapse, promote/force/delete, PGN line copy).
- Unit tests for the pure/state parts using a real `AnalysisTree` fixture, no DOM for the path-math parts.

**Non-Goals:**

- No change to `client/analysis/analysisTree.ts` (the shared pure tree data-structure/algorithm module) or `analysisTreeTwoBoards.ts` (PGN move-text rendering).
- `goPly` stays on the controller — it is board-state orchestration (sets FENs, plays sound, renders clocks/PGN) that happens to be *triggered* by a tree lookup; only the lookup (`getTreeNodeForPly`) moves.
- No change to single-board analysis tree handling.

## Decisions

1. **A class (`AnalysisTreeController`), not free functions** — same rationale as `engine.ts`: substantial mutable state (tree, path, fork index, context menu) plus ~30 methods. Constructed in the analysis controller's constructor as `this.tree = new AnalysisTreeController(this)`; `analysisTree.ts` imports the controller type with `import type` only.

2. **Method names carry over unchanged** (`getTreeCurrentNode`, `activateTreePath`, etc.) under the new `ctrl.tree.` namespace rather than being renamed to drop the redundant "Tree" infix (e.g. `currentNode()`). This keeps the ~90 call-site updates a mechanical `ctrl.getTreeXxx(` → `ctrl.tree.getTreeXxx(` / `ctrl.hasAnalysisTree(` → `ctrl.tree.hasAnalysisTree(` rewrite, minimizing risk; a follow-up rename is possible later but out of scope here.

3. **`goPly` and `sendMove` split precisely at the tree/board boundary.** `goPly`'s tree-driven branch keeps its board-mutation body (FEN/move/sound/render/PGN) on the controller, calling `this.tree.getTreeNodeForPly(ply)` for the node lookup (a pure state read) — moving the whole branch into the tree module would misplace board-rendering code there. `sendMove` keeps pushing the move to the board/ffish, then calls a new `ctrl.tree.recordMove(step)` (the `addOrSelectChild`/mainline-tail-extension logic, currently inlined) which returns the child path; `sendMove` then calls `this.tree.activateTreePath(childPath)` as today.

4. **Mousetrap bindings stay in the constructor** (they are page-level keybinding wiring, matching where round-page bindings live) but their bodies become one-line delegations to `this.tree.*`.

5. **`updateMovelist` is called from within `analysisTree.ts`** (context-menu open/close, collapse toggle, fork select, `activateTreePath`) — a value import of `updateMovelist` from `../common/movelist`. This does not create a runtime cycle: `movelist.ts`'s only reference back is `import type AnalysisControllerBughouse`, which is erased at compile time. The acyclic-imports requirement is about runtime edges; this satisfies it exactly as `pgn.ts`/`engine.ts` already do for other value-imported controller-adjacent modules.

6. **`movelist.ts`'s `TreeCtrl` mirror type is deleted**, not migrated. Today's `type TreeCtrl = AnalysisControllerBughouse & { <26 duplicated optional method signatures> }` exists solely so `asTreeCtrl` can narrow via a runtime duck-type check (`treeCtrl.hasAnalysisTree?.()`) without an `instanceof` value-import of the concrete class. Post-extraction, the same narrowing works directly against the real type: `(ctrl as AnalysisControllerBughouse).tree?.hasAnalysisTree()`, since `tree` is a plain property presence check, not a class-identity check — no `instanceof`, no value import, no mirror interface. This directly resolves the "TreeCtrl mirror type" item recorded as deferred debt from the earlier review.

7. **Naming coexistence, addressed not avoided.** Per explicit instruction, the new module is `client/two-board/analysis/analysisTree.ts`. This repo will then have three same-stem files: `client/analysis/analysisTree.ts` (shared pure data structure/algorithms — imported *by* the new module), `client/two-board/analysis/analysisTreeTwoBoards.ts` (PGN move-text rendering), and `client/two-board/analysis/analysisTree.ts` (this controller-state module). No path collision (different directories), and no import ambiguity (each is referenced by relative path, never by bare basename). Flagged here as a conscious choice rather than an oversight; a future rename (e.g. `analysisTreeState.ts`) is a cheap follow-up if the coexistence proves confusing in practice.

## Risks / Trade-offs

- [Large mechanical rewrite in `movelist.ts` (~22 call sites) risks a missed reference] → grep for every bare `ctrl.getTree`/`ctrl.hasAnalysisTree`/`ctrl.analysisTree`/`ctrl.activateTree`/`ctrl.pathIsTree`/`ctrl.*TreeVariation`/`ctrl.*TreeCollapsed`/`ctrl.treeForkIndex`/`ctrl.treeContextMenu` pattern after the move; typecheck catches any remaining reference to a now-removed controller member.
- [`goPly`/`sendMove` split introduces a subtle boundary] → covered by design decision 3; existing Playwright smoke exercises ply navigation and move entry end-to-end.
- [Removing the `TreeCtrl` mirror type could reintroduce the TDZ hazard it was built to avoid] → verified: the new narrowing checks a property (`ctrl.tree`), not `instanceof` against a value-imported class; `movelist.ts` keeps its existing `import type AnalysisControllerBughouse` (already type-only today) and adds no new value import.

## Open Questions

- None.
