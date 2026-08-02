## Context

Today the round page holds two seat containers. `ctrl.seats: SeatConfiguration<Seat>` (built by the base `TwoBoardController` and shared with analysis) carries coordinates and players; `ctrl.seatsState: SeatConfiguration<RoundSeat>` carries a second set of four seat objects with the *same* coordinates and players, whose only reason to exist is to host four extra fields: `clock`, `difference`, `vplayer`, `position`. `SeatsState` also carries the round-only clock behavior (`updateClocks`, `getClock`, `setConnecting`, `setPresence`, the per-clock tick callback that renders the clock-difference indicators).

Of those four fields:

- `position` (0 = top, 1 = bottom, pre-flip) is a screen slot, used only to build DOM ids and by `setPresence`.
- `difference: ClockDifference` is a rendering widget; its only reader is the tick callback.
- `vplayer: VNode` is written once in the constructor and never read (`patch`'s return value, retained "for future in-place re-renders").
- `clock: Clock` is the one field read by model-level code (flag callbacks, premove math in `sendMove`, `pause` on game end, the `msgClocks` payload).

`RoundSeat`'s constructor is also the only round code left that binds widgets by `document.getElementById`. Every other round widget was converted to the "own your vnode, hand it to the page view" pattern: `MovelistView` (constructed in `round.ts`, passed to the controller), `AnalysisClockView`, `TabsView`, `RoundControlsView`. Binding by id has a concrete cost here: `patch(getElementById('rplayer0b'), player('player0b', …))` produces a vnode whose `sel` is `round-player0b`, which does not match the emptied placeholder's `round-player0#rplayer0b`, so snabbdom *replaces* the element — the `.bug` class and the id are lost, and `round-player0.bug { grid-area: userB-top }` / `main.bug round-player0 { … }` never apply. Verified in jsdom against the real `player()` and `patch()`.

Constraints:

- Flip/switch (`swapClockGridAreasForFlip`/`swapClockGridAreasForSwitch`) finds these blocks by `getElementsByClassName('info-wrap0')` / `'info-wrap0 bug'` and mutates `style.gridArea` imperatively. The class names and the one-element-per-class-per-page assumption must survive, and per-seat re-renders must not blow away those inline styles.
- `Clock` and `ClockDifference` own and re-`patch` their own elements once constructed; a seat view supplies each one's *initial* vnode and then leaves it alone.
- `position` is fixed for the whole game (flip/switch move DOM, they do not change which seat a slot belongs to), so a slot-keyed view can be built before the controller exists and never needs re-keying.

## Goals / Non-Goals

**Goals:**

- Seats are `Seat` everywhere, on both pages; no round-specific seat subtype and no second seat container.
- All round seat *rendering* lives in one widget file, constructed DOM-free and embedded by `round.ts`, consistent with the other round widgets.
- Behavior-preserving except for the one deliberate player-bar markup fix.

**Non-Goals:**

- Giving the analysis page clocks. `Seat.clock` stays `undefined` there.
- Touching `Clock` or `ClockDifference` themselves.
- Fixing the two premove quirks recorded earlier (the render/send mismatch, and the board-`b` premove branch keying only on `moveColor`) — untouched, still open.
- Reworking `showOnlineIcon`'s fixed `player1a` target, which is wrong for a viewer who only plays on board b. Preserved as-is; noted for a later change.
- Making `berserk`/`misc-info` do anything. They stay inert slots inside the composed view.

## Decisions

### 1. `RoundSeatView` is keyed by screen slot, not by seat

The view takes `(position: 0 | 1, board: BugBoardName)` and nothing else. That is precisely the information needed to build every id and class it renders (`clock0b`, `difference0b`, `rplayer0b`, `info-wrap0 bug`), and it is available in `round.ts` with no model, no viewer username, and no controller. Four instances are built in a `[0, 1] × ['a', 'b']` loop.

*Alternative considered:* construct the view from a `Seat` (so it could render the player bar immediately). Rejected — it would force `round.ts` to build a seat container of its own, or force the base container to be constructed before the controller, for no gain: the player bar is rendered a moment later from the controller anyway, via `renderPlayerBar`. This mirrors `AnalysisClockView`, which is likewise keyed by screen slot (`'top' | 'bottom' | 'top.bug' | 'bottom.bug'`) rather than by color, for the same reason: which seat occupies a slot is a controller-level question.

### 2. One composed `view()`, not one placeholder per leaf

`RoundSeatView.view()` returns the entire `div.info-wrap{position}{.bug}` subtree. `round.ts` embeds four of these instead of the ~20 `h()` calls it writes today. This follows the established convention that a multi-element widget exposes one composed view rather than one placeholder accessor per leaf element.

The composed vnode is built **once** in the constructor and returned by `view()`, so the objects the page patches are the same objects the widget retains — the widget's leaf vnodes get their `.elm` populated by the page's own top-level patch, with no id lookup anywhere. The widget never re-patches the whole block after that: the clock element and the difference indicator are handed to `Clock`/`ClockDifference`, which patch themselves, and the player bar is patched on its own retained vnode. That is what keeps flip/switch's imperative `style.gridArea` writes on `.info-wrap*` safe.

### 3. `Clock` lives on the base `Seat` as `clock?: Clock`

Requested explicitly, with the analysis case left `undefined` for now. This is a deliberate exception to "no field without a consumer": the alternative is to keep a `RoundSeat` subtype alive solely to host one field, which reintroduces the second seat container and the type-level duplication this change exists to remove. One optional field on `Seat` is the cheaper of the two costs, and the field does have a consumer — the round page.

Assignment: `twoBoardSeats(model, viewer)` cannot build a `Clock` (no base/increment, no element, and analysis must not get one), so `clock` is a mutable optional field assigned by the round controller after the views exist:

```
this.seats.all.forEach(seat => {
    const view = viewFor(seat);
    seat.clock = view.createClock(this.base, this.inc);
});
```

`createClock` lives on the view because the view owns the element the clock renders into; the controller supplies base/increment.

*Alternative considered:* an `attachClock(seat, clock)` helper or a `WeakMap<Seat, Clock>` on the round side, leaving `Seat` untouched. Rejected — a side map is strictly more indirection than the optional field, and every read site (`seat.clock`) would grow a lookup.

Read sites keep `!` / non-null assertion discipline local to round code, which knows its clocks exist. No analysis code reads `seat.clock`.

### 4. `SeatsState` dissolves into `RoundControllerBughouse`

With `clock` on `Seat`, `ctrl.seats` answers every lookup the round page needs, and a second `SeatConfiguration` would hold identical objects. `SeatsState`'s five members move onto the controller:

- `getClock(board, color)` → `this.seats.byBoardAndColor(board, color).clock!` at the call sites, or a one-line private helper if the four `sendMove` reads read better that way.
- `updateClocks(board, turnColor, msgClocks, status)` → a controller method, body unchanged.
- `setConnecting(connecting)` → a controller method (called from `sockets.ts`).
- `setPresence(username, online)` → controller method that finds the seats of that username and calls `setPresence` on each one's *view*.
- The tick wiring → a loop in the controller constructor, structurally identical, resolving the counterpart's view through the seat→view map.

*Alternative considered:* keep `SeatsState` as a plain (non-container) holder of the seats plus the four views. Rejected — it would be a pass-through with no state of its own once the seats live on the controller, i.e. exactly the kind of layer that has to name a consumer and cannot.

### 5. Seat → view mapping is a `Map<Seat, RoundSeatView>` on the controller

Built once in the controller constructor from `initialTopColor`, the same computation `SeatsState`'s constructor does today:

```
const topColor = { a: this.seats.initialTopColor('a'), b: this.seats.initialTopColor('b') };
this.seats.all.forEach(seat => {
    const position = seat.color === topColor[seat.boardName] ? 0 : 1;
    this.seatViews.set(seat, viewAt(position, seat.boardName));
});
```

Seats are stable object identities for the page's lifetime, so a `Map` keyed by the seat object is safe and needs no coordinate arithmetic at lookup time. `initialTopColor` stays exactly where it is, on `SeatConfiguration`.

### 6. The player bar's markup is fixed rather than reproduced

`RoundSeatView` renders the bar under its own root selector, `round-player{position}` plus `.bug` for board b plus `#rplayer{position}{board}`, and patches *content* into it — so the root element is created once by the page's patch and never replaced.

`client/player.ts` stays the single definition of a bar. `player()` gains two optional trailing parameters, `online = false` and `root = 'round-' + id`, and renders `h(root, […])`; the seat view passes its own selector, the single-board page passes neither and is byte-identical. A single "is this the bug page" flag would not do: three things differ between the pages, and only one of them is the class. Today `player(id)` derives the root tag *and* the presence-icon id from the same `id`, and the fix needs them to split — the root tag must drop the board suffix (so `round-player0.bug` matches) while the icon id must keep it (so `#player0b` stays unique across boards).

*Alternative considered:* extract the bar's inner `div.player-data` as an exported `playerData(...)` and have the view compose `h(ownRoot, [playerData(…)])`. Equivalent output; rejected for adding a second export to `player.ts` when one optional parameter covers it.

Consequence: `round-player0.bug`, `round-player1.bug`, and `main.bug round-player{0,1}` begin matching, which is a real layout change (grid-area placement, `height: 48px`, `font-size: 0.7vw`, `align-items: center`). It is almost certainly what those rules were written for, but "almost certainly" is why this needs a browser check rather than only unit tests.

The `i-side#player{position}{board}` id inside the bar is unchanged, so `setPresence`'s patch target and `showOnlineIcon`'s `player1a` target keep working — the view now holds that element's retained vnode instead of looking it up.

## Risks / Trade-offs

- **[The player-bar CSS fix changes bughouse round layout in ways nobody has seen]** → It is the one intentional behavior change, called out in the proposal and isolated to decision 6. Verify in a real browser (two clients, a live game) before considering the change done, comparing against the current build; if the layout regresses, the fallback is to render the bar under the same `round-player{position}{board}` root the current code accidentally produces, which reduces the change to a pure refactor.
- **[Flip/switch's imperative `style.gridArea` writes get wiped by a later widget patch]** → The composed block vnode is never re-patched after the page's initial patch (decision 2); only leaves are. Covered by an explicit smoke step: flip and switch, then confirm clocks still tick and bars stay placed.
- **[`Seat.clock` is optional, so round code needs non-null assertions and analysis code could read a phantom field]** → Accepted per decision 3, and bounded: the field is assigned for all four seats in one place in the round controller's constructor, before any consumer runs, and no analysis code path reads it.
- **[Losing `RoundSeat` loses the `instanceof` checks the current tests lean on]** → Those tests were asserting the type distinction this change removes; the rewritten suite asserts the observable behavior instead (composed markup, tick-driven difference rendering, `updateClocks` clock effects, presence patching).
- **[The composed view moves ~40 lines of markup out of `round.ts`, making the page structure less readable in one place]** → Net reduction: `round.ts` goes from four near-identical inline blocks to a loop, and the id-building rule (`clock{position}{board}`) exists once instead of being spelled out eight times.
