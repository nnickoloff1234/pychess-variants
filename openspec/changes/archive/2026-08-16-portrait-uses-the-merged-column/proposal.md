## Why

Portrait cannot put anything under the partner board, and there is a measured hole where it should
go. In p4 at 367x835 the app grid is:

```
'clockB-top    tools'      cols: 165.333px 202px
'boardPartner  tools'      rows: 20.67 / 165.33 / 20.67 / 175.33 / 45.33 / 362.67 / 45.33 / 0
'clockB-bot    tools'
'.             tools'      ← the dot is 165.3 x 175.3 of nothing, at (0, 206.7)
'clock-top     clock-top'
'board         board'
'clock-bot     clock-bot'
'toolsB        toolsB'
```

The presets are squeezed into a 202px column while 165x175 sits empty immediately to their left,
directly under the partner board.

Two reasons, and neither is a bug:

- `tools` is a **column-2-only area**. Every part is a flex child of `.bug-parts` inside it, so
  nothing in that box can reach column 1. "Under the board" is unreachable from where they live.
- The landscape mechanism is **inert here by design**: `.bug-right-column` and
  `.bug-partner-stack` are `display: contents` in portrait, so the merged column does not exist,
  its areas do nothing, and the `drop-tablist` / `drop-p1` / `drop-p2` classes that
  `toolsPlacement` toggles have nothing to act on.

Portrait was an explicit non-goal when the merged column was built. Having seen it work in both
landscape modes, the same structure is wanted here — and the differences turn out to be small
enough that most of the rules should be shared rather than written twice.

## What Changes

- **Portrait adopts the merged column.** The partner board's stack and the tools parts share one
  container, exactly as in both landscape modes, and the parts drop under the partner board by the
  same measured rule rather than by a portrait-specific one.

- **The main board stays at the bottom, full width.** That is the one thing portrait keeps: the
  merged column occupies the region above it, and the app grid becomes a single column of
  rightcol / clock-top / board / clock-bot / toolsB.

- **The shared rules move out of the per-mode blocks.** What all three modes now agree on — the
  merged column being a grid, its rows and areas, the stack taking its content height, the parts
  dissolving into it — is stated once. Only the two column widths and the gap stay per mode.
  **BREAKING** for the requirement that portrait keeps its own single-column-plus-tools
  arrangement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: "Landscape is two columns, and the tools belong to the second" and "The
  tools are placed as parts, not as a panel" stop being landscape-only; portrait's own requirements
  about fitting the viewport and sizing both boards from the viewport are unaffected in intent but
  need to hold against the new structure.

## Impact

- `static/bughouse.css` — the portrait block loses its `display: contents` pair, its `.bug-parts`
  flex block and its two-column app grid; the merged-column rules common to all three modes move
  to the top level.
- `client/two-board/round/toolsPlacement.ts` and `seatNamePlacement.ts` already run in all modes
  and already toggle their classes there; portrait simply starts responding to them.
- No client structure changes: `round.ts` already builds the wrapper, the stack and the parts for
  every mode.
