## Why

The bughouse analysis page has two engine switches, one per board, and they are mutually exclusive:
ticking one unticks the other. A reader who wants to know how both boards stand has to toggle back
and forth and hold one number in their head — on a page whose whole point, since the layout rework,
is that the two boards are side by side and comparable.

**The engine itself is not broken.** Verified live on 2026-08-23 against game `JJgZzLhJ`, both boards
evaluate correctly and Fairy-Stockfish has the bughouse variant loaded from `variants.ini` rather
than falling back to chess — both principal variations contain drops:

| board | eval | depth | principal variation |
|:--|--:|:--|:--|
| A | 13.8 | 18/18 | `5...P@f7 6. Qg3 Nf6 7. Ne2 d5 8. d4 Bd7 …` |
| B | -9.0 | 15/18 | `12...e5 13. Nd3 P@g2 14. Rg1 Qh4+ …` |

So this is not a repair. It is one switch where there are two, and one engine serving both boards.

## What Changes

- **One switch replaces two.** `renderPanel()` draws `#input` and `#inputPartner`; `renderInput()`
  makes them exclusive by unticking the other and clearing the panel. Both go, along with the
  `boardA.localAnalysis ? boardA : boardB` idiom that reads "whichever one is on" — it appears in
  five places and none of them survive a world where both are on.
- **The engine alternates between the two positions in slices.** `position fen A` + `go movetime T`,
  then the same for B, round and round while the switch is on. Each board's gauge and evaluation
  update on its own slices.
- **The hash is never cleared between slices**, which is what makes alternating cheap rather than
  wasteful — see design. Nothing in the codebase sends `ucinewgame` or `Clear Hash` today, and that
  must stay true.
- **`Hash` is set explicitly.** Nothing sets it now, so two positions share whatever the wasm build
  defaults to. One value for two positions is the one new sizing decision here.
- **A `bestmove` handler is added.** The message loop parses `info`, `uciok`, `readyok` and the
  engine banner, and nothing else — so there is no signal today that a search has finished. A slice
  scheduler needs one; this is the only genuinely new plumbing.
- **NOT a second engine instance.** Parallel evaluation is possible but only that way, and it is not
  proposed — see design decision 2.

## Capabilities

### New Capabilities
- `bughouse-engine-evaluation`: what the analysis page's local engine evaluates, how one engine
  serves two boards, and what a reader is promised about how current each board's number is.

### Modified Capabilities

None. `bughouse-round-layout` covers where the gauges and the tools panel sit; nothing here moves
them. The gauges gain a second live source, which is not a layout change.

## Impact

- `client/two-board/analysis/engine.ts` — the two checkboxes, `renderInput()`, `engineGo()`,
  `engineStop()`, `onMoreDepth()`, the `boardInAnalysis` derivation in the info handler and in
  `pvboxIni()`, and the message loop that needs to learn `bestmove`.
- `client/two-board/common/gameCtrl.ts` — `localAnalysis` is per board controller and is what the two
  switches drive; with one switch it becomes a property of the page, not of a board.
- The eval gauges (`#gauge`, `#gaugePartner`) — both become live at once, which is what the reader
  actually asked for.
- **No server change. No layout change.** The switch that disappears leaves the engine panel one
  control shorter, inside a tools panel that already sizes itself.
