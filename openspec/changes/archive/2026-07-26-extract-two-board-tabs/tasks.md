# Tasks — extract-two-board-tabs

## 1. Extract the module

- [x] 1.1 Create `client/two-board/common/tabs.ts` with a private `TabDef`/`renderTabList`/`tabPanelAttrs` (position-derived ids/`tabindex`/`aria-selected`, moved from `analysis.ts`'s markup and `analysisCtrl.ts`'s constructor click handler), and the public API: `TabPanelDef { label, panelClass?, content }`, `renderTabbedPanels(container, panels, ariaLabel)` assembling the whole container, `initTabs()`, `hideTabList()`

## 2. CSS: decouple FEN & PGN panel styling from its id

- [x] 2.1 Add `.fenpgn-panel { font-size: 0.9em; flex-flow: column; }` to `static/bughouse.css`, matching `static/analysis.css`'s existing `#panel-4` rule; leave `static/analysis.css` and the single-board page untouched

## 3. Rewire the analysis page

- [x] 3.1 `analysis.ts`: replace the hand-written tablist/panels with one `renderTabbedPanels('under-board', [...], 'Analysis Tabs')` call; movetime panel keeps `panelClass: 'chart-container'`, FEN/PGN panel gets `panelClass: 'fenpgn-panel'`; no ids specified anywhere in the call
- [x] 3.2 `analysisCtrl.ts`: replace the inline click-handler setup and duplicate default-panel-show with `initTabs()`; replace the `isAnalysisBoard` branch's tablist-hide + panel-show with `if (this.isAnalysisBoard) hideTabList();`
- [x] 3.3 Verify by grep that no `role="tab"`/`querySelectorAll('[role="tab"]')`/`changeTabs`-style code, and no literal `tab-1`/`panel-2`/`panel-4` string, remains in `analysis.ts`/`analysisCtrl.ts` outside the new module calls

## 4. Verification

- [x] 4.1 `yarn typecheck`, `yarn test`, lint pass
- [x] 4.2 Browser smoke (existing harness): on a real game's analysis page, click both tabs and confirm the correct panel shows, `aria-selected` updates, and the FEN & PGN panel keeps its font-size/flex-flow styling; on the plain (no-game) analysis board, confirm the tablist is hidden and only the default panel is shown; no console/page errors
