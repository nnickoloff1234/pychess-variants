## 0. Status

**Proposed 2026-08-29. Implemented and verified; complete 2026-08-30.**

Opened after two symptoms were reported — the tools not filling the leftover width in short
landscape, and the tab list not spanning under the boards in portrait — and both were measured to a
cause that is NOT the one either of us assumed.

## 1. What was measured first

- [x] 1.1 **The grids already agree, and are already effectively shared.** Analysis app columns are
      `calc(--bug-tall-sq-a * 8 + * 0.31) minmax(0, max-content)`; the round page's are the same
      without the gauge term. `.bug-right-column` on both is `calc(sq * 8) minmax(0, 20vw)`.
      Measured on p3 at 1276x551: `454.323px 720.542px` and `454.323px 255.198px`.
- [x] 1.2 **The tools column really is 20vw on both pages** — 255.198px of a 1276px viewport. The
      analysis page is not using a different width; widening the track is not the fix.
- [x] 1.3 **The divergence is INSIDE the column.** The round page places chat, two preset panels and
      the tab bar as individual grid items and `toolsPlacement.ts` chooses between four arrangements,
      a dropped part spanning BOTH tracks. The analysis page has one `.bug-parts` block in one
      `tools` area, so nothing can leave and the space under a short board is unreachable.
- [x] 1.4 **The unreachable space, measured.** Portrait p4 386x835: partner stack 165x207 in a 355px
      row — **148px of dead height** under the board, beside a tab list confined to a 219px column.
      Short landscape p3: the app box runs x 45→1231 in a 1276 viewport, 45px unused at each edge.

## 2. Share the mechanism

- [x] 2.1 **Done.** `toolsPlacement.ts` now lives in `common/`, takes a `Droppable` list as an
      argument, and exports `ROUND_DROPPABLE` for the round page's own parts. The round page's call
      site passes it; behaviour there is unchanged.
- [x] 2.2 **Done, and no markup change was needed.** `.bug-parts` simply stops being a box:
      dropping its `grid-area`, `display: flex` and `flex-flow` lets the shared
      `.bug-parts { display: contents }` apply, and the panels and tab list become grid items of
      `.bug-right-column`. `TabbedPanels` already emits them as siblings.
- [x] 2.3 **Done by DELETION.** The analysis page's landscape block keeps only its two track
      widths and the portrait block is gone entirely; the areas, rows, minimums and clipping all
      come from the shared `.bug-right-column`. The partner stack's `grid-area: partnerstack`
      override is gone too, so it takes the shared `stack` — which is what the shared arrangements
      are written against. One rule added: `.bug-parts > [role='tablist'] { grid-area: tablist }`.
- [x] 2.4 **Decided: only the tab list drops; the panel never moves.** It is the analysis page's
      equivalent of the round page's chat, and the round page is the answer to questions like this
      rather than something to re-derive.
- [x] 2.5 **No conflict in practice.** `toolsPlacement`'s ResizeObserver watches the column, the
      stack and the droppable parts, and only toggles classes — it never sizes a board. The
      "boards measured once" rule is about the square unit, which `trackSquareUnit` still publishes
      once before the boards are built. The two do not overlap.

## 2b. What an attempt on 2026-08-29 found, and why it was reverted

The CSS half was tried and rolled back the same day. Every override the analysis page carried was
removed so the shared rules would apply, `toolsPlacement` was wired in, and **the drop itself
worked** — `.bug-right-column` took `drop-tablist` and the tab list spanned both tracks at 721px
instead of 255px. What it uncovered is a chain of further divergences, each hidden behind the last:

- [x] 2b.1 **The panel is 240px tall.** `site.css` gives every `div[role=tabpanel]`
      `height: var(--panel-height)`. On the round page that variable is undefined so it falls back
      to `auto` — the round page's own comment says so and warns against "fixing" it. The analysis
      page loads `analysis.css`, where `--panel-height: 240px` is defined, so the height is real. It
      never showed because `flex: 1 1 auto` grew the panel past it; as a grid item there is no flex
      to do that. Measured: a 240px panel in a 498px row.
- [x] 2b.2 **The analysis app's board row is `min-content`** where the round page's is
      `minmax(0, 1fr)`. With the tools placed individually the row then sized to the panel's
      content: 610px, then 642px, in a 551px viewport.
- [x] 2b.3 **Nothing bounds the analysis app's height in landscape.** It pins `#main-wrap` to
      `--bug-app-h` in PORTRAIT only; the round page does it per landscape mode. Without it a `1fr`
      row has nothing to divide, so 2b.2's fix did not bite. Pinning it in the desktop-landscape
      block did not help p3, which is short landscape — the two modes state this separately and
      only one of them was found.
- [x] 2b.4 **Done on the second pass, in that order, verifying after each step.** Bound the app
      height per landscape mode, then the app's rows, then the panel's height, then remove the
      column overrides, then wire the placement. Each step measured before the next was started;
      no step regressed the one before it.

## 3. Do not touch

- [x] 3.1 **Untouched, and confirmed still in agreement.** See 4.4: at 1276x551 both pages' board
      tracks are the same 8 squares, differing only by the gauge term the analysis page adds.
- [x] 3.2 **Untouched.** The board-unit cliff between p2 and p3 — 1px of viewport height costing 26%
      of the board (43.34px against 54.67px squares) — is real, measured, upstream of all of this,
      and still a separate matter.

## 4. Verify

- [x] 4.1 **The round page verified in all three modes on 2026-08-30, against a live game**
      (`ZdoeZseB`, a bughouse simul). The cost this task anticipated was paid: the server was
      restarted and the analysis fixture's player identities are gone, so all four windows are
      spectators of it now.

      | window | mode | app tracks | column | tab bar | overflow x/y |
      |:--|:--|:--|:--|:--|:--|
      | p1 1701x735 | tall landscape | `533.375 298.694 340.264` | dissolved (`display: contents`) | dropped, 653.7px | 0 / 0 |
      | p3 1276x551 | short landscape | `437.375 823.625` | real box, `437.375 386.25` | beside the board, 386.3px | 0 / 52 — see below |
      | p4 386x835 | portrait | `384.031` / rows `355.302 480.031` | real box, `165.375 218.656` | dropped, 384px full width | 0 / 0 |

      Each mode is doing what it is meant to: tall landscape has flattened the column into the app
      and dropped all three parts (`drop-tablist drop-p2 drop-p1`), portrait has dropped the bar and
      the second preset part into the full width under the top board, and short landscape has room
      for neither and keeps them beside the board. The portrait sum is unchanged from 4.3 — 355.3
      column plus 480 own stack is the 835px viewport exactly.

      **The 52px in short landscape is not this layout.** `.round-app.bug` is 546.7px inside a 551px
      viewport; the overflow is `main.round.bug`'s SECOND row, 34px holding an 11px `<under-board>`,
      which sits outside the app grid entirely and is unaffected by anything here. Tall landscape and
      portrait give that row 0px. Recorded rather than chased — it belongs to whoever owns
      `<under-board>`, not to this change.
- [x] 4.2 **Verified in all three modes, and the drop is decided by room rather than by mode:**

      | window | mode | partner stack | column | dropped? | tab list |
      |:--|:--|--:|--:|:--|--:|
      | p3 1276x551 | short landscape | 547 tall | 551 | no — no room | 255px, beside the board |
      | p2 1276x550 | short landscape | 493 tall | 550 | **yes** | **626px, spanning both tracks** |
      | p4 386x835 | portrait | 207 tall | 355 | **yes** | **384px, full width** |

      p2 and p3 are the same window size and differ only in board size, so the pair is also the
      proof that the decision is measured rather than keyed to a breakpoint.
- [x] 4.3 **Portrait stays pinned with the tab list dropped**: no overflow on either axis, the
      merged column still 355px and the own stack still 480px, summing to the 835px viewport.
- [x] 4.4 **Confirmed to the pixel, in ONE window at ONE viewport** — p3 at 1276x551, first on the
      round page and then on the analysis page, so nothing about the comparison depends on two
      windows agreeing. Flattening the round page's merged column to compare like with like:

      | track | round | analysis | difference |
      |:--|--:|--:|:--|
      | own board | 437.375 | 454.323 | **+16.948** |
      | partner board | 437.375 | 454.323 | **+16.948** |
      | tools | 386.250 | 345.312 | −40.938 |

      **+16.948px is exactly the gauge's share and nothing else**: the square there is 54.671875px,
      the analysis board track is `calc(sq * 8 + sq * 0.31)`, and `sq * 0.31` is 16.948. The round
      page's 437.375 is `sq * 8` to the pixel, so the two pages are sizing their boards from the same
      unit by the same expression. The tools track is the flexible one and absorbs the difference.

      **One residual that is NOT the gauge, and it is a gap rather than a track.** The round page
      puts a single 15px gap between the own board and the merged column and none inside it
      (437.375 + 386.250 = 823.625, the column's width exactly). The analysis page has no such
      column, so its three tracks carry two gaps of 11.027px — an extra 11px between the partner
      board and the tools, and 4px less between the boards. The tools track gives up the 40.938 that
      the two gauges (33.896) and the extra gap (7.042) take. Left as found: it is a spacing decision
      about the analysis page, visible on screen, and not something to change on the way past.
- [x] 4.5 Frontend gates: `yarn typecheck` clean, `yarn test` 48 suites / 262 tests.
