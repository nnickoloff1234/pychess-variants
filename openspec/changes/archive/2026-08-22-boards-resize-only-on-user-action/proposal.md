## Why

The rule is now settled: a board is rendered once, at load, with its exact bounds; `document.body`
is the only element that may be observed; and an explicit user zoom or resize is the only thing that
redraws a board. `board-is-measured-once-at-load` established it and made portrait conform.

Four things do not conform yet, all found while verifying that one. They were left out of it
deliberately rather than allowed to grow it further.

**A zoomed track is no longer a quantised track.** Tall landscape sizes both board columns as
`calc(var(--bug-tall-sq) * 8 * var(--board-scaleA))` and its `B` twin. The unit is quantised, but
multiplying it by the zoom scale afterwards produces a width the board cannot draw: measured at p1's
default zoom, the track is 486.39 and the board quantises to 480, leaving 6.39px that collects on
the left because chessgroundx pins its container to the right. The unit is 76 and the default zoom
is 80, so each square asks for 60.8 device pixels and is given 60 — 0.8 lost, eight times over.
`--bug-seat-sq` (`bughouse.css:1243`, `:1246`) is the same `unit x scale` shape and carries the same
defect. The scale has to be applied before the flooring, not after.

What makes this visible is not slack inside a wrap, which nobody would see. The pocket is laid out
from the container's left edge while the board is pinned to its right, so the whole 6.39px opens
between them and reads as a board and a pocket panel that do not line up.

**Portrait's own board has the same symptom from a different cause.** `selection#bugboard` is
`display: inline`, so the `width` and `margin-inline: auto` intended to hand it the quantised width
are inert — a sizing property does not apply to an inline box, and `margin: auto` cannot centre one.
It takes 386 from its block child, the board draws 384, and 2px collects on the left. Two separate
faults hold it there: the element is inline, and the `.own-board` rule that would size it is
discarded by the parser, because the comment above it at `bughouse.css:606` closes and then carries
on for seven more lines, leaving `Keyed by ROLE ... */ .own-board` as a single invalid selector. The
same inline-box trap is already documented on `.cg-wrap.pocket` a few hundred lines away — found,
understood, and fixed in one place while the same defect sat untouched in another.

**Something resizes during load.** `main` and `.round-app` go 386 -> 384 -> 386 between 80ms and
126ms of a portrait load. Nothing depends on it any more — the boards' containers are pinned — but
the rule says nothing should be resizing during load, and this is unexplained. The 386 is exactly
what the inline `selection` measures and the 384 exactly the quantised width, so this and the item
above are plausibly one finding.

**The zoom path still redraws on a timer.** `ZoomSettings.update()` re-measures with
`setTimeout(..., 100)` and a comment about the ResizeObserver not firing. If a zoom is now one of
the two sanctioned redraw points, it should redraw because the user zoomed, not because a timer
elapsed.

## What Changes

- **Every board track is a width its board can render exactly**, zoom included: quantise after
  applying the scale, so that scaling cannot un-quantise a unit that was quantised. This covers the
  seat-strip unit as well as the two board tracks — they are the same expression.

- **A board and the parts stacked with it share one left edge.** One box carries the quantised
  width, and any remainder is spent centring that box rather than left inside it, so it cannot open
  between the board and its pockets. This is what makes the fix one rule across the three modes
  instead of a desktop special case.

- **The rule is stated where board tracks are defined**, so the next track cannot be written
  unquantised without contradicting a comment at the point of writing.

- **Load-time resizing is explained and removed.** Whatever moves `main` and `.round-app` is either
  fixed or written down as unavoidable with the reason.

- **The zoom redraw stops depending on a timer.** Either the delay is justified in terms of what it
  waits for, or the redraw happens directly on the user's action.

- **The page stops being taller than the viewport in portrait.** `body { margin: 0 0 2vmin }` from
  site.css adds ~8px, clipped rather than scrolled because every mode sets `overflow: hidden`.
  Neutralised from `bughouse.css` scoped to this page — site.css is not to be touched.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: the requirement that a board's container is a width the board can render
  exactly gains the zoom case — scaling happens before quantising — the requirement that the
  container be a box a width applies to at all, and the requirement that a board and the parts
  stacked with it share a left edge. Load-time stability becomes explicit rather than implied.

## Impact

- `static/bughouse.css` — both tall landscape board tracks and the seat-strip unit; portrait's
  `.own-board` and the stack that holds it; the unterminated comment at `:606`; the portrait body
  margin; comments where the tracks are defined.
- `client/two-board/squareUnit.ts` — a scaled variant of the quantiser, since the scale must enter
  before the floor.
- `client/boardSettings.ts` — `ZoomSettings.update()`'s `setTimeout(..., 100)`, and the zoom values
  the scaled unit needs to read.
- No server change; frontend gates only.

## Out of scope

Adding any observer, or any code that re-measures a board after it has been drawn. That is the rule
this change exists to satisfy, not a means available to it.
