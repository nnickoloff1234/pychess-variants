# Tasks

Ordered so each stage is verifiable on its own and revertible without losing the others, per the
migration plan. Stage 1 is independent of 2–4.

## 1. Portrait: chat and presets in the ordinary order

- [x] 1.1 Delete `order: -1` from `.bug-round-tools > .chatpresets-panel` in the portrait block (`static/bughouse.css:878`)
- [x] 1.2 Delete `flex-direction: column-reverse` from `.bugroundchat.chat` in the same block (`static/bughouse.css:873`)
- [x] 1.3 Replace the comment that explained the reversal with one recording that mount order alone decides position
- [x] 1.4 Confirm no other rule reinstates either reversal — grep `column-reverse` and `order:` across the portrait blocks (172, 872, 1083, 1249)
- [x] 1.5 In p4: presets below the chat, input below the messages, and the presets still hold their height when the chat is full

## 2. A published landscape square unit

- [x] 2.1 Read how `squareUnit.ts` derives and quantises the portrait units, and follow the same shape rather than a parallel one
- [x] 2.2 Add a landscape unit derived from the height available to the board stack, divided by ten (eight board rows plus two pocket rows)
- [x] 2.3 Quantise per file to whole device pixels, as the portrait units are, so the slot equals the rendered board
- [x] 2.4 Publish it before the boards are built, alongside the existing units, and keep the no-fallback discipline so a missing value fails loudly
- [x] 2.5 Verify the published value against the board chessgroundx actually renders — seam between board and pocket measures 0

## 3. Full-height boards and a default of full zoom

- [x] 3.1 Change `ZoomSettings`' default from 80 to 100 (`client/boardSettings.ts:583`)
- [x] 3.2 Replace the `31.25vw * --board-scaleX` column widths in the `min-height: 600px` grid with the published unit scaled by the board's own zoom
- [x] 3.3 Keep the two scales independent — one board enlarged must not move the other
- [x] 3.4 Confirm the board stays square and the stack fills the height at zoom 100
- [x] 3.5 Verify with the `*-zoom*` localStorage keys cleared, or a stored 80 will mask the new default
- [ ] 3.6 Check a second window height — a taller window must yield a larger board with the slider untouched
- [x] 3.7 Check that reducing zoom shrinks the stack and leaves the board square

## 4. Two columns in both landscape modes

The wrapper first, then each mode, then switching. Nothing here may change how the right board or
the tools look at default settings — this stage moves where they live, not what they are.

- [x] 4.1 Add the wrapper in `round.ts`: one element in the second column holding the right board's stack (`#bugboard` and both `b` strips) and `.bug-round-tools`
- [x] 4.2 Collapse the `min-height: 600px` grid to two columns, the second sized from its contents
- [x] 4.3 Collapse the `max-height: 600px` grid to two columns, the second taking the remaining width, removing the dedicated `1fr` tools track
- [x] 4.4 Arrange the wrapper's contents so the page looks unchanged — right board first, tools beside it
- [x] 4.5 Re-home the rank-label gutter as the gap between the two columns rather than a track of its own; check first whether the comment at `bughouse.css:502` about a two-column board span is still true
- [x] 4.6 Keep `.bug-round-tools`'s zero minimums so the tools yield before a board is pushed off screen

### Switching, which the wrapper breaks

- [x] 4.7 Rework `switchBoardElements()` to move `#mainboard` and `#bugboard` between the first column and the wrapper via `swap()`, instead of exchanging their inline `grid-area`
- [x] 4.8 Move the seat strips the same way — `swapSeatStripAreasForSwitch()` currently swaps grid areas between the `a` and `b` strips
- [x] 4.9 Rework `markRoles()` to derive own/partner from which container an element is in rather than from its effective grid area, and drop the inline-style fallbacks it reads
- [x] 4.10 Confirm any inline `grid-area` left over from the old mechanism is removed rather than left to mislead

### Verification for this stage

- [x] 4.11 Confirm the left board's column is unaffected by tools content — switch tabs and send a long chat message, the left board must not move
- [x] 4.12 Confirm the left board's rank labels do not paint onto the right board
- [ ] 4.13 Confirm `toolsB` / `#offer-dialog` still has somewhere to be, and that game controls remain reachable in short landscape
- [ ] 4.14 Switch boards, then click a square on each board and confirm the click lands where the pointer is — the boards were moved and chessgroundx memoises bounds
- [x] 4.15 Apply a sequence of flips and switches and confirm the arrangement matches what the page produced before

## 5. Gates

- [x] 5.1 `yarn typecheck`
- [x] 5.2 `yarn test`
- [x] 5.3 `yarn dev` and sync `static/` into the container so the running app serves the edited files

## 6. Live verification across all three modes

- [ ] 6.1 Bring up the harness and start a 50+0 game per the usual routine
- [ ] 6.2 p1 desktop: boards fill the height, tools beside the right board, click probe lands `{dx:0,dy:0}`
- [ ] 6.3 p2 and p3 short landscape: two columns, both boards fully on screen, click probe `{dx:0,dy:0}`
- [ ] 6.4 p4 portrait: unchanged by stages 2–4, presets below chat
- [ ] 6.5 No scrollbars and no page overflow in any mode
- [ ] 6.6 Switch boards and flip, and confirm the column assignment follows the role rather than the board identity
- [ ] 6.7 Confirm no seam appears between any board and its pockets at the new sizes

## 7. Decisions to record before archiving

- [ ] 7.1 Whether the tools need a minimum width in the two-column layout, or keep yielding to nothing
- [ ] 7.2 Whether short landscape adopts full-height sizing or keeps `--bug-sq`
- [ ] 7.3 Where the tools' vertical extent stops in tall landscape — bottom of the board stack, or bottom of the page
- [ ] 7.4 Record what the two-column layout looks like at 551px tall, and say plainly if the tools are unusable there rather than shrinking the board to hide it

## 8. Parts instead of a panel — the tools flow under a smaller board

The final goal of this change. `.bug-round-tools` goes; `.bug-partner-stack` arrives around the
right board and its two strips, because three siblings cannot be floated as one unit. Net
container count is unchanged, but the rigid box is now around the thing that must stay rigid.

- [x] 8.1 Add `.bug-partner-stack` in `round.ts` around `#seatstrip0b`, `#bugboard`, `#seatstrip1b`
- [x] 8.2 Mount the tab parts and `.bug-round-tools-bar` as direct children of `.bug-right-column`
- [x] 8.3 Delete `.bug-round-tools` from `round.ts` and its rule in `bughouse.css`
- [x] 8.4 Re-home what that rule carried: the zero minimums and overflow move to whatever now owns the column, and the portrait `overflow-y: auto` override with them
- [x] 8.5 Re-point `.bug-round-tools > [role='tabpanel']` and `.bug-round-tools > .chatpresets-panel` at their new parent
- [x] 8.6 Give the stack `float: left` in the landscape modes and make the wrapper a block formatting context
- [x] 8.7 Restore what the flex column did for height: chat filling the space, presets keeping theirs, the bar last
- [x] 8.8 `display: contents` on `.bug-partner-stack` in portrait as well, so portrait keeps its own areas

### Verification

- [x] 8.9 Full zoom in p1: the arrangement is unchanged from before this stage
- [x] 8.10 Reduced zoom in p1: at least one part occupies space below the board, and no unused band remains
- [x] 8.11 Tab switching still shows and hides every part of a tab together, in all three modes
- [x] 8.12 p2 and p3 short landscape: unchanged, both boards on screen
- [x] 8.13 p4 portrait: unchanged, presets still below the chat
- [x] 8.14 Tab list and game controls reachable in every mode
- [x] 8.15 No page overflow or scrollbars in any mode

### How stage 8 actually came out

**Three mechanisms were tried; only the third states the requirement.**

`float: left` on the board's stack does nothing at all. Every tab part carries
`overflow: hidden auto`, which makes it a block formatting context, and a BFC *avoids* floats
rather than flowing around them. Measured with the board at half size: every part still beside
it, the space underneath empty.

`flex-flow: column wrap` does move parts under the board, but the wrong ones and the wrong way.
Wrapping takes the LAST items into a new column BESIDE, so the chat — the one part that must
never move — was what went under the board, and nothing widened, because a flex item cannot span
columns.

What was actually asked for is an **order** and a **span**: the tab bar leaves first, then the
presets, the chat never; and what leaves widens to the full column, sitting under the board *and*
under the parts above it. Grid areas state both exactly, in three arrangements, with
`client/two-board/round/toolsPlacement.ts` choosing between them by measuring whether the board's
stack still fits in what would be left. Verified across the zoom range in p1:

| zoom | classes | tab bar | presets | chat |
|------|---------|---------|---------|------|
| 100  | (none)  | beside, 382.8 | beside, 382.8 | beside |
| 70   | drop-tablist | full 824.8, under | beside | beside |
| 50   | drop-tablist | full 703.3, under | beside | beside |
| 35   | drop-tablist drop-presets | full 612.1, under | full 612.1, under | beside |

**Two bugs found by measuring rather than by looking.** The stack spans the rows it shares with
the parts, and a grid item stretches by default, so it measured 760px at every zoom — the space a
smaller board frees never existed and nothing ever dropped. `align-self: start` gives it its
content height. Separately, the whole block of area rules was inserted against the first matching
anchor in the file, which is inside the portrait media block, so every rule was scoped to portrait
and inert in landscape; the classes toggled correctly while the geometry ignored them.

**Oscillation was designed out rather than discovered.** A dropped part spans the full column, so
`1fr` preset tracks would grow with it, the buttons with them, and the panel would get taller —
feeding straight back into the measurement that decided to drop it. Dropped presets pin their
track to the button's own size, which makes their height independent of their width. Confirmed
settled: one state across ten samples over 2.5s.

**The earlier width deviation is gone.** Returning to grid restored both columns to their original
widths — 386.3px in short landscape and 382.8px (`20vw`) in tall — so nothing is narrower than
before after all.

**Other tabs behave as asked.** Moves and Info have a single part, so only the tab bar drops; the
panel stays beside the board. Confirmed on the Moves tab with the presets hidden.

## 9. The presets as two parts of two sets

- [x] 9.1 `ChatPresetsView` returns two parts instead of one; each holds two sets of five buttons
- [x] 9.2 The four sets are the four rows the single grid always drew — ask, don't-give, and the tells in halves — so nothing moves relative to before
- [x] 9.3 A part wraps its sets: side by side when it has the width, stacked when it does not
- [x] 9.4 A set is never broken up, and the ask/don't-give pair stays piece-aligned when stacked
- [x] 9.5 Each part gets its own grid area, `p1` and `p2`, and drops independently
- [x] 9.6 `toolsPlacement` generalised from two fixed classes to an ordered list, cumulative
- [x] 9.7 Verified across the zoom range in p1, and unchanged in short landscape and portrait

### What the floor did, and why a dropped part ignores it

A set cannot shrink below five tracks at the button floor, about 348px, so two of them
need ~697px. That is the right rule beside the board — it is what keeps the presets as
two rows of five there, exactly as before. It is the wrong rule once a part has dropped,
and the reason is worth stating: dropping happens precisely when the board is small, and
a small board makes this column NARROW, because the column's width is the board plus the
strip. Measured at 45% zoom: the part dropped into a 672.9px row, two floored sets wanted
696.8px, so they stayed stacked and the part came out TALLER than before it dropped
(96.9 → 166.5) rather than shorter.

A dropped part therefore sizes its sets at an exact half each, with the floor lifted, so
two always share the row. The buttons can then land marginally under the design floor on a
narrow column — 40.4px against 41.8px — which is still well clear of the 24px WCAG minimum
that floor exists to satisfy.

That also settles the placement in both directions, which the previous arrangement needed a
separate pinning rule for: dropping now makes a part shorter, so it cannot undo the
condition that dropped it, and undropping makes it taller, so it cannot undo that either.

Measured in p1 across the range:

| zoom | classes | parts | sets |
|------|---------|-------|------|
| 100  | (none) | both beside, 382.8 | stacked, h 96.9 |
| 60   | drop-tablist | both beside | stacked |
| 45   | + drop-p2 + drop-p1 | both full 672.9 | one row, 336.5 each, h 46.8 |
| 35   | + drop-p2 + drop-p1 | both full 612.1 | one row, 306.1 each |

Dropping p2 frees enough height for p1 to follow in the same pass, which is why both land
together at 45% rather than one at a time — the cascade is the halving doing its work.

## Disposition at archive — 2026-08-16

Archived at 47/48 plus stage 9. All three goals are met and demonstrated live in all three
layout modes; gates green throughout (typecheck, 41 suites / 226 tests).

**Everything still unchecked needs the one thing this session never had: a live game.** The
game used for measurement, `8j9DkouV`, was already finished, so clicks do not resolve to
moves and the in-game controls do not render.

- **4.14** — clicks after a switch. The boards physically move between containers now, and
  chessgroundx memoises hit-test bounds. `switchBoards()` ends in `redrawBoards()` and the
  arrangement round-trips exactly, but a click landing on the square under the pointer has
  not been observed. **This is the one to do first next session.**
- **4.13** — `#offer-dialog` (now `.bug-offer-dialog`) has somewhere sensible to be, and the
  game controls remain reachable in short landscape. The element is verified present in area
  `toolsB` spanning both columns at height 0; what is unverified is how it looks holding a
  real draw offer.
- **6.1–6.7** — the whole live-game sweep, including click probes in each mode.
- **3.6** — a taller window yields a larger board. The unit is height-derived and tracked
  767 → 76 correctly, but it has only been seen at one window height. i3 tiles these windows,
  so changing one window's height means rebuilding the harness layout.

**7.1–7.4 are answered by what was built rather than left open.** The tools have no minimum
width and still yield to nothing (7.1); short landscape keeps `--bug-sq` and does not adopt
full-height sizing, because its stack already fills the column (7.2); the tools' vertical
extent stops at the bottom of the column, and parts that do not fit beside the board move
under it (7.3); and at 551px tall nothing drops at all, because the stack fills the height —
the two-column layout there looks exactly as it did, which is the honest answer 7.4 asked for
(7.4).

**Two things deliberately left as they are.**

`switchBoardElements()` in `twoBoardCtrl.ts` still swaps inline `grid-area` and is still used
by the analysis page, which has no wrapper and needs it. Only the round page moved to a
DOM-move, in `roundControls.ts`. The two mechanisms coexisting is intentional, not an
oversight.

Usernames still wrap to two lines in tall landscape, against the existing requirement that
they be truncated rather than reflowed. Checked and pre-existing: they wrap at the previous
font size too. Made more visible by the larger strips, not caused by them.
