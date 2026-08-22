## Why

A clock crossing under ten seconds starts showing tenths, and its box widens to hold them. The font
does not change, and nothing checks that the wider box still fits — so on the desktop it does not.
Measured on the live page at 1914x827: the clock's own box is 183.03px, `60:00` draws in 145.8, and
`00:09.9` draws in **193.7 — 10.67px past the box it sits in**, in the last ten seconds of a game,
which is the one moment a player is reading the clock rather than the board.

The cause is a measured constant that measured the wrong thing. The width bound is `32cqi`, derived
from an explicit claim in both the stylesheet and the capability: that the widest form a clock can
display is `0:09.9` at 2.82 times the font size, and that `59:59.9` at 3.40 is unreachable "since
tenths appear only under ten seconds, so the minutes field is a single digit by then". The minutes
field is never a single digit. `printTime()` pads it: `mins = (minutes < 10 ? '0' : '') + minutes`.
The form the clock actually shows under ten seconds is `00:09.9`, seven glyphs, and it measures 3.40
— the ratio that was dismissed as impossible. The bound is about 9% too generous, which is exactly
the overflow.

So the requirement was right and the number under it was wrong: it already says any width bound
**"SHALL be derived from the measured width of the widest form the clock can display"**, and it names
the wrong form as that widest. A corrected constant fixes today's overflow; what stops the next one
is the box being unable to overflow at all.

The second half is a placement that has never been what it should be. The difference indicator is
`position: absolute; left: 0` inside the clock's box, so it sits over the leading digit — recorded as
deliberate, and accepted because "the difference is the more important of the two". But the overlap
is usually unnecessary: measured on the desktop, the clock's box is 145.8 wide inside a 183.03 slot,
leaving **37.24px free to its left** while the indicator is 21.44px. It would fit entirely outside,
today, with 15px to spare, and it covers a digit anyway.

## What Changes

- **A clock's text fits its box, at every value it can display.** The font is bounded by the widest
  form the code can actually produce, and the bound is stated as a measured ratio rather than as an
  opaque coefficient, so the next reader can check it against a font change.

- **The box cannot overflow its slot even if the ratio is wrong.** A constant that has been wrong
  once can be wrong again; the fit becomes structural rather than arithmetic, so an error in the
  measurement costs a smaller clock rather than digits outside the strip.

- **The difference indicator sits outside the clock by default** — its right edge against the clock's
  left edge — and moves inward only by the amount it must, progressively, until at no room at all it
  is where it is today, over the leading digit.

- **The capability stops asserting that `0:09.9` is the widest form.** That claim is in the
  requirement text, and it is what a future implementer would derive the next bound from.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: two requirements change. **The clock is anchored and sized to the strip**
  loses its false statement of the widest form, gains the true one, and gains the guarantee that the
  text fits its box at every displayable value rather than only at the measured one. **The clock
  difference indicator is legible over the clock** changes from permitting the overlap to preferring
  the space beside the clock and treating the overlap as what happens when that space runs out.

## Impact

- `static/bughouse.css` — the `min(92cqb, 32cqi)` bound and the comment block deriving it; the
  difference indicator's placement.
- The indicator's `position: absolute; left: 0` turned out to live in `bughouse.css` too, not in
  site.css as first written, so it is edited in place and nothing needs overriding. site.css is
  untouched, as intended, but for a simpler reason than expected.
- No TypeScript change expected. `printTime()` is correct — it is the description of it that was
  wrong — and the fit is asked of CSS.
- No server change; frontend gates only.

## Out of scope

Changing what the clock displays. Two-digit minutes under ten seconds is the existing format and this
change is about making room for it, not about narrowing it. Dropping the leading zero would also fix
the overflow and would be a change to how every bughouse clock reads.
