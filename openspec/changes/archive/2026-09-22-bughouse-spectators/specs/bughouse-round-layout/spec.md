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

### Requirement: The tab holding the spectator list SHALL carry their number

Where a two-board page shows its spectators inside a tab, the number watching SHALL appear on that
tab's label while there is at least one. A reader looking at any other tab has no other way to learn
that anybody is watching, and the list itself is one tab away.

The count SHALL be the number of people the payload describes, not the number of entries in it: the
server collapses anonymous watchers into a single `Anonymous(N)` entry, and sends a bare count in
place of the names once there are more than it will name.

With nobody watching, the tab SHALL carry its plain name and nothing else — no empty brackets and no
zero, which a reader would see for the whole of most games.

#### Scenario: Somebody is watching

- **WHEN** the page is told that two people are watching
- **THEN** the tab holding the list reads as its name followed by `(2)`

#### Scenario: Anonymous watchers are people

- **WHEN** the payload collapses several anonymous watchers into one entry
- **THEN** the count includes each of them

#### Scenario: Nobody is watching

- **WHEN** the last spectator leaves
- **THEN** the tab's label returns to its plain name

### Requirement: The game information and the spectator list SHALL be a column

Where a two-board page puts both in one panel, the game information SHALL sit above the spectator
list, each taking the panel's full width. They are not alternatives competing for the same row: the
list is about the game the block above it describes, and the panel is the narrowest region on the
page.

A team SHALL be described as members that break between them and never inside them. Where the panel
is too narrow for a whole team on one line, each member SHALL take a line of its own, carrying the
colour it plays so that no part of a member is separated from the name it belongs to.

#### Scenario: Both parts in one panel

- **WHEN** a panel holds the game information and the spectator list
- **THEN** the list is below the information, and both are as wide as the panel

#### Scenario: A team too wide for its panel

- **WHEN** a team's two members cannot be drawn on one line
- **THEN** each member is drawn on its own line, with its colour beside its name
