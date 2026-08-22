## MODIFIED Requirements

### Requirement: The clock is anchored and sized to the strip

The clock SHALL be aligned to the trailing edge of its strip and to the edge nearest its board, and
SHALL be sized as large as the space left to it allows rather than at a fixed point size or at a
fixed fraction of the board's square.

The space left to it is what the pocket and the username have not taken, by the priority above. It
SHALL grow into that space: a clock sized from the board's square is blind to its room, measured at
65.1 x 19.2 in a space 194 x 49 once the username had left the strip entirely, and 105 wide in a
218.7px slot with the username on a line below it.

**Where the strip has height to give, the height SHALL be what limits the clock.** A clock stopped
short by its width bound while height sits unused is not "as large as the space allows": measured on
the desktop, a clock drawn 128.8 x 41 in a box of 186.4 x 61, leaving 57.6px of width and 20px of
height unused on all four seats.

**Any width bound SHALL be derived from the measured width of the widest form the clock can
display, and the measurement SHALL be recorded with it.** A bound estimated from a digit count is
not a bound: the estimate in use assumed a form 4.4 times the font size, where the widest form a
clock can actually display — `0:09.9`, since tenths appear only under ten seconds — measures 2.82
times it, which is what stopped the clock short.

The clock SHALL be sized so that the widest form fits at all times, including while a narrower form
is displayed, so that a clock crossing into tenths does not change size. Sizing for that form is
distinct from reserving width for it: the box keeps its natural width and only the font is bounded.

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

#### Scenario: The clock fills the height the name vacated
- **WHEN** a username is drawn on a row of its own, leaving the clock the height of its line
- **THEN** the clock is drawn at the largest size that line's height allows, with no unused height above or below it

#### Scenario: The clock grows into a strip the name has left
- **WHEN** a username is drawn on a row of its own rather than inside the strip
- **THEN** the clock takes the width and height the pocket leaves, and its digits are drawn larger than they would be sharing the strip with the name

#### Scenario: A clock does not change size when it enters tenths
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its font size is unchanged, because it was already sized so that form fits

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
