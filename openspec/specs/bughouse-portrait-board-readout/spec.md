# bughouse-portrait-board-readout Specification

## Purpose
TBD - created by archiving change portrait-gauges-and-board-letters. Update Purpose after archive.
## Requirements
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

### Requirement: A stack looks the same in every mode

A stack is its board, its strips, its gauge and its board letter, in that arrangement, wherever it
is drawn. What changes between modes is the SIZE of those parts, **not which of them exist.** A mode
SHALL NOT drop a part from a stack because the stack is small there.

This is the rule that decides the questions this capability was opened for, and it decides them
against the alternative that was in place: portrait had suppressed the gauge and the board letter
because the arithmetic that sized its square did not account for them, and a page-specific answer to
"which board is this" had been left as an open question. There is no such question — portrait has
the landscape answer, because a stack is the same object in both.

**A CONSEQUENCE ACCEPTED WITH IT:** on the smallest portrait viewports the partner board's gauge is
about 6px wide, which is not readable as a bar. That is the price of the rule and is accepted as
such — a stack shaped differently on a phone is the worse outcome — rather than defended as a
useful instrument at that size.

#### Scenario: A stack is drawn in a mode with little room

- **WHEN** a stack is drawn in the mode with the least space available
- **THEN** it has the same parts as in every other mode, each sized for the room there is

#### Scenario: A part would not be useful at the size it would get

- **WHEN** a part of a stack would be drawn too small to serve its purpose
- **THEN** it is still drawn, and the shortfall is recorded rather than the part being dropped

#### Scenario: A stack's width is asked for

- **WHEN** any code or stylesheet needs a stack's width
- **THEN** it reads the one declared number of squares a stack occupies — the board's files plus
  the gauge where the page draws one — and does not restate it

