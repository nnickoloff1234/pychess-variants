## ADDED Requirements

### Requirement: One vocabulary names a seat slot

A seat slot is a physical screen position on a board — which end of which board — and it SHALL be
named the same way everywhere it is named: by both pages' seat views, and by the clocks that sit in
those slots. The type describing the four slots SHALL be declared once and imported, not declared
again per module.

The reason both pages already key by physical position, and state it in their own comments, is that
which player is at the top of a board depends on that board's orientation and changes on flip. Two
vocabularies for that one idea is the same fault as one mode naming a layout slot differently from the
mode beside it.

#### Scenario: A module names a seat slot
- **WHEN** any module identifies one of the four seat slots
- **THEN** it uses the shared names, and no module defines its own set

#### Scenario: The clocks and the names sit in the same slot
- **WHEN** a clock and a player bar occupy the same seat slot
- **THEN** both are addressed by the same slot name, so a flip re-renders the matching pair without
  either module translating between vocabularies

#### Scenario: A board is flipped
- **WHEN** a board's orientation changes
- **THEN** the slot names are unchanged, because a slot is a position and not a player

### Requirement: How a flip is applied may differ between the pages, and why SHALL be stated

The round page SHALL rearrange seat furniture by MOVING elements between strips, and the analysis
page MAY re-render it from state. The difference is not an inconsistency to be removed: a round
page's clock is a live object whose local reading is the authority for that seat's time, so
re-rendering it would destroy the measurement, while the analysis page has no ticking clock.

Wherever the two pages handle one event differently, the reason SHALL be recorded beside the code, so
that a later reader unifying vocabularies does not also unify a behaviour that differs on purpose.

#### Scenario: Round page flip
- **WHEN** a board is flipped on the round page
- **THEN** the seats' blocks are moved between strips and no clock object is recreated

#### Scenario: Analysis page flip
- **WHEN** a board is flipped on the analysis page
- **THEN** the seat names and clocks are re-rendered from state, and nothing depends on a previous
  element surviving

#### Scenario: A deliberate difference is read later
- **WHEN** a reader compares the two pages' handling of one event
- **THEN** the code states which differences are deliberate and why, so the ones that are debt are
  distinguishable from the ones that are not
