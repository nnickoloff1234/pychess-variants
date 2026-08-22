## Context

The merged column already exists and works in both landscape modes: `.bug-right-column` is a grid
of `stack | parts`, `.bug-partner-stack` groups the partner board with its two strips at content
height, `.bug-parts` is `display: contents` so each part is placed individually, and
`toolsPlacement` toggles `drop-tablist` / `drop-p2` / `drop-p1` to move parts under a shrunken
board, full width.

Portrait opts out of all of it: both containers are `display: contents`, `.bug-parts` is a flex
column in a `tools` grid area, and the app is a two-column grid whose second column is that area.
The result is a 165x175 cell that nothing can reach.

The client already builds the same DOM for every mode — `round.ts` emits the wrapper, the stack and
the parts unconditionally — so this is entirely a stylesheet change.

## Goals / Non-Goals

**Goals:**
- Portrait uses the merged column, with parts dropping under the partner board by the shared rule.
- The own board stays full width at the bottom.
- The rules common to all three modes are stated once.

**Non-Goals:**
- Changing the landscape modes' appearance. They are the reference; if they move, something is
  wrong.
- Portrait's own sizing. `--bug-portrait-sq` and `--bug-portrait-partner-sq` keep their meanings,
  as do the per-seat units and the rotated pockets.

## Decisions

### 1. Portrait's app grid becomes one column

```
'rightcol'      the merged column: partner stack + parts
'clock-top'
'board'         the own board, full width
'clock-bot'
'toolsB'
```

The two-column app grid exists only to put the tools beside the partner board; once the merged
column does that internally, the app has nothing to put side by side. One column also makes "the
own board is full width" structural rather than something each area has to spell out.

### 2. Share by hoisting, not by copying

Everything the three modes agree on moves to the top level: `display: grid`, the row template, the
areas, `overflow: hidden`, `row-gap: 0`, `.bug-partner-stack { grid-area: stack; align-self:
start }` and `.bug-parts { display: contents }`. Each mode then states only
`grid-template-columns` and its gap.

This is the reuse the change is for. The risk of hoisting is that a rule which looked common turns
out not to be — so the landscape measurements are the check: they must come out unchanged to the
pixel.

### 3. The drop mechanism needs nothing new

`toolsPlacement` measures `.bug-right-column`'s client height and the stack's height, and toggles
classes on the column. In portrait the column will be the `rightcol` row, the stack the partner's,
and the classes will finally have a grid to act on. The area templates for the dropped states are
already top-level.

## Risks / Trade-offs

- **Portrait's rotated pockets and per-seat units are keyed to `.partner-seat`**, not to grid
  areas, so they should survive the stack becoming a real box — but the partner strips currently
  resolve `clockB-top` / `clockB-bot` against the app grid, and inside a block-flow stack those
  names become inert. That is what already happens in landscape, where the strips simply stack, so
  the expectation is the same; it needs looking at rather than assuming.
- **The `.` cell disappearing changes portrait's vertical arithmetic.** The old rows summed to the
  viewport with a 175px slack row carrying the difference; the new template has to reach the same
  total without it, or the own board moves.
- **One mode's regression is invisible from another.** Three modes now share these rules, so a
  change made for portrait can move landscape. Every step is measured in all three.

## Migration Plan

1. Hoist the shared rules, changing nothing else. Landscape must measure identically.
2. Switch portrait's app grid to one column and drop its `display: contents` pair and `.bug-parts`
   flex block.
3. Give portrait its column widths, then verify the drop behaviour by reducing the partner board.

## Open Questions

- Does portrait want the same drop order — tab bar first, then presets — or does a phone want the
  presets closer to the board?
- Should the merged column in portrait be height-bounded like landscape's, or take what it needs
  and let the own board have the rest?
