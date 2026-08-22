## Why

The clock does not take the height it is given. It is most obvious on the desktop, where the
username sits outside the strip and hands the clock a whole line to itself — and the clock ignores
most of it. Measured on p1, tall landscape at 80% zoom, on all four seats identically:

| | width | height |
|---|---|---|
| the box the clock is given (`.clock-wrap`) | 186.4 | 61 |
| the clock actually drawn | 128.8 | 41 |
| **unused** | **57.6** | **20** |

`name-row-in-the-height-budget` set out to fix exactly this — "the clock takes the room the pocket
and the name leave, and its digits grow into it" — and it did move the number, from 19.2px to 41px.
It did not finish the job, and the reason is that one of its two terms was guessed rather than
measured.

### The width term is wrong, and it is the one that binds

```css
.round-app.bug .clock { font-size: min(92cqb, 22cqi); }
```

On the desktop those evaluate to `92cqb = 56.1` and `22cqi = 41.0`, so the width term binds and the
clock stops at 41 while 20px of height sits empty above and below it.

**22 was derived from an assumption.** The comment in the stylesheet says five digits run "about
3.3 times the font size, but a clock under ten seconds shows tenths and runs about 4.4, so the
divisor is the WIDE form". Measured against the real font at the real size, the ratios are:

| form | width at 41px | x font size |
|---|---|---|
| `9:59` | 81.4 | 1.98 |
| `60:00` | 104.8 | 2.56 |
| `0:09.9` — the widest a clock can display | 115.8 | 2.82 |
| `59:59.9` — impossible; tenths only appear under ten seconds | 139.3 | 3.40 |

4.4 was too pessimistic even against a form the clock can never show. Against the widest form it
actually can, it is off by more than half.

### There is a fixed 24px inside the clock

`.clock-time.min` carries `padding-left: 12px` and `.clock-time.sec` carries `padding-right: 12px`.
That is a constant in a box whose every other dimension is proportional, and it is why the rendered
clock is 128.8 wide when its text measures 104.8: `24 + 104.8 = 128.8`, to the decimal.

It matters twice over. It makes the clock's width `24 + ratio x font` rather than a clean multiple,
so no `cqi` coefficient can express the fit exactly — the constant is proportionally huge on a small
clock and negligible on a large one. And it is the same defect class as `.player-data`'s 2px, which
the last change removed after it turned out to be the whole reason the seat strip looked like "a
proportion plus a constant".

### What the numbers say the answer is

Accounting for the 24px, the widest form the clock can ever show fits until the font reaches
**57.5px**, while the height allows **56.1px**. So the **height should bind** — which is what the
capability already requires, "sized as large as the space left to it allows" — and the clock on the
desktop should be about 56px rather than 41px.

Short landscape is already correct and should stay that way: its clock-wrap is 218.7x35.4, so
`92cqb = 32.6` against `22cqi = 48.1`, the height binds, and the clock fills it. Tall landscape and
both portrait seats are width-bound and have slack.

## What Changes

- **The width term is derived from measurement, not from an assumption.** The coefficient is chosen
  against the widest form a clock can actually display, at the real rendered width including
  whatever constants remain inside it, and the measurements that chose it are recorded beside it.

- **The height becomes the binding term wherever there is height to take**, which is what makes the
  clock fill the line the username vacates.

- **The 24px is dealt with rather than worked around** — removed, or expressed as a fraction of the
  clock's own font so the clock is proportional all the way through. Whichever is chosen, the
  reason is written down, because the width coefficient depends on the answer.

- **Every clock form is checked for overflow in every mode**, including the moment a clock crosses
  into tenths, which is the case the conservative coefficient was protecting against.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: `The clock is anchored and sized to the strip` already requires the clock
  to be "sized as large as the space left to it allows". This change does not alter that
  requirement — the implementation does not meet it. If anything is added it is a statement that the
  size is derived from a measured width, not an assumed one.

## Impact

- `static/bughouse.css` — `.round-app.bug .clock`'s `min(92cqb, 22cqi)`, and the `12px` paddings on
  `.clock-time.min` / `.clock-time.sec`.
- No TypeScript. No server change. Frontend gates only.
- Visible on every seat in tall landscape and portrait; short landscape should not move at all,
  which is itself a thing to verify rather than assume.
