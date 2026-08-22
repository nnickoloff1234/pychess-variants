## ADDED Requirements

### Requirement: The board's grid slot equals the board it renders
In the short-landscape mode — `(max-height: 600px) and (orientation: landscape)` — the grid tracks reserved for a board SHALL be sized from a **quantised square unit**, so the slot equals the board chessgroundx actually renders and no unused space is left inside the board's wrap.

The square unit SHALL be the largest value for which **10 square-sized rows** fit the height available to the board column — one pocket row, eight board rows, one pocket row — and SHALL be quantised so that one square is a whole number of device pixels, matching the rule chessgroundx applies when it sizes a board. Board tracks SHALL be expressed as multiples of that unit: each of the four board columns is 4 squares, the four board rows are 2 squares each, and each pocket row is exactly 1 square.

The rendered board size SHALL be unchanged by this requirement. Any remainder between 10 squares and the available height SHALL collect once, outside the board block, rather than inside a board's wrap.

#### Scenario: No slack inside the board wrap
- **WHEN** the round page is displayed in short landscape
- **THEN** each board's wrap and its `cg-board` have the same width and height, and there is no gap between the two boards, nor between a board and the pocket below it

#### Scenario: Pocket squares match board squares
- **WHEN** the pockets are rendered beside a board
- **THEN** a pocket row's height equals one board square exactly, rather than being taller than it as it is when the row is a raw `vh` fraction

#### Scenario: The board is not resized by this change
- **WHEN** the same viewport is measured before and after the change
- **THEN** the rendered board width is the same value in both cases, confirming this aligns geometry rather than rescaling the board

### Requirement: The quantisation rule is duplicated deliberately and marked for removal
The square unit SHALL be computed in this project's own code, duplicating the `floor(width × devicePixelRatio / files) × files / devicePixelRatio` rule that chessgroundx applies inside `updateBounds()`.

This duplication SHALL be explicitly documented at the point of definition as a temporary measure taken because chessgroundx does not expose the rule as a pure function, together with the intent to request such an export upstream and delete the copy once available. The copy SHALL name the chessgroundx version it was taken from, so a future reader can tell whether upstream has since diverged.

#### Scenario: The duplicate is discoverable
- **WHEN** a developer reads the helper that computes the square unit
- **THEN** the comment states that the formula is duplicated from chessgroundx, names the version it matches, and says it should be replaced by an upstream export

### Requirement: No grid track is sized by late-arriving content
No track of the bughouse round grid SHALL be sized by content that can arrive or change after first paint. In particular the tools/chat column SHALL take the **remaining** width rather than being content-sized.

Because a fractional track can only distribute space that exists, the containing wrapper's own track SHALL also be made to fill the available width; a fractional tools column alone has no effect while the wrapper is content-sized.

#### Scenario: Chat messages do not move the boards
- **WHEN** a chat message long enough to exceed the column's width is added while a game is in progress
- **THEN** the grid's total width is unchanged and neither board moves horizontally; the message wraps within the column

#### Scenario: The first message does not move the boards
- **WHEN** the page loads and the initial system message is inserted into the chat
- **THEN** the boards occupy the same horizontal position before and after the insertion

#### Scenario: The column claims the leftover width
- **WHEN** the round page is displayed in short landscape
- **THEN** the tools column's width is whatever remains after the board and pocket tracks, and the grid spans the full width available to it

### Requirement: The board's geometry is final before it is measured
The square unit SHALL be published **before the board is constructed**, so that the geometry chessgroundx measures when it initialises is already the final geometry. It SHALL be recomputed on viewport resize, since its inputs are the viewport height and the device pixel ratio.

Nothing on the round page SHALL move or resize a board after initialisation without the viewport itself changing. The system SHALL NOT compensate for such a movement after the fact: no additional bounds recomputation is defined, because a compensating call would conceal exactly the defect this requirement exists to prevent. A layout change that moves a board after initialisation is a defect in that layout change.

No grid track used by this layout SHALL consume the board dimensions that chessgroundx publishes, so that publishing them cannot trigger a relayout and no feedback path exists between measurement and layout.

#### Scenario: A click selects the square under the pointer
- **WHEN** a player clicks the visual centre of a square in short landscape
- **THEN** that square is selected, for every square of both boards, with no calibration or correction applied

#### Scenario: The board does not move after initialisation
- **WHEN** the page has loaded and the game is in progress, with no viewport change
- **THEN** each board's position and size are identical to what they were when it was constructed, including after chat messages arrive

#### Scenario: Resizing the viewport keeps clicks correct
- **WHEN** the viewport is resized, or the browser zoom level is changed
- **THEN** the square unit is recomputed, the boards are re-laid out, and clicking the visual centre of a square still selects that square

### Requirement: The bughouse round page does not scroll
The bughouse round page SHALL NOT produce a page-level scrollbar in short landscape. The rule SHALL be scoped to that page alone, so no other view's scrolling behaviour changes.

The scoping SHALL be achieved with a selector on `body` carrying the page's own data attributes, relying on the fact that a viewport takes its overflow from `body` when the root element's overflow is `visible`. The root element SHALL NOT be given a global overflow rule.

#### Scenario: No page scrollbar in this mode
- **WHEN** the bughouse round page is displayed in short landscape
- **THEN** no page-level scrollbar is present, and the width available for layout equals the full viewport width

#### Scenario: Other pages are unaffected
- **WHEN** any other view is displayed, including the bughouse analysis page and non-bughouse rounds
- **THEN** its scrolling behaviour is exactly as before

#### Scenario: Viewport-positioned overlays still work
- **WHEN** an element positioned relative to the viewport, such as the reconnecting indicator, becomes visible
- **THEN** it is displayed normally, since clipping the document flow does not affect it

### Requirement: Every viewport resolves to a bughouse layout
The responsive rules for the bughouse round page SHALL cover every combination of orientation and viewport size, so that `.round-app.bug` is never left to inherit the single-board layout, whose grid areas do not include the second board, the partner pockets, the partner clocks or the partner tools.

#### Scenario: Wide portrait viewports are covered
- **WHEN** the round page is displayed in portrait orientation at a viewport width of 800px or more, such as a tablet held upright
- **THEN** a bughouse layout applies, and both boards, both pairs of pockets, both clocks and the tools areas are placed in defined grid areas
