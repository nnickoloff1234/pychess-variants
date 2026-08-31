## Context

### The DOM as it stands, measured on the analysis page 2026-08-29

```
div.analysis-app.bug                    [grid]        1276x551
├── div.bug-own-stack                   [grid]  ownstack   454x547
│   ├── div.seat-strip0                 pocket + player bar
│   ├── selection#mainboard             clocks + cg-wrap        437x437
│   ├── div.seat-strip1
│   ├── div#gauge                       17x437
│   └── div.board-label                 "A"
├── div.bug-right-column                [grid]  rightcol   811x551
│   ├── div.bug-partner-stack           [grid]  stack      454x547
│   │   └── (the same five children, #gaugePartner, "B")
│   └── div.bug-parts                   [contents]  ← forms no box
│       ├── #analysis-tools-panel-0-0   area chat    356x503   (the displayed tab)
│       ├── #analysis-tools-panel-1-0..4-0   area chat, display:none
│       └── #analysis-tools-tablist     area tablist 356x49
└── under-left#spectators               uleft, display:none on a finished game
```

**Three levels, two grid contexts, and ordering only works inside one container.** So today:

- the app has exactly TWO participants — the own stack and the merged column;
- the column has SEVEN grid items, because `.bug-parts` is already `display: contents` and its
  children are promoted — this is what lets the tab list drop;
- a stack's children are sealed off from everything else.

The own board therefore cannot be ordered against the tools at all: it is a sibling of the column,
not of its contents.

### The round page is NOT the same shape

Its own stack is `display: block` — strip, board, strip, each `width: 100%` — where the analysis
page's is `display: grid` with explicit columns. That difference is not cosmetic: made a flex item,
the round stack collapsed from 437x547 to **225x334** with the board clipped, because `.cg-wrap`
takes its height from percentage padding against a width it no longer had. Restating the width as
`flex: 0 0 calc(var(--bug-sq) * 8)` fixed it, to within ~4px of the grid.

### What was measured before this document

Three probes on p3, one on p2:

1. **App-level flex, `row nowrap`, column kept as a box** — pixel-identical to the grid in BOTH
   landscape modes. Every number matched.
2. **Same probe with `row wrap`** — the column grew to 756px inside a 551px app, the page
   overflowed, and the tab list dropped spuriously. A wrapped line sizes to its content, not to its
   container.
3. **Column-wrap with `.bug-right-column` flattened** — the arrangement in the proposal's table.
4. **App-level flex on the ROUND page** — the collapse described above.

## Goals / Non-Goals

**Goals:**

- One arrangement for both landscape modes on both pages, with no declared third track.
- The boards adjacent; everything after them stacking into an implicit column.
- Portrait untouched, on both pages.

**Non-Goals:**

- Making the layout size the boards. It cannot: `squareUnit.ts` publishes the square before the
  boards are built, and every width is a multiple of it.
- Changing which tabs exist, the clocks, the gauges or the labels.
- Converting the round page before the analysis page holds.

## Decisions

### Decision 1: `column wrap`, not `row wrap`

`row wrap` puts overflow on a new line BELOW, full width — which is a fourth row, not a third
column, and in a viewport-pinned layout it overflows rather than reflows (probe 2). `column wrap`
fills top-to-bottom then starts a new column, which is the arrangement wanted: two full-height
boards take a column each, and the shorter items spill into the next.

### Decision 2: the panel's flex-basis is load-bearing and must be documented as such

Wrapping is decided from HYPOTHETICAL main sizes — before any growing. Measured on the panel:

| basis | outcome |
|:--|:--|
| `flex: 1 1 auto` | panel fills column 3; the tab list is pushed into a FOURTH column; horizontal overflow |
| `flex: 1 1 0` | a zero-height item "fits" the 0px left in column 2, so the panel lands there at height 0 |
| `flex: 1 1 1px` | correct: both in column 3, panel grows to 503, tab list 49 |

A `1px` that decides the whole arrangement will read as a typo to the next person. If this model is
adopted, that line needs the same treatment the ladder constants got: the measurement beside it.

### Decision 3a: TWO DROP ZONES, and an outer two-part container — decided 2026-08-29

Decision 3 below records why a single wrapped container cannot express the drop. The answer is not
to give the drop up but to give it somewhere to land:

```
app                    [flex, column]
├── boards + tools     [flex, column wrap]      the arrangement measured above
│   ├── own stack                               column 1
│   ├── partner stack                           column 2
│   ├── ZONE A                                  column 2, under the partner board
│   └── panels, tab list                        implicit column 3
└── ZONE B             [full width]             spans the boards AND the tools
```

**Zone A is free and was measured.** An item placed after the partner stack falls into the leftover
of that board's column with no JS and no measuring: with the partner board short it landed at
x465 y547, directly under it. With both boards full height there is no leftover and it went to
column 3 instead — so zone A exists only when the partner board leaves room, which is exactly the
condition it should depend on.

**Zone B is the outer container's second part**, so it is full width by construction and spans
everything above it — which is what the round page's `tablist tablist` does today.

Two zones of different shapes mean a part can drop into whichever currently fits: zone A is as wide
as the partner board and as tall as what that board leaves; zone B is full width and as tall as it
needs. The choice is a measurement, which is what `toolsPlacement` already exists to make.

**THE NEW RISK, and it is not small: this is the first design here that would MOVE DOM.** Today
nothing moves — `toolsPlacement` toggles classes and grid areas do the placing, which is why the
file says grid areas "state both exactly". Zones A and B are different containers, and `order` only
reorders within one container, so putting a part into a zone means reparenting it.

What has to be checked before that is relied on:

- **Snabbdom** holds `vnode.elm` as a direct element reference, so patching should follow a moved
  element — but the tab widget's `select()` operates on vnodes built once in the constructor, and
  that has to be confirmed rather than assumed.
- **The movetime chart** is a Highcharts instance sized to its container; a move is a resize it does
  not observe.
- **Scroll position and focus** live on the element and survive a move; a re-render would lose them.

If DOM moves prove unsafe, the fallback is the existing mechanism — grid areas, where a span is
expressible and nothing moves — which is to say the current design.

### Decision 3: the tab-list drop cannot survive a SINGLE wrapped container, and that is what forced 3a

`toolsPlacement.ts` moves a part under the board and SPANS it across both tracks. A flex item
cannot span columns — which is exactly why `flex-flow: column wrap` was rejected for the merged
column when that file was written: "wrapping takes the LAST items into a new column BESIDE, so the
chat — the one part that should never move — was what went under the board, and nothing widened."

The same limit now applies at app level. Either the drop goes, or this model does. That is the
decision this exploration exists to make, and it should be made deliberately rather than discovered
half-way through the conversion.

### Decision 4: the implicit column is content-width, by definition

A wrapped column is as wide as its widest item. Measured 277px against the grid's 356px, leaving
68px unused at the right edge. Not declaring the track means not choosing its width either.
`align-content: stretch` may reclaim it; untested.

## Risks / Trade-offs

- **[The drop is a feature that works today and this removes it]** → Decision 3. Portrait relies on
  it for the full-width tab list, and portrait is explicitly out of scope, so the two would diverge
  unless the drop is preserved some other way.
- **[The round page needs its stack width restated]** → Measured; `flex: 0 0 calc(var(--bug-sq) * 8)`
  works but is the same number the track carried, moved to another property. The simplification is
  smaller than it looks.
- **[~4px drift between grid `column-gap` and flex `gap`]** → Seen on the round page probe. Small,
  but "identical to the round page" was the standard set for the analysis page and this would break
  it by a few pixels.
- **[A live round page has five more children in that grid]** → p2 is a FINISHED game, where
  `game-controls`, `offer` and `move-controls` rows are all 0px. The conversion has not been tested
  against the case that actually has content.

## Open Questions

- Is losing the tab-list drop acceptable? If not, this model is finished before it starts.
- Can `align-content: stretch` give the implicit column the leftover width without disturbing the
  board columns?
- Does the conversion still pay once every board width is restated as a `flex-basis` and every
  `min-height: 0` re-added per promoted child? `.bug-right-column` currently carries
  `overflow: hidden` and the zero minimums that let it be driven to nothing at narrow widths — a
  `display: contents` element forms no box, so all of that has to be re-expressed.
