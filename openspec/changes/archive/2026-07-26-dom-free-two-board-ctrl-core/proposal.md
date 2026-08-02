## Why

`dom-free-two-board-analysis-ctrl` removed direct DOM manipulation from `AnalysisControllerBughouse`, but that only covered its *static, one-time* setup. The same problem exists more broadly: `analysisCtrl.ts`, `twoBoardCtrl.ts` (the shared base), and `roundCtrl.ts` still hold `VNode`/`HTMLElement`-typed fields and inline `document.getElementById`/`patch()`/`h()` calls mixed into controller state and orchestration methods. Some of these fields are genuinely necessary retained-vnode handles that snabbdom's `patch(oldVnode, newVnode)` needs for incremental diffing (e.g. `vmovelist`, `vdialog`, `gameControls`); others are dead, write-only leftovers (`vpgn`, `moveControls`) never read back anywhere. Neither case belongs on the controller: the dead ones should go, and the load-bearing ones should be owned by the rendering module that already does the patching, not stored as raw controller fields.

## What Changes

- Remove `vpgn: VNode` from `AnalysisControllerBughouse` (`analysisCtrl.ts`) — confirmed dead: `analysis/pgn.ts` writes it once via `patch()` and nothing ever reads it back. Drop the field and the assignment.
- Remove `moveControls: VNode` from `TwoBoardController` (`twoBoardCtrl.ts`) — confirmed dead: `common/movelist.ts`'s `createMovelistButtons` writes it once and nothing reads it back. Drop the field and the assignment.
- Relocate `vmovelist: VNode | HTMLElement` off `TwoBoardController` into module-owned state inside `common/movelist.ts` (genuinely load-bearing: it's the retained vnode `updateMovelist` diffs against to update the tree/movelist in place without resetting scroll position). Wrap it in a small per-instance view-state holder (mirroring the `EngineController`/`AnalysisTreeController` extraction pattern), not a bare module-level variable.
- Relocate `vdialog: VNode` and `gameControls: VNode` off `RoundControllerBughouse` (`roundCtrl.ts`) into a new dedicated rendering module for round-only view concerns, alongside the round controller's other inline DOM code that doesn't currently use a stored field but is still inline `document.*`/`patch()`/`h()` in ctrl methods: chat rendering, the extension-choice cleanup, the abort-button cleanup, the rematch-button insertion, the online-status icon patch, and the player-bar/info-wrap orientation swap.
- Out of scope (explicitly *not* touched): the `HTMLElement` constructor parameters used to mount chessground boards (structurally required, not view rendering), `roundCtrl.ts`'s `document.hidden`/`visibilitychange` focus tracking (environment/focus detection, not DOM content manipulation), and the free functions `swap`/`switchBoards`/`initBoardSettings` in `twoBoardCtrl.ts` (pre-existing board-layout utilities, left in place for this change).
- `tests/bugAnalysisNavigation.test.ts` constructs stub controllers with a `vmovelist` field directly and needs updating to the new API surface. (`tests/analysisPageSmoke.test.ts` was initially thought to need the same update, but it tests the unrelated single-board `client/movelist.ts`/`client/analysis/analysisCtrl.ts` stack, out of scope for this change, and needs no changes.)

## Capabilities

### Modified Capabilities
- `bughouse-client-controllers`: extends the "no direct DOM manipulation" requirement (previously scoped only to `AnalysisControllerBughouse`'s static setup) to cover the shared base controller and the round controller, and to cover dynamic/event-driven re-rendering in addition to one-time setup.

## Impact

- `client/two-board/analysis/analysisCtrl.ts`, `client/two-board/analysis/pgn.ts`
- `client/two-board/twoBoardCtrl.ts`, `client/two-board/common/movelist.ts`
- `client/two-board/round/roundCtrl.ts` and a new round-view rendering module
- `tests/bugAnalysisNavigation.test.ts` (stub-controller update)
