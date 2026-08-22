## Why

The clock is sized so the widest form it can ever display will fit, and it holds that size the whole
game. That is safe and it is also permanently expensive: the widest form appears in the last ten
seconds, and for the rest of the game the clock is smaller than its box allows. Measured on the
desktop, 52.29px where the height would allow 57.04 — about 8% of size given up, for 99% of the game,
to accommodate a form that is not on screen.

That trade was accepted on the belief that CSS cannot know how long the text is. **It can.** `.clock`
already carries a `hurry` class, and the predicate that sets it is character-for-character the one
`printTime()` uses to switch to tenths — `time < HURRY && this.byoyomiPeriod === 0`, with
`HURRY = 10000`. The form on screen is therefore already encoded in the DOM, and the width bound can
follow it with no measurement, no JavaScript and no extra state.

The objection to a clock that changes size at the ten-second mark is weaker than it looks, because
the clock **already** changes at that moment: `.clock.hurry` swaps its background to `MistyRose`, or
`#502826` in the dark theme. The boundary is a deliberate, visible event today. A size change there
joins something that already happens rather than introducing a new interruption — and the thing that
changes size is the element whose job at that instant is to be noticed.

## What Changes

- **The width bound follows the form on screen.** Two measured ratios instead of one: the ordinary
  `60:00` form, and the `00:09.9` form the clock takes under ten seconds.

- **The clock is as large as its box allows for what it is actually displaying** — on the desktop,
  57.04px for the whole game against 52.29px today, dropping to 52.29 only while tenths are shown.

- **The capability's rule that the clock must not change size when it enters tenths is reversed**,
  with the reason recorded. That rule exists because the alternative was believed to be reserving
  width or measuring text; it is neither.

- **Nothing changes in portrait or short landscape.** The height binds in both states there, so the
  second ratio never becomes the smaller term and the clocks are untouched.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: **The clock is anchored and sized to the strip** changes. Sizing for the
  widest form at all times becomes sizing for the form currently displayed; the clause forbidding a
  size change at the tenths boundary is replaced by one requiring the change to be driven by the
  signal the clock already publishes, and the "widest form" requirements become per-form ones. The
  prohibition on RESERVING the tenths width is untouched and still holds — the box still grows with
  the text, and only the font is bounded.

## Impact

- `static/bughouse.css` — `--bug-clock-widest` becomes two values, one on `.clock` and one on
  `.clock.hurry`, with both measurements recorded.
- No TypeScript change. The class and the predicate already exist and are already correct; this
  consumes a signal that was being published and ignored.
- No server change; frontend gates only.
- The memory note `clock-font-presized-not-shrink-on-tick` says this is deliberately not implemented
  and has to be rewritten with the change.

## Out of scope

Measuring rendered text to fit the font, in JavaScript or otherwise. That is a feedback loop — the
font sets the width, the width would set the font — and it is the shape this codebase rules out.
Everything here is two constants selected by a class.
