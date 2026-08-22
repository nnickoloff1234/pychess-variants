# Tasks

The order matters, and it changed. The original plan was blocked on measuring `k`; there is no `k`
any more, so the font rule comes first and the budget follows from it as arithmetic.

## 0. What is already established

- [x] 0.1 The desktop stack is exactly ten squares and exactly the column: 498.6 in 500, so a name row was never affordable
- [x] 0.2 `--bug-name-fs` is `calc(var(--bug-seat-sq) * 0.218)` in every mode, and holds to the digit: 10.464 on a 48px square, 4.505 on a 20.67px one
- [x] 0.3 The online icon follows the name's font — 14.67 and 6.0 on those two seats
- [x] ~~0.4 The rating does not: 2.702px on both seats in portrait, 11.13px on both in tall landscape~~ **WRONG — see 0.6**
- [x] ~~0.5 So the strip is 0.34 of a square at 48px and 0.44 at 20.67px — a proportion plus a constant, which cannot be reserved in advance~~ **The observation was right, the cause was not — see 0.7**
- [x] 0.6 **The rating draws nothing.** `.bug rating { display: none }` (`bughouse.css:1127`) matches every seat; the box is 0x0 and `<player>` is 179.9px against a link of 179.9px, so it costs not even a flex gap. `main.bug.round rating { font-size: 0.7vw }` is dead code on a hidden element, and the 2.702px was never on screen
- [x] 0.7 **The constant is `.player-data { padding: 2px 6px }`** from `site.css:1664` — exactly 4.00px on both seats, computed `2px` top and bottom. With it taken out the contents are already proportional: 0.4987 of a square on the 48.25px seat and 0.5008 on the 20.67px one
- [x] 0.8 **The single-board username is 16.8px**, `line-height: 50px` — `round-player0 { font-size: 1.2em }` over a 14px root, probed on the live page at 1276 wide by building the markup outside `.round-app.bug` so only the base cascade applied
- [x] 0.9 The current rule gives 11.92px at 1276 wide, 16.74px on p4's own seat and 7.21px on its partner — the last on a row 165.3px wide with nothing else on it
- [x] 0.10 The clock ignores its room: 65.1 x 19.2 in a 194 x 49 space with the name outside (p4), 105 wide in a 218.7 slot with it inside (p3). `.clock-wrap` stretches; the digits do not

## 1. The username's size

- [x] 1.1 State the cap once: `--bug-name-fs-max: 16.8px`, with a comment recording that it is `1.2em` of a 14px root, that it is what every single-board round page uses, and where it was measured — `--bug-name-fs-max: 16.8px` on `.round-app.bug`, with the provenance in the comment
- [x] 1.2 Drive the size from the room with `clamp(floor, N cqi, var(--bug-name-fs-max))`, and put `container-type: inline-size` on the slot the name actually occupies — not on an ancestor whose width means something else — `clamp()` on `.player-data > player` and `> i-side`, container on `.player-data`
- [x] 1.3 **Check every slot for the collapse case first.** `container-type: inline-size` contains the inline axis, so a slot whose width comes from its contents will collapse to nothing and take the font with it. Confirm each slot's width comes from its parent before relying on it — **`round-player0` would have collapsed.** It is a flex item with `flex-basis: auto`, so `inline-size` containment zeroes its content contribution and it stops wrapping onto a line of its own. `.player-data` is the right box: block-level flex, width from its parent. This task earned its place
- [x] 1.4 Choose `N` from the case that has to work — p4's partner row is 165.3px and wants the cap, giving 10.16 — then check it against every other slot in all three modes and record the numbers that chose it — 10cqi holds in all three modes: portrait own 385.1 slot and short landscape 215.5 both reach the cap, portrait partner 164.4 lands at 16.35, squeezed partner 137.7 at 13.68
- [x] 1.5 **Resolved: the floor holds everywhere, and the earlier flag was a wrong-board comparison.** The squeezed partner name at 13.68px had been compared against the OWN board's labels at 14.4px. Against its own board's labels there is margin in every mode: portrait own 16.8 vs 14.4 (1.17x), portrait partner 16.35 vs 6.2 (2.64x), tall landscape 16.8 vs 11.9 (1.41x). Nikolay's rule — small fluctuations do not matter while the name, the dot and the labels all follow the same board — is satisfied for the name and the dot, which are one rule and depend on their own board alone
- [x] 1.6 Confirm the floor and the cap cannot cross: a slot narrow enough to want less than the floor gets the floor and truncates, rather than clamping to something between them — `min(var(--bug-name-fs), var(--bug-name-fs-max))` as the clamp's floor — a bare floor above the cap wins the clamp outright, which would have silently disabled the ceiling above a 77px square
- [x] 1.7 Put the rule on `<player>`, not on `a.user-link`, so the rating inherits it — on `.player-data > player`, so `rating` inside it inherits; `i-side` gets the same rule so the presence dot tracks the name
- [x] 1.8 Delete `main.bug.round rating { font-size: 0.7vw }` — viewport-derived text, on an element that does not render — gone
- [x] 1.9 Confirm the size no longer depends on the length of the name: two players with very different name lengths on equal boards get the same font, and the long one truncates — two names of different length on the same board both draw at 16.8px and only the longer clips — measured 180.4 and 183.2 wide at one size

## 2. Remove the doubling

- [x] 2.1 Delete `calc(var(--bug-name-fs, 0.85em) * 2)` (`bughouse.css:2239`) — it compensates for the square-derived font being too small on a full-width row, which the room-driven rule now handles — gone
- [x] 2.2 Confirm p4's own seat comes down from 16.74px, which the cap alone does not do — it is already under it — 16.74 -> 16.8. It did not come DOWN, and the task expected it to: the doubling was landing a hair under the cap by luck. What changed is that it is now the cap by rule rather than by coincidence, and it no longer moves with the board
- [x] 2.3 Confirm p4's partner seat comes up from 7.21px on its 165.3px row — 7.21 -> 16.35, on the 165.3px row it was ignoring
- [x] 2.4 Check the popped-out and inline states are now the same rule with different room, with no branch on which arrangement it is — one rule, no branch on arrangement — verified by forcing the inside state on portrait and watching the same declaration produce 16.8 and 13.68 from the two slot widths

## 3. The clock takes what is left

- [x] 3.1 The pocket stays `flex: 0 0 auto` and is confirmed untouched in both arrangements — it is the one thing that never gives way — pocket unchanged through every step: 192 in portrait, 218.7 in short landscape, 170.7 in tall
- [x] 3.2 Size the clock from its room rather than from `calc(var(--bug-seat-sq) * 0.2)`, by the same `cqi` mechanism — `min(92cqb, 22cqi)` on `.round-app.bug .clock`, `container-type: size` on `.clock-wrap`
- [x] 3.3 Give the clock a cap of its own, or record why it does not need one: a clock filling a nearly empty strip may be the loudest thing on the page — **No cap, and the reason is structural rather than a judgement.** `min(92cqb, 22cqi)` already bounds the clock against its own wrap, and that wrap is the strip minus the pocket and the name — so the clock is bounded by the board's square, the same thing that bounds everything else in the strip. It cannot run away. Largest observed across every mode and zoom: 50.16px, at 100% zoom in tall landscape where the strip is a full square and the name sits inside it; 42.68 in portrait, 41.0 at 80% tall, 32.5 in short landscape. Reviewed on screen at 100% and accepted.

  A constant cap would also be the wrong shape: it would be the only board-independent size left in the strip besides the name's, and it would make the clock stop growing while its strip kept growing — which reinstates the dead space this change removed (129 x 30 in portrait). If the digits ever do read as too loud, the fix is the coefficient, not a ceiling
- [x] 3.4 Size it from the room's **inline** size, or from a container whose height the strip fixes — sizing it from the height of a container its own content grows is the one arrangement that makes this circular — sized from the room's own box, which takes both axes from outside it — width from `align-self: stretch`, height from `flex: 1 1 0%` against a strip-height column. No cycle
- [x] 3.5 Confirm the name-outside case: the 129 x 30 that p4's own strip currently wastes is used — portrait's own strip: clock 65.1 x 19.2 -> 125.1 x 42.7 in the 194 x 49 it always had. The 129 x 30 is used
- [x] 3.6 Confirm the name-inside case: the clock takes the height left above or below the name's line and nothing is taken from the name's width — portrait partner 8.27 -> 18.18, short landscape 31.7 -> 32.5 (height-bound, as designed), tall landscape 42.24. The name's width is untouched in every case
- [x] 3.7 Confirm the priority holds under pressure — shrink a strip until something must give, and check it is the clock and never the pocket — **Swept both boards through the whole zoom range with the mouse on the resize handle, one board at a time.** The pocket never gave way: it scales with its own board's square, as it must, and is never squeezed by the name or the clock. The clock is what absorbs everything — 50.16 at 100% down to 15.9 at 30%, tracking its strip the whole way

## 3z. The experiment that replaced most of the old section 3

Nikolay asked what the desktop would do if the grid simply let its last row take the space
that was left. The answer changed the plan.

- [x] 3z.1 **129px was already unused**: at 80% zoom the app is 629 tall and its rows summed to 500, because `--bug-tall-sq` is computed for 100% and the boards are smaller than that
- [x] 3z.2 Handing it to the last row got the whole of item 1's goal **without touching the boards** — both usernames on their own line at 90% and below, board unchanged at 393.3, and the right column grew with it so the chat went 332 to 461
- [x] 3z.3 At 100% there is genuinely nothing spare — 11.5px against the ~27 a doubled name needs — so a reservation remains the only way to have the row at exactly 100% zoom
- [x] 3z.4 The clock fills the strip once the name leaves it. `align-self: stretch` gave only 40% — it fills the LINE, not the strip — so the strip's lines share its slack with `align-content: stretch`: clock 51.8 to 71.8, dead space 40 to 0. **Note: this was the clock's BOX. Its digits still do not grow — see 0.10 and section 3**
- [x] 3z.5 The name doubles when it is outside, and the inline size is the floor: desktop 11.17 to 22.3, and p4's partner strip 4.5 to 9.01. **Now withdrawn — see section 2**
- [x] 3z.6 Room under the board for the file labels, `minmax(0, var(--bug-coord-gap))` with the gap stated as `-1 * var(--files-bottom)` so it follows the labels rather than a number of its own
- [x] 3z.7 **The gap wins.** Nikolay's call, after the sweep showed the two competing: gap 7.5 at 100%, 16 at 95%, **0 at 90%** where the names popped and took everything, 16 again at 85% — losing the labels' room in a band, and not monotonically. `seatNamePlacement` now holds the gap back before deciding, so the name takes a line only when one is left after the labels have theirs
- [x] 3z.8 Two things had to be right for that to work, and neither was obvious:
  - `getComputedStyle` returns custom properties **unresolved**, so `parseFloat("calc(-1 * -16px)")` was `NaN` and the reservation silently read as zero. `@property` with `syntax: '<length>'` makes it compute to `16px`
  - `@property` inside `@media` is invalid and ignored — it had landed at nesting depth 1 and did nothing until moved to the top of the file. The symptom was identical to it not existing
- [x] 3z.9 Verified across the sweep after the fix: gap 16 at every zoom from 95 down, names outside from 85 down, dead space 0 throughout, and the order now monotonic
- [x] 3z.10 The mobile modes are unaffected: `--bug-coord-gap` computes to `0px` there — they draw coordinates inside the squares and need no room — p1 keeps its 15px gutter and 437.3 boards, p4 its centred 384 board

## 3b. Inside the strip: clock above, name full width

- [x] 3b.1 Measured the problem on p3's own seat: strip 400, pocket 250, clock 122.5, username 27.5. `.info-wrap` is `flex-flow: row-reverse` with the clock at `flex: 0 0 auto`, so the name absorbs whatever is left
- [x] 3b.2 `.info-wrap0`/`.info-wrap1` are a column: clock above, name below. The clock is `flex: 1 1 0%` with `min-height: 0`, **not** `1 1 auto` — a flex item's automatic minimum is its content, so with `auto` the clock kept its natural 39.2px and pushed the 16.5px name past the strip's 50px, where the strip's own `overflow: hidden` cut it in half. Basis zero makes the name the fixed part and the clock the part that gives way
- [x] 3b.3 Name on one line: `nowrap` + `overflow: hidden` + `text-overflow: ellipsis` on `.player-data`, which is where the text actually lives — on the `round-player0` wrapper it governs nothing, the same trap the popped-out rules already documented. The wrapper's `word-break: break-all` and `max-height: 2.3em` two-line box are gone
- [x] 3b.4 Ellipsis, in both arrangements — it says the name continues where a hard clip just looks broken
- [x] 3b.5 Both span it exactly, measured in all three modes:

  | | strip | pocket | remaining | clock | name | was |
  |---|---|---|---|---|---|---|
  | p3 desktop | 400 | 250 | 150 | 150 | 150 | name 27.5 |
  | p1 short landscape | — | — | 218.7 | 218.7 | 218.7 | — |
  | p4 portrait own | 386 | 192 | 194 | 194 | 194 | — |
- [x] 3b.6 The digits keep their size and simply sit in more room — one correction was needed: `.clock` is 2.9em of the wrap, so at a 10px wrap it draws 29px glyphs in a 39.2px line box, taller than the 33.5 it now has. `line-height: 1` makes the box the glyphs, removing 2.8px of leading that overlapped the name's row and 2.8px that ran past the top of the strip. **Whether the digits should grow is no longer open — section 3 says they should**
- [x] 3b.7 The presence dot still sits with the name at the smallest square this layout makes — portrait's partner strip, 20.67px squares. It is legible only in the sense that the 4.5px name beside it is, which is the same threshold question the coordinates change left open

## 3c. Top and bottom strips are mirrors

- [x] 3c.1 The marker already exists and needs no maintenance: `.seat-strip0` / `.seat-strip1` are what assign `clock-top` / `clock-bot` and `clockB-top` / `clockB-bot`, so the class is what puts a strip on its side
- [x] 3c.2 Confirmed it survives the DOM moves by reading them: `swapSeatBlocksForFlip` swaps the blocks *inside* strips; `swapSeatStripsForSwitch` swaps top with top and bottom with bottom
- [x] 3c.3 Verified on the page in portrait and tall landscape, both containers, both boards: every `seat-strip0` above its board, every `seat-strip1` below
- [x] 3c.4 Implemented as `flex-direction: column-reverse` on `.seat-strip0`'s block, against the column the bottom strip already had. Verified on every strip in all three modes: name above the clock on a top strip, below it on a bottom one
- [x] 3c.5 The popped-out name inverts too — `order: -1` puts it on the first line of a top strip's wrapping row. Verified on p4, whose partner name is popped out on both strips: it sits above on the top strip and below on the bottom one
- [x] 3c.6 Renamed to `own-name-outside` / `partner-name-outside` across `bughouse.css` and `seatNamePlacement.ts` — 21 occurrences, none of `-below` left
- [x] 3c.7 Checked, and two things came out of it:
  - **the username is right-aligned and the presence dot follows it**, per Nikolay: `.player-data` is a flex row with `justify-content: flex-end` and `order: 1` on the `i-side`, so the DOM — which flip and switch both move — is left alone
  - the name ended where the clock's digits did only after `padding-right: 0`: `.player-data` carries `2px 6px`, which left the dot 6px inside an edge the digits sit flush against. Edge mismatch now 0 on every strip
- [x] 3c.8 A third thing the measurement caught: the name still wrapped to two lines in one strip, because `a.user-link` states `white-space: break-spaces` itself and that beats anything inherited from the boxes told not to wrap. Measured a 25.1px name in a 16.5px slot. `nowrap` now stated on the link and the rating

## 4. Take the padding out

- [x] 4.1 Neutralise `.player-data`'s vertical `2px` on this page — the whole of the strip's fixed term, and the horizontal half is already overridden here — `padding: 0 0 0 0.35em` on `.player-data`, computed 0px top and bottom
- [x] 4.2 In `bughouse.css`, scoped to the round page. `site.css` is not to be touched — in `bughouse.css`, scoped to `.round-app.bug`; `site.css` untouched
- [x] 4.3 **The check was written for the old model and is now the wrong one.** With a capped font the name row is deliberately NOT a share of a square: measured 0.4003 of a square on the 48.25px seat and 0.9345 on the 20.67px one. What matters instead is that it is the same ABSOLUTE height on both, which is what makes it reservable — and it is, to the hundredth: **19.31px against 19.31px**. That is the constant section 5 subtracts
- [x] 4.4 Confirm nothing relied on the 4px for separation; if it did, replace it with something proportional rather than putting it back — nothing did. Measured on p4 with the padding at 0: no box overlaps another on any of the four strips — name-to-clock 3.16px on the own seat and 1.74px on the partner, name-to-board 49 and 21.67, and every name still inside its strip's bounds. The separation that remains comes from line boxes, which scale with the font, so it is proportional where the 4px was not

## 5. Decided against: reserving a name row

- [x] 5.1 **The premise was wrong, and Nikolay settled it by looking at the page.** A username folded
  inside the strip at 100% zoom is the INTENDED desktop arrangement, not a defect. Demonstrated live
  with both states side by side — left board at 90% with the name on its own line, right board at
  100% with it folded in — and the answer was that there is no problem with either
- [x] 5.2 So nothing is reserved, the divisor stays 10, and `squareUnit.ts` is not touched. The
  boards keep their full size: 608px at 100% on an 827px-tall viewport, against the 576px a
  reservation would have left
- [x] 5.3 The capability already said this — `The seat strip apportions its width by priority`:
  *"the exception is a board at or near full zoom, where the stack is already the full height it is
  given and there is no room to spend. There the strip keeps its single row."* This change's own
  delta had contradicted it, requiring the name outside "at any zoom, including 100%". That
  requirement is removed
- [x] 5.4 The arithmetic is kept in `design.md` decision 1 rather than deleted: subtract-then-divide
  is the answer to the objection that killed `10 + 2k`, and is worth having written down if a
  reservation is ever wanted for another reason. Verified it would have worked — 767 less 38.63,
  divided by 10, quantises to exactly 72, a whole number of device pixels
- [x] 5.5 Independent of all of the above, and still to check: the popped-out name has — `nowrap` computed on every element in the chain — `round-player0`, `.player-data`, `player` and `a.user-link` — with `overflow: hidden` and `text-overflow: ellipsis` on `player`, on all four strips
  `white-space: nowrap` so its row holds one line by definition

## 6. Placement keeps measuring

- [x] 6.1 `seatNamePlacement` is left alone in every mode. It was going to be replaced with a
  constant answer in tall landscape on the strength of the reservation; with nothing reserved, its
  answer genuinely varies with zoom there as everywhere else
- [x] 6.2 Verified per seat on the page: at 90% the name takes its own line, at 100% it folds into
  the strip, and the two boards decide separately — one board at 100% and the other at 90% gave
  `own-name-outside` alone

## 8. Verify

- [x] 8.1 Desktop at 100% zoom and at several lower zooms: name on its own row, one line, no overflow — tall landscape at 100%, 95%, 90%, 85%, 75%, 65%, 55% and 33%: name on one line at 16.8px throughout, no overflow, and the row appears and disappears at the 100% boundary as intended
- [x] 8.2 Both seats, including boards at different zooms from each other — the cap is one constant, so both should read at the same size — the two boards were held at different zooms throughout the sweep (one fixed at 80% while the other ran 100% -> 0), and both usernames stayed at the cap regardless of the gap between the boards
- [x] 8.3 Portrait and short landscape measured rather than eyeballed, including p4's two very different boards — portrait and short landscape measured on the new game: p3 both names 16.8 inside the strip with the clock at 32.5; p4 own 16.8 / partner 16.35 with clocks 42.68 / 18.18 on boards of 386 and 165.3
- [x] 8.4 A long username, which is the case the width has to survive — truncated on one line in both arrangements — a 59-character username in BOTH arrangements. Outside (p1): one line, clipped at 524 against 455, font unchanged at 16.8, strip height unmoved at 80.3. Inside (p3): one line, clipped, and the pocket (218.7), clock (32.52) and strip height (54.7) all identical before and after — which is the capability's "a long name does not disturb the pocket or the clock"
- [x] 8.5 The inline strip verified in all three modes, and the popped-out state with it: p4's partner name is popped out, where `info-wrap` is `display: contents` and these rules must not apply — its clock is 82.7 wide with the name below at the strip's full 165.3, unchanged
- [x] 8.6 All four strips after a flip and after a switch, confirming each is laid out for the side it is on — **All four strips, in all four states.** p3 unswitched and p4 switched-at-init, each before and after a real flip. Every `seat-strip0` above its board with the name above the clock, every `seat-strip1` below with the clock above the name — 16 strip checks, all correct. The flips were verified to have actually happened by watching the usernames swap top for bottom on both boards, not assumed
- [x] 8.7 A seat with a rating present, once there is one — the same rule should size it with no further work — not applicable yet and recorded as such: `.bug rating { display: none }` means no seat can show a rating today. The rule is on `.player-data > player`, so a rating inside `player` inherits it the moment one is rendered

## 9. The spec deltas describe code that already exists

- [x] 9.1 Section 3b built one line plus an ellipsis against a requirement mandating two lines, character breaking and no ellipsis. The delta now modifies that requirement; confirm the built behaviour and the modified text agree, in both arrangements — one line plus ellipsis confirmed in both arrangements, which is what the modified requirement now says. The built behaviour and the delta agree
- [x] 9.2 Same for the clock: the modified requirement drops "natural width" and the tenths re-wrap. Confirm no rule anywhere still reserves the tenths width — nothing reserves the tenths width: `.clock-holder` is `inline-flex` with no `min-width` and no width rule anywhere in `bughouse.css` mentions the clock. It takes its natural width and widens when tenths appear, which is what the modified requirement requires
- [x] 9.3 Confirm nothing else in the capability still asserts that a username is sized from its board — all four requirements the built code contradicts are covered by MODIFIED blocks whose headers match the main spec exactly — furniture-from-own-board, strip width priority, clock anchoring, and username legibility. Verified by comparing headers rather than by reading

## 9b. Regression found after the change was called complete

- [x] 9b.1 **`.info-wrap` collapsed to 6.3px in a 437.3px strip**, taking the clock to a 1.375px font and `player` to zero width — usernames and clocks invisible on short landscape. Nikolay saw it on p3 and reported it; it was not caught by any check in this change
- [x] 9b.2 **Cause.** `.info-wrap0`/`.info-wrap1` had no width rule at all. As `flex: 0 1 auto` its width came from its children's intrinsic widths, which worked while the clock and the name reported real ones. Both children are now containment contexts — `.clock-wrap` is `container-type: size`, `.player-data` is `container-type: inline-size` — and a containment context contributes **zero** intrinsic width to its parent. The parent collapsed, and both children then read `cqi` from a box that had already collapsed
- [x] 9b.3 **Why the verification missed it.** Task 1.3 checked that each container's OWN width came from its parent, and both did. It did not check the parent's dependency on its children, one level up, which is where the loop actually closed. The trigger made it worse: the strip's flex line had already been laid out with real widths, so nothing forced a re-layout until the blocks moved — the collapse appeared on a FLIP, minutes after the stylesheet that caused it. Every measurement before that flip read correct numbers
- [x] 9b.4 **Fix.** `flex: 1 1 0%; min-width: 0` on `.info-wrap0`/`.info-wrap1`, so the width comes from the strip rather than the contents — which is what inline-size containment requires, and what the capability already asked for in words: the name takes the full width the pocket leaves
- [x] 9b.5 **Verified in all four windows, and across a flip in each.** p3 short landscape restored (info 218.7, clock 32.52, name 16.8, identical across reload and two flips); p2 short landscape inside (info 170.7, clock 21.86); p4 portrait both arrangements, including the inside path forced by hand (info 194, clock 26.39); p1 tall landscape unaffected, where `display: contents` means info-wrap forms no box at all
- [x] 9b.6 **The lesson, since the same trap is available anywhere else containment is added:** a containment context contributes nothing to its parent's intrinsic size, so every ancestor that was sized by that content has to be given its size from above. Check the chain, not the element

## 10. Gates

- [x] 10.1 `yarn typecheck` and `yarn test` — `yarn typecheck` clean; `yarn test` 41 suites, 226 tests, all passing
- [x] 10.2 Sync `static/` and hard reload; a CSS-only swap leaves chessgroundx stale — synced and hard-reloaded in all four windows; host and served `bughouse.css` are the same file (5d250c8c)
