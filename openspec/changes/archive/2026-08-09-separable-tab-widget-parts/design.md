## Context

`renderTabbedPanels(container, id, panels, ariaLabel, hideTabList?)` builds panel vnodes, a tablist vnode, and returns them wrapped in a container the caller names by selector. Selection is already free of the DOM: `select()` closes over the retained tab and panel vnodes and sets attributes and inline display on their `.elm`. A live test on 2026-08-09 moved the tablist out of the widget into another grid area and confirmed switching still worked, and confirmed a rotated tablist (`writing-mode: vertical-rl`) still worked.

Both consumers currently mount the returned vnode as a single grid item: the analysis page as `under-board`, the round page as `div.bug-round-tools`.

The other widgets in `client/two-board/` are classes that build their vnodes once and hand them out — `MovelistView.placeholder()`, `GameInfoView.placeholder()`, `RoundSeatView.view()`. This change brings the tab widget into that shape.

## Goals / Non-Goals

**Goals:**

- The tablist and the panel area are separately mountable, in different containers or different grid areas.
- The widget owns no container element.
- Show/hide is expressed against the content vnodes the widget retains, not against ids or selectors.
- Both existing pages render as they do today.

**Non-Goals:**

- Actually relocating either page's tablist. This change makes it possible; nothing moves yet.
- Programmatic tab selection from outside. Still no consumer.
- Accessibility work — positive `tabindex`, arrow-key navigation, and `aria-owns` for a separated tablist — all deferred with the rest of the UI pass.
- Changing panel content, panel classes, or the `--panel-height` situation.

## Decisions

### 1. A constructed object with two exposed vnodes, not a function returning two things

```
new TabbedPanels(id, panels, ariaLabel)
  .tabList()   -> VNode   mounted where the page wants the switcher
  .panels()    -> VNode   mounted where the page wants the content
```

Construction and placement stop being one event, which is the whole point: the page builds the widget once and then decides, per layout, where each part goes. It also matches the surrounding convention — build in the constructor, expose through methods.

Alternative considered: keep a function and return `{ tabList, panels }`. Rejected as the same thing with a worse fit for the codebase, and it reads as though the two are produced together and must be used together.

### 2. The getters expose the retained vnodes; they never rebuild

This is the load-bearing detail. `select()` works by holding vnodes and touching `.elm` after the page's patch. A getter that built a fresh vnode per call would hand the page a vnode the widget is not holding, so switching would act on elements that were never mounted — and it would fail intermittently rather than obviously, depending on how many times the getter was called. The vnodes are built in the constructor and the getters return those same objects.

### 3. This departs from "one composed view per widget", deliberately

The convention recorded during the seat-strip work is that a multi-element widget exposes one composed view rather than a placeholder per leaf — `RoundSeatView.view(pocket)` rather than separate clock and name placeholders. That rule is about leaves that always sit together. Here the two parts are explicitly meant to sit apart, so exposing them separately is the requirement rather than a violation of it. Recorded here so the departure is visible rather than silent.

### 4. Show/hide addresses vnodes, ids stay only for ARIA

The widget identifies a panel by the vnode it holds, never by looking anything up. Ids remain on the elements because `aria-controls` and `aria-labelledby` are id references and have no vnode equivalent — but no widget behaviour reads them. The construction id is a prefix: `<id>-tablist` and `<id>-tabpanels` for the two mounted elements, `<id>-tab-<i>` and `<id>-panel-<i>` as now.

### 5. `hideTabList` is removed rather than kept

It existed to render the tablist already hidden for the no-game analysis board. With the tablist a separate vnode, that page simply does not mount it. The default panel's visibility is independent and unchanged. One parameter and one branch disappear.

### 6. The panel area is a real element, and that adds one box per page

Panels are currently direct children of the widget container. Giving the content its own mountable vnode means an element wraps them. So the DOM is *not* byte-identical after this change: `#round-tabs > [role=tabpanel]` becomes `#round-tabs-tabpanels > [role=tabpanel]`, with the page's own container above. Each page is expected to look the same; the CSS keyed to the old structure moves with it.

Alternative considered: expose an array of panel vnodes and let the page mount them itself. Rejected — it pushes the widget's internal structure onto every caller, and a page would have to know how many panels there are to place them.

## Risks / Trade-offs

- **The extra element changes CSS that assumed the old structure.** The round page's flex column, `min-width: 0`/`min-height: 0` and `overflow: hidden auto` are all keyed to `#round-tabs` and its direct children. → Move them onto the page container and the new panel-area element deliberately, and re-measure the narrow-width behaviour, which is what those rules exist for.
- **Two pages change at once**, and the analysis page has no game-driven test path for its tabs. → The no-game board covers collapsed mode; the switching path is exercised by revealing the tablist, as in the previous change's reference capture.
- **A separated tablist is an accessibility problem waiting** — tabs far from their panels need `aria-owns` and a sane focus order. → Nothing is separated in this change, so nothing regresses; the debt is already on the deferred list and should be paid before the first real separation ships.
- **`hideTabList` removal is a behaviour change if any caller relied on the element existing but hidden.** → Only the analysis page passes it, and only to hide the switcher on the no-game board; not mounting it is equivalent for every rule in `site.css`, which keys off `[role=tablist]`.

## Migration Plan

Widget first, then each page's markup, then the CSS that follows the new structure. Both pages must be re-checked in the same pass, since the widget's old signature disappears and nothing compiles until both are updated. Rollback is per-step; no persistence and no server surface.

## Open Questions

- ~~Whether `<id>-tabs` is the right name for the panel area.~~ **Settled before implementation: `<id>-tabpanels`.** It pairs with `<id>-tablist` and matches the `role="tabpanel"` the elements inside it carry, where `-tabs` read as a synonym for the tablist.
- ~~Whether the round page's container should keep the id it has today (`round-tabs`).~~ **Settled before implementation: it does not.** The container reverts to being identified by its class, `div.bug-round-tools`, as it was before tabs existed, and `round-tabs` stays purely the widget's id prefix with a single owner. Keeping the id would put the same name on page markup and on widget-generated children, inviting the assumption that renaming one renames the others when they come from a separate constructor argument.
