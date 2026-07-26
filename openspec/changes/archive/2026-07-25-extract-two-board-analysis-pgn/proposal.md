# Extract PGN logic out of the two-board analysis controller

## Why

`AnalysisControllerBughouse` (`client/two-board/analysis/analysisCtrl.ts`, ~1300 lines) mixes engine plumbing, tree navigation, and PGN concerns in one class. The PGN surface — header-tag building (`pgnText`), mainline move-text generation (`getPgn`'s legacy branch), tree move-text composition, and the FEN/PGN panel rendering (`renderFENAndPGN`, `checkStatus`) — is self-contained, already leans on external pure helpers (`analysisTreeTwoBoards.ts` renderers, `seats` container for names), and is the part most likely to grow (download/copy buttons are still `console.log` stubs). Extracting it shrinks the controller and gives PGN behavior a home that can be unit-tested without the controller.

## What Changes

- New module `client/two-board/analysis/pgn.ts` owning the bughouse-analysis PGN/FEN-panel functionality, as free functions taking the controller (type-only import of `AnalysisControllerBughouse`, keeping the module graph acyclic at runtime):
  - the PGN header/tag builder (moved from the private `pgnText` method; still reads player names via `seats.byBoardAndColor(...).player.username`),
  - full PGN text generation for both paths (tree-based via `renderBughouseTreePgnMoveText`, legacy mainline loop with `1A.`/`1B.` move counters),
  - FEN/PGN panel rendering (moved from `renderFENAndPGN`: copy/download button stubs, `#fullfen` value, `#pgntext` patch) and the `checkStatus` refresh logic that ties them together.
- `AnalysisControllerBughouse` keeps only thin state and delegation: the `vpgn`/`pgn` fields and call sites (constructor, `onMsgBoard`, `goPly`, `sendMove` paths) invoke the module; the private methods are deleted.
- Behavior parity: PGN output, the FEN & PGN tab, and the copy-line context-menu action are byte/DOM-identical. `copyTreeLinePgn` stays on the controller (it is tree-context-menu state management) but keeps delegating to the shared move-text renderers.
- Jest unit coverage for the extracted pure parts (header tags, legacy mainline move text) using a stub controller — previously untestable as private methods.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `bughouse-client-controllers`: new requirement isolating PGN generation/rendering in a dedicated analysis module with the controller free of PGN string building; the existing "PGN header tags from the container" scenario wording updates to name the module as the single shared helper's home.

## Impact

- `client/two-board/analysis/pgn.ts` — new module.
- `client/two-board/analysis/analysisCtrl.ts` — removes `pgnText`, `getPgn`, `renderFENAndPGN`, `checkStatus` bodies (~120 lines); adds delegating call sites.
- `tests/` — new jest spec for the module's pure output.
- No server, i18n, wire-format, or user-visible changes.
