## ADDED Requirements

### Requirement: An external coordinate label sits against the board it names

A coordinate label drawn OUTSIDE the board SHALL be separated from that board's edge by one fixed,
minimal distance, and that distance SHALL be the same on both axes. A rank label lies in a gutter
with something else on the far side of it, and a label nearer the thing it does not name states the
wrong thing about the position rather than stating nothing.

The distance SHALL be named once and used by both axes, so the two can never disagree about it. Its
value SHALL be the distance the file labels already show below the board, taken by measurement from
the live page.

A rank label SHALL be placed by anchoring it to the board's own edge and moving it outward by that
distance. It SHALL NOT be placed by anchoring it at some remove from the board and then relying on a
box width and an alignment to arrive at a distance — three values that must agree where one states
what is meant. The box holding the rank labels SHALL be no wider than the label in it, so no slack
remains for an alignment to push a label across.

This requirement concerns only labels drawn outside the board. Labels drawn inside the squares are
governed by the requirement that selects them and are unaffected.

This requirement fixes the label's distance from its board. It says nothing about how wide the
gutter beyond the label should be.

#### Scenario: A rank label is nearer its own board than anything else
- **WHEN** a board's rank labels are drawn outside it
- **THEN** the distance from a label to its own board is smaller than the distance from that label to whatever lies on the far side of the gutter

#### Scenario: The two axes are the same distance out
- **WHEN** a board's file labels below it and its rank labels beside it are both drawn outside the board
- **THEN** each is the same distance from the board's edge, and that distance is declared in one place

#### Scenario: The rank labels are anchored to the board
- **WHEN** the rule placing the rank labels is inspected
- **THEN** it positions them from the board's own edge outward by the named distance, and no constant box width or alignment contributes to how far they land

#### Scenario: Internal coordinates are untouched
- **WHEN** the round page is displayed in a mode whose coordinates are drawn inside the squares
- **THEN** every label is placed exactly as it was before this requirement existed
