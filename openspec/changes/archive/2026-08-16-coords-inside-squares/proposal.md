## Why

Board coordinates are drawn outside the squares, and the space they hang in is space the tight
layouts do not have.

They are absolutely positioned, placed by four variables that `extensions.css` sets to negative
values at `:root` — `--ranks-right: -15px`, `--files-bottom: -16px` — so the labels sit off the
board's edges. On the bughouse round page that costs a dedicated grid track:

```css
/* Rank labels are absolutely positioned and overhang their board to the right by
   -1 * --ranks-right (15px). With the boards now flush, the left board's labels
   would land on the right board, so one gutter track separates them. */
--ranks-gutter: calc(-1 * var(--ranks-right));
```

And on a phone the labels are not drawn at all — `chessground.css` hides them under
`(max-width: 799px) and (orientation: portrait)`. So the tightest layout has **no coordinates and
still pays for the arrangement that assumes them**.

Drawing them inside the squares frees the gutter in short landscape and portrait, and lets a phone
have coordinates at all.

## What Changes

- **Coordinates are drawn inside the squares** in the modes that are short of width — short
  landscape and portrait. Placement is already fully parameterised by `--ranks-top`,
  `--ranks-right`, `--files-bottom`, `--files-left`, so "inside" is a question of what those hold,
  plus making a label legible against a square instead of against the page.

- **The reserved gutter goes away wherever coordinates are internal**, and only there. That width is
  what this change is actually after.

- **A phone shows coordinates.** They are hidden today because the layout has nowhere to put them,
  which internal placement removes as a reason.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: where coordinates are drawn, and what the layout must reserve for them.

## Impact

- `static/chessground.css` — `coords`, `coords.side`, `coords.bottom`, and the phone rule that hides
  them.
- `static/extensions.css` — the four placement variables, currently negative at `:root`.
- `static/bughouse.css` — `--ranks-gutter` and the tracks that allow for it.
- Every board on the site reads these variables — lobby, analysis, editor, puzzles — so scoping is
  the first design question. `analysis.css` and `embed.css` already override a subset, which shows
  the intended pattern.

## Not in this change

A cap on the secondary board's zoom was proposed alongside this and has been dropped. The
observation it turned up is worth keeping and has been recorded against
`boards-resize-only-on-user-action`, which already owns the scale expression: the tall landscape
partner track is scaled by `--board-scaleB`, board **identity**, while "the secondary board" is a
**role**, and a player seated on board B has board A as their partner. Whether the track follows the
wrong board's zoom is unverified.
