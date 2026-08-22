## MODIFIED Requirements

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
