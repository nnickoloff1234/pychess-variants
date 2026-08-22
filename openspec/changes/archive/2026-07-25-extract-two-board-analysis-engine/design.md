# Design — extract-two-board-analysis-engine

## Context

The engine subsystem in `analysisCtrl.ts` today: module constants (`EVAL_REGEX`, `maxDepth`, `maxThreads`, `emptySan`), state fields (`ffish`, `notationAsObject`, `fsfDebug`, `fsfError`, `fsfEngineBoard`, `fsfOriginalPrompt`, `fsfInputQueue`, `isEngineReady`, `maxDepth`, `multipv`, `arrow`, and the retained vnodes `vscore`/`vscorePartner`/`vinfo`/`vpvlines`), and methods from FSF wiring through UCI parsing to PV/score/gauge/arrow rendering. External touchpoints: `analysis.ts` wires `window['onFSFline']`; `goPly` and `sendMove` call `engineStop`/`clearPvlines`/`engineGo`; `onMsgBoard` uses `buildScoreStr` to stamp server-analysis scores onto steps and clears the info line; the per-board `localAnalysis` flags live on `GameControllerBughouse`. The analysis controller's `ffish` handle serves only the engine path (PV SAN conversion, `fsfEngineBoard`, notation setup) — the boards own their separate `ffishBoard` instances.

## Goals / Non-Goals

**Goals:**

- All engine state and behavior in `client/two-board/analysis/engine.ts`; the controller retains no engine fields and no UCI/PV/score/gauge code.
- Identical runtime behavior: toggles, PV lines (multipv 1–5), score/gauge/arrow, go-deeper, PV-move click, error dialog on engine termination.
- Unit tests for score formatting and eval-line parsing.

**Non-Goals:**

- No change to the single-board analysis engine code or `fairyStockfish.ts` loader.
- No functional changes: stubs stay stubs (`drawAnalysisChart` stays on the controller — it is server-analysis charting, not engine evaluation).
- No change to where `localAnalysis` lives (per-board flags on `GameControllerBughouse`).

## Decisions

1. **A class (`EngineController`, `ctrl.engine`), not free functions.** Unlike PGN (two stateless entry points), the engine subsystem owns substantial mutable state — process readiness, prompt queue, ffish handle, retained vnodes. Free functions would leave ~15 state fields on the analysis controller, defeating the purpose. The class is constructed in the analysis controller's constructor with a back-reference (`new EngineController(this)`), and `engine.ts` imports the controller type with `import type` only — no runtime cycle (same discipline as `pgn.ts`).

2. **State split.** Moves to the engine: everything listed in Context — the FSF/ffish state, `isEngineReady`, `maxDepth`, `multipv`, `arrow`, `fsfDebug`, and the PV/score/info retained vnodes (only engine code writes them; `onMsgBoard`'s info-line reset becomes a small engine method). Stays on the controller: `notation` (page-level display setting, the engine reads `ctrl.notation` when building its ffish notation object), `chess960`, `variant`, and the boards' `localAnalysis` flags.

3. **`buildScoreStr` becomes an exported pure function** `buildScoreStr(color, ceval)` used by both the engine (`onMsgAnalysis`) and the controller's server-eval stamping in `onMsgBoard` — the one engine-adjacent piece the controller legitimately still needs, and now unit-testable. The UCI eval-line parsing is exposed as a pure, exported `parseUciInfoLine(line)` (wrapping `EVAL_REGEX` + field extraction) so it can be tested without an engine; `onFSFline` composes it.

4. **Window hook stays in `analysis.ts`**, updated to `ctrl.engine.onFSFline`. The engine does not self-register on `window` — keeping the page-level wiring visible where the page is built.

5. **Verification approach.** Engine output cannot be byte-captured deterministically (search is nondeterministic), so parity is verified structurally: typecheck guarantees the moved methods' dependency completeness; jest pins the pure parts; the browser smoke additionally toggles the engine checkbox on the analysis page and asserts PV/score elements react (or, if FSF wasm fails to boot headless, at minimum no page errors and checkbox wiring works).

## Risks / Trade-offs

- [`this`-rebinding mistakes during the move (arrow vs method, callbacks)] → methods move verbatim with their existing arrow/method forms; the only `this` changes are `this.x` → `this.ctrl.x` for controller-owned data, enforced by typecheck.
- [Hidden consumers of moved fields (e.g. `vinfo` written from `onMsgBoard`)] → grep for every moved field name across `client/` before deleting; `onMsgBoard`'s two engine touches go through new engine methods.
- [Headless FSF wasm flakiness in the smoke] → treat engine-reaction assertion as best-effort with a no-page-errors floor; manual verification note if wasm doesn't boot in the harness.

## Open Questions

- None.
