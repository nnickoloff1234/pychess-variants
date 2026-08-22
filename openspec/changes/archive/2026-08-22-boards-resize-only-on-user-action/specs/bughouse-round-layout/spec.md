## MODIFIED Requirements

### Requirement: A board's container is a width the board can render exactly

The container a board is measured against SHALL be a width the board can draw — the width quantised
to whole device pixels across the board's files, the rule `squareUnit.ts` publishes, within the bound
stated below. Exactly, wherever the arithmetic allows it.

A container sized this way is indifferent to what moves around it while the page settles, which is
what makes measuring once sufficient. A container sized from the settling layout is not, whatever
observes it.

**Scaling SHALL happen before quantising.** A quantised unit multiplied by a zoom scale is no longer
quantised, and a track built that way hands the board a width it must floor again — 486.39 against a
board of 480 in tall landscape, leaving slack that collects on one edge. Where a track depends on
zoom, the scale SHALL be applied first and the result quantised, so the track is exact at every zoom
rather than only at the zooms where the product happens to land on a whole device pixel.

**The remaining slack SHALL be smaller than one device pixel, which is the strongest available
claim.** Exactness is not reachable in general: a track is a CSS length, the browser holds a used
length on a 1/64px grid, and a measured width can come back a grid step under what the track was
given — so a unit that is exactly N device pixels per square can be floored to N-1 and lose a whole
square's worth. Measured at dpr 1.2000000476837158, that cost 6.67px on 23 of 77 zoom steps. The
published unit SHALL therefore carry a margin strictly greater than that rounding, and the slack it
leaves SHALL stay below one device pixel, where no board can render it: at most 0.042px across every
mode, ratio and zoom measured.

**A zoom SHALL redraw the board whose track it changed.** Zoom is keyed by COLUMN — the left column
holds the viewer's own board in every seating — while a board is identified by A or B, and the two
cross for a board-B viewer. A slider that resizes one column's track while redrawing the other
column's board leaves a board resolving clicks against a box it no longer occupies.

**The container SHALL be a box that a width applies to.** An inline box takes its width from its
content and ignores both `width` and `margin: auto`, so a correctly computed track never reaches the
board — measured as 386 around a board of 384 in portrait. A track is only as exact as the box it is
written on.

**A board and the parts stacked with it SHALL share a left edge.** Pockets and seat strips are laid
out from their container's left edge while chessgroundx pins the board to its container's right, so
any remainder inside the box they share opens between them and reads as two misaligned panels. Where
a remainder is unavoidable it SHALL fall outside that box: a board given the full width of the page
SHALL be centred on it, and the quantised width SHALL be carried by the smallest box containing
every part that must share the edge — which is the whole app where two boards must also agree with
each other, not merely the stack around one of them. Preset rows SHALL keep their remainder on the left, packing the buttons against the right
edge.

Nothing SHALL change size during the load of the round page. Where something must, the reason SHALL
be recorded where the sizes are defined, because an unexplained transient during load is where a
stale measurement comes from.

#### Scenario: The container matches the board
- **WHEN** a board has been drawn
- **THEN** its container's width equals the board's width, so there is no slack inside the wrap for chessgroundx to pin to one edge

#### Scenario: A zoomed board still gets an exact width
- **WHEN** a board is displayed at a zoom other than 100%
- **THEN** its track is quantised after the scale is applied, and the board fills it to within less than one device pixel

#### Scenario: The slider moves the board it appears to move
- **WHEN** a player seated on board B moves the zoom slider for the column their own board is in
- **THEN** that board is the one that is resized and the one that re-measures, and the partner's board is untouched

#### Scenario: The pockets line up with the board
- **WHEN** a board is displayed with a pocket above or below it
- **THEN** the pocket's left edge and the board's first file are at the same x, in every mode and at every zoom

#### Scenario: The layout is still during load
- **WHEN** the round page loads
- **THEN** no element that a board's size depends on changes size while it settles

#### Scenario: Portrait's board is centred on what is left over
- **WHEN** the round page is displayed in portrait
- **THEN** the bottom board spans the page and any leftover pixels are equal on its left and right

#### Scenario: Preset rows pack to the right
- **WHEN** a preset row is narrower than the space it is given
- **THEN** the buttons sit against the right edge and the spare width is on the left

### Requirement: The board's grid slot equals the board it renders
In the short-landscape mode — `(max-height: 600px) and (orientation: landscape)` — the grid tracks reserved for a board SHALL be sized from a **quantised square unit**, so the slot equals the board chessgroundx actually renders and no unused space is left inside the board's wrap.

The square unit SHALL be the largest value for which **10 square-sized rows** fit the height available to the board column — one pocket row, eight board rows, one pocket row — and SHALL be quantised so that one square is a whole number of device pixels, matching the rule chessgroundx applies when it sizes a board.

Each board SHALL occupy **one** grid column of 8 square units. The board rows SHALL be 2 squares each and each seat strip row SHALL be exactly 1 square. A board SHALL NOT be split across two columns: the earlier two-column-per-board arrangement existed only to give the pocket and the clock/username block separate tracks, and it pinned the pocket to half a board regardless of how many droppable roles the variant has.

The rendered board size SHALL be unchanged by this requirement. Any remainder between 10 squares and the available height SHALL collect once, outside the board block, rather than inside a board's wrap.

#### Scenario: No slack inside the board wrap
- **WHEN** the round page is displayed in short landscape
- **THEN** each board's wrap and its `cg-board` agree to within less than one device pixel — measured at 0.042px, which no board can render — and there is no gap between the two boards, nor between a board and the pocket below it

#### Scenario: Pocket squares match board squares
- **WHEN** the pockets are rendered beside a board
- **THEN** a seat strip's height equals one board square exactly, rather than being taller than it as it is when the row is a raw `vh` fraction

#### Scenario: The board is not resized by this change
- **WHEN** the same viewport is measured before and after the change
- **THEN** the rendered board width is the same value in both cases, confirming this aligns geometry rather than rescaling the board

#### Scenario: One column per board
- **WHEN** the computed `grid-template-columns` of the round app is inspected
- **THEN** each board is backed by a single track of 8 square units, and no track exists whose only purpose is to hold that board's clock and username
