## ADDED Requirements

### Requirement: A board is given room for its labels when there is room to give

Where a mode has vertical space to spare after its boards and strips, that space SHALL be spent
first on a gap below the board, so the file labels have somewhere of their own rather than painting
over the strip beneath.

The gap SHALL be the spare height, capped at the labels' natural overhang, and SHALL vary
continuously with it — no larger than the labels want, no larger than the room allows. Each board's
gap SHALL follow ITS OWN column's spare height, since the two columns are sized independently.

The labels SHALL scale to the gap rather than be clipped by it, so a label is always whole. A label
too small to read is not a small label but an absent one, so below a legibility floor the gap SHALL
be zero rather than any intermediate value, and the room SHALL be returned to the strip.

The gap SHALL be computed from sizes that do not depend on it — the space the mode has and the
board's own square — and never from anything that the gap itself moves. Nothing that consumes the
spare height afterwards may feed back into it.

Where the mode has no spare height, the gap SHALL be zero and the page SHALL be laid out exactly as
it is with no gap at all.

#### Scenario: Room below full zoom becomes a gap
- **WHEN** a board is displayed at a zoom that leaves more spare height than the labels' overhang
- **THEN** the strip below it is pushed down by the full overhang and the labels sit clear of the pocket

#### Scenario: Full zoom is unchanged
- **WHEN** a board is displayed at a zoom that leaves less spare height than the legibility floor
- **THEN** the gap is zero and the stack is laid out exactly as it is today

#### Scenario: The gap follows its own column
- **WHEN** the two boards are displayed at different zooms
- **THEN** each board's gap is sized from its own column's spare height, not from the other's

#### Scenario: A label is never cut off
- **WHEN** the gap is smaller than the labels' natural overhang and at or above the floor
- **THEN** the labels are drawn at the gap's size, whole, rather than at their natural size and clipped

## MODIFIED Requirements

### Requirement: File labels overhang the strip and stay transparent to input

A board's file labels overhang below it. Where the layout has given the board a gap they overhang
into that gap; where it has not, they overhang into the strip beneath, and SHALL then paint **above**
that strip's pocket and clock rather than being covered by them.

They SHALL NOT receive pointer events. A player dragging a piece out of the pocket must be able to
start the drag on a letter and still take hold of the piece underneath; the labels are decoration and
must never intercept a grab. This holds whether or not there is a gap, because a gap that is smaller
than the labels still leaves them over the strip.

The username SHALL be positioned clear of the overhang, so the one element carrying text that must be
read is not overprinted.

#### Scenario: Labels are drawn over the pocket
- **WHEN** the strip below a board is inspected and the board has no gap
- **THEN** the file labels are visible over the pocket and the clock rather than hidden behind them

#### Scenario: A drag started on a label reaches the pocket
- **WHEN** a pointer is pressed at a position inside the label overhang where a pocket piece lies beneath
- **THEN** the element receiving the event is the pocket piece, and the drag proceeds as if the label were not there

#### Scenario: The name clears the file labels
- **WHEN** a seat's name is rendered in a strip below a board
- **THEN** it begins below the lowest extent of the labels rather than being overprinted by them

### Requirement: Coordinates may be drawn inside the squares

Where there is no room outside the board for a legible label, board coordinates SHALL be drawn inside
the squares rather than overhanging the board's edges.

The condition SHALL be the absence of room, not the identity of the layout. A mode SHALL NOT be named
in order to receive internal coordinates: it receives them when its own spare height resolves to no
gap, which the portrait and short landscape modes do by construction, their stacks being exactly ten
squares of their own unit. The desktop mode receives them at the zooms where it too has no room, and
keeps its labels outside at every zoom where it has.

A label drawn inside a square SHALL remain legible against that square: it SHALL contrast with the
square it sits on, whichever colour that is, and SHALL be placed so that it does not compete with a
piece standing on the same square.

Internal coordinates are a way of buying room, not a change of house style. A label SHALL sit outside
the board wherever the room for it exists.

**The on-square treatment SHALL be the default, and the outside treatment SHALL be what the condition
selects.** Whichever is asked for conditionally is the one lost when the browser cannot evaluate the
condition, so the condition SHALL be arranged to fail towards labels that are present and readable.
Written the other way about, a browser that cannot evaluate it keeps the outside treatment everywhere
and sizes every label from a gap of zero, so the coordinates disappear on exactly the small screens
this requirement exists to serve.

The gutters between the boards SHALL be kept whether or not the labels still need them. They separate
the boards for their own sake, and the room they happened to give the labels was incidental to that.

Coordinates SHALL be available on a phone. They were hidden there because the layout had nowhere to
put them, which internal placement removed as a reason.

#### Scenario: Labels sit on their squares
- **WHEN** the round page is displayed in a mode with no room for external labels
- **THEN** every rank and file label is drawn within the board's own area, and none overhangs its edge

#### Scenario: The gutters stay
- **WHEN** a mode draws its coordinates internally
- **THEN** the gutter separating the boards is unchanged

#### Scenario: A browser that cannot evaluate the condition still shows coordinates
- **WHEN** the round page is rendered by a browser that does not support the mechanism the condition is expressed in
- **THEN** every coordinate is drawn on its square and remains readable, and only the outside placement is lost

#### Scenario: The mobile modes are not named
- **WHEN** the rule that selects internal coordinates is inspected
- **THEN** it tests the room available, and no layout mode appears in it by name

#### Scenario: The desktop keeps its labels outside where it has room
- **WHEN** the round page is displayed in the tall landscape mode at a zoom leaving room for the labels
- **THEN** the labels overhang the board's edges exactly as they did before

#### Scenario: A label is readable on either square colour
- **WHEN** a coordinate label falls on a light square and when it falls on a dark one
- **THEN** it is legible in both cases

#### Scenario: A phone shows coordinates
- **WHEN** the round page is displayed on a phone in portrait
- **THEN** coordinates are shown

### Requirement: The round page reserves no space it does not use

The bughouse round page SHALL NOT reserve vertical space for content that is not there. Every grid
track it declares SHALL be sized from what occupies it, so that an area whose element is empty — or
whose element does not exist — costs nothing.

Space that IS free SHALL be spent rather than left idle, and the labels have the first claim on it:
a gap below the board SHALL be settled before any optional use of the same height, so that whatever
else consumes it sees only what the labels did not take.

No page-level wrapper SHALL inherit the round page's row template. A grid that declares one area
SHALL have the rows that area needs and no others; a wrapper SHALL NOT end below its only child.

A row's height SHALL NOT be a fixed pixel value chosen for one expected occupant, because that value
is simultaneously too much when the occupant is empty and arbitrary when it is not.

#### Scenario: An empty sidebar costs nothing
- **WHEN** the round page renders with an empty first sidebar
- **THEN** the row holding it has no height, and the page is no taller for it

#### Scenario: The labels are served before the optional line
- **WHEN** the spare height could hold either a label gap or a username's own line, but not both
- **THEN** the gap is taken and the name stays inline, rather than the two both claiming it

#### Scenario: The wrapper ends where its content ends
- **WHEN** the page wrapper is measured
- **THEN** its bottom edge is the bottom edge of its only child, with no track below it

#### Scenario: The desktop page does not scroll over emptiness
- **WHEN** the round page is displayed in the `min-height: 600px` landscape mode at a viewport tall enough for the boards
- **THEN** the document's scrollable height does not exceed the viewport on account of empty areas
