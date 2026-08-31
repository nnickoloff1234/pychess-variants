## ADDED Requirements

### Requirement: Portrait states each board's identity

The bughouse analysis page in portrait SHALL show, for each of the two boards, which board it is —
`A` or `B` — without the reader opening a tab, hovering, or reading the move list. Identity is the
board's own name in the game record, never its position on screen: the viewer's own board is placed
by seat, so a viewer who played on board B has board B in the bottom stack.

#### Scenario: A spectator opens a finished game in portrait

- **WHEN** the analysis page renders in `(orientation: portrait)` for a viewer who played neither board
- **THEN** the top board is marked `B` and the bottom board is marked `A`
- **AND** both marks are visible without scrolling

#### Scenario: A player of board B opens their own game in portrait

- **WHEN** the analysis page renders in portrait for the viewer seated on board B
- **THEN** the bottom board — the viewer's own — is marked `B`
- **AND** the top board is marked `A`

#### Scenario: The mark agrees with the engine panel

- **WHEN** both boards are marked and the engine's two PV columns are on screen
- **THEN** the column belonging to the bottom board is the one the bottom board's mark names
- **AND** neither reading requires the other to be interpreted

### Requirement: Portrait shows each board's evaluation

The page in portrait SHALL present the engine's evaluation of each board in a form the reader can
take in at a glance while the engine is running, in the same visual language as the landscape modes
unless the layout cannot afford it, in which case the chosen alternative SHALL be recorded with the
measurement that ruled the gauge out.

#### Scenario: The engine is running in portrait

- **WHEN** the engine switch is on and the ladder is alternating between the two boards
- **THEN** each board carries its own evaluation readout
- **AND** the readout for a board updates when that board's slice reports, and holds its last value
  while the engine is on the other board

#### Scenario: The engine is off

- **WHEN** the engine switch is off
- **THEN** each board's evaluation readout is empty or absent
- **AND** its absence does not change the size or position of either board

### Requirement: Neither addition resizes a board without a recorded trade

Adding the identity mark or the evaluation readout to portrait SHALL NOT change the size of either
board, unless the change is a deliberate decision recorded with the square unit measured before and
after, and the resulting unit is still a whole number of device pixels per square.

#### Scenario: The layout stays inside the viewport

- **WHEN** the portrait page has rendered with both additions present
- **THEN** `document.documentElement.scrollWidth` equals `window.innerWidth`
- **AND** the app's bottom edge is at or above the viewport's bottom edge

#### Scenario: The boards keep their measured squares

- **WHEN** the additions are present and no resize trade was recorded for this change
- **THEN** the own board's square and the partner board's square measure what they measured before
  the additions

#### Scenario: A resize trade was made deliberately

- **WHEN** a board's square is reduced to make room for either addition
- **THEN** the change records the square before and after and the board it was taken from
- **AND** the new square is a whole number of device pixels
