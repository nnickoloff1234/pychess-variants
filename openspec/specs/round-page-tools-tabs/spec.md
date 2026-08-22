# round-page-tools-tabs

## Purpose

What the bughouse round page's tools column contains: the three panels it presents through the shared two-board tab widget (Chat, Moves, Info), which is default, and how the widget behaves as its container's width and height shrink toward zero. Established by the `round-page-tabbed-tools` change (2026-08-09), which moved the chat, movelist and game-info into tabs so that content below the boards — unreachable in the short-landscape mode, which cannot scroll — is available from the one grid area that is always on screen.
## Requirements
### Requirement: The round page's tools area is a tabbed panel
The bughouse round page SHALL render the element occupying the `tools` grid area — the area that today holds only the chat — and SHALL mount the shared two-board tab widget's two parts, its panel area and its tablist, inside that element. The element is the page's own markup; the widget contributes no container of its own.

The widget SHALL present exactly three panels, in this order: **Chat**, **Moves**, **Info**. Chat SHALL be the panel shown when the page loads.

#### Scenario: The tools area holds both parts of the widget
- **WHEN** the round page is rendered
- **THEN** the element occupying the `tools` grid area is markup the page rendered, carrying the tools area's existing grid placement and layout rules, and it contains the widget's panel area and its tablist

#### Scenario: Three panels in a fixed order
- **WHEN** the tablist is rendered
- **THEN** it offers exactly three tabs labelled Chat, Moves and Info, in that order

#### Scenario: Chat is open on load
- **WHEN** the round page finishes rendering
- **THEN** the Chat panel is the visible one and its tab is the selected one, without any interaction

### Requirement: Each panel receives one existing element, unchanged

Each panel SHALL contain exactly one element, and that element SHALL be the one the page already defines for that content, embedded as it is defined today:

- Chat SHALL contribute **two** panels: one containing the chat container element, and one containing the presets. They are two parts of the same tab, shown and hidden together, and each holds a single element.
- Moves SHALL contain the movelist block — the movelist placeholder together with the move-controls element it already sits beside.
- Info SHALL contain the game-info placeholder that is currently embedded in the page's first sidebar.

This requirement SHALL NOT alter the content of any of them, nor how any of them is rendered, patched or updated. Each is relocated, not rebuilt. The presets are moved out of the chat view's subtree and become a part of their own, but what they render is unchanged.

#### Scenario: Content is moved, not rewritten
- **WHEN** the markup of a panel is inspected
- **THEN** its single child is the same element, with the same id or class, that the page defined for that content before this change

#### Scenario: Owners keep updating their content
- **WHEN** the movelist grows, the game info is rendered, or a chat message arrives
- **THEN** each updates inside its panel exactly as it did when it was placed elsewhere, with no additional wiring

#### Scenario: Panel layout cannot disturb the content
- **WHEN** a panel is shown
- **THEN** it has a single child, so whatever display mode the widget applies to the panel cannot change how that child arranges its own contents

#### Scenario: The two chat parts show and hide together
- **WHEN** the Chat tab is selected, and when another tab is selected
- **THEN** the chat container and the presets appear together and disappear together, wherever each of them is mounted

#### Scenario: Chat still holds one element per panel
- **WHEN** either of the Chat tab's panels is inspected
- **THEN** it has a single child — the chat container in one, the presets in the other — so neither panel's display mode can disturb what is inside it

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

