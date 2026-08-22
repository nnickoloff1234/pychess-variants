## Why

On the bughouse round page everything below the boards is unreachable. In the short-landscape mode the movelist sits at y≈944 in a 551px viewport, and that mode sets `body { height: 100vh; overflow: hidden }` so the page cannot scroll to it. The consequence is not cosmetic: the move list, the move-navigation buttons, the offer dialog and the game controls are all inaccessible, and because switching boards has no keyboard shortcut, **switch cannot be triggered at all** — only flip survives, via its `f` binding. Meanwhile the one grid area that *is* on screen, the tools column, holds nothing but the chat.

The page already has somewhere to put these things: `client/two-board/common/tabs.ts`, the ARIA tablist widget extracted for the analysis page. Reusing it turns the tools column from a single-purpose chat pane into a switcher over the content that is currently lost. Two small defects in that widget have to be fixed first, because both become real the moment a second page uses it.

## What Changes

**Tab widget (`client/two-board/common/tabs.ts`)**

- Take the widget's own element id as a parameter, and derive every tab and panel id by prefixing it — `<id>-tab-<i>`, `<id>-panel-<i>`. Today they are the bare `tab-<i>` / `panel-<i>`, so two widgets on one page produce duplicate document ids: `aria-controls` and `aria-labelledby` resolve to the wrong element, and the click handler's lookup returns whichever panel comes first in document order. Callers still never name an individual tab; only the widget's own id is supplied.
- Remove every `querySelector` from the widget. Selection currently walks the DOM by relative position (`target.parentNode.parentNode.parentNode.querySelector('#panel-N')`), which searches a wider scope than the widget, requires the tablist and panels to be direct children of the container, and depends on ids being unique document-wide. The widget will instead retain the tab and panel vnodes it built and address `vnode.elm` directly.
- **BREAKING** for callers: `renderTabbedPanels` gains a required id argument. The bughouse analysis page is the only existing caller and is updated in the same change.

**Round page (`client/two-board/round/round.ts`)**

- Mount the widget in the `tools` grid area — where the chat is now — with three tabs in this order: **Chat**, **Moves**, **Info**. Chat is the default open tab.
- Each tab receives exactly one existing container element, moved as it is defined today, with no change to its content or to how it is rendered or patched:
  - Chat → `div#bugroundchat`
  - Moves → `div.movelist-block` (the movelist placeholder plus `div#move-controls`)
  - Info → the `GameInfoView` placeholder, currently embedded in `aside.sidebar-first`
- The widget keeps the width behaviour the chat container has today: `min-width: 0` so the tools column yields before the boards do, and `min-height: 0` and `overflow: hidden` so the widget can be driven to zero in both axes without forcing the grid wider or taller.
- Tab labels truncate naturally when the tablist is too narrow to fit them, rather than setting a floor on the widget's width.
- The widget and each panel size themselves from their container; nothing in this change introduces a fixed pixel height.
- `div#offer-dialog` and `div#game-controls` are deliberately **left where they are** for now. They are still unreachable in short landscape; deciding where they belong follows once the three tabs have been seen in place.

## Capabilities

### New Capabilities

- `round-page-tools-tabs`: what the round page's tools column contains, which panels exist and in what order, which is default, and how the widget behaves as its container's width and height shrink toward zero.

### Modified Capabilities

- `two-board-tabs`: the widget's entry point gains a caller-supplied widget id from which tab and panel ids are derived, and the requirement that behaviour is wired into the vnodes is strengthened to forbid DOM queries outright — selection addresses retained vnode elements instead. The requirement that the bughouse analysis page is the only two-board page in scope is replaced, since the round page becomes a second consumer.

## Impact

- `client/two-board/common/tabs.ts` — signature gains the widget id; id generation is prefixed; `onTabClick`'s DOM traversal is replaced by retained vnode element references.
- `client/two-board/analysis/analysis.ts` — its single `renderTabbedPanels` call passes an id.
- `client/two-board/round/round.ts` — the tools area becomes a `renderTabbedPanels` call; `div.movelist-block` moves out of `div.bug-round-tools-part`; the `GameInfoView` placeholder moves out of `aside.sidebar-first`.
- `static/bughouse.css` — rules for the round page's widget (min-width/min-height/overflow, label truncation, panel sizing from the container). `.bug-round-tools-part .movelist-block` no longer matches once the movelist moves and must be re-homed.
- **A silent visual change on the two-board analysis page.** `static/analysis.css:416` declares `div#request-analysis, div#panel-1 { align-items: center; justify-content: center; }`. That rule was written for the single-board page, but the two-board analysis page loads the same stylesheet and generates a `panel-1`, so its FEN & PGN panel has been picking the rule up by accident. Prefixed ids end that collision, and the panel loses the centring unless it is restored deliberately on `.fenpgn-panel`.
- `aside.sidebar-first` is left in the markup but becomes empty on the round page.
- No server, API, persistence or i18n-extraction surface is touched beyond the three new tab labels.
