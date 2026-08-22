# Tasks

**The measured baseline, at 1914x827 desktop, own bottom seat, font 57.04px, clock-wrap 183.03px:**
`60:00` and `09:59` draw a 145.8px box (2.56x the font); `00:09.9` and `59:59.9` draw 193.7px (3.40x)
— 10.67px past the wrap. Portrait own clock 26.4px font with 124.57px of slack, partner 19.9px with
31.76px: neither overflows, because the height term binds far below the width term there.

The difference indicator is 21.44px wide on the desktop with 37.24px of free space to the left of the
clock's box, and sits over the first digit regardless.

**The rule these are judged against:** a constant is a claim about a measurement, and it names the
thing it measured. `32cqi` was a claim about `0:09.9`, a form the code cannot emit.

## 1. Establish the widest form from the code, not from the assumption

- [x] 1.1 Confirmed at `client/clock.ts:212`: `mins = (minutes < 10 ? '0' : '') + minutes`, unconditional. The sub-ten-second form is `00:09.9`
- [x] 1.2 Measured on all four desktop seats at font 57.04: `60:00` and `09:59` 145.8px (2.56), `00:09.9` and `59:59.9` 193.7px (3.40). The two the stylesheet called widest and unreachable are the same width
- [x] 1.3 `.byo` cannot display here. site.css hides it with `.clock-time.byo:not(.byoyomi)`, and clock.ts adds the `byoyomi` class only when `byoyomiPeriod > 0 && increment > 0`; bughouse is not a byoyomi family, so the period is 0 and the class is never set. Recorded in the stylesheet comment, because a family that did show it would widen every form
- [x] 1.4 All four seats measured in all three modes. The ratio is a property of the font, not the mode: every seat gives 2.56 narrow and 3.40 wide, and the modes differ only in which term binds

## 2. The bound becomes a division by a named ratio

- [x] 2.1 `font-size: min(92cqb, calc(100cqi / var(--bug-clock-widest)))`, with `--bug-clock-widest: 3.5` on `.clock-wrap` and `00:09.9` named beside it
- [x] 2.2 3.5 against a measured 3.40 — about 3% of headroom — with the asymmetry of the two errors stated at the definition
- [x] 2.3 Rewrite the comment block deriving the old coefficient. It currently argues at length from `0:09.9` and calls `59:59.9` unreachable; both statements are wrong and the reasoning is what a future reader would copy
- [x] 2.4 The height still binds in portrait (26.39 own, 19.92 partner) and short landscape (32.52), each equal to its `92cqb` to two decimals. On the DESKTOP the width now binds, 52.29 against a height-allowed 57.04 — and that is correct rather than a regression, because the widest form at 57.04 needs 193.7px in a 183.03px box. The capability's clause assumed any width bound was an over-estimate; it has been qualified in the delta spec instead of being quietly broken
- [x] 2.5 Every form, every seat, every mode: the widest draws 177.56 of 183.03 on the desktop, 89.61 of 192.02 and 67.66 of 82.69 in portrait, 110.43 of 218.69 in short landscape. Nothing exceeds its wrap

## 3. The indicator is placed by a grid track

- [x] 3.1 Audited. The holder has exactly two children, `div[id^=clock]` and `div[id^=difference]`; the berserk element is a SIBLING of the holder inside the wrap, not a child, so it takes no grid track. Nothing measures the holder — no TypeScript references it at all, and its only rules are the two in this file
- [x] 3.2 Done, with `flex: 1 1 auto` to span the wrap and explicit `grid-row: 1` on both children so neither can be pushed to an implicit second row
- [x] 3.3 No override needed: that rule is in `bughouse.css`, not site.css. The proposal had it wrong; corrected there. site.css stays untouched for the simpler reason that it never held this
- [x] 3.4 Flush in every case measured — the clock's right edge equals the wrap's right edge to 0.00px across four seats, three modes and every form, including when the box widens into tenths
- [x] 3.5 It can. The holder's own `overflow: hidden` was the real risk, not the strip's, and it is harmless now: the holder spans the wrap, so the indicator is inside it in every case rather than hanging off the digits' box as it used to
- [x] 3.6 `align-items: end` on the grid reproduces it; the indicator sits on the row's bottom edge, which is the clock's

## 4. Verify the three placements on the live page

- [x] 4.1 Room for it: indicator entirely beside the clock, trailing edge at the clock's leading edge, no digit covered
- [x] 4.2 Partial room: 5.47px of room against a 21.44px indicator gives 15.97px of overlap — the shortfall exactly, on all four desktop seats
- [x] 4.3 No room: indicator at the clock's leading edge over the first digit, which is where it is today
- [x] 4.4 All four seats, all three modes. The partner's portrait clock is the tightest at 82.69px of wrap against a 67.66px wide form

## 5. Gates

- [x] 5.1 `yarn typecheck` and `yarn test`
- [x] 5.2 Sync `static/` into the container and hard reload every window — a CSS-only swap leaves chessgroundx stale, and a window left unreloaded reads as a bug that is not there
- [x] 5.3 Confirm no clock in any mode, at any zoom, at any displayable value, draws outside its box

## 6. Records that have to change with this

- [x] 6.1 The memory note `clock-difference-covers-digit-by-design` is rewritten. It kept the half that still holds — an overlap in a tight strip is deliberate, don't propose hiding the badge at zero — and reversed the half that no longer does: a badge over a digit with empty space beside the clock is now a regression worth reporting, where the old note said never to mention it at all. The index line was updated with it
