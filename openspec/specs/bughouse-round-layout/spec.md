# bughouse-round-layout Specification

## Purpose
TBD - created by archiving change quantized-bughouse-short-landscape-grid. Update Purpose after archive.
## Requirements
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

### Requirement: The quantisation rule is duplicated deliberately and marked for removal
The square unit SHALL be computed in this project's own code, duplicating the `floor(width × devicePixelRatio / files) × files / devicePixelRatio` rule that chessgroundx applies inside `updateBounds()`.

This duplication SHALL be explicitly documented at the point of definition as a temporary measure taken because chessgroundx does not expose the rule as a pure function, together with the intent to request such an export upstream and delete the copy once available. The copy SHALL name the chessgroundx version it was taken from, so a future reader can tell whether upstream has since diverged.

#### Scenario: The duplicate is discoverable
- **WHEN** a developer reads the helper that computes the square unit
- **THEN** the comment states that the formula is duplicated from chessgroundx, names the version it matches, and says it should be replaced by an upstream export

### Requirement: No grid track is sized by late-arriving content

No track of the bughouse round grid SHALL be sized by content that can arrive or change after first paint. In particular the tools/chat column SHALL take the **remaining** width rather than being content-sized.

Because a fractional track can only distribute space that exists, the containing wrapper's own track SHALL also be made to fill the available width; a fractional tools column alone has no effect while the wrapper is content-sized.

**A rule written for one mode SHALL NOT un-fill that wrapper in another.** Modes are selected on different axes — one on width, one on height — so a rule scoped by width alone reaches every mode wider than its breakpoint. Where two such rules meet, the mode that needs a filled wrapper SHALL assert it, and SHALL do so at a specificity that actually wins.

#### Scenario: Chat messages do not move the boards
- **WHEN** a chat message long enough to exceed the column's width is added while a game is in progress
- **THEN** the grid's total width is unchanged and neither board moves horizontally; the message wraps within the column

#### Scenario: The first message does not move the boards
- **WHEN** the page loads and the initial system message is inserted into the chat
- **THEN** the boards occupy the same horizontal position before and after the insertion

#### Scenario: The column claims the leftover width
- **WHEN** the round page is displayed in short landscape
- **THEN** the tools column's width is whatever remains after the board and pocket tracks, and the grid spans the full width available to it

#### Scenario: A desktop-mode rule does not reach short landscape
- **WHEN** short landscape is displayed at a viewport wider than the desktop mode's width breakpoint
- **THEN** the round page's wrapper still fills the available width, the tools column resolves to the remainder rather than to its content, and adding a chat message moves neither board

### Requirement: The board's geometry is final before it is measured
The square unit SHALL be published **before the board is constructed**, so that the geometry chessgroundx measures when it initialises is already the final geometry. It SHALL be recomputed on viewport resize, since its inputs are the viewport height and the device pixel ratio.

Nothing on the round page SHALL move or resize a board after initialisation without the viewport itself changing. The system SHALL NOT compensate for such a movement after the fact: no additional bounds recomputation is defined, because a compensating call would conceal exactly the defect this requirement exists to prevent. A layout change that moves a board after initialisation is a defect in that layout change.

No grid track used by this layout SHALL consume the board dimensions that chessgroundx publishes, so that publishing them cannot trigger a relayout and no feedback path exists between measurement and layout.

#### Scenario: A click selects the square under the pointer
- **WHEN** a player clicks the visual centre of a square in short landscape
- **THEN** that square is selected, for every square of both boards, with no calibration or correction applied

#### Scenario: The board does not move after initialisation
- **WHEN** the page has loaded and the game is in progress, with no viewport change
- **THEN** each board's position and size are identical to what they were when it was constructed, including after chat messages arrive

#### Scenario: Resizing the viewport keeps clicks correct
- **WHEN** the viewport is resized, or the browser zoom level is changed
- **THEN** the square unit is recomputed, the boards are re-laid out, and clicking the visual centre of a square still selects that square

### Requirement: The bughouse round page does not scroll
The bughouse round page SHALL NOT produce a page-level scrollbar in short landscape. The rule SHALL be scoped to that page alone, so no other view's scrolling behaviour changes.

The scoping SHALL be achieved with a selector on `body` carrying the page's own data attributes, relying on the fact that a viewport takes its overflow from `body` when the root element's overflow is `visible`. The root element SHALL NOT be given a global overflow rule.

#### Scenario: No page scrollbar in this mode
- **WHEN** the bughouse round page is displayed in short landscape
- **THEN** no page-level scrollbar is present, and the width available for layout equals the full viewport width

#### Scenario: Other pages are unaffected
- **WHEN** any other view is displayed, including the bughouse analysis page and non-bughouse rounds
- **THEN** its scrolling behaviour is exactly as before

#### Scenario: Viewport-positioned overlays still work
- **WHEN** an element positioned relative to the viewport, such as the reconnecting indicator, becomes visible
- **THEN** it is displayed normally, since clipping the document flow does not affect it

### Requirement: Every viewport resolves to a bughouse layout

The responsive rules for the bughouse round page SHALL cover every combination of orientation and viewport size, so that `.round-app.bug` is never left to inherit the single-board layout, whose grid areas do not include the second board, the partner pockets, the partner clocks or the partner tools.

Placement alone SHALL NOT be treated as coverage. A layout in which an area is defined but resolves to zero size is not a layout that covers that viewport: the elements are present in the DOM and invisible on screen. Every area named by a mode's template SHALL therefore resolve to a usable size in that mode.

#### Scenario: Wide portrait viewports are covered

- **WHEN** the round page is displayed in portrait orientation at a viewport width of 800px or more, such as a tablet held upright
- **THEN** a bughouse layout applies, and both boards, both pairs of pockets, both clocks and the tools areas are placed in defined grid areas

#### Scenario: Phone portrait viewports are covered

- **WHEN** the round page is displayed in portrait orientation at a phone viewport, such as 386x835 or 376x835
- **THEN** a bughouse layout applies, and both boards, both pairs of pockets, both clocks and the tools areas are placed in defined grid areas **and rendered at non-zero size**

#### Scenario: Coverage is verified by size, not by placement

- **WHEN** a mode's coverage is checked
- **THEN** the check asserts the rendered width and height of each board and pocket, and a zero measurement fails it

### Requirement: No mode splits a seat's furniture across tracks
In every round-page layout mode, a seat's pocket and its clock/name block SHALL occupy one grid area together — the seat's strip — and a board SHALL be backed by a single column rather than by one column for pockets and another for clocks.

A strip SHALL present its contents in the same order in every mode: pocket, then name, then clock. Where a board is rotated and its strip runs alongside it, the strip SHALL stack its contents in that same order rather than laying them in a row.

**In the `min-height: 600px` landscape mode the two boards SHALL be adjacent**: their columns SHALL be neighbours, with the tools columns beside them rather than between them. A player compares the two boards constantly, and nothing SHALL be placed in the gap between them. Each board's seat strips SHALL be placed by the same columns as the board they belong to, so a strip always sits directly above or below its own board.

This applies to the round page's modes only. The two-board analysis layout does not express seats this way — its pockets are detached from their boards into a shared column and its clocks are positioned overlays with no grid area — and SHALL be left as it is.

#### Scenario: The split is gone from every mode
- **WHEN** the computed grid of the round app is inspected in short landscape, in `min-height: 600px` landscape, and in portrait
- **THEN** in each case a board is backed by one column, and no area holds a pocket without the clock and name that belong to the same seat

#### Scenario: A seat looks the same in every mode
- **WHEN** a seat is compared between two layout modes
- **THEN** its pocket, name and clock appear in the same order, differing only in the strip's size and axis

#### Scenario: The boards are neighbours on the desktop
- **WHEN** the round page is displayed in the `min-height: 600px` landscape mode
- **THEN** the two board columns are adjacent, and the tools areas are placed to one side of the pair rather than between them

#### Scenario: Strips follow their board
- **WHEN** the boards are reordered within the grid
- **THEN** each seat strip remains directly above or below the board whose seat it describes

#### Scenario: Analysis is untouched
- **WHEN** the two-board analysis page is compared before and after the change
- **THEN** its layout and its flip and switch behaviour are unchanged

### Requirement: The seat strip apportions its width by priority

A seat strip SHALL be the full width of its board, and SHALL apportion that width in this order,
which holds in every mode and in both arrangements of the strip:

1. The **pocket** takes its natural width and is flush with the strip's leading edge. It is never
   reduced to make room for anything else, because its squares match the board's.
2. The **username**, where it is drawn inside the strip, takes the whole of the width the pocket
   leaves, on a line of its own.
3. The **clock** takes the space that remains — the same width, on its own line above or below the
   name, and the height left over.

The clock SHALL NOT stand beside the username and take the width from it. Measured with them side
by side, a 400px strip gave the pocket 250, the clock 122.5 and the username 27.5 — which is an
initial, not a name. The previous ordering, which gave the clock its natural width before the name
saw any, is what produced that.

Neither the pocket nor the clock SHALL be resized by a longer or shorter name. A name that does not
fit the width it is given is truncated, not accommodated.

Where the stack has vertical room to grow, the username SHALL take a line of its own outside the
pocket-and-clock row, spanning the full width of the strip and rendering on a single line. This is
the ordinary arrangement, not an option: the exception is a board at or near full zoom, where the
stack is already the full height it is given and there is no room to spend. There the strip keeps
its single row and the username takes the full width the pocket leaves, as above.

Whether there is room SHALL be decided per seat, from the space that seat's stack is given, since
the two boards can be at different zooms and the answer differs between them — except in a mode that
reserves the room in its height budget, where the answer cannot vary and SHALL NOT be measured.

Taking a line of its own SHALL NOT change the pocket's size, and SHALL NOT widen the strip.

#### Scenario: A long name does not disturb the pocket or the clock
- **WHEN** a seat is occupied by a player whose name is long enough to fill the strip
- **THEN** the pocket and the clock keep the same rendered size they have with a short name, and the name is truncated instead

#### Scenario: The strip does not widen the grid
- **WHEN** any name, from the shortest to the longest permitted, is rendered
- **THEN** the width of the round app is unchanged, satisfying the existing requirement that no grid track is sized by late-arriving content

#### Scenario: The name has the width the pocket leaves
- **WHEN** a seat strip is drawn with the username inside it
- **THEN** the username and its presence indicator span the strip's width minus the pocket, and the clock spans the same width on its own line

#### Scenario: The name takes its own line
- **WHEN** a board is reduced enough that its stack no longer fills the height it is given
- **THEN** that seat's name occupies its own line outside the pocket and the clock, spans the full width of the strip, and renders on one line

#### Scenario: Full zoom keeps the single row
- **WHEN** a board is at or near full zoom
- **THEN** its strip keeps its single row, the username takes the full width the pocket leaves with the clock on its own line, and nothing is pushed outside the space the stack is given

#### Scenario: The two seats are decided separately
- **WHEN** one board is at full zoom and the other is reduced, in a mode that does not reserve the room
- **THEN** only the reduced board's seats give their names a line of their own

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

The clock SHALL be aligned to the trailing edge of its strip and to the edge nearest its board, and
SHALL be sized as large as the space left to it allows rather than at a fixed point size or at a
fixed fraction of the board's square.

The space left to it is what the pocket and the username have not taken, by the priority above. It
SHALL grow into that space: a clock sized from the board's square is blind to its room, measured at
65.1 x 19.2 in a space 194 x 49 once the username had left the strip entirely, and 105 wide in a
218.7px slot with the username on a line below it.

**Where the strip has height to give AND the widest form fits at that height, the height SHALL be
what limits the clock.** A clock stopped short by an over-estimated width bound while height sits
unused is not "as large as the space allows": measured on the desktop, a clock drawn 128.8 x 41 in a
box of 186.4 x 61, leaving 57.6px of width and 20px of height unused on all four seats.

Height that the widest form cannot be drawn in is not height the clock has to give. Where the true
width bound is the smaller of the two, it SHALL bind, and the height it leaves is not unused space
but space the text could never have occupied: measured on the desktop, a 183.03px box allows 52.29px
of font where the height would allow 57.04px, because the widest form at 57.04px needs 193.7px of
width. A clock sized to the height there would not be larger, it would be outside its box.

**Any width bound SHALL be derived from the measured width of the widest form the clock can
display, and the measurement SHALL be recorded with it.** A bound estimated from a digit count is
not a bound: an estimate of 4.4 times the font size stopped the clock short of the room it had.

**The widest form SHALL be established from what the code emits, not from what the form is assumed
to be.** The clock pads its minutes field unconditionally, so the form shown under ten seconds is
`00:09.9` — seven glyphs, measured at 3.40 times the font size. A bound derived instead from
`0:09.9` at 2.82 is derived from a form that is never displayed, and is about 9% too generous:
measured on the desktop, a box of 183.03px against digits drawn 193.7px wide.

**The bound SHALL be expressed as a division by that ratio, with the form it was measured from named
beside it**, so that what would have to change if the font changed is visible at the point of use. A
bare coefficient states no claim and cannot be checked.

**Where the ratio is inexact it SHALL be inexact in the direction that costs size rather than fit.**
A ratio above the measurement draws a slightly smaller clock when the width binds; one below it puts
digits outside the strip. The two are not equally bad and the constant SHALL sit on the safe side.

**The bound SHALL follow the form currently displayed.** A clock sized for a form it is not showing
is smaller than its box allows for as long as it is not showing it — measured on the desktop, 52.29px
held for the whole game where 57.04px would fit every form but the tenths one. The width bound SHALL
therefore be selected by what is on screen, and the clock SHALL be as large as its box allows for
that form.

The selection SHALL be made from a signal the page already publishes, and SHALL NOT be made by
measuring rendered text. `.clock` carries a `hurry` class under the same predicate that decides
tenths, so the form is available to CSS without measurement, without JavaScript and without new
state. Measuring text to fit a font is a feedback loop — the font sets the width, the width would set
the font — and remains excluded.

Sizing for a form is distinct from reserving width for it: the box keeps its natural width and only
the font is bounded.

**Fitting SHALL hold for every value the clock can display, in whichever state the bound is
selecting.** A clock whose text is wider than the box it is drawn in has failed this requirement
however correct the arithmetic that produced it, and the failure appears in the last ten seconds of a
game, when the clock is what is being read. Each state SHALL be measured and SHALL fit in its own
right; a bound that fits one form is not evidence about the other.

The space SHALL come from the seat's own board and its own strip, so a clock beside a reduced board
is smaller than one beside a full-size board. It SHALL NOT be derived from a unit shared by both
boards: measured with one board at 35%, an unshrunk clock was 136.7px against a 208px board — 70% of
the board's entire width — and it was what left the username 5.8px.

The clock's size SHALL be bounded, or the bound's absence justified, so that a clock on a strip the
name has vacated does not become the loudest element on the page.

The clock SHALL NOT reserve room for the wider form it takes when it falls under ten seconds and
begins showing tenths. Reserving that width leaves it standing empty for almost the whole game —
measured at 21.8px of a 218.7px strip. Since the username now occupies its own line rather than the
width beside the digits, a clock crossing into tenths widens within its own line and the username is
unaffected.

Alignment SHALL be stated in terms of the strip's visual trailing edge, not its flex main-end. The
clock's own box is laid out in reverse, so an alignment expressed against the main axis places it on
the wrong side.

#### Scenario: The width binds only when it is the real constraint
- **WHEN** the height would allow a font at which the widest form would not fit the box's width
- **THEN** the width bound is what limits the clock, and the height it leaves over is not treated as unused

#### Scenario: The clock fills the height the name vacated
- **WHEN** a username is drawn on a row of its own, leaving the clock the height of its line
- **THEN** the clock is drawn at the largest size that line's height allows, with no unused height above or below it

#### Scenario: The clock grows into a strip the name has left
- **WHEN** a username is drawn on a row of its own rather than inside the strip
- **THEN** the clock takes the width and height the pocket leaves, and its digits are drawn larger than they would be sharing the strip with the name

#### Scenario: A clock takes the size its current form allows
- **WHEN** a clock is displaying its ordinary form, with room its widest form would not leave
- **THEN** it is drawn at the size that ordinary form allows, rather than at the smaller size the widest form would require

#### Scenario: A clock changes size when it enters tenths, and still fits
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its font is re-bounded for that form and the wider text fits the box, the change coinciding with the state change the clock already shows at that moment

#### Scenario: A clock given time back returns to its ordinary size
- **WHEN** an increment lifts a clock back above ten seconds
- **THEN** the bound returns to the ordinary form and the clock grows back, the selection following the form displayed in both directions

#### Scenario: The tenths form fits the box it widens into
- **WHEN** a clock displays the widest form it can produce, in any mode and at any zoom
- **THEN** its digits are drawn entirely within the box the clock is given, with nothing past its edges

#### Scenario: The bound names the form it came from
- **WHEN** the width bound is read in the stylesheet
- **THEN** it appears as a division by a named, measured ratio rather than as a coefficient, and the form measured is stated with it

#### Scenario: Clock scales with its own board
- **WHEN** one board's size is changed and the other's is not
- **THEN** only that board's clocks change size, and each remains the largest size its own strip allows

#### Scenario: Clock scales with the square unit
- **WHEN** the viewport height changes, changing the square unit and so the strip's height
- **THEN** the clock's rendered size changes with it

#### Scenario: Clock stays in the corner
- **WHEN** the strip's width changes for any reason
- **THEN** the clock remains flush with its strip's trailing edge and the edge nearest its board

#### Scenario: The name uses the width the clock is not using
- **WHEN** a clock is displaying its ordinary form, without tenths
- **THEN** no empty width is held anywhere in the strip against the wider form the clock may later take

#### Scenario: A clock entering tenths takes the width back
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its box widens within its own line, and the username's line is unchanged

#### Scenario: Clocks of different forms all sit in the corner
- **WHEN** clocks showing different forms are compared across the four strips
- **THEN** each ends flush with its strip's trailing edge, whatever its width

### Requirement: The username is legible, and truncated rather than reflowed

The username and its online indicator SHALL be rendered at a size bounded above by a single
constant, which is the size a single-board round page draws a username at — measured at 16.8px,
being `1.2em` of a 14px root. That bound SHALL be the same value in every mode and for every seat.

Within that bound the size SHALL follow the room the name has been given, so that a name grows up to
the cap wherever there is room for it, and is drawn smaller where there is not — that is, where it
is squeezed into the width the pocket leaves rather than given a row of its own.

The size SHALL NOT be smaller than the board's own coordinate labels, which remains the floor.

Sizing SHALL NOT be expressed as a fraction of the viewport width, because the bughouse round page
is routinely used in a window narrow enough for such a value to fall below legibility — at `0.7vw` a
quarter-tiled window renders the name under 7px.

Sizing SHALL NOT be a fixed fraction of the board's square either, for the reason given under the
furniture requirement above.

No multiplier SHALL be applied to the size according to which arrangement the name is in. A name on
its own row is larger because its row is wider, not because it is doubled.

The size SHALL NOT depend on the length of the particular username. A size that varied per player
would make the reserved row's height unknowable, which is what the height budget depends on.

A name SHALL occupy exactly **one** line, in both arrangements. A name too long for the width it is
given SHALL be truncated with an ellipsis. It SHALL NOT wrap: a wrapped name in a one-square strip
is two clipped fragments, the second usually cut mid-word by the character-level breaking this
requirement previously mandated, and an ellipsis says the name continues where a hard clip merely
looks broken.

The complete name SHALL remain present in the document, so that truncation is a visual limit only
and assistive technology and hover text still carry the whole value.

#### Scenario: A name grows up to the cap and no further
- **WHEN** a username has a row of its own that is wider than the capped size needs
- **THEN** it is drawn at the cap, and not larger

#### Scenario: Name is at least as large as a coordinate label
- **WHEN** a seat's name is compared with a rank label on the adjacent board
- **THEN** the name's font size is greater than or equal to the label's

#### Scenario: A squeezed name gets smaller before it truncates
- **WHEN** a username is drawn inside the strip, in the width the pocket leaves
- **THEN** it may be drawn below the cap, and is truncated only once it still does not fit at that size

#### Scenario: A name too long for one line
- **WHEN** a name does not fit the width available to it
- **THEN** it is truncated with an ellipsis on that line rather than continuing onto a second, which is the reverse of what this scenario previously required

#### Scenario: A name too long for two lines
- **WHEN** a name is far longer than its width can hold
- **THEN** no second line appears at any length: the name stays on one line, ends in an ellipsis, and the full value remains in the document for assistive technology and hover text

#### Scenario: Two names of different lengths are the same size
- **WHEN** two seats with equal room hold usernames of very different lengths
- **THEN** both are drawn at the same font size, and only the longer one is truncated

### Requirement: A board is given room for its labels when there is room to give

Where a mode has vertical space to spare after its boards and strips, that space SHALL be spent
first on a gap below the board, so the file labels have somewhere of their own rather than painting
over the strip beneath.

The gap SHALL be the spare height, capped at the labels' natural overhang, and SHALL vary
continuously with it — no larger than the labels want, no larger than the room allows. Each board's
gap SHALL follow ITS OWN column's spare height, since the two columns are sized independently.

The labels SHALL scale to the gap rather than be clipped by it, so a label is always whole. A label
too small to read is not a small label but an absent one, so below a legibility floor the gap SHALL
be zero rather than any intermediate value, and the room SHALL be returned to the strip.

The gap SHALL be computed from sizes that do not depend on it — the space the mode has and the
board's own square — and never from anything that the gap itself moves. Nothing that consumes the
spare height afterwards may feed back into it.

Where the mode has no spare height, the gap SHALL be zero and the page SHALL be laid out exactly as
it is with no gap at all.

#### Scenario: Room below full zoom becomes a gap
- **WHEN** a board is displayed at a zoom that leaves more spare height than the labels' overhang
- **THEN** the strip below it is pushed down by the full overhang and the labels sit clear of the pocket

#### Scenario: Full zoom is unchanged
- **WHEN** a board is displayed at a zoom that leaves less spare height than the legibility floor
- **THEN** the gap is zero and the stack is laid out exactly as it is today

#### Scenario: The gap follows its own column
- **WHEN** the two boards are displayed at different zooms
- **THEN** each board's gap is sized from its own column's spare height, not from the other's

#### Scenario: A label is never cut off
- **WHEN** the gap is smaller than the labels' natural overhang and at or above the floor
- **THEN** the labels are drawn at the gap's size, whole, rather than at their natural size and clipped

### Requirement: File labels overhang the strip and stay transparent to input

A board's file labels overhang below it. Where the layout has given the board a gap they overhang
into that gap; where it has not, they overhang into the strip beneath, and SHALL then paint **above**
that strip's pocket and clock rather than being covered by them.

They SHALL NOT receive pointer events. A player dragging a piece out of the pocket must be able to
start the drag on a letter and still take hold of the piece underneath; the labels are decoration and
must never intercept a grab. This holds whether or not there is a gap, because a gap that is smaller
than the labels still leaves them over the strip.

The username SHALL be positioned clear of the overhang, so the one element carrying text that must be
read is not overprinted.

#### Scenario: Labels are drawn over the pocket
- **WHEN** the strip below a board is inspected and the board has no gap
- **THEN** the file labels are visible over the pocket and the clock rather than hidden behind them

#### Scenario: A drag started on a label reaches the pocket
- **WHEN** a pointer is pressed at a position inside the label overhang where a pocket piece lies beneath
- **THEN** the element receiving the event is the pocket piece, and the drag proceeds as if the label were not there

#### Scenario: The name clears the file labels
- **WHEN** a seat's name is rendered in a strip below a board
- **THEN** it begins below the lowest extent of the labels rather than being overprinted by them

### Requirement: The clock difference indicator is legible over the clock
The clock difference indicator SHALL be rendered half again as large as the clock text it sits on.

It SHALL be placed beside the clock rather than over it wherever there is room beside it: its trailing edge SHALL meet the clock's leading edge, so that no digit is covered while space next to the clock stands empty. Measured on the desktop, the clock's box is 145.8px inside a 183.03px slot and the indicator is 21.44px — it fits beside the clock with 15px to spare, and covers a digit anyway.

Where the space beside the clock is less than the indicator needs, it SHALL move over the clock by that shortfall and no more, and SHALL do so progressively rather than in one step. Where there is no space at all, it SHALL sit at the clock's leading edge, over the first digit.

It MAY therefore overlap the leading digit, and when it does the overlap SHALL be accepted rather than avoided by shrinking or clipping the indicator. The difference is the more important of the two at the moment it is shown; what changes is that the overlap is what happens when the room runs out, not what happens by default.

The amount of the overlap SHALL follow from the space available rather than from a measurement of the indicator held as a constant.

#### Scenario: Indicator is larger than the clock text
- **WHEN** a difference indicator is displayed
- **THEN** its font size is 1.5× that of the clock it overlays

#### Scenario: The indicator takes the space beside the clock
- **WHEN** the space beside the clock is at least as wide as the indicator
- **THEN** the indicator is drawn entirely beside the clock, with its trailing edge at the clock's leading edge and no digit covered

#### Scenario: The indicator moves in by what it must
- **WHEN** the space beside the clock is narrower than the indicator but not zero
- **THEN** the indicator overlaps the clock by the shortfall alone, and the overlap grows and shrinks with the space rather than switching between two positions

#### Scenario: Overlap is permitted when the room is gone
- **WHEN** there is no space beside the clock
- **THEN** the indicator is drawn over the leading digit rather than being clipped or reduced to fit beside it

### Requirement: The round page reserves no space it does not use

The bughouse round page SHALL NOT reserve vertical space for content that is not there. Every grid
track it declares SHALL be sized from what occupies it, so that an area whose element is empty — or
whose element does not exist — costs nothing.

Space that IS free SHALL be spent rather than left idle, and the labels have the first claim on it:
a gap below the board SHALL be settled before any optional use of the same height, so that whatever
else consumes it sees only what the labels did not take.

No page-level wrapper SHALL inherit the round page's row template. A grid that declares one area
SHALL have the rows that area needs and no others; a wrapper SHALL NOT end below its only child.

A row's height SHALL NOT be a fixed pixel value chosen for one expected occupant, because that value
is simultaneously too much when the occupant is empty and arbitrary when it is not.

#### Scenario: An empty sidebar costs nothing
- **WHEN** the round page renders with an empty first sidebar
- **THEN** the row holding it has no height, and the page is no taller for it

#### Scenario: The labels are served before the optional line
- **WHEN** the spare height could hold either a label gap or a username's own line, but not both
- **THEN** the gap is taken and the name stays inline, rather than the two both claiming it

#### Scenario: The wrapper ends where its content ends
- **WHEN** the page wrapper is measured
- **THEN** its bottom edge is the bottom edge of its only child, with no track below it

#### Scenario: The desktop page does not scroll over emptiness
- **WHEN** the round page is displayed in the `min-height: 600px` landscape mode at a viewport tall enough for the boards
- **THEN** the document's scrollable height does not exceed the viewport on account of empty areas

### Requirement: No grid track is sized from its own occupant

No grid track SHALL be sized from a value that is derived, directly or indirectly, from the measured geometry of an element placed in that track. Such a rule is circular, and because a chess board's measured width feeds the track that sizes it, **zero is a stable fixed point** with no path back.

Track sizes SHALL be derived from inputs the layout does not itself produce — the viewport, or a sibling track's share of it. This is distinct from the existing rule against late-arriving *content*: that one concerns tracks that grow when data appears, while this one concerns tracks that can never grow at all.

#### Scenario: The partner column does not read the partner board's width

- **WHEN** the portrait grid's partner column is computed
- **THEN** its size derives from the viewport height and not from `--cg-width-a`, `--cg-width-b` or any other value chessgroundx writes from a measured board

#### Scenario: A board that measures zero recovers

- **WHEN** a board is measured as zero wide for any reason during initialisation
- **THEN** the track holding it still has its full size on the next layout pass, and the board is restored to that size

#### Scenario: Every board and pocket is usably sized

- **WHEN** the round page is displayed in any supported orientation and viewport
- **THEN** both boards and all eight pockets have non-zero width and height

### Requirement: Portrait sizes both boards from the viewport

In portrait orientation the two boards SHALL be sized from the viewport, each remaining square.

The player's own board SHALL occupy the full width available to the grid, so **its height always equals the width of the window**. The partner's board SHALL be at least **20% of the viewport height**, which makes it visibly smaller than the player's own board and places it above it.

Squareness SHALL be expressed as an aspect ratio rather than by deriving one axis from `100vw`. `100vw` includes the scrollbar, so a page that overflows renders the board wider than its own container and offset outside it.

#### Scenario: The player's board is full width and square

- **WHEN** the round page is displayed in portrait at any phone viewport
- **THEN** the player's board spans the full width available to the grid and its height equals that width

#### Scenario: The partner's board is smaller and above

- **WHEN** the round page is displayed in portrait
- **THEN** the partner's board is square, at least 20% of the viewport height, and positioned above the player's own board

#### Scenario: A scrollbar does not push the board out of its container

- **WHEN** the portrait page overflows vertically and takes a scrollbar
- **THEN** the player's board is no wider than its container and its left edge is not negative

### Requirement: Portrait fits the round page in the viewport

In portrait the round page SHALL fit the viewport without the document scrolling. The tools/chat panel SHALL take the height remaining after the boards and seat strips and SHALL scroll its own content within that height.

The site header SHALL be hidden in portrait for bughouse, as it already is in short landscape, because the vertical budget does not accommodate it.

#### Scenario: The document does not scroll

- **WHEN** the round page is displayed in portrait at a phone viewport
- **THEN** the document's scroll height does not exceed the viewport height

#### Scenario: The panel scrolls instead of the page

- **WHEN** the tools/chat panel holds more content than its height allows
- **THEN** the panel scrolls internally and the boards do not move

#### Scenario: The panel is always visible

- **WHEN** the round page is displayed in portrait
- **THEN** the tools/chat panel has non-zero height and is within the viewport without scrolling

### Requirement: A board fills the height it is given at full zoom

In the `min-height: 600px` landscape mode, full zoom SHALL mean the board is as large as its
space allows. A board's stack — the pocket row above it, the board, and the pocket row below it —
SHALL together fill the height available to that stack, and the board SHALL remain square.

Zoom below full SHALL scale the stack down from that maximum rather than up towards it. Each
board SHALL use its own scale, so the two sliders remain independent and one board may be
enlarged while the other is not.

The size SHALL derive from the height the layout allots, not from a fixed fraction of the
viewport width, so that a taller window yields a larger board without touching a slider.

#### Scenario: Full zoom fills the height
- **WHEN** the round page is displayed in this mode with a board's zoom at full
- **THEN** that board's stack — top pocket row, board, bottom pocket row — occupies the full height available to it, and the board is square

#### Scenario: The default is the shared one
- **WHEN** a board's zoom has never been adjusted
- **THEN** it takes the same default as every other board on the site, and this layout claims no special value for it

#### Scenario: A taller window gives a larger board
- **WHEN** the same page is displayed in a window of greater height, with the sliders untouched
- **THEN** both boards are drawn larger, in proportion to the height gained

#### Scenario: Zoom still shrinks the board
- **WHEN** a board's zoom setting is reduced from its default
- **THEN** that board's stack becomes proportionally shorter and no longer fills the height, and the board stays square

#### Scenario: The two boards zoom independently
- **WHEN** the two boards' zoom settings differ
- **THEN** each board reflects its own setting and neither follows the other

### Requirement: Landscape is two columns, and the tools belong to the second

In both landscape modes the round grid SHALL have exactly two columns that carry content.

The first column SHALL hold the left board's stack and nothing else, and its width SHALL be
unaffected by the tools.

The second column SHALL hold both the right board's stack and the tools, **as siblings in one
container**, so that the column's size is the size of the two together rather than of whichever is
wider. The tools SHALL NOT occupy a column of their own, and SHALL NOT be laid out beside both
boards.

That column SHALL be sized differently per mode, because the two modes have different amounts to
spend:

- In tall landscape it SHALL be sized from its contents.
- In short landscape it SHALL take whatever width is left after the first column.

Merging the columns SHALL NOT change the size or the appearance of either the right board or the
tools at their default settings. This requirement is structural: it fixes where they live, not
what they look like.

How they arrange themselves *within* that container is the subject of the two requirements below.
What this one establishes is that they share it, which is what makes it possible for parts of the
tools to sit under the right board once it is smaller than the container.

Separation between the two boards SHALL be preserved: the left board's rank labels overhang to
its right and SHALL NOT paint onto the right board.

#### Scenario: The grid has two content columns
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the grid defines two columns carrying content, and no track is dedicated to the tools alone

#### Scenario: The tools sit with the right board
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the tools and the right board's stack share one container occupying the second column

#### Scenario: Nothing changes size
- **WHEN** the round page is displayed in either landscape mode with default settings, before and after this change
- **THEN** the right board and the tools have the same size and position on screen as they did

#### Scenario: The merged column is content-sized in tall landscape
- **WHEN** the round page is displayed in tall landscape
- **THEN** the second column is as wide as the right board and the tools together, and no wider

#### Scenario: The merged column takes the remainder in short landscape
- **WHEN** the round page is displayed in short landscape
- **THEN** the second column occupies the width left over after the first column, and both boards remain fully on screen

#### Scenario: The left board is unaffected
- **WHEN** the tools' contents change size, or a tab with different contents is selected
- **THEN** the left board's column keeps its width and the left board does not move

#### Scenario: The boards stay separated
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the left board's rank labels do not paint onto the right board

### Requirement: The tools are placed as parts, not as a panel

In the landscape modes the tab parts and the tab bar SHALL be placed individually inside the
second column. No container SHALL fix them beside the right board, because such a container is
what makes the space under a shrunken board unreachable: it is a grid item confined to its own
track, and being a block formatting context it cannot flow around the board either. Where a
container is needed for another mode, it SHALL form no box in these modes.

The right board and its two seat strips SHALL be grouped, since they are one unit that moves and
sizes together and cannot be arranged individually without coming apart.

**Parts leave the strip beside the board in a fixed order**: the tab bar first, then the preset
parts from the bottom up. The chat SHALL NOT move in any arrangement; it SHALL remain beside the
board and take whatever height the others leave.

A part that leaves SHALL NOT merely relocate — it SHALL widen to the full width of the column,
sitting below both the board and the parts still above it.

A part SHALL leave only when the board's stack still fits in the height that would remain, so a
part never drops into a space that does not hold it, and the parts above it never leave a gap.

What a single tools container provided SHALL be preserved: only the selected tab's parts are
visible; the second column still yields its width before either board is pushed off screen; and
the tab bar, holding the tab list and the game controls, remains reachable in every mode.

#### Scenario: Nothing moves at full zoom
- **WHEN** the round page is displayed in a landscape mode with both boards at full zoom
- **THEN** the parts are arranged beside the right board as they were, and the page looks unchanged

#### Scenario: The tab bar leaves first
- **WHEN** the right board is made small enough that one part can leave, but no smaller
- **THEN** the tab bar is the part that has moved, it spans the full width of the column, and it sits below the board and below every part still beside it

#### Scenario: The presets follow, from the bottom up
- **WHEN** the right board is made small enough for further parts to leave
- **THEN** the preset parts leave after the tab bar and in reverse order, each spanning the full width of the column

#### Scenario: The chat never moves
- **WHEN** the right board is at any zoom
- **THEN** the chat is beside the board, and it is taller for every part that has left

#### Scenario: Parts of a tab still travel together
- **WHEN** a tab is selected
- **THEN** every part of that tab is shown and every part of the other tabs is hidden, wherever each part is placed

#### Scenario: A tab with one part moves only the tab bar
- **WHEN** a tab that has no preset parts is selected and the board is small enough for a part to leave
- **THEN** the tab bar spans the full width and the tab's own panel stays beside the board

#### Scenario: The boards still win the width
- **WHEN** the viewport is too narrow for the parts at their natural width
- **THEN** the parts yield and both boards remain fully on screen

#### Scenario: The controls remain reachable
- **WHEN** the round page is displayed in any mode
- **THEN** the tab list and the game controls are within the viewport and can be clicked

### Requirement: A preset part holds two sets that pair when there is room

The presets SHALL be divided into two parts, each holding two sets of five buttons, so that they
can take the space under the board one part at a time rather than all together or not at all.

A set SHALL NOT be broken up: its five buttons SHALL stay on one row. The ask and don't-give sets
SHALL remain piece-aligned when stacked, so that "need a knight" sits directly above "don't give
a knight".

**Every preset button on the page SHALL be the same size**, whatever part it belongs to and whether
or not that part has left the strip beside the board. A part is one width beside the board and
another once it has dropped; the size SHALL NOT be taken from that width, or the same control is
drawn at two sizes on one screen.

The size SHALL be taken from the column the parts share, which is the same width in both states.
That column SHALL be sized with a zero minimum, so that a button can never widen the column that
decides the button.

A mode SHALL raise the size above the floor to suit the room it has. The floor SHALL remain a
floor: it exists for the minimum usable target size and SHALL NOT be the size wherever there is
more room than it needs.

Within a part the two sets SHALL sit side by side where the part is wide enough for both, and SHALL
stack where it is not. The arrangement SHALL follow from the size rather than being asserted, and
**the size SHALL leave the pairing possible**: a set SHALL be narrow enough that two of them fit
the width a part is given once it has dropped below the board. A size that fills the parts column
forbids that pairing at every width this layout produces, and SHALL NOT be used.

**Every row of preset buttons SHALL step by the same pitch**, so that a row of ten and a row of five
agree column by column. The pitch SHALL be set by the five-button row and taken by the ten-button
row; a row SHALL NOT derive a spacing from the width it happens to have been given. Two rows that
each spread across their own width step by different amounts and line up with nothing: measured on
the desktop, 38.3 in the column against 53.5 below the board.

**The pitch is a HORIZONTAL quantity and SHALL NOT be applied between rows.** It exists so that
buttons on one row line up with buttons on another, and a row spacing taken from it makes the two
sets inside a part sit further apart than two parts sit from each other — measured 38.27 between the
rows of one part against 5 between two parts, so four stacked rows read as two pairs. Every vertical
gap SHALL instead be the spacing that separates one part from the next, so that stacked rows are
evenly spaced however they are grouped.

**A pitch that fills the parts column makes pairing cost twice that column.** Ten buttons at the
column's own pitch need twice its width plus a gap — measured 803.7px against a column of 382.8 —
so a part narrower than that stacks its sets instead of pairing them. That is the honest outcome
rather than a defect: the alternative is a row that steps by a different amount from the rows above
it, which is what this requirement exists to prevent. The pairing SHALL still be possible at the
widths the layout actually produces for a dropped part.

**The spacing between two buttons SHALL be the same wherever they sit on a row**, including where the
boundary falls between two sets. A part that spaces its sets internally and lets them abut leaves one
pair of buttons touching while every other pair is held apart — measured as a gap of 0 against 53.5
on the desktop, and 0 against 3 in portrait, where it is the same defect at a size that hides it.

**Rows SHALL be aligned to their trailing edge**, so that the last five buttons of a ten-button row
sit exactly under the five above it. Trailing rather than centred is also what keeps that alignment
stable: the spare width collects at the leading end, so the last set stays anchored and a change to
the spacing moves the first set rather than the last.

**The spare width SHALL go to the margin rather than between the buttons.** Spreading it makes the
spacing a function of a width that changes whenever the board is resized — measured sliding 53.52 to
38.52 to 26.52 as the right board shrank — so a control nobody is touching rearranges continuously.
With one pitch the same sweep changes neither size, spacing nor alignment, and a part dropping below
the board changes only which row its sets are on.

#### Scenario: Beside the board the sets stack
- **WHEN** a preset part is in the strip beside the partner board
- **THEN** its two sets are on separate rows, five buttons each, as the presets have always been drawn

#### Scenario: A part that has left shows ten buttons on one row
- **WHEN** a preset part has flowed into the wider space below the board
- **THEN** its two sets share one row of ten buttons and the part is half the height it was beside the board

#### Scenario: The last five line up with the five above
- **WHEN** a part has dropped below the board while another part is still beside it
- **THEN** the last five buttons of the dropped row sit exactly under the five buttons of the rows above, column by column

#### Scenario: Stacked rows are evenly spaced however they are grouped
- **WHEN** four rows of five are stacked, two from each part
- **THEN** the gap between the two rows of one part equals the gap between the two parts, so no pair of rows reads as more closely related than another

#### Scenario: The spacing is the same across a set boundary
- **WHEN** a row of ten buttons is measured gap by gap
- **THEN** all nine gaps are equal, including the one where one set ends and the next begins

#### Scenario: Dropping a part moves nothing but the part
- **WHEN** the board is resized until a second part drops below it
- **THEN** the button size, the spacing and the alignment are unchanged, and only which row a set sits on differs

#### Scenario: A button uses the width the column has
- **WHEN** the parts column is wider than the floor requires
- **THEN** the buttons are drawn larger than the floor, in proportion to that column

#### Scenario: One size across parts and states
- **WHEN** one preset part is beside the board and the other has dropped below it
- **THEN** every button in both parts is the same size

#### Scenario: Portrait is unaffected
- **WHEN** the round page is displayed in portrait
- **THEN** the buttons are sized by portrait's own viewport rule and the parts pair their sets exactly as they did before this change

#### Scenario: Buttons stay usable
- **WHEN** the parts column is too narrow for the raised size
- **THEN** the buttons are drawn at the floor and remain at or above the minimum usable target size

#### Scenario: The size does not feed back into the layout
- **WHEN** the button size changes because the window changed
- **THEN** the parts column keeps the width its track gives it, and the layout settles rather than alternating

### Requirement: A board offers a resize handle only where resizing works

A board SHALL render its resize handle only in a mode where dragging it changes the board's size.

Where a mode derives its board size from something other than the zoom setting — as short
landscape does, sizing from the height-derived square with no zoom factor in the track — the
handle SHALL NOT be shown, and SHALL NOT be draggable.

This SHALL be decided per layout mode rather than per viewport width. The shared rule that shows
the handle above a fixed viewport width is the reason a mode that ignores zoom still displays it.

#### Scenario: Short landscape shows no handle
- **WHEN** the round page is displayed in short landscape
- **THEN** neither board renders a visible resize handle, and there is nothing in the board's bottom-right corner to drag

#### Scenario: The handle stays where it works
- **WHEN** the round page is displayed in tall landscape
- **THEN** each board renders its resize handle, and dragging it changes that board's size

#### Scenario: Hiding the handle does not disable zoom
- **WHEN** a mode that hides the handle is displayed and the zoom setting is changed by other means
- **THEN** the setting is stored as it always was; only the handle is absent

### Requirement: The end-of-game controls sit with the tab parts

When a game has finished, the controls it offers — rematch, a new opponent, the analysis board —
SHALL be placed among the tab parts, in the region the parts occupy.

They SHALL NOT be placed in the strip that holds the in-game controls. That strip is sized for
Draw and Resign and shares its row with the tab list; the end-of-game controls are wide text
buttons and replacing the in-game controls with them is what puts them there today.

The in-game controls SHALL remain in their own strip and SHALL simply no longer be offered once
they no longer apply.

The controls SHALL be **stacked, one above the next**, and each SHALL span the width it is given.
They SHALL share a row only where the height available will not hold them stacked — pairing is the
fallback, not the arrangement.

There SHALL be a visible gap between the topmost control and whatever part sits above it, so the
buttons do not read as a continuation of the panel above them.

#### Scenario: They are not in the control strip
- **WHEN** a game finishes
- **THEN** the rematch, new opponent and analysis controls are inside the region the tab parts occupy, and none of them is inside the strip that held Draw and Resign

#### Scenario: The in-game controls give way
- **WHEN** a game finishes
- **THEN** Draw and Resign are no longer offered, and the strip that held them does not hold the end-of-game controls in their place

#### Scenario: They stack by default
- **WHEN** a game finishes and the region holding the controls has room for them stacked
- **THEN** each control is on its own row, spanning the width of that region, whatever the layout mode

#### Scenario: They pair only when they must
- **WHEN** the height available will not hold all of them stacked
- **THEN** they occupy more than one column, sharing the width evenly, rather than overflowing the region

#### Scenario: They are not flush against the part above
- **WHEN** a game finishes
- **THEN** there is a gap between the topmost control and the part above it

#### Scenario: Every mode can reach them
- **WHEN** a game finishes in any of the three layout modes
- **THEN** all three controls are within the viewport and can be clicked

### Requirement: A seat's furniture is sized from its own board

Every part of a seat's furniture that has a physical relationship to the board — the strip that
holds it, the pocket and the clock — SHALL be sized from the board that seat is playing on, and
SHALL change with that board's size.

It SHALL NOT be sized from a unit shared by the whole layout where the two boards can differ in
size. A shared unit is derived from the viewport and cannot distinguish the two, so a board
reduced to a third of its partner's size keeps the furniture of a full-size board.

**The username and its rating are excepted, and are sized by the requirement below instead.** Text
has a readable size that is not a property of a chessboard: sizing the name from the square produced
7.21px on a seat whose row was 165.3px wide with nothing else on it, and 16.74px on its neighbour,
for no reason other than that one board was smaller than the other. The pocket must match its
board because it sits pieces on squares; the clock must fit its strip; a name must be legible.

At full size the furniture SHALL be what it is today: this requirement fixes how it changes, not
what it looks like when nothing has been changed.

The pocket SHALL be a fixed number of its own board's squares wide. That number is NOT fixed
across layout modes — the modes differ deliberately, and a pocket may be five squares in one and
four in another — only that it is expressed in the squares of the board it belongs to.

#### Scenario: Two boards at different sizes get different furniture
- **WHEN** one board is reduced and the other left at full size
- **THEN** the reduced board's strip, clock and pocket are all smaller than its partner's, in proportion to the two boards

#### Scenario: A smaller board does not get a smaller name
- **WHEN** one board is reduced and the other left at full size, and both seats have room for their names
- **THEN** both usernames are drawn at the same size

#### Scenario: Full size is unchanged
- **WHEN** both boards are at full size
- **THEN** the strip, pocket and clock are the size they were before this change

#### Scenario: The strip does not tower over its board
- **WHEN** a board is reduced
- **THEN** its strip's height stays proportional to that board's square, rather than staying at the height a full-size board would give it

#### Scenario: A pocket is measured in its own board's squares
- **WHEN** a board is reduced
- **THEN** its pocket occupies the same number of that board's squares as it did before, and no space is left over inside the strip around it

### Requirement: Every mode uses the same merged column

The partner board's stack and the tools parts SHALL share one container in **every** layout mode,
and the rules that govern that container SHALL be stated once rather than repeated per mode.

A mode SHALL differ only in what it cannot share: the widths of the two columns inside the
container, and the gap between them. The container being a grid, its rows, its areas, the stack
taking its content height and the parts being placed individually SHALL be common.

Portrait SHALL keep the player's own board full width at the bottom of the page, with the merged
column occupying the region above it. That is the only structural difference portrait retains.

#### Scenario: Portrait places parts under the partner board
- **WHEN** the round page is displayed in portrait and the partner board leaves room beneath it
- **THEN** parts occupy that space, in the same order and by the same rule as in the landscape modes

#### Scenario: The own board stays at the bottom
- **WHEN** the round page is displayed in portrait
- **THEN** the player's own board is full width at the bottom of the page, below everything else

#### Scenario: No space is left unreachable
- **WHEN** the round page is displayed in portrait
- **THEN** there is no region of the area above the own board that no part can occupy

#### Scenario: The modes agree
- **WHEN** the merged column's structure is compared across the three modes
- **THEN** they differ only in the two column widths and the gap between them

### Requirement: A board is measured once and redrawn only on explicit user action

A board SHALL be rendered once, at load, with its exact bounds. Nothing before or after that
rendering SHALL change them.

A board's size SHALL change only when the user explicitly zooms or resizes, and those SHALL be the
only places a board is redrawn.

**No element other than `document.body` SHALL be observed for the purpose of resizing a board.**
chessgroundx already observes body itself; nothing in this project may add to it.

A board that comes out wrong at load SHALL be treated as a layout defect — something resized during
load that should not have — and SHALL be fixed there. It SHALL NOT be corrected afterwards by a
listener that re-measures.

#### Scenario: The board is right the first time
- **WHEN** the round page loads in any mode
- **THEN** each board is drawn at the size of its container, without any later measurement correcting it

#### Scenario: Nothing observes a board's container
- **WHEN** the round page's code is inspected for resize handling
- **THEN** the only observed element is `document.body`, and no observer exists whose purpose is to re-measure a board

#### Scenario: A user zoom redraws the board
- **WHEN** the user changes a board's zoom or resizes the window
- **THEN** the board is redrawn at the new size, and this is the only path by which its size changes

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

### Requirement: Coordinates may be drawn inside the squares

Where there is no room outside the board for a legible label, board coordinates SHALL be drawn inside
the squares rather than overhanging the board's edges.

The condition SHALL be the absence of room, not the identity of the layout. A mode SHALL NOT be named
in order to receive internal coordinates: it receives them when its own spare height resolves to no
gap, which the portrait and short landscape modes do by construction, their stacks being exactly ten
squares of their own unit. The desktop mode receives them at the zooms where it too has no room, and
keeps its labels outside at every zoom where it has.

A label drawn inside a square SHALL remain legible against that square: it SHALL contrast with the
square it sits on, whichever colour that is, and SHALL be placed so that it does not compete with a
piece standing on the same square.

Internal coordinates are a way of buying room, not a change of house style. A label SHALL sit outside
the board wherever the room for it exists.

**The on-square treatment SHALL be the default, and the outside treatment SHALL be what the condition
selects.** Whichever is asked for conditionally is the one lost when the browser cannot evaluate the
condition, so the condition SHALL be arranged to fail towards labels that are present and readable.
Written the other way about, a browser that cannot evaluate it keeps the outside treatment everywhere
and sizes every label from a gap of zero, so the coordinates disappear on exactly the small screens
this requirement exists to serve.

The gutters between the boards SHALL be kept whether or not the labels still need them. They separate
the boards for their own sake, and the room they happened to give the labels was incidental to that.

Coordinates SHALL be available on a phone. They were hidden there because the layout had nowhere to
put them, which internal placement removed as a reason.

#### Scenario: Labels sit on their squares
- **WHEN** the round page is displayed in a mode with no room for external labels
- **THEN** every rank and file label is drawn within the board's own area, and none overhangs its edge

#### Scenario: The gutters stay
- **WHEN** a mode draws its coordinates internally
- **THEN** the gutter separating the boards is unchanged

#### Scenario: A browser that cannot evaluate the condition still shows coordinates
- **WHEN** the round page is rendered by a browser that does not support the mechanism the condition is expressed in
- **THEN** every coordinate is drawn on its square and remains readable, and only the outside placement is lost

#### Scenario: The mobile modes are not named
- **WHEN** the rule that selects internal coordinates is inspected
- **THEN** it tests the room available, and no layout mode appears in it by name

#### Scenario: The desktop keeps its labels outside where it has room
- **WHEN** the round page is displayed in the tall landscape mode at a zoom leaving room for the labels
- **THEN** the labels overhang the board's edges exactly as they did before

#### Scenario: A label is readable on either square colour
- **WHEN** a coordinate label falls on a light square and when it falls on a dark one
- **THEN** it is legible in both cases

#### Scenario: A phone shows coordinates
- **WHEN** the round page is displayed on a phone in portrait
- **THEN** coordinates are shown

### Requirement: An external coordinate label sits against the board it names

A coordinate label drawn OUTSIDE the board SHALL be separated from that board's edge by one fixed,
minimal distance, and that distance SHALL be the same on both axes. A rank label lies in a gutter
with something else on the far side of it, and a label nearer the thing it does not name states the
wrong thing about the position rather than stating nothing.

The distance SHALL be named once and used by both axes, so the two can never disagree about it. Its
value SHALL be the distance the file labels already show below the board, taken by measurement from
the live page.

A rank label SHALL be placed by anchoring it to the board's own edge and moving it outward by that
distance. It SHALL NOT be placed by anchoring it at some remove from the board and then relying on a
box width and an alignment to arrive at a distance — three values that must agree where one states
what is meant. The box holding the rank labels SHALL be no wider than the label in it, so no slack
remains for an alignment to push a label across.

This requirement concerns only labels drawn outside the board. Labels drawn inside the squares are
governed by the requirement that selects them and are unaffected.

This requirement fixes the label's distance from its board. It says nothing about how wide the
gutter beyond the label should be.

#### Scenario: A rank label is nearer its own board than anything else
- **WHEN** a board's rank labels are drawn outside it
- **THEN** the distance from a label to its own board is smaller than the distance from that label to whatever lies on the far side of the gutter

#### Scenario: The two axes are the same distance out
- **WHEN** a board's file labels below it and its rank labels beside it are both drawn outside the board
- **THEN** each is the same distance from the board's edge, and that distance is declared in one place

#### Scenario: The rank labels are anchored to the board
- **WHEN** the rule placing the rank labels is inspected
- **THEN** it positions them from the board's own edge outward by the named distance, and no constant box width or alignment contributes to how far they land

#### Scenario: Internal coordinates are untouched
- **WHEN** the round page is displayed in a mode whose coordinates are drawn inside the squares
- **THEN** every label is placed exactly as it was before this requirement existed

### Requirement: An offer is answered on the control that made it

Every state of an offer — that it has been made, and the means of answering it — SHALL be drawn on
the control the offer was made with. An offer SHALL NOT be answered from a panel, strip or area
placed apart from that control.

No element SHALL exist whose only purpose is to hold offers. Where the last such element's states
have moved onto their controls, that element and any layout area reserved for it SHALL be removed
rather than left empty.

An offer that is turned down SHALL return every control it touched to its resting state, on the side
that made it as well as the side that received it. A control SHALL NOT be left indicating an offer
that has already been answered.

#### Scenario: The answer appears where the question was asked
- **WHEN** a player is offered a draw or a rematch
- **THEN** the means of accepting it is drawn on the control that offers that same thing, and nowhere else on the page

#### Scenario: The offerer sees the offer on their own control
- **WHEN** a player has made an offer and it has not yet been answered
- **THEN** the control they used shows that the offer is outstanding, and no message about it appears anywhere else

#### Scenario: A declined offer resets both sides
- **WHEN** an offer is declined
- **THEN** the control that made it and the control that could have accepted it both return to their resting state

#### Scenario: Nothing is left behind for offers to live in
- **WHEN** the page is inspected while no offer is outstanding
- **THEN** there is no element, and no layout area, reserved for holding an offer

### Requirement: A draw offer is a state of the draw control

A draw offer SHALL be presented as a state of the draw control itself, distinguished from its resting
state by appearance alone. Its size, position and symbol SHALL be unchanged between states, so that
it reads as one control that has changed rather than as a different control appearing. The draw
control is sized deliberately for a target reached under time pressure, and no state may alter that.

The control SHALL have exactly three states: at rest, waiting, and answerable. There SHALL be no
separate control for declining.

**The state SHALL follow the viewer's TEAM, not the sender.** Both members of the team that offered
show the waiting state; both members of the team that may answer show the answerable one.

Accepting SHALL take one press and SHALL NOT ask for confirmation. Offering SHALL likewise take one
press and SHALL NOT ask for confirmation, since an offer proposes rather than decides. Neither SHALL
reuse the path of the other, so that neither ever asks the wrong question.

**Because appearance alone distinguishes accepting a draw from offering one, and accepting ends the
game irreversibly, the answerable state SHALL be unmistakable** — distinct from the resting state,
from the waiting state, and from any other emphasis already used on the page's controls.

#### Scenario: The control turns, rather than being replaced
- **WHEN** a draw is offered to a player
- **THEN** their draw control is drawn in the answerable state at the same size, position and symbol as at rest

#### Scenario: One press accepts
- **WHEN** a player presses the draw control in the answerable state
- **THEN** the draw is accepted immediately, with no confirmation step

#### Scenario: One press offers
- **WHEN** a player presses the draw control at rest
- **THEN** the offer is sent immediately, with no confirmation step

#### Scenario: The state follows the team
- **WHEN** a draw is offered
- **THEN** both offering players show the waiting state and both opposing players show the answerable one

#### Scenario: There is no decline control
- **WHEN** a player is looking at a draw offered to them
- **THEN** the only control presented is the one that accepts it

### Requirement: Playing on declines a draw offer

Making a move SHALL decline any draw offer outstanding against the player who moves. It SHALL inform
the offering player that the offer was declined, and SHALL return the controls on both sides to their
resting state.

This SHALL be the means by which a declined draw is reported, since no control declines one. Playing
on is what a player does instead of answering, so it SHALL carry the answer.

Making a move when no offer is outstanding SHALL do nothing of the kind.

#### Scenario: A move declines the offer
- **WHEN** a player who has been offered a draw makes a move
- **THEN** the offer is declined, the offering player is informed, and both controls return to rest

#### Scenario: A move with no offer outstanding is unaffected
- **WHEN** a player makes a move and no draw offer is outstanding against them
- **THEN** nothing about draw offers occurs

### Requirement: The resign control carries the state of a pending resignation

The resign control SHALL have three states: at rest, waiting, and confirmable. As with the draw
control, they SHALL differ in appearance only — size, position and symbol SHALL be identical — so
that it reads as one control that has changed.

The player who asked SHALL see the waiting state. Their partner SHALL see the confirmable state, and
pressing it SHALL end the game. Opposing players SHALL see the resting state throughout.

**Colour SHALL NOT be the only thing distinguishing the confirmable resign state from the resting
one.** The same control, with the same glyph in the same place, asks a partner in one state and ends
the game in the other, so a player who cannot perceive the difference resigns when they meant to ask.
The confirmable state SHALL therefore carry a signal that does not depend on colour perception.

This is about telling LIT from AT REST, not about telling the resign control from the draw control —
those already differ by glyph.

#### Scenario: The asking player's control waits
- **WHEN** a player has pressed resign and their partner has not answered
- **THEN** their resign control shows the waiting state and cannot be pressed again to resign

#### Scenario: The partner's control confirms
- **WHEN** a resignation is pending
- **THEN** the partner's resign control is drawn in the confirmable state, at the same size, position and symbol as at rest

#### Scenario: Lit is told from at rest without colour
- **WHEN** the resign control is compared in its confirmable and resting states with colour disregarded
- **THEN** the two remain distinguishable, so that pressing it can never mean the wrong thing

### Requirement: The rematch control offers, withdraws, and accepts

The rematch control SHALL be a single button with three states: at rest it offers, while this
player's own offer stands it WITHDRAWS that offer, and while another player's offer stands it
accepts. Its place among the end-of-game controls SHALL NOT change between them, so the controls
beside it never move.

There SHALL be no separate control for declining a rematch. Declining is not pressing accept, and a
control whose only effect is to do nothing has to be explained. What SHALL exist instead is the
withdrawal: a player who has offered SHALL be able to take that offer back, and doing so SHALL stop
it counting towards the agreement that starts a rematch.

Because this control is wide enough for text, its LABEL SHALL say which of the three states it is
in. Colour may reinforce that but SHALL NOT be what carries it — unlike the icon controls, where
there is no room for a word.

#### Scenario: The offerer can take it back
- **WHEN** a player has offered a rematch and presses the same control again
- **THEN** the offer is withdrawn, every player is told, and the control returns to offering

#### Scenario: A withdrawn offer no longer counts
- **WHEN** an offer is withdrawn and the remaining players all accept
- **THEN** no rematch begins, because the withdrawn offer is not counted towards agreement

#### Scenario: One control, and its label says which
- **WHEN** the rematch control is inspected in each of its three states
- **THEN** it is the same single button in the same place, and its label distinguishes offering from withdrawing from accepting

### Requirement: The result is announced where the players are looking

When a game ends, a line stating how it ended and which team won SHALL appear in the round chat,
ahead of any notice about who may now read which messages.

The movelist states the same thing, but only to a player who has the moves in front of them; the
tab shown by default is the chat. A player SHOULD NOT have to change tabs to learn whether they won.

The wording SHALL be the one the movelist already uses, so the two can never describe the same
result differently, and SHALL be emitted once however many times the end of the game is reported.

#### Scenario: The chat says how it ended and who won
- **WHEN** a game ends by resignation, checkmate, timeout or agreement
- **THEN** a line naming that reason, and the winning team where there is one, appears in the chat

#### Scenario: Said once
- **WHEN** the end of a game is reported more than once
- **THEN** the result line appears a single time

### Requirement: A username and its rating are one sized unit

A seat's username and its rating SHALL be sized by a single rule applied to the element containing
both, so that a rating follows its username without a second rule being kept in step with the first.

#### Scenario: The rating follows the name
- **WHEN** a seat displays a rating beside its username
- **THEN** the rating's size follows from the same rule that sizes the username

### Requirement: The clock sits against the board and the name on the outside

A seat strip SHALL be laid out according to which side of its board it is on. The clock SHALL be
placed against the board and the username on the far side of the strip, so that a strip above its
board mirrors one below it:

| strip | inside the strip, top to bottom | popped out |
|---|---|---|
| above the board | username, then clock filling the height down to the board | above the strip |
| below the board | clock filling the height from the board, then username | below the strip |

Which strip is which SHALL be read from `.seat-strip0` and `.seat-strip1`, which already carry that
fact: the grid areas `clock-top`, `clock-bot`, `clockB-top` and `clockB-bot` are assigned from those
classes, so a strip's class is what puts it on its side of the board. **No further marker SHALL be
introduced**, since a second statement of the same fact would have to be kept in step with the flip
and switch logic by hand.

This holds through the DOM moves those operations make: a flip swaps the blocks inside the strips
and a switch exchanges top strips with top strips, so a strip never changes the side it is on.

#### Scenario: A strip above its board is the mirror of one below
- **WHEN** the strips above and below a board are compared
- **THEN** the one above has its username at the top and its clock beneath, and the one below has its clock on top and its username beneath

#### Scenario: A popped-out name leaves on the outward side
- **WHEN** a username is given a row of its own
- **THEN** it appears above the strip if the strip is above its board, and below the strip if the strip is below it

#### Scenario: The side survives a flip and a switch
- **WHEN** the boards are flipped, or the two boards are switched between columns
- **THEN** each strip is still laid out for the side it is on, with no class maintained by that logic

## Deferred — revisit when next working on desktop mode

Not requirements. Carried over from `2026-08-15-desktop-round-layout-fixes`, which
was archived at 22/36 tasks because nothing here blocks the shipped desktop layout.
Read this section before opening the next change against the `min-height: 600px`
landscape mode; each item is a measurement already taken, not a hunch.

**The seam is no longer tight, but the gutter is still a free length.** The 1.5px of
clearance this used to record is gone: `adequate-coordinate-gutters` anchored the rank
labels to their own board's edge and cut their footprint from 15px to 7px, so the seam
now measures 21.8px at 2560x1440 and 5.04px at the mode's 602px height floor — where
the old 15px footprint against a 12.04px gutter OVERLAPPED the neighbouring board by
2.96px. The same holds at the board-to-tools seam, which had the same defect and was
not recorded here.

What is NOT settled is the gutter itself. `column-gap` is still `2vmin` in both places,
a length with no relation to what sits in it, and it shrinks as the window shrinks — so
the tightest seam is on the smallest window, which is backwards. Whether 5px is adequate
separation between two boards, and whether the board-to-tools seam wants the same answer
as the board-to-board one, is the open question. A floor under the separation is the
obvious shape. Measured on a live round page at 2560x1440, 1063x742 and 1063x602.

**A board once measured 526px against a 425px column, and it has not been explained.**
Immediately after a browser zoom change, two consecutive fresh loads had
`--cg-width-a: 526.222px` while the column was 425.33px; `cg-board` overflowed its
wrap by ~101px, spilled left and overlapped board B. A `resize` dispatch did not
correct it within 600ms, and it had healed by the next sample. It has not reproduced.
This is the landscape instance of the same shape as the portrait defect: the grid
depends on `--board-scaleA`, the board depends on the grid, and any paint before the
JS resolves that variable leaves chessgroundx measuring a container that is about to
change, with nothing arranged to re-measure it. The requirement "No grid track is
sized from its own occupant" now forbids the portrait form; whether this mode's
`--board-scaleA` dependency is the same violation is the open question.

**Never verified, and cheap to verify.** A populated `aside.sidebar-first` — the
`side` row is now content-sized and was only ever seen empty. The controls bar
wrapping in a narrow column; only the wide case, where the tablist and the two
control buttons share one 383px row, was confirmed. Mobile's tablist returning to
full column width at ~24.8px per label. Phone landscape at 697x382 and iPhone SE at
667x375. A full before/after comparison of the analysis page, of which only
`#main-wrap`'s row structure was checked.

**Two decisions nobody has had to make.** Whether the tools column should go back to
a pocket-derived width now that it holds a tab panel rather than raw chat — it is
currently a flat 20vw that deliberately ignores zoom. And whether
`aside.sidebar-first` should be rendered at all on this page, now that an empty one
costs nothing either way.

**Its "capture the before state" tasks were never obtainable** — verification began
after the code was written, so there was no before to capture. The next desktop
change should take those measurements first, as `portrait-phone-round-layout` does.
