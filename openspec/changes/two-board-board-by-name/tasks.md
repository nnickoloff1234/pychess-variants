## 1. Implement

- [ ] 1.1 Re-grep the sites (command in the proposal); update the table if the count changed.
- [ ] 1.2 Add `board(name: BugBoardName): GameControllerBughouse` to `TwoBoardController`.
- [ ] 1.3 Replace every site with `this.board(...)`; the own board as
      `this.board(ownBoardName(this.seats))`.
- [ ] 1.4 The two `Step.boardName` sites (`twoBoardCtrl.ts:183`, `analysis/analysisCtrl.ts:328`):
      decide each fallback explicitly, see the proposal; record any real bug separately.

## 2. Verify

- [ ] 2.1 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`.
- [ ] 2.2 Live: a bughouse round (moves on both boards, a game end) and the bughouse analysis page
      (stepping through moves on both boards) behave as before.
