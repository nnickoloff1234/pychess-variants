## MODIFIED Requirements

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
