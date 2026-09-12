## Why

A bughouse game now survives a server restart with its moves, its pockets and its clocks
(`bughouse-persist-moves-as-played`). Two things about a restored game are still wrong, both found
while verifying that change and both deliberately left alone at the time so a working restore could
land. They are recorded here rather than archived with it, because an archived change is a record of
what was done and these are things that were NOT done.

Neither is severe. Both are the kind of small wrongness that costs an afternoon later, when someone
meets the symptom without knowing the cause.

**The board comes back with no last-move highlight.** A restored game renders the right position on
both boards, with the right pockets and the right clocks, and no indication of which move was just
played. The restore path never sends a per-board `lastmove`. For a player it is a missing cue at the
exact moment they most need it — they have just been reconnected and have to work out what happened
while they were away. It also misleads the harness: `PB.myNextMove()` locates its place in a scripted
line by reading that highlight, and after a restart it proposed `e2e4` into a position where e2 was
already empty.

**A restart drops in-memory state that is not in the document, and one piece of it changes
behaviour.** `lastmovePerBoardAndUser` is the map `play_move()` consults to ignore a move a user has
already made. It lives only in memory, so a move resent in a reconnect payload after a restart no
longer takes the quiet "already played" path (branch 1.2.3.2 of the reconnect tree) — it reaches the
engine, is refused because the position already contains it, and the server resyncs that client
instead (branch 1.2.3.4). Both endings are correct and the client ends up in step either way, which
is why scenario T6 passes; it is only harmless because a refused move no longer ends the game.

A pending `draw_offer_team` or `resign_offer` is dropped the same way, and that one is NOT harmless
in the same sense: the offer vanishes server-side while the client that made it, and the client that
was asked, may both still be showing it. Nobody is told it is gone.

## What Changes

- A restored game SHALL carry each board's last move, so a reconnecting client can show it.
- Decide, per piece of dropped state, whether it is restored, rebuilt, or explicitly abandoned —
  and where it is abandoned, whether the clients are told rather than left showing something that
  no longer exists.
- `lastmovePerBoardAndUser` is REBUILDABLE from the move list at load time, which would put a
  resent move back on branch 1.2.3.2 and remove the restart-dependent branch change.

## Impact

- `server/bug/utils_bug.py` — `load_game_bug_from_doc()`, which already walks every ply and so
  already holds both facts it would need.
- Possibly `server/bug/game_bug.py` for the offer state, if it is to be restored rather than
  abandoned loudly.
- The reconnect decision tree in `client/two-board/socket/reconnectController.ts` records the
  1.2.3.2 / 1.2.3.4 asymmetry today; rebuilding the map would let that note say "and now it does
  not" instead.

## Capabilities

- `bughouse-clock-record`
