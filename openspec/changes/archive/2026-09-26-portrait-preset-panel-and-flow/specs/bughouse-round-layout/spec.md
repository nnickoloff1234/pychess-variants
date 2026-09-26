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

### Requirement: Portrait SHALL offer the preset parts somewhere to flow to

When there is room, portrait SHALL place at least one preset part outside the strip it normally
occupies. A part SHALL only be placed there when the space it would take has been charged against
the boards and they still fit, using the same rule the landscape modes use rather than one derived
again for this orientation.

**PORTRAIT DOES THIS BY WIDENING THE SLOT, NOT BY ADDING A ZONE**, and the distinction is
normative: portrait has one column, so a part that leaves the strip takes the full width of the
slot it already occupies rather than moving into a separately named region. There SHALL be no
`zoneA` or `zoneB` in portrait, and anything reasoning about portrait's arrangement SHALL NOT
assume a dropped part has landed in one.

#### Scenario: Room is available

- **WHEN** the tools' own region in portrait has height the partner stack does not need, enough to
  hold a preset part
- **THEN** that part's slot spans the full width and the part is drawn there rather than in the
  strip

#### Scenario: Room is not available

- **WHEN** the tools' region has no such spare height
- **THEN** every preset part stays in the strip and the arrangement is unchanged

#### Scenario: The fill order is the same as landscape's

- **WHEN** more than one part can leave the strip
- **THEN** the bar holding the tab list goes first and the preset parts follow in their queue
  order, so the two never swap places

#### Scenario: The choice is stable

- **WHEN** the arrangement is sampled repeatedly at one viewport
- **THEN** it settles on one answer and does not alternate between two self-consistent states

### Requirement: Portrait SHALL NOT scale its boards to a reader's zoom

Portrait, like short landscape, SHALL draw every board at its allowance, sized from the viewport
rather than from the stored zoom preference. A zoom control SHALL NOT be offered in those modes,
and a preference set in a mode that does zoom SHALL NOT reach them.

This is stated because it is load-bearing for every other question about portrait: a board there
has zero spare room by construction, which is what keeps its coordinates inside its squares and its
username inside its strip, and it means portrait's arrangement cannot be changed by zooming.

#### Scenario: The zoom preference is changed

- **WHEN** the stored zoom is altered while the page is in portrait
- **THEN** no board changes size and the arrangement is unchanged

#### Scenario: A preference carried from another device

- **WHEN** a reader who has zoomed on a desktop opens the page on a phone in portrait
- **THEN** the boards are drawn at their allowance, not at the stored zoom
