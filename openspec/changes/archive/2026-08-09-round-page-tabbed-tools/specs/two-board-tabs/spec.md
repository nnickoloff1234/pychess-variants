## MODIFIED Requirements

### Requirement: Tab widget lives in one reusable module with auto-generated ids
The two-board tab widget SHALL live entirely in `client/two-board/common/tabs.ts`, exposed as a single entry point `renderTabbedPanels(container, id, panels, ariaLabel, hideTabList?)` taking the widget's own element id and a list of `{ label, panelClass?, content }` definitions, and returning the fully-assembled container VNode (panels + tablist), with all behavior and initial visibility wired directly into the vnodes at creation time — no separate init step, and no `document.querySelector`/`addEventListener` DOM-query pass after insertion.

Callers MUST NOT supply tab or panel ids; the module SHALL generate them internally from each definition's position in the list, **prefixed by the widget id the caller supplied** — `<id>-tab-<index>` and `<id>-panel-<index>` — so that two widgets rendered on the same page never produce colliding ids. The widget's container element SHALL carry that same id.

The module SHALL NOT query the document at any point, including when switching panels. Selection SHALL be performed against the tab and panel vnodes the module built and retained, addressing their elements directly; it SHALL NOT locate elements by selector, by id lookup, or by traversing from the clicked element to a common ancestor. Consequently the widget SHALL NOT depend on the tablist and the panels being direct children of its container.

Each tab vnode SHALL carry its click-to-switch handler directly (`on: { click }`); the index-0 panel SHALL carry its initial `display: flex` directly (relying on the page stylesheet's `display: none` default for all other panels); passing `hideTabList: true` SHALL set `display: none` directly on the tablist vnode. No two-board page SHALL hand-write ARIA tab markup, assemble tab/panel ids itself, implement click-switching behavior inline, or call a separate post-render init function; pages consume the single `renderTabbedPanels` call instead.

#### Scenario: Tab position determines identity and default state
- **WHEN** `renderTabbedPanels` builds markup for a list of panel definitions
- **THEN** the tab/panel at index 0 is marked selected (`aria-selected="true"`) and default (`tabindex="0"`), all others are unselected with `tabindex` equal to their index, and each tab/panel pair's ids are generated from that same index — with no `id` or `panelId` field accepted from the caller

#### Scenario: Widget id namespaces every generated id
- **WHEN** two widgets are rendered on the same page with different widget ids
- **THEN** every tab and panel id in the first widget differs from every tab and panel id in the second, and each widget's container carries the id its caller supplied

#### Scenario: Per-panel styling hook
- **WHEN** a panel definition includes `panelClass`
- **THEN** the panel's wrapper element carries that class (in addition to its auto-generated id and ARIA attrs), so CSS can target the panel without depending on its generated id

#### Scenario: Click-to-switch behavior
- **WHEN** a user clicks a tab rendered by `renderTabbedPanels`
- **THEN** that tab becomes `aria-selected="true"` (others become `false`), all tabpanels are hidden, and the panel controlled by the clicked tab is shown — resolved through the vnodes the module retained, with no selector or DOM traversal involved and no separate wiring step required after the page renders

#### Scenario: Switching is unaffected by surrounding markup
- **WHEN** a widget's tablist or panels are not direct children of its container, or another widget's panels appear earlier in the document
- **THEN** clicking a tab still shows that widget's own panel of the same index and affects no element outside the widget

#### Scenario: Collapsed mode
- **WHEN** a page calls `renderTabbedPanels` with `hideTabList` set (e.g. because there is nothing meaningful to switch to)
- **THEN** the tablist element renders already hidden and the default (index-0) panel renders already visible, with no other panel reachable, and no follow-up call is needed to achieve this state

### Requirement: Two-board pages consume the shared widget
The bughouse analysis page (`client/two-board/analysis/`) SHALL build its Move times / FEN & PGN tabs via a single `renderTabbedPanels` call in `analysis.ts` against the `under-board` container, supplying its own widget id and the `isAnalysisBoard` (`model['gameId'] === ''`) flag, where that flag both selects the collapsed (no-game) mode and is computed once in `analysis.ts` for reuse by other view decisions. `analysisCtrl.ts` MUST NOT reference the tabs module at all — no `initTabs`/`hideTabList`-equivalent call, import, or other tab-related wiring in the controller. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'`, styled by a rule of that name in `static/bughouse.css`.

The bughouse round page (`client/two-board/round/`) SHALL be a second consumer, building its tools-area panels through the same entry point with its own widget id.

Because panel ids are now namespaced by widget id, the two-board analysis page's panels SHALL no longer match id-keyed rules in `static/analysis.css` that were written for the single-board page. The FEN & PGN panel's appearance SHALL be preserved through its `panelClass` rule rather than through such a collision.

The single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s id-keyed panel rules are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before, and the FEN/PGN panel retains its styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** the tablist renders hidden and the default panel renders visible, exactly as before, with no controller-side call involved in reaching that state

#### Scenario: Two consumers, no interference
- **WHEN** the analysis page and the round page are each rendered
- **THEN** each builds its tabs through the same `renderTabbedPanels` entry point, and neither page's tab or panel ids appear in the other

#### Scenario: Analysis styling no longer relies on an id collision
- **WHEN** the two-board analysis page's FEN & PGN panel is inspected
- **THEN** every rule shaping it is keyed to its `panelClass`, and none is keyed to a generated panel id that the single-board page also uses

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change
