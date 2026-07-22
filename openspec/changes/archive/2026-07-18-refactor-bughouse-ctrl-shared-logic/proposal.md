# Refactor bughouse controllers to share common logic

## Why

`RoundControllerBughouse` (`client/bug/roundCtrl.bug.ts`, ~950 lines) and `AnalysisControllerBughouse` (`client/bug/analysisCtrl.bug.ts`, ~1300 lines) evolved independently and now duplicate a large amount of two-board bughouse logic: board construction and cross-wiring, `steps`/`plyA`/`plyB` bookkeeping, `goPly` position restoration, capture detection, board switching/flipping, and movelist setup. Neither extends the site's `GameController` hierarchy; instead, consumers like `movelist.bug.ts` type everything against the ad-hoc union `AnalysisControllerBughouse | RoundControllerBughouse`, and the modules import each other circularly (`roundCtrl.bug.ts` ⇄ `analysisCtrl.bug.ts` ⇄ `gameCtrl.bug.ts`). This makes every bughouse bug fix a two-place edit (the recent c8efca525 refactoring showed exactly this pain) and makes drift between round and analysis behavior easy to introduce.

## What Changes

- Introduce a shared abstract base class (working name `TwoBoardController`) in a new module `client/bug/twoBoardCtrl.ts` that both `RoundControllerBughouse` and `AnalysisControllerBughouse` extend.
- Move into the base: shared state fields (`boardA`/`boardB`, `model`, `gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `steps`, `ply`, `plyA`/`plyB`, `vmovelist`, `settings`, `home`), board construction/wiring (`partnerCC`, `parent`), movelist button creation, and common model parsing.
- Extract duplicated algorithms into shared methods/helpers: step ply bookkeeping (the "skip first dummy element, bump plyA/plyB, stamp step" logic that exists in both `updateSteps` and the analysis `onMsgBoard`), capture detection for a step (currently copy-pasted in three `goPly` variants), and the common core of `goPly` (resolve step → board/fen/fenPartner/move/movePartner, restore both boards, play move sound on forward scroll).
- Relocate the free functions `swap`, `switchBoards`, and `initBoardSettings` out of `roundCtrl.bug.ts` into the shared module, eliminating the circular import between the round and analysis controllers.
- Retype consumers (`movelist.bug.ts`, `gameCtrl.bug.ts`) against the base class instead of the union type where the union is only used for shared members.
- **No behavior change**: this is a pure structural refactor. Round-play and analysis flows must behave identically before and after.

## Capabilities

### New Capabilities

- `bughouse-client-controllers`: structural requirements for the bughouse client controller layer — a single shared controller core for two-board state, subclassing for round vs analysis concerns, no circular imports among bughouse controller modules, and behavior parity guarantees for the refactor.

### Modified Capabilities

(none — no existing specs, and no user-visible behavior changes)

## Impact

- **Code**: `client/bug/roundCtrl.bug.ts`, `client/bug/analysisCtrl.bug.ts`, new `client/bug/twoBoardCtrl.ts`; type-only ripples in `client/bug/movelist.bug.ts`, `client/bug/gameCtrl.bug.ts`, `client/bug/round.bug.ts`, `client/bug/analysis.bug.ts`, `client/bug/movetimeChart.bug.ts`, `client/bug/playersState.bug.ts`, `client/bug/analysisClock.bug.ts`.
- **Server/API**: none. WebSocket message shapes and server code are untouched.
- **Verification**: `yarn typecheck`, `yarn test`, `yarn dev` build; manual/Playwright smoke of a bughouse round page and analysis page.
