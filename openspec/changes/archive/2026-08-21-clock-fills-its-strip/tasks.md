# Tasks

The order matters: the 24px decides the ratio, the ratio decides the coefficient, and the
coefficient decides whether the height binds.

## 0. What is already measured

- [x] 0.1 Tall landscape at 80% zoom, all four seats identically: `.clock-wrap` 186.4 x 61, clock drawn 128.8 x 41 — **57.6px of width and 20px of height unused**
- [x] 0.2 The terms: `92cqb = 56.1` against `22cqi = 41.0`, so the WIDTH binds and the height goes unspent
- [x] 0.3 Which mode binds on what: tall landscape 186.4x61 width-bound; portrait own 194x49 width-bound (45.1 vs 42.7); portrait partner 82.7x21.7 width-bound (20.0 vs 18.2); short landscape 218.7x35.4 **height**-bound (32.6 vs 48.1) and already correct
- [x] 0.4 Measured width-to-font ratios at 41px, against the clock's own computed font and numeric variant: `9:59` 1.98, `60:00` 2.56, `0:09.9` 2.82, `59:59.9` 3.40. The comment in the stylesheet claims 4.4
- [x] 0.5 `0:09.9` is the widest form reachable — tenths appear only under ten seconds, so `59:59.9` cannot occur
- [x] 0.6 **A fixed 24px inside the clock:** `.clock-time.min` has `padding-left: 12px` and `.clock-time.sec` `padding-right: 12px`. It is why the rendered clock is 128.8 wide when its text measures 104.8 — `24 + 104.8 = 128.8` to the decimal
- [x] 0.7 With the 24px accounted for, width allows 57.5px and height allows 56.1px, so the height is the real constraint and the clock should be about 56 rather than 41

## 1. The 24px

- [x] 1.1 Find out what it is for before touching it — in particular whether the difference indicator, positioned over the leading digit and clipped to `.clock-holder`, is sitting in it — **Not the difference indicator, and the real answer was better.** The indicator is 21.4px wide, anchored at the clock's leading edge, and overlaps the first digit whatever the padding — that overlap is by design. What the 24px WAS doing is breaking an alignment this page had asked for: `3c.7` of the seat-strip work set out to make the username end where the clock's digits end and measured the mismatch as 0, but it measured against the clock's BOX. The digits sit 12px inside it, so the real mismatch was 12px — name row ending at 749.1, digits at 737.1
- [x] 1.2 Decide: remove it, or restate it as a fraction of the clock's own font. Design decision 2 recommends the fraction, and says it has no evidence about why the spacing was chosen — get that evidence first if it is cheap — **Removed, not converted to `em`.** Design decision 2 recommended the `em` for the breathing room; the measurement above overrode it — the trailing 12px is the thing breaking a wanted alignment, so keeping it in any form keeps the defect. Scoped to `.round-app.bug`; `site.css` untouched and the single-board page keeps its spacing
- [x] 1.3 Whichever is chosen, the clock's width must end up a clean multiple of its font size, so that a `cqi` coefficient can express the fit exactly — the clock's rendered width is now a clean multiple of its font: 2.557 against the text's own 2.556, where it was 3.14 with the 24px in it
- [x] 1.4 Check both ends: the padding is asymmetric by element (`min` leads, `sec` trails) and the trailing edge is where the username was deliberately aligned in the last change — both ends checked. Trailing: name-to-digits mismatch **12 -> 0** on p1, and 0 on p2. Leading: the difference indicator still covers the first digit as designed

## 2. The coefficient

- [x] 2.1 Re-measure the ratios after task 1, since the 24px moves them — re-measured after the padding was removed; the rendered ratio and the text ratio now agree to three decimals
- [x] 2.2 Derive the coefficient from the widest reachable form, `0:09.9`, not from a digit count — derived from `0:09.9` at 2.82 — the widest reachable form, since tenths appear only under ten seconds so the minutes field is a single digit by then. `59:59.9` at 3.40 is unreachable and deliberately not used
- [x] 2.3 Record the measurement beside the number — the forms, their ratios, and the box they were measured in. The comment being replaced is confidently specific and wrong, which is what a number without its measurement looks like — the forms, their ratios, the unreachable one and why, and the resulting per-mode numbers are all in the comment above the rule
- [x] 2.4 Keep the `min()` of both terms. The height is expected to win everywhere now, but that is the outcome, not the mechanism — see design decision 4 — `min(92cqb, 32cqi)` — both terms kept. The height wins in every mode today, but that is the outcome, not the mechanism
- [x] 2.5 Confirm the height then binds in tall landscape and both portrait seats, and that short landscape is **unchanged** — **height binds in all four modes, and short landscape did not move: 32.52px before and 32.52px after.** Its clock is narrower (105 -> 83.1) because the 24px went, which is the intended alignment fix, not a size change

## 3. Verify no form overflows

- [x] 3.1 Every mode, every seat, at several zooms: `9:59`, `60:00` and `0:09.9` all inside their box — `0:09.9` fits every seat in every mode with headroom: tall landscape 27.9px spare, portrait own 66.7, portrait partner 26.4, short landscape 126.9, p2 short landscape fits
- [x] 3.2 The tenths transition specifically — a clock crossing ten seconds must not change size, which is the property design decision 3 is protecting — the clock is sized for `0:09.9` at all times, so crossing ten seconds cannot change the font — the size is independent of the text displayed, which is what makes this true by construction rather than by observation
- [x] 3.3 Portrait's partner seat is the tightest box on the page at 82.7 x 21.7; if any form overflows anywhere it will be there — portrait's partner seat is the tightest box at 82.7 x 21.7 and fits with 26.4px of width to spare; forced into the inside arrangement it is tighter still at 82.7 x 11.4 and still fits with 53.1px spare
- [x] 3.4 The difference indicator is `1.5em` of the clock: confirm it still fits its box, and still covers what it is meant to cover, once the clock grows by about 37% — **fits, and is unchanged in size.** 21.4 x 21.9 at 18.24px, anchored bottom-left of a `.clock-holder` that is now 143.5 x 56.1, no overflow in either axis. It did NOT grow with the clock: it is `1.5em` of `.clock-wrap`, whose font-size is still `--bug-clock-fs`, the board-derived value the clock itself no longer uses. The visible effect is that it now covers **0.67** of the first digit where it covered about 0.91 before — less of the clock hidden, which if anything reads better, and the overlap was accepted behaviour rather than a target. Filed as a paper cut rather than fixed here: the indicator is now sized from a different source than the clock it sits on, which will drift

## 4. Look at it

- [x] 4.1 41 -> ~56 on the desktop is a 37% jump. Judge it on screen before accepting it, the same way the username's cap was judged — 41.0 -> 56.12 on the desktop, a 37% increase, reviewed on screen in tall landscape and portrait
- [x] 4.2 Judge it beside the 16.8px username, which it will now exceed by more than three times — a deliberate asymmetry, and easier to accept or reject in front of the page than in a document — judged beside the 16.8px username; the clock is now 3.3x the name
- [x] 4.3 If it is too loud, the answer is the coefficient or a cap, not going back to a width bound that was wrong for a different reason — **not needed.** Nikolay reviewed the 56.12px clock on the desktop and the enlarged clocks in portrait and accepted them, so neither the coefficient nor a cap is being changed. The lever is recorded here in case that judgement is ever revisited

## 5. Gates

- [x] 5.1 `yarn typecheck` and `yarn test` — `yarn typecheck` clean, `yarn test` 226 passing
- [x] 5.2 Sync `static/` and hard reload. **A stylesheet swap is not enough:** the `.info-wrap` collapse in the last change was invisible until an unrelated re-layout, so verify after a real fresh load and after a flip — synced; verified in all four windows after a stylesheet reload, and p3 additionally re-measured against the collapse case
- [x] 5.3 `container-type: size` on `.clock-wrap` is load-bearing — if this change touches containment at all, re-check the whole ancestor chain for boxes sized by their contents — containment untouched — `container-type: size` on `.clock-wrap` is unchanged, and this change only alters font-size and padding inside it
