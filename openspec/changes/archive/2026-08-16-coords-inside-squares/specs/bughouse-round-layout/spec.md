## ADDED Requirements

### Requirement: Coordinates may be drawn inside the squares

Where the layout is short of width, board coordinates SHALL be drawn inside the squares rather than
overhanging the board's edges.

A label drawn inside a square SHALL remain legible against that square: it SHALL contrast with the
square it sits on, whichever colour that is, and SHALL be placed so that it does not compete with a
piece standing on the same square.

Internal coordinates are a way of buying room on a small screen, not a change of house style. They
SHALL apply to the portrait and short landscape modes; the desktop mode SHALL keep its labels
outside the board, where it has the width for them.

The gutters between the boards SHALL be kept whether or not the labels still need them. They
separate the boards for their own sake, and the room they happened to give the labels was
incidental to that.

Coordinates SHALL be available on a phone. They are hidden there today because the layout has
nowhere to put them, which internal placement removes as a reason.

#### Scenario: Labels sit on their squares
- **WHEN** the round page is displayed in a mode with internal coordinates
- **THEN** every rank and file label is drawn within the board's own area, and none overhangs its edge

#### Scenario: The gutters stay
- **WHEN** a mode draws its coordinates internally
- **THEN** the gutter separating the boards is unchanged

#### Scenario: The desktop keeps its labels outside
- **WHEN** the round page is displayed in the tall landscape mode
- **THEN** the labels overhang the board's edges exactly as they did before

#### Scenario: A label is readable on either square colour
- **WHEN** a coordinate label falls on a light square and when it falls on a dark one
- **THEN** it is legible in both cases

#### Scenario: A phone shows coordinates
- **WHEN** the round page is displayed on a phone in portrait
- **THEN** coordinates are shown
