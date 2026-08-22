# Design: shared bughouse controller core

## Context

Bughouse pages drive two chessgrounds at once via two `GameControllerBughouse` instances (`boardA`/`boardB`), each holding a `parent` back-reference typed as `AnalysisControllerBughouse | RoundControllerBughouse`. The two parent controllers do not share any base class:

- `RoundControllerBughouse` (`roundCtrl.bug.ts`) — live play: socket wiring (`roundCtrl.bug.socket.ts`), `PlayersState` clocks, offers/rematch dialogs, chat, spectator handling.
- `AnalysisControllerBughouse` (`analysisCtrl.bug.ts`) — analysis board: ffish engine, analysis tree, PGN rendering, eval charts.

Duplicated between them today:
- Constructor: creating both boards from six DOM elements, `partnerCC`/`parent` cross-wiring, `VARIANTS[model.variant]`, model field parsing (`gameId`, `username`, `base`, `inc`, `status`), `createMovelistButtons(this)` + `vmovelist`, `initBoardSettings(...)`.
- `steps`/`plyA`/`plyB` bookkeeping: identical "skip first dummy element, bump plyA or plyB by `step.boardName`, stamp `step.plyA`/`step.plyB`, push" loop in round's `updateSteps` and analysis' `onMsgBoard`.
- `goPly` core: resolve `step` → active board, `fen`/`fenPartner`, `move`/`movePartner`, capture detection (the same "960 king takes rook" TODO comment appears in both files), forward-scroll move sound, `setState`+`renderState` on both boards.
- `flipBoards`/`switchBoards`; the free functions `swap`/`switchBoards`/`initBoardSettings` live in `roundCtrl.bug.ts` and are imported by `analysisCtrl.bug.ts`, while `roundCtrl.bug.ts` imports `AnalysisControllerBughouse` for a type union — a circular dependency (plus `gameCtrl.bug.ts` importing both).

Constraint: **zero behavior change**. This is client-only; server and socket message shapes are untouched.

## Goals / Non-Goals

**Goals:**
- One place for two-board bughouse state and algorithms; subclasses hold only round-specific or analysis-specific logic.
- Break the `roundCtrl.bug.ts` ⇄ `analysisCtrl.bug.ts` circular import.
- Replace the `AnalysisControllerBughouse | RoundControllerBughouse` union with the base type where only shared members are used.

**Non-Goals:**
- No merging with the single-board `GameController`/`RoundController`/`AnalysisController` hierarchy (that is a much larger change; `gameCtrl.bug.ts:161` TODO stays).
- No behavior fixes, even where duplicated code looks buggy — divergences are preserved and only noted in comments/tasks for follow-up.
- No changes to `chat.bug.ts`, clocks, or socket layer beyond import-path/type adjustments.
- No server-side (`server/bug/`) changes.

## Decisions

1. **Abstract base class over mixins/composition.** Create `client/bug/twoBoardCtrl.ts` exporting `abstract class TwoBoardController`. Both controllers already share stateful identity (fields consumed by `movelist.bug.ts` via the union type), so a base class directly replaces the union; mixins or a delegated "shared core" object would force every consumer through a second indirection and churn far more call sites. This also mirrors the existing single-board pattern (`GameController` abstract base).

2. **Base owns board construction.** The base constructor takes the six DOM elements + `PyChessModel`, builds `boardA`/`boardB`, wires `partnerCC`/`parent`, parses shared model fields, and calls `createMovelistButtons(this)`. Subclass constructors call `super(...)` first, then do their specific setup (socket/clocks for round; ffish/tree/engine for analysis). Order-sensitive steps that differ (e.g. round sets chessground orientation from `playersState`, analysis flips board B) stay in subclasses.

3. **Shared algorithms as protected methods, not free functions.** `stampStepPlys(step, idx)` (the plyA/plyB stamping), `stepCapture(step, board)` (capture detection), and a `goPlyCore(...)` helper that returns the resolved `{step, board, fen, fenPartner, move, movePartner}` tuple. Each subclass `goPly` keeps its own surrounding behavior (round: movable/dests gating by spectator state; analysis: tree/engine/`plyVari` handling) but calls the shared resolution + sound logic. Rationale: the three `goPly` variants differ in real ways; extracting only the provably identical core avoids accidental behavior change.

4. **Free functions move to the shared module.** `swap`, `switchBoards(ctrl: TwoBoardController)`, `initBoardSettings` move from `roundCtrl.bug.ts` to `twoBoardCtrl.ts`. `switchBoards` narrows its parameter to the base type, which removes `roundCtrl.bug.ts`'s import of `AnalysisControllerBughouse` and `analysisCtrl.bug.ts`'s import from `roundCtrl.bug.ts` — the cycle is gone. `roundCtrl.bug.ts` re-exports nothing; importers are updated.

5. **`gameCtrl.bug.ts` parent type becomes `TwoBoardController`.** The `parent: AnalysisControllerBughouse | RoundControllerBughouse` field and any `instanceof` checks switch to the base class; where round-only members are needed (`playersState`), existing `instanceof RoundControllerBughouse` narrowing stays.

6. **Abstract surface.** Members the shared code calls but subclasses implement differently are declared abstract on the base: `sendMove(board, move)`, `goPly(ply)`. `checkStatus` differs too much (round: game-over UI; analysis: PGN refresh) and stays subclass-only rather than abstract, since no shared code calls it.

## Risks / Trade-offs

- [Subtle behavior drift while unifying near-identical code — e.g. round's `updateSteps` emits chat markers at plies 0/4/end, analysis' loop handles `step.analysis` eval stamping] → the shared bookkeeping helper takes the per-step common part only; chat markers and eval stamping remain in the subclass loops as callbacks/inline code. Diff-review each extraction against both originals.
- [Constructor ordering bugs: analysis calls `onMsgBoard(model.board)` inside its constructor; round constructs the socket last so DOM is ready] → base constructor does only what both did before any divergent step; ordering of subclass-specific steps is preserved verbatim.
- [`movelist.bug.ts` uses `instanceof RoundControllerBughouse` (`teamsOf`) — moving fields could break narrowing] → keep `playersState` on the round subclass; only members present in both move to the base.
- [Typecheck ripples in `@/bug/*` importers] → the retype is mechanical; `yarn typecheck` gates it.

## Migration Plan

Single PR, no data or server migration. Rollback = revert the commit. Verification: `yarn typecheck`, `yarn test`, `yarn dev` build, then Playwright/manual smoke of one bughouse round (two browsers or `-a` test users) and one bughouse analysis page (scroll movelist, engine toggle, switch/flip boards).

## Open Questions

- None blocking. Follow-up candidates (out of scope): unify with single-board `GameController` hierarchy; move capture detection to ffish.js (existing TODO).
