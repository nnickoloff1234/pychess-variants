# Design — extract-two-board-tabs

## Context

Today's tab widget, split across two files:

- `analysis.ts` hand-writes: a `div[role=tablist]` containing two `span[role=tab]` elements (`id: 'tab-1'`/`'tab-4'`, `aria-controls` pointing at `panel-2`/`panel-4`, `aria-selected` true/false, `tabindex` '0'/'1'), and two panel `div`s (`panel-2` wrapping `#chart-movetime`, `panel-4` wrapping the FEN/PGN block) each carrying `role=tabpanel`, `tabindex` '0'/'1', and `aria-labelledby` pointing back at its tab.
- `analysisCtrl.ts`'s constructor: if `isAnalysisBoard` (no game), hides the tablist and force-shows the `[tabindex="0"]` panel; unconditionally attaches a `click` listener (`changeTabs`) to every `[role="tab"]` that implements the standard ARIA tab-activation pattern (deselect all tabs → select the clicked one → hide all panels → show the one named by `aria-controls`); then unconditionally shows the `[tabindex="0"]` panel again (redundant with the `isAnalysisBoard` branch when both run).

The `tabindex` attribute here is repurposed as a "which tab/panel is the default" marker (`[tabindex="0"]` = default), not for real keyboard tab-order — this is pre-existing behavior, preserved as-is, not "fixed" by this extraction.

## Goals / Non-Goals

**Goals:**

- All tab markup-building and behavior lives in `client/two-board/common/tabs.ts`, parameterized by a list of `{ label, content, panelClass? }` rather than hardcoded to "Move times"/"FEN & PGN" or to caller-supplied ids.
- Callers never write or think about `tab-N`/`panel-N` ids — the module auto-generates and owns them entirely.
- `analysis.ts` and `analysisCtrl.ts` become thin callers of the new module.
- Attribute/visual-identical behavior for both the normal and no-game (collapsed) cases, including panel styling.
- API shaped for reuse by a future two-board page that needs its own (differently-labeled, differently-sized) tab set — no analysis-specific assumptions baked into the module.

**Non-Goals:**

- No change to the single-board `client/analysis/` page or `static/analysis.css`.
- No accessibility fix for the `tabindex`-as-default-marker pattern, no keyboard-navigation support (arrow keys between tabs) — out of scope, not present today.
- No change to what each panel contains (chart, FEN/PGN block) — only the tab chrome around them moves.

## Decisions

1. **One public entry point, `renderTabbedPanels(container, panels: TabPanelDef[], ariaLabel)`, returning the whole container VNode.** `TabPanelDef` is `{ label, panelClass?, content }` — no `id`/`panelId` field at all. Internally, ids are generated purely from array position (`tab-${i}`/`panel-${i}`), and `aria-selected`/`tabindex` are likewise position-derived (index 0 selected/default, matching the pre-extraction markup's semantics). The `TabDef` shape, `renderTabList`, and `tabPanelAttrs` from the original design still exist as the module's internal implementation, but are no longer exported — callers only ever see `renderTabbedPanels`, `initTabs`, `hideTabList`. This directly satisfies the requirement that ids be auto-generated rather than caller-supplied, and that one call produces the container + panels + tablist together, not three separately-assembled pieces.

2. **`panelClass` is the only per-panel customization point**, applied as `h('div.' + panelClass, ...)` (or plain `div` when omitted) — covers both existing panels (`chart-container` for the movetime chart, the new `fenpgn-panel` for FEN/PGN) without needing a more general "custom tag" escape hatch. If a future reuse case needs a genuinely different wrapper element (not just a class on a div), that's a reason to extend the parameter then, not to speculatively generalize now.

3. **CSS coupling discovered during implementation: `#panel-4` is a real, shared style rule, not just a DOM handle.** `static/analysis.css` (loaded for both the single-board and two-board analysis pages, per `server/views/analysis.py`'s `view_css`) has `div#panel-4 { font-size: 0.9em; flex-flow: column; }`. Auto-generating ids from array position means the two-board FEN/PGN panel will no longer be `panel-4`, so it would silently lose this styling. Fix: add a class selector `.fenpgn-panel` with the same two properties to `static/bughouse.css` (the bughouse-specific stylesheet — loaded unconditionally on every page per `templates/base.html`, so no template change needed), and pass `panelClass: 'fenpgn-panel'` for that panel. `static/analysis.css`'s `#panel-4` rule and the single-board page's literal `panel-4` id are left exactly as they are — two independent rules now coincidentally styling similar panels on two different pages, not a shared dependency.

4. **`initTabs()` bundles click-wiring and the default-panel reveal into one call**, removing the redundant duplicate reveal that exists in the current code (once unconditionally, once again inside the `isAnalysisBoard` branch). `hideTabList()` is a separate, smaller function that only hides the tablist element — the caller sequence becomes `initTabs(); if (cond) hideTabList();`, which is behaviorally identical to today (default panel ends up shown either way) but calls "show default panel" exactly once.

5. **No controller/instance state.** `initTabs()`/`hideTabList()` operate directly on `document` (as the current code does — `document.querySelectorAll('[role="tab"]')` is already page-global, not scoped to a controller instance), so the module needs no constructor, no `ctrl` reference, and no import-cycle concerns. This keeps it usable from any two-board page without threading a controller type through it.

## Risks / Trade-offs

- [Page-global `document.querySelectorAll` means two tab widgets on the same page would collide] → Not a regression (today's code already has this limitation) and out of scope for this extraction; a future reuse case needing multiple simultaneous tab widgets on one page would need scoping added to `initTabs`/`hideTabList` at that time.
- [Silent behavior drift in the ARIA attributes or panel styling during the rewrite] → Verify via DOM snapshot/manual diff of rendered `analysis.ts` output before/after (ids will differ in string value but not in structural role), plus a visual check of the FEN & PGN panel's layout after the CSS class fix, plus the existing Playwright smoke's page-load and tab-interaction checks.
- [`.fenpgn-panel` name collision or specificity conflict with other page styles] → `bughouse.css` loads before `analysis.css` in `base.html`'s cascade, but the new rule targets a distinctly-named class scoped to this panel, so no existing selector should collide.

## Open Questions

- None.
