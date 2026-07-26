# bughouse-client-controllers — delta for extract-two-board-analysis-tree

## ADDED Requirements

### Requirement: Analysis-tree navigation isolated in a dedicated module
Bughouse-analysis tree navigation SHALL live in `client/two-board/analysis/analysisTree.ts` as an `AnalysisTreeController` class instantiated by the analysis controller (`ctrl.tree`; type-only controller import, no runtime edge back into the controller module). The tree controller SHALL own the tree state (`analysisTree`, `analysisPath`, `treeForkIndex`, `treeContextMenu`) and behavior (tree initialization, path/node lookup and navigation, mainline/branch/line/fork traversal, context-menu open/close, collapse/expand and its localStorage persistence, variation promotion/forcing/deletion, and recording a played move into the tree). `AnalysisControllerBughouse` MUST NOT contain tree-path/node logic; it keeps only the `tree` member, the Mousetrap key-binding wiring (delegating to `ctrl.tree`), and board-orchestration methods (`goPly`, `sendMove`) that call into the tree controller for tree state but perform their own board/FEN/sound/render work.

#### Scenario: Tree behavior is unchanged
- **WHEN** a user navigates plies/branches/variations via keyboard, movelist clicks, or the tree context menu (open/close, copy line, promote/force variation, delete node, collapse/expand) after the extraction
- **THEN** the resulting tree state, active path, movelist rendering, and PGN output are identical to before

#### Scenario: Controller stays free of tree logic
- **WHEN** the analysis controller needs tree interaction (construction, `goPly`'s tree-driven branch, `sendMove` recording a played move, Mousetrap bindings)
- **THEN** it calls `ctrl.tree` methods; no tree-path/node computation exists in `analysisCtrl.ts` outside of board-orchestration methods that read tree state via the tree controller

#### Scenario: Pure parts are unit-tested
- **WHEN** the jest suite runs
- **THEN** tree-controller navigation (path/node lookup, branch/line/fork traversal, context-menu coordinate math, collapse-path persistence round-trip through a stubbed `localStorage`) is covered by unit tests against a real `AnalysisTree` fixture, without a live analysis page

## MODIFIED Requirements

### Requirement: Consumers type against the base class
Modules that operate on "either bughouse controller" (`common/movelist.ts`, `common/gameCtrl.ts`) SHALL use the base class type instead of the union `AnalysisControllerBughouse | RoundControllerBughouse` wherever only shared members are accessed, and SHALL obtain team/player information from the base's `seats` member — no `instanceof` narrowing or type assertions for player identity. Narrowing to a concrete subclass SHALL only occur where genuinely subclass-only members (e.g. clocks, analysis tree accessors) are needed. Where `movelist.ts` narrows to analysis-tree-capable controllers, it SHALL narrow directly against `AnalysisControllerBughouse`'s `tree` member (a property-presence check, not `instanceof`) rather than through a separately maintained structural mirror-type interface.

#### Scenario: Movelist renders for both controllers
- **WHEN** `updateMovelist`/`selectMove`/`createMovelistButtons` are called with either controller
- **THEN** they compile against the base type and render output identical to pre-refactor behavior for both the round and analysis pages

#### Scenario: Team names without casts
- **WHEN** the movelist renders the game result line with team names
- **THEN** it reads them from `ctrl.seats` on the base type, with the former `teamsOf` `instanceof`+cast bridge removed

#### Scenario: Tree narrowing without a mirror type
- **WHEN** the movelist needs to render tree-specific UI (variation rows, context menu, collapse controls) for a controller that may or may not have an analysis tree
- **THEN** it narrows via `ctrl.tree?.hasAnalysisTree()` against the real `AnalysisControllerBughouse` type, and no duplicated structural interface re-declaring the tree controller's method signatures exists in `movelist.ts`
