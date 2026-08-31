## ADDED Requirements

### Requirement: A widget shared by both two-board pages SHALL be styled once

Where the round page and the analysis page render the same widget — the board coordinates, the
movelist, the pockets, the seat strips — its appearance SHALL be declared once and apply to both.
A rule that gives a shared widget its treatment MUST NOT be scoped to one page's app class.

This is the part of "the two pages SHALL share one layout" that a scoped selector quietly breaks:
the widget still renders on both pages, but only one of them looks finished.

#### Scenario: A shared widget is styled for one page

- **WHEN** a rule sets the appearance of a widget that both pages render
- **THEN** the selector SHALL match the widget on both pages
- **AND** the treatment MUST NOT be duplicated into a second per-page copy that can drift

#### Scenario: Board coordinates on either page

- **WHEN** either page has no room outside the board for coordinate labels
- **THEN** both pages SHALL draw the labels on the squares
- **AND** they SHALL reach that decision from the same computed value, not from a per-page rule

#### Scenario: Board coordinates where there is room

- **WHEN** a page has room outside the board for the labels
- **THEN** both pages SHALL place them outside, sized and coloured identically

### Requirement: A panel SHALL fit the width it is given

No panel on either two-board page SHALL require a horizontal scrollbar to show content that fits
its height. Where a cell is given a fixed width, that cell SHALL declare what happens to content
too wide for it, rather than letting the content spill and the container grow a scrollbar.

#### Scenario: The movelist holds a long move

- **WHEN** the movelist contains a move whose text is wider than the cell it is placed in
- **THEN** the movelist's `scrollWidth` SHALL NOT exceed its `clientWidth`
- **AND** no horizontal scrollbar SHALL appear

#### Scenario: The movelist is rendered in a narrow panel

- **WHEN** the movelist is rendered in the analysis page's tools column, narrower than the round
  page's movelist column
- **THEN** it SHALL still fit that width without a horizontal scrollbar

#### Scenario: A vertical scrollbar appears

- **WHEN** the movelist is long enough to take a vertical scrollbar
- **THEN** the width that scrollbar consumes SHALL NOT push the content into horizontal overflow

### Requirement: A movelist row SHALL hold exactly four move cells

A bughouse movelist row SHALL always contain exactly four move cells. The row is what lines the two
boards' moves up against each other; a row of some other width does not show less, it shows nothing
useful, because the reader can no longer tell which board a move belongs beside.

The type size therefore FOLLOWS from the row and the panel's width. Where the resulting text is
small, the answer is a wider panel — never fewer pairs on the row.

#### Scenario: The panel is narrow

- **WHEN** the movelist is rendered in a panel too narrow for four cells at the preferred type size
- **THEN** the type SHALL scale down to fit four cells
- **AND** the row SHALL still hold exactly four

#### Scenario: A reader asks for larger moves

- **WHEN** the move text is judged too small to read
- **THEN** the remedy SHALL be the width given to the movelist
- **AND** the number of cells per row SHALL NOT be reduced to buy type size

### Requirement: A two-board page SHALL NOT emit markup it never fills

Neither two-board page SHALL render an element that nothing on that page populates. An element
carried over from another page's view is not inert: it takes a row, a gap, or a margin from a
layout that is pinned to the viewport, and hiding it per mode pays that cost again in every mode.

#### Scenario: An element is populated only by another page's controller

- **WHEN** a container's content is written by a controller this page does not run
- **THEN** the page SHALL NOT emit the container
- **AND** the modes SHALL NOT carry rules to hide it

#### Scenario: The document against the viewport

- **WHEN** the round page has settled in any of its three modes
- **THEN** the document's scroll height SHALL NOT exceed the viewport's height
- **AND** it SHALL NOT rely on the viewport's overflow to clip a tail that is there
