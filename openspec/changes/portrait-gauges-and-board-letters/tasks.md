## 0. Status

**Proposed 2026-08-29, not started, and deliberately not ready to start.** Section 1 is the
decision; nothing below it may begin until 1.1 has an answer. Portrait works today — it is missing
two things, it is not broken — so there is nothing here to rush.

Written down while the landscape half was implemented, so the portrait half is not lost. The
landscape gauge and letter shipped in the same session; portrait was suppressed rather than solved,
and this change is that debt stated out loud.

## 1. Decide

- [x] 1.1 **DECIDED 2026-09-26: OPTION A — the landscape arrangement, shrunk to fit.** Nikolay's
      call. The gauge stays a vertical bar beside the board as it is in landscape, and the boards
      shrink to pay for it.

      **AND THE MECHANISM IS ALREADY THERE, which is what made this cheap to decide.** A stack on
      the analysis page is already a TWO-COLUMN grid — pocket/board/pocket down column 1, the gauge
      parked in column 2 on the board's row — so the gauge is part of the stack, not a sibling.
      `squareUnit.ts` already knows what that costs:

          const GAUGE_SQUARES = 0.31;                       // measured, not chosen
          function stackSquares() { return FILES + (stacksIncludeGauge() ? GAUGE_SQUARES : 0); }
          /** A stack's width in squares: the board, plus the gauge where the page draws one. */

      **PORTRAIT SIMPLY DOES NOT CALL IT.** Its square is `quantize(availableWidth(), FILES) /
      FILES` — bare `FILES`, so 8 — and the stylesheet then suppresses the gauge to keep that
      arithmetic true. The "8.31 squares against an app of 8" note is the consequence of the
      omission, not a reason it cannot be done. Five landscape call sites use `stackSquares()`;
      portrait is the one that forgot.

      So the shape of the work is: use `stackSquares()` in the portrait divisor, and delete the two
      portrait CSS blocks that force a one-column stack and hide the label.
- [ ] 1.2 **ASYMMETRIC, AND THE REASON IS THE PRICE — measured 2026-09-26 at 386x835, live.** The
      two gauges are not paid for by the same thing, which is why this cannot be one decision:

      | | square | gauge bar | paid for by | cost |
      |---|---|---|---|---|
      | own board | 48.004px | **14.9px** | the BOARD — its square is width-derived, so the divisor goes 8 → 8.31 | board 384 → 369.7, **−14.3px** |
      | partner board | 20.672px | **6.4px** | the TOOLS — its square is height-derived, so the board does not shrink; the stack track widens | tools column 218.7 → 212.3, **no board loss** |

      **So the own gauge is readable and costs board; the partner gauge is nearly free and may be
      worth nothing.** `portrait.css` already records the objection: "the partner's was 6.2px wide
      at this size, unreadable as a bar, and the engine's evaluation is a number in the Moves tab
      regardless."

      Three questions, not one:
      1. Own gauge: 14.9px of readable bar for 14.3px of board — worth it?
      2. Partner gauge: 6.4px of bar for 6.4px of tools — is a bar that narrow worth anything?
      3. **The LETTER only needs the COLUMN, not the bar.** It lives in the gauge's column, so a
         board can have its letter with the column present and the gauge hidden. That matters most
         on the partner board, where "which board is this" is the real question and the column is
         the cheap one.
- [ ] 1.3 If the chosen shape takes width or height from a board, record the square unit before and
      after and confirm the new one is a whole number of device pixels. A percentage is not an
      answer here.
- [ ] 1.4 Re-check the 6.4px partner gauge that portrait rejected once already. If the answer keeps
      it, say what changed about that judgement.

## 2. What is already in place

- [x] 2.1 `boardLabel()` exists in `analysis.ts` and is built into both stacks, carrying board
      IDENTITY while the stack's position decides which side it appears on.
- [x] 2.2 Both gauges exist and are placed by `drawEval()`, keyed by POSITION — own board to
      `#gauge`, partner to `#gaugePartner` — so whatever portrait does with them inherits a correct
      mapping for a viewer seated on either board.
- [x] 2.3 Portrait suppresses both with `display: none`, and the CSS records why: the stack is
      otherwise 8.31 squares against an app of 8.
- [x] 2.4 The failure mode is known and measured. Placed at `grid-column: 2` in portrait's
      one-column stack, the letter landed at x=388 in a 386px viewport — an implicit second track
      dragging a pinned layout past the screen.

## 3. Build the chosen shape

- [ ] 3.1 Replace the portrait `display: none` rules with real placement. Do not simply delete them:
      the arithmetic they protect — the stack is exactly its eight squares — has to still hold.
- [ ] 3.2 If the shape is horizontal (option B), teach `drawEval()` to fill along the other axis.
      The gauge is filled vertically today.
- [ ] 3.3 If the shape is an overlay (option C), decide the contrast against a board that has pieces
      under it, and check it against both board sizes — the partner square is 20.7px in portrait,
      less than half the own board's 48.0px.
- [ ] 3.4 Keep the letter and the gauge one decision. The current gap exists because the letter
      inherited the gauge's placement and then inherited its absence.

## 4. Verify

- [ ] 4.1 Portrait: `document.documentElement.scrollWidth === innerWidth` and the app's bottom at or
      above the viewport's bottom. This is the check the first attempt failed.
- [ ] 4.2 Both squares measured against their pre-change values — 48.004px own, 20.672px partner on
      a 386x835 tile — and any difference matched to a trade recorded under 1.3.
- [ ] 4.3 Both landscape modes unchanged. They are the reference and nothing here should reach them.
- [ ] 4.4 With the engine running, each board's readout updates on its own slice and holds while the
      engine is on the other board.
- [ ] 4.5 Frontend gates. No server change and no Python gates.

## 5. Not in this change

- [ ] 5.1 The PV columns' portrait order — left column is the own board, which portrait puts at the
      BOTTOM. Related, open, and a separate decision.
