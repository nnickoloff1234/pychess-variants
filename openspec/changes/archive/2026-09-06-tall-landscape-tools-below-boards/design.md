## Context

Tall landscape sizes the left board from the height (`H/10`), caps it by the width when the pair
plus the tools' guaranteed sliver will not fit, and gives the right board what is left down to a
floor of half the left board's square. Every term is in squares of the left board, and the whole
thing is one division — no iteration.

That structure is what this change must not break. The layout spec already forbids circular
sizing ("No grid track is sized from its own occupant", "No grid track is sized by late-arriving
content"), and the obvious implementation of "move the tools down when there is room under the
boards" is exactly circular: the room under the boards depends on the boards' size, which depends
on whether the tools are taking width, which is what we are trying to decide.

## Definitions

Every symbol used below. All lengths are CSS pixels.

### The four homes

The tools sit in exactly one of four places. The boards are side by side in all of them; the names
say where the TOOLS are, and nothing else.

- **BESIDE** — a column of their own, right of the two boards. Three columns across. The only
  arrangement that exists today, and the only one with three columns.
- **BELOW** — a row spanning the full width beneath both boards: the region already called zone B.
- **ZONE A** — the region the right board frees by being smaller than the left: the right board's
  column, below its stack.
- **LAST RESORT** — only the tab strip is placed, in zone A, and the right board joins that strip as
  a "Partner" tab so the panels can borrow its column.

### The unit everything is expressed in

- **L — the left board's SQUARE**, the edge length of one of its 64 squares at full zoom. Every
  other length in the layout is a multiple of it: the board is `8L` across, a pocket row is `L`
  tall, the tools are owed `0.5L` of width. Choosing the arrangement IS choosing L, which is why
  the rule compares two candidate values of it.
- **L_beside** — the value L would take in the BESIDE arrangement.
- **L_below** — the value L would take in the BELOW arrangement.

Neither is a measurement. Both are computed from the viewport before anything is laid out, and the
larger one names the arrangement that is used.

### Viewport terms

| symbol | meaning | source |
|---|---|---|
| `W` | viewport width, excluding any scrollbar | `document.documentElement.clientWidth` |
| `V` | viewport height, excluding any scrollbar | `document.documentElement.clientHeight` |
| `Hdr` | the site header's height, or 0 in the modes that hide it | measured once |
| `H` | the height the STACKS may occupy, `V - Hdr` | `availableStackHeight()` |
| `gaps` | the total width of the gaps between the columns, `0.04 x min(W, V)` | `columnGaps()` |

`H` and `V` are different numbers and both are used: the stacks are budgeted against `H`, while the
gaps are a fraction of `V` because they are `2vmin`, and `vmin` knows nothing about the header.

### Constants

| symbol | code name | value | meaning |
|---|---|---|---|
| `ROWS` | `ROWS_IN_SHORT_LANDSCAPE` | `10` | how many squares TALL a stack is: a pocket row, eight ranks of board, a pocket row |
| `S` | `stackSquares()` | `8` or `8.31` | how many squares WIDE a stack is: eight files, plus `0.31` for the eval gauge on the analysis page |
| `Wt` | *replaces `TOOLS_MIN_SQUARES`* | **2** | how many SQUARES wide the tools need to be worth a column |
| `f` | `RIGHT_MIN_IN_LEFT_SQUARES` | `0.5` | the smallest square the RIGHT board may be given, as a fraction of the left board's |
| `T` | *new* | **3** | how many SQUARES tall the tools need to be worth a row |

`ROWS` and `S` are both counts of the SAME square, along different axes: a stack is `S` squares wide
and `ROWS` squares tall. They differ because a stack is a board plus two pocket rows vertically, and
a board plus an optional gauge horizontally.

### Where the formulas come from

**Width.** The row has to fit `W`. It holds the left stack, the right stack, the gaps, and — only
where the tools have a column — `Wt` squares of tools. The binding case is the one where the right
board has already been pushed to its floor, so its square is `f x L`. Every term being a multiple of
`L` is what makes this one division:

    with a column:      S·L + S·(f·L) + Wt·L + gaps = W   ->  L = (W - gaps) / (S(1+f) + Wt)
    without a column:   S·L + S·(f·L)         + gaps = W   ->  L = (W - gaps) / (S(1+f))

This is today's form with `Wt` in place of `TOOLS_MIN_SQUARES`; the change is the VALUE, from a
half-square that was never a usability measure to a count that is.

**Height.** A stack is `ROWS` squares tall and must fit the height available. That is all of `H`,
except where the tools have taken `T` squares from it first:

    tools below:  L <= H / (ROWS + T)     every other home:  L <= H / ROWS

Note that `T` being in squares puts it in the DIVISOR here too, for the same reason: the row of
tools and the stack above it are both measured in the same unit, so the height divides once.

**Both at once.** A board may exceed neither limit, so each home's candidate `L` is the smaller of
its width and height limits. The width expression is a CAP, not the answer: where the height is the
smaller of the two, the right board is nowhere near its floor and takes the leftover width instead.

## Goals / Non-Goals

**Goals**

- Tall landscape reaches the tools-below arrangement on its own, with no new media query.
- The decision is a closed-form comparison, evaluated before any board is measured.
- The boards spend the width the tools give back, in the same pass.
- Height-scarce viewports — the classic desktop case — are bit-for-bit unchanged.

**Non-Goals**

- Portrait and short landscape. Neither has spare height by construction.
- Making the tools-below arrangement configurable or user-selectable.
- Changing what the tools CONTAIN, or the order parts drop in.

## Decisions

### The two numbers this all reduces to

Everything else is machinery. The design is two constants, **both counted in SQUARES of the left
board**, because the square is the unit the whole layout is built from and the one a reader can
actually see. The question the cascade asks is always "are there enough spare squares beside, below,
or under the right board to put the tools there".

- **`Wt` — how many squares WIDE the tools need to be worth a column.**
- **`T` — how many squares TALL they need to be worth a row.**

**DECIDED: `Wt` = 2, `T` = 3.** Neither was chosen; both are read off the resource table below.

`Wt = 2` is the largest value that leaves every normal desktop the column it has today — the
tightest is 1920x1080 with 2.40 spare squares, so 2 clears it and 2.5 would not. Setting it any
lower would keep columns that are already too narrow to use, which is the whole defect being fixed.

`T = 3` is bracketed on both sides by the two cases that must come out differently: p1 has 0.74
squares under its boards and must NOT qualify, p4 has 5.45 and must. Anything in (0.74, 5.45] would
separate them; 3 sits near the middle of that band rather than against either edge, so neither case
is decided by a rounding error.

For reference in pixels, since the panel's content is text: `Wt = 2` is 204px on a 1920x1080 screen
and 132px at p1's size, against a tab strip that wants 240px for all five labels and a movelist row
of four counter+move pairs that wants about 236px. So a two-square column is comfortable on a
desktop and truncating on a small one — the trade the square unit makes, accepted because
truncation is already specified behaviour for both.

### When does a column count as available

The first test of the cascade is NOT "are there `Wt` spare squares beside two full-size boards".
That was the first formulation and it is wrong: it demands the tools be paid for out of space the
boards were not going to use, when the layout's actual behaviour — and its stated rule — is that the
RIGHT board yields to make room, down to its floor. Measured, the strict form sent the analysis page
at 1920x1080 and 1600x900 straight to the last resort, along with both pages at 1024x640 and 996x730:
the most ordinary desktop sizes there are.

**A column is available when charging `Wt` costs the boards nothing** — that is, when the left
board's square is still the height-derived one after the tools' squares have been put in the
divisor:

    L_col = min( H/ROWS , (W - gaps) / (S(1+f) + Wt) )      column available  <=>  L_col == H/ROWS

The right board absorbs the cost by shrinking a little, which is what it is for; the viewer's own
board does not move. Only when the width is tight enough that even the LEFT board would have to give
way does the column stop being free, and that is the point at which looking elsewhere is worth it.

Quantisation gives this test its tolerance: both sides are rounded to whole device pixels per
square, so "costs nothing" means "same square after quantisation" rather than an exact real-number
equality.

### What the cascade decides, with `Wt` = 2 and `T` = 3

One `Wt` and one `T` serve both pages. The analysis page's stack is 8.31 squares wide against the
round page's 8 — the eval gauge — so it reaches each home at a slightly different viewport, but the
two agree on every size that matters:

| viewport | round page | analysis page |
|---|---|---|
| 3840x2017 | BESIDE | BESIDE |
| 2560x1297 | BESIDE | BESIDE |
| 1920x1080 | BESIDE | BESIDE |
| 1600x900 | BESIDE | BESIDE |
| 1440x789 | BESIDE | BESIDE |
| 1280x720 | BESIDE | BESIDE |
| 1024x640 | BESIDE | BESIDE |
| 996x730 | BESIDE | BESIDE |
| 768x1024 | BELOW — zone B 5.69 sq | BELOW — zone B 6.30 sq |
| 682x647 (p1) | ZONE A — 4.00 x 5.00 sq | ZONE A — 4.15 x 5.00 sq |
| 627x835 (p4) | BELOW — zone B 5.45 sq | BELOW — zone B 6.05 sq |

Every ordinary desktop keeps the column it has today, on both pages. The three viewports that move
are the ones the change exists for, and p1 and p4 land where they were predicted to.

**ZONE A IS ALWAYS 4 x 5 SQUARES** wherever the right board sits at its floor: its width is
`S x f = 8 x 0.5 = 4` and its height is `ROWS x (1 - f) = 10 x 0.5 = 5`, whatever the viewport. So
whether the panel fits zone A is a FIXED question — `Wt <= 4` and `T <= 5` — and both hold with room
to spare. On the analysis page it is 4.15 wide, the gauge's share included.

**Zone B is exactly zero on every height-bound viewport.** The boards fill the height by
construction, so there is no room under them at full zoom. Zone B is a resource that exists only
where the WIDTH is what ran out — which is why it and zone A cover opposite regimes and the cascade
needs both.

### The right board keeps its floor everywhere — and this was never really open

The floor `f = 0.5` exists to stop the right board being squeezed to nothing while the tools take
width. In the two-column homes the tools take none, so the competition it was protecting against is
gone, and the question was whether it still applies.

**It does.** The layout already states that the left board is the viewer's own and never yields, and
that only the right board does; a floor that lapses whenever the tools step aside would mean the
viewer's board shrinks to keep the partner's larger, which is that rule backwards. Raising this as
an open question was a mistake — the answer follows from a rule already written down.

What it costs, measured, is not small, which is why it is worth stating rather than assuming:

| | with the floor (`f = 0.5`) | equal boards (`f = 1`) |
|---|---|---|
| p4 627x835 | own 401px, partner 201px | both 301px |
| p1 682x647 | own 421px, partner 211px | both 316px |

Keeping the floor buys the viewer a third more board and pays for it out of the partner's. Note the
floor is a LOWER BOUND, not a target: the right board takes whatever width is left and only lands on
the floor once the left board's own width cap has begun to bind, which is exactly the point at which
the two start shrinking together.

### Both boards keep their eval gauge in every home, including the last resort

The gauge is part of the right board's stack, so `S` stays 8.31 on the analysis page in every home —
the last resort included, where that stack is about to start being hidden by tab changes. It is a
term of the width formula wherever the stack is a term of it.

Being part of the stack, the gauge is shown and hidden WITH its board: when another tab takes the
column the gauge goes with the board, and both come back together. A gauge left standing beside a
movelist would be reporting on a board that is not on screen.

### When more than one home fits, the earlier one wins

The cascade is an ordered list and the order is the answer. In particular, where the boards are
zoomed out far enough that a `Wt` column is affordable AND zone B has `T` of height, the COLUMN
wins: the tools stay beside the boards, where they are read, rather than moving under them for a
slightly larger board.

This is a preference, not a derivation, and it is reversible: it is one comparison in one function.

### The tools' home: an ordered cascade

The tools take the first home that fits. Each test is a comparison against `Wt` or `T`, and the
whole cascade runs BEFORE either board is sized.

**0. BESIDE — a column of their own, to the right of both boards.** Taken when a column of at least
`Wt` can be had without pushing the boards below what the other arrangements would give them. This
is the three-column layout, and it is the ONLY case that has three columns.

**1. BELOW — zone B, the full-width row beneath both boards.** Taken when the height left under the
boards is at least `T`. Width is never in question there; it is the whole viewport.

**2. ZONE A — the region the right board frees by being smaller.** Taken when zone A is at least
`Wt` wide and `T` tall. Its width is the right board's column, `S x f x L`; its height is how much
shorter the right stack is than the left, `ROWS x L x (1 - f)`. Both are lower bounds on `L`, so
this home is available when the boards are LARGE, which is the opposite of when zone B is.

**3. LAST RESORT — only the tab strip goes to zone A, and the partner board becomes a tab.** When
neither zone can hold the panel, the tab strip alone takes zone A and the right board is entered in
that strip as a "Partner" tab. Selecting any other tab replaces the board with that panel; selecting
Partner shows the board again. The width the panels get is then the right board's own column, which
is the largest single region available once the tools have nowhere else to go.

**In cases 1, 2 and 3 the layout is TWO columns.** Three columns exist only in case 0. That is the
structural statement this cascade makes, and it means the board width equation has exactly two
forms — with a tools column and without.

### The board sizing follows from which home was chosen

    tools in a column:   L = min( H / ROWS      , (W - gaps) / (S(1+f) + Wt) )
    tools below:         L = min( H / (ROWS + T), (W - gaps) / (S(1+f))      )
    tools in zone A:     L = min( H / ROWS      , (W - gaps) / (S(1+f))      )
    last resort:         L = min( H / ROWS      , (W - gaps) / (S(1+f))      )

Zone A costs the boards NOTHING in either axis — it is space the right board has already given up —
which is why the last two lines are identical and why zone A is tried before the last resort rather
than after.

### Detached tabs, as a capability of the widget

**DECIDED, and stated generally rather than for this one panel.** The tab widget gains the notion of
a **detached** tab: absent from the strip, its parts always displayed, its visibility not governed
by which tab is selected — and the state is reversible at runtime, in both directions.

The partner board is then simply the first tab that is detached, and permanently so until the last
resort attaches it. Writing it as "this particular panel is exempt from the strip" would be a
special case wearing the clothes of a rule; the general form costs nothing more and is the thing
worth having.

**It generalises in the direction the layout is already going.** Every panel in the tools area is a
candidate: where a page has room to show one permanently — under the boards, in the region the right
board frees, beside them — it can take that panel out of the strip and give it that room, and put it
back when the room goes away. A movelist on a wide screen and a movelist on a narrow one want
exactly this and today have no way to ask for it. The cascade in this change decides where the tools
GO; detachment is what lets a single panel leave the group.

**Detaching does not move a panel.** The widget contributes no container and every part is
independently mounted, so where a detached panel appears is the page's placement decision, made the
way it makes every other one — an area name and a class. Detachment governs only two things: whether
the strip decides that panel's visibility, and whether its tab is offered in the strip.

**What has to be got right, in order of how likely it is to bite:**

- *Anything that hides "every panel except the selected one"* is where this breaks. The widget
  already resolves switching through the vnodes it retains rather than by selector or traversal,
  which is what makes the change tractable — but the set it acts on has to become "the attached
  tabs" rather than "all tabs".
- *Selection across both transitions.* Attaching a tab selects it, so the panel already on screen
  stays there and the reader is not moved. Detaching the SELECTED tab has to move selection to
  another attached tab, or the strip is left showing nothing.
- *Positions must not renumber.* Ids are generated from a tab's index, so the tablist has to render
  a SUBSET of the tabs rather than a compacted list. A page holding a part reference keeps it.
- *A detached panel is not a tabpanel.* Its tab is not rendered, so `role="tabpanel"` and an
  `aria-labelledby` pointing at a missing element are both false. Detached, a part is a region named
  by its tab's label; attached, it is a tabpanel again.

**For the partner board specifically**, three things follow from the general feature and one does
not. From the feature: it is detached at construction, its tab appears only in the last resort, and
attaching it selects it so nothing visibly changes at the moment the arrangement flips. Not from the
feature: in the last resort the tools panels are placed in the `stack` area — the right board's own
column — which the board panel already occupies. They are never displayed together, so the
one-item-per-area rule holds, and the last resort needs no area that no other home declares.

**A reshown board has moved.** Coming back from behind another panel is a position change, not a
size change, so it is a bounds-clearing event and not a re-measure — the distinction the layout
already draws.

### Neither number may be obtained by measuring the tools

`Wt` and `T` are the only inputs that are not viewport geometry, and both SHALL be declared rather
than measured. The tools' height depends on the width they are given, which depends on which home
they got, which is what the numbers are being used to decide — measuring closes that loop, and the
loop is the circular sizing this layout forbids everywhere else.

Declaring them also makes the cascade a pure function of the viewport, so the same window always
produces the same arrangement whatever order things were laid out in.

### Both arrangements are arrangements of the SAME mode

No media query. The mode stays `(aspect-ratio > 9/16) and (height >= 600px)`; the arrangement is a
class on the app, chosen by the rule, exactly as `drop-tablist` and `drop-tablist-b` are chosen by
the zone tests today. It therefore joins the shared `--bug-zones-*` vocabulary rather than starting
a private one — the same rule the two pages were just unified under.

### The per-part drops still run, inside the chosen arrangement

The whole-area decision and the per-part decision answer different questions and both are needed.
The whole-area rule runs FIRST, from the viewport, and settles how much width the boards get. The
existing per-part machinery runs AFTER, from the measured stacks, and settles which parts sit
beside the board, which drop into zone A, and which into zone B. In the BESIDE arrangement that is
today's behaviour unchanged; in the BELOW arrangement every part starts in zone B and zone A can
still take whichever ones fit its narrower row.

This is what the guidelines describe as p1's case: zone B cannot hold the tools panel there — 80.9px
of spare height against a panel that wants far more — but the tab list alone is 30.3px and already
drops. That stays true and is not affected by the new rule declining to move the whole area.

## Risks / Trade-offs

- **A two-square column shrinks with the board.** `Wt = 2` is 204px at 1920x1080 but 132px at p1's
  size, against a tab strip that wants 240px for legible labels. This is the one place the square
  unit costs something and the cost lands on the smallest screens. Accepted rather than open:
  truncation is already specified behaviour for both the tab strip and the movelist, and those are
  the screens where the tools are about to be moved somewhere better anyway.
- **`T = 3` has never been seen rendered.** It separates p1 from p4 correctly on paper, but no
  tools panel has yet been drawn in a full-width row three squares tall — 150px at p4's square.
  Task 1.2 is to look at one before the number is trusted; if it is wrong, the band (0.74, 5.45]
  says how far it can move.
- **Circular sizing.** The single largest risk, and the reason for the closed-form rule. Any patch
  that "just measures the tools" to decide re-introduces it. The review question for every diff in
  `squareUnit.ts` is: does this read a laid-out element?
- **A visible jump at the crossover.** Around `L_below = L_beside` a few pixels of resize flips the
  whole arrangement. It cannot oscillate — the decision is a pure function of the viewport, so it
  is stable for a given size — but it is abrupt. Hysteresis would fix the jump at the cost of the
  rule no longer being a pure function of the viewport; deferred until seen.
- **`partsWidth.ts` reads the last track.** It takes the tools' width from the app's final column,
  which is zero in the BELOW arrangement. Unfixed, it will conclude the buttons have no room and
  drop their labels — the same class of failure as the oscillation already recorded in the
  stylesheet, and worth checking early.
- **Only ~4% of board.** The board gain alone would not justify this. The case for it is the tools:
  a 30px column against an 81px-tall full-width row on p1, a 125px column against 293px on p4.
- **The 4% is real but small enough to argue about.** If the crossover proves annoying in practice,
  requiring BELOW to win by a margin rather than by any amount is a one-constant change.

## Deferred — short landscape's zone A does not check that the parts fit

The two landscape modes now share one geometry, one template and one cascade. What is NOT settled is
that `toolsHome()` admits zone A on a PROXY — "is it at least `T` squares tall" — rather than on
whether what is going there will fit.

Measured on the round page in short landscape at 682x503:

| | |
|---|---|
| zone A available | 139px (own stack 500 less partner stack 361) |
| chat panel | 0px — squeezed to nothing |
| presets-1, presets-2 | 73px each |
| tab bar | 40px |
| **needed** | **186px, with the chat already at zero** |

Zone A measured 173px against the 150px threshold, so it qualified; the round page's FOUR parts
then did not fit. The analysis page hides it by having two. Short landscape reaches it first because
its header is hidden, so the boards nearly fill the budget and zone A is only what the partner
board's smaller size frees. The page overflows by 44px.

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

Recommendation is 3, with 2 as the stopgap. Left as it stands deliberately — revisit with this
layout.

## Deferred — zone A goes unused while zone B takes everything

The mirror image of the section above. There, zone A was admitted and the parts did not fit; here it
is declared, it fits, and nothing is put in it.

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

This is not the same defect as the section above and SHALL NOT be fixed by the same change. There
the cascade admitted a home the parts could not use; here the cascade never considered a home that
was sitting empty. What is missing is the question "does the largest part fit zone A, and is zone A
worth using before zone B" — asked of the analysis page's two parts rather than the round page's
four.

Three things to settle before touching it:

1. **Whether a part in zone A is even wanted here.** Zone B gives the moves panel 611px of width; a
   move tree and an engine line may genuinely read better wide than tall, in which case the empty
   band is a cost worth paying and the answer is to shrink the row, not fill it.
2. **Whether the row should collapse instead.** If nothing goes there, the `zoneA2` row could be
   zero and the boards or zone B could take the height — which is a different fix from filling it,
   and cheaper.
3. **Whether this is a partner-board-size question.** The band exists only because the partner
   board is smaller. It is the same free space that
   `partner-board-smaller-intent` created on purpose, so the two decisions belong together.

Left as it stands deliberately — revisit with this layout, and with the section above, since both
are questions about what zone A is FOR.

## Open Questions

_None outstanding._ Everything the implementation needs is settled; what remains is verification,
listed as tasks.

### Settled during drafting

- **`Wt` = 2 squares, `T` = 3 squares.** Read off the resource table, not chosen.
- **The right board keeps its floor in every home.** It follows from the rule that the viewer's own
  board never yields; see above for what it costs.
- **The eval gauge stays in every home** and remains a term of the width formula.
- **Where two homes both fit, the earlier in the cascade wins** — so a column beats a row.
- **One `Wt` and one `T` serve both pages.** They reach each home at slightly different viewports
  because the analysis stack is 8.31 squares wide against 8, and that is the gauge legitimately
  costing width — not a reason for a second constant. Checked across eleven viewports: the two pages
  choose the same home at every one.
- **A column counts as available when charging it costs the boards nothing**, not when there are
  `Wt` squares spare beside two full-size boards. The strict form sent ordinary desktops to the last
  resort.
- **The tab widget gains DETACHED tabs** — absent from the strip, always displayed, reversible at
  runtime — as a general capability. The partner board is the first tab to use it, detached until
  the last resort attaches it.
