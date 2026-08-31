## 1. Establish the stack shape before writing any track

The one unknown that gates everything else — see design decision 4.

- [x] 1.1 Measured on `JJgZzLhJ?ply=0` at 1418x612: board 425.3px (square **53.166**), pocket-top and pocket-bot **53.59** each, stack total **532.50**.
- [x] 1.2 The clocks are `position: absolute` and contribute **0** height — `selection#mainboard` measures exactly the board's 425.3px. They are overlays on the board, not rows beside it, so they do NOT add to the stack.
- [x] 1.3 **It is ten rows.** pocket + 8 board rows + pocket = 532.50 against 10 x 53.166 = 531.66 — the 0.84px difference is each pocket running 0.422px over a board square, exactly the leftover quantisation removes. `squareUnit.ts` is reused UNCHANGED; no second unit. Also recorded: the app measures 809.2px in a 612px viewport, overflowing by ~197px, which is why the eval graph is clipped.

## 2. Share the role marking

- [x] 2.1 New `client/two-board/common/boardRoles.ts`: `ownBoardName(seats)` (seat-based, `'a'` for the seatless) and `markBoardRoles(isOwnSide)` + `isOutsidePartnerStack()` (positional), with the two questions documented as distinct.
- [x] 2.2 `markRoles(views)` stays in `round/roundControls.ts`, now calling `markBoardRoles(isOutsidePartnerStack)` plus its seat-strip half. Analysis calls `ownBoardName()` when building the view and `markBoardRoles()` from `analysisCtrl`.
- [x] 2.3 Round page verified live on `/JJgZzLhJ`: `own-board=mainboard`, `partner-board=bugboard`, 2 own seats + 2 partner seats, grid areas unchanged.
- [~] 2.4 Seatless case implemented (`ownBoardName` returns `'a'`) but NOT observed — all four harness windows hold player identities. Needs a fifth, seatless viewer.

## 3. Rebuild the element tree

- [x] 3.1 The gauge is now INSIDE its stack, in the board's own row. The first attempt made it a sibling of the stack, which spans pocket/board/pocket, so the gauge overhung the board by a pocket at each end — 550.17px against a 438.55px board. Inside, it stretches to exactly the board with no arithmetic: verified top delta 0, bottom delta 0 on BOTH stacks. Width is a ratio of the square, **0.31**, measured from p1 (16.99 / 54.8203 = 0.30994) rather than chosen; live ratios now 0.3099 and 0.3097.
- [x] 3.2 `toolsTabs` = `TabbedPanels('analysis-tools', ...)` with **Moves / Info / Chat**, confirmed live.
- [x] 3.3 Moves holds `#ceval`, `engine.pvPanel()`, `.movelist-block`, `#move-controls` and `#misc-info` together.
- [x] 3.4 Info holds `gameInfoView.placeholder()`. Live: "60+0 - Casual - BUGHOUSE, 17 hours ago" plus all four players and ratings.
- [x] 3.5 Chat holds `#roundchat`, moved out of `leftSide()`.
- [x] 3.6 `under-board` untouched — chart and FEN & PGN keep their home, now on their own full-width row.

## 4. Replace the grid

- [x] 4.1 Seven-column template deleted, including the `0.8em` spacer column named `d`.
- [x] 4.2 `'ownstack gauge partnerstack gaugePartner tools'`, one rule for both landscape modes. Verified live at 1418x612 in that exact left-to-right order.
- [x] 4.3 Portrait written fresh: `'partnerstack gaugePartner' / 'tools tools' / 'ownstack gauge'` plus uleft/uboard rows. Verified at 386x835 with `ownIsBelowPartner: true`.
- [x] 4.4 Tracks are `calc(var(--bug-tall-sq-a) * 8)` / `-b`, nothing multiplied in afterwards. The zoom is already inside the published unit.
- [x] 4.5 Settled by the gauge rework: both gauges are now sized from the published square unit via their stack's second column, overriding analysis.css's flat `--gauge-gap: 17px`. Nothing gauge-related reads the old `30vw` track.

## 5. Verify on the live page

Harness in analysis mode — see the `harness-two-test-modes` memory. Game `JJgZzLhJ`.

- [x] 5.1 Live at 1418x612: ownstack x=45, gauge x=495, partnerstack x=525, gaugePartner x=875, tools x=904. Five columns, no implicit ones.
- [x] 5.2 Live at 386x835: partner on top, tools between, own board full width at the bottom.
- [x] 5.3 **Closed on p3.** p1 could not answer it — that browser's stored zooms are `standard8x8-zoom-a=100` and `zoom-b=77`, so its boards are 439px and 338px BY SETTING (ratio 1.2982 against the zoom ratio 1.2987, i.e. correct but not a match test). p3 has both zooms at **100** and its two boards measure **437.4px and 437.4px, equal to within 0.5px**. Equal zoom does give matching boards.
- [x] 5.4 **The impersonation test passed and the two windows genuinely differ.** p1 `Test-AlfilBers` (played A white) -> `own-board = mainboard`; p4 `Test-JanggiElephantC` (played B white) -> `own-board = bugboard`. Each sees their own board in the main position.
- [~] 5.5 Not tested — no seatless identity available. Same blocker as 2.4.
- [x] 5.6 All three tabs opened and inspected. Moves: engine header, populated movelist, move controls. Info: game details and all four players. Chat: see 5.7.
- [x] 5.7 **Chat is `<div id="roundchat"></div>` and nothing else — one child, zero content.** Nothing ever renders into it on this page. Surfacing it was the point; it can now be wired up or deleted on evidence rather than guessed at.
- [x] 5.8 Round page verified unchanged — see 2.3. Note `presetsClickable: false` there is CORRECT, not a regression: that game is over, and `.game-over .chatpresets` hides the presets by design.
- [x] 5.9 **Short landscape carries the same layout, as intended.** The rule is one `@media (orientation: landscape)`, so `max-height: 599px` is not a third case here. Measured on p2 and p3 at 1276x550: areas `"ownstack partnerstack tools" / "uleft uleft uleft" / "uboard uboard uboard"`, gauge deltas 0/0 top and bottom on both stacks, all three tabs present. p2 is `Test-SilverAiWok` (played B black) and gets `bugboard` in the main position; p3 is `Test-BiskniAmazon` (played A black) and gets `mainboard` — impersonation holds in this mode too.

## 6. Close out

- [x] 6.1 `yarn lint`, `yarn typecheck`, `yarn dev` clean; 262 tests / 48 suites; `css-tree` 0 errors. No Python gates — no server change.
- [x] 6.2 Recorded for the follow-up conversation:
  - **The eval chart is the whole of the remaining overflow, in every mode.** `under-board` holds it plus the FEN & PGN tab, on a full-width row below both stacks. Measured: short landscape, stacks and tools both end at 548.7 in a 551px viewport — a perfect fit — while `under-board` starts at 571.7 and runs 271.9px, putting the chart entirely below the fold (app bottom 843.6). Desktop is the same shape (845.1 in 612). Portrait: 1244.6 in 835. Nothing else overflows anywhere, so wherever the chart goes decides whether this page fits its viewport.
  - **The obvious candidates**, none chosen: a fourth tab in the tools column beside Moves/Info/Chat, which costs it width and gains the page its height back; or a row that is only drawn when the mode has height to spare, the way the coordinate gap and the name line already decide themselves; or left where it is with the page allowed to scroll, which is what it does today and is defensible on a page nobody plays on.
  - **FEN & PGN has no such problem** — it is the second tab of that same widget and inherits whatever the chart's row does. It needs no decision of its own.
  - **Chat turned out to be nothing at all.** `<div id="roundchat"></div>`, one child, zero content, and nothing on this page ever renders into it — see 5.7. It has a tab now so that it is observable; the choice between wiring it up and deleting it can be made on that evidence. Note the same finding explains 10.13: no chat and no presence because there is no websocket on this page.

## 7. The pockets

Added after the layout landed: the pockets were huge in short landscape, invisible in portrait,
and only passable on desktop.

- [x] 7.1 Diagnosed as three different failures, not one. **Desktop was right by accident** — the round page's `.pocket-top .twoboards .pocket` is not scoped to `.round-app`, so it reaches this page, and the `--cg-width-a` it reads is written by chessgroundx and therefore present. **Short landscape** hit that rule's other copy, whose `--bug-pocket-sq` is declared on `.round-app.bug` and so is missing here: the width was invalid at computed-value time and dropped, leaving `width: auto`, which inside a definite eight-square column is a pocket as wide as the board. **Portrait** matched no rule at all and fell through to extensions.css, which sizes from `--cg-width`/`--cg-height` — the two-board page writes only the `-a`/`-b` pair, so the HEIGHT was dropped too and the pockets had no height to be seen at.
- [x] 7.2 New `--bug-stack-sq`, declared on each stack and switched by orientation. Keyed by ROLE like the stack itself, so the identity-keyed pockets inside (`.pocket-top` is board A's wherever board A sits) inherit the right square without either side knowing the other's mapping — the move `.own-seat`/`.partner-seat` make on the round page. It also folds the stacks' four board-column rules into one.
- [x] 7.3 Pocket sized from `--bug-stack-sq`, not `--cg-width-a/-b`. Both are legal here — a pocket is not in the track it sizes itself from — but the board column IS `--bug-stack-sq * 8`, so the pocket matches the board **by construction** rather than by two independent numbers agreeing.
- [x] 7.4 A cell is a WHOLE square, not the round page's 0.8. The 0.8 is compaction, and its stated reason is that a round-page pocket shares its row with a name and a clock; here the pocket has the row to itself, so all three modes get the uncompacted geometry desktop was already showing.
- [x] 7.5 `.cg-wrap.pocket` blockified. extensions.css leaves it `display: inline`, where a width does not apply at all and the line box's leading shows as a band between board and pocket. The round page does this in two of its three modes; stated once here for all three.
- [x] 7.6 Verified live, all three modes, pocket = 5 x the board's square: **portrait** p4 own 233.4 (5 x 46.67) and partner 100.0 (5 x 20.00); **short landscape** p3 both 273.4 (5 x 54.67), previously the full 437.4 board width; **desktop** p1 own 274.1 (5 x 54.82) and partner 211.1 (5 x 42.23), unchanged as intended.
- [x] 7.7 No round-page regression is possible: every rule added, changed or deleted is scoped `.analysis-app.bug`. css-tree parses clean (0 parse errors; the remaining messages are the checker's own `var()` limitation and the `@property` descriptors).

## 8. Portrait was sized off the movelist

Found while verifying 7.6, pre-existing from section 4 rather than caused by the pockets.

- [x] 8.1 The portrait track was `grid-template-columns: max-content`, which hands the page's width to whichever item wants the most. `#movelist` is a move TREE that does not wrap, so its max-content is the whole game on one line: **measured 3714px of movelist making a 3722px page inside a 378px viewport**, with the grid centred and the boards therefore at x=-1672, entirely off-screen.
- [x] 8.2 Track made definite — the own stack's width, board plus gauge. Every other item already carries `min-width: 0`, so a definite track is one they can shrink into. After: app 387.8 at x=-4.9, document scrollWidth 383 against a 378 client width.
- [x] 8.3 The portrait `.bug-own-stack { width: ... }` rule deleted with it: that width is now exactly the track, and the stack's two columns come to it by construction.
- [ ] 8.4 STILL OPEN, and it needs `squareUnit.ts` rather than CSS: portrait's own stack is 8.31 squares wide (board plus gauge) but `--bug-portrait-sq` is `availableWidth / 8`, so the stack runs ~5px past the viewport. The unit would have to be quantised over 8.31 to close it.

## 9. The clocks stop mirroring

- [x] 9.1 `.anal-clock.bug { left: 0; right: initial }` deleted. It pulled board B's clocks to that board's LEFT edge, which was correct for the layout it was written for — the two boards were pinned to opposite edges of the page with everything between them, so each board's clocks faced inward. Adjacent boards have no inward.
- [x] 9.2 It was keyed on board IDENTITY (`.bug` is board B whoever played on it), so it also put the clocks on the wrong side for a **board-B player**, whose board B is the left/main stack here — the same identity-versus-role trap the boards, the pockets and the seat units each hit in turn. Deleting it fixes both cases at once, and leaves analysis.css's `right: 0` as the only rule.
- [x] 9.3 Verified live in all three modes, 12 clocks, every one flush to its own board's right edge (right-edge delta 0.0): **desktop** p1 (`AlfilBers`, board A) 59:32/51:54 and 58:13/49:37; **short landscape** p3 (`BiskniAmazon`, board A); **portrait** p4 (`JanggiElephantC`, board B — the case that was wrong twice over, since its own board is board B).

## 10. Usernames on the analysis page

- [x] 10.1 New `client/two-board/analysis/analysisSeatView.ts`, keyed by PHYSICAL SCREEN POSITION exactly as `AnalysisClockView` beside it is, and for the same reason: which player is at the top of a board depends on that board's orientation. `.bug` in a slot name is board identity and never decides layout — the STACK a bar sits in does that.
- [x] 10.2 `analysis.ts` builds SEAT STRIPS — the round page's elements class for class (`.seat-strip0`/`.seat-strip1` for which end, `.own-seat`/`.partner-seat` for whose board) — so the strip skeleton and the name's sizing machinery apply with no second copy. The analysis strip simply has one fewer occupant: no clock, since this page's clocks are absolute overlays on the board. Role comes from the stack being built into, never from board identity.
- [x] 10.3 Stack rows stayed pocket/board/pocket, so the board's `grid-row: 2` pin and the gauge's are untouched — a strip replaces a bare pocket rather than adding a row.
- [x] 10.4 The name machinery's scope widened from `.round-app.bug` to `:is(.round-app, .analysis-app).bug` for the eight NAME rules plus `--bug-name-fs-max`. `:is()` takes its most specific argument, so those rules still weigh (0,2,0) — the round page is bit-for-bit unchanged and still out-specifies `main.bug round-player0`. The block's comment said the analysis page "must be untouched"; it has player bars now and wants exactly this treatment. What stays round-only is what names a round-only element.
- [x] 10.5 Strip parameters from `--bug-stack-sq`: `--bug-strip-h` one square, `--bug-name-fs` the round page's 0.218 of one. That is only a FLOOR — the size that renders is `10cqi` capped at 16.8px, read from the room the name has.
- [x] 10.6 **The name's own line is decided in CSS, not measured.** Same question `seatNamePlacement.ts` answers for the round page, but here both sides are lengths the page already holds — room is `--bug-app-h - 10 * --bug-stack-sq` less what the coordinate gap already claimed, cost is bounded by `--bug-name-fs-max * 1.6` — so it is the same `min(1, round(down, ...))` arithmetic the coordinate floor uses, with `@property --bug-name-outside` registered as a number and one `@container style()` selecting the treatment. No JS, no ResizeObserver, and it cannot feed back into itself: neither `--bug-app-h` nor `--bug-stack-sq` moves when a name takes a line. The dependency on the gap runs ONE WAY — the gap settles first and this takes the remainder — which is what the round page's 12Hz oscillation came from getting wrong.
- [x] 10.7 Portrait always takes the line, and it is the same question rather than an exception: the landscape modes are pinned to the viewport so a line has to come out of something, while this page in portrait scrolls. Inline there is not merely worse but unusable — measured, the partner name drew at **5.15px** in a 55.8px box (a 160px board less its 100px pocket) and overlapped the clock; on its own line it reaches the 16.8px cap.
- [x] 10.8 **Name pushed clear of the clock.** `align-self: stretch` from the shared rule put the name at the top of both strips: harmless above a board, a collision below one, since the clock is pinned to the board's edge and that is the same end. Measured, the bottom name's text ran to x=553.7 under a clock starting at x=536.5 in the same 553–571 band. Top strip keeps the top, bottom strip takes the bottom — the round page's rule (clock against the board, name outside) reached from the other direction.
- [x] 10.9 `flipBoards()` overridden on the analysis controller to repaint names AND clocks. The base only re-orients the boards, so the clocks were already going stale on a flip; verified live that one click swaps all four names and all four clocks and a second click restores them.
- [x] 10.10 Verified live in all three modes, zero name/clock and name/board collisions in each: **desktop** p1 shows both states at once — own stack at 100% zoom keeps its names inline (15.27px), partner stack at 77% has spare height and gives them full-width lines (16.8px); **short landscape** p3 both stacks inline, p2 (smaller zoom) outside; **portrait** p4 both outside, 16.8px and 15.15px.
- [x] 10.11 Round page verified unaffected after the scope widening: strips 54.7px, names 16.8px, clocks and presence dots intact, `own-name-outside`/`partner-name-outside` both still false in short landscape, boards 437.4px.
- [x] 10.12 `yarn typecheck`, `yarn lint`, `yarn test` (262 tests / 48 suites) all clean; css-tree 0 parse errors.
- [ ] 10.13 OPEN — the presence dot has no source. The analysis page has no websocket at all (`RoundControllerBughouseSocket` belongs to the round controller), so every dot renders offline and nothing can ever update it. It is a true statement about a finished game nobody is connected to, but it is static. Either drop the dot on this page or subscribe to the game's socket for presence.
