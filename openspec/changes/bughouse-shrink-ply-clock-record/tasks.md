## 0. Status

**POSTPONED. Do not start.** Split from `bughouse-clock-record-investigation` task 6.4 on
2026-08-30. Nothing depends on it: the display is already correct without it, nothing authoritative
reads the values it would delete, and comments at every site warn new readers off. It exists so the
knowledge is not lost.

## 1. Decide before writing anything

- [ ] 1.1 **How `load_game()` serves both shapes.** Old documents hold four values per ply, new ones
      would hold one. Decide whether the reader branches on shape, on a document version field, or
      on the absence of the extra arrays — and write down which, because the analysis page depends
      on it for every game already played.
- [ ] 1.2 **What the message carries.** `MsgMove` currently sends `clocks` and `clocksB` as pairs.
      Decide whether the mover's value travels as a single number or as a pair for its own board
      only, and what the server does if an old client sends the four-value shape.
- [ ] 1.3 **Whether `ply_clocks` survives at all.** `game_bug_clocks.py` already carries a TODO
      saying it duplicates what is in `steps`. If the record shrinks, that duplication may be worth
      removing in the same pass — or may be the only convenient place to keep the mover's value.

## 2. Then implement

- [ ] 2.1 Client: `sendMove()` and the message types.
- [ ] 2.2 Server: `update_clocks()`, `steps[]`, and `load_game()`.
- [ ] 2.3 Remove the deprecation comments left behind in `roundCtrl.sendMove`,
      `game_bug_clocks.update_clocks`, `game_bug.play_move`, `bug/utils_bug.load_game` and
      `messages.ts` — they exist only to hold the line until this change lands.

## 3. Verify

- [ ] 3.1 Re-derive `data.md`'s tables from a game played on the new shape and confirm the analysis
      page still renders four correct clocks at every ply.
- [ ] 3.2 Open one of the OLD fixtures (`JJgZzLhJ`, `PHdCmezP`, `sLF5O6kj`) and confirm it still
      reads correctly — this is the regression that matters most.
- [ ] 3.3 Re-run S1, S3 and S6 from the archived `stress-tests.md`, the minimum after any clock
      change.
