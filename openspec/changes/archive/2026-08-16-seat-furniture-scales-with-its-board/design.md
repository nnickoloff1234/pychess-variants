## Context

Tall landscape sets three strip parameters on `.round-app.bug`, once, for all four seats:

```css
--bug-strip-h: var(--bug-tall-sq);
--bug-clock-fs: calc(var(--bug-tall-sq) * 0.2);
--bug-name-fs: max(calc(var(--bug-tall-sq) * 0.218), 0.85em);
```

`--bug-tall-sq` is the height-derived square published by `squareUnit.ts` — one number for the
page, from the viewport. The two boards then scale independently off it, board A by
`--board-scaleA` and board B by `--board-scaleB`, but the furniture does not scale at all.

Measured in p1 with `standard8x8-zoom-b` at 35, reached by storing the value and reloading rather
than by poking the variable, so the board really did re-render:

| | own (100%) | partner (35%) |
|---|---|---|
| board / square | 608 / 76 | 208 / 26 |
| strip height | 76 = 1 square | 76 = **2.9 squares** |
| clock box, font | 136.7 × 60, 15.2px | **136.7 × 60, 15.2px** |
| username width | 91.3 | **5.8** |
| pocket | 380 = 5 squares | 130 = 5 squares |

The pockets are already right, because they are sized from `--cg-width-b`, which chessgroundx
writes from the board it actually rendered. Everything sized from `--bug-tall-sq` is wrong.

Portrait already solved this. It publishes two units and picks per seat:

```css
.own-seat { --bug-seat-sq: var(--bug-portrait-sq); }
.partner-seat { --bug-seat-sq: var(--bug-portrait-partner-sq); }
```

and then derives `--bug-strip-h`, `--bug-pocket-sq`, `--bug-clock-fs` and `--bug-name-fs` from
`--bug-seat-sq`. The role classes come from `markRoles()` and survive a board switch.

## Goals / Non-Goals

**Goals:**

- A seat's strip, clock and username scale with that seat's board.
- Nothing changes at full zoom.
- The username gets a line of its own where there is vertical room for it.

**Non-Goals:**

- Fixing the pocket's width to a particular number of squares across modes. Five here, four in
  short landscape; the modes differ on purpose and this change only states that the number is
  measured in the board's own squares.
- Short landscape and portrait. Short landscape has no zoom factor in its tracks at all, and
  portrait already scales per seat.
- Changing what the furniture looks like at full size.

## Decisions

### 1. Per-seat units, following portrait

Tall landscape gains the same shape portrait has:

```css
.own-seat { --bug-seat-sq: calc(var(--bug-tall-sq) * var(--board-scaleA)); }
.partner-seat { --bug-seat-sq: calc(var(--bug-tall-sq) * var(--board-scaleB)); }
```

with the three parameters derived from `--bug-seat-sq` instead of `--bug-tall-sq`.

The mapping of role to scale is not arbitrary and is worth stating: `--board-scaleA` is the
**left column's** scale and `--board-scaleB` the right's, and the viewer's own board is always the
one in the left column — that is what `markRoles()` means by own. So own↔A and partner↔B holds
through a switch, because the switch moves the boards between the columns and re-marks the roles.

*Alternative considered:* derive the unit from `--cg-width-a`/`--cg-width-b`, the widths
chessgroundx measured, as the pockets do. Rejected for the strip: those are written *by* a board
that is measured inside the track the strip's height helps size, which is the circular sizing the
layout spec forbids and which has already produced both a collapse to zero and a runaway to
1528px in this file. The scale variables are inputs, not measurements.

### 2. The username's own line is conditional on room, and that condition is not free

The strip is a flex row: pocket, name, clock. Letting the name wrap onto its own line is
`flex-wrap: wrap` plus a full-basis name — trivial. Deciding *when* is the hard half, because the
strip's height is currently exactly one square and its row in the grid is sized from
`--bug-strip-h`; a second line makes the strip taller than the row reserved for it.

Two ways to allow it:

- Let the strip's grid rows be content-sized rather than fixed at `--bug-strip-h`, so a wrapped
  strip simply takes the height it needs and the stack grows. Simple, but it gives up the property
  that a stack is exactly ten squares, which is what makes the full-height rule and the seam-free
  quantisation work.
- Decide it the way `toolsPlacement` decides its arrangement: measure whether the stack can afford
  the extra line, and let a class turn the wrap on. Keeps the ten-square stack as the default and
  spends only room that is genuinely spare.

The second matches the existing machinery and the requirement's wording ("where the stack has room
to grow"). It is also more work, and it should not be started before the scaling half is in and
verified, because the scaling half changes every measurement it would be based on.

### 3. What "no room" must guarantee

Whatever mechanism is chosen, the strip must not push the stack past the column, because the
stack's height is what `toolsPlacement` reads to decide where the tools go. A strip that silently
grew would move the tools as a side effect.

## Risks / Trade-offs

- **The scaling half changes the numbers the second half depends on** → once the strip is one of
  the reduced board's squares tall, the name has *less* height and the same width; whether it is
  more or less legible than today needs looking at, not assuming.
- **A very small board gets very small furniture** → at 35% zoom the clock font becomes about
  5.3px, which is not readable. Proportional is what was asked for, and it is right in the middle
  of the range, but there is presumably a zoom below which the seat should stop shrinking or the
  board should stop being offered. Worth watching for during verification rather than pre-empting
  with a floor nobody has asked for.
- **`--bug-name-fs` already has a floor** (`max(..., 0.85em)`) that does not scale. Under this
  change the floor will bind sooner, and at some zoom the name will be the only part of the
  furniture not shrinking — which may look wrong, or may be exactly what keeps it legible.
- **The `max(scaleA, scaleB)` board row** assumes the two stacks differ only in board height. If
  the strips also differ in height, the row arithmetic that keeps a stack exactly ten squares no
  longer holds for both stacks at once.

## Migration Plan

1. Per-seat units and the three parameters, verified at several zooms in p1, with short landscape
   and portrait confirmed unchanged.
2. Look at the result before deciding the second half: the username's own line is a response to
   the name being crushed, and the first half changes how crushed it is.

## Open Questions

- Is there a zoom below which the furniture should stop shrinking, or is proportional right all
  the way down? At 35% the clock font computes to roughly 5.3px.
- Should the username's floor scale too, or is a fixed floor what keeps a small board's name
  readable at the cost of proportion?
- Which mechanism for the extra line — content-sized strip rows, or a measured class as
  `toolsPlacement` does — once the scaling half has been seen?
