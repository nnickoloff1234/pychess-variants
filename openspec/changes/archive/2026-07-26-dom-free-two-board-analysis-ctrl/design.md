# Design — dom-free-two-board-analysis-ctrl

## Context

`AnalysisControllerBughouse` was already stripped of PGN, engine, tree-navigation, and tab-widget logic earlier this session (each moved into its own module: `pgn.ts`, `engine.ts`, `analysisTree.ts`, `common/tabs.ts`). What remains is three direct DOM touches, none delegated to any of those modules: `gaugePartner.classList.add('flipped')` in the constructor (unconditional); four `patch()` calls in `onMsgBoard` assigning classes to the four `anal-clock-*` elements; and a `cmt.style.display = 'block'` toggle, also in `onMsgBoard`. All three are raw `document.getElementById(...)` lookups followed by imperative mutation — the pattern this change eliminates.

`analysis.ts` builds the page's static VNode tree once (via `analysisView(model)`); the constructed `AnalysisControllerBughouse` only runs afterward (from that tree's root `insert` hook), by which point the whole static subtree — including all elements this change touches — is already in the DOM. `analysis.ts` already receives `model` and already branches on it once (`leftSide()`'s `model['gameId'] !== ''` check), so deciding `isAnalysisBoard`-dependent markup there is consistent with existing practice, not a new pattern.

## Goals / Non-Goals

**Goals:**

- `AnalysisControllerBughouse` performs no direct DOM creation or styling (no `document.getElementById` + `classList`/`style`/`patch`) after this change.
- The two purely static touches (gauge class, anal-clock classes) become part of the initial markup, with zero imperative code needed for them anywhere.
- The one data-gated touch (`#chart-movetime` visibility) is decided from `model` at template-build time; the resulting behavior difference (0-move real games) is narrow, understood, and explicitly accepted rather than silently introduced.
- Establish this as a standing rule for the file going forward, not just a one-time cleanup.

**Non-Goals:**

- No change to `analysisClock.ts`'s lookup-by-class approach for the anal-clock elements — this change only relocates *who assigns* the classes, not how they're found.
- No broader DOM-manipulation audit of other two-board files (`roundCtrl.ts`, `round.ts`, etc.) — scoped to the analysis controller only, per the proposal.
- No fix for the pre-existing UX quirk where a bare analysis board's default-visible "Move times" panel shows an empty box (chart never draws for a boardless page) — out of scope, not touched by this change.

## Decisions

1. **`gauge()` gains an optional extra-class parameter, not a two-board-specific wrapper.** `gauge()` (`client/analysis/index.ts`) is shared by `client/puzzle.ts`, the single-board analysis page, and two-board's `analysis.ts`. Adding one optional trailing parameter (defaulting to no class) is the minimal change that keeps all three existing call sites untouched while letting `analysis.ts` request `gauge(variant.colors, 'gaugePartner', 'flipped')`.

2. **Anal-clock classes move to static markup, full stop — no runtime code replaces them.** Since they're assigned exactly once today (analysis has no live socket) and never vary, there's nothing to "move to a module" — `analysis.ts` simply renders `h('div#anal-clock-top.anal-clock.top')` etc. from the start, and the four `patch()` calls in `analysisCtrl.ts` are deleted outright, not relocated.

3. **`#chart-movetime`'s initial visibility is decided from `isAnalysisBoard`, accepting the documented edge-case difference.** The alternative (moving the toggle into `movetimeChart.ts`, preserving the exact `msg.steps.length > 1` condition) was considered and rejected by the user in favor of a fully static, DOM-free controller — the edge case (a real game with zero moves showing an empty chart placeholder instead of staying hidden) was weighed and explicitly accepted as an acceptable, narrow trade-off for that goal. Implementation: `analysis.ts` computes `isAnalysisBoard` locally (same expression the controller uses: `model['gameId'] === ''`) and conditionally includes `style: { display: 'block' }` on `#chart-movetime` when it is `false`; when `true`, the element is left with no inline style and falls back to the CSS default (`display: none`).

4. **`h`/`patch` imports are removed from `analysisCtrl.ts`, not left dangling.** Grep confirms no other line in the file uses either after the three call sites are removed; leaving unused imports would trip lint (`oxlint --deny-warnings`) and is exactly the kind of loose end this session's other extractions have consistently cleaned up.

## Risks / Trade-offs

- [The `isAnalysisBoard`-vs-`msg.steps.length` edge case is a real, if narrow, behavior change] → Explicitly called out in the proposal and this design doc rather than buried in a diff; verify manually by creating a fresh 0-move game and confirming the (new, accepted) empty-chart-placeholder appearance, so it's a known outcome, not a surprise.
- [Duplicating the `isAnalysisBoard` computation between `analysis.ts` and `analysisCtrl.ts`] → Both read the identical expression (`model['gameId'] === ''`) off the same `model` object already passed to both; no shared constant is introduced because the two files don't currently share a "model helpers" module, and adding one for a single one-line expression would be over-engineering for this change.
- [Silent DOM/attribute drift during the markup rewrite] → Verify via the existing Playwright smoke (page-load, clock rendering, movetime chart appearance) plus a manual diff of the rendered `analysis.ts` output's relevant elements before/after.

## Open Questions

- None.
