## ADDED Requirements

### Requirement: The analysis page arranges its boards as the round page does

The bughouse analysis page SHALL place its two boards adjacent to each other, with the tools beside
them rather than between them. Nothing SHALL be placed in the gap between the two boards except a
board's own eval gauge.

A player compares the two boards constantly, and the analysis page exists to be read while doing so.
Placing the boards at opposite edges with the tools in the middle puts the whole page between the two
things being compared, and gives the tools a column too narrow to read.

In landscape the order SHALL be: the main board, its gauge, the other board, its gauge, then the
tools. In portrait the two boards SHALL be stacked with the tools below them.

#### Scenario: The boards are neighbours
- **WHEN** the analysis page is displayed in landscape
- **THEN** the two boards are adjacent, and the tools occupy a column to the right of both

#### Scenario: Nothing is parked between the boards
- **WHEN** the gap between the two boards is inspected
- **THEN** it holds only the left board's own eval gauge, and no pocket, movelist, engine panel or other tool

### Requirement: The main board is the viewer's own, and sits nearest the reader

The MAIN board SHALL be the board the viewer played on. A viewer holding no seat in the game — a
spectator, or any user who was not a player — SHALL get board A as their main board.

The main board SHALL be placed nearest the reader: the LEFT board in landscape, the BOTTOM board in
portrait. This SHALL match the round page, so that a player moving between the two pages finds their
own board in the same place.

Which board is the main one SHALL be expressed as a ROLE carried on the board, not as the identity of
a particular board element. Anything that must follow the viewer SHALL read that role. Addressing a
board by identity gives a player seated on the other board every pairing backwards.

The rule deciding the role SHALL be shared with the round page rather than implemented a second time.

#### Scenario: A player sees their own board first
- **WHEN** a player of the game opens it in analysis
- **THEN** the board they played on is the left board in landscape and the bottom board in portrait

#### Scenario: A spectator gets board A
- **WHEN** a user who played no part in the game opens it in analysis
- **THEN** board A is the main board

#### Scenario: The role is not the identity
- **WHEN** the code deciding placement, sizing or gauge pairing is inspected
- **THEN** it reads the board's role, and no rule keys off which board is board A

### Requirement: The analysis page has a portrait layout

The bughouse analysis page SHALL have a layout for portrait orientation at every width.

It currently has none: its only grid is inside a `min-width: 800px` query, and narrower viewports
fall through to the single-board page's rules, which name areas this page's elements do not all have.
A layout SHALL NOT be left to a fallback written for a different page.

#### Scenario: Portrait is laid out deliberately
- **WHEN** the analysis page is displayed in portrait at any width
- **THEN** it uses a layout written for it, with the two boards stacked and the tools below

### Requirement: An eval gauge belongs to the board it reports on

Each eval gauge SHALL be placed immediately to the right of the board whose evaluation it shows, in
every orientation. A gauge SHALL NOT be placed where it could be read as belonging to the other
board, and the two gauges SHALL NOT be placed together.

#### Scenario: Each gauge is beside its own board
- **WHEN** the analysis page is displayed
- **THEN** each board has its own gauge immediately to its right, and neither gauge is adjacent to the other

### Requirement: The analysis tools are one tabbed panel

The analysis tools SHALL be a single tabbed panel, not a stack of separately placed elements.

The move list, the move controls, and the engine — its switches, its name panel, its principal
variation and its position information — SHALL be in ONE tab. They are one activity: reading the
game. Separating the evaluation from the move it evaluates would make a reader choose which half to
see.

The game information SHALL be a second tab.

Any panel that exists in the page's markup but renders nowhere visible SHALL be given a tab rather
than left unreachable or deleted. A panel nobody can see cannot be judged, and deleting it decides
its fate without ever having looked at it.

#### Scenario: Engine and moves are read together
- **WHEN** a player opens the tab holding the move list
- **THEN** the engine's evaluation and its principal variation are visible at the same time

#### Scenario: Game info has its own tab
- **WHEN** the tools panel is inspected
- **THEN** the game information is one of its tabs

#### Scenario: An invisible panel is surfaced rather than dropped
- **WHEN** the page's markup contains a panel that renders nowhere
- **THEN** it is given a tab of its own, so that what it contains can be seen and then decided upon

### Requirement: Both two-board pages size their boards from one published unit

The analysis page's boards SHALL be sized from the same published, device-pixel-quantised square unit
the round page uses, and NOT from a fraction of the viewport width.

A board track SHALL be that unit times the file count with nothing multiplied into it afterwards. A
published unit is a whole number of device pixels per square, which is what makes the board's own
flooring a no-op on it; multiplying it by a zoom fraction un-quantises it, after which the board
floors the product again and keeps the difference — up to a whole square's worth.

Where the two pages' vertical compositions differ, the unit calculation SHALL be extended to publish a
second unit rather than duplicated. There SHALL be one place that knows how a board's square is
derived.

#### Scenario: The two boards match
- **WHEN** the analysis page is displayed with both boards at the same zoom
- **THEN** the two boards are the same size, and each fills the height its track reserves

#### Scenario: Nothing is multiplied into a board track
- **WHEN** a rule sizing an analysis board is inspected
- **THEN** it is a published unit times the file count, with no scale applied afterwards

#### Scenario: One derivation, not two
- **WHEN** the code deriving a board's square is inspected
- **THEN** there is a single module doing it for both pages

### Requirement: A pocket is sized from the board it sits against

Every pocket on both two-board pages SHALL take its size from the square of the board it belongs to,
in every layout mode. A pocket piece SHALL be exactly one board square, because a pocket sits pieces
on squares and a piece that does not match its board reads as a different set.

The square SHALL be inherited from the STACK the pocket sits in, not read from the board's own
identity. A stack is keyed by role — the viewer's own board, or their partner's — while a pocket
element is keyed by board identity, and a viewer seated on board B has board B in the own stack. A
pocket that asks which board it belongs to gets the pairing backwards for that viewer.

Where a pocket shares its row with other furniture, its CELL width MAY be compacted below one square
to leave that furniture room. Where the pocket has the row to itself, it SHALL NOT be compacted.

#### Scenario: A pocket matches its own board in every mode
- **WHEN** either two-board page is displayed in portrait, short landscape or desktop landscape
- **THEN** each pocket's pieces are one square of the board that pocket sits against

#### Scenario: A board-B player's pockets are not swapped
- **WHEN** a viewer who played on board B opens the analysis page
- **THEN** each pocket is sized against the board it is drawn next to, not against the board of the
  same letter in the other stack

#### Scenario: A pocket with its row to itself is not compacted
- **WHEN** a pocket shares its row with no clock and no username
- **THEN** its cells are a whole board square each

### Requirement: A board's clocks are always on the same side

Both of a board's clocks SHALL be drawn against the same edge of every board on the page — the same
corner on each — so that a reader finds a clock in one place rather than two.

Clocks SHALL NOT be mirrored between the two boards. Mirroring belongs to a layout that pins the
boards to opposite edges of the page with the reader between them; with the boards adjacent there is
no inward direction for them to face.

The side SHALL NOT be chosen from a board's identity. `.bug` is board B whoever played on it, so a
rule keyed that way puts the clocks on the wrong side for a viewer whose own board is board B.

#### Scenario: Both boards report on the same side
- **WHEN** the analysis page is displayed in any mode
- **THEN** all four clocks are flush with the right edge of the board they belong to

#### Scenario: A board-B player sees the same arrangement
- **WHEN** a viewer who played on board B opens the analysis page
- **THEN** their own board's clocks are on the same side as their partner's

### Requirement: A username is drawn beside the board its player played on

Both two-board pages SHALL draw each player's username, rating and title beside the board and end
that player occupied, so that a reader can attribute a position without consulting a panel.

A username SHALL take a line of its own wherever the layout has height to spare for one, and SHALL
share the pocket's row wherever it does not. Squeezed beside a pocket a name gets only what the
pocket leaves; a line of its own is the full width of the strip. The answer SHALL be decided per
stack, since two boards may be at different zooms and the answer can differ between them.

The height a username's line is drawn from SHALL be height nothing else has claimed. Where the same
spare height also feeds another feature, the dependency SHALL run one way only — one feature settles
and the other takes the remainder — because two features each measuring what the other left is a
feedback loop, not a budget.

A username SHALL NOT overlap the clock, the pocket or the board. Where a clock is pinned against the
board's edge, the username SHALL be placed at the strip's other end.

#### Scenario: Full zoom leaves no room
- **WHEN** a board is at a zoom where its stack fills the height the page gives it
- **THEN** that stack's usernames are drawn inside the pocket's row

#### Scenario: A reduced board frees a line
- **WHEN** a board is at a reduced zoom and its stack no longer fills that height
- **THEN** that stack's usernames are drawn on lines of their own, at full width

#### Scenario: Two boards at different zooms
- **WHEN** the two boards are at different zooms and only one has height to spare
- **THEN** only that board's usernames take a line of their own

#### Scenario: A username never collides
- **WHEN** either page is displayed in any mode, in either state
- **THEN** no username's text overlaps a clock, a pocket or a board

#### Scenario: Flipping a board repaints its names
- **WHEN** a board is flipped
- **THEN** the usernames at its two ends are exchanged, so each still names the player at that end
