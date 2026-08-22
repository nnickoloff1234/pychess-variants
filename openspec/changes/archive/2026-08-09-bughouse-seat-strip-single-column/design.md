## Context

The short-landscape grid gives each board two columns of four squares:

```
pocket-top clock-top . pocket-top-partner clockB-top tools
board      board     . boardPartner       boardPartner tools   (×4 rows)
pocket-bot clock-bot . pocket-bot-partner clockB-bot tools
```

The split has no layout purpose of its own — a board spans both halves. It exists so that two elements which are siblings in the DOM, `div.pocket-top` and `div.info-wrap0`, can each be addressed by a grid area. Its cost is that the pocket is pinned to four squares whatever the variant, and the seat's clock and username are pinned to the other four.

The same split runs through the other round-page modes:

- **`min-height: 600px` landscape** — `'pocket-top clock-top tools clockB-top pocket-top-partner toolsB'`. Two columns per board again, with board B mirrored so the pockets sit outboard and the clocks flank the central tools column.
- **Portrait** — board A is `'pocket-top clock-top'` over `'board board'` over `'pocket-bot clock-bot'`, the same pattern. Board B is rotated, occupying one column across five rows, so its furniture is separated across *rows* rather than columns: pocket, clock, gap, clock, pocket.
- **Analysis** is not an instance of the pattern and is out of scope. Both boards' pockets sit together in a middle column detached from their boards, and clocks are `.anal-clock` overlays positioned absolutely, with no grid area at all.

So the split is not a quirk of one mode; it is how a seat's furniture is expressed everywhere on this page, which is why unifying it is worth doing in one pass rather than three.

Facts established by reading the tree and chessgroundx 10.7.5, all of which constrain the redesign:

- **The pocket already knows its own size.** `pocketView()` (`chessgroundx/pocket.js:25`) writes `--pocketLength` inline on the pocket element from `state.pocketRoles[color]`. What is *not* published is any ancestor-level value, so the `var(--pocketLength)` occurrences in `.round-app.bug`'s own rules resolve to the hardcoded `--pocketLength: 5` in `extensions.css:12`. The pocket is variant-correct; the grid around it is not.
- **Pocket contents follow a flip in place.** `toggleOrientation()` calls `redrawAll()` (`chessgroundx/api.js:10`), which calls `renderPocketsInitial()`, and `pocketView()` recomputes the colour as `position === 'top' ? opposite(orientation) : orientation`. The top pocket element always holds the top player's pocket. Anything that *moves* pocket elements on flip therefore swaps twice and lands wrong.
- **Flip and switch currently work on different objects.** `flipBoards()` swaps the four `.info-wrap*` elements between the literal area names `clock-top` / `clock-bot` / `clockB-top` / `clockB-bot` via inline `style.gridArea` (`roundControls.ts:127-139`) and leaves pockets alone. `switchBoards()` swaps board areas, **DOM-swaps the pocket elements** `#pocket00↔#pocket10` and `#pocket01↔#pocket11` (`twoBoardCtrl.ts:162-163`), and then swaps the seats' areas. Two mechanisms, two object kinds, split across two files.
- **`switchBoards()` is shared with the analysis page.** It lives on `TwoBoardController`; the round controller overrides and calls `super`.

## Goals / Non-Goals

**Goals:**

- One grid column of 8 square units per board in short landscape.
- The pocket sized by its own contents, so a variant with a different number of droppable roles simply takes more or less room.
- Clock anchored bottom-trailing and sized from the strip height; username legible, taking the leftover width, wrapping to a second line.
- One structural idea for a seat's furniture — a strip — used by every layout mode, so flip and switch have exactly one thing to move.

**Non-Goals:**

- Changing the rendered board size, or the square unit and 10-row budget settled by the previous change.
- Changing which seat sits where. Flip and switch must produce the same arrangement they produce today; only the mechanism changes.
- Restructuring the analysis page's layout. It keeps the existing pocket-swapping path.
- Choosing the final clock and username sizes — those are tuned interactively.

## Decisions

### 1. A seat strip is a real element, and it is the grid item in every mode

Each of the four seats gets a wrapper holding its pocket and its seat block (clock, player bar, presence, misc-info). The wrapper is the grid item; the layouts place strips rather than placing a pocket and a clock separately.

*Alternative considered — pocket and seat share one grid area, the seat offset by `margin-inline-start: calc(var(--pocketLength) * var(--bug-pocket-sq))`.* This needs no markup change and no change to flip or switch, which is why it was the first choice. It was rejected on reflection: the offset restates in arithmetic what layout should be doing, and it only works if an ancestor-level `--pocketLength` agrees with the value chessgroundx put on the pocket element — a value that is per-colour in principle, so the two can legitimately disagree. Flex needs neither the property nor the agreement.

*Alternative considered — `display: contents` on the wrapper outside short landscape, so other modes keep placing the children directly.* Rejected: with `display: contents` a child's area still comes from its own class, so the swap target would be the child in some modes and the wrapper in others. Mode-dependent DOM manipulation is exactly the coupling this change exists to remove.

The strip is composed where the seat's markup is composed: `RoundSeatView` gains a `view(pocket)` that returns the strip, following the convention that a multi-element widget exposes one composed view rather than a placeholder per leaf.

### 1b. The strip's internal order is the same in every mode

A strip lays out pocket, then name, then clock, everywhere. One rule set describes a seat; a mode chooses only where the strip goes and how wide it is.

This drops the mirroring that the `min-height: 600px` mode applies to board B, where the clock currently sits inboard and the pocket outboard so that pockets are on the page's outer edges. Restoring it would be one `flex-direction: row-reverse` on B's strips — the same trick `.clock-wrap.bug` already uses — so this is a preference that can be reversed in a line, not a structural commitment. It is unified by default because "unified how these things look" is the stated goal, and a mirror is the kind of asymmetry that makes every later rule need a B variant.

Portrait's board B is the one place the order cannot be literally the same: that board is rotated and its strip runs alongside it vertically, so the strip stacks its children in the same sequence rather than laying them in a row. Same order, different axis.

### 2. Flip moves seats between strips; switch moves strips between columns

With strips in place, the two operations separate cleanly along the grain of what actually has to move:

- **Flip** exchanges the two seat blocks of one board — a DOM move between that board's top and bottom strips. The pockets stay where they are, which is required, because `redrawAll()` has already re-rendered their contents for the new orientation.
- **Switch** exchanges board A's strips with board B's — a swap of the strips' grid areas. Because a strip contains its pocket, this subsumes the `swap(#pocket00, #pocket10)` DOM juggling that `switchBoards()` does today.

Inline `style.gridArea` on `.info-wrap*` disappears entirely, and with it the constraint documented in `RoundSeatView` that the block must never be re-patched lest those inline values be wiped. Seat blocks become ordinary re-renderable vnodes again.

*Alternative considered — keep both operations on grid areas by swapping strip areas for flip too.* Rejected: that moves the pocket, producing the double swap described in Context.

### 3. The round page stops sharing `switchBoards()` wholesale

`TwoBoardController.switchBoards()` currently does board-level work *and* pocket DOM work. The pocket half is only correct for a page whose pockets are placed independently, which after this change is the analysis page alone. It is therefore split: the board-level swap stays shared, and each page supplies its own surrounding-furniture step — strips for the round page, the existing pocket swap for analysis.

This is the part of the change that touches working orientation code, so it is verified behaviourally rather than by reasoning: flip and switch, in both orientations and both switch states, must produce the same arrangement as before.

### 4. The pocket is sized from the value chessgroundx already publishes

The pocket's width comes from its own inline `--pocketLength` times a cell-width parameter `--bug-pocket-sq`, read on the element that carries the correct count. Nothing needs publishing on an ancestor, and `setPocketRowCssVars()` stays untouched — generalising it would serve nothing here.

`--bug-pocket-sq` defaults to `calc(var(--bug-sq) * 0.8)`, which is exactly today's cell: five cells at 0.8 squares is the four-square pocket now rendered, so bughouse is pixel-identical and compaction becomes a one-value edit. The cell stays anisotropic — 0.8 wide, 1 tall — as it already is; making cells square costs the username a square of width and is left to the tuning pass.

Care is needed with the selector: `.pocket-top .twoboards .pocket` matches both the `div.cg-wrap.pocket` wrapper and the inner element chessgroundx adds `.pocket` to, and only the inner one carries the real count. The width rule targets the inner element; the wrapper shrink-wraps it.

### 5. Sizes are expressed in terms of the square unit, never in `vw`

The clock's `5pt` and the username's `0.7vw` become fractions of `--bug-sq`. `vw` is what makes the name unreadable: this page is routinely used in a quarter-tiled window, where `0.7vw` is under 7px. The square unit is the strip's own height, so both scale with the layout rather than with an unrelated axis.

The username carries a floor, `max(<fraction of --bug-sq>, <coordinate-label size>)`. Coordinate labels are `0.85em` of the board wrap's font size (`chessground.css:413`); the floor is taken from that measured value at the target resolution rather than re-derived symbolically.

### 5b. Settings measured in the harness

Tried live on the round page at 1276×551, dpr 1.5, where `--bug-sq` is 54.67px and a board column is 437.33px:

| knob | value | result |
| --- | --- | --- |
| pocket cell | `0.8 × --bug-sq` | pocket 218.7px — the current four-square width, five pieces |
| clock font | `0.2 × --bug-sq` | 105px showing `52:19`, 131.7px once tenths appear |
| name font | `0.218 × --bug-sq` | 11.92px, which is exactly the coordinate-label floor |

Three things the numbers settled that reasoning had not:

- **A clock is about 3.9× its font size tall.** A first guess of `0.5 × --bug-sq` produced a 108px clock in a 54.7px strip; it overflowed upward and squeezed the name to a 9.9px-wide column of vertical text. The ratio is what bounds "as large as fits".
- **The three demands do not all fit.** Pocket, clock and name share 437.33px. At a pocket cell of `1.0` — square cells — the name is left 37px, and even shrinking the clock only returns it to 63px. `0.8` is the practical ceiling if names are to stay readable, so square pocket cells are off the table unless something leaves the strip.
- **The clock's width is not constant, and the name gets the difference.** At the tuned size a clock is 105px showing `52:19` and 131.7px showing `00:00.0`. Reserving the wide form was tried and reverted: it held 21.8px of a 218.7px strip empty for almost the entire game, and the gap was plainly visible between the name and the digits. The name takes the real remaining width — 113.6px rather than 91.8px, enough to carry two or three more characters — and re-wraps when a clock enters tenths. The reflow is accepted because the name is already truncated and a clock in its last seconds is what the player is watching.

Truncation is `max-height` of two line-heights plus `overflow: hidden`, not `-webkit-line-clamp`, because the clamp always renders an ellipsis. `word-break: break-all` supplies the fill-the-line behaviour; the default rules break after the dash in `Test–JanggiElephantK` and waste the first line.

One alignment trap, hit and fixed live: `.clock-wrap` is `flex-direction: row-reverse` in this mode, so `justify-content: flex-end` packs the clock **leftward**. Anchoring it to the visual trailing edge means `flex-start` here. The symptom was a 21.8px gap on the right of every clock that was not showing tenths.

The strip's contents are bottom-aligned, which also solves a collision that predates this change: a board's file labels overhang 16px below it (board bottom 492, labels to 508) into the strip underneath. Bottom-aligning puts the name at 510 and clear of them.

## Risks / Trade-offs

- **Flip or switch regresses.** This is the main risk of the change, and it is not mitigated by review — the current code's correctness is partly incidental (two mechanisms that happen to compose). → Every combination of flip and switch is exercised live against the four-window harness before the change is considered done, with the pre-change arrangement recorded first as the reference.
- **All three layouts are re-expressed, and two of them have no cheap verification.** The `min-height: 600px` mode is checkable by resizing a harness window; portrait has no live path today. → Portrait's rules are changed together with the portrait verification the previous change left open, rather than on their own; if that verification is still not available, portrait is the part that ships unverified and is called out as such.
- **Dropping board B's mirror is a visible change, not just a structural one.** Pockets that sat on the page's outer edges move inboard in the `min-height: 600px` mode. → Reversible with one `flex-direction` declaration; flagged for a look during the tuning pass rather than assumed acceptable.
- **`grid-template-areas` is unforgiving of token-count drift**, and the existing `min-height: 600px` block already contains a typo — `tootsB` for `toolsB` on its third row — which currently survives because the misspelling forms its own single-cell area. Rewriting these blocks will change what that typo does. → Fix it as part of the rewrite and confirm the tools column still spans what it should.
- **`swap()` in `twoBoardCtrl.ts` may end up with a single caller, or none.** → If the analysis page is its only remaining user it stays there; if nothing uses it, it goes, rather than being left as an unused helper.
- **A pocket wide enough to leave the name no room** — a variant with many droppable roles → the name wraps and then clips. The cell-width parameter exists precisely so such a variant can compact.
- **Two-line names must fit a strip fixed at one square tall** → a constraint on the chosen font fraction, settled during tuning.

## Migration Plan

The change is inert until the layouts reference strips, so it can land in the order: strips composed in the markup → flip and switch moved onto them → layouts re-expressed, short-landscape first → sizing. Rollback is per-step; nothing is persisted and no server surface is involved.

## Open Questions

- Whether the truncation settled on is acceptable against *real* usernames. It was judged against harness names of up to 20 characters (`Test–JanggiElephantK`), which are longer than most pychess names, so the live screenshots overstate how often a name will be cut.
- Whether the online indicator sits inline with the name or is pinned, now that the name may wrap and be clipped.
- Whether the tuned values hold at other viewport sizes, since they were fixed at one resolution where `--bug-sq` is 54.67px.

Settled by the measurements in decision 5b: the clock and username fractions, and the question of square pocket cells — which the geometry rules out.
