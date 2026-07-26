## ADDED Requirements

### Requirement: Tab widget lives in one reusable module with auto-generated ids
The two-board tab widget SHALL live entirely in `client/two-board/common/tabs.ts`, exposed as a single entry point `renderTabbedPanels(container, panels, ariaLabel)` taking a list of `{ label, panelClass?, content }` definitions and returning the fully-assembled container VNode (panels + tablist). Callers MUST NOT supply tab or panel ids; the module SHALL generate them internally from each definition's position in the list. `initTabs()` SHALL wire click-to-switch behavior and reveal the initially-selected panel; `hideTabList()` SHALL collapse the UI to just the default panel. No two-board page SHALL hand-write ARIA tab markup, assemble tab/panel ids itself, or implement click-switching behavior inline; pages consume the module's exports instead.

#### Scenario: Tab position determines identity and default state
- **WHEN** `renderTabbedPanels` builds markup for a list of panel definitions
- **THEN** the tab/panel at index 0 is marked selected (`aria-selected="true"`) and default (`tabindex="0"`), all others are unselected with `tabindex` equal to their index, and each tab/panel pair's ids are generated from that same index — with no `id` or `panelId` field accepted from the caller

#### Scenario: Per-panel styling hook
- **WHEN** a panel definition includes `panelClass`
- **THEN** the panel's wrapper element carries that class (in addition to its auto-generated id and ARIA attrs), so CSS can target the panel without depending on its generated id

#### Scenario: Click-to-switch behavior
- **WHEN** a user clicks a tab rendered by `renderTabbedPanels` after `initTabs()` has run
- **THEN** that tab becomes `aria-selected="true"` (others become `false`), all tabpanels are hidden, and the panel named by the clicked tab's `aria-controls` is shown

#### Scenario: Collapsed mode
- **WHEN** a page calls `hideTabList()` (e.g. because there is nothing meaningful to switch to)
- **THEN** the tablist element is hidden and the default (`tabindex="0"`) panel remains visible, with no other panel reachable

### Requirement: Bughouse analysis page consumes the shared widget
The bughouse analysis page (`client/two-board/analysis/`) SHALL build its Move times / FEN & PGN tabs via a single `renderTabbedPanels('under-board', panels, 'Analysis Tabs')` call in `analysis.ts`, and SHALL wire behavior in `analysisCtrl.ts`'s constructor via `initTabs()` and, when there is no game (`isAnalysisBoard`), `hideTabList()`. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'`, styled by a rule of that name in `static/bughouse.css` with the same properties (`font-size`, `flex-flow`) the panel had via its previous literal `#panel-4` id in `static/analysis.css`. This SHALL be the only two-board page in scope for this change; the single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s existing `#panel-4` rule are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before the extraction, and the FEN/PGN panel retains its font-size/flex-flow styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** the tablist is hidden and the default panel is shown, exactly as before the extraction, with the default panel revealed exactly once (no redundant duplicate reveal call)

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change
