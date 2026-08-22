## 1. Record the reference behaviour

- [ ] 1.1 On the current build, record the seat arrangement for every combination of flip and switch — which player, pocket and clock appear at each of the four positions — as the reference the redesign must reproduce
      **NOT DONE — and no longer possible.** The implementation was already in the working tree when verification began, so there is no pre-change build to record. Flip and switch were instead verified by internal consistency (see 3.7/7.3). Capturing this would have required a scratch checkout of `master`.
- [ ] 1.2 Record the same for the two-board analysis page, which this change must leave alone
      **NOT DONE**, same reason. 7.4 verified the analysis page against expected behaviour rather than a recorded reference.

## 2. Introduce the seat strip

- [x] 2.1 Give `RoundSeatView` a `view(pocket)` that returns the strip wrapping that seat's pocket and its existing block, following the convention that a multi-element widget exposes one composed view
- [x] 2.2 In `round.ts`, pass each pocket vnode to the seat view that owns it, so the four strips replace the eight separately-placed elements
- [x] 2.3 Keep the existing class names on the inner elements so unrelated rules that target them are unaffected

## 3. Move flip and switch onto strips

- [x] 3.1 Replace `swapClockGridAreasForFlip()` with a strip-level flip: exchange the two seat blocks of each board between that board's strips, by DOM move, leaving pockets in place
- [x] 3.2 Comment why pockets must not move — `redrawAll()` already re-renders their contents for the new orientation, so moving them applies the exchange twice
- [x] 3.3 Replace `swapClockGridAreasForSwitch()` with a strip-level switch: exchange board A's strips with board B's
- [x] 3.4 Split `TwoBoardController.switchBoards()` so the board-level swap stays shared and each page supplies its own furniture step; the analysis page keeps the existing pocket-node swap
- [x] 3.5 Remove the inline `style.gridArea` writes on seat blocks and the `RoundSeatView` constraint that the block must never be re-patched
- [x] 3.6 If `swap()` has lost its last caller, remove it; if the analysis page still uses it, leave it there
      Retained — the analysis page is still a caller, confirmed live in 7.4 where switch moved the pocket nodes.
- [~] 3.7 Verify every flip/switch combination against the reference from 1.1
      **PARTIAL.** Flip and switch were each exercised live in a real game (p3's window) and checked for internal consistency: names and clocks travelled together, the running clock stayed with the correct player across both operations, pockets were not double-applied on flip, and strips traded grid areas pairwise on switch. Not every *combination* was enumerated, and there was no recorded reference to compare against.

## 4. Re-express every mode in terms of strips

- [x] 4.1 Short landscape: four column tracks — `calc(var(--bug-sq) * 8)`, the ranks gutter, `calc(var(--bug-sq) * 8)`, `1fr` — with one area per strip
- [x] 4.2 `min-height: 600px` landscape: collapse each board's two columns into one and place strips; drop board B's mirror so both boards present pocket, name, clock in that order
- [x] 4.3 Fix the `tootsB` typo in that block's third row while rewriting it, and confirm the tools column spans what it should once the misspelt single-cell area is gone
- [x] 4.4 Portrait: collapse board A's two columns into one; give board B a single strip per seat, spanning the rows its pocket and clock occupy separately today and stacking its children in the same order
      Code written. Board A still declares two column tracks, but every area spans both, so it behaves as one. Rendering unverified — see 4.7.
- [x] 4.5 Write the strip's internal layout once, shared by all three modes, so a mode only chooses the strip's position, size and axis
      Done late (2026-08-09): internals hoisted out of the short-landscape query to top level, scoped `.round-app.bug`, parameterised by `--bug-strip-h` / `--bug-clock-fs` / `--bug-name-fs`; portrait overrides only the axis.
- [~] 4.6 Confirm the `min-height: 600px` mode by resizing a harness window, and look at board B's un-mirrored pockets to decide whether to keep the unified order or restore the mirror with one `flex-direction`
      **PARTIAL.** The mode was reached (p1 at 1362x1119) and its four-column grid rendered, but its appearance was not reviewed and the un-mirrored pocket question was not decided. This mode was also found to still exhibit the chessgroundx stale-bounds one-file click offset, because it sizes the app to content and centres it — deferred to a follow-up change.
- [ ] 4.7 Verify portrait, taking it together with the portrait verification the previous change left open; if no live path is available, say so rather than marking it done
      **NOT DONE — portrait ships unverified**, as the design anticipated. Deliberately deferred.

## 5. Size the pocket from its contents

- [x] 5.1 Define `--bug-pocket-sq`, defaulting to `calc(var(--bug-sq) * 0.8)`
- [x] 5.2 Size the pocket from its own inline `--pocketLength` times that parameter, targeting the inner element that carries the count rather than the `cg-wrap.pocket` wrapper, which does not
- [x] 5.3 Confirm the rendered pocket is pixel-identical to before, since five cells at 0.8 squares is the four-square pocket it replaces
      Measured 218.67px at `--bug-sq` 54.667 (= 4 squares exactly), and the ratio held at every other viewport tested (152 at sq 38, 142.93 at sq 35.73).

## 6. Lay out and size the strip's contents

- [x] 6.1 Make the strip a flex row: pocket `flex: 0 0 auto`, player bar `flex: 1 1 auto` with `min-width: 0`, clock `flex: 0 0 auto`
- [x] 6.2 Bottom-align the strip's contents, which is also what keeps the name clear of the file labels overhanging 16px below the board
- [x] 6.3 Anchor the clock to the strip's **visual** trailing edge — `.clock-wrap` is `row-reverse` here, so that is `justify-content: flex-start`
- [x] 6.4 Let the clock size to its content, and give the name no trailing padding
- [x] 6.5 Replace the clock's `font-size: 5pt` with `0.2 × --bug-sq` — measured 10.9333px at sq 54.667
- [x] 6.6 Replace the player bar's `0.7vw` with `max(0.218 × --bug-sq, <coordinate-label size>)`, and drop the fixed `height: 48px`
      Done late (2026-08-09). Both are **overridden** under `.round-app.bug` rather than deleted: `main.bug round-player0/1` is shared with the analysis page, which this change must not touch.
- [x] 6.7 Limit the name to two lines with `max-height` plus `overflow: hidden`, and set `word-break: break-all`
- [x] 6.8 Confirm no third line appears even partially, that no ellipsis is rendered, and that the full name is still present in the DOM
      `clientHeight` 27 against `max-height` 27.41 (exactly two 13.7px lines); `text-overflow: clip`; full name in the DOM. The clipped overflow is the rating line, not a partial third line of name.
- [x] 6.9 Measure a rank label's computed font size and confirm the name's is greater than or equal to it — 11.9173px name against 11.9px label.
- [~] 6.10 Confirm a name at any length leaves the pocket's and the clock's geometry unchanged and does not change the round app's width
      **PARTIAL.** Held across the 16–20 character names in play and across five viewports, but no deliberately extreme name was tried.
- [x] 6.11 Set the pocket cell to `0.8 × --bug-sq`
- [x] 6.12 Raise the board above the strip so its file labels paint over the pocket and clock
- [~] 6.13 State `pointer-events: none` on the labels rather than relying on chessground's own rule, and verify by hit-testing points inside the overhang that the pocket piece beneath receives the event
      **PARTIAL.** The rule is stated; the hit-test through the overhang was not run.
- [x] 6.14 Set the clock difference indicator to `1.5em`, and confirm it overlays the clock's leading digit rather than being clipped
      Measured 19.2px wide over a 105px clock, overlaying the leading digit. Confirmed by Nikolay as intended behaviour.
- [x] 6.15 Re-check the tuned fractions at a second viewport size
      Checked at five: 1362x551 (dpr 1.5), 842x381 (dpr 3), 800x360 (dpr 3), 915x413 (dpr 2.625), 932x430 (dpr 3).
- [ ] 6.16 Look at the truncation against real usernames rather than the harness's 20-character test names before accepting it
      **NOT DONE** — only `Test–xxxx` names were available.

## 7. Verify

- [x] 7.1 Build, hard-reload all four harness windows, and confirm the boards did not move or change size
- [x] 7.2 Play the standard test line on both boards and confirm clicks land on the intended squares
      Went further: 8 additional moves driven by clicks placed 0.24–1px inside each of the four edges and four corners, all landing exactly, at four viewports and three device pixel ratios.
- [x] 7.3 Exercise flip and switch during a live game, in both seats, and confirm clocks keep ticking for the right players afterwards
- [x] 7.4 Confirm the analysis page's flip and switch match the reference from 1.2
      Verified against expected behaviour (no 1.2 reference existed). Flip inverts both orientations and moves nothing; switch trades the boards' grid areas and swaps the pocket nodes via the retained `swap()`. No console errors observed.
- [x] 7.5 `yarn typecheck` and `yarn test` — clean; 41 suites, 226 tests.

## 8. Added during implementation (not in the original plan)

- [x] 8.1 Stop the chat column forcing the boards off-screen on narrow viewports: `.round-app.bug > .bug-round-tools { min-width: 0; overflow: hidden; }`
      A grid item's automatic minimum size held the `1fr` track at ~196px, pushing the centred grid past the viewport so both boards were clipped. On an iPhone SE landscape viewport (667x375) the grid was 782px against 665 with board A at x=-59; after the fix it fits exactly with board A at x=0 and the chat absorbing the shortfall. Verified live on iPhone SE; iPhone 14, Galaxy S22, Pixel 7 and iPhone 14 Pro Max never reach the floor.

## Known gaps carried forward

- Portrait is unverified (4.7).
- The `min-height: 600px` mode is unreviewed and still shows the chessgroundx stale-bounds click offset (4.6).
- The chat is present but not usable at phone widths (~52px on an iPhone SE).
- Neither flip/switch reference (1.1, 1.2) was ever recorded.
