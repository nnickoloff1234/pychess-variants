## Why

Portrait is the only layout where a reader cannot tell which board is which, or how either board
stands. Both landscape modes carry an evaluation gauge beside each board and, since 2026-08-29, the
board's identity letter under that gauge. Portrait has neither: the gauge is deliberately dropped
(`bughouse.css`, "NO EVAL GAUGE IN PORTRAIT"), and the letter had to be dropped with it because it
was placed in the gauge's column.

That gap now costs more than it used to. The engine panel shows two PV columns, one per board, and
the columns are ordered by POSITION — own board first. In landscape that reads directly off the
page: left column, left board, left gauge, letter `A`. In portrait the boards are stacked, so the
left column belongs to the BOTTOM board, and nothing on screen says so.

## What Changes

- Portrait gets an evaluation gauge for each board, in some form. Which form is the open question
  this change exists to answer — see Design.
- Portrait gets each board's identity letter, placed by whatever the gauge decision implies.
- **No change to either landscape mode.** They are correct today and are the reference the portrait
  answer is measured against.
- The `display: none` rules that drop `#gauge` / `#gaugePartner` / `.board-label` under
  `(orientation: portrait)` are replaced by real placement, not deleted blindly — the arithmetic
  those rules protect (the stack is exactly its eight squares) still has to hold afterwards.

## Capabilities

### New Capabilities

- `bughouse-portrait-board-readout`: how the portrait analysis layout tells a reader which board is
  which and how each stands — the identity letter and the evaluation gauge, their placement, and
  the constraint that neither may change the size of either board.

### Modified Capabilities

None. `bughouse-round-layout` covers the round page, which has no gauge in any mode.

## Impact

- `static/bughouse.css` — the `(orientation: portrait)` block, the stack grid definitions, and
  whichever of `#gauge` / `#gaugePartner` / `.board-label` move.
- `client/two-board/analysis/analysis.ts` — only if the chosen shape needs a different element or a
  different position in the stack; the current `boardLabel()` and both gauges are already built.
- `client/two-board/analysis/engine.ts` — only if a horizontal gauge needs a different fill axis
  than the vertical one `drawEval()` writes today.
- No server change, no Python gates.
