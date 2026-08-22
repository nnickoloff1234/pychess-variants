## Why

Two things are wrong with the bughouse round page in the desktop mode — `(min-height: 600px) and (orientation: landscape)`.

**It scrolls over nothing.** At a 1362x916 viewport the document is 2153px tall, 1237px past the fold, and every one of those pixels is empty. Two sources, both from one declaration:

```css
@media (min-width: 800px) {
  .bug {
    grid-template-rows: fit-content(0) fit-content(0) 743px;
    grid-template-areas: 'app app' 'uleft uboard' 'side side';
  }
}
```

`.bug` matches any element carrying the class, so it lands on `main.round.bug` — as intended — **and** on `#main-wrap.bug`. `main.round` therefore reserves a hardcoded 743px row for `side`, which since the tabs change holds an `aside.sidebar-first` with zero children; and `#main-wrap`, which declares a single `'main'` area, is given the same three-row template and ends 743px below its only child. The sidebar's emptiness is paid for twice.

**The boards are separated by the tools column.** The columns read `board · tools · boardPartner · toolsB`, so the chat/moves/info panel sits between the two boards. In a game where the whole point is watching both boards at once, the thing a player compares across is split by a panel.

## What Changes

- Stop `#main-wrap` inheriting the round page's row template. The `.bug` rule is scoped to the element it was written for, so the wrapper keeps the single `'main'` area it declares and gains no rows it cannot fill.
- Stop reserving a fixed 743px for the sidebar. The `side` row SHALL size to its content, so an empty sidebar costs nothing and a populated one is unaffected.
- **Reorder the desktop columns to `board · boardPartner · tools`**, putting the two boards adjacent with the tools column to their right, separated by a gap. Each board's seat strips follow its board, since they are placed by the same columns.
- Size a board column as **a quarter of the page at the default zoom**, keeping the existing formula's shape — `calc(31.25vw * var(--board-scaleA))`, where 31.25vw is the width at full zoom and the default zoom of 80 therefore yields 25vw. Each board keeps its own scale, so the two zoom sliders stay independent.
- Size the tools column at a flat **20vw**, not scaled by zoom. Its width is about reading chat and move lists rather than board size. This is a deliberate change: the old track was `--pocketLength * (--cg-width-a / --files)`, derived from the board and therefore zoom-scaled.
- **Remove the dead `move-controls` and `uboard` rows** from the desktop template. Measured: both are declared in `grid-template-areas` and no element occupies either — `#move-controls` moved inside the Moves panel with the movelist block, and `under-board` is a sibling of the round app rather than a child.
- Move `toolsB` into the tools column as a content-sized row beneath the widget, rather than giving it a column of its own. It holds only `#offer-dialog`, which is empty except when a draw is offered, and was occupying a full 203x474 track.
- **Give `main.round.bug` the two columns its own areas describe.** `site.css`'s `.round` rule supplies three — a sidebar/board/panel set written for the single-board page — and the bughouse areas name only two, so a third track sat empty and, by absorbing the leftover width, pinned the page to the left edge. Two content-sized columns, centred.
- **Let the controls bar wrap instead of squeezing the tablist.** Side by side is a wide-column arrangement; in a narrow column the controls' fixed width leaves the tabs unreadable. This is a regression from the controls-bar change and is repaired here rather than left standing.
- **BREAKING** for nothing outside the bughouse round page: `.bug` is only carried by `main.round.bug`, `#main-wrap.bug` and the round app, and the single-board pages do not use it.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: the desktop mode's column order changes so the boards are adjacent, and the requirement that every viewport resolves to a layout gains a statement that the layout reserves no space it does not use.

## Impact

- `static/bughouse.css` — the `@media (min-width: 800px) .bug` block is scoped and its `743px` row replaced; the `min-height: 600px` block's `grid-template-columns` and `grid-template-areas` are reordered.
- The `move-controls` and `uboard` rows in the desktop template are worth re-checking while reordering: `#move-controls` now lives inside the Moves panel and `under-board` is a sibling of the round app, so neither is a grid item of `.round-app.bug` any more and those template rows may be dead.
- `aside.sidebar-first` stays in the markup and stays empty — this change makes it cost nothing rather than removing it, so nothing depends on the aside existing or not.
- The invalid `grid-template-columns: 2 * minmax(...)` in that same `.bug` block is dropped by the parser today and has no effect; it is noted so it is not mistaken for the source of anything.
- No server, API, persistence or i18n surface.
