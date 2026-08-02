# Design: client/two-board directory restructure

## Context

`client/bug/` holds 19 flat files. Current consumers of the directory from outside: `client/main.ts` (round + analysis view entries), `client/chat.ts` (imports `RoundControllerBughouse` and `chat.bug`), `client/lobby.ts` (`lobby.bug`), `client/profile.ts` (`profile.bug`), `client/paste.ts` (`paste.bug`), and tests `bugAnalysisTree.test.ts`, `bugAnalysisNavigation.test.ts`, `anonDisplay.test.ts`. Internally the files import each other via a mix of relative paths (`./gameCtrl.bug`) and the `@/` alias (`@/bug/chat.bug`). Nothing in `server/`, `templates/`, or `static/` references these file paths.

Constraint from the request: **move/rename only** — no code changes except import paths and equally minor mechanical fallout. No behavior change.

## Goals / Non-Goals

**Goals:**
- `client/bug/` → `client/two-board/` with subfolders `analysis/`, `round/`, `socket/`, `common/`.
- `.bug` filename suffixes dropped in the same move (`x.bug.ts` → `x.ts`; `roundCtrl.bug.socket.ts` → `sockets.ts`); git history preserved via `git mv`.
- All imports updated; typecheck/tests/build/lint gates stay green; bundle behavior identical.

**Non-Goals:**
- No renaming beyond dropping the `.bug` suffix and one basename swap: `analysisTreeBug.ts` → `analysisTreeTwoBoards.ts` (per user decision, `Bug` → `TwoBoards`; plain `analysisTree.ts` would shadow `client/analysis/analysisTree.ts` which it imports); `twoBoardCtrl.ts` and `clockDifference.ts` are unchanged.
- No code restructuring, no fixing of the deferred review findings (import cycle etc.), no changes to `server/bug/` (server-side naming stays as is).
- No changes to CSS class names, element ids, or the `static/bughouse.css` filename.

## Decisions

1. **Two subfolders for the two pages, not one.** The request lists "a subfolder for analysis and round related files"; since item 4 separately calls for a `common/` folder for files shared by both views, the coherent reading is one folder per page: `analysis/` and `round/`. A single combined folder would just recreate today's mixing.

2. **File classification** (by actual import consumers, verified by grep):
   - `analysis/`: `analysis.ts`, `analysisCtrl.ts`, `analysisClock.ts`, `analysisTreeTwoBoards.ts` (renamed from `analysisTreeBug.ts`), and `movetimeChart.ts`.
   - `round/`: `round.ts`, `roundCtrl.ts`, `clockDifference.ts` (only `playersState` uses it), `chat.ts` (consumed by `roundCtrl` and `client/chat.ts`; not used by analysis).
   - `socket/`: `sockets.ts` (renamed from `roundCtrl.bug.socket.ts` per user decision — inside `socket/` the old prefix is noise), `pendingMoves.ts` (per request item 3).
   - `common/`: `gameCtrl.ts`, `movelist.ts`, `gameInfo.ts` — each is imported by both the round and analysis sides.
   - root `two-board/`: `twoBoardCtrl.ts` and `playersState.ts` (per user decision both stay in the main folder), plus `lobby.ts`, `profile.ts`, and `paste.ts` — files serving other pages (lobby/profile/paste), none coupled to the round or analysis views (`paste.ts` only imports `@/alertDialog` and is consumed only by `client/paste.ts`).

3. **`git mv` per file (move + suffix drop in one step), then mechanical import rewrite.** Moves and import edits in one commit so the tree never breaks. Import rewriting is textual: `bug/<name>.bug` → the new subpath and suffix-free name, relative paths adjusted for the new nesting depth (e.g. `../i18n` → `../../i18n` for files now one level deeper). Prefer keeping each import's existing style (relative vs `@/` alias) rather than normalizing, to keep the diff minimal.

4. **No re-export shims.** All importers are updated directly; there are few enough (5 client files + 3 test files + internal imports) that compatibility stubs would just add debt.

5. **Spec paths updated via delta.** The `bughouse-client-controllers` spec names concrete paths; a MODIFIED delta updates them to `client/two-board/...`. Requirements' meaning is unchanged.

## Risks / Trade-offs

- [Missed import somewhere (dynamic import, jest moduleNameMapper, esbuild config)] → grep for `bug/` across `client/`, `tests/`, `esbuild.mjs`, `jest.config`/`package.json` after the move; `tsc` catches all static misses; jest run catches mapper issues.
- [Relative-depth mistakes in moved files (`../` vs `../../`)] → `tsc` is the gate; zero-error typecheck required before anything else.
- [Git shows moves as delete+add if content changes too much in the same commit] → import edits are small relative to file size; `git mv` (even with the basename change) + small edits keeps rename detection intact (verify with `git log --follow` spot checks).
- [`@/bug/...` alias imports left behind] → the alias maps `@/` to `client/`, so `@/bug/...` paths become `@/two-board/<sub>/...`; a final `grep -rnE "bug/|\.bug" client/ tests/` must return only intentional matches (`bugMovePrefix`-style identifiers and test filenames — no stale paths or module names).

## Migration Plan

Single commit, client-only. Rollback = revert. Verification order: `tsc` → `oxlint`/`oxfmt --check` → jest → `yarn dev` build → Playwright round + analysis smoke probes (reuse this session's probes) → `git log --follow` spot check on two moved files.

## Open Questions

- None. (If the user prefers `lobby.bug.ts`/`profile.bug.ts` in a subfolder, or different names than `analysis|round|socket|common`, that's a one-line adjustment to the mapping before implementation.)
