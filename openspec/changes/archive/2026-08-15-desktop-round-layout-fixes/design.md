## Context

Measured on the round page at 1362x916, dpr 1.5, in the `(min-height: 600px) and (orientation: landscape)` mode:

| Element | `grid-template-areas` | `grid-template-rows` |
|---|---|---|
| `main.round` | `'app app' 'uleft uboard' 'side side'` | 510.79 · 41.31 · **743** |
| `#main-wrap` | `'main'` | 1331.73 · 0 · **743** |

`#main-wrap.bug` declares its own columns and a single `'main'` area, but not rows — so the rows come from the `.bug` rule in the `@media (min-width: 800px)` block, which was written for `main.round.bug`. A grid with one area and three rows ends 743px below its only child.

`main.round`'s own 743px is the `side` row. Since the tabs change moved the game-info placeholder into the Info panel, `aside.sidebar-first` has zero children, so that row is 743px of nothing too.

The desktop columns are:

```
calc(30vw * scaleA)                                  326.875   board
calc(--pocketLength * (--cg-width-a / --files))       203.333   tools
calc(30vw * scaleB)                                  326.875   boardPartner
calc(--pocketLength * (--cg-width-b / --files))       203.333   toolsB
```

The tools track is sized as a pocket width — five roles times a square — which is a leftover from when that column held the pockets rather than the tab widget.

## Goals / Non-Goals

**Goals:**

- The desktop round page reserves no vertical space it does not use.
- The two boards are adjacent, with the tools column beside them rather than between them.
- Both fixes are confined to the bughouse round page.

**Non-Goals:**

- Removing `aside.sidebar-first`. Making its emptiness free is enough; whether it should render at all is a separate question, and leaving it means nothing depends on the answer.
- Changing the short-landscape or portrait modes.
- Scaling the tools column with zoom. It becomes a flat fraction of the viewport, deliberately.
- Fixing the invalid `2 * minmax(...)` columns declaration, which the parser already discards.

## Decisions

### 1. Scope the rule to the element it was written for

The `.bug` selector is the whole defect: it is a class carried by three different elements, and the rule's rows and areas only make sense on one of them. Scoping it to `main.round.bug` leaves `#main-wrap.bug` with the single-area grid it declares, and the phantom row disappears without touching the wrapper's own rules.

Alternative considered: give `#main-wrap.bug` an explicit single-row template to override the inherited one. Rejected as treating the symptom — the next element to carry `.bug` would inherit the same nonsense.

### 2. The `side` row sizes to its content

`743px` is a magic number with no derivation in the stylesheet, and it is wrong in both directions: too much for an empty aside, and arbitrary for a populated one. Replacing it with a content-based track means an empty sidebar occupies nothing and a sidebar with content is exactly as tall as its content.

This is the fix that makes leaving the empty aside in the markup harmless, which is why this change does not also remove it.

### 3. Boards adjacent, tools to the right, three columns instead of four

The grid becomes three columns and four rows:

```
grid-template-columns: calc(31.25vw * var(--board-scaleA))
                       calc(31.25vw * var(--board-scaleB))
                       20vw;
column-gap: 2vmin;
grid-template-areas:
  'clock-top  clockB-top   tools'
  'board      boardPartner tools'
  'clock-bot  clockB-bot   tools'
  '.          .            toolsB';
```

Each board's seat strips are placed by the same columns as the board they belong to, so they follow automatically and no strip rule changes — verified in the dry run: both A strips at x=181.99 and both B strips at x=540.8, each exactly the width of its board.

`toolsB` loses its own column and becomes a content-sized row under the tools column. It holds only `#offer-dialog`, which is empty except when a draw is offered, yet was occupying a full 203x474 track; as a row it measured 0 tall while empty and still has somewhere to render when it is not.

The gap is `column-gap: 2vmin`, matching the existing `grid-row-gap`, and applies equally between the two boards and between board B and the tools — 18.31px each at the measured viewport.

### 4. Board width keeps the old formula's shape; the tools column stops scaling

The old track was `calc(30vw * var(--board-scaleA))` with `--board-scaleA: calc(var(--zoom-a) / 100)`. Its intention is that a board is a fraction of the viewport width, scaled linearly by the user's zoom slider, with 30vw the width at full zoom. The slider runs 0-100 (`boardSettings.ts:608`) and `ZoomSettings` defaults to **80** (`boardSettings.ts:583`), which is why boards measured 24vw rather than 30vw. `site.css:95` declares `--zoom-a: 100` only as a fallback; `updateZoom()` writes the real value onto `body` at startup.

The new track keeps that shape exactly and re-tunes the constant: `calc(31.25vw * var(--board-scaleA))`, because 31.25 x 0.8 = 25. So a quarter of the page is what an untouched installation shows, and the slider still moves the board linearly to a 31.25vw maximum. Verified across the slider: zoom 100 -> 31.25vw, 80 -> 25vw, 60 -> 18.75vw, 40 -> 12.5vw.

`--board-scaleA` and `--board-scaleB` remain separate, so the two sliders stay independent — verified with mismatched values: zoom 100/50 gave boards of 425.63/212.81, and 40/90 gave 170.25/383.06.

The tools column becomes a flat `20vw` and no longer scales with zoom. This is a real behaviour change: the old track was pocket-derived from `--cg-width-a`, so it grew and shrank with the board. The panel's width is a readability question rather than a board-geometry one, and at low zoom a scaled panel and a shrunken board both being small serves nobody. The cost is that at low zoom the panel is proportionally dominant — at zoom 40 the boards are 170.25 each against a 272.4 panel — which is accepted.

Note that a zoom change already refreshes chessgroundx's hit-test bounds: `ZoomSettings.update()` calls `updateBounds()` and `renderResized()` on a timeout, with a comment explaining that bughouse's ResizeObserver does not fire for it. Any grid change that resizes a board needs the same care, which is why the dry run dispatched a `resize` after injecting.

### 5. Check the dead rows while reordering, do not assume them

The template's last two rows are `'. move-controls move-controls .'` and `'uboard uboard uboard uboard'`. Neither element is a grid item of `.round-app.bug` any more: `#move-controls` moved inside the Moves panel with the movelist block, and `under-board` is a sibling of the round app rather than a child. Measured before deciding: of the ten areas the template declares, eight have an occupant and **`move-controls` and `uboard` have none**. They are dead and are removed. The measurement is the reason, not the assumption.

### 6. main.round gets the columns its areas describe

`site.css` declares, in `@media (min-width: 800px)`:

```css
.round { grid-template-areas: "side app app" "uleft uboard .";
         grid-template-columns: minmax(250px, 350px) minmax(...) minmax(240px, 400px); }
```

Three columns, for the single-board page. The bughouse rule overrides the areas to a two-column template but its own columns declaration was the invalid one, so bughouse has been running two-column areas on three inherited tracks. Measured as `350px 624.167px 351.208px`, with the third holding nothing.

That mismatch was harmless while the app happened to fill the width. Once the app narrowed, the third track became visible dead space, and because auto tracks absorb leftover width it also pinned everything to x=0. Declaring two content-sized columns and centring them fixes both: measured afterwards at `485.854px 485.854px` with equal 185.99px margins.

### 7. The controls bar wraps rather than squeezing

Putting the controls beside the tablist was designed and verified at desktop widths. In a narrow column it is wrong: the controls hold a fixed width, so the tablist absorbs the entire shortfall and stops being readable. Measured on a 697x382 phone landscape, where the tools column is 74.33px:

| | Tablist | Per label |
|---|---|---|
| Sharing the row | 23.67 | **7.89** |
| Wrapped | 74.33 | **24.77** |

24.77 is what mobile had before the controls moved into that row, so wrapping restores it exactly rather than approximating it.

The trigger is the tablist's `flex-basis`, not a breakpoint: where the column can hold that basis plus the controls they share a line, and where it cannot the controls wrap beneath, costing 40px of the column's height. Content-driven means it works for any column width the layout produces, including ones no device has yet.

## Risks / Trade-offs

- **Scoping `.bug` could remove rows something else was relying on.** Three elements carry the class; only `main.round.bug` was intended. → Check each of the three before and after; the round app has its own `.round-app.bug` rules and should be untouched.
- **A content-sized `side` row changes the page when the sidebar is *not* empty.** The single-board round page does populate its sidebar, but it does not carry `.bug`. → Confirm no non-bughouse page is affected, and check the bughouse analysis page, which shares the stylesheet.
- **Adjacent boards change what the eye does.** The two boards become one wide block, which is the point, but the ranks gutter and the labels that overhang between them were tuned when a 203px column sat in between. → Look at the seam between the boards specifically.
- **The wrapped bar costs panel height on small screens**, 40px of a 382px column. → Accepted: an unreadable tablist costs more than a slightly shorter panel.
- **`minmax(0, max-content)` columns could behave differently if the sidebar is ever populated**, since `max-content` then includes its content. → Check the bughouse analysis page and any state where the sidebar fills.
- **The tools column moving to the edge changes what clipping means.** In short landscape it already yields; on the desktop it now sits against the page edge rather than between two boards. → Re-check the narrow end of this mode.

## Migration Plan

Scope the `.bug` rule first and confirm the phantom row goes; then the `side` row; then the column reorder, which is independent of both. Each step is separately observable in the same viewport, so a regression can be attributed to one of them.

## Open Questions

- ~~Whether the tools column should keep a pocket-derived width.~~ **Settled: a flat 20vw**, chosen with the trade-off at low zoom accepted (see decision 4).
- Whether `aside.sidebar-first` should render at all on this page, once its cost is zero either way.
