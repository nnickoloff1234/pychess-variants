# Tasks

## 1. The last-move highlight

- [ ] 1.1 Carry each board's last move through `load_game_bug_from_doc()`. Both facts are already in
      hand there — the loop tracks `last_move` and `last_move_b` as it walks the plies — so this is
      about where they end up, not about finding them.
- [ ] 1.2 Confirm against the harness that a restored game highlights the right move on BOTH boards,
      including when the two boards' last moves are at different plies.
- [ ] 1.3 `PB.myNextMove()` should then locate itself correctly after a restart; it reads the
      highlight, and its confusion is the cheapest available test of 1.1.

## 2. The dropped map

- [ ] 2.1 Rebuild `lastmovePerBoardAndUser` at load: for each board, the last move played by each
      username. The loop already knows the board and the move; it does not currently know the
      player, so establish whether the seat can be derived from the ply parity (it should be — the
      board's colours alternate) before assuming it.
- [ ] 2.2 Then check that scenario T6 takes branch 1.2.3.2 rather than 1.2.3.4, which is the
      observable difference and the reason this matters at all.
- [ ] 2.3 Update the note in `reconnectController.ts` that currently records the asymmetry as a
      standing fact.

## 3. The dropped offers

- [ ] 3.1 Decide: restore, or abandon and announce. Restoring means persisting an intention, which
      the document has never held; announcing means a message the clients do not have today.
- [ ] 3.2 Whichever is chosen, no client should be left showing an offer the server has forgotten.

## 4. Verify

- [ ] 4.1 A scenario in `tests/reconnect_matrix` for the highlight, alongside T4-T7.
- [ ] 4.2 Python gates.
