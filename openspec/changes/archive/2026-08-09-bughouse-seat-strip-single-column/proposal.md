## Why

In the short-landscape bughouse layout each board spans two grid columns of four squares. That split exists only to park the pocket in one half and the clock/username block in the other, and it pins the pocket to half a board. The pocket is not half a board — it is however many droppable roles the variant has, and for bughouse today five roles are squeezed into a four-square slot, so pocket cells are 0.8 squares wide but a full square tall. A variant with more or fewer droppable pieces has no way to ask for a different width.

The same split starves the two things sharing the other half: the username is rendered at `0.7vw`, which in a quarter-tiled browser window is under 7px and unreadable, and the clock sits at `5pt` when the strip is a full square tall and could carry far more.

Underneath the layout problem is a structural one. A seat's furniture — its pocket, clock, name and presence — is four sibling elements that no element groups, so every layout places them individually and the two operations that rearrange seats have to move them individually too. `flipBoards()` moves seats by writing inline `style.gridArea`; `switchBoards()` moves pockets by swapping DOM nodes and seats by writing grid areas. Two mechanisms over two kinds of object, split across two files, and correct today partly by luck: flip must *not* move pockets, because chessgroundx has already re-rendered their contents for the new orientation. Introducing the missing element is what lets the layout be stated once and the rearrangement be stated once.

## What Changes

- Group each seat's pocket and its clock/name block into a **seat strip** element, and make the strip the grid item in every layout mode.
- Remove the two-columns-per-board split from **every** round-page mode, not just short landscape. The same split is in the `min-height: 600px` landscape mode, and in portrait for board A; portrait's board B separates the same furniture across rows instead of columns because that board is rotated. Each board gets one column, and its strips are one grid area each.
- Give the strip the same internal order in every mode — pocket, then name, then clock — so that one set of rules describes how a seat looks everywhere. This drops the mirroring the `min-height: 600px` mode applies to board B today, where the clock sits inboard and the pocket outboard.
- Move flip onto strips: it exchanges the two seat blocks of a board between that board's strips, leaving the pockets in place — which is what correctness already requires.
- Move switch onto strips: it exchanges board A's strips with board B's, subsuming the pocket-node swapping it does today.
- Retire inline `style.gridArea` on the seat blocks, and with it the rule that a seat block may never be re-patched.
- Split `TwoBoardController.switchBoards()` so the board-level swap stays shared while each page supplies its own surrounding-furniture step; the analysis page keeps its current behaviour.
- Size the pocket from the role count chessgroundx already publishes on the pocket element, times a tunable cell width that defaults to the current appearance.
- Lay the strip out as: pocket flush left at its natural width, username taking all remaining width, clock anchored to the trailing and bottom edges.
- Size the clock from the strip's height instead of a fixed point size, and let it size to its content, so the width it is not using goes to the username rather than standing empty.
- Floor the username's font at the board's coordinate-label size, limit it to two lines, break it wherever the line runs out rather than at word boundaries, and clip it after the last character that fits with no ellipsis.
- Let the board's file labels overhang and paint above the strip's pocket and clock, while staying transparent to pointer events so a drag begun on a letter still grabs the pocket piece beneath it.
- Enlarge the clock difference indicator by half, accepting that it covers the clock's leading digit — the difference matters more at the moment it appears.

## Capabilities

### New Capabilities

- `bughouse-seat-strip`: what a seat strip is, what it contains, and how flip and switch rearrange seats in terms of it. This is behaviour that outlives any one layout mode, so it does not belong in the layout capability.

### Modified Capabilities

- `bughouse-round-layout`: the requirement that fixes a board's grid slot now describes one column per board rather than two, and gains requirements for how a strip apportions its width and how the pocket, clock and username are sized within it.

## Impact

- `client/two-board/round/roundSeatView.ts` — composes the strip; loses the constraint that its block must never be re-patched.
- `client/two-board/round/round.ts` — passes each pocket to the seat view that owns its strip.
- `client/two-board/round/roundControls.ts` — `swapClockGridAreasForFlip()` / `swapClockGridAreasForSwitch()` are replaced by strip-level equivalents.
- `client/two-board/twoBoardCtrl.ts` — `switchBoards()` splits; `swap()` may lose its last round-page caller.
- `static/bughouse.css` — all three round-page modes place strips: their column tracks, template areas, pocket sizing, clock and player-bar typography.
- The two-board **analysis** layout has no equivalent split — both boards' pockets sit together in a middle column detached from their boards, and clocks are absolutely-positioned overlays with no grid area — so there is nothing to unify there. It is expected to be behaviourally unchanged and is checked, not modified.
- No server, API or persistence surface is touched.
