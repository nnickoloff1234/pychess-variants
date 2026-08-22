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

A row SHALL spread to the width it is given rather than sitting centred in it, so that a stacked
set spans its column and a paired row of ten spans the space under the board. Spreading SHALL move
the spare width between the buttons and SHALL NOT resize them.

#### Scenario: Beside the board the sets stack
- **WHEN** a preset part is in the strip beside the partner board
- **THEN** its two sets are on separate rows, five buttons each, as the presets have always been drawn

#### Scenario: A part that has left shows ten buttons on one row
- **WHEN** a preset part has flowed into the wider space below the board
- **THEN** its two sets share one row of ten buttons and the part is half the height it was beside the board

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
