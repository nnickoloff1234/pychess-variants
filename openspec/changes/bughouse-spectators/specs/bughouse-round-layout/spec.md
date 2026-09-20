## ADDED Requirements

### Requirement: A layout SHALL NOT reserve a named area for an element it cannot fill

A two-board layout SHALL NOT carry a named grid area for an element that no code path can populate.
The element itself MAY remain, provided a container lays it out without any template naming it — a
tab panel's child costs no template a row and cannot be auto-placed into an implicit track.

#### Scenario: An element with no data source

- **WHEN** a page renders an element whose only writer is a message that page never receives
- **THEN** no template of that page SHALL name a grid area for it

#### Scenario: An element kept for parity

- **WHEN** such an element is kept so that both pages agree on where the feature will appear
- **THEN** it SHALL be placed inside a container that lays out its own children, and no template
  SHALL name it

#### Scenario: Spectators on a page with a socket

- **WHEN** a two-board page receives a `spectators` message
- **THEN** it SHALL render the spectator list into `#spectators` as the single-board pages do
