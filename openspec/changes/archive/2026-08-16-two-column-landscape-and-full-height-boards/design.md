## Context

The bughouse round page resolves to three layouts: portrait, short landscape
(`max-height: 600px`), and tall landscape (`min-height: 600px`, the desktop case). All three are
CSS grids on `.round-app.bug` in `static/bughouse.css`.

Where they stand today:

- **Portrait** (line 872) reverses the chat: `.bugroundchat.chat { flex-direction: column-reverse }`
  came from master, where the presets were the chat view's last child, so reversing put them on
  top. The presets are now a sibling, so the previous change restated the effect with
  `order: -1` to keep the page looking the same. Both rules exist only to preserve an accident.
- **Short landscape** (line 484) is four tracks — `8·--bug-sq`, a negative rank-label gutter,
  `8·--bug-sq`, then `1fr` for the tools. `--bug-sq` is a device-pixel-quantised square
  published by `client/two-board/squareUnit.ts` before the boards are built.
- **Tall landscape** (line 611) is three tracks —
  `31.25vw · --board-scaleA`, `31.25vw · --board-scaleB`, `20vw` — where the scales come from
  per-board zoom sliders defaulting to 80 (`ZoomSettings`, `client/boardSettings.ts:583`).
  31.25 × 0.8 = 25, hence a quarter of the width per board.

Two constraints already in `bughouse-round-layout` bind this work. No grid track may be sized
from its own occupant — a board's measured width feeding the track that holds it is circular, and
zero is a stable fixed point. And a board's grid slot must equal the board chessgroundx actually
renders, which is quantised to whole device pixels per file, or seams appear between the board
and its pockets.

## Goals / Non-Goals

**Goals:**

- Portrait orders chat and presets like every other layout.
- Full zoom means the board stack fills its height; full zoom is the default.
- Both landscape modes carry two content columns, with the tools in the second alongside the
  right board.

**Non-Goals:**

- Deciding which tabs float, when they wrap under the right board, or how they behave once
  there. The requirement fixes only that they share the column.
- Portrait's column structure. Portrait keeps its single-column-plus-tools arrangement.
- The partner board being drawn smaller than the player's own. That intent is recorded
  separately and is a different change, though this one moves the tall-landscape mode off `vw`
  sizing, which is the groundwork it needs.
- Any change to how zoom is stored, its slider range, or its per-board-family keying.

## Decisions

### 1. Portrait: delete both rules rather than counter them

Remove the `order: -1` on `.chatpresets-panel` and the `column-reverse` on `.bugroundchat.chat`
inside the portrait block. Deleting is what the spec asks for — "no layout SHALL reverse the
pair" — and leaves mount order as the single thing that decides position.

*Alternative considered:* keep `column-reverse` for the chat's own internals and add
`order: 1` to the presets to push them down. Rejected: it keeps the input above the messages,
which is the other half of the same oddity, and it means two layouts disagree about what a chat
looks like.

### 2. Full height is derived from the viewport, never from the board

The stack is the top pocket row, the board, and the bottom pocket row. A pocket row is one
square tall and a board is eight, so the stack is **ten squares**, and the square is the height
allotted to the stack divided by ten.

That height must come from the viewport and the layout's other fixed rows — never from
`--cg-width-a`/`--cg-height-a` or anything else chessgroundx writes from a measured board, which
the existing circularity requirement forbids and which caused the portrait collapse to 0×0.

`squareUnit.ts` already does exactly this for portrait, publishing `--bug-portrait-sq` and
`--bug-portrait-partner-sq` from an available-height computation with device-pixel
quantisation. Extend it with a landscape unit on the same pattern rather than inventing a second
mechanism in CSS. Quantisation is not optional here: the earlier seam between board and pocket
came from reserving a rounder number than the board occupied.

*Alternative considered:* pure CSS with `min(…)`, `aspect-ratio` and `vh` arithmetic, no
TypeScript. Rejected because CSS cannot round to device pixels, which is the specific thing that
removes the seam.

### 3. Zoom becomes a multiplier on the full-height size

Board size = quantised full-height square × (zoom / 100), with the default moving from 80 to 100
in `ZoomSettings`. At 100 the stack fills its height; below 100 it shrinks; the two boards keep
independent scales exactly as now.

The change of meaning is real: today the slider's maximum is a quarter of the viewport width,
and afterwards its maximum is the full available height. Nothing above 100 is introduced.

### 4. The two-column grid keeps the left column exactly as it is

Column one stays `8·--bug-sq` in short landscape and the board's own width in tall landscape.
Column two becomes a single track holding the right board's stack and the tools.

The rank-label gutter cannot survive as a track, since a track between the two boards would be a
third column. The overhang is `-1 · --ranks-right` (15px) and must not paint onto the right
board, so it becomes spacing at the start of column two — a `column-gap`, or padding on the
column's contents — rather than a track of its own. This is the one piece of the current grid
that has no direct translation.

*Alternative considered:* keep the gutter as a third track and call the layout "two content
columns plus a gutter". Rejected: the spec says two columns carrying content, and a gutter track
would leave the tools in a track of their own beside both boards, which is the arrangement being
removed.

### 5. Merging the columns needs a wrapper, and that changes how switching works

A grid track sizes to its widest item, not to two items side by side, so a second column whose
width is "the right board plus the tools" cannot be made of two separately placed grid items.
Placing them in the same cell and separating them with `justify-self: start`/`end` looks right
but leaves the track sized to whichever is wider, and it gives the later experiment nothing to
work with: floating and flowing happen among siblings in one block container, not across grid
items. So column two holds one wrapper, and the wrapper holds the right board's stack and the
tools.

The consequence is not confined to CSS. `switchBoardElements()`
(`client/two-board/twoBoardCtrl.ts:149`) exchanges the boards by swapping the inline `grid-area`
between `#mainboard` and `#bugboard`, and `markRoles()` reads that same area to decide which
board and which strips are the viewer's own. Both assume the two boards are siblings in one grid.
Once one of them is inside the wrapper they are not, and neither assumption holds.

Switching therefore becomes a move between containers rather than a rewrite of a grid area. The
existing `swap()` helper (`twoBoardCtrl.ts:134`) already moves two nodes into each other's
positions **across different parents**, which is exactly the operation needed — it is already
used this way for the pockets and for flip. `markRoles()` moves from reading `grid-area` to
asking which container an element is in, which also satisfies the existing seat-strip requirement
that rearrangement not depend on inline style.

chessgroundx memoises hit-test bounds, so a board that has been moved must be redrawn:
`switchBoards()` already ends in `redrawBoards()`, which is why the move is safe, but it is the
thing to verify rather than assume.

*Alternative considered and rejected:* keep every element a direct grid child and separate the
two by alignment inside one track. Cheaper, and switching would be untouched — but the merged
column could not be content-sized in tall landscape, which is half of what was asked for, and
the structure would have to be undone for the floating work anyway.

A caution for the experiment that follows: in short landscape the board stack already fills
essentially the whole viewport height, so there is no room under the right board until the board
is made smaller. "Flow under" is only reachable there at reduced zoom.

## Risks / Trade-offs

- **A stored zoom of 80 hides the change** → the default reaches only profiles that never moved
  the slider, and the harness profiles already hold values. Verification must clear the
  `*-zoom*` `localStorage` keys, or the boards will look unchanged and the work will appear not
  to have landed.
- **Tall landscape moves from width-derived to height-derived sizing** → a wide, short window
  gets smaller boards than before. That is the point of the rule, but it is a visible regression
  for anyone who liked the old proportions, and it should be looked at in the harness at more
  than one window shape.
- **The gutter's replacement can reintroduce the seam** → spacing added inside column two must
  not be taken out of the board's own slot, or the board's grid slot stops equalling the board
  and the seam returns.
- **Short landscape has almost no slack** → with the tools sharing a column with a board that
  fills the height, the tools may end up very narrow. If the result is unusable at 551px, the
  honest answer is to say so rather than to shrink the board silently.

## Migration Plan

1. Portrait first: delete the two rules and confirm in p4. Independent of the rest, and
   reversible on its own.
2. Publish the landscape square unit in `squareUnit.ts` alongside the portrait ones, with no CSS
   consuming it yet, and verify the value against the measured board.
3. Switch tall landscape to the published unit and change the zoom default, verifying with the
   zoom keys cleared.
4. Collapse both landscape grids to two columns last, since it is the change most likely to need
   iteration.

Each step is a separate commit on `bughouse-portrait-layout`, so any one can be reverted without
losing the others.

## Open Questions

- Does the tools panel need a minimum width in the two-column layout, or does it keep yielding to
  the board all the way to nothing as it does today?
- Should short landscape adopt full-height zoom sizing too, or keep `--bug-sq`? The requirement
  as written scopes full-height to `min-height: 600px`; short landscape already fills its height
  by construction.
- Where should the tools' vertical extent stop in tall landscape — the bottom of the board stack,
  or the bottom of the page?
