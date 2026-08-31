## ADDED Requirements

### Requirement: A layout SHALL NOT reserve space for an element it cannot fill

A two-board layout SHALL NOT carry a named grid area for an element that no code path can populate.
Either the element is wired to its data, or it and its area are removed from that page's templates.

#### Scenario: An element with no data source

- **WHEN** a page renders an element whose only writer is a message that page never receives
- **THEN** the element and its grid area SHALL be absent from that page

#### Scenario: Spectators on a page with a socket

- **WHEN** a two-board page receives a `spectators` message
- **THEN** it SHALL render the spectator list into `#spectators` as the single-board pages do
