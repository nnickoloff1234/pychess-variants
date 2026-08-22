## ADDED Requirements

### Requirement: No grid track is sized from its own occupant

No grid track SHALL be sized from a value that is derived, directly or indirectly, from the measured geometry of an element placed in that track. Such a rule is circular, and because a chess board's measured width feeds the track that sizes it, **zero is a stable fixed point** with no path back.

Track sizes SHALL be derived from inputs the layout does not itself produce — the viewport, or a sibling track's share of it. This is distinct from the existing rule against late-arriving *content*: that one concerns tracks that grow when data appears, while this one concerns tracks that can never grow at all.

#### Scenario: The partner column does not read the partner board's width

- **WHEN** the portrait grid's partner column is computed
- **THEN** its size derives from the viewport height and not from `--cg-width-a`, `--cg-width-b` or any other value chessgroundx writes from a measured board

#### Scenario: A board that measures zero recovers

- **WHEN** a board is measured as zero wide for any reason during initialisation
- **THEN** the track holding it still has its full size on the next layout pass, and the board is restored to that size

#### Scenario: Every board and pocket is usably sized

- **WHEN** the round page is displayed in any supported orientation and viewport
- **THEN** both boards and all eight pockets have non-zero width and height

### Requirement: Portrait sizes both boards from the viewport

In portrait orientation the two boards SHALL be sized from the viewport, each remaining square.

The player's own board SHALL occupy the full width available to the grid, so **its height always equals the width of the window**. The partner's board SHALL be at least **20% of the viewport height**, which makes it visibly smaller than the player's own board and places it above it.

Squareness SHALL be expressed as an aspect ratio rather than by deriving one axis from `100vw`. `100vw` includes the scrollbar, so a page that overflows renders the board wider than its own container and offset outside it.

#### Scenario: The player's board is full width and square

- **WHEN** the round page is displayed in portrait at any phone viewport
- **THEN** the player's board spans the full width available to the grid and its height equals that width

#### Scenario: The partner's board is smaller and above

- **WHEN** the round page is displayed in portrait
- **THEN** the partner's board is square, at least 20% of the viewport height, and positioned above the player's own board

#### Scenario: A scrollbar does not push the board out of its container

- **WHEN** the portrait page overflows vertically and takes a scrollbar
- **THEN** the player's board is no wider than its container and its left edge is not negative

### Requirement: Portrait fits the round page in the viewport

In portrait the round page SHALL fit the viewport without the document scrolling. The tools/chat panel SHALL take the height remaining after the boards and seat strips and SHALL scroll its own content within that height.

The site header SHALL be hidden in portrait for bughouse, as it already is in short landscape, because the vertical budget does not accommodate it.

#### Scenario: The document does not scroll

- **WHEN** the round page is displayed in portrait at a phone viewport
- **THEN** the document's scroll height does not exceed the viewport height

#### Scenario: The panel scrolls instead of the page

- **WHEN** the tools/chat panel holds more content than its height allows
- **THEN** the panel scrolls internally and the boards do not move

#### Scenario: The panel is always visible

- **WHEN** the round page is displayed in portrait
- **THEN** the tools/chat panel has non-zero height and is within the viewport without scrolling

## MODIFIED Requirements

### Requirement: No grid track is sized by late-arriving content

No track of the bughouse round grid SHALL be sized by content that can arrive or change after first paint. In particular the tools/chat column SHALL take the **remaining** width rather than being content-sized.

Because a fractional track can only distribute space that exists, the containing wrapper's own track SHALL also be made to fill the available width; a fractional tools column alone has no effect while the wrapper is content-sized.

**A rule written for one mode SHALL NOT un-fill that wrapper in another.** Modes are selected on different axes — one on width, one on height — so a rule scoped by width alone reaches every mode wider than its breakpoint. Where two such rules meet, the mode that needs a filled wrapper SHALL assert it, and SHALL do so at a specificity that actually wins.

#### Scenario: Chat messages do not move the boards
- **WHEN** a chat message long enough to exceed the column's width is added while a game is in progress
- **THEN** the grid's total width is unchanged and neither board moves horizontally; the message wraps within the column

#### Scenario: The first message does not move the boards
- **WHEN** the page loads and the initial system message is inserted into the chat
- **THEN** the boards occupy the same horizontal position before and after the insertion

#### Scenario: The column claims the leftover width
- **WHEN** the round page is displayed in short landscape
- **THEN** the tools column's width is whatever remains after the board and pocket tracks, and the grid spans the full width available to it

#### Scenario: A desktop-mode rule does not reach short landscape
- **WHEN** short landscape is displayed at a viewport wider than the desktop mode's width breakpoint
- **THEN** the round page's wrapper still fills the available width, the tools column resolves to the remainder rather than to its content, and adding a chat message moves neither board

### Requirement: Every viewport resolves to a bughouse layout

The responsive rules for the bughouse round page SHALL cover every combination of orientation and viewport size, so that `.round-app.bug` is never left to inherit the single-board layout, whose grid areas do not include the second board, the partner pockets, the partner clocks or the partner tools.

Placement alone SHALL NOT be treated as coverage. A layout in which an area is defined but resolves to zero size is not a layout that covers that viewport: the elements are present in the DOM and invisible on screen. Every area named by a mode's template SHALL therefore resolve to a usable size in that mode.

#### Scenario: Wide portrait viewports are covered

- **WHEN** the round page is displayed in portrait orientation at a viewport width of 800px or more, such as a tablet held upright
- **THEN** a bughouse layout applies, and both boards, both pairs of pockets, both clocks and the tools areas are placed in defined grid areas

#### Scenario: Phone portrait viewports are covered

- **WHEN** the round page is displayed in portrait orientation at a phone viewport, such as 386x835 or 376x835
- **THEN** a bughouse layout applies, and both boards, both pairs of pockets, both clocks and the tools areas are placed in defined grid areas **and rendered at non-zero size**

#### Scenario: Coverage is verified by size, not by placement

- **WHEN** a mode's coverage is checked
- **THEN** the check asserts the rendered width and height of each board and pocket, and a zero measurement fails it
