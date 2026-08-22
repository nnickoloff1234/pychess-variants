## ADDED Requirements

### Requirement: The game controls sit beside the tablist
The bughouse round page SHALL place the game controls — the draw and resign buttons — in the tools column, on the same row as the tablist and following it. The element holding the two SHALL be the page's own markup, since the tab widget contributes only its tablist and its panel area.

The controls SHALL be reachable in every layout mode. They SHALL NOT be placed anywhere the mode cannot scroll to.

This SHALL relocate the existing placeholder only. How the buttons are built, labelled and wired SHALL be unchanged: the round page supplies the element, and its owner continues to find it and render into it exactly as before.

#### Scenario: Reachable in the short layout
- **WHEN** the round page is displayed in the short-landscape mode, where the page cannot scroll
- **THEN** the draw and resign buttons are within the viewport

#### Scenario: On the tablist's row, after it
- **WHEN** the tools column is inspected
- **THEN** the tablist and the game controls occupy one row, in that order, inside an element the page rendered

#### Scenario: The buttons are the same buttons
- **WHEN** the controls are rendered
- **THEN** they are produced by the same owner, with the same labels and handlers, as when they sat below the boards

### Requirement: The tablist yields before the controls
Each control button SHALL be **two thirds of a board square wide**, derived from the square unit the page already publishes, rather than sized by its glyph. The buttons are targets a player reaches for under time pressure, so their width is stated deliberately instead of falling out of whatever symbol they happen to carry.

When the tools column is too narrow for both, the tablist SHALL absorb the shortfall and the game controls SHALL NOT. The tablist SHALL shrink, its labels clipping as they already do; the controls SHALL keep that width at every column width.

Once the tablist can give up no more and the controls still do not fit, the controls SHALL be clipped by the row rather than compressed, and SHALL NOT widen the grid — the tools column yielding is what keeps both boards on screen, and nothing added to it may reverse that.

#### Scenario: Buttons are sized from the square unit
- **WHEN** a control button is measured
- **THEN** its width is two thirds of the square unit the page publishes, not the width of its glyph

#### Scenario: Narrowing takes width from the tablist first
- **WHEN** the viewport narrows and the tools column shrinks
- **THEN** the game controls keep the width they had, and the tablist is narrower by the whole difference

#### Scenario: Controls are clipped, never shrunk
- **WHEN** the column is too narrow for the controls even with the tablist fully collapsed
- **THEN** the controls are cut off at the column's edge at their natural size, rather than being scaled down

#### Scenario: The bar never pushes a board off screen
- **WHEN** the viewport is narrowed to any width
- **THEN** both boards remain fully on screen and the page does not overflow horizontally
