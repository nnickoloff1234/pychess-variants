# Extract the two-board tab widget into a reusable module

## Why

The bughouse analysis page (`client/two-board/analysis/`) has a small ARIA tab widget (Move times / FEN & PGN) split across two files: the DOM markup lives in `analysis.ts`, while the click-to-switch behavior, initial-panel reveal, and the no-game "collapse to one panel" case are wired up in `analysisCtrl.ts`'s constructor. Nothing about this code is analysis-specific — it's generic tablist/tabpanel wiring — but today it's hardcoded to two specific tabs and only reachable from the analysis controller. Other two-board pages (e.g., a future round-page tools panel) will want the same tab widget, so it should live as its own reusable module rather than be re-copied.

## What Changes

- New module `client/two-board/common/tabs.ts` exporting a single entry point, `renderTabbedPanels(container, panels, ariaLabel)`, taking a list of `{ label, panelClass?, content }` and building the whole container + panels + tablist, auto-generating each tab's `tab-N`/`panel-N` ids internally — callers never specify ids. Also exports `initTabs()` (wires click-to-switch behavior on every `[role="tab"]` on the page and reveals the initially-selected panel) and `hideTabList()` (hides the tablist, collapsing the UI to just the default panel). The lower-level pieces (tab-definition shape, tablist rendering, panel-attrs computation) are module-private implementation details, not part of the public API.
- `analysis.ts` replaces its hand-written tablist/panel markup with one `renderTabbedPanels('under-board', [...], 'Analysis Tabs')` call.
- `analysisCtrl.ts`'s constructor replaces its inline click-handler setup and the `isAnalysisBoard` hide-tablist branch with `initTabs()` + `if (this.isAnalysisBoard) hideTabList()`. As a byproduct, a redundant duplicate "show the default panel" call (present in both the `isAnalysisBoard` branch and unconditionally afterward in the current code) collapses into the single call `initTabs()` already makes.
- CSS fix required by auto-generated ids: the FEN & PGN panel's styling (`font-size`, `flex-flow`) currently comes from a rule keyed on the literal id `#panel-4` in `static/analysis.css`, a stylesheet shared with the single-board analysis page. Auto-generated ids would silently drop that styling. Fix: add a `.fenpgn-panel` class selector (same properties) to `static/bughouse.css` (the bughouse-specific stylesheet, loaded on every page), applied to the two-board FEN & PGN panel via `panelClass: 'fenpgn-panel'`. `static/analysis.css` and the single-board page are untouched — they keep working off the literal `panel-4` id.
- Behavior parity: tab switching, ARIA attributes, rendered styling, and the no-game collapsed-tablist case are attribute/visual-identical to today.
- Scope is `client/two-board/` only — the single-board `client/analysis/` page is untouched.

## Capabilities

### New Capabilities

- `two-board-tabs`: a reusable ARIA tablist/tabpanel widget for two-board pages — tab definitions, rendering, click-to-switch behavior, and the collapsed (tabs-hidden, default-panel-only) mode.

### Modified Capabilities

_None._ (`bughouse-client-controllers` is not modified — this is a UI-widget extraction, not a controller/player-abstraction change; the analysis controller's constructor call sites just delegate to the new module, same as its calls to `pgn.ts`/`engine.ts`/`analysisTree.ts` today.)

## Impact

- `client/two-board/common/tabs.ts` — new module.
- `client/two-board/analysis/analysis.ts` — tab markup rebuilt via one `renderTabbedPanels(...)` call.
- `client/two-board/analysis/analysisCtrl.ts` — inline tab wiring replaced with `initTabs()`/`hideTabList()` calls; the local `changeTabs` closure and duplicate default-panel-show removed.
- `static/bughouse.css` — new `.fenpgn-panel` class rule.
- No server, i18n, or wire-format changes; `static/analysis.css` and the single-board page are untouched.
