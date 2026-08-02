# Remove direct DOM manipulation from the two-board analysis controller

## Why

`AnalysisControllerBughouse` still touches raw DOM directly in three places (`document.getElementById` + `classList`/`style`/`patch`), even after this session's extraction of PGN, engine, tree, and tab concerns into their own modules. As a standing rule, the controller should not create DOM elements or set styles/classes itself when that work can instead live in the view (`analysis.ts`, which builds the page's static VNode tree) — controllers should orchestrate state and delegate rendering, not reach into the page and mutate it imperatively.

## What Changes

- **`gaugePartner.classList.add('flipped')`** (unconditional, runs every time) moves into `analysis.ts`'s `gauge(variant.colors, 'gaugePartner')` call. The shared `gauge()` helper (`client/analysis/index.ts`, also used by `client/puzzle.ts` and the single-board analysis page) gains an optional extra-class parameter, defaulting to no class for existing callers.
- **The four `patch()` calls** that assign `.anal-clock.top`/`.bottom`/`.top.bug`/`.bottom.bug` onto `div#anal-clock-top`/`-bottom`/`-top-bug`/`-bottom-bug` are removed entirely. These classes are the *only* way `analysisClock.ts` locates these elements (it queries by class, not id), and today they're assigned exactly once (analysis has no live socket; `onMsgBoard` runs once from the constructor) — so they're static setup, not a runtime reset. `analysis.ts` bakes the classes directly into these elements' initial markup instead.
- **The `#chart-movetime` `display: none → block` reveal** (currently gated on `msg.steps.length > 1` inside `onMsgBoard`) moves into `analysis.ts`'s initial markup, decided instead from `isAnalysisBoard` (`model['gameId'] === ''`) — the only signal available at static-template-build time. **Deliberate, accepted behavior difference**: a real, in-progress game with zero moves played has `isAnalysisBoard === false` but `msg.steps.length` is still `1`; today the movetime chart area stays hidden in that case, after this change it will show an empty chart placeholder. This edge case was discussed and explicitly accepted in favor of making the controller fully DOM-free for this element.
- `analysisCtrl.ts` drops its now-unused `h` (snabbdom) and `patch` (`../../document`) imports once these three call sites are removed — no other code in the file uses them.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `bughouse-client-controllers`: extends the existing controller/view separation established by the PGN/engine/tree extractions with an explicit rule that `AnalysisControllerBughouse` must not perform direct DOM creation or styling; all such setup lives in `analysis.ts` (static, model-decided at render time) instead.

## Impact

- `client/analysis/index.ts` — `gauge()` gains an optional extra-class parameter (backward compatible; existing callers in `client/puzzle.ts` and `client/analysis/index.ts` itself pass nothing extra).
- `client/two-board/analysis/analysis.ts` — `gaugePartner` gets `'flipped'` baked in; the four `anal-clock-*` elements get their classes baked in; `#chart-movetime` gets its initial display decided from `isAnalysisBoard`.
- `client/two-board/analysis/analysisCtrl.ts` — the three DOM-touching call sites and the `h`/`patch` imports are removed.
- No server, i18n, or wire-format changes. One deliberate, narrow behavior difference (documented above); everything else is byte/attribute-identical.
