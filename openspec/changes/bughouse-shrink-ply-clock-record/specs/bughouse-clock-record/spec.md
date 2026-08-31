## MODIFIED Requirements

### Requirement: A ply's clock record SHALL store only values its author could know

A recorded ply SHALL store the clock of the seat that made the move, which its client measured by
pausing that clock before sending. It SHALL NOT store that client's view of seats it does not own:
those values are the seats' clocks as they were when their turn BEGAN, not at the moment of the ply,
and they are stale by the whole of the current think time.

Every other seat's clock at that ply SHALL be derived, not stored. With no increment each board has
exactly one clock running, so both boards' totals fall at the same rate and are equal at every
instant; at a ply played on one board both of that board's values are authoritative, which fixes the
other board's total, and its paused seat is its own last authoritative value.

Games recorded before this change SHALL continue to read correctly.

#### Scenario: A seat is mid-think when a ply on the other board is recorded

- **WHEN** a ply is recorded on one board while a seat on the other board is on move
- **THEN** the record SHALL NOT contain a stored value for that thinking seat
- **AND** the analysis page SHALL show that seat's clock as it was at that moment, derived from the
  authoritative values

#### Scenario: A game recorded in the old four-value shape is opened

- **WHEN** a game stored before this change is loaded
- **THEN** it SHALL render the same four clocks per ply as it does today
- **AND** the reader SHALL NOT require a migration of stored documents
