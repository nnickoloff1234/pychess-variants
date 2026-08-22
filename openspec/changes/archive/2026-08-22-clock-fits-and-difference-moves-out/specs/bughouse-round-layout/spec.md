## MODIFIED Requirements

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

The clock SHALL be sized so that the widest form fits at all times, including while a narrower form
is displayed, so that a clock crossing into tenths does not change size. Sizing for that form is
distinct from reserving width for it: the box keeps its natural width and only the font is bounded.

**Fitting SHALL hold for every value the clock can display, not only for the value it was measured
at.** A clock whose text is wider than the box it is drawn in has failed this requirement however
correct the arithmetic that produced it, and the failure appears in the last ten seconds of a game,
when the clock is what is being read.

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

#### Scenario: A clock does not change size when it enters tenths
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its font size is unchanged, because it was already sized so that form fits

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
