# two-board-tabs

## Purpose

A reusable ARIA tablist/tabpanel widget for `client/two-board/` pages: tab definitions, tablist/tab-attribute rendering, click-to-switch behavior, and a collapsed (tabs-hidden, single-default-panel) mode. Established by the `extract-two-board-tabs` change (2026-07-26), extracted from the bughouse analysis page's Move times / FEN & PGN tabs so other two-board pages can reuse the same widget. Behavior and visibility wiring was later folded directly into vnode construction (no post-insert DOM query pass) as a further application of the `dom-free-two-board-analysis-ctrl` change's no-imperative-DOM-manipulation rule (2026-07-26).
## Requirements
### Requirement: Tab widget lives in one reusable module with auto-generated ids

The two-board tab widget SHALL live entirely in `client/two-board/common/tabs.ts`, exposed as a **constructed widget object** taking the widget's id prefix, a list of tab definitions and an accessible label.

A tab definition SHALL be `{ label, parts }`, where `parts` is an **ordered list** of `{ panelClass?, content }`. Each part is one dom-tree belonging to that tab. A tab whose content is a single tree declares a single part.

The widget SHALL expose the **tablist**, and **one independently mountable vnode per part**. Every part of every tab SHALL be its own mount point: three tabs of two parts each yield six. The widget SHALL aggregate nothing — it SHALL NOT build a container holding a tab's parts, nor one holding the same part index across tabs — and SHALL make no assumption about where any part is mounted.

A part SHALL be addressed by position, by the tab's index and the part's index within that tab. The caller declared both in that order, so it SHALL be able to name any part in the same terms it used to build it, without the widget naming or otherwise describing the parts. A caller MAY instead retain the vnodes it supplied and mount those; both SHALL work.

Part counts SHALL be independent per tab: one tab may declare three parts, another one, another two. The widget SHALL NOT derive a maximum, pad a tab with fewer parts, or reserve anything for a part that was not declared.

All behavior and initial visibility SHALL be wired directly into the vnodes at construction time — no separate init step, and no `document.querySelector`/`addEventListener` DOM-query pass after insertion.

The widget SHALL NOT build or own any container: not one holding the tablist and a panel together, not one spanning a tab's several parts, and not one grouping panels across tabs. A page that wants any of them inside one element SHALL supply that element itself. Every exposed vnode SHALL be independently mountable: a page may place them in different containers, in different grid areas, or in any order, and switching SHALL continue to work.

Each exposed vnode SHALL be built once at construction and the same object returned on every access. A getter MUST NOT rebuild, because selection operates on the vnodes the widget retains: handing out a vnode the widget is not holding would leave switching acting on elements that were never mounted.

Callers MUST NOT supply tab or panel ids; the module SHALL generate them internally from each definition's position, prefixed by the widget id the caller supplied — `<id>-tab-<index>` for a tab and `<id>-panel-<tabIndex>-<partIndex>` for a panel — so that two widgets rendered on the same page never produce colliding ids. The tablist SHALL carry `<id>-tablist`. There SHALL be no panel-area element and therefore no id for one.

A tab's `aria-controls` SHALL list the ids of every panel that tab controls, space-separated, which is what the attribute is defined to accept.

Showing and hiding panels SHALL be performed against the content vnodes the widget retains. The module SHALL NOT identify a panel by id, by selector, or by traversal; ids exist on the elements only because `aria-controls` and `aria-labelledby` are id references, and no widget behavior SHALL read them.

Each tab vnode SHALL carry its click-to-switch handler directly (`on: { click }`); the index-0 tab's panels SHALL carry their initial visible display directly, relying on the page stylesheet's `display: none` default for all other panels. There SHALL be no parameter for hiding the tablist: a page with nothing meaningful to switch to simply does not mount the tablist vnode, and the default tab's panels are visible either way.

No two-board page SHALL hand-write ARIA tab markup, assemble tab/panel ids itself, implement click-switching behavior inline, or call a separate post-render init function.

#### Scenario: Tab position determines identity and default state
- **WHEN** the widget builds markup for a list of tab definitions
- **THEN** the tab at index 0 is marked selected (`aria-selected="true"`) and default (`tabindex="0"`), all others are unselected with `tabindex` equal to their index, and each tab's and panel's ids are generated from their positions — with no `id` or `panelId` field accepted from the caller

#### Scenario: Widget id namespaces every generated id
- **WHEN** two widgets are constructed on the same page with different widget ids
- **THEN** every tab, panel, tablist and panel-area id in the first differs from every one in the second

#### Scenario: The two parts mount independently
- **WHEN** a page mounts the tablist vnode and a panel in different containers
- **THEN** clicking a tab still shows that widget's corresponding panels, and no common ancestor is required

#### Scenario: A tab's parts mount independently
- **WHEN** a tab declares two parts and the page mounts them in different containers
- **THEN** selecting that tab shows both of its parts, selecting another tab hides both, and no common ancestor is required between them

#### Scenario: Mount points are independent across tabs
- **WHEN** three tabs each declare two parts
- **THEN** six separately mountable vnodes are available, and two tabs' parts of the same index may be mounted in different places without affecting switching

#### Scenario: A part is addressed by its tab and part position
- **WHEN** the caller asks for the part at a given tab index and part index
- **THEN** it receives the parent vnode of the part it declared at those positions, and the same object on every access

#### Scenario: Tabs may have different part counts
- **WHEN** one tab declares three parts, another one, and another two
- **THEN** each tab yields exactly that many mount points, and nothing is created, padded or reserved for a part that was not declared

#### Scenario: The widget contributes no container
- **WHEN** a page's rendered markup is inspected
- **THEN** the only elements the widget contributed are the tablist, one panel per declared part, and their descendants — any element holding several of them together is markup the page wrote

#### Scenario: Getters are stable
- **WHEN** an exposed vnode is accessed more than once
- **THEN** the same vnode object is returned each time, so the widget's retained references and the mounted elements are the same ones

#### Scenario: Per-panel styling hook
- **WHEN** a part declaration includes `panelClass`
- **THEN** that part's panel element carries that class (in addition to its auto-generated id and ARIA attrs), so CSS can target the panel without depending on its generated id

#### Scenario: A tab controls every one of its panels
- **WHEN** a tab's markup is inspected
- **THEN** its `aria-controls` names the id of each of that tab's panels, and each of those panels names that tab in `aria-labelledby`

#### Scenario: Click-to-switch behavior
- **WHEN** a user clicks a tab
- **THEN** that tab becomes `aria-selected="true"` (others become `false`), every panel of every other tab is hidden, and all panels belonging to the clicked tab are shown wherever each is mounted — resolved through the vnodes the widget retained, with no selector, id lookup or DOM traversal involved

#### Scenario: A page with no switcher
- **WHEN** a page mounts the panels but not the tablist
- **THEN** the default tab's panels render visible, no tab switcher appears, and no parameter was needed to arrange it

### Requirement: Two-board pages consume the shared widget

The bughouse analysis page (`client/two-board/analysis/`) SHALL construct the widget in `analysis.ts` with its own id prefix and mount its panels — and, when the page describes a game, its tablist — inside the `under-board` element, which the page itself renders. `isAnalysisBoard` (`model['gameId'] === ''`) SHALL decide whether the tablist is mounted, and SHALL continue to be computed once in `analysis.ts` for reuse by other view decisions. `analysisCtrl.ts` MUST NOT reference the tabs module at all. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'` on its part, styled by a rule of that name in `static/bughouse.css`.

The bughouse round page (`client/two-board/round/`) SHALL construct the widget with its own id prefix and mount the tablist and its panels inside the tools-area element, which the page itself renders.

Both pages SHALL declare a single part per tab and mount that one part per tab, so both SHALL render as they did before this change apart from the removal of the panel-area wrapper. Multi-part placement is available to them but is not exercised here; the round page's use of it is a separate change.

The single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s id-keyed panel rules are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before, and the FEN/PGN panel retains its styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** no tablist is present in the markup, the default panel renders visible, and no controller-side call is involved in reaching that state

#### Scenario: Each page owns the element that holds both parts
- **WHEN** either page's markup is inspected
- **THEN** the element containing the tablist and the panels is one the page rendered, and the widget rendered only those parts inside it

#### Scenario: Two consumers, no interference
- **WHEN** the analysis page and the round page are each rendered
- **THEN** each constructs its own widget, and neither page's ids appear in the other

#### Scenario: Single-part consumers are unchanged on screen
- **WHEN** either page is compared before and after this change
- **THEN** the tabs, the panel contents and the switching behaviour are the same, and the only markup differences permitted are the generated ids and the absence of the panel-area wrapper

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change

