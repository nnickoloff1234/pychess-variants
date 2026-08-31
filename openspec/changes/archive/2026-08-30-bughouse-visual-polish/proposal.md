## Why

The bughouse analysis page reached its current layout through a sequence of changes that each solved
one problem. What is left is a tail of visual defects that are individually small, none of them
worth a change of its own, and collectively the difference between a page that looks finished and
one that looks assembled.

Two of them share a cause worth naming: **the analysis page does not inherit the round page's
treatment of a shared widget.** The round page's rules are scoped to `.round-app.bug`, so a widget
that appears on both pages gets its polish on one of them and its defaults on the other.

## What Changes

This change is a **standing list, and it is expected to grow.** Items are added as they are found;
each one carries the measurement that identifies it, and each is closed on its own. Nothing here
changes behaviour — only how the page looks.

**Item 1 — coordinates are always outside the board on the analysis page.**
The round page decides between coordinates on the squares and coordinates outside from
`--bug-coord-gap`: zero means no room, so they go on the squares. The analysis page computes that
variable — measured `--bug-coord-gap: 0px` on p1 at 100% zoom — and then ignores it, because all 35
of the coordinate rules are scoped `.round-app.bug`. Files render at `bottom: -16px`, outside the
board, at chessground's default `opacity: 0.8` and 11.9px. **The fix is to widen the existing
selectors, not to write a second copy of the treatment.**

**Item 2 — the movelist takes a horizontal scrollbar.**
Measured on the analysis page: the movelist is 284px wide, `clientWidth` 276 after the vertical
scrollbar, and `scrollWidth` 281 — so a horizontal scrollbar appears over a 5px overflow. The cause
is in the shared widget: `move-bug` is `flex: 0 0 calc(25% - 3ch)` with `max-width` to match,
`white-space: nowrap` and **no `overflow` rule**, so a long move — `Nxc4+`, a drop like `P@e3` —
spills out of its cell. Individual cells measured at `scrollWidth` 47, 45 and 53 against a 43px box.
The movelist SHALL fit the width it is given, wherever it is rendered.

**Later items** are appended to this list rather than opening new changes, until the list is closed.

## Capabilities

### New Capabilities

None. Every item here is a defect in behaviour already specified or already implied — the pages are
meant to look the same and a panel is meant to fit its box.

### Modified Capabilities

- `bughouse-round-layout`: adds the rule that a widget shared by the round page and the analysis
  page is styled once for both, and the requirement that a panel never needs a horizontal scrollbar
  to show what it was given room for. The spec already says the two pages SHALL share one layout;
  these are the parts of that promise the code does not yet keep.

## Impact

- `static/bughouse.css` — the coordinate block's selectors, and the `move-bug` cell rules.
- No TypeScript expected. Both items are stylesheet defects; if one turns out to need markup, that
  is recorded on the item.
- No server change, no Python gates.
