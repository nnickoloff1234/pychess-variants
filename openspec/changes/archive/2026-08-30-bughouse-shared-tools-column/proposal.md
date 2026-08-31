## Why

The analysis page is meant to be laid out by the same rules as the round page, differing only in
what it puts in the layout: smaller clocks, two eval gauges, the board letters, and its own set of
tabs. Two symptoms say it does not:

- **Short landscape.** The round page lets the tools reach the full width left over once both boards
  are drawn. The analysis page's tools sit in a 255px column and the app leaves 45px unused at each
  edge.
- **Portrait.** The round page's tab bar spans the whole width under the boards once the partner
  board is small enough to leave room. The analysis page's tab bar stays in its column, with **148px
  of dead space** beside it under the partner board.

**The surprise, and the reason this change is narrow rather than a rewrite: the grids are already
identical and already shared.** Measured on p3 (1276x551): both pages state
`grid-template-columns: calc(sq * 8) minmax(0, max-content)` at app level and
`calc(sq * 8) minmax(0, 20vw)` inside `.bug-right-column`. The analysis page's tools column really is
20vw = 255.198px, exactly as the round page's is. Nothing about the skeleton diverges.

What diverges is **the inside of the tools column**. The round page splits it into parts placed in
named grid areas, and `client/two-board/round/toolsPlacement.ts` measures whether a part can leave
the strip beside the board — where it then SPANS both tracks, board width plus tools width. The
analysis page has a single `.bug-parts` block occupying one `tools` area, so nothing can ever leave,
and the space under a short partner board is unreachable by construction.

## What Changes

- The analysis page's tools column is decomposed into parts that can be placed individually, as the
  round page's already is.
- `toolsPlacement.ts` becomes shared between the two pages rather than living under `round/`, and
  drives both.
- The analysis page's `.bug-right-column` states the same arrangements the round page's does, so a
  part that drops spans both tracks.
- **No change to the app-level or column-level tracks.** They are already the same on both pages and
  are not what is wrong.
- The three permitted differences stay differences and are stated as such: the gauge width in the
  stack track (`* 0.31`), the clocks, the board letters, and which tabs exist.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: states that the tools column's ARRANGEMENT — not merely its tracks — is
  shared by both two-board pages, and that a part which cannot fit beside the partner board moves
  under it and takes the full width on either page.

## Impact

- `client/two-board/round/toolsPlacement.ts` — moves to a shared location and stops naming only the
  round page's parts.
- `client/two-board/analysis/analysis.ts` — the tools panel is built as parts rather than one block.
- `static/bughouse.css` — the analysis page's `.bug-right-column` areas; the shared arrangement rules
  stop being scoped to the round page.
- No server change, no Python gates.
