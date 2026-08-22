## Why

The tab widget assumes a tab's content is one dom-tree in one place. `TabbedPanels` builds a wrapper per tab and puts **all** of them inside a single `tabPanelsVnode`, so everything a tab shows must sit inside that one container.

The round page's chat tab is not shaped like that. It is two pieces — a preset-buttons block and a chat text area with its input — and the portrait and landscape layouts want them in different parts of the grid, not stacked in one box. There is no way to express that today: a tab is one panel, and one panel is one child of one container.

The widget already separates the **tablist** from the **panel area** precisely so a page can put the switcher wherever the layout wants. This change extends the same freedom to the content: the parts of a tab should be placeable independently, and the widget should stay agnostic about where each one lands.

## What Changes

- **A tab is defined as an ordered list of parts** rather than a single content list. Each part is its own dom-tree with its own optional styling hook.
- **Every part is its own independent mount point.** Three tabs of two parts each give **six** mount points, not two. The widget aggregates nothing: there is no container per tab and none per part index.
- **Part counts are per tab and unrelated to each other** — one tab may have three parts, the next one, the next two.
- **Parts are addressed by position**, `panel(tabIndex, partIndex)`, returning the parent vnode for that one part. The caller declared the tabs and their parts in that order, so it can name any part by the same coordinates it used to build them. A caller that prefers to keep its own references from construction may do that instead; both work, and the choice is the caller's.
- **Switching shows and hides all of a tab's parts together**, wherever each of them happens to be mounted.
- **`aria-controls` becomes a space-separated list** of the panel ids a tab controls, which is what the attribute is defined to accept. Ids gain a part index: `<id>-panel-<tab>-<part>`.
- **BREAKING for callers**: `TabPanelDef.content` is replaced by `TabPanelDef.parts`, and `tabPanels(): VNode` by `panel(tabIndex, partIndex): VNode`. Both in-repo consumers are updated in this change. No compatibility shim — nothing outside the repo consumes this module, and a shim would be an abstraction with no consumer.
- **No page's appearance or behaviour changes.** Both consumers declare one part per tab; each mounts its tabs' single parts inside the same element that holds its panel area today, so the rendered result is the same but for one fewer wrapper element.

Explicitly **not** in this change: rearranging the round page's tools across the three screen-size modes. That is the reason the widget is being reworked, and it will be defined separately. This change makes it expressible.

Preserved exactly as they are: auto-generated ids so two widgets cannot collide, ARIA tablist/tabpanel semantics, no selector or id lookup or DOM traversal anywhere in the module, selection by toggling element state rather than re-patching, and the selected tab living in the DOM rather than in a model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `two-board-tabs`: the widget's contract changes shape. A tab definition becomes an ordered list of parts; the single panel-area vnode becomes a list of panel-area vnodes, one per part index, ordered as declared; switching operates across all of them; and `aria-controls` carries a list. The requirement that the widget owns no container holding both parts is unchanged and now extends further — it owns no container spanning a tab's parts either.

`round-page-tools-tabs` is deliberately **not** modified. Its requirement that each panel receives one existing element unchanged still holds: the round page continues to declare one part per tab until the later layout change, so nothing about the round page's rendered result differs.

## Impact

- `client/two-board/common/tabs.ts` — the widget. Roughly: `TabPanelDef` gains `parts`, the panel construction gains a second dimension, `select()` iterates parts as well as tabs, and the panel-area vnode disappears in favour of an indexed accessor.
- `client/two-board/round/round.ts` and `client/two-board/analysis/analysis.ts` — both consumers updated to the new definition shape. Each declares a single part per tab and mounts that tab's one part where the panel area used to go.
- **One element fewer in the markup**: the `<id>-tabpanels` wrapper no longer exists, because the widget no longer groups panels.
- **`static/bughouse.css` — two rules must be re-homed, and they are load-bearing.** `#round-tabs-tabpanels` makes the panel area the flex item that claims the height the tablist bar leaves and passes it to the open panel; `#round-tabs-tabpanels > [role='tabpanel']` gives each panel `flex: 1 1 auto`, zero minimums and `overflow: hidden auto`. The zero minimums are what let the tools column be driven to nothing, which is what keeps both boards on screen at narrow widths, and the two-axis overflow is what stops the Info panel growing a horizontal scrollbar. The child selector cannot survive as written once its parent is gone.
- **Sizing responsibility moves from the widget to the page.** Today one container says "whichever panel is open fills this space". With parts mounted independently, each mount point states what its part does there. That is the intent — parts land in different places under different constraints — but it is work the page takes on, not work that disappears.
- `site.css`'s `div[role=tabpanel] { display: none; … }` is untouched: the default-hidden rule the widget relies on is on the panel, not the container.
- No server, API, persistence or i18n surface. The analysis page's `fenpgn-panel` hook moves from the panel definition to that panel's single part.
- The three-mode round-page rearrangement this unblocks will land as its own change, against `round-page-tools-tabs`.
