## Context

The clock is sized by one declaration:

```css
.round-app.bug .clock { font-size: min(92cqb, 22cqi); }
```

with `container-type: size` on `.clock-wrap`, so `cqb` is the box's height and `cqi` its width. Two
terms, whichever is smaller — the height it can fill, and the width it must not overflow.

The height term is sound. The width term is a guess, and it is the one that binds everywhere the
strip is wide. Measured across this page:

| seat | wrap | `92cqb` | `22cqi` | binds | clock drawn |
|---|---|---|---|---|---|
| tall landscape, all four | 186.4 x 61 | 56.1 | **41.0** | width | 128.8 x 41 |
| portrait, own | 194 x 49 | 45.1 | **42.7** | width | — |
| portrait, partner | 82.7 x 21.7 | 20.0 | **18.2** | width | — |
| short landscape | 218.7 x 35.4 | **32.6** | 48.1 | height | fills it |

Short landscape is the one mode already doing the right thing, and it is doing it by accident: its
strip is wide and short, so the height term wins without the width term ever being tested.

## Goals / Non-Goals

**Goals:**

- The clock fills the height it is given, which is the whole point of giving it that height.
- The width term is a measured bound rather than an assumed one, and says what it was measured
  against.
- No clock form overflows its box in any mode, at any zoom.

**Non-Goals:**

- Changing where the clock sits, or the priority order the strip apportions space by. The pocket is
  still never reduced and the name still takes the width the pocket leaves.
- Making the clock's size depend on which form it is currently displaying. A clock that resized when
  it crossed ten seconds would be worse than one that is slightly small — see decision 3.
- Revisiting the username's cap.

## Decisions

### 1. Measure the ratio; do not reason about digit counts

The 4.4 in the current comment came from counting characters and estimating. The font is
`font-variant-numeric: lining-nums tabular-nums`, so every digit is the same width and the ratio is
exactly measurable — but the separator is not a digit, the `.byo` span may be present and empty, and
there is a 24px constant, so the arithmetic from character counts was never going to land.

The method that works, and that produced the table in the proposal: build a span carrying the
clock's own computed font and variant settings, measure each form's text, and compare against the
clock's real rendered width to catch anything the text does not include.

**Whatever coefficient is chosen, the measurement that chose it is recorded beside it** — the forms,
their ratios, and the box they were measured in. The current comment is a worked example of what
happens otherwise: it is confidently specific and wrong, and it survived review because it looked
like it had been measured.

### 2. Decide the 24px before the coefficient, because the coefficient depends on it

`.clock-time.min { padding-left: 12px }` and `.clock-time.sec { padding-right: 12px }`.

With it, the clock's width is `24 + ratio x font`. The 24 does not scale, so it is 23% of a small
partner clock's width and 12% of a desktop one, and the ratio the coefficient needs is different at
every size — which is precisely the "proportion plus a constant" that `name-row-in-the-height-budget`
spent its whole investigation chasing out of the seat strip.

Two options:

- **Remove it.** The clock then has one clean ratio and `cqi` expresses the fit exactly. The digits
  lose 12px of breathing room at each end, which on a large desktop clock is invisible and on a
  small partner clock was never really there.
- **Make it a fraction of the clock's font** — `padding-inline: 0.15em` or similar. Keeps the
  breathing room, keeps the ratio constant, costs one more term in the ratio.

*Recommendation:* the second. The padding is doing something — it keeps the digits off the strip's
trailing edge, where the last change deliberately aligned the name — and an `em` keeps it while
making the whole clock proportional. Removing it is simpler but throws away spacing that was
presumably chosen deliberately, and this change has no evidence either way about that.

### 3. Size for the widest form, always — do not resize when the form changes

`0:09.9` is the widest thing a clock can display: tenths appear only under ten seconds, so the
minutes field is a single `0` by then. `59:59.9` is wider but unreachable.

The clock must be sized so that form fits, at all times, even while showing `9:59`. The alternative
— size to the current text and shrink when tenths arrive — makes the clock change size in the last
ten seconds of a game, which is the worst possible moment, and the capability already forbids the
equivalent trick of reserving the width: *"The clock SHALL NOT reserve room for the wider form it
takes when it falls under ten seconds."* Sizing for it is not reserving for it: the box stays its
natural width, and only the font is chosen so the wide form would fit.

This is why the width term stays in the `min()` even though the height should usually win. It is not
there to size the clock; it is there to stop the clock being sized past what the widest form allows
in a strip that is wide but very short.

### 4. Expect the height to bind, but do not hard-code that

With the width term corrected the height should win in tall landscape and portrait, as it already
does in short landscape. That is the outcome, not the mechanism: `min()` of both terms is still
right, because a mode could yet appear whose strip is wide and shallow enough for the width to
matter. Replacing the `min()` with `92cqb` alone would work today and break silently the first time
a strip's proportions changed.

## Risks / Trade-offs

- **A bigger clock is a louder clock.** `name-row-in-the-height-budget` decided against capping it,
  on the grounds that it is bounded by the strip and therefore by the board. That reasoning holds
  here — 56px on the desktop is still bounded by a 61px line — but 41 to 56 is a 37% jump and it
  should be looked at on screen before it is accepted, exactly as the cap decision was.
- **The clock and the username now differ in kind.** The name is capped at a constant 16.8px and the
  clock is not capped at all, so on a large desktop board the clock will be more than three times the
  name. That is defensible — a clock is glanced at, a name is read once — but it is a deliberate
  asymmetry and worth stating rather than discovering.
- **`container-type: size` is load-bearing here**, and the last change proved how that fails: a
  containment context contributes nothing to its parent's intrinsic size, which collapsed
  `.info-wrap` to 6.3px and was invisible until an unrelated flip forced a re-layout. Any change to
  the clock's containment must re-check the ancestor chain, and must be verified after a real
  re-layout, not just after a stylesheet swap.
- **The 24px may be load-bearing for the difference indicator**, which is positioned over the clock's
  leading digit and clipped to `.clock-holder`. Check what it does before removing padding it may be
  sitting in.

## Open Questions

- Remove the 24px, or make it an `em`? Decision 2 recommends the latter but has no evidence about
  why the spacing was chosen.
- What is the right coefficient once the 24px is settled — and is one coefficient enough for all
  four modes, or does a very short wide strip need its own?
- Is a 56px clock on the desktop too loud beside a 16.8px name?
- Does the clock-difference indicator, at `1.5em` of the clock, still fit its box once the clock
  grows by 37%?
