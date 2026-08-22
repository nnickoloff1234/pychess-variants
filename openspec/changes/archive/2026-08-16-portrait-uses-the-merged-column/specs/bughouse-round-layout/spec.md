## ADDED Requirements

### Requirement: Every mode uses the same merged column

The partner board's stack and the tools parts SHALL share one container in **every** layout mode,
and the rules that govern that container SHALL be stated once rather than repeated per mode.

A mode SHALL differ only in what it cannot share: the widths of the two columns inside the
container, and the gap between them. The container being a grid, its rows, its areas, the stack
taking its content height and the parts being placed individually SHALL be common.

Portrait SHALL keep the player's own board full width at the bottom of the page, with the merged
column occupying the region above it. That is the only structural difference portrait retains.

#### Scenario: Portrait places parts under the partner board
- **WHEN** the round page is displayed in portrait and the partner board leaves room beneath it
- **THEN** parts occupy that space, in the same order and by the same rule as in the landscape modes

#### Scenario: The own board stays at the bottom
- **WHEN** the round page is displayed in portrait
- **THEN** the player's own board is full width at the bottom of the page, below everything else

#### Scenario: No space is left unreachable
- **WHEN** the round page is displayed in portrait
- **THEN** there is no region of the area above the own board that no part can occupy

#### Scenario: The modes agree
- **WHEN** the merged column's structure is compared across the three modes
- **THEN** they differ only in the two column widths and the gap between them
