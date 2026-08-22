## Context

The clock is four elements in a row — `.clock-time.min`, `.clock-sep`, `.clock-time.sec`, and a
`.byo` that is `display: none` on this page — inside `.clock-holder`, inside `.clock-wrap`. The wrap
is `container-type: size` and the font is `min(92cqb, 32cqi)` against it: height-bound wherever the
strip is deep, width-bound where it is shallow.

The holder shrink-wraps the digits, so the box widens when the text does. Measured on the desktop at
1914x827, font 57.04px, wrap 183.03px:

| form | box width | ratio to font | fits the 183.03 wrap |
| --- | --- | --- | --- |
| `60:00` | 145.8 | 2.56 | yes |
| `09:59` | 145.8 | 2.56 | yes |
| `00:09.9` | 193.7 | 3.40 | **no, by 10.67px** |
| `59:59.9` | 193.7 | 3.40 | no |

`0:09.9` — the form the bound was derived from — does not appear in that table because the code
cannot produce it. `printTime()` pads the minutes field unconditionally, so under ten seconds the
clock reads `00:09.9`, and the two forms the stylesheet called "widest" and "unreachable" are the
same width.

Portrait and short landscape do not overflow: their strips are shallow enough that `92cqb` binds far
below the width bound — portrait's own clock is 26.4px with 124.57px of slack, the partner's 19.9px
with 31.76px. This is a desktop symptom of a general defect.

The difference indicator is `position: absolute; left: 0; bottom: 0` inside the holder — in
`bughouse.css`, not site.css as first assumed, so it is this page's own rule to change — so
it is pinned to the clock's leading edge and covers the first digit. On the desktop the holder is
145.8 inside a 183.03 wrap — 37.24px of free space to its left — while the indicator is 21.44px wide.
It covers a digit while a space it would fit in twice over sits empty beside it.

## Goals / Non-Goals

**Goals:**

- A clock whose text fits its box at every value the code can display, not only at the value that was
  measured.
- A width bound expressed as the thing it is — the widest form's measured ratio — so it can be
  checked rather than trusted.
- A difference indicator that takes the space beside the clock when there is any, and takes it
  progressively rather than in one jump.
- No constant that has to be right for the layout to be safe, where that can be avoided.

**Non-Goals:**

- Changing the clock's format. Two-digit minutes is what the clock shows; this makes room for it.
- Reserving the tenths width. The capability forbids it and continues to: the box widens when the
  text does, and only the font is bounded.
- Editing site.css, per standing preference. Nothing here needs to: both the clock bound and the
  indicator's placement are already this page's own rules.
- Any JavaScript measurement of text. The fit is asked of CSS.

## Decisions

### 1. The bound is a division by a measured ratio, not a coefficient

`32cqi` is unreadable as a claim: nothing about it says "this is one over the widest form's aspect".
Written as a division it does:

```css
--bug-clock-widest: 3.4;   /* 00:09.9, measured — see below */
font-size: min(92cqb, calc(100cqi / var(--bug-clock-widest)));
```

`100cqi / 3.4` is 29.4cqi against the 32cqi in place, which is the 9% that overflows. The value is
the same kind of measured constant either way — CSS has no intrinsic "shrink text to fit", so a
ratio is unavoidable — but this form states what would have to change if the font changed, and puts
the widest form's name beside it.

The measurement is reproducible and belongs in the tasks: set the text to each form in the live page
and read the box width against the font size, which is how the 3.40 above was obtained.

Alternatives considered. Correcting `32cqi` to `29cqi` fixes today's number and leaves the next
reader deriving the next bound from the same unexplained coefficient. Reserving the widest width
permanently would make the fit trivial and is forbidden by the capability, for the good reason that
it stands empty for all but the last ten seconds of a game.

### 2. The ratio's failure mode should be a smaller clock, not digits outside the strip

Set to **3.5** against a measurement of 3.40, about 3% of headroom. The desktop clock goes from
57.04px to 52.29px, drawing the widest form in 177.56px of a 183.03px box. Portrait and short
landscape are unchanged — 26.39, 19.92 and 32.52px, all still height-bound with the width term far
above them.

A constant that has been wrong once can be wrong again — a font change, a variant with a longer
clock, a byoyomi form that this page does not currently show. The bound above is only a guarantee if
the ratio is exact.

So the ratio carries deliberate headroom rather than sitting on the measurement, the way the current
one was meant to: the widest form measured at 3.40 and the constant is set above it. A ratio that is
too large costs a slightly smaller clock at the moment the width binds; one that is too small puts
digits outside the strip. The two errors are not symmetric and the constant should sit on the safe
side of the measurement, which is stated where it is defined.

### 3. The indicator is placed by a grid track, so the arithmetic is the layout's rather than ours

The placement wanted is: right edge against the clock's left edge where there is room; sliding in by
exactly the shortfall where there is not; fully over the leading digit where there is none.

Expressed as absolute positioning this needs two quantities in one expression — the indicator's own
width and the free space beside the clock — and CSS resolves percentages against different boxes in
each place they can appear: `100%` is the containing block in `inset` and `margin`, and the element's
own border box in `transform`. The two cannot be combined, so an absolute form needs the indicator's
width as a constant in `em`, estimated from its content and padding. That is the same class of
estimate as the one that caused the first half of this change, for the same kind of reason.

A grid track expresses it exactly and with no constant at all. The holder becomes a two-column grid
spanning the wrap, packed to the trailing edge:

```
grid-template-columns: minmax(0, max-content) max-content;
justify-content: end;
```

with the indicator in the first column at `justify-self: start` and the clock in the second. A
`minmax(0, max-content)` track takes its max-content width when the container has free space and
collapses toward zero when it does not, so the first track is `min(indicator width, wrap − clock)` by
construction. The indicator sits at that track's start and keeps its own width, so:

- room for it: the track is its full width, the indicator ends exactly at the clock's left edge;
- some room: the track is the free space, the indicator overhangs into the digits by the shortfall;
- none: the track is zero, the indicator starts at the clock's left edge and lies over the leading
  digit, which is exactly where it is today.

No measurement, no constant, and the progressive middle is free. The cost is that the indicator stops
being absolutely positioned, and that the holder stops shrink-wrapping the digits — it spans the wrap
(`flex: 1 1 auto` as a flex item of it), with `justify-content: end` keeping the digits on the
trailing edge the capability requires.

Measured after: at `60:00` the desktop indicator's trailing edge lands exactly on the clock's leading
edge, overlap 0, with 49.39px of room. At `00:09.9` the room is 5.47px and the overlap is 15.97 —
21.44 minus 5.47, the shortfall and nothing more. Forced past zero room with an impossible form, the
track collapses and the overlap is the indicator's full 21.44px, which is where it sat before.

### 4. The overlap stays permitted, and stays legible

Nothing here weakens the reason the overlap was accepted: when the two collide the difference is the
more important of them, so it is drawn over the clock rather than shrunk or clipped. The change is
only that colliding becomes the last resort rather than the default.

## Risks / Trade-offs

- **The holder stops shrink-wrapping.** Anything that reads its width — a measurement, another
  layout rule, the berserk element beside it — sees the wrap's width instead. → Audit what is inside
  the holder and what reads its box before changing it.
- **`justify-content: end` has to reproduce `row-reverse` + `justify-content: flex-start`.** The
  existing arrangement is expressed against the flex main axis in reverse, and the capability
  explicitly warns that stating this against the main axis puts it on the wrong side. → Verify the
  digits still end at the strip's trailing edge in all three modes and on both boards, by
  measurement.
- **A grid item cannot overflow its track without `overflow: visible` holding.** If anything in the
  chain clips, the indicator is cut instead of overlapping. → Check the strip's own `overflow:
  hidden`, which has cut elements on this page before.
- **The ratio is still a constant.** → Decision 2 makes its failure direction safe, and a task
  verifies every form by simulation rather than by eye.

## Open Questions

- Does the `.byo` element ever display on this page? It is `display: none` today and carries
  `+0s` text; if a byoyomi variant could show it, it is part of the widest form and the ratio is
  wrong again.
- Should the indicator's own font shrink when it has no room, rather than overlapping further? The
  capability's answer today is no — it is the more important element — and this change keeps that.
