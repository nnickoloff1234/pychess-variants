# Tasks — extract-two-board-analysis-tree

## 1. Extract the module

- [x] 1.1 Create `client/two-board/analysis/analysisTree.ts` with `AnalysisTreeController` (back-reference to the analysis controller via `import type`): move the tree state fields, `hasAnalysisTree`, `initAnalysisTreeAtPly`, the full `getTree*` family, `activateTreePath`/`activateTreeMainlinePly`, `getTreeNodeForPly`, `pathIsTreeMainline`/`pathIsTreeForcedVariation`, `canPromoteTreeVariation`, `someTreeCollapsed`, context-menu open/close, `copyTreeLinePgn`, `toggleTreeCollapsed`/`collapseAllTree`/`expandAllTree`, `promoteTreeVariation`/`forceTreeVariation`/`deleteTreeNode`, branch/line/fork navigation (`getTreePreviousBranchPath`, `getTreeNextBranchPath`, `getTreeStepLinePath`, `selectTreeFork`), collapse persistence (`treeCollapsedStorageKey`/`applyTreeCollapsedPaths`/`saveTreeCollapsedPaths`), and `revealTreePath`
- [x] 1.2 Add `recordMove(step)` to the tree controller: the `addOrSelectChild`/mainline-tail-extension logic currently inlined in `sendMove`, returning the child path (and whether the step was appended to `ctrl.steps`, needed by the caller)

## 2. Slim the controller and rewire

- [x] 2.1 Remove the moved fields/methods from `analysisCtrl.ts`; add `tree: AnalysisTreeController`, constructed in the constructor; update Mousetrap bindings to delegate to `this.tree.*`
- [x] 2.2 `goPly`'s tree-driven branch calls `this.tree.getTreeNodeForPly(ply)` for node lookup; keeps its own board/FEN/sound/render/PGN logic
- [x] 2.3 `sendMove` calls `this.tree.recordMove(step)` then `this.tree.activateTreePath(childPath)`, keeping its own move/board/ffish logic
- [x] 2.4 `onMsgBoard` delegates `initAnalysisTreeAtPly` calls to `this.tree.initAnalysisTreeAtPly(...)`

## 3. Rewire external consumers

- [x] 3.1 `common/movelist.ts`: delete the `TreeCtrl` mirror-type interface; update `asTreeCtrl` to narrow via `ctrl.tree?.hasAnalysisTree()`; update all ~22 call sites (`ctrl.getTreeXxx()` → `ctrl.tree.getTreeXxx()`, `ctrl.analysisTree` → `ctrl.tree.analysisTree`, etc.)
- [x] 3.2 `analysisClock.ts` and `pgn.ts`: update their 1–2 tree references each to go through `ctrl.tree`
- [x] 3.3 Verify by grep that no bare `ctrl.getTree`/`ctrl.hasAnalysisTree`/`ctrl.analysisTree`/`ctrl.activateTree`/`ctrl.pathIsTree`/`ctrl.*TreeVariation`/`ctrl.*TreeCollapsed`/`ctrl.treeForkIndex`/`ctrl.treeContextMenu` references remain anywhere in `client/`

## 4. Tests and verification

- [x] 4.1 New jest spec for `AnalysisTreeController` against a real `AnalysisTree` (built via `createAnalysisTree`): path/node lookup, mainline/branch/line/fork navigation, context-menu coordinate math, collapse-path persistence round-trip (stubbed `localStorage`), `recordMove` mainline-tail extension vs. variation branch
- [x] 4.2 `yarn typecheck`, `yarn test`, lint pass
- [x] 4.3 Browser smoke (existing harness): ply navigation via keyboard/movelist, tree context menu (open, copy line, close), collapse/expand, on a live game's analysis page; no console/page errors
