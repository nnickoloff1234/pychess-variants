## ADDED Requirements

### Requirement: Shared base and round controllers hold no VNode/HTMLElement-typed fields or inline DOM code
`TwoBoardController` (`twoBoardCtrl.ts`) and `RoundControllerBughouse` (`roundCtrl.ts`) SHALL NOT declare `VNode`/`HTMLElement`-typed fields, nor contain inline `document.*`/`patch()`/`h()` calls in class methods — with the sole exception of the constructor's `HTMLElement` mount-point parameters used to construct the chessground boards, `roundCtrl.ts`'s tab-focus (`document.hidden`/`visibilitychange`) tracking (neither of which is DOM content rendering), and `twoBoardCtrl.ts`'s pre-existing `swap`/`switchBoards`/`initBoardSettings` free functions (out of scope for this change). `AnalysisControllerBughouse` (`analysisCtrl.ts`) SHALL likewise hold no dead write-only `VNode` field left over from a prior extraction.

Retained-vnode state that snabbdom's `patch(oldVnode, newVnode)` genuinely needs for incremental diffing (as opposed to state that is written but never read back) SHALL be owned by a small view-state class instantiated once by the controller and held via a non-DOM-typed member, in the module already responsible for that DOM area — not a bare controller field and not a bare module-level variable. Fields confirmed dead (written but never read back) SHALL be deleted outright, not relocated.

#### Scenario: Dead fields removed
- **WHEN** `AnalysisControllerBughouse` is constructed and its PGN panel is rendered, or `TwoBoardController` is constructed and its movelist buttons are rendered
- **THEN** no `vpgn` field exists on the analysis controller and no `moveControls` field exists on the base controller; the underlying `patch()` calls in `pgn.ts`/`movelist.ts` still run exactly as before, just without assigning their result to a controller field

#### Scenario: Movelist retained-vnode state owned by its rendering module
- **WHEN** the movelist is updated (tree navigation, a new move, a result) after this change
- **THEN** `common/movelist.ts` diffs against its own retained-vnode state (not a `TwoBoardController.vmovelist` field) and the movelist updates in place exactly as before, with no scroll-position reset

#### Scenario: Round dialog and game-controls retained-vnode state owned by a dedicated round-view class
- **WHEN** a draw/rematch offer dialog is shown, updated, or cleared, or the game-controls buttons transition to their post-game state, after this change
- **THEN** `RoundControlsView` (`client/two-board/round/roundControls.ts`, not `roundCtrl.ts`) owns the retained vnode(s) and performs the diffed `patch()` calls, and the rendered result is pixel-for-pixel identical to before

#### Scenario: Remaining ad-hoc round DOM code relocated
- **WHEN** chat is rendered, the extension-choice widget is cleaned up, the abort button is cleared, the rematch button is inserted, the online-status icon is patched, or the player-bar/info-wrap orientation is swapped, after this change
- **THEN** the DOM-authoring code for each lives in the dedicated round-view module (or another already-appropriate module), and `roundCtrl.ts` calls into it rather than calling `document.*`/`patch()`/`h()` inline

#### Scenario: Behavior is unchanged
- **WHEN** a bughouse round is played (moves, clock updates, draw/resign/rematch offers, game end, board flip/switch) or an analysis session is used, after this change
- **THEN** all rendered output and behavior is identical to before this change — this is a pure code-motion refactor with no new deliberate behavior exceptions
