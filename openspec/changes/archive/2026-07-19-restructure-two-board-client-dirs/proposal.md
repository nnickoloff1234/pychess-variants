# Restructure bughouse client code into client/two-board with purpose-based subfolders

## Why

`client/bug/` is a flat directory of 19 files where round-play, analysis, socket, lobby/profile, and shared code are all mixed together, distinguishable only by naming conventions (`*.bug.ts`, `roundCtrl.bug.socket.ts`). After the `refactor-bughouse-ctrl-shared-logic` change introduced a shared controller layer, the round/analysis/common split now exists in the class structure but not in the file layout. A purpose-based directory structure makes ownership obvious and gives future changes (e.g. the deferred import-cycle cleanup) natural seams — and once the files live in a `two-board/` tree, the `.bug` filename suffixes are redundant and can go. The name `two-board` also matches the established `TwoBoardController`/`twoBoards` terminology better than `bug`.

## What Changes

- Rename `client/bug/` to `client/two-board/`.
- Create four purpose-based subfolders and move files into them, **dropping the `.bug` filename suffix in the same move** (`x.bug.ts` → `x.ts`; `roundCtrl.bug.socket.ts` → `sockets.ts`):
  - `client/two-board/analysis/` — analysis-page files: `analysis.ts`, `analysisCtrl.ts`, `analysisClock.ts`, `analysisTreeTwoBoards.ts`, `movetimeChart.ts`
  - `client/two-board/round/` — round-page files: `round.ts`, `roundCtrl.ts`, `clockDifference.ts`, `chat.ts`
  - `client/two-board/socket/` — networking files: `sockets.ts` (renamed from `roundCtrl.bug.socket.ts`), `pendingMoves.ts`
  - `client/two-board/common/` — files reused by both round and analysis views: `gameCtrl.ts`, `movelist.ts`, `gameInfo.ts`
- Keep at the new root (per user decision): `client/two-board/twoBoardCtrl.ts` and `client/two-board/playersState.ts`, plus the three files that belong to neither page: `client/two-board/lobby.ts`, `client/two-board/profile.ts`, and `client/two-board/paste.ts` (the BPGN import helper has no code coupling to the analysis view).
- `analysisTreeBug.ts` is renamed to `analysisTreeTwoBoards.ts` (per user decision): the `Bug` in the camelCase basename is replaced with the `TwoBoards` suffix; plain `analysisTree.ts` is avoided because it would shadow the `client/analysis/analysisTree.ts` module it imports from.
- Update all import paths: internal relative imports among the moved files, `@/bug/...` alias imports, the five external client importers (`main.ts`, `chat.ts`, `lobby.ts`, `profile.ts`, `paste.ts`), and the three test files (`tests/bugAnalysisTree.test.ts`, `tests/bugAnalysisNavigation.test.ts`, `tests/anonDisplay.test.ts`).
- **Move/rename only**: no code changes beyond import paths and equally minor mechanical adjustments. No logic changes, no behavior changes, no CSS/id/server changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `bughouse-client-controllers`: no behavioral requirement changes, but the requirement texts name concrete file paths (`client/bug/twoBoardCtrl.ts`, `roundCtrl.bug.ts`, etc.) that this change relocates and renames; the spec's path references must be updated to the new `client/two-board/...` locations and suffix-free basenames.

## Impact

- **Code**: all 19 files under `client/bug/` move and 17 are also renamed (`.bug` dropped; `analysisTreeBug.ts` → `analysisTreeTwoBoards.ts`); import-path edits in the moved files plus `client/main.ts`, `client/chat.ts`, `client/lobby.ts`, `client/profile.ts`, `client/paste.ts`, and `tests/bugAnalysisTree.test.ts`, `tests/bugAnalysisNavigation.test.ts`, `tests/anonDisplay.test.ts`.
- **Server/API/CSS/templates**: none — nothing outside `client/` and `tests/` references these paths (`static/bughouse.css` is loaded by name, not by client path).
- **Git**: use `git mv` so history follows the files as renames.
- **Verification**: `yarn typecheck`, `yarn test`, `yarn dev` build, `oxlint`/`oxfmt --check`; bughouse round + analysis Playwright smoke (existing probes) to confirm zero behavior change.
