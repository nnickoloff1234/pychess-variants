# two-board-tabs

## Purpose

A reusable ARIA tablist/tabpanel widget for `client/two-board/` pages: tab definitions, tablist/tab-attribute rendering, click-to-switch behavior, and a collapsed (tabs-hidden, single-default-panel) mode. Established by the `extract-two-board-tabs` change (2026-07-26), extracted from the bughouse analysis page's Move times / FEN & PGN tabs so other two-board pages can reuse the same widget. Behavior and visibility wiring was later folded directly into vnode construction (no post-insert DOM query pass) as a further application of the `dom-free-two-board-analysis-ctrl` change's no-imperative-DOM-manipulation rule (2026-07-26).

## Requirements

### Requirement: Tab widget lives in one reusable module with auto-generated ids
The two-board tab widget SHALL live entirely in `client/two-board/common/tabs.ts`, exposed as a single entry point `renderTabbedPanels(container, panels, ariaLabel, hideTabList?)` taking a list of `{ label, panelClass?, content }` definitions and returning the fully-assembled container VNode (panels + tablist), with all behavior and initial visibility wired directly into the vnodes at creation time — no separate init step, and no `document.querySelector`/`addEventListener` DOM-query pass after insertion. Callers MUST NOT supply tab or panel ids; the module SHALL generate them internally from each definition's position in the list. Each tab vnode SHALL carry its click-to-switch handler directly (`on: { click }`); the index-0 panel SHALL carry its initial `display: flex` directly (relying on the page stylesheet's `display: none` default for all other panels); passing `hideTabList: true` SHALL set `display: none` directly on the tablist vnode. No two-board page SHALL hand-write ARIA tab markup, assemble tab/panel ids itself, implement click-switching behavior inline, or call a separate post-render init function; pages consume the single `renderTabbedPanels` call instead.

#### Scenario: Tab position determines identity and default state
- **WHEN** `renderTabbedPanels` builds markup for a list of panel definitions
- **THEN** the tab/panel at index 0 is marked selected (`aria-selected="true"`) and default (`tabindex="0"`), all others are unselected with `tabindex` equal to their index, and each tab/panel pair's ids are generated from that same index — with no `id` or `panelId` field accepted from the caller

#### Scenario: Per-panel styling hook
- **WHEN** a panel definition includes `panelClass`
- **THEN** the panel's wrapper element carries that class (in addition to its auto-generated id and ARIA attrs), so CSS can target the panel without depending on its generated id

#### Scenario: Click-to-switch behavior
- **WHEN** a user clicks a tab rendered by `renderTabbedPanels`
- **THEN** that tab becomes `aria-selected="true"` (others become `false`), all tabpanels are hidden, and the panel named by the clicked tab's `aria-controls` is shown — driven by a click handler attached to the tab vnode itself, with no separate wiring step required after the page renders

#### Scenario: Collapsed mode
- **WHEN** a page calls `renderTabbedPanels(container, panels, ariaLabel, true)` (e.g. because there is nothing meaningful to switch to)
- **THEN** the tablist element renders already hidden and the default (index-0) panel renders already visible, with no other panel reachable, and no follow-up call is needed to achieve this state

### Requirement: Bughouse analysis page consumes the shared widget
The bughouse analysis page (`client/two-board/analysis/`) SHALL build its Move times / FEN & PGN tabs via a single `renderTabbedPanels('under-board', panels, 'Analysis Tabs', isAnalysisBoard)` call in `analysis.ts`, where `isAnalysisBoard` (`model['gameId'] === ''`) both selects the collapsed (no-game) mode and is computed once in `analysis.ts` for reuse by other view decisions. `analysisCtrl.ts` MUST NOT reference the tabs module at all — no `initTabs`/`hideTabList`-equivalent call, import, or other tab-related wiring in the controller. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'`, styled by a rule of that name in `static/bughouse.css` with the same properties (`font-size`, `flex-flow`) the panel had via its previous literal `#panel-4` id in `static/analysis.css`. This SHALL be the only two-board page in scope for this change; the single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s existing `#panel-4` rule are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before, and the FEN/PGN panel retains its font-size/flex-flow styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** the tablist renders hidden and the default panel renders visible, exactly as before, with no controller-side call involved in reaching that state

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change
