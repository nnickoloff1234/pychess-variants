## ADDED Requirements

### Requirement: A zone is occupied or it is not there

Zone A SHALL NOT be admitted as a home unless what is placed there FITS IT, and SHALL NOT be left
standing empty when nothing is placed there. Which of those two the layout does in a given
arrangement is a mechanism this requirement does not fix; that a declared band is neither
overflowing nor dead is what it does fix.

ADMITTING A HOME IS A PROMISE THAT ITS OCCUPANTS FIT. Admitting zone A on a proxy for its size — "is
it at least `T` squares tall" — is not that promise, because the proxy knows nothing of how many
parts the page has: measured on the round page in short landscape at 682x503, zone A measured 173px
against a 150px threshold and qualified, then held four parts needing 186px with the chat already
squeezed to zero, and the page overflowed by 44px. The analysis page, with two parts, passed the
same test honestly. A test that one page passes and another fails, for a reason neither page states,
is not a test of the thing it names.

AN EMPTY BAND IS A DEFECT, NOT A NEUTRAL OUTCOME. Where zone A is declared, has room, and nothing is
placed in it, the layout SHALL either place something there or collapse the row: measured on the
analysis page at 629x830, `zoneA2` stood 199 x 240 and empty while the only visible tab panel sat in
zone B below both boards — a black rectangle beside a board, in space the layout created on purpose
by drawing the partner's board smaller.

THE FIT TEST SHALL NOT MAKE THE BOARDS DEPEND ON THE BOARDS. `toolsHome()` is a pure function of the
viewport, and that is what keeps a board's size from being derived from a quantity measured off the
boards. Any answer SHALL preserve that: a part COUNT is a fact about the page and may be used; a
part's measured height is not and may not.

#### Scenario: A home is not admitted unless its occupants fit
- **WHEN** zone A is chosen as the tools' home
- **THEN** every part placed there is drawn at or above its own minimum
- **AND** the page does not overflow either axis

#### Scenario: A declared band is never left dead
- **WHEN** zone A is declared in the arrangement and nothing is placed in it
- **THEN** its row takes no height

#### Scenario: The decision stays a function of the viewport
- **WHEN** the tools' home is chosen
- **THEN** no input to that choice was measured from a board or from a part

### Requirement: A board's drawn size SHALL NOT be decided by where the layout puts it

A board's size SHALL come from its own published per-board unit, and no placement mechanism SHALL be
able to defeat that statement. Where the unit reaches the board through a container's own shape — a
stack's board column, say — the layout SHALL NOT change that container's shape as a side effect of
placing it.

A PLACEMENT MECHANISM THAT WRITES AN INLINE STYLE OVERRIDES THE STYLESHEET, SILENTLY. The two-board
tab widget writes each shown part's `display` inline, because the page stylesheet hides an unselected
panel and showing one again cannot simply clear the value. A part that is also a board's container
therefore states, in TypeScript, what the element IS — and whatever the stylesheet says about that
element's `display` is dead, with no warning and no error.

Measured on the analysis page at 1276x430: the partner board's part declared `block`, copied from the
round page whose stacks are block flow, against a stylesheet that makes this page's stacks
two-column grids whose first column is `calc(var(--bug-stack-sq) * 8)`. Inert, the board had no
definite width — `.cg-wrap` resolves its height from percentage padding against its own width — and
took whatever its grid area gave it: columns 354.6 / 225.1 / 679.1 with board A at 341 and board B at
225, the partner's gauge 225 wide and ZERO tall, and its pockets 213 (five squares, correctly sized
from the unit) beside a 225 board. `--bug-sq-b`, `--bug-tall-sq-b` and board B's zoom were computed,
published, and ignored.

Where such a value is declared, it SHALL be the value that element's OWN stylesheet needs, and the
page SHALL say why — a value copied from a similar part on another page is how this defect arose.

A BAND FREED BY A BOARD SHALL BE FREED BY DECISION. Zone A's size is a consequence of how much
smaller the partner board is, so a band that exists because a board's stated size was dropped is not
a layout the rules for that band may be derived from.

#### Scenario: The unit reaches the board
- **WHEN** a board is drawn in any mode
- **THEN** its width is the published per-board unit times its files, and its pockets, gauge and
  board agree on that unit

#### Scenario: Placement does not reshape a board's container
- **WHEN** a board's stack is mounted through a mechanism that writes an inline `display`
- **THEN** the value written is the one that page's stylesheet requires for that element

#### Scenario: A band is not an accident
- **WHEN** the space beside a board is used to decide what goes in it
- **THEN** that space exists because a board was deliberately drawn smaller, not because a stated
  size failed to apply

### Requirement: The partner board is as big as possible, and yields only to the tools' minimum

The partner's board SHALL be drawn as large as the viewport allows — the same size as the viewer's
own board wherever there is room for both. Nothing about this layout wants a smaller partner board;
where it is smaller, that SHALL be the consequence of a width that cannot hold the pair beside a
usable tools column, and of nothing else.

THE CASCADE, AND IT HAS AN END:

1. both boards at the size the height gives them;
2. where the tools column would fall below its minimum width, the PARTNER board shrinks — never the
   viewer's own, which is the thing the page is for;
3. the partner board SHALL NOT be drawn below HALF the main board's square;
4. where it is at that floor and the tools column still does not fit, the partner board SHALL become
   an attached tab in the tab list, and the tools SHALL take the column it vacates.

The main board SHALL NOT shrink to keep a partner board beside it. Below the floor the pair does not
shrink together: one of them leaves the row.

ZONE A IS THEREFORE A BY-PRODUCT, not a decision. Its height is whatever step 2 produced, bounded by
step 3 — so a rule about what goes in zone A SHALL NOT assume any particular band, and SHALL cope
with a zone A of zero, which is what an unpressured viewport produces.

AN ALLOWANCE THAT PAYS THE TOOLS FIRST NEEDS THE FLOOR TO BE SAFE. Defining the partner board's
allowance as "what fits once the tools are paid for", with no floor, leaves the tools' minimum beside
the boards at EVERY viewport by construction — every other home then tests as unaffordable and is
unreachable. The floor is what ends the cascade: a partner board that stops at half the main board
cannot keep paying, so the shortfall has to be met by a home change instead. The tools term and the
floor SHALL therefore be in force together.

A reader's own ZOOM is not this rule. Zooming a board down is an explicit choice and may take a board
below what this rule would draw; its floor is stated separately.

#### Scenario: Room for both
- **WHEN** the viewport can hold two full stacks and a tools column at its minimum
- **THEN** both boards are drawn the same size and zone A is zero

#### Scenario: The tools' minimum is what makes the partner board smaller
- **WHEN** the tools column would fall below its minimum width
- **THEN** the partner board shrinks by the shortfall and the viewer's own board is unchanged

#### Scenario: The floor is half the main board
- **WHEN** the shortfall would draw the partner board below half the main board's square
- **THEN** the partner board is drawn at that floor and no smaller

#### Scenario: Below the floor it becomes a tab
- **WHEN** the partner board is at its floor and the tools column still does not fit
- **THEN** the partner board is an attached tab in the tab list, the tools occupy its column, and the
  main board still has the size the height gives it

### Requirement: A control is never drawn outside the region it was placed in

A part SHALL be drawn within the area the arrangement gave it. Where a part cannot shrink to its
region — a fixed grid of buttons is the case in hand — the SIZE OF ITS CONTENTS SHALL YIELD, even
below a minimum stated for that content, because a control drawn over the board beside it is worse
than a control drawn small.

THE BOX BEING RIGHT IS NOT THE SAME AS THE CONTENT BEING INSIDE IT. A preset panel measured exactly
its track while the five fixed columns inside it, centred, were drawn 31px past each edge — the left
half over the partner board. Every box in that layout was the size it was meant to be, which is why
a survey of boxes reported nothing.

#### Scenario: Content that cannot shrink is sized to its region
- **WHEN** a part holds a fixed number of fixed-width children
- **THEN** those children are sized so the part fits its region
- **AND** a minimum stated for the child's own size does not override that

#### Scenario: Nothing is painted outside its area
- **WHEN** any part of the layout is drawn
- **THEN** what it paints, including its descendants, stays inside its area

### Requirement: The same viewport SHALL produce the same layout however it was reached

A layout value published for one arrangement SHALL NOT survive into another. Every published value
SHALL have exactly ONE carrier: where the element that publishes it depends on the arrangement, the
value left on the previous carrier SHALL be cleared, since an inner element's copy shadows the outer
one for everything beneath it.

RESIZING IS NOT A SECOND-CLASS PATH. A reader who resizes a window, rotates a phone, or crosses a
breakpoint reaches a viewport by a different route than one who loads the page at it, and the layout
they get SHALL be the same. Measured: after a walk across viewports the preset size on the app read
61px while a container from an earlier arrangement still carried 46.67px, every button resolved the
stale value, and the row was spaced for a button twice the size it was drawn at. It survived four
further passes; only a reload cleared it.

#### Scenario: A value from a previous arrangement does not shadow the current one
- **WHEN** an arrangement publishes a layout value
- **THEN** no other element carries that property

#### Scenario: Arriving by resize matches arriving by load
- **WHEN** a viewport is reached by resizing from another
- **THEN** every published value equals what a fresh load at that viewport publishes
