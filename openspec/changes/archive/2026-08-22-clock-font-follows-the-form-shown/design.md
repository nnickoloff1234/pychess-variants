## Context

The clock's font is `min(92cqb, calc(100cqi / var(--bug-clock-widest)))` against `.clock-wrap`, with
`--bug-clock-widest: 3.5` — the ratio of the widest form, `00:09.9`, measured at 3.40 with headroom.
It is one ratio for every value the clock displays.

Measured on the desktop at 1914x827, `.clock-wrap` 183.03 x 62:

| form | glyphs | ratio | font today | font if bounded for this form alone |
| --- | --- | --- | --- | --- |
| `60:00` | 5 | 2.56 | 52.29 | 57.04 (height binds first) |
| `00:09.9` | 7 | 3.40 | 52.29 | 52.29 |

The 4.75px difference is the whole subject of this change: it is given up for the whole game to make
room for the last ten seconds.

Two facts make the alternative available and safe, and neither was used:

**The form is already in the DOM.** `client/clock.ts` puts a `hurry` class on `div.clock` when
`time < HURRY && this.byoyomiPeriod === 0`, and decides tenths with `millis < HURRY &&
this.byoyomiPeriod === 0`. Same constant, same operands, same guard. `.clock.hurry` is therefore an
exact CSS-side predicate for "the wide form is on screen".

**The font cannot feed back into the box.** `.clock-wrap` is `container-type: size`, which is size
containment: its dimensions come from outside it and its contents cannot influence them. A font
derived from `cqi`/`cqb` of that box can never change the box, in either state, so there is no
iteration to converge and nothing to guard.

## Goals / Non-Goals

**Goals:**

- The clock as large as its own box allows for the form it is displaying.
- The bound to follow the displayed form through a signal the page already publishes.
- Both ratios measured, recorded, and erring on the side that costs size rather than fit.

**Non-Goals:**

- Reserving the tenths width. Still forbidden, still for the same reason, and still unaffected: the
  box grows with the text and only the font is bounded.
- Measuring text. See Out of scope in the proposal.
- Changing the tenths threshold, the format, or what `hurry` means.

## Decisions

### 1. Two ratios, selected by the class the clock already sets

```css
.round-app.bug .clock       { --bug-clock-widest: 2.65; }   /* 60:00 — measured 2.56 */
.round-app.bug .clock.hurry { --bug-clock-widest: 3.5;  }   /* 00:09.9 — measured 3.40 */
```

The font expression itself does not change; only the ratio it divides by. Each state is an
independent evaluation of the same rule, so everything already established about the fit holds twice
over rather than being re-derived.

Headroom is kept on the same side as before — above the measurement, so an inexact ratio costs a
slightly smaller clock rather than digits outside the strip. 2.65 against 2.56 is about 3%, matching
the 3.5 against 3.40 already in place.

Alternatives considered. A single ratio with the narrow value would overflow the moment tenths
appear, which is the defect just fixed. Reserving the wide width permanently is forbidden. Measuring
the text to fit is the loop this codebase excludes.

### 2. The size change is an event, not an accident, and it lands where one already happens

`.clock.hurry` already swaps the clock's background — `MistyRose`, or `#502826` under the dark theme.
The ten-second boundary is already a deliberate visual event, so the question is not whether to
introduce an interruption there but whether to add size to a change that already occurs. The element
in question is the one that is supposed to draw the eye at that instant.

The magnitude is small and one-directional on the desktop: 57.04 to 52.29, about 8%, at the same
moment the background changes.

### 3. With an increment, the change is reversible, and that is correct

A clock with a positive increment can rise back above ten seconds, and `hurry` is recomputed on every
render — so the class clears, the ratio returns to the narrow one, and the clock grows back. That is
the rule behaving as stated rather than an edge case: the bound follows the form displayed, whichever
direction the clock is moving. Bughouse at 60+0 never sees it; a 3+2 game would see it repeatedly,
which is worth watching on the live page before this is called done.

### 4. Only the desktop is affected, and that follows from which term binds

In portrait and short landscape the height term is far below the width term in both states — 26.39
and 19.92 against width terms of 54.86 and 23.63 in portrait, 32.52 against 62.48 in short landscape.
Widening the width term cannot make it the smaller of the two there, so those modes cannot change.
The desktop is the only mode where the width binds and therefore the only one where the ratio is
visible at all.

## Risks / Trade-offs

- **A clock that changes size under time pressure may read as instability**, which is exactly what
  the rule being reversed was protecting against. → It coincides with the existing background change
  rather than standing alone; judge it on the live page in both themes before accepting it, and the
  fallback is a one-line revert to the single ratio.
- **Two constants where there was one**, both needing to stay true to the font. → Both measured and
  recorded together, next to the same expression, so a font change has one place to revisit.
- **The difference badge scales with the clock (1.5em)**, so its placement moves with the font in
  both states. → Verify both states: the badge should sit outside during ordinary play and retreat
  under tenths, which is what it does now, but the numbers change.
- **A clock crossing the boundary mid-drag or mid-move** changes size while the player is acting. →
  Nothing else in the strip is sized from the clock, and size containment keeps the change inside the
  wrap, so nothing around it moves. Confirm the strip does not reflow.

## Open Questions

- Does the size change read as a useful warning or as a wobble? The one thing here that measurement
  cannot settle.
- Should the narrow ratio account for `09:59` separately? It measures the same 2.56 as `60:00`, so
  one narrow ratio covers both — but the two forms are only equal because the digits are equal-width,
  which is a property of this font rather than of the clock.
