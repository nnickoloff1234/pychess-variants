## Why

A board can now be resized independently of its partner, and its furniture does not follow it.
Measured in p1 with the right board at 35% zoom, against the left at 100%:

| | own board (100%) | partner board (35%) |
|---|---|---|
| board | 608, square 76 | 208, square 26 |
| strip height | 76 — one square | **76 — 2.9 squares** |
| clock | 136.7 × 60, 15.2px | **136.7 × 60, 15.2px — identical** |
| username width | 91.3 | **5.8** |
| pocket | 380 (5 squares) | 130 (5 squares) |

The clock is the worst of it: it does not resize at all. The same 136.7px box sits beside a 208px
board, taking 70% of the board's entire width, and it is what crushes the username to 5.8px —
a name rendered in a space narrower than one of its characters.

The strip is the cause. Its height and both font sizes come from `--bug-tall-sq`, the layout's
global square, which is derived from the viewport and knows nothing about either board's zoom. So
every seat gets the furniture of a full-size board however small its own board has become.

The pockets are the exception that shows what right looks like: they are sized from the measured
board, so they do scale — 5 squares wide on both boards. What spoils them is the strip around
them, 2.9 of their own board's squares tall, leaving the pocket floating in dead space.

There is also room being wasted. When a board is small its stack is short, so there is vertical
room going spare in the column — and the username is being crushed horizontally while that room
sits unused directly above and below it.

## What Changes

- **A seat's furniture is sized from its own board, not from the layout's global square.** The
  strip height, the clock and the username all scale with the board that seat is playing on. At
  full zoom nothing changes — the current appearance *is* the full-zoom appearance — and below it
  everything shrinks together.

- **The clock scales.** **BREAKING** for the existing scenario "Clock scales with the square unit",
  which ties it to a unit derived from the viewport. It becomes the seat's own scale, so two
  boards at different zooms get different clocks.

- **The pockets keep scaling as they do**, and the rule is stated rather than left implicit: a
  pocket is a fixed number of its own board's squares. The exact number is not fixed across modes
  and this change does not fix it — 5 squares here, 4 in short landscape — only that it is
  measured in the squares of the board it belongs to.

- **Where there is vertical room, the username gets its own line.** The strip may place the name
  above or below the pocket and clock instead of between them, so it renders on one line at a
  legible size. This applies only where the stack has room to grow; where it does not, the strip
  keeps its single row and the name goes on absorbing what is left, as now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: "The clock is anchored and sized to the strip" changes what the clock's
  size is derived from; "The seat strip apportions its width by priority" gains the case where
  the name takes its own line; a new requirement states that a seat's furniture scales with its
  own board.

## Impact

- `static/bughouse.css` — the `min-height: 600px` landscape block, which sets `--bug-strip-h`,
  `--bug-clock-fs` and `--bug-name-fs` from `--bug-tall-sq` for both seats alike. Portrait already
  does the per-seat thing with `--bug-seat-sq` and is the pattern to follow.
- The role classes `own-seat` / `partner-seat` already distinguish the two seats, and `markRoles()`
  keeps them correct through a board switch, so no new source of truth is needed.
- The board row in the merged column is sized `calc(... * 8 * max(scaleA, scaleB))` and the strip
  rows from `--bug-strip-h`; both assume a single strip height, and a name on its own line makes a
  strip taller than one square.
- Short landscape and portrait must be unaffected: short landscape has no zoom factor at all, and
  portrait already scales per seat.
