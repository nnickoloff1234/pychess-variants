## ADDED Requirements

### Requirement: A board fills the height it is given at full zoom

In the `min-height: 600px` landscape mode, full zoom SHALL mean the board is as large as its
space allows. A board's stack — the pocket row above it, the board, and the pocket row below it —
SHALL together fill the height available to that stack, and the board SHALL remain square.

The default zoom SHALL be full zoom, so a page nobody has adjusted draws its boards at that size.

Zoom below full SHALL scale the stack down from that maximum rather than up towards it. Each
board SHALL use its own scale, so the two sliders remain independent and one board may be
enlarged while the other is not.

The size SHALL derive from the height the layout allots, not from a fixed fraction of the
viewport width, so that a taller window yields a larger board without touching a slider.

#### Scenario: Untouched settings fill the height
- **WHEN** the round page is displayed in this mode and neither zoom slider has been moved from its default
- **THEN** each board's stack — top pocket row, board, bottom pocket row — occupies the full height available to it, and each board is square

#### Scenario: A taller window gives a larger board
- **WHEN** the same page is displayed in a window of greater height, with the sliders untouched
- **THEN** both boards are drawn larger, in proportion to the height gained

#### Scenario: Zoom still shrinks the board
- **WHEN** a board's zoom setting is reduced from its default
- **THEN** that board's stack becomes proportionally shorter and no longer fills the height, and the board stays square

#### Scenario: The two boards zoom independently
- **WHEN** the two boards' zoom settings differ
- **THEN** each board reflects its own setting and neither follows the other

### Requirement: Landscape is two columns, and the tools belong to the second

In both landscape modes the round grid SHALL have exactly two columns that carry content.

The first column SHALL hold the left board's stack and nothing else, and its width SHALL be
unaffected by the tools.

The second column SHALL hold both the right board's stack and the tools, **as siblings in one
container**, so that the column's size is the size of the two together rather than of whichever is
wider. The tools SHALL NOT occupy a column of their own, and SHALL NOT be laid out beside both
boards.

That column SHALL be sized differently per mode, because the two modes have different amounts to
spend:

- In tall landscape it SHALL be sized from its contents.
- In short landscape it SHALL take whatever width is left after the first column.

Merging the columns SHALL NOT change the size or the appearance of either the right board or the
tools at their default settings. This requirement is structural: it fixes where they live, not
what they look like.

How they arrange themselves *within* that container is the subject of the two requirements below.
What this one establishes is that they share it, which is what makes it possible for parts of the
tools to sit under the right board once it is smaller than the container.

Separation between the two boards SHALL be preserved: the left board's rank labels overhang to
its right and SHALL NOT paint onto the right board.

#### Scenario: The grid has two content columns
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the grid defines two columns carrying content, and no track is dedicated to the tools alone

#### Scenario: The tools sit with the right board
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the tools and the right board's stack share one container occupying the second column

#### Scenario: Nothing changes size
- **WHEN** the round page is displayed in either landscape mode with default settings, before and after this change
- **THEN** the right board and the tools have the same size and position on screen as they did

#### Scenario: The merged column is content-sized in tall landscape
- **WHEN** the round page is displayed in tall landscape
- **THEN** the second column is as wide as the right board and the tools together, and no wider

#### Scenario: The merged column takes the remainder in short landscape
- **WHEN** the round page is displayed in short landscape
- **THEN** the second column occupies the width left over after the first column, and both boards remain fully on screen

#### Scenario: The left board is unaffected
- **WHEN** the tools' contents change size, or a tab with different contents is selected
- **THEN** the left board's column keeps its width and the left board does not move

#### Scenario: The boards stay separated
- **WHEN** the round page is displayed in either landscape mode
- **THEN** the left board's rank labels do not paint onto the right board

### Requirement: The tools are placed as parts, not as a panel

In the landscape modes the tab parts and the tab bar SHALL be placed individually inside the
second column. No container SHALL fix them beside the right board, because such a container is
what makes the space under a shrunken board unreachable: it is a grid item confined to its own
track, and being a block formatting context it cannot flow around the board either. Where a
container is needed for another mode, it SHALL form no box in these modes.

The right board and its two seat strips SHALL be grouped, since they are one unit that moves and
sizes together and cannot be arranged individually without coming apart.

**Parts leave the strip beside the board in a fixed order**: the tab bar first, then the preset
parts from the bottom up. The chat SHALL NOT move in any arrangement; it SHALL remain beside the
board and take whatever height the others leave.

A part that leaves SHALL NOT merely relocate — it SHALL widen to the full width of the column,
sitting below both the board and the parts still above it.

A part SHALL leave only when the board's stack still fits in the height that would remain, so a
part never drops into a space that does not hold it, and the parts above it never leave a gap.

What a single tools container provided SHALL be preserved: only the selected tab's parts are
visible; the second column still yields its width before either board is pushed off screen; and
the tab bar, holding the tab list and the game controls, remains reachable in every mode.

#### Scenario: Nothing moves at full zoom
- **WHEN** the round page is displayed in a landscape mode with both boards at full zoom
- **THEN** the parts are arranged beside the right board as they were, and the page looks unchanged

#### Scenario: The tab bar leaves first
- **WHEN** the right board is made small enough that one part can leave, but no smaller
- **THEN** the tab bar is the part that has moved, it spans the full width of the column, and it sits below the board and below every part still beside it

#### Scenario: The presets follow, from the bottom up
- **WHEN** the right board is made small enough for further parts to leave
- **THEN** the preset parts leave after the tab bar and in reverse order, each spanning the full width of the column

#### Scenario: The chat never moves
- **WHEN** the right board is at any zoom
- **THEN** the chat is beside the board, and it is taller for every part that has left

#### Scenario: Parts of a tab still travel together
- **WHEN** a tab is selected
- **THEN** every part of that tab is shown and every part of the other tabs is hidden, wherever each part is placed

#### Scenario: A tab with one part moves only the tab bar
- **WHEN** a tab that has no preset parts is selected and the board is small enough for a part to leave
- **THEN** the tab bar spans the full width and the tab's own panel stays beside the board

#### Scenario: The boards still win the width
- **WHEN** the viewport is too narrow for the parts at their natural width
- **THEN** the parts yield and both boards remain fully on screen

#### Scenario: The controls remain reachable
- **WHEN** the round page is displayed in any mode
- **THEN** the tab list and the game controls are within the viewport and can be clicked

### Requirement: A preset part holds two sets that pair when there is room

The presets SHALL be divided into two parts, each holding two sets of five buttons, so that they
can take the space under the board one part at a time rather than all together or not at all.

A set SHALL NOT be broken up: its five buttons SHALL stay on one row. The ask and don't-give sets
SHALL remain piece-aligned when stacked, so that "need a knight" sits directly above "don't give
a knight".

Within a part the two sets SHALL sit side by side where the part is wide enough for both, and
SHALL stack where it is not. A part that has left the strip beside the board SHALL be wide enough
for both, so its ten buttons occupy one row.

The button floor that keeps the sets stacked beside the board SHALL NOT prevent a part that has
left from pairing them. Buttons in a part that has left MAY therefore be smaller than that floor,
but SHALL remain above the minimum target size that the floor exists to satisfy.

#### Scenario: Beside the board the sets stack
- **WHEN** a preset part is beside the right board
- **THEN** its two sets are on separate rows, five buttons each, as the presets have always been drawn

#### Scenario: A part that has left shows ten buttons on one row
- **WHEN** a preset part has moved below the board
- **THEN** its two sets share one row and the part is half the height it was

#### Scenario: Buttons stay usable
- **WHEN** a preset part has moved below the board on the narrowest column this produces
- **THEN** its buttons remain at or above the minimum usable target size

#### Scenario: Portrait is unaffected
- **WHEN** the round page is displayed in portrait
- **THEN** the four sets are stacked as four rows of five, in the order ask, don't give, then the tells

## REMOVED Requirements

### Requirement: A board column is a quarter of the page at the default zoom

**Reason**: Superseded on both counts. Its sizing rule — a board column being `31.25vw` scaled by
a default zoom of 80, so a quarter of the viewport width — is replaced by the full-height rule
above, which makes full zoom mean "as large as the space allows" and makes the default full. Its
tools rule describes a dedicated tools column that the two-column requirement removes.

**Migration**: The parts worth keeping are carried forward rather than dropped. Independent
per-board scales survive verbatim in "A board fills the height it is given at full zoom". The
guarantee that the tools do not disturb board geometry survives as "The left board is
unaffected", now expressed as the left column being immune to the tools rather than as a tools
column that ignores zoom.
