## 1. MovelistView owns its placeholder

- [x] 1.1 `MovelistView`'s constructor stops calling `document.getElementById('movelist')`; it builds `h('div#movelist')` itself and exposes it via a `placeholder(): VNode` method
- [x] 1.2 `analysis.ts`: construct `new MovelistView()` during `analysisView()`'s synchronous view-building, embed `movelistView.placeholder()` instead of the raw `h('div#movelist')` literal, and pass the instance through `createBoards()` into `new AnalysisControllerBughouse(...)`
- [x] 1.3 `round.ts`: same as 1.2 for the round page
- [x] 1.4 `TwoBoardController`'s constructor accepts `movelistView: MovelistView` as a parameter instead of constructing it internally; `AnalysisControllerBughouse`'s and `RoundControllerBughouse`'s own constructors gain the same parameter and forward it to `super()`
- [x] 1.5 Update any jest stub controllers/tests that construct these controllers or `MovelistView` directly to match the new constructor signatures

## 2. EngineController: placeholders at construction, ctrl attached once

- [x] 2.1 `EngineController`'s constructor drops the `ctrl` parameter and the `document.getElementById`/`querySelector` lookups for `vscore`/`vscorePartner`/`vinfo`/`vpvlines`; it builds those placeholder vnodes itself (matching `analysis.ts`'s current static shells: `h('score#score', '')`, `h('info#info', '')`, `h('div#pv1')`..`h('div#pv5')`)
- [x] 2.2 Change `private readonly ctrl: AnalysisControllerBughouse` to a definite-assignment field (`private ctrl!: AnalysisControllerBughouse`); add `attachCtrl(ctrl: AnalysisControllerBughouse): void` that sets it and performs the `#input`/`#inputPartner` checkbox renders (moved out of the constructor, since they need `ctrl.boardA`/`ctrl.boardB`)
- [x] 2.3 `analysis.ts`: construct `new EngineController(chess960)` (no `ctrl`) up front, embed its placeholder vnodes for `#score`/`#scorePartner`/`#info`/`#pv1`-`#pv5` instead of the raw literals, pass the instance through `createBoards()`
- [x] 2.4 `AnalysisControllerBughouse`'s constructor accepts the `EngineController` instance as a parameter instead of constructing it, and calls `this.engine.attachCtrl(this)` immediately after assignment, at the point engine construction happens today
- [x] 2.5 Update jest tests referencing `EngineController`'s constructor signature or its `ctrl` field (none found — no test constructs `EngineController` directly)

## 3. PGN: new PgnView class

- [x] 3.1 Add a `PgnView` class to `pgn.ts` with a ctrl-free constructor building two retained placeholders: `h('div#copyfen')` and `h('div#pgntext')`
- [x] 3.2 Move `renderFENAndPGN`'s body into a `PgnView` render method (taking `ctrl`) that patches against the two retained placeholders instead of fresh `document.getElementById` lookups; `updateFENAndPGN` (the subsequent-update path) calls the same method, so both initial and later renders share the same retained state. Discovered along the way: the old `#copyfen` code patched a plain `h('div', buttons)` (no id) against the `#copyfen` element looked up by id — since the selectors don't match, snabbdom replaces rather than diffs, silently stripping the `copyfen` id after the first render, so every subsequent `updateFENAndPGN` call found `document.getElementById('copyfen') === null` and skipped re-rendering those buttons entirely (harmless in practice since their content is 100% static). `PgnView.render` now patches `h('div#copyfen', buttons)` consistently, so the id is preserved and the buttons re-render on every refresh — byte-identical output each time, so no observable behavior change, but worth noting since it fixes a latent id-stripping bug as a side effect
- [x] 3.3 `AnalysisControllerBughouse`'s constructor accepts a `PgnView` instance as a parameter, stores it, and calls its render method at the point `renderFENAndPGN(this, ...)` runs today
- [x] 3.4 `analysis.ts`: construct `new PgnView()` up front, embed its placeholders for `#copyfen`/`#pgntext` instead of the raw literals, pass the instance through `createBoards()`
- [x] 3.5 Update jest tests referencing `pgn.ts`'s free functions or PGN-related stub-controller fields (none found)

## 4. Analysis clocks: position-keyed view object

- [x] 4.1 Add a clock view class (`AnalysisClockView`) to `analysisClock.ts` (ctrl-free constructor) holding four retained placeholders keyed by physical position — main-top, main-bottom, bug-top, bug-bottom — matching the four already-classed elements `analysis.ts` creates (`#anal-clock-top`, `#anal-clock-bottom`, `#anal-clock-top-bug`, `#anal-clock-bottom-bug`)
- [x] 4.2 Update `renderClocksCC`/`renderClocks` to index into the object's four stored placeholders by position instead of `document.querySelector` by class; the existing color→position resolution logic (based on board orientation) is unchanged. Simplified along the way: the old code did two patches per element per call (reset-to-empty, then content, discarding the second patch's return value, then re-querying by class fresh next call) — collapsed to a single patch straight to the final content per call, since the discarded intermediate step had no observable effect. As with `PgnView`'s discovery, the very first patch replaces the id-bearing placeholder with an id-less one (selector mismatch, same as today's behavior via class-requery), then stays stable via the retained reference from the second call onward — same net DOM/attribute output as before
- [x] 4.3 `analysis.ts`: construct the clock view object up front, embed its four placeholders instead of the raw `h('div#anal-clock-*...')` literals, pass the instance through `createBoards()`
- [x] 4.4 `AnalysisControllerBughouse`'s constructor accepts the clock view instance as a parameter and stores it (`ctrl.clockView`); `renderClocks(ctrl)` reads it off `ctrl` the same way other widgets do
- [x] 4.5 Update jest tests referencing `analysisClock.ts` or clock-related stub-controller fields (none found)

## 5. Movetime chart: object owns the container

- [x] 5.1 Add a `MovetimeChartView` class to `movetimeChart.ts` (ctrl-free constructor) holding the `#chart-movetime` placeholder vnode; the constructor takes the same `visible: boolean` flag `analysis.ts` currently applies inline (`isAnalysisBoard`-derived `style: { display: 'block' }`), baked into the one placeholder vnode it builds, so the conditional-visibility behavior is unchanged
- [x] 5.2 Update `movetimeChart(ctrl)` to call `Highcharts.chart(...)` against the object's retained element (`.elm`) instead of the string id `'chart-movetime'`; Highcharts' existing recreate-on-every-call behavior is unchanged
- [x] 5.3 `analysis.ts`: construct `new MovetimeChartView(!isAnalysisBoard)` up front, embed its placeholder instead of the raw `h('div#chart-movetime', ...)` literal, pass the instance through `createBoards()`
- [x] 5.4 `AnalysisControllerBughouse`'s constructor accepts the `MovetimeChartView` instance as a parameter and stores it as `movetimeChartView` (distinct field name from the existing `movetimeChart: Chart` field, which holds the Highcharts instance itself)
- [x] 5.5 Update jest tests referencing `movetimeChart.ts` or movetime-chart-related stub-controller fields (none found)

## 6. Verification

- [x] 6.1 Confirm by grep that `analysis.ts`/`round.ts` embed each widget's own placeholder vnode instead of writing a raw `h(...)` literal for `#movelist`, `#score`/`#scorePartner`/`#info`/`#pv1`-`#pv5`, `#copyfen`/`#pgntext`, the four `#anal-clock-*` elements, and `#chart-movetime`
- [x] 6.2 Confirm by grep that `EngineController`, `PgnView`, the clock view, and `MovetimeChartView`'s constructors take no `ctrl` parameter and make no `document.*` calls
- [x] 6.3 `yarn typecheck`, `yarn test`, lint pass
- [x] 6.4 Browser smoke (existing harness, extended): movelist renders/updates, engine toggle + PV/score display, PGN panel content (including the fixed copyfen-button re-render), clocks render correctly across flip/switch, movetime chart visibility (including the zero-move edge case), no console/page errors

## 7. Consolidate multi-element widgets into one composed-view method

Widget files (`engine.ts`, `pgn.ts`, etc.) are part view, part controller — unlike the top-level `analysisCtrl.ts`/`analysis.ts` split, they aren't being separated into distinct view/controller files. Where a widget's owned elements are always rendered as one contiguous, fixed-structure block, the widget hands `analysis.ts` a single composed method instead of one placeholder call per leaf element for `analysis.ts` to reassemble. Individual retained vnodes stay as internal properties either way.

- [x] 7.1 `EngineController` gains `vinput`/`vinputPartner` retained fields (the two engine-toggle checkboxes, previously left as raw `analysis.ts` literals with `attachCtrl` reaching into them by id) and a single `renderPanel(): VNode` method returning the whole `.engine` block (checkboxes, score, info, scorePartner) with the static wrapper markup ("Fairy-Stockfish 11+", labels, sliders) folded in; `analysis.ts` calls just `engine.renderPanel()`. `pvPlaceholders()` similarly became `pvPanel(): VNode` returning the whole `.pvbox` div
- [x] 7.2 `PgnView`'s two separate placeholder methods (`copyfenPlaceholder`/`pgntextPlaceholder`) collapsed into one `placeholders(): VNode[]`, since the two elements are always adjacent siblings in the FEN & PGN panel; `analysis.ts` spreads them in with `...pgnView.placeholders()`
- [x] 7.3 Bug found and fixed during 7.1: `onFSFline`'s checkbox re-enable patched a data-less `h('input#input', { attrs: { disabled: false } })` (no `on` key) against the now-persistent `this.vinput`. Previously (fresh `document.getElementById` old-vnode every time, via `emptyNodeAt`) `data.on`/`.listener` never carried forward, so this was a no-op for listeners; against a genuinely retained vnode, snabbdom's eventlisteners module reads the missing `on` as "this listener was removed" and detaches it — so the change-listener silently vanished the moment any UCI line arrived from the engine, before a user could ever interact with the checkbox. Fixed by reusing `renderInput(...)` (which always includes `on`) in `onFSFline` too, matching `attachCtrl`'s pattern
- [x] 7.4 `yarn typecheck`, `yarn test`, lint, and the browser smoke test (specifically the engine-toggle-reacts check) all re-verified after the fix
