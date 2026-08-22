## 1. Dead field removal

- [x] 1.1 Remove `vpgn: VNode` from `AnalysisControllerBughouse` (`analysisCtrl.ts`); in `pgn.ts`, stop assigning the `patch()` result to `ctrl.vpgn` (call `patch()` for its side effect only)
- [x] 1.2 Remove `moveControls: VNode` from `TwoBoardController` (`twoBoardCtrl.ts`); in `common/movelist.ts`'s `createMovelistButtons`, stop assigning the `patch()` result to `ctrl.moveControls`

## 2. Movelist retained-vnode relocation

- [x] 2.1 Add a small view-state class in `common/movelist.ts` (`MovelistView`) holding the retained movelist vnode privately, with a method performing the diffed `patch()` call used today at the two `patch(ctrl.vmovelist, ...)` sites
- [x] 2.2 Replace `TwoBoardController.vmovelist: VNode | HTMLElement` with a single instance of the new view-state class; remove the constructor's `this.vmovelist = document.getElementById('movelist')` line (superseded by the class's own initial-container lookup)
- [x] 2.3 Update the two `patch(container, ...)` sites in `movelist.ts` (`updateResult` and the other fresh-container branch) to go through the same view-state class so there is a single source of truth for the retained vnode
- [x] 2.4 Update `tests/bugAnalysisNavigation.test.ts`'s stub controllers to use `MovelistView` instead of a raw `vmovelist` field (`tests/analysisPageSmoke.test.ts` confirmed out of scope — tests the unrelated single-board stack, left untouched)

## 3. Round dialog / game-controls relocation

- [x] 3.1 Create `client/two-board/round/roundControls.ts` with a `RoundControlsView` class holding the retained `vdialog` and `gameControls` vnodes privately
- [x] 3.2 Move `renderDrawOffer`, `setDialog`, `clearDialog`, `renderRematchOffer`'s dialog-rendering bodies into methods on `RoundControlsView`; `roundCtrl.ts`'s methods of the same name become thin call-throughs (keeping their existing callback wiring to `this.rejectDrawOffer`/`this.draw`/etc.)
- [x] 3.3 Move the game-controls button rendering (constructor setup and the post-game transition) into methods on `RoundControlsView`
- [x] 3.4 Remove `vdialog: VNode` and `gameControls: VNode` from `RoundControllerBughouse`; replace with one `RoundControlsView` instance

## 4. Remaining ad-hoc round DOM code relocation

- [x] 4.1 Move chat rendering (`patch(document.getElementById('bugroundchat'), chatView(...))`), the extension-choice cleanup, the abort-button cleanup, the rematch-button insertion (`onMsgViewRematch`), the online-status icon patch (`onMsgUserConnected`), and the movelist-reset-on-full-update patch into `roundControls.ts` as plain functions; `roundCtrl.ts` calls them instead of inlining `document.*`/`patch()`/`h()`
- [x] 4.2 Move the player-bar/info-wrap orientation-swap DOM code (the `infoWrap0`/`infoWrap0bug`/`infoWrap1`/`infoWrap1bug` grid-area swaps) into `roundControls.ts` or another already-appropriate module
- [x] 4.3 Remove the now-unused `h`/`VNode`/`patch` imports from `roundCtrl.ts` if nothing else in the file still needs them

## 5. Verification

- [x] 5.1 Confirm by grep that `analysisCtrl.ts`, `twoBoardCtrl.ts`, and `roundCtrl.ts` contain no `VNode`/`HTMLElement`-typed fields and no `document.*`/`patch(`/`h(` calls, aside from the documented constructor-parameter, focus-tracking, and `swap`/`switchBoards`/`initBoardSettings` exceptions
- [x] 5.2 `yarn typecheck`, `yarn test`, lint pass
- [x] 5.3 Browser smoke (existing harness): round page — draw/resign/rematch dialogs, game-controls buttons, chat, movelist, player-bar swap, board flip/switch; analysis page — movelist/tree updates, tab widget, flip/switch; no console/page errors
