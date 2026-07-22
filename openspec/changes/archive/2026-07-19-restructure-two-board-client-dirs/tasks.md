# Tasks: restructure-two-board-client-dirs

## 1. Move files (git mv, no content changes yet)

- [x] 1.1 `git mv client/bug client/two-board` and create subfolders `analysis/`, `round/`, `socket/`, `common/`
- [x] 1.2 `git mv` into `analysis/` dropping `.bug`: `analysis.ts`, `analysisCtrl.ts`, `analysisClock.ts`, `analysisTreeBug.ts` → `analysisTreeTwoBoards.ts`, `movetimeChart.ts`
- [x] 1.3 `git mv` into `round/` dropping `.bug`: `round.ts`, `roundCtrl.ts`, `clockDifference.ts`, `chat.ts`
- [x] 1.4 `git mv` into `socket/`: `roundCtrl.bug.socket.ts` → `sockets.ts`, `pendingMoves.bug.ts` → `pendingMoves.ts`
- [x] 1.5 `git mv` into `common/` dropping `.bug`: `gameCtrl.ts`, `movelist.ts`, `gameInfo.ts`; rename root files in place: `playersState.bug.ts` → `playersState.ts`, `lobby.bug.ts` → `lobby.ts`, `profile.bug.ts` → `profile.ts`, `paste.bug.ts` → `paste.ts` (`twoBoardCtrl.ts` unchanged at root)

## 2. Update imports

- [x] 2.1 Fix relative and `@/bug/...` imports inside all moved files for both the new paths and the suffix-free basenames (adjust `../` depth for the extra nesting level; keep each import's existing relative-vs-alias style)
- [x] 2.2 Update external client importers: `client/main.ts`, `client/chat.ts`, `client/lobby.ts`, `client/profile.ts`, `client/paste.ts`
- [x] 2.3 Update test imports: `tests/bugAnalysisTree.test.ts`, `tests/bugAnalysisNavigation.test.ts`, `tests/anonDisplay.test.ts`
- [x] 2.4 Sweep for leftovers: `grep -rnE "bug/|\.bug" client/ tests/ esbuild.mjs package.json` returns no stale path or `.bug`-name references (identifiers like `analysisTreeBug`/`bugMovePrefix` and test filenames excepted)

## 3. Verify (zero behavior change)

- [x] 3.1 `yarn typecheck` clean; `npx oxlint --deny-warnings` and `npx oxfmt --check` clean on the moved tree
- [x] 3.2 `yarn test` (jest) passes
- [x] 3.3 `yarn dev` builds clean
- [x] 3.4 Playwright smoke: bughouse round page and finished-game analysis page load and play/scroll identically (reuse existing probes)
- [x] 3.5 `git log --follow` spot check on two moved files confirms history is preserved as renames
