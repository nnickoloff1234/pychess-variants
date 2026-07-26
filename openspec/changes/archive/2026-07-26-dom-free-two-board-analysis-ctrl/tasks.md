# Tasks — dom-free-two-board-analysis-ctrl

## 1. Shared gauge() helper

- [x] 1.1 Add an optional extra-class parameter to `gauge()` in `client/analysis/index.ts` (defaults to no class; existing callers in `client/puzzle.ts` and `client/analysis/index.ts` itself pass nothing extra and are unaffected)

## 2. Bake static setup into analysis.ts

- [x] 2.1 `gauge(variant.colors, 'gaugePartner')` → `gauge(variant.colors, 'gaugePartner', 'flipped')`
- [x] 2.2 Give `div#anal-clock-top`/`-bottom`/`-top-bug`/`-bottom-bug` their `.anal-clock.top`/`.bottom`/`.top.bug`/`.bottom.bug` classes directly in the initial markup
- [x] 2.3 Compute `isAnalysisBoard` in `analysis.ts` (`model['gameId'] === ''`) and conditionally set `style: { display: 'block' }` on `#chart-movetime` when false, leaving it unset (CSS default `display: none`) when true

## 3. Slim the controller

- [x] 3.1 Remove `gaugePartner.classList.add('flipped')` from the constructor
- [x] 3.2 Remove the four `patch(...)` calls assigning anal-clock classes from `onMsgBoard`
- [x] 3.3 Remove the `cmt`/`#chart-movetime` `style.display = 'block'` block from `onMsgBoard`
- [x] 3.4 Remove the now-unused `h` (snabbdom) and `patch` (`../../document`) imports from `analysisCtrl.ts`
- [x] 3.5 Verify by grep that `analysisCtrl.ts` contains no `document.getElementById`/`classList`/`patch(` calls

## 4. Verification

- [x] 4.1 `yarn typecheck`, `yarn test`, lint pass
- [x] 4.2 Browser smoke (existing harness): analysis page loads with gauge flipped correctly, clocks render (proving the baked-in `.anal-clock.*` classes work), movetime chart shows for a game with moves, tab widget still behaves correctly; manually verify the accepted zero-move-game chart-placeholder behavior change; no console/page errors
