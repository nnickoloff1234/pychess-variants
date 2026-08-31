## Why

**POSTPONED, deliberately.** Split out of `bughouse-clock-record-investigation` (task 6.4) on
2026-08-30 so the work is not lost, not because it is ready to start.

Every ply of a bughouse game records **four** clock values and only **one** of them means anything.
A move message is built in `roundCtrl.sendMove()` from all four seats' `Clock.duration`, but
`duration` on a RUNNING clock holds the value at its last start, not what is on screen. So the seat
thinking on the other board is recorded as it was when its turn BEGAN. Measured on `sLF5O6kj`:
`cbB` read 59:59.958 for a seat that had been thinking **447 seconds**, and rose by 1ms between two
plies — a clock going up in a game with no increment. Across a disconnect it is worse.

The investigation established two things that make the deletion possible, and one that makes it
unnecessary to rush:

- **Nothing authoritative reads them.** `update_clocks()` runs before `push(move)`, so only
  `last_move_clocks[board][mover]` — the mover's own seat on the mover's own board — reaches
  anything that can run a clock. `restart()`, `get_clocks_for_board_msg()`, the flag stopwatch, the
  round page and `movetimeChart` all read authoritative values only.
- **The one consumer that treated them as fact is fixed.** `analysisClock.reconstructMainlineClocks()`
  derives all four clocks at a recorded ply from the movers' authoritative entries alone, using the
  no-increment invariant, and agrees with the independent `ts` route within ~50ms over 52 plies.
- **So the extra three are inert diagnostics.** Nikolay's call: *"just storing them is good, we can
  cross-check and investigate discrepancies later."* They stay until someone deliberately removes
  them, and deprecation comments now mark every site so nobody starts reading them meanwhile.

## What Changes

Reduce what is sent and stored per ply to the only number that means anything — the mover's own
clock — and delete the other three. Mostly deletion; the reader already ignores them.

- `client/two-board/round/roundCtrl.ts` — `sendMove()` stops building `msgClocks`/`msgClocksB` from
  all four seats.
- `client/messages.ts` — `MsgMove` and `Step` lose the four-value shape.
- `server/bug/game_bug_clocks.py` — `ply_clocks` stops appending both boards' pairs on every ply.
- `server/bug/game_bug.py` — `steps[].clocks`/`clocksB` follow.
- `server/bug/utils_bug.py` — `load_game()` reads whatever the new shape is, while still reading
  every OLD document correctly. This is the part that needs design, not typing.

**Old documents keep four values and must keep reading correctly** — that is the constraint that
makes this more than a delete. Every game in the database predates the change, and the analysis page
already derives what it displays, so the read path has to serve both shapes.

## Capabilities

### Modified Capabilities

- `bughouse-clock-record`: what is recorded per ply. The capability's meaning does not change — the
  record still describes each seat's clock at each ply — but what is STORED to support it shrinks to
  the mover's value, with the rest derived.

## Impact

- Storage shape changes. No migration is proposed: old documents stay as they are and the reader
  handles both.
- `bughouse-clock-record-investigation` (archived 2026-08-30) holds the evidence: `data.md` for the
  re-derived tables, `stress-tests.md` for the S1-S11 suite, and the three fixtures.
