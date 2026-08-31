## Context

**Measured 2026-08-29, analysis page on `JJgZzLhJ`.**

Short landscape, p3 at 1276x551:

| | value |
|:--|:--|
| app grid columns | `454.323px 720.542px` — from `calc(--bug-tall-sq-a * 8 + * 0.31) minmax(0, max-content)` |
| `.bug-right-column` columns | `454.323px 255.198px` — from `calc(--bug-tall-sq-b * 8 + * 0.31) minmax(0, 20vw)` |
| tools width | 255px (20vw of 1276) |
| app box | x 45 → 1231 in a 1276 viewport — **45px unused at each edge** |

Portrait, p4 at 386x835:

| | value |
|:--|:--|
| `.bug-right-column` | `grid-template-areas: "partnerstack tools"`, columns `165.375px 218.656px` |
| partner stack | 165 x 207 |
| tools block | 219 x 355 |
| tab list | 219 wide at x=166, y=314 |
| **dead space under the partner board** | **148px tall, 165px wide** |

**The round page states the same two track lists.** Its landscape block is
`calc(--bug-tall-sq-a * 8) minmax(0, max-content)` and its `.bug-right-column` is
`calc(--bug-tall-sq-b * 8) minmax(0, 20vw)`. The only difference in the tracks is the `* 0.31` the
analysis page adds for the gauge, which is one of the three sanctioned differences.

**So the tracks are not the problem, and widening them would not fix either symptom.** What the
round page has and this page does not is stated in `toolsPlacement.ts`: four arrangements, in the
order parts leave the strip beside the board —

```
(none)          stack | chat        everything beside the board
                stack | p1
                stack | p2
                stack | tablist

drop-tablist    stack | chat        the tab bar spans the full width,
                stack | p1          under the board AND the parts above it
                stack | p2
                tablist tablist

+ drop-p2 …     and so on, the chat never moving
```

A dropped part is placed with a grid area spanning BOTH tracks, so it gets board width plus tools
width. That span is the "full remaining width" the round page appears to have and this page does
not — and it is reached by a JS measurement because, as that file says, whether a part can drop is a
comparison between a board driven by a zoom slider and a part driven by its content, which CSS has
no conditional for.

The analysis page has no parts to drop: `.bug-parts` is one block holding the panel and the tab list,
occupying one `tools` area.

## Goals / Non-Goals

**Goals:**

- One arrangement mechanism for both pages, in one place, driving both.
- On either page, a part that does not fit beside the partner board moves under it and takes the
  full width of the column pair.
- The differences that remain are only the sanctioned ones, and each is written down where it is
  made rather than being discovered later as a divergence.

**Non-Goals:**

- Changing the app-level or column-level tracks. They already agree; touching them would be fixing
  something that is not broken and would put the two pages back out of step.
- Changing which tabs the analysis page has, or the round page's chat and presets.
- The board-unit cliff seen between p2 and p3 — a 1px viewport difference costing 26% of the board.
  Real, measured, and a separate matter; it is upstream of everything here.

## Decisions

### Decision 1: Share the mechanism, not a copy of it

`toolsPlacement.ts` moves out of `round/` and stops naming only that page's parts. Its `DROPPABLE`
list — a part selector paired with the class that says it has left — becomes an input rather than a
constant, so each page supplies its own parts in its own order while the measuring, the ordering and
the class toggling stay in one file.

The alternative, an analysis-page copy, fails the same way the coordinate CSS did: the two would
agree on the day they were written and drift after.

### Decision 2: The analysis page's droppable part is the tab list, at least at first

The round page drops the tab bar first, then the presets bottom-up, and never the chat. The analysis
page has one panel and one tab list. The tab list is the direct equivalent of the round page's tab
bar and is what the reported symptom is about, so it is the part to make droppable.

Whether the PANEL should drop too is a real question and is left open: it is the tall part, and
dropping it under a short partner board is what would let the movelist be wider — which is also the
thing that would let `move-bug` cells hold a bigger font. Related to `bughouse-visual-polish` item 2.

### Decision 3: The three permitted differences are named

The gauge track (`* 0.31` on each stack), the clocks, the board letters, and the tab set. Anything
else that differs between the two pages' layout is a defect by definition, which is what makes this
change checkable rather than a matter of judgement.

## Risks / Trade-offs

- **[Making `toolsPlacement` generic risks breaking the round page, which works]** → The round page
  is the reference and must be verified in all three modes before and after. It is also the page
  that cannot be checked in the analysis harness, which is a real cost to this change.
- **[Decomposing `.bug-parts` touches the tab widget]** → `TabbedPanels` currently emits panel and
  tab list together. Splitting them so they can be placed separately must not give the analysis page
  two switchers or lose the keyboard behaviour.
- **[A dropped part changes the height available to the boards]** → On the round page dropping makes
  the decision more true, not less, because a wider preset panel is shorter. That argument has to be
  re-checked for the analysis page's parts rather than assumed.
- **[Portrait is pinned to the viewport]** → A part that drops in portrait adds height where there
  is none to spare. The 148px measured under the partner board is exactly where it would go, but
  that has to be verified rather than assumed to be free.

## Open Questions

- Does the analysis panel drop as well as the tab list, or only the tab list?
- Should the round page's chat rule — the part that never moves — have an analysis equivalent, or is
  every analysis part droppable?
- `toolsPlacement.ts` measures on resize and zoom. The analysis page has its own opinion about when
  boards are measured (`no-observers`, boards measured once); the two need to agree on when a
  re-placement is allowed to run.
