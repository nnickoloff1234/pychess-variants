## Why

On the bughouse round page in **short landscape** — `(max-height: 600px) and (orientation: landscape)` — clicks land on the wrong square. Verified against the server log: aiming `e2e4` played `d2d4`; aiming `e7e5` played `f7f5`. It is reproducible with a real mouse, which makes the board unplayable at that viewport, and it is not a rendering-only annoyance: the pieces are drawn correctly and the hit-testing is wrong.

The cause is that the layout **moves the boards after chessgroundx has measured them**. That mode's grid ends in an `auto` track holding the chat, so the track is sized by content that arrives late. With no messages the column is 200.7px (the chat input's width); the first system message — *"Messages visible to all 4 players for the first 4 moves"* — measures 321.9px unwrapped, so the column jumps to 322px, `.round-app` widens 1083→1204px, and because it is centred in a 1268px wrapper both boards slide **60.6px left**. chessgroundx memoizes hit-test bounds from `cg-board.getBoundingClientRect()` and, for bughouse, observes `document.body` for resizes (`events.ts bindBoard`, because `dimensionsCssVarsSuffix` is set). `body` never changes size, so nothing invalidates the memo and every later click is tested against the pre-shift edge. 60.6 / 54.67px per square = **1.109 squares**, so clicks are off by one file over ~89% of each square and by two files in the leftmost ~6px band.

This is a **live** bug, not a load-time settle: appending one long chat message moved board A another 32px mid-game and moved it back on removal. Any player sending a long message shifts both boards under everyone's cursor.

Separately and visibly, the same mode renders stray lines between the two boards and under each board. Those are not borders — every element involved has `border: 0`. They are the 3.73px chessgroundx cannot use after snapping the board to a whole number of device pixels per file, left inside the wrap on its left and bottom edges. The same slack makes pocket squares 55.13px tall while board squares are 54.67px, so the pockets do not line up with the board they belong to.

## What Changes

- **Size the short-landscape grid from a quantised square instead of raw `vh`.** Compute the largest square size that lets **10 square-sized rows** (1 pocket + 8 board + 1 pocket) fit the available height, using the same `floor(width × dpr / files) × files / dpr` rule chessgroundx applies, and drive the grid's rows and columns from it. The board slot then equals the rendered board, the stray lines disappear, and pocket squares equal board squares exactly.
- **Duplicate that quantisation rule in our own code, deliberately and temporarily.** chessgroundx performs it inside `updateBounds()` and does not expose it as a pure function. Duplicating it is accepted for now, with the intent of asking upstream to export it and then deleting our copy.
- **Give the chat column the remaining width instead of `auto`.** The tools track becomes `1fr`, so late-arriving chat content can no longer widen the grid. This also requires `#main-wrap`'s own track to fill, because it is currently content-sized (`--main-max-width: auto` in `round.css`) — verified: `1fr` on the chat alone changes nothing.
- **Close the responsive-coverage gap** where no rule matches `(orientation: portrait)` above 799px wide, so `.round-app.bug` currently falls through to the single-board layout from `round.css`, whose grid areas have no `boardPartner`, `pocket-*-partner`, `clockB-*` or `toolsB`.
- No change to the board's rendered size: it is 437.33px today and 437.33px after. This is a geometry-alignment fix, not a visual redesign.

## Capabilities

### New Capabilities
- `bughouse-round-layout`: how the bughouse round page sizes its boards, pockets and side column across the responsive modes — the quantised square unit, which tracks may depend on content, and the coverage each mode must provide.

### Modified Capabilities
(none — no existing spec covers the round page's CSS layout)

## Impact

- `static/bughouse.css` — the `(max-height:600px) and (orientation:landscape)` block's `grid-template-columns` / `grid-template-rows`; the four `(max-width:799px) and (orientation:portrait)` blocks' conditions.
- `static/round.css` — `#main-wrap`'s track must fill in this mode for `1fr` to have space to distribute.
- Client TypeScript — a small helper computing the quantised square from the available height and publishing it as a CSS custom property, plus one `updateBounds()` after the layout settles so the memoized bounds match the final position. `client/boardSettings.ts` already imports `updateBounds`/`renderResized` and carries the same workaround for the zoom path.
- No server change, no API change, no dependency change. chessgroundx stays at 10.7.5.
- Risk concentrated in one media-query block; the other two modes (`portrait`, `min-height:600px landscape`) keep their current definitions apart from the portrait gating fix.
