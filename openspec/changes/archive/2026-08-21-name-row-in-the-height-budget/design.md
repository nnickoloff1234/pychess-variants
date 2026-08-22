## Context

`squareUnit.ts` divides the available height by a row count:

```ts
const ROWS_IN_SHORT_LANDSCAPE = 10;
style.setProperty(TALL_LANDSCAPE_PROPERTY, `${squareUnit(stackHeight, ROWS_IN_SHORT_LANDSCAPE, dpr)}px`);
```

Ten rows: eight of board, one per seat strip. The strip is therefore exactly one square tall, and a
name that wants a line of its own has nowhere to take it from. `seatNamePlacement` compares the
stack against the space and refuses — correctly, since at 100% zoom the stack IS the column.

Inside the strip, the sizes are all derived from that seat's square:

```css
--bug-seat-sq:   calc(var(--bug-tall-sq) * var(--board-scaleA));   /* one seat */
--bug-name-fs:   calc(var(--bug-seat-sq) * 0.218);
--bug-clock-fs:  calc(var(--bug-seat-sq) * 0.2);
```

Two of those three are wrong, and for the same reason: a board's square is a good unit for the
pocket, which sits pieces on it, and a bad one for text, which has a readable size that has nothing
to do with how big the board happens to be. The name is drawn at 7.21px on a seat whose row is
165.3px wide; the clock is drawn at 19.2px in a box 194px wide and 49px tall.

The third derived value — the rating at `0.7vw` — turned out to be on a `display: none` element and
to affect nothing at all. See the proposal for the measurement.

## Goals / Non-Goals

**Goals:**

- A username drawn at a readable size, capped at the size the rest of the site uses.
- A username and its rating sized by one rule, from the room their own board gives them.
- A clock that uses the room the pocket and the name leave it.

**Non-Goals:**

- Changing what the strip contains. Pocket, name, presence, rating, clock all stay.
- Reworking `seatNamePlacement` for the modes that still have to measure.
- Making the font depend on how long the particular username is. Truncation handles that; a size
  that varied per player would make a strip's height depend on who is sitting in it.

## Decisions

### 1. Nothing is reserved — WITHDRAWN, but the arithmetic is kept

This change opened by proposing `10 + 2k` rows: reserve the name's row in the height budget so the
desktop could give the username a line of its own at 100% zoom. **The premise was wrong.** Folding
the name into the strip at full zoom is the intended desktop arrangement, confirmed by Nikolay
against the live page with both states side by side, and the capability had said so all along.

So the divisor stays 10, `squareUnit.ts` is untouched, and the boards keep their full size.

The arithmetic is kept because it answers the objection that killed the original plan, and the next
person to want a reservation for some other reason should not have to re-derive it. The objection
was that reserving `k * square + c` leaves the height no longer a whole number of units, and the
quantisation a remainder that varies with zoom. That is true only of a constant *inside* the
division. Taken off first, a constant costs nothing:

```ts
const unit = squareUnit(stackHeight - reservedRows, ROWS_IN_SHORT_LANDSCAPE, dpr);
```

Verified on the page it would have worked: app height 767, reservation 38.63 (two name rows at
19.31 — a constant, and identical on both seats, which is what made it reservable at all), and
728.37 / 10 quantises to exactly **72**, a whole number of device pixels. The board would have gone
608 -> 576, about 5%, paid at every zoom to buy an arrangement only reachable near 100%.

### 2. The cap is one constant: 16.8px

Measured on the live page at 1276 wide, by building the single-board player markup outside
`.round-app.bug` so only the base cascade applied: `round-player0` computes to **16.8px** with
`line-height: 50px`, from `font-size: 1.2em` (`site.css:2153`) over an `html` of 14px.

The single-board size is itself viewport-stepped — `1em` below 800px in portrait, `.user-link`
taking a further `0.8em` there, and `html` fluid between 12px and 14px — so mirroring it exactly
would give a cap that steps at a viewport boundary. Nikolay's call is one constant everywhere:
**16.8px**, stated once as `--bug-name-fs-max`, with a comment recording that it is `1.2em` of a
14px root and where that was measured.

One constant, and not per-seat: two seats on the same page can be at very different board sizes, and
the whole point of the cap is that a username's readable size does not depend on that.

*Consequence, stated because it is not obvious:* the cap alone does not fix p4's own seat, which is
already at 16.74px. What brings that down is decision 4 — the `* 2` on the popped-out name going
away — not the ceiling.

### 3. The size is driven by the room, the cap bounds it, and a floor stops it vanishing

The rule, in one line: **grow up to the cap when there is room; below it when there is not; truncate
when even that does not fit.**

```
font-size = clamp(floor, room, 16.8px)
```

- **cap** — `16.8px`, decision 2. Never exceeded, in either arrangement.
- **room** — a function of the *slot the name has*, not of the text in it. On a popped-out row that
  is the strip's width; inside the strip it is what the pocket leaves.
- **floor** — already stated in the capability, and not invented here: *"The username and its
  online indicator SHALL be rendered at a font size no smaller than the board's own coordinate
  labels."* Nikolay's position is that today's squeezed sizes are tolerable at the bottom end, and
  the coordinate-label rule is a sharper way of saying the same thing — it ties the floor to
  something else on the page that has already been judged readable at that size. Whether today's
  4.5px inline name in portrait actually clears it is a measurement, not an assumption.
- **truncation** — one line, ellipsis, when the name is still too long at the size it got. Already
  implemented and verified in section 3b of the tasks; it is what makes a room-driven size safe
  without making it text-driven.

**Mechanism: container query units, not measurement.** Give the name's slot
`container-type: inline-size` and size the text from `cqi`:

```css
font-size: clamp(var(--bug-name-fs-min), 10cqi, var(--bug-name-fs-max));
```

Why this rather than extending `seatNamePlacement` to measure and set a px size per seat:

- The standing rule on this page is that nothing observes anything but `document.body`, and boards
  are measured once at load. A room-driven font implemented by measuring would need to re-measure
  whenever the room changed, which is an observer by another name.
- `cqi` makes fit a pure consequence of layout. No ordering against a style write, no `setTimeout`,
  no second source of truth for a size CSS already knows.
- It composes with `clamp()`, so cap and floor are stated in the same declaration as the rule.

`10cqi` is a starting value, from the case that has to work: p4's partner row is 165.3px wide and
wants the cap, and `16.8 / 1.653 = 10.16`. It has to be tuned against every slot in every mode and
then stated with the measurements that chose it.

*Risk to check, not to assume away — and it bit.* `container-type: inline-size` gives the element
layout containment in the inline axis, so its width must come from its parent rather than its
contents. That much was checked for each container and each was fine.

**The check was aimed one level too low.** A containment context also contributes ZERO intrinsic
width to its OWN parent, so an ancestor that was sized by its children collapses. `.info-wrap` had
no width rule and was `flex: 0 1 auto` — sized by the clock and the name, both now contained — and
it collapsed to 6.3px in a 437.3px strip, taking the clock to a 1.375px font. The children then read
their `cqi` from a box that had already collapsed.

Worse, it was invisible at first: the strip's flex line had already been laid out with real widths,
and nothing forced a re-layout until an unrelated flip minutes later. Every measurement taken before
that flip read correct numbers.

Fixed with `flex: 1 1 0%; min-width: 0` on `.info-wrap0`/`.info-wrap1`. **The rule for anywhere else
containment is introduced: check the whole ancestor chain for boxes sized by their contents, not
just the container itself.**

### 4. The popped-out name loses its doubling

`calc(var(--bug-name-fs, 0.85em) * 2)` (`bughouse.css:2239`) doubles the name when it leaves the
strip. It exists because a square-derived font was far too small for a full-width row — a
compensation for the wrong rule rather than a rule of its own. Once the size is driven by the room
and bounded by a cap, the doubling is the same statement made twice and worse: it is what makes p4's
own seat 16.74px and p4's partner 7.21px, one at the ceiling by accident and one nowhere near it.

It goes. The row's width is the room; the cap is the ceiling.

### 5. The username and its rating are one sized unit

The markup is already `<player><a class="user-link">..</a><rating>..</rating></player>`, with
`<i-side>` beside them in `.player-data`. Putting the size rule on `<player>` rather than on
`a.user-link` means the rating inherits it, and there is nothing to keep in step when bughouse
starts carrying ratings.

Two things to carry over when that happens, both measured on a single-board page: the rating there
is `display: block` — its own line under the name, not inline beside it — at a fixed 16px. Neither
survives contact with a one-square strip, so the rating will want to be inline here and to take its
size from the same `<player>` rule. Recorded so the decision is made once rather than rediscovered.

The `0.7vw` rule on the hidden element should go at the same time. Viewport-derived text has no
place in a layout that has spent this change removing board-derived text.

### 6. `k` is measured, then stated — WITHDRAWN

Superseded by decision 1. There is no `k`: the reservation is a constant, taken off before the
division, and nothing needs measuring to know it. The oscillation this decision was written to
explain — 12.54 predicted against 36.09 actual, from computing `0.218 * 1.15` and forgetting the
box's other contents — remains a good reason never to predict a box's height from a font, and that
warning is worth keeping even though the number it guarded is gone.

### 7. One line, by construction

The inline name box is deliberately allowed two lines — `white-space: normal`, `word-break:
break-all`, clipped at two. On its own row it should be one: the row exists so the name is readable
in one piece, and a reservation sized for one line that then wraps to two reserves too little half
the time.

So the popped-out state gets `white-space: nowrap` and the row is one line by definition.

### 8. Neutralise the 4px, so the strip has no fixed term left

`.player-data { padding: 2px 6px }` (`site.css:1664`) is the entire constant term in a strip whose
contents are otherwise exactly proportional — 0.4987 and 0.5008 of a square on two seats whose
squares differ by a factor of 2.3. The horizontal half is already overridden here
(`padding-right: 0`, so the name's edge lines up with the clock's digits); the vertical half is not.

Take it to zero on this page. Then the name's row is one line box at a known font size and the
strip has no fixed term left anywhere in it.

`site.css` is not to be touched — the override belongs in `bughouse.css`, scoped to the round page,
the same way the coordinate gutter and the body margin are handled.

### 9. Placement keeps measuring — WITHDRAWN

This said that once tall landscape reserved the rows, `seatNamePlacement`'s answer there would
always be yes and the measurement could be replaced with the answer. With nothing reserved there is
nothing to replace: the answer varies with zoom in every mode, which is exactly what the module is
for. It is left alone.

### 10. Inside the strip: stack the clock over the name

Today `.info-wrap` is `display: flex; flex-flow: row-reverse; align-items: center`, holding the
clock and the name side by side in whatever the pocket leaves. The clock is `flex: 0 0 auto`, so it
takes its natural width first and the name absorbs the shortfall. On p3 that was 122.5 against 27.5
in a 150px space.

Turning that box into a column gives both the full width:

```
[ pocket ][ clock            ]
          [ name + presence  ]
```

- the clock takes the height above the name, `flex: 1 1 0%` with `min-height: 0`
- the name is one line at the bottom, `flex: 0 0 auto`, `nowrap`, `overflow: hidden`,
  `text-overflow: ellipsis`
- both are the strip's width minus the pocket, which is what "full width" means here

This is implemented and measured; see tasks 3b.

### 11. Priority, stated once, for both arrangements

The order is the same everywhere and nothing is allowed to invert it:

1. **The pocket is never reduced.** It sits pieces on squares that match the board's; a pocket
   scaled to fit leftover space would show pieces at a different size from the board's. It stays
   `flex: 0 0 auto`.
2. **Then the name, if it is inside the strip.** It takes the full width the pocket leaves, on its
   own line, and the clock is pushed onto a line of its own above or below it — never beside it.
3. **Then the clock takes everything that is left**, and its digits grow into it rather than
   keeping a size derived from the board.

Step 3 is the new part. `--bug-clock-fs: calc(var(--bug-seat-sq) * 0.2)` makes the clock blind to
its room: 65.1 x 19.2 in a 194 x 49 space when the name is outside, 105 wide in a 218.7 slot when it
is inside. The same `cqi` mechanism as decision 3 applies, with a cap of its own so that a clock on
a nearly empty strip does not become the loudest thing on the page.

*The ordering risk:* the clock's room depends on the name's line, and the name's size depends on its
slot's width — not on the clock — so there is no cycle. It only becomes one if the clock is ever
sized from the *height* of a container whose height its own content determines. Size the clock from
the room's inline size, or from a container whose height is fixed by the strip, and it stays acyclic.

### 12. Which strip is on top: reuse `.seat-strip0`, add nothing

The requirement is to tell a top strip from a bottom one in CSS, without a marker the flip logic
would have to maintain.

**There is already one, and it cannot drift, because the layout depends on it for position:**

```css
.round-app.bug     > .seat-strip0 { grid-area: clock-top;  }
.bug-partner-stack > .seat-strip0 { grid-area: clockB-top; }
```

The class is what puts the strip in the top area. A `seat-strip0` that were not on top would be a
strip that had lost its grid placement, which is not a state this layout can reach.

Why the DOM moves do not break it:

- `swapSeatBlocksForFlip` swaps `blockElement()` — the block **inside** each strip. The strips do
  not move, so their classes and areas stay put.
- `swapSeatStripsForSwitch` swaps `a[0]` with `b[0]` and `a[1]` with `b[1]` — top with top, bottom
  with bottom, between the two columns.

Measured in portrait and tall landscape: every `seat-strip0` above its board, every `seat-strip1`
below, in both containers.

The rule this unlocks is one line of intent — **the clock goes against the board, the name goes on
the outside** — which is `flex-direction: column` for a bottom strip and `column-reverse` for a top
one, and the same inversion for where a popped-out name is placed. Implemented; see tasks 3c.

## Risks / Trade-offs

- **The boards no longer get smaller at all.** This was the change's whole stated cost — about 5%
  of the board — and it is gone with the reservation. What is left touches only the username's size,
  the clock's, and 4px of padding.
- **A constant cap means the two seats are drawn at the same size on very different boards.** That
  is intended — a username's readable size is not a property of a chessboard — but it will look
  wrong next to a partner board a third the size, and it should be judged on screen rather than
  argued about here.
- **`cqi` needs a container whose width comes from outside.** Decision 3 states the failure mode:
  an element given `container-type: inline-size` whose width came from its contents will collapse.
  Every slot has to be checked, not assumed.
- **The floor may bind harder than expected.** The coordinate-label floor is inherited from the
  capability rather than chosen here, and nobody has checked what it evaluates to now that
  coordinates are drawn inside the squares in the mobile modes. If it turns out larger than the
  squeezed slot can hold, the name truncates sooner — which is the intended behaviour, but it will
  look like a regression next to today's unreadably small but complete name.
- **Four requirements are modified, and two of them describe code already written.** Section 3b
  implemented one line and an ellipsis against a requirement mandating two lines and no ellipsis.
  That was a real divergence between the built page and the capability, and it went unrecorded until
  this revision; the lesson is that a delta which only ever ADDs is a delta that has not been checked
  against what it contradicts.
- **A long name still has to fit horizontally.** One line vertically does not mean one line
  horizontally; truncation in decision 10 is what makes it safe, in both arrangements.
- **The inline strip being readable is what made the reserved row unnecessary.** Fixing it first
  is what allowed decision 1 to be withdrawn rather than implemented, which is the order the work
  should be judged in.

## Found while verifying, not caused by this change

**A board zoomed to 0 cannot be recovered with the mouse.** Swept with the resize handle, board B
reaches 0 at zoom 0 — `cg-wrap` 0x0, strip 1px — and at that point the handle stops being
hit-testable: `elementFromPoint` at the handle's own centre returns `.round-app`, not the
`cg-resize`, because the collapsed wrap clips it. `getBoundingClientRect` still reports a 22x22 box,
so the element is there and merely unreachable. The only ways back are the zoom slider in settings
or editing `standard8x8-zoom-b` in localStorage.

Nothing in this change touches the zoom path or the handle, and the same collapse happens on the CSS
this change replaces. It belongs with `boards-resize-only-on-user-action`, which already owns the
zoom path, and the fix is probably a floor on the zoom setting rather than anything in the layout.

A second, smaller thing at zoom 0: the collapsed board's rank coordinates are still drawn, stranding
a column of digits beside an empty space.

## Open Questions

- What is the right `cqi` coefficient for each slot, and is one coefficient enough for all of them?
- Does the clock want a cap of its own, and what is it? A clock that fills a nearly empty strip may
  simply be too loud.
- What does the coordinate-label floor actually evaluate to in each mode, now that the mobile modes
  draw their coordinates inside the squares?

