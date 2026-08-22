## Why

**Bughouse is unplayable in portrait on a phone.** At 386x835 — a 19.5:9 iPhone-class viewport — the partner board renders **0 pixels wide** and **all eight pockets collapse to zero**. A bughouse player cannot drop a piece without a pocket, so the mode is not merely ugly, it is non-functional.

The cause is a circular dependency in `static/bughouse.css:182`. The partner column is sized from `--cg-width-a`:

```css
grid-template-columns: calc((var(--cg-width-a) / var(--files)) * var(--pocketLength)) ...
```

but chessgroundx *writes* `--cg-width-a` from the measured width of board A — and board A lives in that very column. **Zero is a stable fixed point**: once the board measures 0 the column stays 0, and nothing can recover it. Measured live: `--cg-width-a: 0px` against a healthy `--cg-width-b: 389.33px`, with all 33 pieces present in the DOM, so this is purely a sizing failure and not missing data.

It reproduces identically at 892x1385, 382x829 and 386x835, and in a real browser window as well as an iframe, so it is not width-gated and not a test artifact. The defect is pre-existing, but it only became reachable when the portrait media queries were widened from `(max-width: 799px) and (orientation: portrait)` to plain `(orientation: portrait)` — before that, wide portrait fell through to the single-board layout and phone portrait was never exercised.

## What Changes

- **Size the partner column from the viewport, not from its own occupant.** The column becomes `20vh`, giving the partner board a minimum height of 20% of the window. Nothing downstream feeds back into it, so the loop is broken. Verified in the browser: `--cg-width-a` went `0px` → `165.33px` and pockets `0/8` → `8/8` from this single change.
- **Establish two layout invariants for portrait.** The main board is always full width and square, so its height always equals the window width; the partner board is always at least 20vh and square.
- **Size the square boards with `aspect-ratio: 1` instead of `100vw`.** `100vw` includes the scrollbar, which rendered the main board 389px wide inside a 386px viewport and pushed it to `x: -5`.
- **Lay the player's own seat strips out as a row rather than stacked**, so the pocket sets the strip height and the name/clock ride beside it: 91px → 57px each, 67px recovered from a very tight vertical budget.
- **Give the tools/chat panel the remaining height and its own internal scroll.** The page itself stops scrolling; the panel is always visible and scrolls its own content. Chosen over a slide-up drawer (needs markup and TypeScript) and over relaxing the full-width board (would break the invariant above).
- **Hide the site header in portrait**, as short landscape already does for bughouse. Worth 60px, which is over half the panel's budget.
- No change to desktop, short landscape, or the analysis page: every edit is inside `@media (orientation: portrait)`.

## Capabilities

### New Capabilities

None. The requirements belong to the existing layout capability.

### Modified Capabilities

- `bughouse-round-layout`: two changes. The requirement that every viewport resolves to a bughouse layout is strengthened — placing areas in *defined* grid areas is not enough, since portrait satisfies that today while rendering them at zero size; every board and pocket must also be **usably sized**. And a new requirement forbids sizing any grid track from a value derived from that track's own occupant, which is the class of defect behind this bug and behind the 526px desktop anomaly seen during the previous change.

## Impact

- `static/bughouse.css` — the four `@media (orientation: portrait)` blocks. The grid template, the two board rules, the seat-strip direction, the tools panel's overflow, and the header rule.
- No server, API, persistence, i18n or TypeScript surface. No markup change. The tools panel decision was made specifically to keep this a stylesheet-only change.
- Chessgroundx must re-measure once after the grid resolves for `--cg-width-a` to leave zero. In the browser experiment a `resize` dispatch was enough; whether anything is needed in the shipped path is an implementation question, not a spec one, and is called out in design.
- Interacts with `desktop-round-layout-fixes`, still open at 22/36 tasks: its task 5.7 asks that portrait be "unchanged", which this change deliberately supersedes. That task should be closed as belonging here.
- Not addressed here: the partner seat strips are cramped in the ~205px right column and long player names become invisible. Recorded in design as an open question rather than fixed blind.
