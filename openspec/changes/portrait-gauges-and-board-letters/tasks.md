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
- [x] 1.2 **ANSWERED 2026-09-26: BOTH BOARDS GET THE GAUGE, and the asymmetry is in who pays, not
      in what is drawn.** Nikolay, on each half:

      > "yes it is worth it, and the own stack is limited by width so the gauge should naturally
      > take from the board size" … "yes it is worth it. and yes the partner board is limited by
      > height, so any increase in its width will naturally take from the tools and that is ok"

      **THE PRICES, measured live at 386x835 — different, and both accepted:**

      | | square | gauge bar | paid for by | cost |
      |---|---|---|---|---|
      | own board | 48.004px | 14.9px | the BOARD — width-derived, so the divisor goes 8 → 8.31 | 384 → 369.7, **−14.3px of board** |
      | partner board | 20.672px | 6.4px | the TOOLS — height-derived, so the board does not shrink and the stack track widens | 218.7 → 212.3, **no board loss** |

      That each is paid by whichever dimension constrains that board is not a quirk to be corrected
      — it is the sizing rule working. A width-limited stack spends width; a height-limited one has
      width to spend.

- [x] 1.2b **A STACK LOOKS THE SAME IN EVERY MODE — the principle this change settles on.**
      Nikolay: *"i don't want letter without gauge solutions, lets keep the stacks look the same as
      in landscape and portrait."*

      So the letter-without-gauge option is refused, and with it the idea that portrait gets its own
      answer to "which board is this". A stack is board, strips, gauge and letter, in that
      arrangement, wherever it is drawn; what changes between modes is the SIZE of those parts, not
      which of them exist. The 6.4px partner bar is accepted as a consequence of that rule rather
      than defended on its own merits.

      **This is the requirement to carry into the delta spec**, because it decides more than the
      gauge: it is what makes the portrait one-column stack and the board-label suppression wrong,
      and it is the answer to any future "can we drop X from the stack on small screens".

- [x] 1.3 **DONE — the square is a whole number of device pixels before and after.** Own square
      48.00390625px → **46.00390625px**. Both are a whole CSS pixel plus `onLayoutGrid`'s constant
      1/256 margin, and both are whole at the harness dpr of 1.5 (72 and 69 device px). The
      quantisation is unchanged because the same helper does it: `stackUnitFor()` is
      `squareUnit((budget * FILES) / stackSquares(), FILES, dpr)`, and the old line was
      `squareUnit(availableWidth(), FILES, dpr)` written longhand. Only the budget handed to it
      changed. No percentage anywhere.
- [x] 1.4 **RE-CHECKED, AND IT IS KEPT — what changed is the rule, not the measurement.** The
      6.2px reading stands; `portrait.css` was right that it is unreadable as a bar, and the
      engine's evaluation is still a number in the Moves tab regardless.

      What changed is 1.2b: a stack looks the same in every mode. Under that rule the partner gauge
      is not being justified as a readable instrument — it is there because the stack has a gauge
      column, and the alternative was a stack that is shaped differently on a phone. The narrow bar
      is the price of the consistency, and it costs tools rather than board.

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

- [x] 3.1 **DONE, and the arithmetic was fixed rather than the rules simply deleted** — which is
      what this task warned against.

      `squareUnit.ts`: portrait's own square now comes from `stackUnitFor(availableWidth(), dpr)`,
      the helper the two landscape modes already used. The old line divided the width by a bare
      EIGHT while the stack it had to fit was 8.31 wide; five other width-derived squares on this
      page went through `stackSquares()` and this one did not.

      **AND THE NUMBER WAS IN FOUR PLACES, which the one-line estimate missed.** `stackSquares()`
      in TypeScript, `8.31` inline in the landscape tracks, and a bare `8` in portrait's app width
      and partner track. Fixing only the TypeScript left the app 2px too narrow for its own
      contents and put the "B" at x=388.16 in a 386px viewport — the exact overflow the old note
      described. So the number is now declared once, as `--bug-stack-squares` in `properties.css`:
      8 on `.round-app.bug`, 8.31 on `.analysis-app.bug`, consumed by both portrait tracks and by
      the landscape ones that used to say 8.31 inline.

      Removed with the cause: portrait's one-column stack template, the board-label suppression in
      `stacks.css`, and the gauge `display: none` in `engine.css`. Each is replaced by a note
      saying what the arithmetic was and why the rule is gone.
- [x] 3.2 NOT NEEDED — option B was not taken, so `drawEval()` keeps filling vertically and needs
      no second axis.
- [x] 3.3 NOT NEEDED — option C was not taken. The gauge keeps its own column and is never drawn
      over a board, so the contrast question does not arise.
- [x] 3.4 **ANSWERED BY 1.2b — they are one decision, and the rule is stronger than this task
      asked for.** A stack looks the same in every mode, so the letter and the gauge are not merely
      decided together: neither may be dropped from a stack on its own. The gap this task describes
      — the letter inheriting the gauge's placement and then its absence — is closed by the column
      existing in portrait again.

## 4. Verify

- [x] 4.1 **PASSES — the check the first attempt failed.** `scrollWidth` 386 against an
      `innerWidth` of 386, and the app's bottom at 835 in an 835px viewport. During the partial fix
      it read 388 against 386, which is how the missing track definitions were found.
- [x] 4.2 **BOTH SQUARES MEASURED, and the difference is the trade that was decided.**
      Own 48.004 → **46.004**, board 384 → 368.03, and the 14.26px gauge occupies what the board
      gave up. Partner **20.672 → 20.672, unchanged**, its 6.41px gauge paid for by the tools
      column instead — which is 1.2's asymmetry doing exactly what it said it would.

      Confirmed across the survey: every portrait ANALYSIS row loses about 16px of own board
      (P1 389.3→373.3, P3 360→344, P5 372→360, P6 429.3→413.3) with the partner board identical in
      each; every portrait ROUND row is unchanged, because `--bug-stack-squares` is 8 there.
- [x] 4.3 **LANDSCAPE UNCHANGED.** Checked live on p1 (1418x612): boards 438.55 and 219.29,
      gauges 16.99 and 8.5 — the same values the code comments quote from earlier measurements.
      The landscape tracks now read `var(--bug-stack-squares)` where they said `8.31`, which
      resolves to the same number. Matrix: identical row set, no failure fixed or broken.
- [ ] 4.4 With the engine running, each board's readout updates on its own slice and holds while the
      engine is on the other board.
- [x] 4.5 **GATES PASS** — `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`. No server change
      and no Python gates, as predicted.
## 5. Not in this change

- 5.1 The PV columns' portrait order — left column is the own board, which portrait puts at the
      BOTTOM. Related, open, and a separate decision.
