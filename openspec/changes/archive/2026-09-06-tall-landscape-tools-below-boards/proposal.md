## Why

Tall landscape has one arrangement: two boards side by side, tools in a column to their right.
That is right whenever HEIGHT is the scarce resource, which is the case it was designed on. It
is wrong whenever WIDTH is scarce and height is not — and that case is no longer exotic, because
the portrait cut-off now routes every upright tablet here.

Measured, both live windows are in it:

| window | viewport | height-derived square | width-capped square | tools column | spare height under boards |
|---|---|---|---|---|---|
| p1 (analysis) | 682x647 | 58.70 | **50.61** | 30.0px | 80.9px |
| p4 (round)    | 627x835 | 77.50 | **48.15** | 125.5px | 293.5px |

Two things are wrong at once. The boards are paying for a tools column they cannot afford — take
the tools' guaranteed half-square out of the width and the square rises to 52.64 on p1 and 50.16
on p4, about 4% — while the tools themselves are squeezed into 30px and 125px columns with 81px
and 293px of unused height sitting directly beneath the boards.

The layout already has a name for that space: zone B, the full width under both boards. Today
only individual PARTS drop into it, one at a time, and only after the boards have been sized. The
proposal is to let the whole tools area go there, and — the part that matters — to decide it
BEFORE the boards are sized, so the boards can spend the width the tools gave back.

**This is effectively a second portrait mode**: boards side by side, tools underneath. It should
NOT get a media query of its own. Tall landscape should arrive at it on its own whenever the
viewport calls for it, so it works identically on a tablet, on a narrow desktop window, and at
every size in between.

## What Changes

- **`TOOLS_MIN_SQUARES = 0.5` becomes `Wt`, a real minimum.** Half a square was never a usability
  measure. Measured across normal viewports the tools get 2.4 to 4.8 squares of column and then fall
  straight to the half-square floor below about 1000px of width, with nothing in between — a cliff
  rather than a degradation. `Wt` makes that cliff the DECISION POINT.

- **A second constant, `T`, states how many squares tall the tools need to be worth a row.** Both are
  counted in SQUARES of the left board, the unit the layout is already built from. These two numbers
  are the whole design; everything else is machinery.

- **`Wt` = 2 and `T` = 3.** Neither was chosen; both are read off the resource table. 2 is the
  largest value that leaves every normal desktop the column it has today (1920x1080 is tightest at
  2.40 spare squares). 3 sits in the middle of the band (0.74, 5.45] that separates p1's spare
  height, which must not qualify, from p4's, which must.

- **The tools take the first home that fits, from an ordered cascade** evaluated before either board
  is sized: a column of their own; else the full-width row under both boards; else the region the
  right board frees; else the tab strip alone in that region, with the right board entered in the
  strip as a "Partner" tab so the panels can borrow its column.

- **Three columns exist only when the tools have a column.** In every other case the layout is two
  columns and both boards are sized against the full width. This is the structural consequence, and
  it means the board width equation has exactly two forms rather than one per case.

- **The board allowances keep their present shape.** `Wt` sits in the divisor exactly where
  `TOOLS_MIN_SQUARES` does today, and `T` joins it in the height divisor when the tools take a row;
  only the values and the branch change.

- **`--bug-boards-h` and `--bug-app-content-h` must charge whichever home was chosen**, as they
  already charge what zone B holds.

- **The cascade re-runs on ZOOM as well as resize.** Zone B's height is what the boards do not use,
  so a reader zooming out creates it. This is the layout's existing pair of redraw points, not a new
  one.

- **Nothing changes when height is the scarce resource.** At 996x730 the boards are height-bound, so
  the cascade's first test succeeds and today's arrangement stands. That is the property to protect
  in review.

## Capabilities

### New Capabilities

_None._ This is a new arrangement of an existing capability, reached by the rules that capability
already states rather than by a new mode.

### Modified Capabilities

- `bughouse-round-layout`: the tall landscape mode gains a cascade of homes for the tools and the
  rule that chooses between them; the board allowance rules gain the cases where the tools cost no
  width.

- `two-board-tabs`: the widget gains DETACHED tabs — a tab may be absent from the strip with its
  parts always displayed, reversibly at runtime. Stated as a general capability rather than for the
  one panel that needs it first: any panel a page has room to show permanently can be taken out of
  the strip and put back when the room goes away, which is a thing the layout will want again.

## Impact

- `client/two-board/squareUnit.ts` — `allowanceFor()`, `leftStackWidthCap()`,
  `rightStackWidthAllowance()`, and a new predicate deciding the arrangement. This is where the
  circularity risk lives: the decision must depend on the VIEWPORT only, never on a measured board.
- `client/two-board/common/toolsPlacement.ts` — must not assume a tools column exists, and must
  charge the tools row against the published heights.
- `client/two-board/round/partsWidth.ts` — reads the app's last track as the tools width; that
  track is zero in the new arrangement.
- `client/two-board/common/tabs.ts` — the detached-tab state, and switching acting on the attached
  tabs rather than on all of them.
- `static/bughouse.css` — one more arrangement in the shared `--bug-zones-*` vocabulary, and a
  column template whose third track is zero.
- No server, protocol or data changes. No effect on portrait or short landscape.
