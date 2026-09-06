# Tasks

## 1. Establish the ground truth first

- [ ] 1.1 Reproduce the rollback: start a bughouse game, play moves, restart the server, reconnect.
      Confirm the game returns at ply 0 with full clocks, and record what the four clients do with
      it. This is the evidence the change exists for and nobody has seen it happen.
- [ ] 1.2 Confirm `active_game_filter` matches a bughouse document — `"r": R2C["*"] == "d"`, `"s"`
      STARTED — rather than assuming it from reading.
- [ ] 1.3 Check whether `load_game_bug_from_doc` copes with a partial document at all before
      designing what to write into one.

## 2. The writer

- [ ] 2.1 A per-ply writer beside `save_game()`, pushing the move, the board marker `o`, and the
      moving side's clock; setting both fens and the status.
- [ ] 2.2 A compare-and-set filter in the spirit of the one-board one, so a duplicate or out-of-order
      write is a no-op and not a corruption.
- [ ] 2.3 Keep `save_game()` as the authoritative end-of-game write, overwriting the arrays whole —
      the document is consistent on close whatever the per-ply writes did.

## 3. Ordering

- [ ] 3.1 One serial queue per game, filled under `game.move_lock` and drained by one worker.
- [ ] 3.2 The worker drains before `save_game()` finalises, so the last ply cannot race the close.
- [ ] 3.3 Bound the queue: log if it is non-empty when the next ply arrives, and fall back to
      awaiting inline beyond a small depth — a slow database must not silently widen the loss window
      from one ply to many.
- [ ] 3.4 If 3.1-3.3 turn out awkward, do it synchronously and say so. Simplicity beats a clever
      queue nobody can reason about, and the one-board path has been synchronous all along.

## 4. Recovery

- [ ] 4.1 Restore a game from a partial document and confirm the position, the ply, the board
      interleaving and both boards' clocks are what they were.
- [ ] 4.2 Confirm the pockets are right — they are a function of the moves, so they should follow,
      and should is not evidence.
- [ ] 4.3 Confirm a game restored mid-play can be PLAYED ON: the next move is accepted and recorded
      at the right ply.

## 5. Verify

- [ ] 5.1 Restart mid-game with all four windows connected, with `test-users-survive-restart` in
      place so the players come back too.
- [ ] 5.2 Restart between a move and its persistence — the accepted-risk case — and confirm the loss
      is exactly one ply and that the clients notice rather than silently accepting it.
- [ ] 5.3 Measure the added latency of the synchronous fallback before choosing it, so the choice is
      made on a number.
- [ ] 5.4 Python gates.

## 6. Not in this change

- [ ] 6.1 The client's response to a rolled-back snapshot — `reconnect-sync-controller`.
- [ ] 6.2 Takebacks. Bughouse has none, so no `pop_move_from_db()` analogue is needed.
