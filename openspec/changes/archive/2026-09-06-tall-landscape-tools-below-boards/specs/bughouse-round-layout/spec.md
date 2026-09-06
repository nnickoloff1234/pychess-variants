## ADDED Requirements

### Requirement: What the tools need is counted in squares

The tools' minimum usable WIDTH (`Wt`) and minimum usable HEIGHT (`T`) SHALL be declared as counts of
the LEFT BOARD'S SQUARE — the unit every other length in this layout is already expressed in, and the
one a reader can see. The question every placement asks is then the same question: are there enough
spare squares here to put the tools in.

Neither SHALL be obtained by measuring the tools. Their height depends on the width they are given,
which depends on which home they were placed in, which is what the numbers are being used to decide;
measuring closes that loop, and the loop is the circular sizing this specification forbids elsewhere.

`Wt` SHALL be **2 squares** and `T` SHALL be **3 squares**. Both are derived from what the layout
actually has to spend rather than chosen: 2 is the largest width that leaves every normal desktop
the column it has today, the tightest being a viewport with 2.40 spare squares; 3 lies inside the
band that separates a viewport with 0.74 squares beneath its boards, which must not qualify for a
row, from one with 5.45, which must.

`Wt` SHALL replace the half-square the tools are guaranteed today. Half a square is not a usability
measure: measured across normal viewports the tools receive between 2.4 and 4.8 squares of column and
then fall straight to that floor below about 1000px of width, with nothing in between.

#### Scenario: The numbers are inputs, not observations
- **WHEN** the tools' home is decided
- **THEN** every term is viewport geometry or a declared constant, and no element is measured

#### Scenario: A column narrower than the minimum is never given
- **WHEN** a column of `Wt` squares could only be had by reducing the left board below its height-derived square
- **THEN** the tools are not given a column at all, and the next home in the order is tried

#### Scenario: One pair of numbers serves both pages
- **WHEN** the round page and the analysis page are shown at the same viewport
- **THEN** the same `Wt` and the same `T` decide both
- **AND** the two may reach a home at slightly different viewports, the analysis page's stack being wider by its gauge, without either needing a constant of its own

### Requirement: The tools take the first home that fits

The tools SHALL be placed in the first of four homes that can hold them, tested in order, and the
whole cascade SHALL be evaluated BEFORE either board is sized so that the boards may spend whatever
width the tools do not take.

1. **A COLUMN of their own**, to the right of both boards, where charging `Wt` against the width
   COSTS THE BOARDS NOTHING — that is, where the left board's square is still the height-derived one
   once the tools' squares are in the divisor. The right board absorbs the cost by shrinking, which
   is what it is for; only when the LEFT board would have to give way as well does the column stop
   being free, and that is when looking elsewhere becomes worthwhile.
2. **THE FULL-WIDTH ROW beneath both boards** — zone B — where the height left under the boards is
   at least `T`. Width is never in question there.
3. **THE REGION THE RIGHT BOARD FREES** — zone A — where it is at least `Wt` squares wide and `T`
   squares tall. Wherever the right board sits at its floor this region is exactly `S x f` squares
   wide by `ROWS x (1 - f)` squares tall — 4 by 5 with the present constants — WHATEVER THE VIEWPORT,
   so whether the tools fit it is a fixed question rather than a per-viewport one. Zone A costs the
   boards nothing in either axis, being space the right board has already given up.
4. **THE TAB STRIP ALONE, in zone A**, with the right board entered in that strip as a further tab,
   so the panels may borrow the board's column when no region can hold them beside it.

WHERE MORE THAN ONE HOME FITS, THE EARLIER ONE SHALL BE TAKEN. A column beside the boards therefore
beats a row beneath them whenever both are affordable: the tools stay where they are read, and the
slightly larger board a row would buy is not worth moving them for.

THE CASCADE SHALL BE RE-EVALUATED ON ZOOM AS WELL AS ON RESIZE. Zone B's height is the height the
boards do not use, so a reader zooming a board down creates it; these are the layout's two existing
redraw points and no third is introduced.

THE LAYOUT HAS THREE COLUMNS ONLY IN THE FIRST CASE. In every other the tools take no column and
both boards SHALL be sized against the full width less the gaps.

#### Scenario: The tools can afford a column
- **WHEN** a column of at least `Wt` can be had
- **THEN** the tools occupy it, and the layout has three columns

#### Scenario: The width is scarce and the height is not
- **WHEN** no column of `Wt` is available and the height left beneath the boards is at least `T`
- **THEN** the tools occupy the full-width row beneath both boards
- **AND** the layout has two columns
- **AND** both boards are sized against the full width less the gaps

#### Scenario: The height beneath the boards is scarce but the right board has freed room
- **WHEN** neither a column nor the row beneath the boards can hold the tools, and the region the right board frees is at least `Wt` wide and `T` tall
- **THEN** the tools occupy that region

#### Scenario: No region can hold the tools
- **WHEN** none of the first three homes fits
- **THEN** only the tab strip is placed, in the region the right board frees
- **AND** the right board is entered in that strip as a further tab
- **AND** selecting another tab shows that panel in the board's place, and selecting the board's own tab shows the board again

### Requirement: The partner board is a standing tab panel that is not listed

The right board's stack SHALL be a tab panel from page load, in every home. Its tab SHALL NOT appear
in the strip, and it SHALL NOT be hidden by a tab change, EXCEPT in the last resort.

Entering it in the strip SHALL therefore be the only thing the last resort does to it. No element
SHALL be created, reparented or destroyed in either direction, because the arrangement is chosen
from the viewport and changes while the window is being dragged.

THIS SHALL USE THE WIDGET'S DETACHED-TAB CAPABILITY rather than any arrangement private to this
page. The board is a tab that is detached at construction and attached only in the last resort; the
behaviour that a detached tab is absent from the strip, always displayed and ungoverned by selection
belongs to the widget and is specified there.

In the last resort the tools panels SHALL occupy the same area as the board panel — the right
board's own column — since the strip guarantees only one of them is displayed at a time. The last
resort SHALL NOT need an area that no other home declares.

When the tab is added, the BOARD's tab SHALL be the selected one, so that nothing visibly changes at
the moment the arrangement flips.

A board hidden and shown again by a tab change SHALL have its cached bounds cleared. It has moved
without changing size, which is a clearing event and not a re-measure.

#### Scenario: The arrangement changes back
- **WHEN** the viewport grows so that the tools regain a home of their own
- **THEN** the board's tab leaves the strip and the board is shown unconditionally again
- **AND** no element was reparented in either direction

#### Scenario: A reshown board is still clickable
- **WHEN** the board is shown again after another tab had replaced it
- **THEN** a click on it maps to the square under the pointer

## MODIFIED Requirements

### Requirement: The boards take priority over the tools

Where the width cannot hold both boards beside the tools column, the BOARDS SHALL keep their size
and the tools SHALL give way. A board is what the page is for; a panel is not.

The tools SHALL be guaranteed `Wt` — their declared minimum usable width, counted in squares of the
left board at full zoom — WHERE THEY OCCUPY A COLUMN AT ALL. Where they do not, that term SHALL
leave the width equation entirely rather than being charged and then unused. The minimum is tied to
full zoom, not to the current zoom, so that zooming a board down cannot shrink what the tools are
owed.

The tools SHALL NOT be given a column narrower than `Wt`. A column below that width is not a usable
panel, and the arrangement that would produce one is the signal to move the tools elsewhere — see
"The tools take the first home that fits". This replaces the half-square floor, which was never a
usability measure: it produced 195 to 628px of panel on a normal desktop and then collapsed straight
to 24-33px below about 1000px of width, with nothing in between.

Every term being a multiple of the square keeps the width equation a single division, as it is
today:

    with a column:     L = (W - gaps) / (S(1+f) + Wt)
    without one:       L = (W - gaps) / (S(1+f))

and where the tools take a ROW, `T` joins the height divisor for the same reason:

    tools below:       L <= H / (ROWS + T)      every other home:  L <= H / ROWS

Where even that minimum does not fit, the RIGHT board — never the viewer's own, which is always
the left one — SHALL take a smaller square, so that its full zoom means a smaller board rather than
one that overlaps its neighbour or pushes the tools off the page.

THE RIGHT BOARD SHALL NOT BE REDUCED BELOW HALF THE LEFT BOARD'S SQUARE. Below that point the LEFT
board's square SHALL be capped by the width as well, and from there the two SHALL shrink together.
Only above that point is the left board's square derived from the height alone. A right board with
no floor is not a layout that always fits — measured at 682x648 the left board held its
height-derived 58.67px square, the right was driven to 16.67px, a board four pawns wide, and the
pair still overflowed the viewport by 29px.

THAT FLOOR SHALL HOLD IN EVERY HOME, including those where the tools take no width at all. It does
not exist to protect the right board from the tools; it exists because the left board is the
viewer's own and does not yield to the partner's. A floor that lapsed once the tools stepped aside
would shrink the viewer's own board to keep the partner's larger — measured at 627x835, an own board
of 401px beside a partner of 201px becomes two boards of 301px.

The cap SHALL be SOLVED, not searched. With `S` squares to a stack, `f` the right board's floor and
`Wt` the tools' column, the width pays `S x L + S x (f x L) + Wt x L + gaps`, which has one unknown.
Every term SHALL be expressed in squares of the left board, the tools' column included: charging the
tools against a square the left board is not getting leaves the arithmetic unable to close.

The eval gauge, where the page draws one, SHALL remain part of its board's stack in every home and
SHALL therefore remain a term of the width formula. It SHALL be shown and hidden with its board, so
that it never reports on a board that is not on screen.

A BOARD TRACK SHALL BE SIZED BY A TRACK FUNCTION THAT ITS OCCUPANT'S `min-width` CANNOT REACH.
A stack carries `min-width: 0` so that a shrinking board can never widen the page; that same
declaration overrides the automatic minimum size an `auto` track floors on, so an `auto` board track
is fully shrinkable while the tools' fixed maximum is satisfied ahead of it — this rule exactly
backwards. Measured at 996x730: tracks of 455.9 | 282.6 | 199.2 against a stack whose own tracks
summed to 554, the board overflowing its column by 98px and painting over its neighbour.

This applies in BOTH landscape modes. Short landscape reaches the limit sooner, not later, because
it pins both boards to the full height and has no zoom to give back.

Where the tools column is DISSOLVED so that its parts become items of the app's own grid, each part
SHALL carry the clipping the column used to provide. An element with `display: contents` has no box,
so its `overflow` applies to nothing and its former children clip nothing on their own.

A TAB STRIP SHALL SHRINK ITS TABS RATHER THAN LOSE ITS ENDS. Tabs share the bar by flexing from a
zero basis, but a flex item's automatic minimum size is its min-content, so each tab holds its whole
label and a centred row overflows at BOTH ends — cutting the first tab as well as the last, which
reads as a rendering fault rather than as a narrow column. Every tab SHALL remain present and
clickable with its label truncated.

#### Scenario: The width cannot hold two boards and the tools
- **WHEN** two boards at the height-derived square, plus the tools' `Wt`, exceed the width
- **THEN** the left board keeps that square
- **AND** the right board's square is reduced until the whole row fits
- **AND** the tools column is at least `Wt` squares of the left board

#### Scenario: The tools are given a column
- **WHEN** the tools occupy a column
- **THEN** that column is at least `Wt` squares wide
- **AND** both boards are sized with `Wt` charged against the width

#### Scenario: The tools occupy no column
- **WHEN** the tools have been placed anywhere other than a column of their own
- **THEN** no width is charged for them
- **AND** both boards are sized from the full width less the gaps alone

#### Scenario: The right board reaches its floor
- **WHEN** reducing the right board to fit the width would take its square below half the left board's
- **THEN** the right board stops at half the left board's square
- **AND** the left board's square is capped by the width from that point on
- **AND** both boards shrink together as the width falls further
- **AND** the row still fits the viewport

#### Scenario: A board track is not shrinkable by the tools
- **WHEN** the three tracks' preferred widths exceed the viewport
- **THEN** each board track keeps the width its own stack needs
- **AND** the tools track takes what is left

#### Scenario: The width is sufficient
- **WHEN** the width holds both boards and the tools' preferred column
- **THEN** both boards use the same square and neither is reduced

#### Scenario: The tools are narrower than their content
- **WHEN** the tools column is reduced below the width its content wants
- **THEN** the content is clipped
- **AND** the page does not gain a horizontal scrollbar

#### Scenario: The tab strip is narrower than its tabs
- **WHEN** the tools column is too narrow for the tab labels
- **THEN** every tab is still present and inside the viewport
- **AND** each label is truncated rather than the first and last tabs being cut off
