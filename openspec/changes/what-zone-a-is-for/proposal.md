## Why

Zone A — the band the partner's board frees by being shorter than the viewer's own — is the one
region of this layout nobody has settled: what it is FOR, which parts belong in it, and by what rule
each layout mode fills it.

**AND IT IS NOW ALSO THE PLACE WHERE LAYOUT DEFECTS FOUND ALONG THE WAY ARE FIXED.** Working out zone
A means looking hard at the two stacks, the tools column and the drop cascade in every mode, which is
exactly the exercise that turns up defects in all of them. Those findings belong here rather than in
a proposal each: they are found by this work, they change the numbers this work is deciding from, and
a separate change per finding would leave the decision waiting on a queue of its own making. Section
"Findings" in `design.md` is the log; each one is a task here with its measurement.

The two original directions, re-measured 2026-09-12:

- **Admitted, and the parts do not fit** — **FIXED**, by the cumulative drop cascade in
  `toolsPlacement.ts`. It charges each part against what zone A actually has left, so the round
  page's four parts can no longer be admitted into a band that holds two. Re-measured on the round
  page in short landscape: no overflow at the viewport that produced the original 44px.
- **Fits, and nothing is put in it** — **REAL**. Re-measured on the analysis page at 701x829: zone A
  177 x 291, declared, sized, and EMPTY, with the only visible panel in zone B below both boards.

## What Changes

1. **Implement the partner-board rule above**: as big as possible, shrinking only for the tools'
   minimum width, floored at 50% of the main board, and an attached tab below that floor.
2. **Decide what zone A is for, per mode.** Zone A is not one thing: in tall landscape it is the band
   a ZOOMED-DOWN partner board frees, and in short landscape it is the band a board shrunk by WIDTH
   PRESSURE frees. A rule that fills it has to say which parts go there, in what order, and what
   happens to the height when nothing does — in each mode, because the band has a different cause and
   a different size in each.
3. **Fix the layout defects this work turns up**, each recorded with its measurement, its mechanism
   and its fix. The first is already found and fixed — see Findings 1 below, and `design.md`.
4. **Say what a collapsed zone A does with its height** — to the boards, or to zone B.

## The partner board's size is DECIDED, and it was never a matter of taste

Stated by Nikolay, 2026-09-12, and it settles what Finding 1 opened:

> There is nothing that needs a smaller partner board — it should always be as big as possible.
> The size of the partner board decreases only if the tools area's minimum width cannot fit, and
> the minimum size it can shrink to, before it becomes an actual attached tab in the tab list, is
> **50% of the main board**.

So zone A is not a design choice about board sizes at all. It is what the WIDTH leaves when the
tools' minimum cannot be paid any other way, bounded at half the main board — and below that bound
the partner board stops being a board beside the other and becomes a tab.

The code agrees with the first half and not with the rest — see `design.md`, "The partner board's
size", for the three places it differs and what each currently does instead.

## Findings so far

- **1. The partner stack was not the shape its stylesheet says, on the analysis page.** The
  partner board is a detached tab part, and a part's `display` is written as an INLINE style, which
  beats the page stylesheet. It said `block` — copied from the round page, whose stacks really are
  block flow — while `bughouse.css` makes the analysis page's stacks two-column grids whose first
  column, `calc(var(--bug-stack-sq) * 8)`, is where the partner board's WIDTH comes from. Inert, the
  board had no definite width at all and took whatever its grid area gave it. Measured at 1276x430:
  columns 354.6 / 225.1 / 679.1, board A 341 and board B 225, the partner's gauge 225 wide and ZERO
  tall, and its pockets 213 (five squares, correctly sized from the variable) beside a 225 board.
  With the one value corrected: 354.6 / 354.6 / 549.6, both boards 341, both gauges in their boards'
  rows, the tools still 550 wide, no overflow — and **zone A is zero in that mode**, because at that
  width the layout's own arithmetic says both boards fit full size. The band we had been measuring
  was largely manufactured by this defect.

## Impact

- `client/two-board/squareUnit.ts` — `toolsHome()` and the per-board allowances, if the rule needs
  them.
- `client/two-board/common/toolsPlacement.ts` — the cascade, once zone A has a rule per mode.
- `client/two-board/analysis/analysis.ts`, `client/two-board/common/tabs.ts` — Findings 1.
- `static/bughouse.css` — the zone A templates and rows on both pages.
- Both pages, all three modes. A finding in one mode is not a finding in the others, and each has to
  be measured where it lives.

## Capabilities

- `bughouse-round-layout`

## Not in this change

- The movelist tab's FRAGMENTS. `movelist-tab-fragments` defines them — engine box, move list, move
  controls — and hands this change three parts, one group and a stated area per home. The rule that
  relocates one of them is this change's business; splitting them was not.
