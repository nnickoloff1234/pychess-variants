## Context

`static/bughouse.css` defines `.round-app.bug` **only** inside media queries — there is no unconditional base rule. Three blocks cover it:

| Mode | Condition | Columns | Boards sized by |
|---|---|---|---|
| P | `(max-width:799px) and (orientation:portrait)` | `pocketW`, `100vw − pocketW` | `--cg-width-a` |
| **L-short** | `(max-height:600px) and (orientation:landscape)` | `40vh 40vh 40vh 40vh auto` | viewport height only |
| L-tall | `(min-height:600px) and (orientation:landscape)` | six `calc()` tracks | `30vw × zoom` |

In L-short the board spans 2 columns × 4 rows = `2×40vh` by `4×20vh` = an **80vh square**, with a 10vh pocket row above and below. The vertical budget is exactly 100vh, which is why this mode also hides the site header. The `40vh` is derived, not chosen: it is half the board, split into two columns so the pocket and clock can sit side by side above and below it.

Measured on a 1276×551 viewport at `devicePixelRatio` 1.5:

- `cg-wrap` 441.06px; `cg-board` 437.33px. chessgroundx snaps the board to a whole number of device pixels per file — `floor(441.06 × 1.5 / 8) = 82` device px per file → `82 × 8 / 1.5 = 437.33`. The unused **3.73px** sits inside the wrap, on its left and bottom edges, and is what reads as stray borders between the boards and under them. Every element involved has `border: 0`; the grid gaps are `0`.
- A pocket row is `10vh` = 55.13px while a board square is 54.67px, so pockets are 0.46px per square out of step with the board.
- The trailing `auto` track holds the chat. Its width is the chat's max-content: 200.7px with no messages, 321.9px once the system message *"Messages visible to all 4 players for the first 4 moves"* is inserted. `.round-app` therefore widens 1083 → 1204px, and `#main-wrap` centres it (`justify-content: center`, 1268px), so both boards slide 60.6px left — after chessgroundx has memoized `bounds` from `cg-board.getBoundingClientRect()`. For bughouse its `ResizeObserver` watches `document.body` (`dimensionsCssVarsSuffix` is set), and `body` never changes size, so nothing clears the memo. 60.6 / 54.67 = **1.109 squares**.
- Appending one long chat message moved board A a further 32px and removing it moved it back, so this recurs during play rather than settling once.

## Goals / Non-Goals

**Goals:**
- A click resolves to the square under the pointer, at this viewport, permanently.
- The board's grid slot equals the board that is rendered, so the stray lines disappear and pocket squares equal board squares.
- No grid track is sized by content that can change after first paint.
- Every orientation/size combination resolves to a bughouse layout.

**Non-Goals:**
- Changing the rendered board size — it is 437.33px before and after.
- Redesigning the chat's internals. The presets grid and the input already stretch to their container; nothing inside the column needs restructuring.
- Fixing the same class of bug in modes P and L-tall, or upstream in chessgroundx.
- Removing the `600px` breakpoint overlap, where `max-height:600px` and `min-height:600px` both match at exactly 600px. Noted, parked.

## Decisions

### 1. Derive the grid from a quantised square, computed in our own code

Compute the square unit as the largest value for which 10 square rows fit the available height:

```
sq_device = floor(availableHeight × dpr / 10)
sq        = sq_device / dpr
```

then express the tracks as multiples of it — board columns `4 × sq`, board rows `2 × sq`, pocket rows `1 × sq` — referencing the property with **no fallback value**, so a missing unit fails loudly instead of quietly reverting to today's geometry. On the measured viewport: `floor(551.29 × 1.5 / 10) = 82` device px → `sq = 54.667`, board `8 × sq = 437.33` — **identical to what chessgroundx renders today** — and the pocket becomes 54.667 instead of 55.13. Ten rows total 546.67 of the 551.29 available, leaving 4.63px once, at the bottom, outside the board block.

*Alternative considered:* consume chessgroundx's published `--cg-width-a` / `--cg-height-a` and define the tracks from those, which avoids duplicating anything. Tested live and it works — the slack goes to zero on the first pass and stays there, because the quantiser is idempotent at this device pixel ratio. Rejected for now because it makes the grid depend on a value JS publishes after first paint, which is the same shape as the bug being fixed, and because the idempotence it relies on is not universal: a sweep of 908k width/dpr combinations found it fails for **dpr 1.75** (2.66% of widths), where a second pass shrinks the board by one square-unit before reaching a fixed point.

*Alternative considered:* instantiate a throwaway 10×10 chessground to ask the library for the number. Rejected — it needs a full state object and DOM, and couples us to construction internals rather than to a formula.

### 2. Duplicate the quantisation rule, and say so

chessgroundx performs the snap inside `updateBounds()` and exports no pure function for it:

```ts
const width =
  (Math.floor((bounds.width * window.devicePixelRatio) / s.dimensions.width) * s.dimensions.width) /
  window.devicePixelRatio;
```

We copy that expression. The copy carries a comment naming the version it was taken from (chessgroundx 10.7.5) and stating that it should be deleted once upstream exposes the rule, so a later reader can tell whether upstream has diverged. This is a conscious, documented duplication rather than an accident.

*Why the floor exists at all:* the checkerboard is a single `8x8brown.svg` painted with `background-size: cover`, and pieces are separate images positioned at `index × squareSize`. With a whole number of device pixels per file every square boundary lands on a device pixel and rasterises identically; with a fractional square each boundary sits at a different subpixel phase, so squares look a pixel wider or narrower than their neighbours and identical pieces rasterise differently. The remainder is therefore intrinsic and correct — the defect is only that it currently accumulates *inside* the wrap.

### 3. The chat column takes the remaining width — which needs two edits, not one

Change the tools track from `auto` to `1fr`. That alone does nothing: `1fr` distributes free space, and free space requires a definite width, but `#main-wrap`'s own track is content-sized (`--main-max-width: auto` in `round.css`). Verified — `1fr` on the chat column left the layout at 1204px and the chat at 321.9px, and so did adding `width: 100%` to `.round-app`.

Making `#main-wrap`'s track fill as well gives the intended result:

| | app width | chat | board x | board size |
|---|---|---|---|---|
| today (`auto`) | 1204 | 321.9 | 35.7 | 437.33 |
| wrapper fills + chat `1fr` | 1268 | 385.9 | 3.7 | 437.33 |

The boards move once, to a position that is then fixed, and the chat gets the leftover. Message text wraps instead of widening the track.

*Note:* `auto` was intended to mean "the rest". It means "sized by content". `1fr` is the construct that means the rest.

### 4. Publish the unit before the board is constructed — and then nothing moves it

chessgroundx already covers two of the three ways geometry can change:

| Trigger | Covered by chessgroundx? |
|---|---|
| Init | Yes — `updateBounds(state)` runs once during `Chessground()` construction |
| Viewport resize | Yes — `body` changes size, the `ResizeObserver` fires `onResize` = `updateBounds` + `renderResized`; `window.resize` separately calls `bounds.clear()` |
| The board moves while `body` is unchanged | **No** — nothing observes a translation |

The third row is the entire bug, and decision 3 removes its only instance: the chat column was the only thing that moved the boards without resizing `body`.

So the design does not add a bounds recomputation. It adds an **ordering guarantee** instead:

- `--bug-sq` is published **before the board is constructed**, so the wrap already has its final size when chessgroundx measures it at init.
- `--bug-sq` is recomputed on **viewport resize**. The input is the viewport height and `devicePixelRatio`, so `window.resize` is the right hook — it also fires on browser zoom, which changes `devicePixelRatio`.

The resize ordering resolves itself without coordination. The `resize` event handler runs before style and layout are recomputed, so the grid is already final when layout happens; `ResizeObserver` callbacks are delivered after layout, so `onResize` measures the settled geometry. `window.resize` also clears the memo directly.

There is deliberately **no fallback recomputation**. A guarded "just in case" call would encode the assumption that something might still move the board, which is exactly the assumption this change exists to eliminate — and it would hide a regression rather than expose it. If a future layout change moves the boards after init, the correct response is to fix that layout change, not to re-snap after the fact.

A second property makes this safe: the grid tracks derive from `--bug-sq`, **not** from `--cg-width-a`. So when `updateBounds` publishes `--cg-width-a` / `--cg-height-a` at init, no CSS consumes them, nothing relayouts, and there is no feedback path at all. (This is a concrete advantage over the alternative rejected in decision 1, where the tracks *do* consume the published values and therefore do form a loop.)

*Upstream note, not fixed here:* `updateBounds` measures `elements.wrap` while the memo it clears is over `elements.board`, and it clears the memo **before** publishing the custom properties. A `bounds` read triggered synchronously by the resulting relayout would re-memoize against the pre-relayout position.

### 5. Close the portrait gap by widening the existing condition

The two branches are constrained on different axes: landscape is partitioned by height (`max-height:600` ∪ `min-height:600` covers every height, with no width limit), while portrait has a single rule gated at `max-width: 799px` and nothing above it. So portrait at ≥800px matches no rule, and `.round-app.bug` inherits `round.css`'s single-board `@media (min-width: 800px)` layout, whose areas contain no `boardPartner`, `pocket-*-partner`, `clockB-*` or `toolsB` — those children auto-place into implicit tracks, which is a broken page rather than an ugly one.

Drop the `max-width: 799px` clause so the portrait branch covers all portrait, mirroring how the landscape branch covers all landscape. The condition appears on **four** blocks in `bughouse.css` (the grid, the pockets, the partner pockets, the clocks/`under-left`); all four must change together, or the gap becomes a partially-styled page instead of an unstyled one.

*Alternative considered:* add a dedicated `(min-width:800px) and (orientation:portrait)` mode with a tablet-specific grid. Better eventual result, more design work, and it leaves the existing rule still not covering what its name implies. Deferred.

## Risks / Trade-offs

- **[The duplicated formula can drift from upstream]** → It is one expression, commented with the version it matches. If chessgroundx changes its quantisation, boards would be sized by the old rule and the slack would return — visible immediately as the stray lines reappearing, which is a loud failure rather than a silent one. Mitigated by asking upstream to export it.
- **[Scrollbar-induced resize cycles]** → Any viewport-relative sizing can produce an extra resize pass when a scrollbar appears or disappears. With no recomputation loop of our own there is nothing here to oscillate; the browser settles it as it does for any `vh`-based layout.
- **[dpr 1.75 loses one square-unit]** → Not applicable to the chosen approach, which computes from the height budget directly; recorded because it ruled out the alternative in decision 1.
- **[The ordering guarantee is load-bearing]** → `--bug-sq` must exist before the board is constructed. This is deliberately **not** softened with a CSS fallback: the tracks use `var(--bug-sq)` with no fallback value, so if the property is missing the `var()` is invalid at computed-value time, `grid-template-columns` is dropped entirely and the grid collapses to `none`. Getting the ordering wrong is therefore an obvious failure at first paint rather than a subtle geometry drift — the same reasoning that rules out a fallback bounds recomputation applies here. It still deserves an explicit comment at the init site.
- **[Widening the portrait condition gives large portrait windows the stacked phone layout]** → A tall desktop window ≥800px wide would get the phone-style layout rather than something designed for it. Better than the current broken fallback, and it can be refined later by adding the dedicated mode.
- **[Only the width axis is quantised upstream]** → `updateBounds` computes `height = width × ratio` rather than snapping height independently. Harmless for a square 8×8 board; it would matter if this pattern were extended to non-square variants.
