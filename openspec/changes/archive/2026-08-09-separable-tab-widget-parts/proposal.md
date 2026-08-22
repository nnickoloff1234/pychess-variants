## Why

`renderTabbedPanels` returns one assembled vnode — panels and tablist inside a container the widget builds. A caller therefore mounts the widget in exactly one place, which is the only thing now preventing the two parts from being placed independently: since the widget stopped querying the DOM and began addressing its retained vnodes, switching has had no proximity requirement at all. Moving the tablist into a different grid area entirely and clicking a tab still selects the right panel — verified live on 2026-08-09.

Somewhere to put the tablist other than directly above its panels is wanted soon: the desktop (`min-height: 600px`) layout has an empty fourth column and an empty 743px sidebar, and the draw and resign buttons are unreachable in short landscape and need a home that is always visible. Rather than discover the constraint then, the widget stops assembling a container now.

## What Changes

- Replace the `renderTabbedPanels` function with a constructed widget object that builds its vnodes once and exposes them: **one vnode for the tablist**, and **one vnode for the panel area** in which the tab contents are rendered. Callers mount the two wherever they like.
- **The widget no longer builds a common container.** Where a page wants the two parts inside one element — as both current pages do — that element becomes the page's own markup, not the widget's.
- Show/hide SHALL work through the retained content vnodes the object holds, never through ids or selectors. Ids remain only for the ARIA relationships that require them.
- The construction id becomes a **prefix** for the two mounted elements — `<id>-tablist` and `<id>-tabpanels` — alongside the existing per-tab and per-panel ids.
- **BREAKING** for callers: `renderTabbedPanels(container, id, panels, ariaLabel, hideTabList?)` is gone. Both consumers — the bughouse analysis page and the bughouse round page — are refactored in this change to construct the widget the new way and mount its two parts inside the container they now own, so each page renders as it does today.
- `hideTabList` disappears with the container: a page that wants no tab switcher simply does not mount the tablist vnode. The default panel is visible either way.

## Capabilities

### Modified Capabilities

- `two-board-tabs`: the entry point changes from a function returning an assembled container to an object exposing its tablist and panel-area vnodes; the widget no longer owns a container; the `hideTabList` parameter is removed; show/hide is specified against retained vnodes rather than ids.
- `round-page-tools-tabs`: the requirement that the tools grid item *is* the widget's own container no longer holds — the round page now owns that element and mounts the widget's two parts inside it.

## Impact

- `client/two-board/common/tabs.ts` — becomes a widget class; loses the container and `hideTabList`; gains the two exposed vnodes.
- `client/two-board/analysis/analysis.ts` — constructs the widget and renders `under-board` itself, mounting the panel area and (for a game) the tablist inside it.
- `client/two-board/round/round.ts` — same, with `div.bug-round-tools` becoming page markup again.
- `static/bughouse.css` — the round page's widget rules are keyed to `#round-tabs` and its direct children; they move to the new element ids now that a panel-area element sits between the container and the panels.
- **The rendered DOM gains one element per page**: the panel area is now its own box, where panels used to be direct children of the widget container. Each page is expected to *look* unchanged; it is not byte-identical markup, and the CSS that assumes `#round-tabs > [role=tabpanel]` must follow.
- No server, API, persistence or i18n surface is touched; no new tab labels.
