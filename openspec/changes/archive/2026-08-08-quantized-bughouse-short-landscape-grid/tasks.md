## 1. Baseline measurements to fix the target

- [x] 1.1 With the four-window harness up (see the harness script), record on a short-landscape window: `cg-wrap` vs `cg-board` rect for both boards, the gap between the boards, the gap between board and bottom pocket, pocket-row height vs board-square height, `.round-app` width, and board A's x. These are the before/after numbers every later task is checked against
- [x] 1.2 Record the same set immediately after page load and again after the first chat message arrives, to capture the shift the fix must remove

## 2. The quantised square unit

- [x] 2.1 Add a helper that computes the square unit from an available height: `sqDevice = floor(height * devicePixelRatio / rows)`, `sq = sqDevice / devicePixelRatio`, with `rows` = 10 for this layout (1 pocket + 8 board + 1 pocket). Keep it a pure function of (height, rows, dpr) so it is testable without a DOM
- [x] 2.2 Comment it as a **deliberate duplication** of chessgroundx's rule in `updateBounds()`, naming the version it matches (10.7.5) and stating it should be deleted once upstream exposes the formula. Note that the upstream expression uses `s.dimensions.width`, which is the **file count**, not a pixel width
- [x] 2.3 Publish the result as a CSS custom property on the round page (e.g. `--bug-sq`), set before first paint so the initial layout is already correct, and recomputed on viewport resize
- [x] 2.4 Verify on the harness viewport that the computed unit is 54.667px (82 device px) and `8 × sq` = 437.33 — the same board width chessgroundx renders today, confirming this aligns geometry rather than resizing the board

## 3. Rebuild the short-landscape grid from the unit

- [x] 3.1 In `static/bughouse.css`, in the `(max-height:600px) and (orientation:landscape)` block, replace the `40vh` columns with `calc(var(--bug-sq) * 4)` per board column, and the `10vh / 20vh` rows with `calc(var(--bug-sq))` for pocket rows and `calc(var(--bug-sq) * 2)` for the four board rows
- [x] 3.2 Use `var(--bug-sq)` with **no fallback**, deliberately. If the property is ever missing, the `var()` is invalid at computed-value time, the whole `grid-template-columns` declaration is dropped and the grid falls back to `none` — an immediate, unmistakable failure rather than a silent geometry drift. This is what enforces the ordering guarantee in task 6.1
- [x] 3.3 Confirm the pocket rules that currently hard-code `40vh` widths in this block still line up with the new track widths
- [x] 3.4 Verify: wrap width equals `cg-board` width, gap between boards is 0, gap between board and bottom pocket is 0, and pocket-row height equals board-square height

## 4. The tools column takes the remaining width

- [x] 4.1 Change the trailing `auto` track to `1fr` in the same block
- [x] 4.2 Make `#main-wrap`'s track fill in this mode — `1fr` alone is a no-op while the wrapper is content-sized (`--main-max-width: auto` in `round.css`), confirmed by measurement
- [x] 4.3 Verify the chat takes the leftover width (≈386px at the harness viewport, up from 322px) and that `.round-app` spans the full 1268px
- [x] 4.4 Verify the boards no longer move: append a long chat message at runtime and confirm board A's x is unchanged, then remove it and confirm it is still unchanged
- [x] 4.5 Check the chat's own contents at the new width — the presets grid and the input already stretch, but confirm nothing overflows, and add wrapping for long unbroken tokens if a message can overflow the column

## 5. Stop the page scrolling (scoped to this page)

- [x] 5.1 Add `height: 100vh; overflow: hidden` scoped to `body[data-variant='bughouse'][data-view='round']` inside the short-landscape block. Both attributes exist and the selector matches exactly one element; `html` keeps `overflow: visible`, so the viewport takes its overflow from `body` — no root-level rule and no `:has()` needed
- [x] 5.2 Confirm the page-level scrollbar is gone and `document.documentElement.clientWidth` becomes the full `innerWidth` (1268 -> 1276 at the harness viewport). Note the boards shift ~4px once as a result — deterministic, at first paint, before any board is constructed
- [x] 5.3 Confirm no other view changed: the bughouse **analysis** page and a non-bughouse round must still scroll as before
- [x] 5.4 Confirm `#reconnecting` still appears — it is `position: fixed`, so clipping the document flow does not affect it
- [ ] 5.5 **Open decision, resolve before implementing:** content below the fold is clipped by this rule — currently the movelist (`.bug-round-tools-part`) and the game-info sidebar (`aside.sidebar-first`). No game controls are affected. Decide whether to accept the loss, give that region its own internal scroll container, or relocate the movelist into the widened chat column

## 6. Ordering — publish the unit before the board exists

- [x] 6.1 Publish `--bug-sq` **before** the round page constructs its chessground instances, so the wrap is already final when `updateBounds()` runs during construction. Add a comment at that call site stating the ordering is load-bearing
- [x] 6.2 Recompute `--bug-sq` on `window.resize` — the inputs are viewport height and `devicePixelRatio`, and that event also fires on browser zoom. Prefer `document.documentElement.clientHeight` over `innerHeight` so a scrollbar is not counted
- [x] 6.3 Add **no** bounds recomputation and **no** fallback: chessgroundx already calls `updateBounds` at init and again via its `ResizeObserver` when `body` resizes, and after task 4 nothing moves a board without the viewport changing
- [x] 6.4 Confirm no CSS rule in this layout consumes `--cg-width-*` / `--cg-height-*`, so chessgroundx publishing them cannot cause a relayout — this is what removes the feedback path entirely
- [x] 6.5 Verify by clicking the visual centre of several squares on both boards with **no** offset correction, confirming from the server log (`Got USER move …`) that the intended move was played — before and after a long chat message, and again after resizing the window

## 7. Close the portrait coverage gap

- [x] 7.1 In `static/bughouse.css`, drop the `max-width: 799px` clause from **all four** `(max-width:799px) and (orientation:portrait)` blocks so the portrait branch covers all portrait widths — changing only the grid block would leave a partially-styled page
- [ ] 7.2 Verify at a wide portrait viewport (e.g. 900×1400) that both boards, both pairs of pockets, both clocks and the tools areas land in defined grid areas rather than auto-placing
- [ ] 7.3 Confirm the previously-covered narrow portrait case is unchanged

## 8. Verification

- [x] 8.1 `yarn typecheck` and `yarn test` for the client changes
- [ ] 8.2a **Asset cache:** the CSS is served correctly but browsers keep the old copy — verification needed a forced re-fetch of `bughouse.css`. Bump the asset version (as the upstream "Bump asset version" commits do) so real users receive the change
- [x] 8.2 Re-run the task 1.1 measurement set and diff against the baseline: slack 0, pockets equal squares, board width unchanged, board x stable across a long chat message
- [x] 8.3 Play the standard test line (`1. e4 e5 2. Nf3 Nf6 3. Nxe5` on both boards) through the harness, clicking square centres with **no** calibration offset applied, and confirm every move in the server log matches what was aimed at
- [x] 8.4 Sanity-check the two modes not being changed — portrait below 800px, and landscape above 600px height — to confirm neither regressed
- [x] 8.5 Check the behaviour at dpr 1, where the fractional-square artefacts the quantisation exists to prevent are most visible
