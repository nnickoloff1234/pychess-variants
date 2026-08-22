## Context

`analysisView()`/`roundView()` (in `analysis.ts`/`round.ts`) run exactly once per page load and return a `VNode` tree; nothing on the page re-invokes them later. The tree includes an `insert` hook on its outer wrapper that runs `createBoards(...)`, which constructs the real controller (`AnalysisControllerBughouse`/`RoundControllerBughouse`) — this has to happen post-insertion because the controller mounts chessground into real DOM nodes, and chessground is an imperative, non-snabbdom-owned widget.

Five widgets currently bridge the gap between "static placeholder written directly in `analysis.ts`/`round.ts`'s markup" and "controller exists, needs a handle to that placeholder" via an id string: the controller (or a class it constructs) does `document.getElementById`/`querySelector` once it exists, to find the exact element the view file already created moments earlier by a matching literal id. This works, but the id is the only thing connecting the two sides — nothing stops them from drifting apart, and each widget re-derives a "handle" to its own region rather than owning it from creation.

This design replaces the id convention with a direct object reference for all five: `MovelistView` (`common/movelist.ts`), `EngineController` (`engine.ts`), a new `PgnView` (`pgn.ts`), a new clock view object (`analysisClock.ts`), and a new `MovetimeChartView` (`movetimeChart.ts`).

## Goals / Non-Goals

**Goals:**
- Each of the five widgets owns a constructor that takes no `ctrl` and does no `document.*` access — it only builds and stores its own placeholder vnode(s)/element(s).
- `analysis.ts`/`round.ts` construct these objects during their synchronous view-building code (before any DOM exists) and embed the objects' placeholder vnodes directly in the tree they return, instead of writing raw `h(...)` literals themselves.
- The real controller's constructor receives these pre-built objects as parameters instead of instantiating them itself.
- Once the real controller exists (same timing as today, post-insertion), it hands itself (`ctrl`) to each object exactly once, for whichever of them need it to do their first content-bearing render or to keep functioning afterward.
- Behavior is unchanged — this is a pure wiring/structural change.

**Non-Goals:**
- Not changing how any of the five widgets re-render/update after their initial render — each keeps whatever mechanism it uses today (retained-vnode diffing, fresh `document.getElementById` lookups, or Highcharts' own recreate-on-every-call behavior).
- Not introducing a reactive re-render loop, or making `analysisView()`/`roundView()` re-runnable — snabbdom stays a surgical per-widget patching tool here, not a whole-page framework.
- Not touching `gauge()`, `renderTabbedPanels()`, `gameInfoBug()` — they already build and return embedded vnodes directly with no id-lookup anywhere else, because they render once and are never re-found.
- Not touching the `EngineController` `#input`/`#inputPartner` checkboxes' *behavior* (toggle wiring, local-analysis start/stop) — only where their one ctrl-dependent initial render happens from.

## Decisions

### `MovelistView`: constructor builds its own placeholder, shared base class accepts it as a parameter
Currently: `analysis.ts` and `round.ts` each write `h('div#movelist')` as a raw literal; `TwoBoardController`'s constructor (which both subclasses call via `super()`) constructs `new MovelistView()`, whose own constructor does `document.getElementById('movelist')`. New shape: `MovelistView`'s constructor builds `h('div#movelist')` itself and exposes it via a `placeholder(): VNode` method; both `analysis.ts` and `round.ts` call `new MovelistView()` and embed `movelistView.placeholder()` instead of the raw literal; `TwoBoardController`'s constructor takes `movelistView: MovelistView` as a parameter (both `AnalysisControllerBughouse` and `RoundControllerBughouse`'s own constructors gain the same parameter, threading it to `super()`); `createBoards()` in both view files passes the already-constructed instance through.

This is the cleanest of the five: `MovelistView` has no ctrl-dependent content at construction today (its real first content-bearing render already happens later, via `updateMovelist(ctrl)`, itself called from inside the controller's own constructor) — so there is no "ctrl-dependent initial render" step to relocate here, only the placeholder-creation and parameter-passing.

### `EngineController`: split placeholder construction from `ctrl` attachment
`vscore`/`vscorePartner`/`vinfo`/`vpvlines` have no ctrl-dependent content at construction (their real content arrives later via separate update methods triggered by engine output) — same shape as `MovelistView`, straightforward to convert to constructor-owned placeholders.

The `#input`/`#inputPartner` checkbox renders (`patch(..., h('input#input', this.renderInput(ctrl.boardA)))`) **do** need `ctrl` at their one-time initial render (to read `ctrl.boardA`/`ctrl.boardB`'s state) — these move into a new `attachCtrl(ctrl: AnalysisControllerBughouse): void` method.

`EngineController` also stores `ctrl` for the rest of its lifetime (`engineGo`, `onFSFline`, PV-move clicking, etc. all read `this.ctrl`) — under the new model it can no longer be constructor-injected (the object is built before `ctrl` exists), so the field changes from `private readonly ctrl: AnalysisControllerBughouse` (constructor parameter) to a definite-assignment field (`private ctrl!: AnalysisControllerBughouse`) set inside `attachCtrl`, which the real controller calls exactly once, immediately after its own construction, before anything else touches the engine. This is the one place in this change where an object's relationship to `ctrl` changes beyond "when is the placeholder built" — flagged explicitly since it's a real (if narrow) semantic change to `EngineController`'s internals, not just data plumbing.

### PGN: new `PgnView` class replacing bare free functions
`pgn.ts` has no class today (the dead `vpgn` field was removed in `dom-free-two-board-ctrl-core`); both `#copyfen` and `#pgntext` are patched via fresh `document.getElementById` lookups on every call, with no retained state. A new `PgnView` class holds both as two separate retained placeholder fields, built ctrl-free at construction (`h('div#copyfen')`, `h('div#pgntext')` — matching the existing static shells `analysis.ts` already writes for these). The real, ctrl-dependent first content render (PGN text, embed-mode-conditional copy buttons) moves into a render method taking `ctrl`, called the same way as `EngineController`'s `attachCtrl` — from inside the real controller's constructor, at the point `renderFENAndPGN` is called today.

### Analysis clocks: position-keyed, not color-keyed
`analysisClock.ts`'s `renderClocksCC` re-queries `document.querySelector('div.anal-clock.top'/'bottom'[.bug])` fresh every call, because which physical element is "white" vs "black" flips with board orientation (flip/switch change this at runtime). A retained-vnode design keyed by *color* would go stale the moment the boards are flipped. Instead, the new clock view object holds **four** retained placeholders — one per physical position (main-top, main-bottom, bug-top, bug-bottom) — built from the four already-classed elements `analysis.ts` creates (`#anal-clock-top`, `#anal-clock-bottom`, `#anal-clock-top-bug`, `#anal-clock-bottom-bug`). The existing color→position resolution logic (based on `ctrl.boardA.flipped()`/`ctrl.boardB.flipped()`) stays exactly as it is; it now indexes into the object's four stored placeholders instead of re-querying by class each time it runs.

### Movetime chart: object owns the container, hands Highcharts a real element instead of an id string
`Highcharts.chart(id: string | HTMLElement, options)` accepts either form. `MovetimeChartView` builds `h('div#chart-movetime')` at construction (ctrl-free) and, on its render call (taking `ctrl`, called the same way/at the same point `movetimeChart(ctrl)` is called today), passes `this.vnode.elm as HTMLElement` to `Highcharts.chart(...)` instead of the string `'chart-movetime'`. Highcharts' own behavior (it recreates the whole chart instance on every call rather than updating in place) is unchanged — this design only changes how the container is located, not what Highcharts does with it.

### Naming convention across all five
Each object gets: a constructor with no `ctrl` parameter, that builds and stores placeholder vnode(s) purely; a way for the view file to obtain the placeholder vnode(s) to embed (a plain field or a small getter — whichever reads more naturally per widget, no need to force one shape across all five given how different their internals already are); and either nothing further (`MovelistView`, whose real render is already `ctrl`-parameterized via the existing free function `updateMovelist(ctrl)`) or a single method taking `ctrl` that performs the one-time ctrl-dependent initial render (`EngineController.attachCtrl`, `PgnView`'s render method, the clock view's initial render, `MovetimeChartView`'s render method) — called once, from inside the real controller's constructor, at the same point in the constructor sequence where that widget's initial rendering already happens today.

### Widget files are part view, part controller — multi-element widgets expose one composed-view method, not one placeholder per leaf
Revised after initial implementation (user feedback): the top-level split (`analysisCtrl.ts` holds controller/state logic, `analysis.ts` holds the page's view/layout) is a deliberate, ongoing separation this whole line of changes is building toward. Widget files (`engine.ts`, `pgn.ts`, `analysisClock.ts`, `movetimeChart.ts`, `common/movelist.ts`) are **not** held to that same split — they're small enough that view-concerned methods and controller/logic-concerned methods coexist in one file, and that's fine for now (a future change could split them further if they grow, but isn't needed yet). Consequence: where a widget's owned elements are always rendered together as one fixed-structure, contiguous block in `analysis.ts`'s markup, the widget SHALL expose one method returning that whole composed block, rather than one placeholder-per-leaf-element for `analysis.ts` to reassemble — `analysis.ts` should stay agnostic of the internal structure of a widget's own view. Individual retained vnodes for each leaf still exist as the widget's own internal properties either way; only the *public* shape changes. Applied to:
- `EngineController.renderPanel()` — the whole `.engine` div (checkboxes, score, info, scorePartner, and the static wrapper markup around them), replacing four separate placeholder calls `analysis.ts` used to reassemble. `pvPlaceholders()` similarly became `pvPanel()`, returning the whole `.pvbox` div.
- `PgnView.placeholders()` — both `#copyfen`/`#pgntext` as one array, since they're always adjacent siblings in the FEN & PGN panel.

Not every widget fits this: `AnalysisClockView`'s four elements are **not** contiguous — they're interleaved with the chessground board wrapper divs (which the clock widget doesn't own), so it correctly keeps four separate placeholder methods. This is a structural fact about where the elements sit in the layout, not an exception to the principle.

A real bug surfaced while doing this for `EngineController`: adding `vinput`/`vinputPartner` as genuinely *persistent* retained fields (rather than a fresh `document.getElementById` lookup every time, which snabbdom's `emptyNodeAt` always re-wraps with blank vnode data) exposed that `onFSFline`'s checkbox re-enable patch used a data-less vnode with no `on` key. Against a fresh-every-time Element wrapper this was harmless (there was never any `on`/`.listener` to carry forward or remove); against a real persistent vnode, snabbdom's eventlisteners module reads a missing `on` on the new vnode as "remove the existing listener," silently detaching the change handler the moment any UCI line arrived. Fixed by reusing `renderInput(...)` (which always includes `on`) in `onFSFline` too. This is the second latent bug this change has surfaced (after `PgnView`'s copyfen id-stripping) that was masked specifically by the old fresh-DOM-lookup pattern and became visible once real vnode persistence was introduced — worth keeping in mind for any remaining `document.getElementById`-based patch call being converted to a retained vnode elsewhere in this codebase.

## Risks / Trade-offs

[`MovelistView` construction now happens at two call sites (`analysis.ts` and `round.ts`) instead of once inside the shared base constructor] → Both call sites already separately write the `h('div#movelist')` placeholder literal today, so this isn't new duplication, just relocated; `TwoBoardController`'s constructor signature changes for both subclasses, so both subclass constructors and both `createBoards()` functions need updating together, verified by typecheck.

[`EngineController.ctrl` losing `readonly`/constructor-injection] → Narrow, well-contained change (internal to `engine.ts`); `attachCtrl` is called exactly once, synchronously, before any other method on the object can run (same ordering guarantee the constructor gave before), so there's no window where `this.ctrl` is read before being set.

[Existing jest tests construct `EngineController`/stub controllers assuming the current constructor signature] → Audit and update test call sites as part of implementation; verify jest passes at the same count as before.

[Five different widgets, five different internal shapes (some need `ctrl` for ongoing lifetime, some only for one render call, one needs position-keyed rather than color-keyed state)] → Deliberately not forcing one abstract base class/interface across all five — the shared idea (ctrl-free constructor + placeholder ownership) is expressed per-widget in whatever shape already fits that widget's existing design, consistent with how `MovelistView`/`RoundControlsView` were done in the prior change (each got its own shape, not a shared base class).

## Migration Plan

Implement and verify one widget at a time (matches the five natural task groups), in order of increasing complexity: `MovelistView` → `EngineController` → PGN → clocks → movetime chart. After each widget, run typecheck/lint/jest and the existing browser smoke harness before moving to the next, so a regression is always traceable to the widget just touched. No feature flag or staged rollout needed — this is a same-repo, same-deploy structural change with no behavior difference.

## Open Questions

None — every widget's current behavior and constraints were traced through the actual code before writing this design.
