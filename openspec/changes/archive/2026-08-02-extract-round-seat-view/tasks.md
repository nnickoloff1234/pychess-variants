## 1. Player-bar contents extraction

- [x] 1.1 In `client/player.ts`, give `player()` two optional trailing parameters — `online = false` (presence icon state) and `root = 'round-' + id` (root selector) — and render `h(root, [...])`. No extraction, no new export; callers passing neither get byte-identical markup
- [x] 1.2 Confirm no other caller of `player()` exists that assumed the old inline structure (`client/roundCtrl.ts` is the only one besides two-board)

## 2. The seat view widget

- [x] 2.1 Create `client/two-board/round/roundSeatView.ts` with `RoundSeatView`, constructed as `(position: 0 | 1, board: BugBoardName)` — no ctrl, no `document.*`, no model
- [x] 2.2 In its constructor, build the composed block vnode once: `div.info-wrap{position}{.bug}` → [`div.clock-wrap{.bug}` → [`div.clock-holder` → [clock element vnode, difference element vnode], `div#berserk{position}{board}`], player-bar root vnode, `div#misc-info{position}{board}`], retaining references to the clock element, difference element and player-bar root vnodes. Player-bar root selector: `round-player{position}` + `.bug` for board b + `#rplayer{position}{board}`
- [x] 2.3 Expose the single composed view method returning that block (one method, not one accessor per leaf)
- [x] 2.4 Expose `createClock(base, inc): Clock` constructing a `Clock` against the retained clock vnode with id `clock{position}{board}` and `corr = false`, matching today's `RoundSeat` constructor arguments exactly
- [x] 2.5 Construct the `ClockDifference` against the retained difference vnode (id `difference{position}{board}`) in the constructor, as today, and expose `renderDifference(value: number)` delegating to it
- [x] 2.6 Expose `renderPlayerBar(player: TwoBoardPlayer, level: number)` patching `player(..., online, ownRootSelector)` onto the retained player-bar root (root selector unchanged across patches, so the element is never replaced), and `setPresence(online: boolean)` patching the `i-side.online#player{position}{board}` icon with the same class set as today's `setPresence`/`showOnlineIcon`
- [x] 2.7 Verify by inspection that nothing in the class ever re-patches the composed block vnode itself (only the leaves), so flip/switch's inline `style.gridArea` survives

## 3. Clock on the base Seat

- [x] 3.1 Add `clock?: Clock` to `Seat` in `client/two-board/common/seat.ts` (mutable, unset by the constructor); import `Clock` from `../../clock`
- [x] 3.2 Confirm `twoBoardSeats()` and every analysis code path leave it `undefined` — grep the analysis tree for `.clock` to be sure nothing picks it up accidentally

## 4. round.ts bootstraps the four views

- [x] 4.1 In `client/two-board/round/round.ts`, build the four `RoundSeatView`s in a `[0, 1] × ['a', 'b']` loop before the returned tree, in a shape the controller can index by slot
- [x] 4.2 Replace the four inline `div.info-wrap*` blocks with the views' composed vnodes, keeping their sibling order in `div.round-app.bug` exactly as today (info-wrap0, info-wrap0.bug, …, info-wrap1, info-wrap1.bug in their current positions relative to the pockets and tools blocks)
- [x] 4.3 Pass the four views into `createBoards`/`new RoundControllerBughouse(...)` as a constructor parameter alongside `movelistView`

## 5. Round controller absorbs the clock behavior

- [x] 5.1 Add the seat-view constructor parameter to `RoundControllerBughouse`; build a `Map<Seat, RoundSeatView>` in the constructor from `this.seats.initialTopColor('a'|'b')` (position = seat color equals that board's top color ? 0 : 1), replacing `SeatsState`'s construction-time placement math
- [x] 5.2 Assign each seat's clock: `seat.clock = view.createClock(this.base, this.inc)`, and render each seat's player bar via `view.renderPlayerBar(seat.player, this.level)` — the same two things `RoundSeat`'s constructor did, in the same order relative to the rest of construction
- [x] 5.3 Move the tick wiring onto the controller verbatim: for each seat, `seat.clock.onTick(diff => { renderTime; counterpart = this.seats.opponentsPartnerOf(seat); ... })`, with `liveTime` unchanged and the two `renderDifference` calls now going through each seat's view
- [x] 5.4 Move `updateClocks(boardName, turnColor, msgClocks, status)` onto the controller, body unchanged, reading clocks off `this.seats.byBoardAndColor(...).clock!`
- [x] 5.5 Move `setConnecting(connecting)` and `setPresence(username, online)` onto the controller; `setPresence` filters `this.seats.all` by username and calls `setPresence` on each seat's view
- [x] 5.6 Replace the flag-callback wiring (`seatsOn('a'|'b').forEach(s => s.clock.onFlag(...))`) with the same loops over `this.seats`
- [x] 5.7 Replace the remaining `this.seatsState.*` call sites: `byBoardAndColor`/`all` → `this.seats.*`; the four `getClock(...).duration` reads in `sendMove` → `this.seats.byBoardAndColor(...).clock!.duration` (or one private helper if that reads better); `getClock(board, color).running` in the board handler likewise; `updateClocks`/`setPresence` → the controller's own methods
- [x] 5.8 Replace the `showOnlineIcon()` call in `onMsgUserConnected` with the position-1/board-a view's `setPresence(true)`, and delete `showOnlineIcon` from `roundControls.ts`
- [x] 5.9 Update the three `ctrl.seatsState.setConnecting(...)` call sites in `client/two-board/socket/sockets.ts` to `ctrl.setConnecting(...)`

## 6. Deletions

- [x] 6.1 Delete `client/two-board/round/roundSeat.ts` and `client/two-board/round/seatsState.ts`
- [x] 6.2 Grep the client tree for `RoundSeat`, `SeatsState`, `seatsState`, `showOnlineIcon`, and the id strings `clock0a`/`difference0a`/`rplayer0a` — nothing outside `roundSeatView.ts` should remain

## 7. Tests

- [x] 7.1 Rewrite `tests/twoBoardRoundSeats.test.ts` against the new shape: `RoundSeatView`'s composed markup for all four slots (ids, `info-wrap{position}`/`bug` classes, player-bar root selector including `.bug` and `#rplayer{position}{board}`), and that the player-bar root element survives a re-render
- [x] 7.2 Cover the relocated round clock behavior against a minimal controller construction (or the extracted methods directly): clock construction per seat, the tick handler's rendered `.clock-difference` text for a seat and its counterpart, `updateClocks` pausing the mover / setting both times / starting the next seat only when `status < 0`, `setConnecting`, and presence rendering through the view
- [x] 7.3 Add a regression case pinning the player-bar markup fix: patching the bar's contents does not replace the root, and the rendered root retains `class="bug"` and `id="rplayer0b"`
- [x] 7.4 Update `tests/twoBoardPlayers.test.ts` if it asserts anything about `Seat`'s field set now that `clock?` exists

## 8. Verification

- [x] 8.1 `yarn typecheck`
- [x] 8.2 `yarn test`
- [x] 8.3 `yarn lint` (or the repo's oxlint/format gate) clean
- [x] 8.4 Browser smoke on a real two-client bughouse game (two headless Chromium clients against an in-process `aiohttp_server`+mongomock, seek/accept flow modelled on `tests/test_bughouse_lobby_flow.py`): all four clocks render and tick (`clock1a` 04:57→04:55 over 2s, so the tick callback — which renders the difference in the same handler — runs), all four difference indicators render, all four player bars render name+rating, presence icons show `online icon icon-online`, no page errors beyond a benign ResizeObserver warning. NOT exercised in-browser: premove and game-end, since the scripted flow plays no moves (same limitation as the previous change's smoke); both are covered by unit tests
- [x] 8.5 Browser check of the deliberate CSS change specifically (measured, screenshotted, and compared against the pre-change DOM reconstructed in-page — see the summary; the now-matching rules place the bars correctly, the open question is the 0.7vw font at narrow viewports, left for the author to accept or reject): compare the bughouse round page's player-bar placement/sizing against the current build before and after, at both a wide and a narrow viewport, and confirm the now-matching `round-player{0,1}.bug` grid-area rules place the bars sensibly. If they regress, fall back to rendering the bar under the `round-player{position}{board}` root today's code accidentally produces, and note the CSS mismatch as a separate follow-up
- [x] 8.6 Browser check of flip (`f`): grid areas swap (clock-top↔clock-bot, clockB-top↔clockB-bot), bars move with them (y 115↔662), clocks keep ticking, no re-render wipes the inline styles — grid areas swap, clocks keep ticking, difference indicators keep updating, player bars stay in place
