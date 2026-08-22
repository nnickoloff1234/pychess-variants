## MODIFIED Requirements

### Requirement: The board's grid slot equals the board it renders
In the short-landscape mode — `(max-height: 600px) and (orientation: landscape)` — the grid tracks reserved for a board SHALL be sized from a **quantised square unit**, so the slot equals the board chessgroundx actually renders and no unused space is left inside the board's wrap.

The square unit SHALL be the largest value for which **10 square-sized rows** fit the height available to the board column — one pocket row, eight board rows, one pocket row — and SHALL be quantised so that one square is a whole number of device pixels, matching the rule chessgroundx applies when it sizes a board.

Each board SHALL occupy **one** grid column of 8 square units. The board rows SHALL be 2 squares each and each seat strip row SHALL be exactly 1 square. A board SHALL NOT be split across two columns: the earlier two-column-per-board arrangement existed only to give the pocket and the clock/username block separate tracks, and it pinned the pocket to half a board regardless of how many droppable roles the variant has.

The rendered board size SHALL be unchanged by this requirement. Any remainder between 10 squares and the available height SHALL collect once, outside the board block, rather than inside a board's wrap.

#### Scenario: No slack inside the board wrap
- **WHEN** the round page is displayed in short landscape
- **THEN** each board's wrap and its `cg-board` have the same width and height, and there is no gap between the two boards, nor between a board and the pocket below it

#### Scenario: Pocket squares match board squares
- **WHEN** the pockets are rendered beside a board
- **THEN** a seat strip's height equals one board square exactly, rather than being taller than it as it is when the row is a raw `vh` fraction

#### Scenario: The board is not resized by this change
- **WHEN** the same viewport is measured before and after the change
- **THEN** the rendered board width is the same value in both cases, confirming this aligns geometry rather than rescaling the board

#### Scenario: One column per board
- **WHEN** the computed `grid-template-columns` of the round app is inspected
- **THEN** each board is backed by a single track of 8 square units, and no track exists whose only purpose is to hold that board's clock and username

## ADDED Requirements

### Requirement: No mode splits a seat's furniture across tracks
In every round-page layout mode, a seat's pocket and its clock/name block SHALL occupy one grid area together — the seat's strip — and a board SHALL be backed by a single column rather than by one column for pockets and another for clocks.

A strip SHALL present its contents in the same order in every mode: pocket, then name, then clock. Where a board is rotated and its strip runs alongside it, the strip SHALL stack its contents in that same order rather than laying them in a row.

This applies to the round page's modes only. The two-board analysis layout does not express seats this way — its pockets are detached from their boards into a shared column and its clocks are positioned overlays with no grid area — and SHALL be left as it is.

#### Scenario: The split is gone from every mode
- **WHEN** the computed grid of the round app is inspected in short landscape, in `min-height: 600px` landscape, and in portrait
- **THEN** in each case a board is backed by one column, and no area holds a pocket without the clock and name that belong to the same seat

#### Scenario: A seat looks the same in every mode
- **WHEN** a seat is compared between two layout modes
- **THEN** its pocket, name and clock appear in the same order, differing only in the strip's size and axis

#### Scenario: Analysis is untouched
- **WHEN** the two-board analysis page is compared before and after the change
- **THEN** its layout and its flip and switch behaviour are unchanged

### Requirement: The seat strip apportions its width by priority
In short landscape a seat strip SHALL be the full width of its board, and SHALL apportion that width in this order:

1. The **pocket** takes its natural width and is flush with the strip's leading edge.
2. The **clock** takes its natural width and is flush with the strip's trailing edge.
3. The **username** takes all width remaining between them.

The username SHALL be the only element that absorbs a change in the strip's width, so that neither the pocket nor the clock is resized by a longer or shorter name.

#### Scenario: A long name does not disturb the pocket or the clock
- **WHEN** a seat is occupied by a player whose name is long enough to fill the strip
- **THEN** the pocket and the clock keep the same rendered size and position they have with a short name, and the name occupies exactly the space between them

#### Scenario: The strip does not widen the grid
- **WHEN** any name, from the shortest to the longest permitted, is rendered
- **THEN** the width of the round app is unchanged, satisfying the existing requirement that no grid track is sized by late-arriving content

### Requirement: The pocket is sized by its contents
The pocket's width SHALL be derived from the number of droppable roles the variant offers, not from a fixed fraction of the board, so that a variant with a different pocket simply takes more or less of the strip.

That count SHALL be read where it is authoritative — the value the board library publishes on the pocket element itself, which is derived from the variant's roles — rather than from any value that merely defaults to the right number for bughouse.

The width of a pocket cell SHALL be a named parameter, so the pocket's compactness can be tuned without re-deriving the layout. That parameter SHALL default to the current compacted appearance rather than to a full board square.

#### Scenario: A variant with a different pocket size
- **WHEN** the layout is applied to a two-board variant whose pocket holds a number of roles other than five
- **THEN** the pocket's width is that number of pocket cells, and the username simply receives correspondingly more or less space

#### Scenario: Pocket cells are not stretched
- **WHEN** a pocket is measured
- **THEN** its cells are as wide as the pocket-cell parameter states, rather than being compressed to fit a slot narrower than their natural width as they are when five roles are forced into four squares

### Requirement: The clock is anchored and sized to the strip
The clock SHALL be aligned to the trailing edge and the bottom edge of its strip, and SHALL be sized as large as the strip's height allows rather than at a fixed point size. Its height is a fixed multiple of its font size — close to four — so "as large as fits" is a statement about the strip's height, not a free choice.

The clock SHALL take its **natural** width at all times, and SHALL NOT reserve room for the wider form it takes when it falls under ten seconds and begins showing tenths. Reserving that width leaves it standing empty for almost the whole game — measured at 21.8px of a 218.7px strip — and the username is a better use of the space than a placeholder for a state that has not happened yet.

The consequence is accepted deliberately: when a clock crosses into tenths the username loses that width and re-wraps. The username is already subject to truncation, and a clock in its last seconds is what the player is looking at.

Alignment SHALL be stated in terms of the strip's visual trailing edge, not its flex main-end. The clock's own box is laid out in reverse, so an alignment expressed against the main axis places it on the wrong side.

#### Scenario: Clock scales with the square unit
- **WHEN** the viewport height changes, changing the square unit and so the strip's height
- **THEN** the clock's rendered size changes with it, remaining the largest size that fits the strip

#### Scenario: Clock stays in the corner
- **WHEN** the strip's width changes for any reason
- **THEN** the clock remains flush with the strip's trailing and bottom edges

#### Scenario: The name uses the width the clock is not using
- **WHEN** a clock is displaying its ordinary form, without tenths
- **THEN** no empty width is held between the username and the clock's digits, and the username's line runs up to them

#### Scenario: A clock entering tenths takes the width back
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its box widens, and the username beside it re-wraps into what remains

#### Scenario: Clocks of different forms all sit in the corner
- **WHEN** clocks showing different forms are compared across the four strips
- **THEN** each ends flush with its strip's trailing edge, whatever its width

### Requirement: The username is legible, and truncated rather than reflowed
The username and its online indicator SHALL be rendered at a font size no smaller than the board's own coordinate labels.

Sizing SHALL NOT be expressed as a fraction of the viewport width, because the bughouse round page is routinely used in a window narrow enough for such a value to fall below legibility — at `0.7vw` a quarter-tiled window renders the name under 7px.

A name SHALL occupy at most **two** lines. It SHALL break wherever the line runs out, without honouring word or punctuation boundaries, so that each line carries as many characters as fit. A name too long for two lines SHALL be clipped after the last character that fits, with **no** ellipsis or other truncation marker.

The complete name SHALL remain present in the document, so that clipping is a visual limit only and assistive technology and hover text still carry the whole value.

#### Scenario: Name is at least as large as a coordinate label
- **WHEN** a seat's name is compared with a rank label on the adjacent board
- **THEN** the name's font size is greater than or equal to the label's

#### Scenario: A name too long for one line
- **WHEN** a name does not fit the width available between the pocket and the clock
- **THEN** it continues on a second line, broken at the character where the first line ran out rather than at a word or punctuation boundary

#### Scenario: A name too long for two lines
- **WHEN** a name does not fit two lines
- **THEN** it is cut after the last character that fits, no ellipsis is shown, no third line appears even partially, and the full name is still present in the document

### Requirement: File labels overhang the strip and stay transparent to input
A board's file labels overhang below it into the strip beneath. They SHALL paint **above** that strip's pocket and clock, rather than being covered by them.

They SHALL NOT receive pointer events. A player dragging a piece out of the pocket must be able to start the drag on a letter and still take hold of the piece underneath; the labels are decoration and must never intercept a grab.

The username SHALL be positioned clear of the overhang, so the one element carrying text that must be read is not overprinted.

#### Scenario: Labels are drawn over the pocket
- **WHEN** the strip below a board is inspected
- **THEN** the file labels are visible over the pocket and the clock rather than hidden behind them

#### Scenario: A drag started on a label reaches the pocket
- **WHEN** a pointer is pressed at a position inside the label overhang where a pocket piece lies beneath
- **THEN** the element receiving the event is the pocket piece, and the drag proceeds as if the label were not there

#### Scenario: The name clears the file labels
- **WHEN** a seat's name is rendered in a strip below a board
- **THEN** it begins below the lowest extent of the labels rather than being overprinted by them

### Requirement: The clock difference indicator is legible over the clock
The clock difference indicator SHALL be rendered half again as large as the clock text it sits on.

It MAY overlap the leading digit of the clock. The difference is the more important of the two at the moment it is shown, so the overlap is accepted rather than avoided by shrinking it.

#### Scenario: Indicator is larger than the clock text
- **WHEN** a difference indicator is displayed
- **THEN** its font size is 1.5× that of the clock it overlays

#### Scenario: Overlap is permitted
- **WHEN** the indicator is wide enough to reach the clock's first digit
- **THEN** it is drawn over that digit rather than being clipped or reduced to fit beside it
