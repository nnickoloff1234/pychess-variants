# What zone A is for

Carried forward verbatim in substance from `2026-09-06-tall-landscape-tools-below-boards`, whose
"Deferred" sections these were. The measurements are the ones taken then; nothing has been re-run.

## Direction one — zone A is admitted and the parts do not fit

`toolsHome()` admits zone A on a PROXY — "is it at least `T` squares tall" — rather than on whether
what is going there will fit.

Measured on the round page in short landscape at 682x503:

| | |
|---|---|
| zone A available | 139px (own stack 500 less partner stack 361) |
| chat panel | 0px — squeezed to nothing |
| presets-1, presets-2 | 73px each |
| tab bar | 40px |
| **needed** | **186px, with the chat already at zero** |

Zone A measured 173px against the 150px threshold, so it qualified; the round page's FOUR parts then
did not fit. The analysis page hides it by having two. Short landscape reaches it first because its
header is hidden, so the boards nearly fill the budget and zone A is only what the partner board's
smaller size frees. The page overflows by 44px.

`toolsHome()` cannot be fixed by measuring — it must stay a pure function of the viewport, which is
what keeps the boards from depending on a quantity derived from the boards. Three ways out, in
increasing order of size:

1. **Let zone A clip**, as the tools column already does when squeezed. Cheapest and consistent with
   every other bargain here; the cost is a chat panel at zero height beside fully drawn presets.
2. **Make `T` depend on the page's part count.** The round page needs more squares of zone A than
   the analysis page does. Keeps `toolsHome()` pure — a part count is a page fact, not a measurement
   — at the cost of one more constant.
3. **Run the per-part cascade inside the zone A home**: parts drop into zone A while they fit,
   cumulatively, and the rest stay in zone B. Reuses the machinery the beside home already has and
   is the most faithful answer, but it is the largest change.

Recommendation was 3, with 2 as the stopgap.

## Direction two — zone A fits and nothing is put in it

The mirror image. Here it is declared, it fits, and nothing is placed there.

Measured on the ANALYSIS page at 629x830, `tools-below strip-in-zoneb`:

| | |
|---|---|
| own stack | 399 x 480 at (3, 60) |
| partner stack | 199 x 240 at (414, 60) — half the own stack's height |
| **zone A2** | **199 x 240, y 300-540 — EMPTY** |
| zone B1 | 611 x 260 at (3, 540) — holds the only visible tab panel |
| zone B2 | 611 x 29 — the tab strip |

The partner board is deliberately smaller than the own board, so it frees a column-wide band beside
the own stack that is fully half the partner stack's height again. `zoneA2` is declared in the
template and sized by the row, and the moves panel went past it into zone B, leaving 199x240 of
black beside a board.

What is missing is the question "does the largest part fit zone A, and is zone A worth using before
zone B" — asked of the analysis page's two parts rather than the round page's four.

Three things to settle:

1. **Whether a part in zone A is even wanted here.** Zone B gives the moves panel 611px of width; a
   move tree and an engine line may genuinely read better wide than tall, in which case the empty
   band is a cost worth paying and the answer is to shrink the row, not fill it.
2. **Whether the row should collapse instead.** If nothing goes there, the `zoneA2` row could be
   zero and the boards or zone B could take the height — a different fix from filling it, and
   cheaper.
3. **Whether this is a partner-board-size question.** The band exists only because the partner board
   is smaller, which is deliberate. The two decisions belong together.

## Why they are one change

Both ask what zone A is FOR, and an answer to either constrains the other. A cascade that places
parts in zone A while they fit (direction one, option 3) answers direction two as a side effect: the
analysis page's moves panel would go there when it fits, and the row would hold something. Deciding
them separately risks two mechanisms for one region.

## Open Questions

- Which of the three ways out of direction one.
- Whether "zone A is used before zone B" is true in general, or only for parts narrow enough that
  zone B's extra width buys them nothing.
- Whether a collapsed zone A gives its height to the boards or to zone B.
