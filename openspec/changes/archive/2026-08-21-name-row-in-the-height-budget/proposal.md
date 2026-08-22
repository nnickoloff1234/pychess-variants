## Why

Three things about the same strip. The first is the row the username gets when it leaves the strip;
the second is how big the username is drawn in either place; the third is what the clock does with
whatever is left.

### 1. The strip's one fixed term was misdiagnosed

This change began by treating a username folded inside the strip at 100% zoom as a defect, and
proposed buying it a row by shrinking the board. **That was wrong about the intent.** Folding the
name into the strip at full zoom is what the desktop is supposed to do — Nikolay's call, and the
capability already said so: the own-line arrangement is ordinary, "the exception is a board at or
near full zoom, where the stack is already the full height it is given and there is no room to
spend. There the strip keeps its single row." Nothing needs to buy that row, and the boards keep
their full size.

What the investigation did turn up is worth keeping, because the strip really did have one fixed
term in it — just not where this change first looked.

**The rating draws nothing.** `.bug rating { display: none }` (`bughouse.css:1127`) matches every
seat, since `main.bug.round` is an ancestor. The element is there and even holds text —
`<rating>1500?</rating>` — but its box is 0x0. The proof that it costs nothing: on p4's own seat
`<player>` is 179.9px wide and `a.user-link` is 179.9px, identical to the decimal, with no gap and
no remainder. `main.bug.round rating { font-size: 0.7vw }` (`bughouse.css:1741`) is dead code
sitting on a hidden element, and the 2.702px it computes to was never on screen.

**The constant is a padding.** Measured on p4:

| seat | square | content height | content / square | box / square | box - content |
|---|---|---|---|---|---|
| own | 48.25 | 24.06 | **0.4987** | 0.5816 | **4.00** |
| partner | 20.67 | 10.35 | **0.5008** | 0.6944 | **4.00** |

The proportional part was always proportional — 0.4987 against 0.5008, equal to three decimals. The
drift from 0.34 to 0.44 that this change was built on is `.player-data { padding: 2px 6px }` from
`site.css:1664`: exactly 4.00px on both seats, computed `2px` top and `2px` bottom. One inherited
constant, in one declaration, that the bughouse rules already override horizontally and not
vertically. It goes, and then the strip has no fixed term left anywhere in it.

### 2. The name is sized by its board, which is the wrong thing to size it by

`--bug-name-fs` is `calc(var(--bug-seat-sq) * 0.218)`, doubled when the name is outside the strip
(`bughouse.css:2239`), then multiplied by the `0.8em` `.user-link` inherits below 800px. A board is
not a reader. What comes out, measured against the size a single-board round page uses:

| where | single-board | bughouse today | |
|---|---|---|---|
| p3, 1276 wide | **16.8px** | 11.92px | too small — the name is 116.5 in a 218.7 slot |
| p4 own seat, 386 wide | **16.8px** | 16.74px | at the cap only by accident, via the doubling |
| p4 partner seat, 386 wide | **16.8px** | 7.21px | too small, on a row 165.3px wide it does not use |

The single-board figure is measured, not derived: `round-player0 { font-size: 1.2em }`
(`site.css:2153`) over an `html` of 14px, probed on the live page at 1276 wide — 16.8px computed,
`line-height: 50px`. That size is readable and is what every other variant on this site uses. It is
the right ceiling, and a board's square has no business setting it.

The partner seat is the case that shows the rule is wrong rather than mistuned. Its name sits on a
row 165.3px wide with nothing else on it, and is drawn at 7.21px — because its board is small, in a
place where the board's size is not what constrains anything.

### 3. The clock does not grow into the room the name is not using

| | strip | pocket | space after the pocket | clock box | unused |
|---|---|---|---|---|---|
| p4 own, name **outside** | 386 | 192 | 194 | 65.1 x 19.2 | **129 x 30** |
| p3 own, name **inside** | 437.3 | 218.7 | 218.7 | 105 x 31.7 | **113.7 x 5** |

`.clock-wrap` does stretch — 194 and 218.7 respectively. It is the digits that do not:
`--bug-clock-fs` is `calc(var(--bug-seat-sq) * 0.2)`, so the clock is sized by the board and is
blind to the room it is standing in. When the name leaves the strip entirely, the clock inherits a
whole row's worth of space and ignores it.

## What Changes

- **The username is capped at a constant, not scaled from a square.** One value everywhere —
  `16.8px`, the size a single-board round page draws a username at — and the name grows *up to* it
  when there is room. The `* 2` on the popped-out name goes: a doubling has no defence once there
  is a ceiling.

- **Where there is not room, the name gets smaller, and then it truncates.** Squeezed inside the
  pocket-and-clock strip it may be drawn below the cap, down to a floor no lower than what today's
  rule already produces there. If it still does not fit on one line at that size, it is truncated —
  it is never wrapped.

- **The username and its rating are one sized unit.** They are already siblings inside `<player>`;
  the size rule goes on that box rather than on the link, so that when bughouse ratings exist they
  follow the name without a second rule to keep in step.

- **The clock takes the room the pocket and the name leave, and its digits grow into it.** Priority
  is stated once and holds in both arrangements: the pocket is never reduced; then, if the name is
  outside the strip, the clock has everything else; if the name is inside it, the name has the full
  width the pocket leaves and the clock takes the height that remains, on its own line above or
  below.

- **The 4px padding is neutralised on this page**, so the strip has no fixed term left in it and
  the name's line is a line box and nothing else.

- **The placement decision is left alone.** `seatNamePlacement` measures whether a seat has spare
  height and gives the name a line when it does. Since no room is being reserved, its answer still
  varies with zoom in every mode and it keeps measuring — verified on the page: the name takes its
  own line at 90% and folds into the strip at 100%, per seat.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: how a username is sized and what happens when it does not fit; what the
  clock does with the space the pocket and the name leave; and that a strip above its board is laid
  out as the mirror of one below it.

Four requirements already in that capability contradict this work and are modified rather than
added to. Two of them were contradicted by code that is **already written**, in section 3b of the
tasks, and the contradiction was never recorded:

- **"A seat's furniture is sized from its own board"** names the username among the things sized
  from the board. The cap is exactly the opposite claim for text, and the exception has to be
  written into that requirement rather than left to collide with it.
- **"The seat strip apportions its width by priority"** puts the clock second at its natural width
  and gives the username what is left between the pocket and the clock. The new order puts the name
  second and the clock last.
- **"The clock is anchored and sized to the strip"** has the clock take its *natural* width, and has
  a username re-wrapping when a clock crosses into tenths. Neither survives the name having a line
  of its own.
- **"The username is legible, and truncated rather than reflowed"** mandates **two** lines, breaking
  at the character rather than the word, and **no ellipsis**. Section 3b implemented one line with
  an ellipsis and measured it in all three modes. The requirement is now written to say what was
  built, and the reason it is better is recorded with it.

One thing that requirement already had right is kept unchanged: sizing must not be a fraction of the
viewport width, "because the bughouse round page is routinely used in a window narrow enough for such
a value to fall below legibility". The rating's dead `0.7vw` is the very rule it was written against.
It also already states the floor this change needs — a name no smaller than the board's coordinate
labels — so the floor is not invented here, only inherited.

## Impact

- `static/bughouse.css` — `--bug-name-fs` and its `0.218`; the `* 2` on the popped-out name;
  `--bug-clock-fs` and its `0.2`; `.player-data`'s inherited vertical padding; a container context
  on the name's slot and on the clock's.
- `client/two-board/squareUnit.ts` — **not touched.** An earlier draft would have subtracted a
  reserved row from the height before dividing; nothing is reserved, so the divisor stays 10.
- `client/two-board/round/seatNamePlacement.ts` — **not touched**, for the same reason: with no room
  reserved its answer still varies with zoom, which is what it is for.
- **No TypeScript changes at all.** This change is entirely `static/bughouse.css`. The `client/`
  edits in the working tree — `squareUnit.ts`, `round.ts`, `roundCtrl.ts` and the rest — belong to
  earlier changes on this branch and predate it; nothing here touched them.
- No server change; frontend gates only.

## What this no longer costs

An earlier draft priced a reserved name row at about 5% of the board — 608px down to 576px on an
827px-tall viewport, paid at every zoom to buy an arrangement only reachable near 100%. That is not
being built. **The boards keep their full size**, and the only sizes this change moves are the
username's, the clock's, and 4px of padding.
