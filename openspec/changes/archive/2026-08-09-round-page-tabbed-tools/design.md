## Context

`client/two-board/common/tabs.ts` exposes one function, `renderTabbedPanels(container, panels, ariaLabel, hideTabList?)`, which returns a finished VNode: panels first, tablist last, click-to-switch wired into the tab vnodes at creation time. It has one consumer, the bughouse analysis page. Its styling already lives in `static/site.css` (`div[role=tabpanel]`, `div[role=tablist]`, `span[role=tab]`), not in a page stylesheet, so a second page inherits the whole appearance for free. That is why reuse is cheap.

Two things in it are written for a world with exactly one widget. Ids are `tab-<i>` / `panel-<i>`, generated from position; and selection is performed by walking up from the clicked element — `parentNode` (tablist) → `parentNode` (container) → `parentNode` (the container's parent) — then `querySelector('#' + ariaControls)` from there. Both work for a single widget on a page and stop working for two.

The round page's tools column is `div.bug-round-tools`, already `display: flex; flex-flow: column` in the `tools` grid area, and already carries `min-width: 0; overflow: hidden` from the narrow-viewport fix. It holds only `div#bugroundchat`. The content this change surfaces lives in two places: `div.movelist-block` inside `div.bug-round-tools-part` (grid area `toolsB`, below the boards), and the `GameInfoView` placeholder inside `aside.sidebar-first`.

How that content is rendered matters to the design. None of the three is rendered by the round view: `MovelistView` and `GameInfoView` each retain a vnode and patch it in place, and the chat renders into `#bugroundchat` after insertion. The round view embeds placeholders; other owners patch them later.

## Goals / Non-Goals

**Goals:**

- Two widgets can coexist on a page without their ids or their selection logic colliding.
- The widget performs no DOM queries at all.
- The round page's chat, movelist and game info are reachable in every layout mode, from the one grid area that is always on screen.
- The widget imposes no minimum size: it can be driven to zero width and zero height by its container without pushing the grid wider or taller.

**Non-Goals:**

- Changing the content of the chat, movelist or game info, or how any of them is rendered or patched.
- Relocating `div#offer-dialog` or `div#game-controls`. They stay unreachable in short landscape for now; that is a separate decision.
- Programmatic tab selection. There is no consumer for it in this change, so no API is added for it.
- Fixing the widget's accessibility (positive `tabindex`, absent arrow-key navigation), which is deferred as a UI-wide pass.
- Changing the analysis page's fixed `--panel-height: 240px`, or the `div[role=tabpanel] { height: var(--panel-height) }` rule in `site.css`.
- Panel inner layout. Each tab is given exactly one child element, so the panel's `display: flex` and its row default cannot affect how that child arranges its own contents.

## Decisions

### 1. The widget's id is a parameter, and every generated id is prefixed with it

`renderTabbedPanels` takes the widget's own element id and applies it both to the container and as the prefix for `<id>-tab-<i>` and `<id>-panel-<i>`. Callers still never name an individual tab; position continues to determine identity.

Alternative considered: keep bare ids and merely scope the lookup to the widget's own subtree. Rejected because duplicate ids are invalid regardless of how the widget finds its own elements — `aria-controls` and `aria-labelledby` are resolved document-wide by assistive technology, so two widgets would announce each other's panels even if clicking behaved correctly.

The prefix is interpolated into ids only, never into a selector (see decision 2), so it does not need to be a valid CSS identifier for the widget's own sake — but it should still be one, since page stylesheets may want to target it.

### 2. Selection addresses retained vnode elements; the widget contains no selectors

`renderTabbedPanels` builds its tab and panel vnodes into two arrays, and the click handler closes over them. After the page's patch each vnode carries `.elm`, so switching is: set `aria-selected` on the tab elements, set `display` on the panel elements. No `document`, no `querySelector`, no traversal, no dependence on the tablist and panels being direct children.

Alternative considered — and rejected: hold `selectedIndex` in the widget and re-patch the container vnode on each click, which is the more idiomatic snabbdom approach. It breaks this page. `MovelistView` and `GameInfoView` retain their own vnodes and patch them; the chat renders into `#bugroundchat` after it is inserted. Re-patching the container would diff those subtrees and can replace the very elements those owners hold references to, leaving them patching detached nodes — the movelist and game info would silently stop updating. Holding element references gives the same "no selectors" property without re-rendering content the widget does not own.

This keeps selection state in the DOM rather than in a model. That is a real limitation: if anything ever re-patches the whole widget container, the open tab resets to index 0. Nothing on the round page does — every owner patches inside a panel, not the container — but it is a constraint the round page now depends on.

### 3. The widget *is* the tools container, not something placed inside it

The container argument is a selector string handed to `h()`, so the round page passes `div#<id>.bug-round-tools` and the widget becomes the existing grid item. Its `grid-area: tools`, its flex column, and the `min-width: 0; overflow: hidden` rule that keeps the boards on screen at narrow widths all continue to apply unchanged.

Alternative considered: nest the widget inside `div.bug-round-tools`. Rejected as a redundant box — it would need the same sizing rules restated on it, and every one of them is a chance to disagree with the parent.

### 4. Sizing is inherited from the container in both axes

The tools column already has a definite height from the grid. The widget is a flex column: the tablist takes its natural height (`flex: 0 0 auto`), the panel area takes the rest (`flex: 1 1 auto`) with `min-height: 0` so it can shrink below its content, and scrolls internally. `min-width: 0` and `min-height: 0` on the widget and its panels are what let the container drive it to zero in either axis.

Panels state overflow on both axes at once — `overflow: hidden auto`. Setting only `overflow-y: auto` is not equivalent: CSS computes a `visible` axis to `auto` when the other axis is not `visible`, so the horizontal axis would silently become scrollable. The dry run showed exactly that, the Info panel growing a horizontal scrollbar once the column was narrower than the game-info's roughly 170px min-content width.

`site.css` sets `height: var(--panel-height)` on every tabpanel, and `--panel-height` is defined only in `analysis.css`, which the round page does not load. The declaration is therefore invalid at computed-value time and `height` falls back to its initial `auto` — which is what this design wants. We rely on that fallback deliberately rather than defining the variable, and record it here because it is inheritance-by-absence and would not otherwise be obvious. If the fixed height is ever wanted on the round page, it is the variable that should be set, not the rule that should be changed.

### 5. Labels truncate; they never set a floor on the width

`span[role=tab]` is `flex: 1 1 0` in `site.css`, so tabs already share the tablist evenly. What stops them shrinking is the automatic minimum size of a flex item, so the round page's tabs get `min-width: 0` plus `overflow: hidden`, letting the text clip as the column narrows. No ellipsis and no minimum label width: the goal is that the widget never contributes to the grid's min-content, because the chat column yielding is precisely what keeps both boards on screen.

### 6. Tab order is Chat, Moves, Info, with Chat default

Chat is index 0 because it is the panel a player needs continuously — partner communication is live, and the other two are consulted. This is the one part of the design that the dry run is most likely to challenge: with chat in a tab, looking at the movelist means not seeing the chat. That trade is accepted for now precisely so it can be judged in place.

## Risks / Trade-offs

- **The analysis page's FEN & PGN panel loses styling it was getting by accident.** `analysis.css:416` declares `div#request-analysis, div#panel-1 { align-items: center; justify-content: center; }` for the single-board page, but the two-board page loads the same stylesheet and generates a `panel-1`, so that rule has been applying to its FEN & PGN panel. Prefixed ids end the collision. → Compare the panel before and after; if the centring is wanted, restore it explicitly on `.fenpgn-panel`, which already exists for exactly this reason. Do not restore it by keeping the id collision.
- **Moving the movelist out of `div.bug-round-tools-part` orphans a CSS rule.** `.bug-round-tools-part .movelist-block` no longer matches. → Re-home it onto the movelist itself or the panel; check what it contributed before deleting it.
- **`aside.sidebar-first` becomes empty** once the game-info placeholder moves. → Leave the element in place in this change and note it; whether an empty aside should still render is a layout question that touches modes this change is not otherwise altering.
- **Selection state lives in the DOM.** Any future re-patch of the widget container silently resets to the Chat tab. → Documented in decision 2 and stated as a requirement so a later change cannot break it unknowingly.
- **Chat is no longer permanently visible.** A message arriving while the player is on Moves or Info gives no indication. → Accepted for the first cut; an unread indicator or automatic switch would need the programmatic selection this change deliberately omits.
- **Three tab labels in a very narrow column.** On an iPhone SE landscape viewport the tools column is about 52px wide; three labels will be clipped to near-nothing. → The widget is still correct — it yields rather than forcing the boards off screen — but it will not be usable at that width, and the dry run should show how narrow is too narrow.

## Migration Plan

The widget refactor lands first and is inert: prefixing ids and replacing the traversal changes no behaviour for a page with one widget, so the analysis page is expected byte-identical apart from the `#panel-1` collision noted above. The round page's markup change follows, then its CSS. Rollback is per-step; nothing is persisted and no server surface is involved.

## Open Questions

- Whether Chat should be the default once the three tabs are seen together, or whether the movelist is what a player actually wants on screen between moves.
- Where `div#offer-dialog` and `div#game-controls` belong. They remain unreachable in short landscape after this change, which is the strongest argument for a fourth tab — but they are controls rather than content, and the answer may be that they should not be in a tab at all.
- ~~Whether the tablist should render before its panels on the round page.~~ **Settled by the dry run:** emitted after the panels it reads as a bottom tab bar and looks right in the column. No CSS ordering is applied.
