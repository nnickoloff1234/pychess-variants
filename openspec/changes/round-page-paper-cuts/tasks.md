# The ledger

Not a plan. Nothing here is scheduled, and none of it is worked on from this file — an entry leaves
by being promoted into a change of its own or picked up by the change that owns that area, and is
then **deleted from here** with a line saying where it went.

Format, per `design.md`: what happens (with the numbers), why if known, where, and when it was found.

## Open

- [ ] **A board zoomed to 0 cannot be recovered with the mouse**

  **What happens.** Dragging a board's `cg-resize` handle down to zoom 0 collapses it completely —
  `cg-wrap` 0x0, seat strip 1px tall, username and clock both 0px. At that point the handle stops
  responding, and it is not that the drag is missing it: `elementFromPoint` at the handle's own
  centre returns `DIV.round-app`, not the `cg-resize`, while `getBoundingClientRect` still reports a
  22x22 box at that position with `display: block` and `pointer-events: auto`. The element is
  present and unreachable.

  Recovery is the settings zoom slider (`#zooma` / `#zoomb`) or editing
  `standard8x8-zoom-b` in localStorage. A player who does not know that has lost the board.

  **Why.** The collapsed 0x0 wrap clips the absolutely-positioned handle out of hit-testing, while
  leaving its layout box where it was.

  **Where.** `client/cgCtrl.ts` — the handle is created in `onInsert()` and its drag handler is
  bound there. `client/boardSettings.ts` — `ZoomSettings` has range 0..100, and a floor on that
  range is probably the whole fix. The zoom path is owned by
  `boards-resize-only-on-user-action`.

  **Found.** 2026-08-21, sweeping both boards through their zoom range with the mouse to check how
  `name-row-in-the-height-budget` rearranged the seat strips. Reproduced on the CSS that change
  replaces, so it is not caused by it.

- [ ] **A board at zoom 0 still draws its rank coordinates**

  **What happens.** With the partner board at zoom 0 and nothing else visible in that column, its
  rank labels are still rendered — a column of tiny digits beside an empty space, in a screenshot
  where the board itself is gone.

  **Why.** Not investigated. Presumably the coordinates are drawn outside the box that collapsed.

  **Where.** Chessgroundx's coordinate rendering, or the CSS that would hide it. Same area as the
  entry above and probably fixed for free if zoom gains a floor — worth checking rather than
  assuming, since the two could have separate causes.

  **Found.** 2026-08-21, same sweep.

- [ ] **Coordinate labels do not scale with their board in tall landscape**

  **What happens.** Two boards at very different zooms draw their rank and file labels at the same
  size. Measured on the desktop with one board at 80% and the other at 40%: squares 60.8 and 30.4,
  a factor of two, and `coord` font-size **11.9px on both** — 20% of a square on the full-size board
  and 39% on the reduced one. Portrait does not have this: there the labels measure 0.2984 and
  0.3000 of a square on boards differing by 2.3x, which is the behaviour expected everywhere.

  **Why.** `.cg-wrap coords { font-size: 0.85em }` (`static/chessground.css:417`) inherits whatever
  font-size reaches the wrap. Portrait's bughouse rules put a board-derived size on the board
  elements, so the labels inherit it and scale. Tall landscape puts nothing there, so `0.85em`
  resolves against the 14px root — 11.9px, board-independent.

  **Where.** `static/chessground.css:417` for the rule; the fix belongs in `bughouse.css`, which
  already publishes a per-seat square (`--bug-seat-sq`) keyed by ROLE that the wrap could inherit
  from. Related: `A seat's furniture is sized from its own board` in `bughouse-round-layout` covers
  the strip's contents but says nothing about the board's own labels.

  **Found.** 2026-08-21, checking whether the username's floor could be compared against the
  coordinate labels as the capability requires — the labels turned out to be the thing not following
  its board, not the username.

- [ ] **The clock's difference indicator is sized from a different source than the clock**

  **What happens.** The indicator is `1.5em` of `.clock-wrap`, whose font-size is
  `--bug-clock-fs` — the board-derived `calc(var(--bug-seat-sq) * 0.2)`. Since
  `clock-fills-its-strip`, the clock itself is sized from the room it has
  (`min(92cqb, 32cqi)`) and no longer uses that variable at all. The two now scale from
  different inputs and will drift apart at any zoom or viewport where the room and the board
  disagree.

  Measured on the desktop after that change: clock 56.12px, indicator still 18.24px, covering
  0.67 of the first digit where it covered about 0.91 before. Nothing is broken — it fits its
  box and is legible — but `--bug-clock-fs` is now, in effect, the difference indicator's size
  variable under a name that says clock, and it is still declared in three separate media
  blocks.

  **Why.** `clock-fills-its-strip` moved the clock off `--bug-clock-fs` and left the variable
  feeding `.clock-wrap`, which the indicator inherits from.

  **Where.** `static/bughouse.css` — `.round-app.bug .clock-wrap`'s `font-size`, the three
  `--bug-clock-fs` declarations, and `.round-app.bug .clock-difference`. The fix is probably to
  size the indicator in `em` of `.clock` and retire the variable, but whether the indicator
  *should* grow with the clock is a judgement nobody has made.

  **Found.** 2026-08-21, verifying task 3.4 of `clock-fills-its-strip`.

## Promoted or dropped

<!-- One line each, so a re-found defect is recognisable as one already dealt with:
     - **<title>** — went to <change name>, or dropped because <reason>, <date> -->

(nothing yet)
