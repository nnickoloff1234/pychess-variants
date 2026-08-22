## MODIFIED Requirements

### Requirement: Switch moves whole strips
Switching the boards SHALL exchange board A's strips with board B's, carrying each strip's pocket and seat block together.

Switching SHALL be expressed as moving elements between the places the layout defines, not as rewriting the grid area they name. Once the right board and the tools share a container occupying the second column, the two boards are no longer siblings in one grid, so a grid-area swap can no longer express the exchange: what changes is which container an element is in.

The mechanism SHALL remain the single source of truth for which board is where. Nothing SHALL infer a board's side from a stale inline style left behind by the previous arrangement.

#### Scenario: A seat's furniture stays together
- **WHEN** the player switches the boards
- **THEN** each seat's pocket, clock and name appear together beside the board that seat is playing on, in the column that board now occupies

#### Scenario: Flip and switch compose
- **WHEN** the player applies any sequence of flips and switches
- **THEN** the resulting arrangement is the same as the arrangement the page produced for that sequence before strips were introduced

#### Scenario: The tools stay on the right
- **WHEN** the player switches the boards
- **THEN** the tools panel stays with the second column and does not travel with the board that left it

#### Scenario: A switched board is still clickable
- **WHEN** the player switches the boards and then clicks a square on either board
- **THEN** the click resolves to the square under the pointer, the board having been re-measured after it moved
