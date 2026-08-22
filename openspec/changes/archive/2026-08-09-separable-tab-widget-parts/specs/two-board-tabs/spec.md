## MODIFIED Requirements

### Requirement: Tab widget lives in one reusable module with auto-generated ids
The two-board tab widget SHALL live entirely in `client/two-board/common/tabs.ts`, exposed as a **constructed widget object** taking the widget's id prefix, a list of `{ label, panelClass?, content }` definitions and an accessible label, and exposing exactly two mountable vnodes: the **tablist** and the **panel area** in which the tab contents are rendered. All behavior and initial visibility SHALL be wired directly into the vnodes at construction time — no separate init step, and no `document.querySelector`/`addEventListener` DOM-query pass after insertion.

The widget SHALL NOT build or own a container that holds both parts. A page that wants the two inside one element SHALL supply that element itself. The two vnodes SHALL be independently mountable: a page may place them in different containers, in different grid areas, or in either order, and switching SHALL continue to work.

Each exposed vnode SHALL be built once at construction and the same object returned on every access. A getter MUST NOT rebuild, because selection operates on the vnodes the widget retains: handing out a vnode the widget is not holding would leave switching acting on elements that were never mounted.

Callers MUST NOT supply tab or panel ids; the module SHALL generate them internally from each definition's position in the list, prefixed by the widget id the caller supplied — `<id>-tab-<index>` and `<id>-panel-<index>` — so that two widgets rendered on the same page never produce colliding ids. The two mounted elements SHALL carry `<id>-tablist` and `<id>-tabpanels`.

Showing and hiding panels SHALL be performed against the content vnodes the widget retains. The module SHALL NOT identify a panel by id, by selector, or by traversal; ids exist on the elements only because `aria-controls` and `aria-labelledby` are id references, and no widget behavior SHALL read them.

Each tab vnode SHALL carry its click-to-switch handler directly (`on: { click }`); the index-0 panel SHALL carry its initial `display: flex` directly, relying on the page stylesheet's `display: none` default for all other panels. There SHALL be no parameter for hiding the tablist: a page with nothing meaningful to switch to simply does not mount the tablist vnode, and the default panel is visible either way.

No two-board page SHALL hand-write ARIA tab markup, assemble tab/panel ids itself, implement click-switching behavior inline, or call a separate post-render init function.

#### Scenario: Tab position determines identity and default state
- **WHEN** the widget builds markup for a list of panel definitions
- **THEN** the tab/panel at index 0 is marked selected (`aria-selected="true"`) and default (`tabindex="0"`), all others are unselected with `tabindex` equal to their index, and each tab/panel pair's ids are generated from that same index — with no `id` or `panelId` field accepted from the caller

#### Scenario: Widget id namespaces every generated id
- **WHEN** two widgets are constructed on the same page with different widget ids
- **THEN** every tab, panel, tablist and panel-area id in the first differs from every one in the second

#### Scenario: The two parts mount independently
- **WHEN** a page mounts the tablist vnode and the panel-area vnode in different containers
- **THEN** clicking a tab still shows that widget's corresponding panel, and no common ancestor is required

#### Scenario: The widget contributes no container
- **WHEN** a page's rendered markup is inspected
- **THEN** the only elements the widget contributed are the tablist, the panel area, and their descendants — any element holding both is markup the page wrote

#### Scenario: Getters are stable
- **WHEN** an exposed vnode is accessed more than once
- **THEN** the same vnode object is returned each time, so the widget's retained references and the mounted elements are the same ones

#### Scenario: Per-panel styling hook
- **WHEN** a panel definition includes `panelClass`
- **THEN** the panel's wrapper element carries that class (in addition to its auto-generated id and ARIA attrs), so CSS can target the panel without depending on its generated id

#### Scenario: Click-to-switch behavior
- **WHEN** a user clicks a tab
- **THEN** that tab becomes `aria-selected="true"` (others become `false`), all tabpanels are hidden, and the panel that tab controls is shown — resolved through the vnodes the widget retained, with no selector, id lookup or DOM traversal involved

#### Scenario: A page with no switcher
- **WHEN** a page mounts the panel area but not the tablist
- **THEN** the default panel renders visible, no tab switcher appears, and no parameter was needed to arrange it

### Requirement: Two-board pages consume the shared widget
The bughouse analysis page (`client/two-board/analysis/`) SHALL construct the widget in `analysis.ts` with its own id prefix and mount its panel area — and, when the page describes a game, its tablist — inside the `under-board` element, which the page itself renders. `isAnalysisBoard` (`model['gameId'] === ''`) SHALL decide whether the tablist is mounted, and SHALL continue to be computed once in `analysis.ts` for reuse by other view decisions. `analysisCtrl.ts` MUST NOT reference the tabs module at all. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'`, styled by a rule of that name in `static/bughouse.css`.

The bughouse round page (`client/two-board/round/`) SHALL construct the widget with its own id prefix and mount both parts inside the tools-area element, which the page itself renders.

Both pages SHALL render as they did before this change. The rendered markup is not required to be identical — the panel area is an element that did not previously exist — but no page's appearance or behaviour SHALL change.

The single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s id-keyed panel rules are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before, and the FEN/PGN panel retains its styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** no tablist is present in the markup, the default panel renders visible, and no controller-side call is involved in reaching that state

#### Scenario: Each page owns the element that holds both parts
- **WHEN** either page's markup is inspected
- **THEN** the element containing the tablist and the panel area is one the page rendered, and the widget rendered only the two parts inside it

#### Scenario: Two consumers, no interference
- **WHEN** the analysis page and the round page are each rendered
- **THEN** each constructs its own widget, and neither page's ids appear in the other

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change
