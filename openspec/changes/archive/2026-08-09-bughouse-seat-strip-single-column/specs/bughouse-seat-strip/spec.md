## ADDED Requirements

### Requirement: A seat's furniture is one element
Everything the page renders for one seat — its pocket, its clock, its player name with the presence indicator, and the inert slots around them — SHALL be contained in a single **seat strip** element, one per seat, four in total.

The strip SHALL be the element that layouts place. No layout mode may position a seat's pocket and its clock independently of each other.

#### Scenario: Every mode places strips
- **WHEN** any of the layout modes is active
- **THEN** each seat's pocket and clock block occupy positions derived from that seat's strip, and neither is given a grid area of its own

### Requirement: Flip moves seats, not pockets
Flipping the boards SHALL exchange the two seat blocks of each board between that board's strips, and SHALL NOT move either board's pockets.

Pockets must stay because the board library re-renders a pocket's contents for the new orientation in place: the top pocket element always holds the top player's pocket. Moving the elements as well would apply the exchange twice and leave each pocket showing the wrong colour.

#### Scenario: Seats exchange ends
- **WHEN** the player flips the boards
- **THEN** the seat that was displayed at the top of a board is displayed at its bottom, and vice versa, on both boards

#### Scenario: Pockets stay with their end of the board
- **WHEN** the player flips the boards
- **THEN** each pocket element remains in its strip, and the pocket rendered at the top of a board is the pocket of the player now shown at the top

### Requirement: Switch moves whole strips
Switching the boards SHALL exchange board A's strips with board B's, carrying each strip's pocket and seat block together.

#### Scenario: A seat's furniture stays together
- **WHEN** the player switches the boards
- **THEN** each seat's pocket, clock and name appear together beside the board that seat is playing on, in the column that board now occupies

#### Scenario: Flip and switch compose
- **WHEN** the player applies any sequence of flips and switches
- **THEN** the resulting arrangement is the same as the arrangement the page produced for that sequence before strips were introduced

### Requirement: Seat rearrangement does not constrain rendering
Rearranging seats SHALL NOT depend on state written onto a seat block's inline style, so that a seat block may be re-rendered at any time without losing its position.

#### Scenario: A re-rendered seat keeps its place
- **WHEN** a seat block is re-rendered after the boards have been flipped or switched
- **THEN** it remains in the strip it was moved to
