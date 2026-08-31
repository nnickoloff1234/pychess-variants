## ADDED Requirements

### Requirement: The landscape modes SHALL arrange the two-board page by flow

In the landscape modes, both two-board pages SHALL place the boards and the tools by flow in a
single container, rather than by track lists declared per mode. The two board stacks SHALL be
adjacent; every element after them SHALL fall into the space that remains and stack there.

No track SHALL be declared for the tools. The space they occupy is what the boards leave.

#### Scenario: Both boards fit side by side

- **WHEN** the viewport is wide enough for both board stacks
- **THEN** the two stacks SHALL be adjacent
- **AND** the tab panel and tab list SHALL occupy the space beside them, stacked

#### Scenario: The arrangement is not declared per mode

- **WHEN** the page is rendered in short landscape and in desktop landscape
- **THEN** both SHALL use the same arrangement rule
- **AND** they SHALL differ only in the square unit each mode already chooses

#### Scenario: Nothing overflows the viewport

- **WHEN** the page has settled in either landscape mode
- **THEN** `document.documentElement.scrollWidth` SHALL equal `window.innerWidth`
- **AND** the app's bottom edge SHALL be at or above the viewport's bottom edge

### Requirement: Portrait SHALL be unchanged by this work

Portrait on both pages SHALL keep the arrangement it has. This change applies to the landscape
modes only, and portrait is the mode most tightly pinned to the viewport.

#### Scenario: Portrait after the landscape conversion

- **WHEN** either page is rendered in portrait, before and after the landscape modes are converted
- **THEN** the geometry of the boards, the tools and the tab list SHALL be identical
