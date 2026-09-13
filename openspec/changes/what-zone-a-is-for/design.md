# What zone A is for

Two directions were carried here from `2026-09-06-tall-landscape-tools-below-boards`. They have since
been re-measured, and the change has grown a third part: a LOG of the layout defects this work turns
up, because looking hard enough at the two stacks to decide zone A's rules is what finds them.

## Direction one — zone A is admitted and the parts do not fit — FIXED

`toolsHome()` admitted zone A on a PROXY — "is it at least `T` squares tall" — rather than on whether
what was going there would fit. Measured then, on the round page in short landscape at 682x503:

| | |
|---|---|
| zone A available | 139px (own stack 500 less partner stack 361) |
| chat panel | 0px — squeezed to nothing |
| presets-1, presets-2 | 73px each |
| tab bar | 40px |
| **needed** | **186px, with the chat already at zero** |

The page overflowed by 44px. What fixed it was the cumulative cascade in `toolsPlacement.ts`: each
part is charged against `zoneAUsed + height <= zoneA`, so parts enter zone A one at a time while they
fit and the rest stay where they were. Admitting the HOME no longer promises that four parts fit;
each part's own entry does. Re-measured 2026-09-12: no overflow.

The three ways out recorded at the time are kept for the record — clip, part-count `T`, or the
per-part cascade. The cascade is what happened, which was the recommendation.

## Direction two — zone A fits and nothing is put in it — REAL

Re-measured 2026-09-12 on the analysis page at 701x829: **zone A 177 x 291, declared, sized, and
empty**, with the only visible tab panel in zone B below both boards.

Three things to settle, unchanged in substance:

1. **Whether a part in zone A is wanted at all here.** Zone B gives a panel the width of both boards;
   a move tree may read better wide than tall, in which case the answer is to shrink the row rather
   than fill it.
2. **Whether the row should collapse**, and whether its height then goes to the boards or to zone B.
3. **Whether this is a partner-board-size question.** The band exists only because the partner board
   is smaller — and after Finding 1, how much smaller is a decision nobody has taken.

## The partner board's size

DECIDED, 2026-09-12: the partner board is always as big as possible; it shrinks ONLY because the
tools area's minimum width cannot otherwise fit; its floor is HALF the main board's square; and below
that floor it stops being a board beside the other and becomes an attached tab in the tab list.

That is a CASCADE with a defined end, and it makes zone A a by-product rather than a decision:

    both boards at the height's answer
      -> tools column below its minimum?  shrink the PARTNER board, never the main one
        -> partner board at 50% of the main board and the tools still do not fit?
          -> the partner board becomes a tab, and the tools take its column

`squareUnit.ts` implements the first step and diverges at every one after it.

### 1. The right board's allowance has NO TOOLS TERM — deliberately, and against the rule

```js
function rightStackWidthAllowance(leftUnit) {           // squareUnit.ts
    return Math.max(0, availableWidth() - stackSquares() * leftUnit - columnGaps());
}
```

Its own comment says why: "The boards are allocated the whole width and the tools take what is left
— see `toolsHome()`. Charging them here is what made the tools impossible to displace: an allowance
defined as 'what fits once the tools are paid for' leaves exactly the tools' minimum beside it BY
CONSTRUCTION, so the test for whether a column is affordable passed at every viewport and the other
homes were unreachable."

So today the partner board shrinks because the WIDTH cannot hold two full stacks, not because the
tools' minimum cannot fit; and when the tools' minimum cannot fit, what moves is the TOOLS — to zone
B, then zone A, then the last resort. The rule says the opposite order: the partner board yields
first, and only when it has nothing left to yield does anything else change.

The regression that comment records is real and the new rule has to avoid it: an allowance that pays
the tools first, with no floor, leaves the tools' minimum beside the boards at every viewport and no
other home is ever reachable. The floor is what makes the difference — a partner board that stops at
50% cannot keep paying, so the cascade has an end and the other homes stay reachable.

### 2. Below the floor, the MAIN board shrinks — the rule says the partner board becomes a tab

```js
const RIGHT_MIN_IN_LEFT_SQUARES = 0.5;                  // the floor is already stated, and is 50%
function leftStackWidthCap(dpr) {                       // and below it the LEFT board yields too
    const perLeftSquare = stackSquares() * (1 + RIGHT_MIN_IN_LEFT_SQUARES);
    return squareUnit((Math.max(0, availableWidth() - columnGaps()) / perLeftSquare) * FILES, FILES, dpr);
}
```

The floor exists and it is half the main board's square, which is the rule's number exactly — but
what happens AT the floor is that the pair starts shrinking together ("Below it the left board yields
too — so the pair shrinks together from there rather than one of them vanishing"). Under the rule the
main board never yields: the partner board becomes a tab and the main board keeps the height's
answer.

### 3. The last resort is reached by a different test

```js
if (zoneAHeight >= left) return 'lastResort';            // else fall through to 'beside', clipped
```

`toolsHome()` reaches the last resort only where zone A is already at least one square tall — that
is, where the partner board is ALREADY smaller — and otherwise returns `beside` with a column that
clips, on the reasoning that "tabbing the partner board away is a far larger loss". The rule names
the trigger directly: the partner board is at its floor and the tools still do not fit. Those are not
the same condition, and the rule's is the one that can be stated without measuring anything.

### An inconsistency found while reading this

`leftStackWidthCap()`'s comment solves `S x L + S x (f x L) + t x L + gaps = width`, with `t` the
tools' sliver — and the code divides by `S x (1 + f)` with no `t`. The cap is therefore
`TOOLS_MIN_SQUARES` squares more generous than its own derivation says. Which of the two is right
falls out of gap 1 above, so it is fixed there rather than separately.

### Left open

`MIN_STACK_IN_LEFT_SQUARES = 4` — the ZOOM floor, four squares of the main board's stack, Nikolay's
number from 2026-09-05 — is a different quantity from the 50% width floor and is not covered by the
rule above. A reader zooming their partner board down is an explicit choice, not the layout deciding
for them, so the two floors may legitimately differ; it needs saying either way.

## Zone A is not one band

Made concrete by Finding 1, and it reframes the whole question:

- **Tall landscape** (`height >= 600px`): each board is drawn at its own allowance scaled by its own
  ZOOM. Zone A is what a deliberately zoomed-down partner board frees, so its size is the reader's
  choice and can be anything from zero to most of the column.
- **Short landscape** (`height < 600px`): there is no zoom. `--bug-sq-b` is
  `min(--bug-sq, shortRight)`, where `shortRight` is what the WIDTH leaves after the own stack, the
  tools minimum and the gaps. Zone A therefore exists only under width pressure — at 1276x430 there
  is no pressure and the two boards are equal, so **zone A is zero**.
- **Portrait**: the partner board is `PARTNER_HEIGHT_FRACTION` of the height by construction, so the
  band is always there and always the same fraction.

One rule cannot be right for all three: in tall landscape the band is a reader's choice, in short
landscape a symptom of a narrow window, and in portrait a constant.

## The width sweep, before and after the cascade

Floated window, analysis page, game `JJgZzLhJ`, `h = 639` CSS (tall landscape, header 60px), the
partner board's ratio `B/A` and the tools column's width beside it. The tools' minimum here is
`TOOLS_MIN_SQUARES * a` = 2 x 57.34 = **115px**, and the floor is 0.50.

| width | BEFORE: home / B:A / column | AFTER: home / B:A / column |
|---|---|---|
| 1300 | beside / 1.00 / 260 | beside / 1.00 / 260 |
| 1100 | beside / 1.00 / 122 | beside / 1.00 / 122 |
| 1000 | beside / 1.00 / **22** | beside / 0.80 / 116 |
| 940 | — | beside / 0.67 / 117 |
| 900 | **lastResort** / 0.83 / 0 | beside / 0.59 / 115 |
| 880 | — | beside / 0.55 / 118 |
| 820 | — | zoneA / 0.66 / 0 |
| 800 | zoneA / **0.62** / 0 | zoneA / 0.62 / 0 |
| 700 | zoneA / **0.49**, main board shrunk 57.34 -> 54 | **lastResort** / 0.42, partner board a TAB |
| 620 | — | lastResort / 0.24, a tab |

BEFORE, three things were wrong and all three are the rule's steps: the tools column was left at
**22px** against a 115px minimum while both boards stayed full size; the partner board was tabbed
away at **0.83**, far above the floor, and then NOT tabbed at 0.62 and 0.49; and at 700 the MAIN
board shrank — `leftStackWidthCap()` engaging, the pair shrinking together.

AFTER, the sequence reads as the rule: equal boards while the width allows; the partner board paying
for the column down to its floor; the tools leaving the row once even the floor cannot pay, at which
point the partner board goes back UP because it is no longer paying for a column; and the tab only
once the width cannot hold the pair with the partner board at its floor.

The round page follows the same cascade, measured at the same heights: 1300 -> 1.00 beside, 1000 ->
0.87 with a 116px column, 820 -> 0.70 in zone A, 700 -> 0.47 and the partner board showing as the
selected "Partner board" tab beside the strip. Its own tab part correctly keeps `display: 'block'`.

### The cap the rule needs, found by looking at p2

The first implementation took the rule literally — the viewer's board never shrinks — and deleted
`leftStackWidthCap()` outright. Measured at **701x829**, the shape p2 is floated to for zone-A work:
the height's answer gave a 76.5px square, the own stack asked for 635 of 701 available, and the
partner board and the tools had **37px between them**. The partner board came out 36x94, the tab
strip was a 37px vertical sliver, and the tools had no home at all — `lastResort` chosen because
nothing else fitted, in a column that could not hold the tools either.

The distinction the rule needs, and it is a narrow one: the viewer's board does not shrink **to pay
for the tools**, but it cannot take a width that leaves the partner board no room to EXIST beside it.
Two boards side by side is the only arrangement these landscape templates have. So the ceiling is the
width at which the partner board sits exactly on its floor — the old cap's formula, restored with the
rule's justification rather than "the pair shrinks together":

    S x L  +  S x (f x L)  +  gaps  =  width    =>    L = (width - gaps) / (S x (1 + f))

`701x829` then gives a 432px own board, a 216px partner board on its floor, and the tools the
full-width row below both — measured after the fix: `below`, own 427, partner 171 (its allowance is
on the floor; the 0.40 drawn ratio is p2's own 66% partner zoom on top of it), zone A 177x304, no
overflow.

**It also resolves the comment-versus-code mismatch** noted below: the cap has no tools term, and the
code was right to omit it. The cap guarantees two BOARDS fit; the tools' minimum is what the cascade
spends the partner board's slack on, and where it cannot be met beside the boards they go below them
or into zone A.

Re-swept on p2 after restoring it, `h = 852`, partner zoom 66%:

| width | home | own | partner | drawn ratio | zone A |
|---|---|---|---|---|---|
| 1333 | beside | 633 | 356 | 0.56 | 287 |
| 1147 | zoneA | 633 | 334 | 0.53 | 314 |
| 1013 | zoneA | 626 | 249 | 0.40 | 412 |
| 880 | zoneA | 540 | 213 | 0.39 | 349 |
| 747 | below | 455 | 185 | 0.41 | 322 |

No slivers, no `lastResort`, no app overflow at any of them. The sub-0.5 ratios are the reader's zoom
on an allowance already at its floor, which the rule explicitly leaves to the reader.

### What the sweep exposed that the rule does not settle

**`TOOLS_MIN_SQUARES = 2` now costs a board.** Before, an unaffordable column moved the tools; now
the partner board pays for it, so the value of the minimum decides how much board is spent. Measured
at 1000x639 the column is 116px, and what is in it is: an engine switch, "Fairy-Stockfish 11+ in
local browser" over four lines, a clipped slider, an unreadable 60px PV block, and a movelist about
60px wide — for 20% of the partner board. Whether two squares is still the right minimum is now a
decision with a visible price. Four squares would keep the beside home only while the column is
usable and hand over to zone A sooner.

**Beside is still preferred over below, even when below costs nothing.** Where the height has room
for zone B, the tools could go there with BOTH boards full size; the cascade shrinks the partner
board to keep the column instead, because `beside` is first in the preference order. The rule permits
it — the column's minimum genuinely does not fit — but "as big as possible" could equally be read as
"prefer the home that costs no board at all". Not changed, and listed in Open Questions.

## What goes into zone A, and how a part says what it needs

### The ladder: both regions are used at once, in every home

Nikolay, 2026-09-12, looking at p2: "if we are in this case and there is room in zoneB we should
allow more than just the tablist to go there, for example the control buttons can go there now and
make even more room for the movelist. if there was even more height we could put there the engine
panel. eventually with even more height they should swap and the movelist should go there and the
control buttons and engine should go to under partner board."

A home used to take the WHOLE panel: everything into `zoneB1`, or everything into `zoneA2`. That
leaves the other region empty and one part paying for it — measured on p2 at 701x744, the move list
squeezed into 144px of a 258px band it shared with a button row and an engine box, while the full
width under both boards held nothing but the tab strip.

So the home now decides where the MOVE LIST goes, and the two fragments are offered the other region
one at a time while it has room. Every fragment that moves hands its height to the list.

**THE ORDER IS OPPOSITE IN THE TWO DIRECTIONS, and it is not an inconsistency:**

- into the BAND, which costs the boards nothing, the part that frees the most goes first — the engine
  box before the controls, which is the `droppable` order;
- into ZONE B, which takes its height from both boards, the CHEAPEST goes first — the 40px button row
  before the 74px engine box, the same list backwards.

Two class families, one per region, meaning the same thing in every home: `drop-<part>` says the part
is in zone A, `drop-<part>-b` says it is in zone B. The AREAS are the same in every home too —
controls `zoneA2`, engine `zoneA3` — so only the home's default differs. Zone B's tenants keep one
order as well: list, controls, engine, strip. Two templates each gained a row for it
(`--bug-zones-zonea` a third zone B row, `--bug-zones-below` a second zone A row), and an unoccupied
row still collapses to nothing.

**Measured on p2, 701 wide, the whole ladder:**

| viewport | zone B room | classes | move list | controls | engine | strip |
|---|---|---|---|---|---|---|
| 652 | 59 | `tools-zonea` | band, 144 | band `zoneA3` | band `zoneA4` | `zoneB3` |
| 684 | 91 | + `drop-controls-b` | band, **184** | **`zoneB1`**, 686 wide | band `zoneA4` | `zoneB3` |
| 744 | 151 | + `drop-engine-b` | band, **258** — the whole band | `zoneB1` | **`zoneB2`** | `zoneB3` |
| 812 | 219 | `tools-below` + `drop-engine` + `drop-controls` | **`zoneB1`, 686 wide** | **band `zoneA2`** | **band `zoneA3`** | `zoneB2` |

No overflow at any step, and each step is the previous one plus exactly one part moving. The last row
is the swap: the list takes the full-width row and both fragments go up into the band.

One correction the measurements forced: in the `below` home the own stack spans the band's rows, so
grid handed its leftover to them — a 40px button row drawn 88px tall and the engine box 122 against
its 74. `align-self: start` packs them to the top of the band instead, so a part is its content
height and the slack collects at the bottom of zone A, where it reads as the empty part of the band.

The round page is untouched by all of it: its `Droppable` entries name no zone B class, so it has no
fragments and the new pass does nothing. Verified at 701x652, where it sits in `tools-lastresort`
with the partner board as a tab — rows `296 / 264 / 0 x 6`, no overflow.

### The framework: a part declares its minimum in CSS, `toolsPlacement` reads it

The decision used to consult ONE number per part — its measured current height — and never its
width. Now each arrangeable part may declare what it needs, in the stylesheet, beside the rules that
produce its content:

```css
@property --bug-part-min-w { syntax: '<length>'; inherits: false; initial-value: 0px; }
@property --bug-part-min-h { syntax: '<length>'; inherits: false; initial-value: 0px; }

.analysis-app.bug .analysis-engine-panel   { --bug-part-min-w: 19ch;  --bug-part-min-h: 3.2em; }
.analysis-app.bug .analysis-controls-panel { --bug-part-min-w: 13ch;  --bug-part-min-h: 40px; }
```

Three things make this the right shape, and all three were measured rather than assumed:

1. **`@property` is what lets JS read it as pixels.** An unregistered custom property computes to
   the token it was written as — `getPropertyValue` hands back the string `"18ch"` and the caller
   would have to resolve `ch` itself. Registered with `syntax: '<length>'`, the browser resolves it
   at computed-value time: measured, `18ch` -> **144.143px** at a 14px font and
   `calc(var(--bug-own-sq) * 2.4)` -> **102.408px**.
2. **They are custom properties, not `min-width`/`min-height`.** A real minimum would bind the
   LAYOUT: the parts are allowed to be clipped in a column too narrow for them — the standing
   bargain everywhere here — and a `min-width` would instead overflow the track or widen it. These
   say what a part NEEDS without saying what it must be given.
3. **The initial value of 0 makes it opt-in.** A part that declares nothing is charged its measured
   height and passes the width test, which is exactly what every part did before. The round page's
   three parts are untouched.

The numbers come from the parts' own intrinsic widths, measured with a `width: min-content` probe:

| part | min-content | max-content | declared |
|---|---|---|---|
| engine box | 147.7px | 276.7px | `19ch` = 152px |
| move controls | 100.8px | 100.8px — nothing wraps | `13ch` = 104px |
| move list | 16px — shrinks to nothing by design | 16px | nothing: it never leaves |

The engine box's binding row is not the PV lines — `min-width: 0` and ellipsis let those shrink to
nothing — it is the Multiple-lines row: label, slider, readout side by side. The controls are six
buttons at `site.css`'s `height: 40px` and `font-size: 1em`; this page's buttons are NOT the round
page's `calc(var(--bug-own-sq) * 2 / 3)`, so the row is a font-and-pixel quantity and `ch` is the
honest unit. Both need re-measuring if their content changes, which the CSS comments say.

### The order is the template's, not a preference

Zone A grows UPWARDS from the bottom: the partner stack is drawn from the top of the rows it spans,
so a slot can only be taken from the last row it does not need — `--bug-zones-a4`, then `a34`, then
`a234`, replacing `zoneTools4`, then `3`, then `2`, and never `zoneTools1`. A part's row is
therefore its place in the queue, and the column's reading order is the queue backwards:

| row | part | leaves |
|---|---|---|
| `zoneTools1` | the move list | never — the only row no template takes |
| `zoneTools2` | the move controls | third, to `zoneA2` |
| `zoneTools3` | the engine box | second, to `zoneA3` |
| `zoneTools4` | the tab strip | first, to `zoneA4` |

So the analysis page's tools column now reads **move list, controls, engine, strip** — the engine box
has moved from the top to just above the strip. That is the cost of "engine before controls", which
is the decision: the engine box is the taller of the two, so moving it frees the most for the list,
which is the part that actually wants the height.

`.bug-tool-group` is `display: contents` in this home — the parts are grid items of the app and an
area name moves one — and a real box in the three homes where every part shares one area. That is
`.bug-presets-group`'s pattern, and the reason the group was introduced in
`movelist-tab-fragments` now holds in reverse.

### Zone B is the fallback, and only the engine box asks for it

A part opts in by naming a third class in its `Droppable` entry. Zone A is tried first because it
costs the boards nothing — it is height the shorter board was never going to use — while a zone B
row takes height from both. `zoneB2` is the strip's, so the engine takes `zoneB1` and the controls
have no zone B row at all. Where zone B is already the tools' HOME (`tools-below`) none of it
applies: the whole panel is there and the parts are one box again.

### Measured, four viewports

| viewport | home | zone A | where the parts went |
|---|---|---|---|
| 1276x430 | beside | 355 x **0** | nothing drops: move list `zoneTools1`, controls `zoneTools2`, engine `zoneTools3`, strip `zoneTools4` |
| 900x639 | beside + all three drops | 283 x 233 | strip `zoneA4`, engine `zoneA3` (411x75), controls `zoneA2` (411x40); move list keeps the column |
| 1300x639, both boards zoomed to 70% | beside | 332 x **0** | zone A cannot help, so zone B does: strip `zoneB2`, engine **`zoneB1`** (950x77); controls stay |
| 1000x779 | zoneA (the home) | 371 x 267 | the whole panel is in the band, the group a box again: list, controls, engine stacked |

No app overflow at any of them; the 6px and 103px of document overflow at 1000 and 900 are the site
header (Finding 3).

### AND ONE THING THE MEASUREMENTS RAISE

At 900x639 the arrangement is honest but lopsided: the engine box and the controls take a 411px band
while the MOVE LIST — the part that most wants width, four counter-and-move cells to a row — is left
in the 115px column the boards allowed. The parts that left are the ones that read fine narrow; the
part that stayed is the one that does not. That is open question 2.3 (is zone A preferred to zone B
in general, or only for parts that gain nothing from zone B's width) arriving from the other side:
here it is the part that STAYED that needed the width. Two candidate answers — let the move list be
the part that takes a wide zone A, or send the whole panel below at that viewport — and both are
decisions, so neither is in the code.

## Findings

### 1. The analysis page's partner stack was laid out as a block, not as the grid its sheet declares

**Mechanism.** The partner board is a detached tab part (`analysis.ts`), and `TabPartDef.display` is
written as an INLINE style by `tabs.ts` — it has to be, because the sheet hides unselected panels and
showing one again cannot just clear the inline value. Inline beats the sheet, so that one word
decides what the element IS:

```css
/* bughouse.css:877 */  .analysis-app.bug .bug-own-stack,
                        .analysis-app.bug .bug-partner-stack { display: grid; … }
/* bughouse.css:902 */  … { grid-template-columns: calc(var(--bug-stack-sq) * 8)
                                                   calc(var(--bug-stack-sq) * 0.31); }
```

The part said `display: 'block'`, copied from the round page, where a stack IS block flow and that is
load-bearing. Here it meant the stack was not a grid, so neither the 8-square board column nor the
gauge column existed. `.cg-wrap` resolves its height from percentage padding against its own width —
with no definite width it takes whatever its grid area gives it, and the app's short-landscape
template hands the slack to the tools: `grid-template-columns: auto auto minmax(0, 1fr)` with
`min-width: 0` on the stacks, so the second track fell to the stack's max-content, which with no
board width is just the seat strip's.

**Measured, 1276x430, game JJgZzLhJ:**

| | `display: block` | `display: grid` |
|---|---|---|
| app columns | 354.6 / **225.1** / **679.1** | 354.6 / **354.6** / **549.6** |
| board A | 341 x 341 | 341 x 341 |
| board B | **225 x 225** | **341 x 341** |
| partner stack height | 324 | 427 |
| `#gauge` | 13 x 341, in the board's row | 13 x 341 |
| `#gaugePartner` | **225 x 0**, in block flow | **13 x 341**, in the board's row |
| partner pockets | 213 (5 squares) beside a 225 board | 213 beside a 341 board |
| zone A | 103 | **0** |
| tools column | 679 | 550 |
| page overflow | none | none |

**What it says about zone A.** The band we had been measuring on this page was largely manufactured:
not a partner board someone chose to draw smaller, but a board whose stated width was dropped on the
floor. `--bug-sq-b` and `--bug-tall-sq-b` — the whole per-board allowance, and board B's zoom slider
with it — were computed, published, and ignored for the board itself.

**The lesson, which is why `tabs.ts` gained a paragraph.** A part's `display` is a layout statement
made in TypeScript that silently overrides CSS. Nothing warns; the element simply lays out as
something else. The value a page declares there has to be the one its own stylesheet needs, not the
one a similar part on another page uses.

**Not verified.** Portrait. The same declaration now lets the portrait rules'
`calc(var(--bug-stack-sq) * 8)` reach the partner stack, with `--bug-stack-sq:
var(--bug-portrait-partner-sq)` — which is published and correct, but portrait cannot be reached in
the tiled harness window, so it is a task here rather than a claim.

### 2. The engine row's min-content exceeds the tools column's minimum

At a 116px column the multipv row lays out 136px wide — label "Multiple lines" 82px, the readout
27px, and the slider between them — so the readout's layout box ends 20px past the column. It is
CLIPPED, not overhanging: `.bug-tool-group` carries `overflow: hidden`, the group's `scrollWidth`
equals its `clientWidth`, and the screenshot shows the slider cut at the column's edge. The document's
own 6px of overflow at that width is the site header, not the app.

So nothing escapes, and what the reader sees is a control they cannot fully use in a column two
squares wide. It is the same symptom `bughouse.css` already records at line 1121 — "the ENGINE's
multipv value x=1021" — and the same bargain: a column below the minimum clips. Recorded rather than
fixed, because the right fix depends on the `TOOLS_MIN_SQUARES` decision above: a wider minimum makes
it disappear, a narrower label makes it fit, and clipping is acceptable if the minimum stays at two.

### 3. The shared site header overflows between roughly 750 and 1050 CSS px — NOT OURS

Measured on both pages: at 820 the document's `scrollWidth` is 1001 against an 820 viewport, and the
elements past the edge are `.site-buttons`, `#search-input`, `#username`, `#challenge-panel`,
`#notify-panel`, `#settings-panel` — the full site header, which does not fit and does not collapse.
At 700 the header switches to its hamburger form and the overflow is zero; above about 1050 it fits.
The bughouse app itself is inside the viewport at every width in the sweep.

**Variant-agnostic and upstream's**, not this change's: it is the shared header on every page of the
site at those widths. Noted here only so the next sweep does not re-diagnose it as a layout defect —
a horizontal scrollbar at 820 is the header, and the app's own overflow has to be measured against
the app.

### 4. The side margins on a narrow viewport: `place-content: center` over a content-sized column

Asked of p2 at 701x829, where the boards had just been squeezed and yet 26.4px of each side was
empty. Measured, the chain is short and neither half is a bug on its own:

```css
/* site.css:393 */
#main-wrap {
  display: grid;
  grid-template-columns: var(--main-margin) 1fr minmax(auto, var(--main-max-width)) 1fr var(--main-margin);
  place-content: center;          /* <- this is the one that survives */
}
/* bughouse.css:4057 */
#main-wrap.bug {
  display: grid;
  grid-template-columns: minmax(auto, auto);   /* ONE content-sized track */
  grid-template-areas: 'main';
}
```

The bughouse override replaces the site's five tracks with ONE column sized `minmax(auto, auto)` —
content, not `1fr` and not `100%` — and does not touch `place-content: center`. So the wrapper is
701.3 wide, its single column is exactly the app's content (648.6), and the 52.7 nobody claimed is
centred as two equal margins. Nothing "enforces" the gaps; they are the width no track asked for,
parked in the middle. The app's own `justify-content: center` is inert here: its tracks sum to
exactly its box.

WHO LEAVES THE WIDTH UNCLAIMED, measured:

| | |
|---|---|
| own stack | 443.2 = 8.31 x 53.34 |
| partner stack | 177.3 = 8.31 x 21.34 — its ALLOWANCE is 26.67 (the floor); 21.34 is the drawn size |
| column gaps | 2 x 14.03 = 28.05, one of them charged for a THIRD TRACK THAT IS 0 WIDE |
| app | 648.6 in a 701.3 wrapper -> 52.7 unclaimed |

- ~44.3px of it is the partner board's ZOOM handing width back: p2 stores 66%, clamped up to 78% by
  the zoom floor, so the stack draws 177.3 where its allowance would take 221.6.
- ~14.0px is the gap charged either side of the empty tools track.
- the remainder is the own board's quantisation: the cap offered 53.99 per square, the device-pixel
  grid gave 53.34, which is 5.4px across the stack.

At 100% partner zoom the margins come to about 4px, so the layout does fill a narrow viewport; what
p2 shows is mostly a reader's zoom whose freed width is given to nobody.

THE QUESTION IT RAISES IS THIS CHANGE'S. `toolsHome()` already treats a zoom as freeing space for the
TOOLS — "a reader who zooms out to make room expects the room to be used" — but nothing gives that
width back to the viewer's own board, and nothing removes the gap for a zero-width track. Both are
decisions, not oversights, and both belong with the zone-A rules.

### 5. A single-board phone breakpoint was hiding both eval gauges — FIXED

Asked of p2 at 701x829: the gauges were gone on the ANALYSIS page, which is the one page that has
them. The rule was not ours:

```css
/* analysis.css:129 */
@media (max-width: 799px) and (orientation: portrait) {
    #gauge, #gaugePartner { display: none; }
}
```

The single-board page's rule for a phone held upright, reaching this page because this page loads
that stylesheet. Its `orientation: portrait` is the VIEWPORT's aspect — taller than wide — while
every mode decision in `bughouse.css` is made on `aspect-ratio > 9/16`. The two disagree across a
whole band of shapes, and 701x829 (aspect 0.846) is in it: this file was in LANDSCAPE and both
stacks were reserving their gauge column — 16.5px in the own stack, 8.5px in the partner's, the 0.31
of `8.31` that the width formula pays for — while that rule had already set both gauges to
`display: none`. Two empty slivers, no gauges, in a mode whose width budget includes them.

Fixed by re-asserting them for this page inside this file's own landscape block:

```css
.analysis-app.bug #gauge, .analysis-app.bug #gaugePartner { display: block; }
```

Scoped to landscape deliberately, so bughouse PORTRAIT still hides them with its own rule — which
also drops the reserved column, keeping the width exact. Measured after: `#gauge` 17x427 beside the
own board, `#gaugePartner` 9x220 beside the partner's, no overflow.

**SECOND TIME THAT EXACT QUERY HAS REACHED ACROSS.** `--movelist-max-height` was the first, and the
note on `.analysis-app.bug .movelist-block` records it: "analysis.css pins this element to
`--movelist-max-height` (8rem) under `max-width: 799px and (orientation: portrait)` — a single-board
rule that reaches this page too". Worth a sweep of `analysis.css` for every other rule under that
query before this change is archived.

### 6. The `analysis.css` sweep — one defect, the rest inert or benign

Task 1.8, done by auditing the live page rather than by reading: for every rule in `analysis.css`,
the audit asked whether its media query matches, whether its selector hits an element inside
`.analysis-app.bug`, and whether the value it asks for is the COMPUTED value — i.e. whether that
foreign rule is the one in force. Run at 701x829 (both narrow queries on) and at 1276x430 (the
`min-width: 800px` band).

| analysis.css | rule | reaches the two-board page? |
|---|---|---|
| `(max-width:799px)` | `#main-wrap { --main-max-width: 100% }` | in force and INERT — `#main-wrap.bug` declares its own single `minmax(auto, auto)` column and nothing reads the variable |
| | `.analysis-app { grid-template-rows: auto; grid-template-areas: <11 single-column rows> }` | OVERRIDDEN in every mode by `.analysis-app.bug` — verified at both viewports |
| | `under-left { display: none }` | in force, and AGREES: this page hides the spectator list itself |
| `(min-width:800px) and (min-height:500px)` | `.analysis-app { --board-scale }` | inert — no consumer in `bughouse.css`, only comments mentioning it |
| `(min-width:800px)` | `.analysis-app { grid-template-columns, grid-template-rows }` | OVERRIDDEN — verified at 1276x430 |
| `(max-width:799px) and (orientation:portrait)` | `#gauge, #gaugePartner { display: none }` | **THE DEFECT — see Finding 5, fixed** |
| | `.movelist-block { flex: initial; height/max-height: var(--movelist-max-height) }` | reaches us, already OVERRIDDEN by `.analysis-app.bug .movelist-block` — the note there records it |
| | `.pv-hover-board { left: 0 }`, `.pv-hover-board .cg-wrap { width: 200px }` | CANNOT reach: `pvHoverPreview` is single-board only and the element is never rendered here |
| | `pvline { padding-left: 0 }` | reaches us once the engine has lines — the two-board engine does render `pvline` — and is BENIGN: 6px of left padding dropped in a narrow column, which is what a narrow column wants |

The variables `analysis.css` sets on `#main-wrap` with no media query were audited too, since they
reach this page unconditionally:

- `--ranks-top: 0`, `--files-left: 0` — the same as `extensions.css`'s root values. No-ops.
- `--pocketMargin: 0` against the root's `10px` — MEASURED on both pages: the pocket margins compute
  to 0 either way and both stacks come to exactly ten squares (427 = 10 x 42.67 at the harness size).
  So the two pages do not disagree, despite the variable doing.
- `--panel-height: 240px` — the one with teeth, already known: it is why the panels and now the
  group's parts state `height: auto`.
- `pvline { max-width: var(--cg-width) }` — inherited, and never binds: the tools column is narrower
  than any board, so the column is what limits the line.

**CONCLUSION: the gauges were the only live defect.** Everything else that reaches this page from
`analysis.css` is either overridden by a `.analysis-app.bug` rule, inert for want of a consumer, or
benign. Worth re-running the audit — the probe is three dozen lines of DOM walking — whenever
`analysis.css` changes, rather than trusting this table to stay true.

### 7. A HOME CHANGE MOVED NOTHING, so the arrangement never re-ran — FIXED

Found by looking at p2 after it had been resized, and it is the sharpest thing in this change so far.

`toolsPlacement` re-runs its whole arrangement from a `ResizeObserver`, on the stated reasoning that
"everything that can change the answer changes the size of one of these elements". A change of HOME
does not. `squareUnit.publishToolsHome()` toggles a class; where the boards are capped by the WIDTH,
a change in viewport HEIGHT moves the home and resizes nothing — and the app itself is pinned to
`--bug-app-content-h`, which the previous arrangement published, so even the app does not change
size. No element the observer watches moves, no pass runs, and the placement stays the one the old
home needed.

Measured on p2 at 701x744, home `tools-zonea`:

| | before | after |
|---|---|---|
| `--bug-app-h` (the budget) | 684 | 684 |
| `--bug-app-content-h` | **769** — published by the `below` home at the 829-tall window | **562** |
| the app's height | 769 in a 744 viewport that cannot scroll | 562 |
| zone A's row | **464** — the panel's content height, unbounded | 258 — zone A's real height |
| the tools panel | ran 206px past the bottom of zone A | bounded, clipped where it must be |
| the tab strip | `zoneB1` at **y = 800**, off the page | `zoneB1` at y = 593, on screen |
| page overflow | 85px vertical | none |

The fix is one notification: `squareUnit` compares the home it is about to publish with the one
already on the app and, when it differs, calls a callback that `toolsPlacement` registers — after
the class is on, so the pass reads the home it is being told about. A callback rather than an import
because `toolsPlacement` already depends on `squareUnit` and the dependency has to keep running one
way.

**WHY IT WAS INVISIBLE UNTIL NOW.** Every earlier sweep resized the window in the same axis the
boards are sized from, so something always moved. This needed the other case: boards capped by the
width, so a height change moves the home and nothing else. p2 was in exactly that state because it
had been floated to a nearly-square shape for the zone A work.

### 8. What sent the whole panel under the partner board rather than below both boards

Asked of the same p2. Nothing about the FRAGMENTS decided it — the cascade never ran, because the
tools never had a column. `toolsHome()` did, by its preference order, and the margin was nine
pixels:

| test, at 701x744 with `a` = 53.34 | |
|---|---|
| beside — `width - gaps - S x (a + b) >= 2a` | 701 - 28 - (443 + 229) = 1 against 107 — **no** |
| below — `height - tallest >= 3a` | 684 - 533 = **151** against **160** — **no, by 9px** |
| zone A — `S x b >= 2a` and `10 x (a - b) >= 3a` | 229 >= 107 and 258 >= 160 — **yes** |

So the band under the partner board was chosen because the row under BOTH boards was nine pixels
short of the three squares it is owed. And zone A then held a panel that wants 464px — move list
350, controls 40, engine 74 — in 258px, because in the zone A HOME the whole panel is placed by the
home and the per-part cascade does not run at all. That is direction one of this change, alive and
well in the one regime the cumulative cascade never covered.

### 9. The strip could not reach zone B, because it was measured STRETCHED — FIXED

Asked of p2 in the last resort: the tab strip sat in a 220px column with four tabs in it while the
full width under both boards went unused. `strip-in-zoneb` exists for exactly that move and was
false.

The test is `zoneB room >= stripHeight`, and in the last resort the round page's tools bar is
STRETCHED to fill `zoneA2`: measured 264px tall against content of about 75. Zone B had 124px, the
test read `124 >= 264`, and the strip stayed. Two fixes, both small:

- `align-self: start` on the bar (round) and the tab list (analysis) in the zone A homes, so the
  measurement is the content — the same correction the band's fragments needed, for the same reason;
- the missing pair of rules: `tools-lastresort` + `strip-in-zoneb` places the strip in `zoneB1`. The
  class was already being computed for every placed home; only the CSS to honour it was absent.

After, on p2 at 701x744: the bar is `zoneB1`, 683x29, full width, `strip-in-zoneb` on, no overflow.

### 10. The partner board scrolled once it became a tab — FIXED

Also p2 in the last resort, and it is a tab-panel side effect. `site.css` gives every
`div[role=tabpanel]` `overflow-y: auto`, and the partner stack IS a tab panel — it is the standing
tab's part. In every other home the stack has room to spare, but in the last resort it is exactly
its column's width, and `cg-resize` hangs outside it BY DESIGN: `right: -9px; bottom: -9px` of a
22px box, which is this file's own rule for the drag handle in tall landscape. Measured:
`scrollWidth` 229 against `clientWidth` 220, with `cg-resize` the only thing past the edge, drawn as
a horizontal scrollbar across the partner board.

Fixed with `overflow: visible` — the handle is meant to hang off the corner, and clipping it would
take half the grip away in the one mode that offers it. **Scoped to the apps because of
specificity**, which is worth recording because the obvious form fails: `div[role=tabpanel]` is
(0,1,1) and a bare `.bug-partner-stack` is (0,1,0), so the site rule wins and the scrollbar stays.
Measured that way round first.

### 11. The partner board's tab is FIRST in the strip

Nikolay: "in the tablist the partner tab should be the first tab, not the last as it is now." It is
the one tab that is a BOARD, and the strip only ever shows it in the last resort — where it is what
the reader is looking for, not an afterthought behind three panels.

A tab's position in the strip is its position in the declaration list, so the list is what changed:
`toolPanels.unshift(...)` on the analysis page (the content still has to be BUILT last — the strips,
the board selections and the gauge do not exist until that point in the view) and the entry moved to
the head of the array on the round page, with `PARTNER_BOARD_TAB = 0` on both. The mounts follow:
the analysis page's derived loop starts at `PARTNER_BOARD_TAB + 1`, and the round page's five
hand-written mounts each shift by one.

Verified by clicking every tab on the analysis page after the reindex: Info shows "60+0 - Casual -
BUGHOUSE3", FEN & PGN shows "BFEN / Download PGN", Move times shows the chart, Chat is the empty
`#roundchat`, and Moves shows all three fragments. On the round page the strip now reads
**Partner board, Chat, Moves, Info**.

## Portrait, in a running game — observations by resolution

Walked on p4 (the harness's portrait window) at dpr 2.25, in the LIVE round page — game
`mFTDKzoH`, 60+0, clocks running — because the round page in portrait is the arrangement with the
most parts in the least room and nothing else exercises it.

Twelve resolutions, one at a time, in the same live game. **No overlaps and no app overflow at any of
them** — checked pairwise between every part, not by eye. The phones were driven at 150% page zoom
(dpr 2.25) because Chrome will not size a window below 500 DIP; the tablets at 100% (dpr 1.5).

| # | viewport | family | own board | partner | chat | each preset row | strip | zone A | doc overflow |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 357x788 (360x800 Android) | portrait | 356² | 156² | 199 x 134 | 84.8 — five across | 140 | n/a | none |
| 2 | 388x832 (390x844 iPhone 14/15) | portrait | 388² | 164² | 224 x 128 | 90 | 159 | n/a | none |
| 3 | 390x861 (393x873 Pixel 8) | portrait | 388² | 171² | 217 x 153 | 92 | 152 | n/a | none |
| 4 | 409x903 (412x915 Pixel 7) | portrait | 409² | 178² | 231 x 157 | 98 | 163 | n/a | none |
| 5 | 412x884 (414x896 iPhone XR) | portrait | 409² | 174² | 235 x 135 | 99 | 167 | n/a | none |
| 6 | 373x667 (375x667 iPhone SE) | portrait | 370² | 132² | 238 x **44** | 61 | 177 | n/a | none |
| 7 | 768x1030 (iPad 9.7") | landscape | 491² | 245² | 751 x 143 | 87 — five across | 670 | 245 x 306 empty | none |
| 8 | 810x1086 (iPad 10.2") | landscape | 517² | 256² | 790 x 252 | **44 — ten across** | 703 | 256 x 327 empty | 193 header |
| 9 | 820x1186 (iPad Air) | landscape | 523² | 261² | 800 x 346 | 44 | 713 | 261 x 326 empty | 184 header |
| 10 | 834x1200 (iPad Pro 11") | landscape | 533² | 267² | 817 x 346 | 44 | 728 | 267 x 334 empty | 170 header |
| 11 | 800x1286 (Galaxy Tab) | landscape | 512² | 251² | 779 x **459** | 44 | 693 | 251 x 327 empty | 203 header |
| 12 | 1024x1372 (iPad Pro 12.9") | landscape | **651²** | 331² | 1002 x 372 | 44 | 893 | **331 x 400** empty | none |

Four things the table says at a glance, each an item below:

- **The chat is the part that absorbs everything** — 44px on the SE, 459 on a Galaxy Tab, with no
  relation to how much conversation there is.
- **The preset rows take the tools column's height on phones and fold to ten across on tablets**, and
  the fold flips between 768 and 810 for a reason that is about button SIZE, not width (5.16).
- **Zone A is empty on every tablet** — 245x306 through 331x400 — because the round page has no
  fragments to offer it (5.10).
- **Every tablet is in the LANDSCAPE family**, since 4:3 upright is 0.75 against a 0.5625 threshold,
  which is where the biggest single number in the walkthrough comes from: a 651px board on a 1024px
  screen (5.17).

### 360x800 (Android, the most common phone) — the second preset set wants ONE row under BOTH columns

Nikolay's note, verbatim, recorded against this resolution:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

So: the second ten-button preset set rearranges itself into a SINGLE row and sits under both the
partner board and the tools column — the full width of the screen — rather than stacking as two rows
of five inside the 199px tools column. The buttons shrink to fit ten across, and the height that
frees goes to the chat.

**FIRST, THE THING HE SUSPECTED AND IT IS TRUE: PORTRAIT HAS NO ZONE A AND NO ZONE B.** Measured at
357x788:

```
.round-app.bug        grid-template-areas: "rightcol"  "ownstack"     one column, 355.6 wide
                      rows: 343.5 (rightcol) + 444.5 (ownstack)
.bug-right-column     grid-template-areas: "stack chat"              cols: 156.5 | 199.1
                                           "stack p1"                rows: 133.9 chat
                                           "stack p2"                       84.8 p1
                                           "stack tablist"                   84.8 p2
                                                                             40   tablist
```

The zone vocabulary — `zoneA2..zoneA5`, `zoneB1..zoneB4` — belongs to the two LANDSCAPE templates.
Portrait keeps its own names, `chat / p1 / p2 / tablist` inside `.bug-right-column`, and every one
of its rows is scoped to ONE of the column's two tracks: even the tab bar is `"stack tablist"`, the
tools track only. **So the row shape this idea needs does not exist anywhere in portrait yet** — not
as zone B, not as anything. It is a new area spanning both tracks, or it is nothing.

**The button arithmetic, measured rather than guessed:**

| | now | as one row of ten |
|---|---|---|
| row width available | 199.1 (the tools track) | **355.6** (both tracks) |
| buttons per row | 5 | 10 |
| pitch | 40.3 | 35.6 |
| button | 37.4 | **~31** |
| panel height | 84.8 (two rows) | **~36** (one row) |

So the buttons lose about 17% and stay well clear of the 24px WCAG target minimum; the tools column
gets back roughly **49px**, which is where the chat's 133.9 would grow. `publishPresetSize()` already
decides the button size from the region it is given, so the size is not a new mechanism — the region
is.

**What has to be decided, and it is more than a row:**

1. **The area.** Either portrait gains a `presets` row spanning `stack` and the tools track — the
   simplest thing that could work, and it would sit between `p1` and `tablist` — or portrait adopts
   the landscape zone vocabulary wholesale, which is a much larger change and would have to answer
   what zone A means when the boards are stacked rather than side by side.
2. **Which set goes there.** The second, per the idea. The two sets are `.chatpresets-panel-1` and
   `-2`, already separate parts of the chat tab, and `.bug-presets-group` already exists to make
   them one item where a row needs them joined — so the pieces are in place.
3. **Whether the row is conditional.** At 360x800 it fits; the SE at 375x667 has 121px less height
   and a 370px own board, so a full-width preset row there costs the same 36px but out of a much
   tighter budget. The per-part minimum framework (`--bug-part-min-w/h`, read by
   `toolsPlacement`) is what a conditional version would test against.
4. **What the freed height is FOR.** The chat, on the face of it. Worth stating, because
   `publishPresetGap()` and the preset size both read the region's height and would otherwise take
   it back.

**Not a defect** — nothing at this resolution overlaps or overflows, and the current two-row shape
is legible. This is an improvement to design, and it is the first item of its kind in this change.

### 390x844 (iPhone 14/15/16) — the same note, and the case for it is stronger here

Nikolay's note, verbatim, recorded against this resolution too:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

Measured in the same live game at 388x832:

| | 360x800 | **390x844** |
|---|---|---|
| tools track | 199.1 | **224** |
| chat | 133.9 | **128** |
| each preset row | 84.8 | **90** |
| both rows | 169.6 | **180 of the 348px column** |
| one row of ten would take | ~36 | **~36** |
| height handed back | ~49 | **~54** |

**THE CHAT SHRINKS AS THE PHONE GROWS, and that is the argument.** 360 -> 390 is 30px more width and
6px LESS chat: the preset buttons are sized from the board's square, so a wider phone draws them
bigger, each row grows, and the chat — which takes whatever the others leave — pays for it. The
one-row arrangement returns more the bigger the phone gets, which is the opposite of how the current
shape behaves.

Nothing overlaps and nothing overflows here either; the boards, both clocks, the pockets and the
strip with its ½ and ⚑ are all intact. Same conclusion as above: an improvement to design, not a
defect.

### 393x873 (Pixel 8 / Galaxy S24) — the same note again

Nikolay's note, verbatim, recorded against this resolution too:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

Measured in the same live game at 390x861: tools track **217**, chat **153**, each preset row **92**
— both of them **184 of the 377px column** — bar 40, the strip 152 of the bar's width with ½ and ⚑
beside it. One row of ten would take ~36 and hand back about **56px**, the most of the three phones
so far.

The extra 29px of viewport height over the iPhone went entirely to the chat (128 -> 153) while the
preset rows barely moved (90 -> 92), which is the same relationship from the other side: the rows
take what the BOARD's square gives them, and the chat takes what is left of the height.

Nothing overlaps, nothing overflows, the partner's name row sits outside its board as intended.

### 412x915 (Pixel 7 / large Android) — the same note, and the strongest case for it

Nikolay's note, verbatim, recorded against this resolution too:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

Measured in the same live game at 409x903: tools track **231**, chat **157**, each preset row **98**
— **196px, half of the 392px column** — bar 40, strip 163 wide with ½ and ⚑ beside it. One row of
ten across the full 409px would take ~36 and hand back about **62px**.

**THE TREND ACROSS FOUR PHONES IS NOW UNAMBIGUOUS**, and it is the argument for the whole idea:

| viewport | tools track | both preset rows | chat | one row would return |
|---|---|---|---|---|
| 360x800 | 199 | 169.6 | 133.9 | ~49 |
| 390x844 | 224 | 180 | 128 | ~54 |
| 393x873 | 217 | 184 | 153 | ~56 |
| 412x915 | 231 | **196 — half the column** | 157 | **~62** |

The two rows take MORE of the column as the screen grows, because the buttons are sized from the
BOARD's square and not from the room the column has. The bigger the phone, the larger the share the
presets claim — which is backwards, and exactly what one full-width row of ten would undo.

Nothing overlaps, nothing overflows.

### 414x896 (iPhone 11 / XR) — the same note, and the worst ratio of the six

Nikolay's note, verbatim, recorded against this resolution too:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

Measured in the same live game at 412x884: tools track **235**, chat **135**, each preset row **99**
— **198px, more than half the 373px column** — bar 40, strip 167 wide. One row of ten would hand
back about **63px**, which would put the chat near 200.

The widest phone of the six has the worst ratio, and the reason is the aspect: at 19:9 (this one and
the iPhone 14/15) a phone is shorter for its width than the 20:9 Androids, so it loses twice — less
height to start with, and the same preset rows to pay for out of it.

### And across every phone so far: THE TAB STRIP HAS ROOM TO TAKE THE FULL WIDTH TOO

Nikolay, alongside the preset note: there is enough space for the tablist to take the full width as
well, and it will probably happen naturally once the full-width row exists.

Measured, the strip against the width it could have:

| viewport | strip width now | full width | share it uses |
|---|---|---|---|
| 360x800 | 140 | 356 | 39% |
| 390x844 | 159 | 388 | 41% |
| 393x873 | 152 | 390 | 39% |
| 412x915 | 163 | 409 | 40% |
| 414x896 | 167 | 412 | 41% |

The strip lives in `"stack tablist"` — the tools track only — sharing that 40% with the draw and
resign controls, which is why its three tabs run to an ellipsis on the narrowest phones. The same
new area the presets want would hold it: **one row spanning both tracks**, and the strip is the part
with the least to lose by being wide.

Two things it does NOT change, worth stating so nobody expects them: the draw and resign buttons
stay unlabelled — portrait never labels them, by rule — and the strip's height is already its
content, 28px inside a 40px bar, so the row costs nothing new.

### 375x667 (iPhone SE) — the same note, a 44px chat, and the one place the row is NOT free

Nikolay's note, verbatim, recorded against this resolution too:

> i want us to invent a logic that allows the second 10-preset buttons set to rearrange itself in
> one row and go under both partner board and tools panel in zoneB i believe should be there
> although i am not sure if we defined zoneB now in portrait mode. this will also require resizing
> the preset buttons to fit 10 in the full width of the screen.

Measured in the same live game at 373x667, aspect 0.559 — **portrait by 0.6%**, see the note on the
mode boundary below:

| | |
|---|---|
| partner board | 132² (stack 132 x 196) |
| own board | **370²** |
| chat | 238 x **44** |
| each preset row | 238 x **61** (the buttons DID shrink — `publishPresetSize()` working) |
| bar / strip | 238 x 40, strip 177 wide |
| overlaps / overflow | none / none |

**A 44px CHAT is the worst number of the six phones**, and the presets have 122 of the same column.
So the SE is where the idea would help most — and it is also the one place where the full-width row
is **NOT FREE**, which is the thing to decide before designing it:

```
today      rightcol height = max(partner stack 196, tools content 44+61+61+40 = 206) = 206
           own board gets the rest: 370

after      tools content = 44+61+40 = 145  ->  rightcol = max(196, 145) = 196   (-10)
           the new full-width row adds ~36 below it                              (+36)
           so the own board pays ~27px: 370 -> ~343, and the chat goes 44 -> ~95
```

In LANDSCAPE zone A is space the shorter board has already freed, so a part moving there costs the
boards nothing. **In portrait there is no such space**: the partner board and the tools are side by
side in one band, and a row under both of them comes out of the viewer's own board. The trade at the
SE is about 27px of own board for about 51px of chat. Whether that is worth it — always, never, or
only where the chat is under some threshold — is the decision, and it is a different decision from
the landscape one.

**AND THE MODE BOUNDARY.** 375/667 = 0.5622 against the portrait test of `aspect-ratio <= 9/16` =
0.5625 — inside by 0.6%. Emulated at 373x655 (aspect 0.569) the page flips to the LANDSCAPE
arrangement: two boards side by side, the own board down to 228², the whole tools column in a 118px
band. So on a real SE anything that changes the viewport by a few pixels — the URL bar hiding on
scroll — flips the entire layout. Worth deciding whether the threshold wants hysteresis, or whether
the SE belongs on the portrait side by construction.

### 375x667 (iPhone SE) — a SECOND note, and this one has no clear answer yet

Nikolay's message, verbatim, recorded against this resolution:

> for this resolution we need to write down another different note and also add it as an item which
> is however not clear how to address, so we will review first with the idea that there is hardly any
> space for proper chat text area, just put this entire text as a note, this chat message. other
> thing to note is this is probably a liminal resolution and slightly less height we enter the other
> mode, but i am only guess, either we figure out how to render chat and buttons here or we consider
> making the threshold between the other layout around this resolution so this renders boards
> differently we will think again.

**It is an item to REVIEW, not a defect with a fix waiting.** What is measured is that the chat's
text area gets 44px on this viewport — see the entry above for the full geometry — and that is not a
chat, it is a line and a half. Everything else on the page is intact; nothing overlaps or overflows.
The question is what the page should DO here, and there are two candidate directions, neither
chosen:

1. **Make the chat and the buttons fit** — render them differently at this size rather than shrinking
   them proportionally. The preset row going full width (the first note) returns about 51px of chat
   at the cost of about 27px of own board; whether that is enough to call it a proper text area, and
   what else would have to give, is the open part.
2. **Move the threshold.** This resolution is liminal: 375/667 = 0.5622 against the portrait test's
   0.5625, so a few pixels less height puts it in the other mode entirely, with the boards side by
   side. If the portrait arrangement cannot hold a usable chat at this height, the honest answer may
   be that the SE belongs in the OTHER layout — i.e. the threshold sits around this resolution on
   purpose, and the boards are drawn differently here.

Both directions are open, and the two notes on this resolution are related: the first one's trade —
27px of board for 51px of chat — only matters if direction 1 is the one taken.

### 768x1024 (iPad 9.7" / Mini) — the presets should take zone A, by the mechanism the analysis page already has

Nikolay's note, verbatim, recorded against this resolution:

> we need to use the same idea for such resolution from what we did in analysis mode for movelist
> where we let control buttons and engline panel go to zoneA, but in this case for the preset buttons
> so we have more space for the chat to get more height

Measured in the live round game at 768x1030, aspect 0.746 — **tablets land in the LANDSCAPE family**,
so the zone vocabulary is in force and the home is `tools-below strip-in-zoneb`:

| | |
|---|---|
| own stack | 491 wide x **613** (board 491²) |
| partner stack | 245 wide x **307** (board 245²) |
| chat | **751 x 143**, full width, `zoneB1` |
| each preset row | **751 x 87**, `zoneB2` and `zoneB3` |
| bar / strip | 751 x 40 `zoneB4`, strip 670 wide |
| **zone A** | **245 x 306 — EMPTY** |
| overlaps / overflow | none / none |

**WHY IT CANNOT HAPPEN TODAY, which is the actionable part.** The ladder built for the analysis page
offers the band only to parts that declare a zone B class in their `Droppable` entry — the engine box
and the move controls. `ROUND_DROPPABLE`'s three entries declare none, so the round page has **no
fragments at all**, and its chat, its two preset rows and its bar can never use zone A in this home.
The band is empty by construction, not by a decision.

What the note asks for is therefore a small, already-designed step: **make the preset panels
fragments**, exactly as the engine box and the controls are.

- They already are separate tab parts — `.chatpresets-panel-1` and `-2`, one per set, split for
  precisely this reason.
- `.bug-presets-group` already exists to make the pair one item where a row needs them joined.
- What they lack is the third `Droppable` field and a declared minimum (`--bug-part-min-w/h`), which
  is what the cascade reads.
- The areas exist: `zoneA2` and `zoneA3` in the `below` template, already used by the analysis page's
  controls and engine box.

The arithmetic at this viewport: the band is 245 wide and 306 tall; a preset row folded to the band's
width is 5 buttons across — about 61px tall, measured on the phones at that width — so **both rows
fit the band twice over**, and the chat would go from 143 to about **317**, more than double, with no
cost to either board (zone A is height the partner board has already given up).

### And the same resolution's second item: TEN IN A ROW, for the opposite reason to the phones

*(Corrected at 810x1080, one resolution later: the fold to ten per row already exists and happens on
its own between 768 and 810 of width. The item below is therefore about why 768 misses it, not about
inventing it — see that entry.)*

The two preset rows here are ALREADY full width — 751px — and still hold **five buttons each**, strung
out with enormous gaps. Ten across 751px is a 75px pitch, comfortable, and it would halve the block:
174px of presets to about 45, handing **~87px** to the chat. On the phones the same idea wins by
taking a row out of a narrow column; here it wins by filling a row that is already too wide for what
is in it. Pure waste, no trade.

**The two items interact.** If the presets go to zone A (the note above), they are back in a 245px
column and want five per row; if they stay in zone B, they want ten. So the row count is a function
of the region's width — which is what `publishPresetSize()` and `SET_COLUMNS` already decide from,
and the reason to settle the zone A question first.

### 810x1080 (iPad 10.2") — better than 768, and the ten-in-a-row fold ALREADY EXISTS

Nikolay's comment, verbatim, recorded against this resolution:

> this is better than the previous one, associate this comment to this resolution as we will stlil
> review it again, and also the fact that in this case preset buttons take only two lines which makes
> things better, possible idea for the previous resolution. but here we can also consider the moving
> of the preset buttons to zoneA, we will have to experiment.

Measured in the live round game at 810x1086, aspect 0.746, `tools-below strip-in-zoneb`:

| | 768x1024 | **810x1080** |
|---|---|---|
| own board | 491² | **517²** |
| partner board | 245² | 256² |
| chat | 143 | **252** |
| each preset row | 87 — **five** buttons | **44 — TEN buttons** |
| both preset rows | 174 | **88** |
| bar / strip | 40 / 670 | 40 / 703 |
| zone A | 245 x 306, empty | 256 x 327, empty |
| document overflow | none | **193px — the site header, Finding 3** |

**THE FOLD TO TEN PER ROW IS NOT AN IDEA, IT IS ALREADY IMPLEMENTED**, and this pair of measurements
is what shows it: the same two panels are five-across and 87 tall at 768, ten-across and 44 tall at
810, with the buttons shrinking from about 43 to about 38 to make it. Two rows of ten instead of four
rows of five is exactly what the note on 768 asked for, and it costs the chat nothing — the chat is
the part that gains, 143 -> 252.

So the item that came out of 768 changes shape. It is not "invent ten-in-a-row"; it is:

1. **Why does 768 miss the fold, and should the threshold move?** The fold happens somewhere between
   768 and 810 of width. `zoneB()`'s `oneRow` test compares the app's width against
   `buttons.length * button + (buttons.length - 1) * PITCH_FLOOR`, and `publishPresetSize()` decides
   the button from the region's spare HEIGHT — so the two interact, and 768 lands on the wrong side.
   A smaller button at 768 would fold, and the measured 38px at 810 is already comfortable.
2. **On the phones there is no region to fold into at all** — the tools track is 199-235 wide and the
   row needs both tracks. That part of the phone note stands unchanged.

**AND THE NEW EXPERIMENT FOR THIS RESOLUTION: the presets in zone A.** Even with the fold, zone A is
256 x 327 and empty while the presets take 88px of zone B and the chat 252. Moving them to the band
would hand the chat those 88px — 252 -> ~340 — at no cost to either board, and in a 256px column they
would go back to five per row (two rows, about 122px), which the band holds twice over. Whether a
340px chat beside the boards reads better than a 252px one with the presets under it is a judgement
to make on the screen, not on paper: **experiment, both ways, at this resolution.**

### 820x1180 (iPad Air 10.9") — the same as 810, with more room; the LEAST interesting to review

Nikolay's note, verbatim, recorded against this resolution:

> note here is that it looks the same like previous resolution, but even better because more space so
> least interesting one to review

Measured at 820x1186, aspect 0.691, `tools-below strip-in-zoneb`: own board **523²**, partner **261²**,
chat **800 x 346**, the two preset rows 44 each with the ten-per-row fold holding, bar 40 with a 713px
strip, zone A **261 x 326 and empty**, 184px of document overflow from the site header (Finding 3),
no overlaps.

Nothing new in kind, and that is the point of recording it: the arrangement is identical to 810x1080
and every number is more comfortable. **Filed as the least interesting of the twelve** — the one to
skip when re-reviewing, **and 834x1194 (iPad Pro 11") is filed with it**: measured at 834x1200, own
board 533², partner 267², chat 817 x **346** — the same 346 — the two rows folded at 44 each, a 728px
strip, zone A **267 x 334 and empty**, 170px of header overflow, no overlaps. Fourteen pixels wider
than the Air and identical in kind; the only number that moved is the header's own overflow
(184 -> 170), the shared header closing its gap as the viewport grows. Nothing here that 810 and 820
have not already shown.

One thing it does do is turn 5.13's argument around, worth a line: at 346px the chat is visibly more
than the conversation needs, so moving the presets into the band here would NOT be about buying chat
height. It would be about putting them beside the boards and giving the empty 261 x 326 band
something to hold. Same experiment, different reason — and this is the resolution that shows the
reason is not always "the chat is short".

### 800x1280 (Galaxy Tab / Android, the tallest) — all the slack goes to the chat, and A RULE IS NEEDED

Nikolay's note, verbatim, recorded against this resolution:

> yes attach the note here too. in fact we have to come up with some rule that decides wether to move
> preset buttons based on how much of the chat area is visible. also i wonder why previous resolutions
> rendered 4x5 and these last ones are 2x10.

Measured at 800x1286, aspect 0.622, `tools-below strip-in-zoneb`: own board **512²**, partner **251²**,
chat **779 x 459**, preset rows 44 each (ten per row), bar 40 with a 693px strip, zone A **251 x 327
and empty**, 203px of header overflow, no overlaps.

**THE EXTREME CASE OF THE IMBALANCE.** At 16:10 this is the tallest tablet of the six, and every
pixel of the extra height goes to one place: a 459px chat that is almost entirely empty, while the
boards stay at 512²/251² — they are sized by the WIDTH here, not the height — and the band beside the
own board holds nothing. The layout has ~460px of slack and spends all of it on the chat.

**THE RULE HE IS ASKING FOR: move the presets on how much CHAT IS VISIBLE.** The ingredient already
exists — `chatMinHeight()` in `toolsPlacement.ts` computes what the chat needs from its own line
height and its input box, and `publishPresetSize()` already subtracts it before deciding a button
size. So a rule of the shape "the presets leave the chat's column while the chat is under N times its
minimum, and come back above it" can be written against a number the module already measures. The
four resolutions in this section bracket it: 143 (768), 252 (810), 346 (820, 834), 459 (800x1280).

### Why 4x5 at 768 and 2x10 at 810 — the answer is in `publishPresetSize()`

His question, and it is not a wrap that the width happens to win. The arrangement is a CONSEQUENCE of
the button size, and the size is chosen by trying both arrangements:

```js
free = region.height − chatMinHeight(app) − barHeight
for (const setsPerRow of [PANEL_SETS, 1]) {      // 2 sets per row = 2x10;  1 = 4x5
    const perRow = setsPerRow * SET_COLUMNS;     // 10 or 5
    const rows   = (PANEL_SETS / setsPerRow) * PANEL_SETS;   // 2 or 4
    const byWidth  = (region.width - (perRow - 1) * gap) / perRow;
    const byHeight = (free - (rows - 1) * rowGap) / rows;
    best = Math.max(best, Math.min(byWidth, byHeight));      // the BIGGER button wins
}
```

Then the stylesheet follows: a set is five FIXED tracks of `--bug-preset-btn`, and `.chatpresets`
wraps, so two sets share a row only where two full-size sets fit. **The layout is therefore whichever
of 2x10 and 4x5 yields the larger button at that region's width and free height**, bounded by the
floor (0.55 of a board square) and the ceiling (one board square — a preset is never drawn larger
than the piece on the board).

That is why the two tablets differ with almost the same width: at 768 the four-row option produced
the bigger button (~43) and at 810 the two-row option did (~38). It is not a bug; it is the
size-first rule doing what it says. Whether "biggest button" is the right objective — rather than,
say, "fewest rows so the chat keeps its height" — is a decision this change can take, and it is the
same decision as the rule above.

### 1024x1366 (iPad Pro 12.9") — "plenty of unused space", and the mode itself may be the wrong one

Nikolay's note, verbatim, recorded against this resolution:

> looks weird, very big, plenty of space, plenty of unused space, worth reviewing

Measured at 1024x1372, aspect 0.746, `tools-below strip-in-zoneb`: own board **651²** (stack 651 x
813), partner **331²** (stack 331 x 413), chat 1002 x **372**, the two folded preset rows 44 each, bar
40 with an **893px** strip, zone A **331 x 400 and empty**, and — for the first time in the set — **no
document overflow**, because the site header finally fits above about 1050.

**WHERE THE UNUSED SPACE IS, quantified:** zone A is 331 x 400, which is larger than most phones'
entire viewport, and the chat holds 372px it does not need. The content comes to 813 + 372 + 88 + 40 =
1313 of a 1372 budget, and the chat is what absorbs the slack.

**WHY THE BOARDS CANNOT TAKE IT, and this is the interesting part.** They are limited by WIDTH, not
height: the height's answer here is (1372 - 60)/10 = 131 per square — a 1048px board — while the width
cap is (1024 - 30.7)/(8 x 1.5) = 82.8, and 82.8 is what they are drawn at. The cap exists so the
partner board can sit beside the viewer's at half its size, so in the side-by-side arrangement the
extra height is unusable by construction.

**WHICH RAISES THE MODE ITSELF.** Every tablet in this walkthrough is in the LANDSCAPE family, because
the portrait test is `aspect-ratio <= 9/16` = 0.5625 and a 4:3 tablet held upright is 0.75. But the
portrait arrangement — boards STACKED, the viewer's own full width, the partner's board and the tools
in a band above it — is exactly what a tall viewport wants:

```
landscape (today)        own 651² beside partner 331², chat 372, zone A 331x400 empty
portrait (hypothetical)  own board 8 x (1024/8) = 1024², partner ~274² with the tools beside it,
                         total height ~1364 of 1372 available
```

**A 1024px board instead of a 651px one, from the same viewport.** That is the answer to "plenty of
unused space": the space is unusable in the arrangement the aspect test picked, and usable in the
other one. So the item here is not "fill zone A" — it is **whether the portrait/landscape threshold
belongs at 9/16 for every device, or whether a viewport this tall should be stacked regardless of its
aspect.** Note it interacts with 5.8 (the SE, where the same threshold is 0.6% away in the other
direction): both say the threshold is doing more work than one number can.

## The layout matrix, re-run 2026-09-12 — 127 failing rows down to 102

`tests/layout_matrix` over the working tree, diffed row-by-row against the stashed-HEAD baseline of
2026-09-07 (commit `0f3cfdc5c`) that the bed's note records. **Same 264 rows, no key lost or gained**,
which is the first thing to check — a row that fails to run reads as a pass.

| | baseline | today |
|---|---|---|
| rows | 264 | 264 |
| failing rows | **127** | **102** |
| fixed / broken / changed | — | **31 fixed, 6 broken, 52 with different text** |

By kind of failure:

| kind | baseline | today |
|---|---|---|
| page overflows horizontally | 58 | 56 |
| page overflows vertically | 56 | 54 |
| `bug-own-stack` overlaps something | 35 | **45** |
| `bug-partner-stack` overlaps something | 38 | 34 |
| **`area zoneAn` is NxN and empty** | **36** | **12** |
| **chat input is covered** | **10** | **1** |
| **button "REMATCH" covered** | **7** | **0** |
| **button "NEW OPPONENT" covered** | **7** | **0** |
| tab "Moves" is covered | 0 | **5** |
| arrangement was stale after the viewport change | 2 | **0** |

**What the numbers say.** The empty-zone-A count is down by two thirds (36 -> 12), which is the
ladder actually using the band; the end-of-game buttons are no longer covered anywhere (14 rows
gone); the chat input is covered in one row instead of ten; and the two stale-arrangement rows are
gone, which is the home-change notification (Finding 7) showing up in a second harness.

**The six rows that broke, to chase before this change is archived:**

| row | failure |
|---|---|
| `T1-C3-100x100` | area `zoneA3` 248x55 and empty |
| `T1-C3-100x50` | area `zoneA3` 192x59 and empty |
| `T5-C3-100x100` | area `zoneA3` 328x90 and empty |
| `T5-C3-100x50` | area `zoneA3` 264x97 and empty |
| `T1-C4-50x50` | tab "Moves" covered by a piece; `bug-own-stack` overlaps a div in `zoneB2` by 245x30 |
| `T6-landscape-C1-50x50` | `bug-partner-stack` overlaps `bug-presets-group` by 412x5 |

Two patterns in them: the four `C3` rows are the END-OF-GAME case finding a NEW empty slot — `zoneA3`
exists for it now and nothing is placed there, which is the same "a zone is occupied or it is not
there" requirement this change already carries, arriving in a case the walkthrough never opened. And
`own-stack` overlaps rose 35 -> 45 while `partner-stack` overlaps fell 38 -> 34, which together with
the new "tab Moves is covered" rows points at the analysis page's parts now being grid items in
`zoneB`/`zoneA` rows at 50% zoom.

Report: `~/dev/layout-matrix-2026-09-12/index.html` (264 screenshots beside it in `shots/`).

## How these rules were found: the layout matrix as the instrument

The rules added to this change's spec were not reasoned out; they were measured. `tests/layout_matrix`
walks 30 viewports x 4 cases x 3 zooms against a live game, screenshots each and asks the page what it
decided. The report it writes is reviewed by hand, row by row, and what a reviewer marks becomes the
next thing the survey learns to see — so the instrument and the layout are worked on together.

WHAT THAT CHANGED ABOUT THE WORK. Reviewing the rows a survey called CLEAN is what found the defects
this change fixes: every one of them was invisible to the checks that existed, and each note written
against a screenshot became a detector, which then found the same defect everywhere else it occurred.
A class of defect is therefore settled in three steps — see it once, teach the survey to see it, fix
it where the survey now points — and a fix is confirmed the same way, by diffing a run against the
state it set out to change.

THE INSTRUMENT IS NOT NEUTRAL AND HAS TO BE KEPT HONEST. Its screenshots were, for a time, taken at a
viewport other than the one measured; its zoom rows asked for a percentage the app was raising to a
floor and reported the number it asked for; two of its checks measured decorations a board draws
outside itself on purpose. Each of those made the survey say something untrue, and each was found by a
reviewer disbelieving a row rather than by the survey doubting itself. WHERE A CHECK AND A REVIEWER
DISAGREE, THE CHECK IS THE MORE LIKELY TO BE WRONG, and a check that cannot be stated as a measurement
is removed rather than tuned — one was, for asking a question ("could these two have shared a line?")
that no geometry can answer about a child that grows to fill.

WHAT IS NOT WORTH RECORDING. The individual rows, their numbers and the notes taken against them live
in the harness (`tests/layout_matrix/notes.json`) and in the reports, not here. Only a rule that
survives being stated without its case belongs in the spec.

## Open Questions

- Which parts belong in zone A, in each of the three modes, and in what order.
- Whether "zone A before zone B" is true in general, or only for parts narrow enough that zone B's
  extra width buys them nothing.
- Whether a collapsed zone A gives its height to the boards or to zone B.
- ~~How much smaller the partner board should be~~ — ANSWERED: as big as possible, shrinking only
  for the tools' minimum, floored at 50%, a tab below that. See "The partner board's size".
- Whether the ZOOM floor stays at four squares of the main board while the width floor is 50%.
- Whether `TOOLS_MIN_SQUARES` stays at 2 now that the partner board pays for it — see the sweep.
- Whether `beside` should still be preferred over `below` where `below` costs no board at all.
- Whether the zone A HOME should be refused when the panel it would hold does not fit it — the
  per-part cascade covers the tools-column home only, and Finding 8 is what that leaves.
- Whether width freed by a reader's ZOOM should go back to the viewer's own board, as it already
  goes to the tools — and whether the column gap for a zero-width tools track should be dropped.
