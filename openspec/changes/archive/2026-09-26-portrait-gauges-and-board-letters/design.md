## Context

**Portrait has no spare pixels in either axis.** Measured on the harness's portrait tile (386x835
CSS, 19.5:9) with the analysis page on game `JJgZzLhJ`, 2026-08-29:

| element | rect | note |
|:--|:--|:--|
| viewport | 386 x 835 | |
| `.analysis-app.bug` | 384 x 835 | grid rows `355.302px 480.031px` — sums to 835.33 |
| own stack | 384 x 480 | strip 48 + board 384 + strip 48, exactly |
| own square | 48.004px | 8 x 48.004 = 384.03 = the whole app width |
| partner stack | 165 x 207 | at `align-self: start` in the 355px row |
| partner square | 20.672px | |
| tools column | 219 x 355 | beside the partner stack |

Two consequences follow directly and both bound every option below.

**There is no horizontal room.** The own stack is its eight squares and nothing else. The landscape
arrangement adds a gauge column of `--bug-stack-sq * 0.31`; here that is 14.9px, taking the stack to
398.9px in a 386px viewport. The partner row is equally full: 165 + 219 = 384.

**There is no vertical room in the own board's row**, which is already exactly ten square-rows.
Adding a horizontal gauge band above or below it makes the stack taller than the row, and portrait
is PINNED to the viewport — the layout cannot absorb it.

**There is one pocket of free space**: the partner stack is 207px tall in a 355px row, so ~148px
sits unused below the partner board and left of the tools column. It is free for the partner board
and useless to the own board.

**Why portrait dropped the gauge in the first place**, recorded in `bughouse.css`: the stack is
otherwise 8.31 squares against an app of 8, and the partner's gauge measured 6.2px wide at this
size — unreadable as a bar. The evaluation is a number in the Moves tab regardless. That reasoning
is still sound; what has changed is that the letter went with it, and the two PV columns now depend
on the reader knowing which board is which.

**The square unit is not free to shrink.** Per the round page's rule, a board's unit is a whole
number of device pixels per square, published and multiplied by the file count. Taking 14.9px out
of the own board to make a gauge column means re-quantising that unit, which is a real cost to the
board and has to be stated as one rather than absorbed quietly.

## Goals / Non-Goals

**Goals:**

- A reader in portrait can tell which board is A and which is B, without opening a tab.
- A reader in portrait can see how each board stands at a glance, in the same visual language as
  landscape if that is affordable and in a stated alternative language if it is not.
- Neither addition changes the size of either board. If one must, the trade is decided explicitly
  and written down.
- The letter and the gauge are decided TOGETHER. They were coupled by placement in landscape, and
  splitting them here is what produced the current gap.

**Non-Goals:**

- Changing either landscape mode. They are the reference.
- Changing the round page, which has no gauge in any mode.
- Making the gauge interactive, or adding any second evaluation readout beyond what the engine
  panel already shows.
- Deciding the PV columns' portrait order. Related and open, but a separate question.

## Decisions

Nothing is decided yet. This change exists to choose between the shapes below, and each is written
with the measurement that decides it.

### Option A — the landscape arrangement, shrunk to fit

A vertical gauge column beside each board, letter underneath, exactly as landscape does it.

Costs 14.9px of width on the own board and 6.4px on the partner's. The own board's square would go
from 48.004px to about 46.2px, a 3.7% loss, and would have to be re-quantised rather than simply
scaled. The partner gauge lands at 6.4px wide, which is the width the original portrait decision
already rejected as unreadable.

Cheapest in code — the placement rules already exist and would just stop being suppressed. Most
expensive in board size, and it reintroduces the exact bar width that was rejected before.

### Option B — horizontal gauges above and below the boards

Turn the bar 90 degrees and run it across the board's width, in a band of its own.

Costs height rather than width. For the own board there is no height: its row is exactly ten
square-rows in a viewport-pinned layout, so a band of even 6px forces the square down. For the
partner board there IS height — about 148px unused below it — so a horizontal band under the
partner board is genuinely free, and only the own board's band has to be paid for.

Needs work in `drawEval()`: the gauge is filled along its vertical axis today, and a horizontal bar
fills along the other one.

Note the asymmetry this creates: the partner board could have its gauge for free while the own
board could not. A design that gives one board a gauge and the other none is worse than giving
neither, so the own board's band decides this option.

### Option C — overlay, costing no layout at all

Place the gauge and the letter ON the board — a thin translucent bar along one edge, the letter in a
corner square. Costs zero width and zero height, which is the only way to add either without taking
something from the boards.

The cost moves to legibility: the bar sits over squares that carry pieces, and the letter sits in a
corner a piece can occupy. Both would need to be dim enough not to be read as part of the position
and visible enough to be worth having, which is a real tension rather than a tuning detail.

### Option D — letter only, no gauge in portrait

Accept the original portrait decision on the gauge and fix only the identity gap, which is the half
the PV columns actually depend on. A letter is small enough to fit where a bar is not: it can sit
inside the player bar of the seat strip, which already carries text, or in the pocket row's spare
end on the partner stack.

Cheapest of all and honest about the constraint. Leaves portrait without a visual evaluation, which
the Moves tab covers with numbers.

## Risks / Trade-offs

- **[Any option that takes width or height shrinks a board, and the boards are the page]** → Decide
  the trade explicitly and record the measured square before and after. A board that quietly got
  3.7% smaller to make room for a 6px bar is a bad trade made invisibly.
- **[Option A reintroduces a 6.4px partner gauge, already judged unreadable]** → If A is chosen,
  say what changed about that judgement, or give the partner board a different treatment from the
  own board and accept the asymmetry deliberately.
- **[Re-quantising a square unit is not a scale]** → The unit is whole device pixels per square
  times the file count. Any option that changes it has to go through that arithmetic, not through a
  percentage.
- **[Portrait is pinned to the viewport, so an overflow does not scroll — it clips]** → Whatever is
  chosen, verify `document.documentElement.scrollWidth === innerWidth` and the app's bottom against
  the viewport afterwards. The first version of the board letter failed exactly here: placed at
  `grid-column: 2` in a one-column stack it landed at x=388 in a 386px viewport.
- **[A gauge and a letter decided separately drift apart again]** → They are one change here. The
  current gap exists because the letter inherited the gauge's placement and then the gauge's
  absence.

## Open Questions

- Which option, and is it the same option for both boards? The partner board has free height and
  the own board does not, so the honest answer may be asymmetric.
- If a board must shrink, which one and by how much — and is the re-quantised unit still a whole
  number of device pixels?
- Does the letter need the gauge at all? Option D says no, and it is the only option that fixes the
  PV-column problem without touching a board's size.
- Should the PV columns stack in portrait to match the boards' top/bottom arrangement? Out of scope
  here, but the answer changes how much work the letter has to do.
