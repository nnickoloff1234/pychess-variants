## ADDED Requirements

### Requirement: The round page reserves no space it does not use
The bughouse round page SHALL NOT reserve vertical space for content that is not there. Every grid track it declares SHALL be sized from what occupies it, so that an area whose element is empty — or whose element does not exist — costs nothing.

No page-level wrapper SHALL inherit the round page's row template. A grid that declares one area SHALL have the rows that area needs and no others; a wrapper SHALL NOT end below its only child.

A row's height SHALL NOT be a fixed pixel value chosen for one expected occupant, because that value is simultaneously too much when the occupant is empty and arbitrary when it is not.

#### Scenario: An empty sidebar costs nothing
- **WHEN** the round page renders with an empty first sidebar
- **THEN** the row holding it has no height, and the page is no taller for it

#### Scenario: The wrapper ends where its content ends
- **WHEN** the page wrapper is measured
- **THEN** its bottom edge is the bottom edge of its only child, with no track below it

#### Scenario: The desktop page does not scroll over emptiness
- **WHEN** the round page is displayed in the `min-height: 600px` landscape mode at a viewport tall enough for the boards
- **THEN** the document's scrollable height does not exceed the viewport on account of empty areas

### Requirement: A board column is a quarter of the page at the default zoom
In the `min-height: 600px` landscape mode a board's column SHALL be **a quarter of the viewport width when no zoom has been applied**, and SHALL scale linearly with that board's own zoom setting, reaching its maximum at full zoom.

Each board SHALL use its own scale, so the two zoom sliders remain independent and one board may be enlarged while the other is not.

The tools column SHALL be a fixed fraction of the viewport width and SHALL NOT scale with either board's zoom. Its width serves reading chat and move lists, not board geometry.

#### Scenario: Untouched settings show a quarter each
- **WHEN** the round page is displayed in this mode and neither zoom slider has been moved from its default
- **THEN** each board's column is a quarter of the viewport width, and the tools column is a fifth

#### Scenario: Zoom still moves the board
- **WHEN** a board's zoom setting is changed
- **THEN** that board's column width changes in proportion, reaching its maximum at full zoom

#### Scenario: The two boards zoom independently
- **WHEN** the two boards' zoom settings differ
- **THEN** each board's column reflects its own setting and neither follows the other

#### Scenario: The tools column ignores zoom
- **WHEN** either board's zoom setting is changed
- **THEN** the tools column keeps the width it had

## MODIFIED Requirements

### Requirement: No mode splits a seat's furniture across tracks
In every round-page layout mode, a seat's pocket and its clock/name block SHALL occupy one grid area together — the seat's strip — and a board SHALL be backed by a single column rather than by one column for pockets and another for clocks.

A strip SHALL present its contents in the same order in every mode: pocket, then name, then clock. Where a board is rotated and its strip runs alongside it, the strip SHALL stack its contents in that same order rather than laying them in a row.

**In the `min-height: 600px` landscape mode the two boards SHALL be adjacent**: their columns SHALL be neighbours, with the tools columns beside them rather than between them. A player compares the two boards constantly, and nothing SHALL be placed in the gap between them. Each board's seat strips SHALL be placed by the same columns as the board they belong to, so a strip always sits directly above or below its own board.

This applies to the round page's modes only. The two-board analysis layout does not express seats this way — its pockets are detached from their boards into a shared column and its clocks are positioned overlays with no grid area — and SHALL be left as it is.

#### Scenario: The split is gone from every mode
- **WHEN** the computed grid of the round app is inspected in short landscape, in `min-height: 600px` landscape, and in portrait
- **THEN** in each case a board is backed by one column, and no area holds a pocket without the clock and name that belong to the same seat

#### Scenario: A seat looks the same in every mode
- **WHEN** a seat is compared between two layout modes
- **THEN** its pocket, name and clock appear in the same order, differing only in the strip's size and axis

#### Scenario: The boards are neighbours on the desktop
- **WHEN** the round page is displayed in the `min-height: 600px` landscape mode
- **THEN** the two board columns are adjacent, and the tools areas are placed to one side of the pair rather than between them

#### Scenario: Strips follow their board
- **WHEN** the boards are reordered within the grid
- **THEN** each seat strip remains directly above or below the board whose seat it describes

#### Scenario: Analysis is untouched
- **WHEN** the two-board analysis page is compared before and after the change
- **THEN** its layout and its flip and switch behaviour are unchanged
