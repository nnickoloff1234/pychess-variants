# Tasks

Portrait is the reference this time. p4 must come out with the same numbers it has today:
buttons 33.5px, both parts dropped and full width at 367.3, one set row each, chat 264.9,
`unusedBelow: 0`.

## 0. The before state, captured while it still existed

Recorded here because p1 had not been reloaded since the change that caused this, so the old
build was still on screen — a before that is normally gone by the time anyone looks.

- [x] 0.1 p1, short landscape, 1272x551: **45.9px buttons, 4 rows of 5**, parts column 382.3
- [x] 0.2 p1 after reload, same window: **30.1px buttons, 2 rows of 10**, parts column 382.3
- [x] 0.3 p3, tall landscape, 1590x689: 27.5px buttons, parts column 318 (20vw)
- [x] 0.4 Cause read from the CSS: `--bug-preset-btn` resolves to `--bug-preset-btn-min` in both landscape modes, because only portrait raises it

## 1. Publish the parts column's width

- [x] 1.1 `client/two-board/round/partsWidth.ts` publishes `--bug-parts-w` on the round app — read from the column's own resolved `grid-template-columns` rather than from the chat, so it is the track itself and not a proxy for it
- [x] 1.2 ResizeObserver on the app, the column and the partner stack. The stack is not optional: a zoom slider moves width from the board's track to the parts track and leaves the column exactly as wide as it was, so observing the column alone misses every zoom
- [x] 1.3 Asserted against the track in both landscape modes — p1 `382.333px` against tracks `437.333px 382.333px`; p3 `317.995px` against `398.906px 317.995px`, which is 20vw of 1590 to within 0.005px
- [x] 1.4 Nothing else published a width that would serve; `--bug-own-sq` and the seat units are board-derived, not column-derived

## 2. Landscape raises the floor

- [x] 2.1 Short landscape: `--bug-preset-btn: max(floor, var(--bug-parts-w, 0px) * 0.6 / 5)`
- [x] 2.2 Tall landscape: the same rule verbatim — see 5.3
- [x] 2.7 Rows spread rather than centre: `flex: 1 1 auto` and `justify-content: space-between` on the set, in the landscape blocks only. Growing a set does not change which row it landed on — wrapping is decided from content width, before any growing
- [x] 2.3 Portrait untouched. Confirmed from the page rather than from the diff: its computed value is still `max(calc(calc(368px / 8) * 0.55), calc((100vw - 32px) / 10))`, with no mention of `--bug-parts-w`
- [x] 2.4 The sets no longer pair in either landscape mode, and it follows from the width: at 61.2px, ten buttons need 623px of a 318px column
- [x] 2.5 `--bug-preset-gap` added so the gap is named once and the subtraction cannot drift from it
- [x] 2.6 Both landscape rules carry `.round-app.bug`. A media block adds no specificity, so a bare `.chatpresets` ties with the top-level default and loses on document order — the same trap portrait already had to dodge

## 3. Verify against the before table

- [x] 3.1 p1: **45.9px**, two rows of five per part, set spanning the full 382.3 column — exactly the pre-regression size, against 30.1 during it
- [x] 3.2 p3: **38.2px**, two rows of five per part — against 27.5 during the regression
- [x] 3.3 Mixed state on p3 at zoom 60: one part 318 wide showing 5+5, the other dropped at 632.4 wide showing **10 in one row at half the height**, and every button 38.2 in both. Different widths, one size, different arrangements — which is the whole point
- [x] 3.7 The pairing works at every dropped width tried: zoom 60 (one part dropped, 632.4), zoom 50 and 40 (both dropped, 580.4 and 534.1) — ten to a row in each
- [x] 3.4 p4 portrait: rule unchanged and still viewport-driven; `(380 - 32) / 10 = 34.8` is exactly the button drawn. The absolute number differs from the 33.5 recorded earlier because p4's viewport now reads 380 where it read 367 then — the rule follows the viewport, and the viewport moved between the two measurements
- [x] 3.5 No horizontal page overflow in any of the three modes
- [x] 3.6 Settled everywhere: twelve samples ~90ms apart agreed on p3 and p4

## 4. The drop order still holds

- [x] 4.1 Swept through the slider, not by poking `--zoom-b`
- [x] 4.2 Order unchanged: tablist, then the second preset part, then the first
- [x] 4.3 Thresholds under option B, recorded before it was rejected: 68 / 58 / 46 against 68 / 64 / 58 before
- [x] 4.4 Every step sampled twice, ~340ms apart; no step disagreed with itself
- [x] 4.5 Re-run under option A on a fresh game (`z48x05TD`), zoom 100 to 24 in steps of 2, each step sampled twice:

  | | tablist | second part | first part |
  |---|---|---|---|
  | before the regression | 68 | 64 | 58 |
  | option B | 68 | 58 | 46 |
  | **option A** | **68** | **60** | **56** |

  Order intact, no step disagreed with itself, buttons 38.2 at every zoom, and the arrangement
  changes exactly where a part drops: at zoom 60 the dropped part reads `10` while the one still
  beside the board reads `5+5`

## 5. Decisions recorded

- [x] 5.1 **Option A — 0.6 of a fifth of the column.** B was chosen first, built, and rejected on the page: its buttons were too large, and worse, a set sized to fill the column can never pair with its sibling, so a part that dropped below the board stayed two rows of five instead of expanding into one row of ten. Splitting the presets into two parts of two sets exists for that expansion. A restores it — and the size, at 45.9 on p1, is the pre-regression size exactly. See design decision 3
- [x] 5.2 The tell buttons size with the piece buttons. They share a set, and splitting them would mean two sizes on screen again for no stated reason
- [x] 5.3 One policy for both landscape modes. Tall landscape's track is literally `20vw` and could have been written as a vw expression, but then two rules would state the same track and could drift apart

## 6. Gates

- [x] 6.1 `yarn typecheck` clean, `yarn test` 226 passed
- [x] 6.2 Synced into the container and hard reloaded all four windows

## 7. Left open

- [x] 7.1 Chat height: no longer a concern under A — 313.2 on p1 and 297.4 on p3, against 200.3 and 205.2 under B
- [x] 7.2 p4's 8px of vertical page height — diagnosed since as site.css's `body { margin: 0 0 2vmin }`, clipped rather than scrolled. **Moved to `boards-resize-only-on-user-action` tasks 5.x**
- [x] 7.3 p4 portrait re-measured under option A on the new game: buttons 34.8, all three parts dropped — the same as before option B was tried, which is what "portrait is untouched" has to mean in numbers rather than in argument
- [x] 7.4 A live game was needed for 4.5 and 7.3 and one was created — `z48x05TD`, bughouse, 90+0, all four seats filled. The previous game ended mid-verification: two players had been on move since the game was created ~89 minutes earlier and were down to about a minute; moves were made to park the turn on the other two, whose clocks displayed 89:31 and 89:26 and then ran out within roughly two minutes. The displayed value and the server's remaining time disagreed by an order of magnitude — worth a look on its own, and related to [[round-clocks-are-client-authoritative]]
