## Why

Five stateful widgets on the bughouse two-board analysis page (movelist, engine PV/score/info, PGN panel, per-position clocks, movetime chart) are wired to their DOM purely by id convention: `analysis.ts`/`round.ts` write a raw placeholder element (`h('div#movelist')`, `h('score#score', '')`, etc.) as part of the page's static markup, and separately, each widget's own rendering code re-discovers that same element later via `document.getElementById`/`querySelector` once the controller is constructed (inside the page's `insert` hook, after the DOM already exists). The id string is the only thing tying these two places together, and each widget currently re-derives its "handle" to its own DOM region independently rather than owning it from the start. Replacing the id convention with a direct object reference removes that indirection and a whole class of `document.*` lookups from the codebase, continuing the same architectural direction as `dom-free-two-board-analysis-ctrl` and `dom-free-two-board-ctrl-core`.

## What Changes

- `MovelistView` (`common/movelist.ts`, already a class): its constructor stops calling `document.getElementById('movelist')`; instead it builds and stores `h('div#movelist')` itself, exposed via a placeholder-vnode method. Both `analysis.ts` and `round.ts` (which each currently write the `h('div#movelist')` literal themselves) construct a `MovelistView` up front and embed its placeholder vnode instead. `TwoBoardController`'s constructor (and both subclasses, which call `super()`) accepts the instance as a parameter instead of instantiating it internally.
- `EngineController` (`engine.ts`): its constructor stops looking up `#score`/`#scorePartner`/`#info`/`#pv1`-`#pv5` via `document.getElementById`/`querySelector`; it builds those placeholder vnodes itself. The two ctrl-dependent `#input`/`#inputPartner` checkbox renders (which need `ctrl.boardA`/`ctrl.boardB`) move to a new `attachCtrl(ctrl)` method, called once by the real controller right after its own construction. `ctrl` becomes a field set by `attachCtrl` rather than constructor-injected (**BREAKING** for `EngineController`'s own constructor signature and its `ctrl` field's mutability, internal to this module — no external API is exposed).
- PGN rendering (`pgn.ts`, currently free functions only): gains a new `PgnView` class holding the `#copyfen` buttons container and `#pgntext` as two retained placeholder vnodes, built ctrl-free at construction; the real, ctrl-dependent content render moves to a method called during `attachCtrl`-equivalent wiring.
- `analysisClock.ts` (currently free functions, no retained state): gains a small view object keyed by the 4 physical clock positions (top/bottom × main/bug board), not by color, since color-to-position mapping depends on current board orientation (flip/switch); placeholder vnodes for the 4 already-classed elements are built by this object instead of analysis.ts's raw literals.
- `movetimeChart.ts`: gains a `MovetimeChartView`-style object owning the `#chart-movetime` container placeholder; `Highcharts.chart(...)` is called against the object's element reference instead of the string id `'chart-movetime'`. Highcharts' own internal chart-recreation-on-every-call behavior is unchanged.
- Out of scope: any change to how these five widgets re-render/update after their initial render (unchanged — still whatever mechanism each already uses today); introducing a reactive re-render loop (explicitly not wanted); `gauge()`/`renderTabbedPanels()`/`gameInfoBug()` (already follow the desired pattern, no id-lookup anywhere, nothing to change).

## Capabilities

### Modified Capabilities
- `bughouse-client-controllers`: extends the existing "no direct DOM manipulation in the controller" direction to cover *construction-time* DOM wiring for these five widgets — placeholder vnodes are now built and owned by each widget's own object, constructed before the controller exists and handed to it, rather than discovered by id after the fact.

## Impact

- `client/two-board/common/movelist.ts`, `client/two-board/twoBoardCtrl.ts`, `client/two-board/analysis/analysis.ts`, `client/two-board/round/round.ts`, `client/two-board/analysis/analysisCtrl.ts`, `client/two-board/round/roundCtrl.ts`
- `client/two-board/analysis/engine.ts`
- `client/two-board/analysis/pgn.ts`
- `client/two-board/analysis/analysisClock.ts`
- `client/two-board/analysis/movetimeChart.ts`
- Associated jest tests for the above (stub controllers/objects wherever construction signatures change)
