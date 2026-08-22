# Tasks

**Measured baseline.** p1 at 1914x827, button 45.92 on all four sets: the column rows step 38.3 and
the dropped row of ten reads `53.52 53.52 53.52 53.52 0 53.52 53.52 53.52 53.52`. Its last five sit
at 1199.34 while the five above sit at 1306.16 — nothing aligns. p4 at 386x835, button 35.4: both
rows step 3, the boundary is 0, and the last five already land at 196.03, exactly under the five
above. Portrait is the reference, not a target.

`--bug-parts-w` measured 382.797 on p1 at every board zoom and 218.656 on p4 — the pitch's input does
not move when the board does.

**The rule these are judged against:** one pitch for every row, one gap at every boundary, rows
aligned to their trailing edge. Spare width goes to the margin.

## 1. Take the spreading out

- [x] 1.1 Delete the tall-landscape `.chatpresets-set` override — `flex: 1 1 auto` plus `justify-content: space-between`. It appears TWICE, in both landscape blocks; check both
- [x] 1.2 Confirm the base rules then apply: sets at natural width, `justify-content: flex-end`, grid tracks of `--bug-preset-btn` with `gap: var(--bug-preset-gap)`
- [x] 1.3 Rewrite the comment that justifies growing a set into its row. It argues for exactly the behaviour being removed

## 2. One gap, at every boundary

- [x] 2.1 `gap: var(--bug-preset-gap)` on `.chatpresets`, which has never had one — this is the whole of the `0` between sets
- [x] 2.2 Confirm it applies in every mode, portrait included, where the boundary should go from 0 to 3 and match the spacing inside its sets
- [x] 2.3 REVERSED BY MEASUREMENT, and by Nikolay on seeing it. The row gap must NOT be the pitch: applied vertically it put 38.27 between the two rows of a part against 5 between two parts, so four stacked rows read as two pairs. `gap` is now split — `column-gap` is the pitch, `row-gap` is the 5px that separates parts — and all three vertical gaps measure 5

## 3. One pitch, set by the five-button row

- [x] 3.1 Done, as `max(3px, calc(...))`. Reproduces the column exactly: 38.27 against 38.3 on the desktop, 38.63 against 38.63 in short landscape
- [x] 3.2 Give that expression a floor of the base gap, so a narrow parts column cannot make it small or negative
- [x] 3.3 Portrait: unchanged, keeping the base 3px. Do NOT derive its gap from its column — that computes to 10.41 and would change the mode this change is modelled on
- [x] 3.4 Confirm the ten-button row takes the pitch rather than computing one: its nine gaps should equal the column's four

## 4. Verify the alignment, which is the point

- [x] 4.1 Measured button by button: maxOffset 0. Every arrangement — [5,5,10], [10,10] and [5,5,5,5] — has every row's last five at identical x
- [x] 4.2 Verify in portrait too, where it already holds — the fix must not disturb it. Right alignment should keep the last set anchored while the first set moves by the new boundary gap
- [x] 4.3 Verify the row of ten spans 803.6 of the 887.36 available on p1, with the leftover on the LEFT

## 5. Verify the reflow is inert

- [x] 5.1 Both parts drop at zoomB 69.4, giving two rows of ten with the same button, gap and alignment as the single row had. NOTE: below ~783px part width the sets un-pair into 5+5, because ten at this pitch need 803.7px — see 7.2
- [x] 5.2 Sweep the board zoom across the reflow and confirm the gaps do NOT slide the way they do today (53.52 -> 38.52 -> 26.52)
- [x] 5.3 Confirm no set is ever broken across rows at any width

## 6. Modes and gates

- [x] 6.1 Short landscape shows no dropped state at 1276x551 — four rows of five in the column — and the explicit expression reproduces its spacing exactly, 38.63 against 38.63
- [x] 6.2 Confirm the button size is untouched everywhere — 45.92 on p1, 35.4 on p4 — since this change is about spacing only
- [x] 6.3 Confirm the parts still drop as they do today. Button size feeds the placement decision, and while this change does not touch the size, the check is cheap and the failure was seen during investigation
- [x] 6.4 `yarn typecheck` and `yarn test`
- [x] 6.5 Sync `static/` and hard reload every window

## 7. Found and fixed during implementation

- [x] 7.1 **The pitch was being applied to both axes.** `gap` sets row and column together, and the vertical one made the two rows inside a part sit 38.27 apart while two parts sat 5 apart — four stacked rows grouped into two visible pairs. Split into `column-gap` (the pitch) and `row-gap`, and named the 5px as `--bug-preset-row-gap`, used for the padding that produces it as well so the two cannot drift. Verified: all three vertical gaps are 5, and all four rows share identical x positions
- [x] 7.2 **ACCEPTED by Nikolay on 2026-08-22**, by archiving rather than revisiting. Pairing now costs twice the parts column, because ten buttons at the column's pitch need 803.7px against 486.2 at the old tight spacing. Measured: paired at a part width of 823, stacked by 783. The two-rows-of-ten case still works and Nikolay accepted the behaviour on seeing it — but it is a real reduction in the range over which sets pair, and it is worth revisiting if a narrower board turns out to matter. The lever if it ever does: a smaller pitch buys back the range — gap 15 pairs down to ~600px and gap 3 down to 486 — at the cost of the column no longer filling
