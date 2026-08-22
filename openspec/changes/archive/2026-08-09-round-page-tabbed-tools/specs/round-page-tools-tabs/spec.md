## ADDED Requirements

### Requirement: The round page's tools area is a tabbed panel
The bughouse round page SHALL render the shared two-board tab widget as the grid item occupying the `tools` area — the area that today holds only the chat — rather than placing the widget inside that area as a nested element.

The widget SHALL present exactly three panels, in this order: **Chat**, **Moves**, **Info**. Chat SHALL be the panel shown when the page loads.

#### Scenario: The tools area is the widget
- **WHEN** the round page is rendered
- **THEN** the element occupying the `tools` grid area is the tab widget's own container, carrying the tools area's existing grid placement and layout rules rather than wrapping a second element that carries them

#### Scenario: Three panels in a fixed order
- **WHEN** the tablist is rendered
- **THEN** it offers exactly three tabs labelled Chat, Moves and Info, in that order

#### Scenario: Chat is open on load
- **WHEN** the round page finishes rendering
- **THEN** the Chat panel is the visible one and its tab is the selected one, without any interaction

### Requirement: Each panel receives one existing element, unchanged
Each panel SHALL contain exactly one element, and that element SHALL be the one the page already defines for that content, embedded as it is defined today:

- Chat SHALL contain the chat container element.
- Moves SHALL contain the movelist block — the movelist placeholder together with the move-controls element it already sits beside.
- Info SHALL contain the game-info placeholder that is currently embedded in the page's first sidebar.

This change SHALL NOT alter the content of any of the three, nor how any of them is rendered, patched or updated. Each is relocated, not rebuilt.

#### Scenario: Content is moved, not rewritten
- **WHEN** the markup of a panel is inspected
- **THEN** its single child is the same element, with the same id or class, that the page defined for that content before this change

#### Scenario: Owners keep updating their content
- **WHEN** the movelist grows, the game info is rendered, or a chat message arrives
- **THEN** each updates inside its panel exactly as it did when it was placed elsewhere, with no additional wiring

#### Scenario: Panel layout cannot disturb the content
- **WHEN** a panel is shown
- **THEN** it has a single child, so whatever display mode the widget applies to the panel cannot change how that child arranges its own contents

### Requirement: The widget yields its width before the boards do
The widget SHALL impose no minimum width on the grid. Its own minimum width, and that of its panels and its tab labels, SHALL be zero, so that a viewport too narrow for everything reduces the tools column rather than pushing a board off screen.

Tab labels SHALL be clipped by the space available rather than widening the tablist, and SHALL NOT be given an ellipsis or any other minimum-width guarantee.

#### Scenario: A narrow viewport reduces the widget
- **WHEN** the viewport is too narrow to fit both boards and the widget's natural width
- **THEN** the widget's column absorbs the entire shortfall, both boards remain fully on screen, and the page does not overflow horizontally

#### Scenario: Labels clip rather than push
- **WHEN** the tablist is narrower than the three labels need
- **THEN** the label text is clipped to the space available and the tablist stays within its column

#### Scenario: The widget can be driven to nothing
- **WHEN** the space available to the tools column reaches zero
- **THEN** the widget collapses to zero width without forcing the grid wider

### Requirement: The widget takes its size from its container
The widget's height and the height of its panels SHALL be derived from the container the widget is placed in. This change SHALL NOT introduce a fixed pixel height for the widget or for any of its panels.

Within the widget, the tablist SHALL take its natural height and the panel area SHALL take the remainder, scrolling internally when its content is taller than the space available, so that a growing movelist cannot push the tablist out of view.

#### Scenario: Height follows the column
- **WHEN** the height available to the tools column changes
- **THEN** the widget's height changes with it, and the panel area absorbs the difference

#### Scenario: Long content scrolls rather than overflowing
- **WHEN** a panel's content is taller than the panel
- **THEN** the panel scrolls internally, the tablist remains visible, and the grid row is not made taller

#### Scenario: No fixed height is introduced
- **WHEN** the widget's computed height and its panels' computed heights are inspected on the round page
- **THEN** neither comes from a fixed pixel value introduced by this change

### Requirement: The open tab survives content updates
The panel a player has selected SHALL remain selected while the page is in use. Content owners updating what is inside a panel SHALL NOT cause the widget to return to its default panel.

#### Scenario: A move does not close the player's tab
- **WHEN** the player has the Moves or Info panel open and a move is played, the clocks tick, or a chat message arrives
- **THEN** the panel the player selected is still the visible one
