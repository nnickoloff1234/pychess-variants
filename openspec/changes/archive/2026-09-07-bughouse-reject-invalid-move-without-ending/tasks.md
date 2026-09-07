## 0. Status

**DONE 2026-09-06/07.** Opened 2026-08-30 as POSTPONED — ending the game on an invalid move was kept
deliberately, as the loudest available detector while `bughouse-clock-record-investigation` hunted
the clock causes. That investigation closed, and the behaviour was changed as part of the reconnect
work: a client whose move is refused is a client with a stale picture of the position, which is what
a reconnection produces, and losing the game for it was a heavy answer to a light problem.

The implementation landed in two passes, and the second is the important one: the first changed WHO
refuses and left every side effect of refusing in place.

## 1. Decide, before anything is written

- [x] 1.1 What the client does with a rejection. ANSWERED: the existing full-board resync is enough,
      and no targeted undo is needed. `utils_bug.play_move()` sends the refusing client
      `game.get_board(full=True)` and nobody else — the move was not played, so no other picture
      changed. The client applies it like any other snapshot; `reconnectController` branch 1.2.2
      then drops the waiting move because the position cannot accept it, which is what stops the
      same impossible move being resent on every later reconnection.

- [x] 1.2 The clock entries a failed move appended — measured again on a fresh game, and the answer
      is now UNWIND BY NOT WINDING. `update_clocks()` ran BEFORE the move was validated, so one
      refused move:
        - appended a third entry to `ply_clocks` for a board holding one move and one step, so the
          arrays `save_game()` writes no longer aligned with `m` and `o`;
        - overwrote the opponent's `last_move_clocks` entry with the number the REFUSING client
          sent (3600000 -> 1234567 in the measurement);
        - stopped that board's stopwatch, which is restarted only after the try block and so was
          left frozen.
      Fixed by refusing above all of it — see 2.1. Nothing to unwind, because nothing is wound.

- [x] 1.3 Whether repeated invalid moves escalate. ANSWERED, and PARTLY ACCEPTED. There is no
      escalation and no counter. Before the guard this was serious — each refused move corrupted
      the clock record and could be repeated at will. Now a refused move costs one legal-move
      generation and one board message back to the sender only, and changes nothing. That is a
      bounded cost on an authenticated socket in an existing game, so it is accepted rather than
      rate-limited; see 3.1 for what would change that judgement.

- [x] 1.4 One-board variants are UNCHANGED. `Game.play_move()` is a separate implementation and was
      not touched; this change is bughouse-only, which also keeps the blast radius to the variant
      the reconnect work is about.

## 2. Only then

- [x] 2.1 Implemented, in two places that must be read together.

      **The refusal**, `bug/utils_bug.play_move()`: catches the engine's refusal and resyncs the
      sender instead of ending the game. Catches bare `Exception`, not `SystemError` — the engine
      raises `ValueError` for an unparseable move with a `SystemError` chained behind it, and
      catching only the latter let a live illegal move fall through while every test passed.

      **The guard**, `bug/game_bug.play_move()`: nothing changes until the move is known good.
      `if move not in self.boards[board].legal_moves_no_history(): raise`, above `update_clocks()`.
      `legal_moves_no_history()` rather than `legal_moves()` because its own comment says it exists
      for bughouse, which cannot recreate a board's history — pieces arrive from the other board.

      **The ordering**, same function: the captured piece is COMPUTED before the push (it reads the
      pre-move position) and APPLIED after it. `push()` rolls back its own board and knows nothing
      about the partner's, so a pocket written first survived a failure as a piece added for a move
      that never happened. Still before `has_legal_move()` and `update_status()`, which read the
      partner board — a piece arriving in the pocket can be the escape from mate.

      The `except` in `game_bug.play_move()` is KEPT and now means something different: it protected
      no state before and protects none now, but it used to fire routinely, with a stack trace, for
      the ordinary case of a stale client. It now fires only for genuine faults, so an ERROR there
      is worth reading again.

- [x] 2.2 Verified. Six tests in `tests/test_bughouse_invalid_move.py`, each shown to FAIL with its
      own half of the fix undone rather than merely passing:
        - the clock test fails with the guard disabled and the reorder left in place;
        - the pocket test fails with the guard left in place and only the reorder undone — and it
          had to be rewritten to get there. Written first with an illegal move it passed either
          way, because the guard refuses that case before the pocket code runs; it now injects a
          push failure on a LEGAL capture, which is the case only the ordering can protect.
      Live in the four-window harness: a genuinely illegal move sent from a real browser was
      refused with `resyncing that client`, the game continued, and a board message came back.
      The stress playbook's S5 and S7 were re-run against the new behaviour and are clean.

## 3. Not in this change

- [ ] 3.1 Rate-limiting refused moves. Accepted as bounded above; revisit if a refusal ever becomes
      expensive again, or if one is ever answered with more than a board message to the sender.
- [ ] 3.2 Games already saved with a clock array misaligned by a refused move. They stay as they
      are; the read side tolerates it, and rewriting stored history to fix a display detail is a
      worse trade than leaving it.
