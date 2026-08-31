## ADDED Requirements

### Requirement: The preset block SHALL read as one panel in every orientation

The containers holding the chat preset buttons — the preset panels and the group that holds
them — SHALL carry the panel surface colour, so that the ground between the buttons belongs to
the panel rather than to the page. This SHALL hold in portrait as it does in the landscape
modes, so the same controls do not read as two different objects depending on how the device
is held.

#### Scenario: Portrait draws the preset block as one panel

- **WHEN** the round page is shown in portrait with a game in progress
- **THEN** the element containing the preset buttons has the same background colour as the
  buttons themselves
- **AND** no page background is visible between the buttons of one preset part

#### Scenario: The landscape appearance is unchanged

- **WHEN** the round page is shown in either landscape mode
- **THEN** the preset block appears exactly as it did before this change

### Requirement: Portrait SHALL offer the preset parts a zone to flow into

When the boards are scaled down far enough to leave room, portrait SHALL place at least one
preset part in a zone outside the strip it normally occupies, in the same way the landscape
modes place parts in zone A and zone B. A part SHALL only be placed there when the space it
would take has been charged against the boards and they still fit.

#### Scenario: Room is available

- **WHEN** the boards in portrait are scaled down so that the region below them can hold a
  preset part without the boards overflowing
- **THEN** that part is placed in the zone rather than in the strip

#### Scenario: Room is not available

- **WHEN** the boards in portrait are at a size that leaves no such room
- **THEN** every preset part stays where it is today and the arrangement is unchanged

#### Scenario: The choice is stable

- **WHEN** the boards are resized across the point at which a part becomes placeable
- **THEN** the arrangement settles on one answer and does not alternate between the two
