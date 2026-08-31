## Why

The bughouse analysis page still has the layout the round page was rebuilt to escape, and it shows.

Its grid is seven flat columns (`bughouse.css:131`):

```
board A | gauge | pocketA | pocketB | gaugePartner | d | board B
```

The two boards are pinned to the OUTER edges and everything else — both pockets, the movelist, the
engine panel, misc-info — is crammed into the centre gutter between them. A player comparing the two
boards has the whole page between them, and the tools they read while doing it are in a column too
narrow to read.

Three consequences, all visible on `JJgZzLhJ` at 1418x612:

- **The boards do not match.** They are `calc(30vw * var(--board-scaleA))` — width-derived, the model
  the round page abandoned. Measured roughly 420px and 330px side by side, and neither fills the
  height it is given.
- **There is no bughouse analysis layout below 800px at all.** The only `.analysis-app.bug` rule
  lives inside `@media (min-width: 800px)`; anything narrower falls through to `analysis.css`'s
  single-board areas, which name grid areas this page's elements do not all have. Portrait is not a
  layout to adjust — it is one that has never existed.
- **The centre column overlaps its neighbours.** The pocket strips paint behind the boards and the
  eval graph is clipped by the page edge.

The round page already solved all of this. This change brings the same arrangement across.

## What Changes

**The boards go side by side and the tools go to the right**, exactly as on the round page.

Landscape, in order: **board A · its gauge · board B · its gauge · tools panel**. Each eval gauge
moves to the RIGHT of the board it reports on, so it stays attached to its own board rather than
floating in a shared gutter.

**Portrait gets a layout for the first time.** One board above the other, each with its gauge, tools
below. The MAIN board is the bottom one — nearest the thumb — mirroring the round page, where the
main board is the left one in landscape and the bottom one in portrait.

**"Main" means the board you played on.** If the viewer holds a seat, that is their board; a
spectator, or anyone with no seat in this game, gets board A. `TwoBoardController` already builds
`this.seats` from the model, so the page already knows — this is a question it can answer today and
simply never asks.

**Boards adopt the round page's sizing**: the height-derived, device-pixel-quantised square unit
from `squareUnit.ts`. That is what makes the two boards match each other exactly and fill the height
they are given, and it is why `30vw * zoom` is not merely moved but replaced.

**The tools panel becomes a tabbed panel** holding three tabs:

| tab | contents |
|---|---|
| **Moves** | the movelist, the move controls, and the engine — its on/off switches, its name panel, its PV lines and `#misc-info`. All one thing: what you read while stepping through the game. |
| **Info** | the game info currently at bottom-left. |
| **Chat** | `#roundchat`, which exists in the DOM and renders nowhere on the page today. It goes in a tab **so that it becomes visible and can then be judged**, not because its final home is decided. |

The page already has a tab widget (`under-board`: *Move times*, *FEN & PGN*), so this reuses a
mechanism that is already here rather than introducing one.

**Explicitly out of scope**: the eval chart and the FEN & PGN panel keep their existing home in
`under-board` and are not touched. Where they ultimately belong is a separate conversation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: gains requirements covering the analysis page's arrangement — the two
  boards adjacent with the tools beside them, the main board's position per orientation, and the
  gauges' attachment to their own board. The layout rules this spec already states for the round
  page become rules the two pages share.

## Impact

- `static/bughouse.css` — the `.analysis-app.bug` grid, replaced rather than adjusted, plus a
  portrait block that has no predecessor.
- `client/two-board/analysis/analysis.ts` — the element tree: boards grouped with their gauges, the
  tools panel built as a `TabbedPanels`, the movelist/engine/move-controls/misc-info moved into it,
  game info and chat moved out of `leftSide`.
- `client/two-board/squareUnit.ts` — reused as-is if the analysis page's stack composition matches
  the round page's; extended if it does not. No second unit is introduced.
- `markRoles()` currently lives in `client/two-board/round/roundControls.ts` and is round-only. The
  main-board rule needs the same marking here, so it moves to shared two-board code rather than
  being written twice.
- No server change. No message shapes change.
- Risk worth stating up front: the analysis page puts clocks INSIDE `selection#mainboard` via
  `clockView.topPlaceholder()`, where the round page has seat strips as siblings of the board. The
  round page's stack is strip/board/strip in block flow, and its sizing assumes exactly that. Whether
  the analysis stack can be the same shape, or needs its own row arithmetic, is the first thing
  implementation has to establish.
