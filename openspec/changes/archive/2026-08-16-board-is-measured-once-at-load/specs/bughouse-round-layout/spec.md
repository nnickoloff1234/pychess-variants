## ADDED Requirements

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

The container a board is measured against SHALL be a width the board can draw exactly — the width
quantised to whole device pixels across the board's files, the rule `squareUnit.ts` publishes.

A container sized this way is indifferent to what moves around it while the page settles, which is
what makes measuring once sufficient. A container sized from the settling layout is not, whatever
observes it.

Where a remainder is unavoidable, a board given the full width of the page SHALL be centred on it.
Preset rows SHALL keep their remainder on the left, packing the buttons against the right edge.

#### Scenario: The container matches the board
- **WHEN** a board has been drawn
- **THEN** its container's width equals the board's width, so there is no slack inside the wrap for chessgroundx to pin to one edge

#### Scenario: Portrait's board is centred on what is left over
- **WHEN** the round page is displayed in portrait
- **THEN** the bottom board spans the page and any leftover pixels are equal on its left and right

#### Scenario: Preset rows pack to the right
- **WHEN** a preset row is narrower than the space it is given
- **THEN** the buttons sit against the right edge and the spare width is on the left
