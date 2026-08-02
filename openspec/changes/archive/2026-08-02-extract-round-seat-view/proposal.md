## Why

`RoundSeat` is billed as "the shared seat extended with round-only presentation", but three of its four members (`difference`, `vplayer`, `position`) are pure view state and the fourth (`clock`) is the only one any model-level code asks about. Because those view fields need a *seat subtype* to live on, the round page is forced to carry a second `SeatConfiguration` (`SeatsState`) whose four `RoundSeat`s duplicate the coordinates and players already held by `ctrl.seats` — the same "two containers for one set of seats" duplication the previous change removed at the lookup level, reintroduced at the seat-type level.

`RoundSeat`'s constructor is also the last place in the round page that reaches into the DOM by id (`document.getElementById('clock0a')`, `'difference0a'`, `'rplayer0a'`), while every other round widget — `MovelistView`, `AnalysisClockView`, `TabsView`, `RoundControlsView` — now owns its own vnode and is embedded directly by the page view. That id-and-patch approach has already cost correctness: patching `#rplayer0b` (declared `h('round-player0.bug#rplayer0b')`) with `player('player0b', …)` replaces the element with `<round-player0b>`, dropping both the `.bug` class and the id, so the bughouse player-bar CSS (`round-player0.bug { grid-area: userB-top }`, `main.bug round-player0 { … }`) matches nothing today.

## What Changes

- **New view widget.** Add `client/two-board/round/roundSeatView.ts` with `RoundSeatView`: a view-only class keyed by *screen slot* (`position: 0 | 1` × `board: 'a' | 'b'`), constructed DOM-free in `round.ts` before the controller exists, exposing one composed `view()` that returns that seat's whole `div.info-wrap{position}{.bug}` block — clock wrap, clock holder, clock element, clock-difference widget, berserk slot, player bar, misc-info slot. It owns the retained vnodes for the clock element, the `ClockDifference`, the player bar, and the presence icon, and exposes `renderDifference`, `renderPlayerBar`, and `setPresence`.
- **`round.ts` builds the four views** and embeds `view()` for each instead of the ~20 hand-written `h()` calls it has today, passing the four instances to `RoundControllerBughouse` the way `MovelistView` is already passed.
- **`Clock` moves onto the base `Seat`** as an optional `clock?: Clock`, assigned by the round page once the views exist. The analysis page leaves it `undefined` for now — accepted deliberately (see design), since the alternative keeps a seat subtype alive purely to host one field.
- **`RoundSeat` is deleted** along with `client/two-board/round/roundSeat.ts`; `position` becomes the view's own key, `difference`/`vplayer` become the view's retained vnodes.
- **`SeatsState` is deleted** along with `client/two-board/round/seatsState.ts`. With clocks on the base `Seat`, `ctrl.seats` is the only seat container the round page needs; the round-only clock behavior (`updateClocks`, `getClock`, `setConnecting`, `setPresence`, the tick wiring that drives the clock-difference display) moves onto `RoundControllerBughouse`, operating on `ctrl.seats`.
- **The player-bar DOM discrepancy is fixed** (not preserved): because the view owns the vnode from the start, the bar renders as `<round-player0 class="bug" id="rplayer0b">` and the existing bughouse CSS grid-area/sizing rules start applying. This is the one intentional visual change in the change, and needs a browser check. `client/player.ts` stays the single definition of a player bar: `player()` gains two optional trailing parameters — `online` and `root` (defaulting to `'round-' + id`) — and `RoundSeatView` passes its own root selector, since on the bughouse page the root selector and the presence-icon id diverge. The single-board page passes neither and is unchanged.
- **`showOnlineIcon()` is absorbed** into `RoundSeatView` (it is a presence render on one fixed slot, `player1a`), keeping its current fixed-slot behavior.

## Capabilities

### New Capabilities
(none — this refactors existing behavior; the one new file is a view extraction covered by the existing bughouse controller capability)

### Modified Capabilities
- `bughouse-client-controllers`: the "Single player-info abstraction for the four bughouse seats" requirement currently mandates a `RoundSeat extends Seat` carrying round-only presentation and a `SeatsState extends SeatConfiguration<RoundSeat>`. It changes to: seats are `Seat` throughout on both pages, `Seat` carries an optional `clock`, no round-specific seat subtype and no second seat container exist, and round-only *rendering* lives in a slot-keyed `RoundSeatView` widget bootstrapped by `round.ts`. Its scenarios for round seat configuration, the clock-difference tick computation, seat placement, and unit-test coverage are restated against the new shape, and a new requirement covers the seat view widget itself (composed vnode, slot keying, rendered player-bar markup).

## Impact

- `client/two-board/common/seat.ts` — `Seat` gains `clock?: Clock`; the file gains an import of `../../clock` (still no DOM, no step/tree types).
- `client/two-board/round/roundSeatView.ts` (new) — `RoundSeatView`.
- `client/two-board/round/roundSeat.ts`, `client/two-board/round/seatsState.ts` — deleted.
- `client/two-board/round/round.ts` — builds the four `RoundSeatView`s, embeds their composed views, passes them to the controller.
- `client/two-board/round/roundCtrl.ts` — takes the views as a constructor argument, builds the clocks and the seat→view map, hosts the relocated `updateClocks`/`getClock`/`setConnecting`/`setPresence`/tick wiring, and its ~20 `this.seatsState.*` call sites become `this.seats.*` / direct method calls.
- `client/two-board/round/roundControls.ts` — `showOnlineIcon()` removed (absorbed by the view).
- `client/two-board/socket/sockets.ts` — three `ctrl.seatsState.setConnecting(...)` call sites become `ctrl.setConnecting(...)`.
- `client/player.ts` — `player()` gains optional `online`/`root` parameters; output byte-identical for the single-board page, which passes neither.
- `client/two-board/twoBoardCtrl.ts` — unchanged in behavior; `seats` stays `SeatConfiguration<Seat>` and is now the only seat container on either page.
- `tests/twoBoardRoundSeats.test.ts` — rewritten against `RoundSeatView` plus the relocated round clock behavior; `RoundSeat`/`SeatsState` assertions removed.
- CSS: no stylesheet edits, but `round-player0.bug`/`round-player1.bug`/`main.bug round-player{0,1}` begin matching the bughouse player bars for the first time.
