## Why

**POSTPONED, deliberately.** Opened 2026-08-30 to hold a decision, not to make it.

Today an invalid move ENDS the game. `server/bug/utils_bug.py` catches `SystemError` from
`play_move()` and `server/bug/game_bug.py:287-291` sets `INVALIDMOVE` with a result against the
mover, then saves. A client-side race — `bughouse-clock-record-investigation` finding 8, where a
premove is released against a stale position after a reconnect — therefore costs a player the whole
game for something they did not do.

That is clearly wrong as a response. It is NOT obviously safe to change:

- **What does the client do after a rejection?** Its board has already applied the move optimistically.
  Something has to put it back, and "something" is a state-reset path that does not exist today.
- **Which invalid moves are races and which are attacks?** A rejection loop is a denial-of-service
  surface if a client can send garbage indefinitely; ending the game is at least terminal.
- **What happens to the clocks?** The rejected move already appended to `ply_clocks` (measured: four
  entries for two plies). A rejection has to unwind that, or the record keeps a phantom.
- **Does the same answer serve one-board variants?** The invalid-move path is not bughouse-specific,
  and changing it changes every game type.

**Until this is decided, ending the game on an invalid move is KEPT ON PURPOSE.** Nikolay's reason,
2026-08-30: it makes the problem loud while stress testing. A rejected-and-ignored move would let a
client race slip past unnoticed; a game that ends with `status=10` cannot be missed. The detector
stays until the causes are gone.

## What Changes

Nothing yet. When taken up, the work is to decide and then implement:

1. Whether an invalid move is rejected, and if so what the client is told and how it rolls back.
2. What the server does with the clock entries and any partial state the failed move left behind.
3. Whether repeated invalid moves from one client escalate — a counter, a timeout, or ending the game
   after all.
4. Whether one-board variants get the same treatment or keep today's behaviour.

## Capabilities

### New Capabilities

- `bughouse-move-rejection`: what happens when a move reaches the server that the position does not
  allow — who is told, what the board and clocks do afterwards, and when it stops being survivable.

### Modified Capabilities

None.

## Impact

- `server/bug/utils_bug.py` — the `except SystemError` path that sets `invalid_move`.
- `server/bug/game_bug.py:287-291` — where `INVALIDMOVE` and the result are set, and `save_game()` is
  called.
- `client/two-board/round/roundCtrl.ts` — would need a rollback path that does not exist today.
- Python gates for any server change; frontend gates for the client half.

## Blocked on

`bughouse-clock-record-investigation` finding 8 and its siblings: every known way an invalid move can
be produced should be fixed FIRST, so that this change is about the response to a genuine fault
rather than a workaround for a race we already know how to remove.
