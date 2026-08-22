## Context

`static/bughouse.css` defines `.round-app.bug` only inside media queries. Portrait is spread over four blocks, all now gated on plain `(orientation: portrait)` after the gap above 800px was closed in `quantized-bughouse-short-landscape-grid`. That widening made phone portrait reachable for the first time, and it does not work.

Measured live in the harness at 386x835 (19.5:9, within 4px of an iPhone 15), and reproduced at 892x1385 and 382x829, in a real window and in an iframe:

| | measured |
|---|---|
| `grid-template-columns` | `0px 386px` |
| `--cg-width-a` / `--cg-width-b` | `0px` / `389.33px` |
| partner board `#mainboard` | **0 x 0** — with 33 pieces and a `cg-board` present |
| pockets with non-zero width | **0 of 8** |
| document overflow | 483px |

The partner board is fully populated and simply has no size. `--files` (8) and `--pocketLength` (5) are both healthy; only `--cg-width-a` is zero.

The intent of the shipped design is legible and worth keeping: the partner board sits above the player's own board, smaller, with its two seat strips beside it. The user's recollection — "it used to show the partner board a bit smaller on top of our board" — matches that template exactly. This change repairs the sizing, not the arrangement.

## Goals / Non-Goals

**Goals:**

- Bughouse is playable in portrait on a phone: both boards visible, all eight pockets usable.
- Two stated invariants hold: the player's board is always full width and square, so its height always equals the window width; the partner board is always at least 20vh and square.
- The whole page fits the viewport without the document scrolling.
- ~~Stylesheet-only. No markup, no TypeScript.~~ **Revised during implementation** — see
  decision 6. No markup change, but two published CSS custom properties were added to
  `client/two-board/squareUnit.ts`, because the seam this change had to remove cannot be
  computed in CSS.

**Non-Goals:**

- Tablet portrait. It renders through the same rules and should improve, but the ratios here are chosen for phones and tablets are a separate exercise.
- Landscape, desktop and the analysis page. Every edit sits inside `@media (orientation: portrait)`.
- The upstream chessgroundx weakness — a memoised `bounds` with the bughouse `ResizeObserver` pointed at `document.body`. That is the reason a zero measurement can happen at all, and it stays untouched; this change removes the CSS that makes zero permanent.
- Fixing the cramped partner seat strips. Diagnosed, deliberately deferred — see Open Questions.

## Decisions

### 1. The partner column is sized from viewport height

The defect:

```css
grid-template-columns: calc((var(--cg-width-a) / var(--files)) * var(--pocketLength))
                       calc(100vw - ((var(--cg-width-a) / var(--files)) * var(--pocketLength)));
```

Column 1 is sized from `--cg-width-a`; chessgroundx writes `--cg-width-a` from the measured width of board A; board A is placed in column 1. The loop has two fixed points and the layout settles on the wrong one. Zero is *stable*: a zero-wide column yields a zero-wide board, which rewrites the variable to zero.

Replaced by `20vh`. The viewport is an input the layout cannot influence, so the loop is cut rather than merely nudged. Verified in the browser: this single change took `--cg-width-a` from `0px` to `165.33px` and pockets from `0/8` to `8/8`, with no other edit.

*Alternatives rejected.* A fallback (`var(--cg-width-a, 40vh)`) does not help — the variable is *set*, to zero, so the fallback never applies. Seeding `--cg-width-a` from JavaScript reintroduces the ordering hazard the existing `squareUnit.ts` was written to avoid, and puts a layout constant in two places. Forcing a re-measure after first paint treats the symptom and is explicitly ruled out by the existing requirement "The board's geometry is final before it is measured".

### 2. Squareness by `aspect-ratio`, not `100vw`

`100vw` includes the scrollbar. With the page overflowing, `100vw` was 386 while the container was 378, so the board rendered 389 wide at `x: -5` — wider than its column and hanging off the left edge. `aspect-ratio: 1 / 1` with `width: 100%` lets the row take its height from the box and removes viewport arithmetic from the board entirely.

This matters beyond tidiness: any rule of the form "height = 100vw" silently assumes no scrollbar, which is exactly the condition this change is trying to establish.

### 3. The player's own seat strips lay out as a row

The portrait rule stacks them (`flex-direction: column`), so each costs the pocket's height *plus* the name/clock block: 91px each. Side by side the pocket sets the height and the name/clock ride beside it: 57px each, recovering 67px.

The comment on that rule explains the column direction as being for the *rotated* partner strip, and the selector `.seat-strip0.bug` in fact targets the player's own strips. The partner's strips keep the stacked treatment.

### 4. The tools panel takes the remainder and scrolls itself

The vertical budget at 386x835, with the invariants held:

| | px |
|---|---|
| header | 60 |
| partner block (20vh) | 168 |
| own top strip | 57 |
| own board (= window width) | 378 |
| own bottom strip | 57 |
| **subtotal** | **720 of 835** |

115px remains for a panel whose content wants 301. The panel gets `minmax(0, 1fr)` and `overflow-y: auto`, so the *page* stops scrolling and the panel scrolls instead.

*Alternatives rejected.* A slide-up drawer gives the most chat but needs a handle, persisted open/closed state and TypeScript — a much larger change for a mode that does not yet work at all. Relaxing the board to `min(100%, 45vh)` is the cheapest fix but discards the invariant that the board's height equals the window width, which is the property that makes the rest of the layout predictable.

### 5. The header is hidden, as short landscape already does

`body[data-variant='bughouse'] header { display: none }` already exists for short landscape. Portrait has a tighter budget and no such rule. Applying it returns 60px — over half the panel's remaining height — for one line of CSS and no new concept.

The cost is that in-page navigation is unreachable without leaving the game, which is already accepted in short landscape and is the normal trade for a phone game screen.

### 6. The boards are sized from published quantised units, not from `aspect-ratio`

Found in the live dry run: a visible line between the board and the pocket beneath it —
the same defect the short-landscape change fixed, and already forbidden by the existing
requirement "The board's grid slot equals the board it renders".

Mechanism. `cg-board` is `position: absolute`, so it contributes no layout height and the
surrounding box is sized entirely by CSS. Decision 2's `width: 100%; aspect-ratio: 1`
made that box 378x378, while chessgroundx quantises the board it paints down to whole
device pixels per file — 373.33 at dpr 1.5. The 4.66px difference is the line. Measured
directly: box 378, board 373.33, gap from board bottom to strip top 4.66.

CSS cannot compute the quantised value: it needs `floor(width * dpr / files)`, and `dpr`
is not exposed to CSS. So `squareUnit.ts` — which already does exactly this for short
landscape and already exports `quantize()` — publishes two more properties:
`--bug-portrait-sq` from the viewport **width** (the player's full-width board) and
`--bug-portrait-partner-sq` from a fifth of the viewport **height** (the partner's).
Both grid tracks and both board boxes are then whole multiples of their unit.

Result: both seams measured **exactly 0**, on both boards, with the pocket flush beneath.

*Why not size the box from `--cg-width-b`.* It is the right number and the wrong source:
that is chessgroundx's own measurement of the box, so the box would be sized from itself.
Zero is a fixed point of that loop — which is the very defect this change exists to fix,
and which the new requirement "No grid track is sized from its own occupant" forbids.

*Consequence, unresolved.* The unit is computed from `clientWidth`, which **excludes the
scrollbar**. `trackSquareUnit()` runs before the boards exist, when the page has not yet
overflowed and `clientWidth` is 386, giving a 384px board. The page then overflows
vertically, a scrollbar appears, `clientWidth` drops to 378, and the 384px board now
overflows *horizontally* by 6px. The two overflows are therefore coupled: eliminating the
vertical one removes the scrollbar and the horizontal one closes with it. This is another
reason to fix the tools panel rather than to make the unit defensive about scrollbars.

### 7. "The partner's pockets" is not expressible in CSS — BLOCKED, needs a decision

Rotating the partner's pockets to run vertically beside its board requires selecting them.
Nothing in the markup identifies them:

| | p3 (plays board A) | p4 (plays board B) |
|---|---|---|
| `seatstrip0a` class | `seat-strip0` | `seat-strip0` |
| `seatstrip0a` grid-area | `clock-top` (own) | `clockB-top` (partner) |
| `seatstrip0b` class | `seat-strip0 bug` | `seat-strip0 bug` |
| `seatstrip0b` grid-area | `clockB-top` (partner) | `clock-top` (own) |

`.bug` is board **identity** — always board B — so it is the partner's in one window and
the player's own in the other. The only carrier of the **role** is `grid-area`, and CSS
cannot select on it.

Worse, the role is mutable at runtime: `roundControls.swapSeatStripAreasForSwitch()` swaps
the strips' inline `grid-area` when the user presses SWITCH, so any rule keyed on a static
class is correct for at most one of the two states. The default (no inline style) has board
A as the player's own; a board-B player is switched into place on load.

Options:

1. **The client marks the role.** Toggle a class — `own` / `partner` — wherever a grid area
   is assigned or swapped. Small, survives SWITCH, and unblocks anything else that needs to
   style by role. `twoBoardCtrl.ts` already carries a TODO saying this is the weak point:
   *"instead of keeping info about the switch and rendering boards on elements called
   left/right"*. **Recommended.**
2. **Attribute selector on the inline style** (`[style*="clockB"]`). Matches only after a
   switch has written the inline value, so it is wrong for the default case. Rejected.
3. **Move the pockets out of the strips into their own grid areas**, as Nikolay suggested.
   Worth doing on its own merits — the strip currently binds a pocket to a clock and name
   that portrait may want positioned separately — but it does not by itself solve this:
   the rotation would still need to know which pocket is the partner's.

Sizing, once selectable: a rotated pocket's length is `--pocketLength` cells at the same
0.8 spacing, and SHALL be clamped to half the board's height, i.e.
`min(var(--pocketLength) * cell, boardHeight / 2)`. With five slots the two coincide exactly
(82.67 against a 165.33 board), so the clamp only bites for variants with longer pockets.

## Risks / Trade-offs

- **`20vh` is a guess that has only been seen at one aspect ratio.** At 386x835 it gives a 165px board, legible but small. On a squatter viewport it will be larger relative to the width. → Check 19.5:9 and 20:9 at more than one height before settling; the number is a single token to change.
- **A board still measuring zero at first paint would now recover, but nothing proves it re-measures on its own.** The browser experiment needed one `resize` dispatch before `--cg-width-a` left zero. → Determine during implementation whether the shipped path re-measures unaided; if it does not, that is a defect to record against chessgroundx's `document.body` observer rather than to paper over here. Do not add a compensating call without saying so explicitly.
- **Hiding the header removes navigation.** → Matches short landscape; revisit only if a portrait user reports being stuck.
- **Row-direction seat strips could crowd a long name against the pocket.** The existing requirement "The seat strip apportions its width by priority" governs this and must keep holding. → Verify with the longest test-user names, which are worse than realistic ones.
- **`aspect-ratio` needs the width to resolve first.** In a `minmax(0, 1fr)` column it does. → Confirm the board is square at several widths, not just one.
- **The panel's 115px is thin**, and grows to 175px only because the header is hidden. If the header rule is rejected the panel is very cramped. → The two decisions are coupled; do not take one without the other.

## Migration Plan

Pure CSS, inside media queries that already exist. No data, no persistence, no rollout concern — reverting is reverting the diff.

Apply in the order the decisions are numbered. Decision 1 alone makes the mode functional and is independently observable (`--cg-width-a` leaves zero, pockets appear); each later decision improves fit and can be judged on its own. If any step regresses, it can be dropped without the others.

## Open Questions

- **The partner's seat strips are cramped in the ~205px right column** and long player names become invisible. Diagnosed but not fixed: the strips hold a five-square pocket (~103px at this size) plus a name and clock, and the test users' names are far longer than realistic ones. Options are to shrink the partner pocket squares, truncate the name, or move the strips beneath the partner board. Deferred rather than guessed at.
- **Should `20vh` be a fixed fraction or a clamp?** A `clamp()` against the board's own square size might behave better across the phone range than a bare percentage.
- **Does tablet portrait want these same ratios?** Explicitly out of scope; the same rules will apply to it, so it should at least be looked at before this is archived.
- **The other two modes will likely want both of these ideas — but not in this change.** Raised 2026-08-15, explicitly "still early". First, the per-board quantised unit introduced in decision 6 is expected to be needed in short landscape and desktop too; short landscape already has `--bug-sq` for exactly this reason, and desktop's deferred note records an unexplained 526px board against a 425px column, which is the same family of problem. Second, **the partner board should be smaller than the player's own in every mode.** The two are equal in short landscape only because a single `--bug-sq` sizes both boards, and equal on the desktop only because `--board-scaleA` and `--board-scaleB` share a default — neither is a decision. Splitting L-short's unit in two is a prerequisite there; the desktop only needs a different default. Out of scope here, and neither should be smuggled into a portrait change.
