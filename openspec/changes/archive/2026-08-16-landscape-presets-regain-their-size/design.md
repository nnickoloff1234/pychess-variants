## Context

Three rules interact, and only their combination is wrong.

**The track is the button.** `.chatpresets-set` is
`grid-template-columns: repeat(var(--setColumns), var(--bug-preset-btn))`. Fixed tracks were
introduced deliberately: `minmax(button / 0.6, 1fr)` put the spacing inside each cell and made the
size depend on the room the row had, so a dropped part drew 41.6px buttons while its neighbour beside
the board drew 24.9px ones — the same control at two sizes on one screen.

**The floor is the only value.** `--bug-preset-btn: var(--bug-preset-btn-min)` at the top level, with
`--bug-preset-btn-min: calc(var(--bug-own-sq) * 0.55)`. The comment beside it says a mode with room
may raise it. Portrait does. Neither landscape mode does.

**The pairing is a wrap.** `.chatpresets` is `display: flex; flex-wrap: wrap` and a set is
`flex: 0 1 auto`, so two sets share a row exactly when they fit. Nothing decides four-rows-of-five;
it is what the wrap produces when a set is too wide to have company.

So the arrangement is downstream of the size, and the size is stuck at its floor.

Measured now: p1 (short landscape, 1272x551) 30.1px, parts column 382.3px, ten to a row. p3 (tall
landscape, 1590x689) 27.5px, parts column 318px (20vw). Before the fixed track, p1 drew 45.9px in
that same 382.3px column, in four rows of five.

## Goals / Non-Goals

**Goals:**

- Landscape buttons at least the size they were, and four rows of five.
- One button size per page, across parts and across drop states.
- The size follows the space, so it keeps working at window sizes nobody has opened yet.
- Portrait byte-for-byte identical in behaviour.

**Non-Goals:**

- Changing the floor. It exists for the minimum target size and is not the subject here.
- Changing which part drops when, or the drop order. Thresholds move as a consequence; the rule does not.
- Making the two sets pair in landscape. If a set fills the column, they cannot, and that is the point.

## Decisions

### 1. The size comes from the parts column, not from the part

A part is 382.3px wide beside the board and the full column wide once dropped. Sizing from the part
is what produced two sizes on one screen. The parts column, by contrast, is the same width in both
states — dropping changes which areas a part spans, not the track widths — and the chat lives in it
permanently, because the chat is the one part that never moves.

**This is not circular, and the reason is structural.** All three modes size that track with a zero
minimum:

| mode | merged column tracks |
|---|---|
| portrait | `calc(var(--bug-portrait-partner-sq) * 8) minmax(0, 1fr)` |
| short landscape | `calc(var(--bug-sq) * 8) minmax(0, 1fr)` |
| tall landscape | `calc(var(--bug-tall-sq) * 8 * var(--board-scaleB)) minmax(0, 20vw)` |

A `minmax(0, ...)` track takes no minimum from its contents, so a button can never widen the column
that decides the button. This is the same property that the layout already depends on elsewhere, and
the reason bare `1fr` is banned in this file.

### 2. Publish the width from JS; decide the policy in CSS

*Recommended.* A small module measures the parts column — the chat panel's width — and publishes
`--bug-parts-w` on the app. Each mode then states its own policy in CSS.

Alternatives considered:

- **Closed-form CSS per mode.** Exact for tall landscape, where the track is literally `20vw`. Short
  landscape and portrait are `1fr`, which would have to be re-derived as
  `100vw - (own board) - (partner board) - gaps`, duplicating the grid's arithmetic in a second
  place and needing a fudge for the scrollbar — p1's parts column measures 382.3 where that
  arithmetic gives 397.4. Duplicated track arithmetic is exactly what has rotted in this file before.
- **Revert to `1fr` tracks.** Restores the old size and the old two-sizes bug with it. Rejected.
- **A per-mode constant.** Reproduces today's numbers and nothing else; the next window size is wrong again.

The measured quantity must be the column, not a preset part, or the independence in decision 1 is lost.

### 3. What multiplier — restore the old size, or fill the column

**SETTLED: the old size, 0.6. Option B was built, tried on the page, and rejected.**

The 0.6 is not a matter of taste, which is what both options assumed when this was written. It is
what leaves room for the two sets to pair. A set is five buttons and four gaps; at 0.6 of its share
of the column it is 241.5 of a 382.3 column — too wide to have company beside the board, where the
sets stack, and narrow enough that two of them fit the 580-630px a part gets once it has dropped,
where they pair into one row of ten. Sized to fill the column instead, a set IS the column and two
of them need twice it, which no dropped width here reaches.

So option B silently removed a behaviour this layout was designed around: the presets were split
into two parts of two sets precisely so a part could expand into 1x10 on the way under the board.
With B every part stayed 2x5 wherever it went, and the extra width bought nothing. Measured on p3
with B: a dropped part 591.9 wide still drawing two rows of five.

The lesson worth keeping: the size is not free to choose, because the wrap that produces the
arrangement is downstream of it. A multiplier here is a statement about which arrangements remain
reachable.

The original comparison, kept because the trade-off it records is real:

A set of five with 3px gaps in a `W`-wide column gives `(W - 12) / 5` per button if the set fills it:
74px in p1. The old appearance was 60% of that, 45.9px, with the rest as space between.

*Recommended:* reproduce the old size — `0.6 * (W - 4 * gap) / 5` — because the request is a
regression report, and the size it names is the one that was there. Both sets still cannot pair at
that size (10 x 45.9 = 459 > 382.3), so four rows of five comes back either way.

*Alternative, recorded:* let the set fill the column. Bigger touch targets, and the row reads as one
block rather than five buttons adrift in a wide strip. Worth showing side by side before settling —
it is a one-constant difference, and only the constant is in question, not the mechanism.

## Risks / Trade-offs

- **The drop thresholds move.** A 45.9px button makes a part ~1.5x taller, so parts drop at a larger
  board than they do now. The p3 zoom sweep (74/68/64/58 today) is the instrument; the order must
  survive even though the numbers change.
- **A new measured input is a new chance to oscillate.** Mitigated by decision 1's zero-minimum
  tracks, and by measuring the column rather than anything that reacts to the button. The sweep's
  double-sample check is what proves it in practice.
- **Very narrow landscape.** If the parts column is small enough that `0.6 * (W - 12) / 5` falls
  below the floor, the floor wins and ten buttons pair again — the same arrangement portrait has.
  That is the floor doing its job, but it means the four-rows-of-five claim is about the widths this
  layout actually produces, not about all widths.
- **One more thing to keep in step on a board switch.** `--bug-own-sq` already follows the roles; the
  published width follows the column, which does not move on a switch, so the exposure is small.

## Migration Plan

1. Publish `--bug-parts-w`; assert in both landscape modes that it equals the measured chat width.
2. Raise the floor in the two landscape blocks only. Portrait's rule is not edited.
3. Re-measure p1 and p3 against the before table, and p4 against today's numbers to prove it did not move.
4. Re-run the p3 zoom sweep for the drop order.

Rollback is the two landscape declarations: remove them and the floor is the size again.

## Open Questions

- Old size or filled column (decision 3) — the constant is the user's call.
- Should the tell buttons (`OK`, `NO`, `MB`, `NVM`, `NICE`) size with the piece buttons or stay smaller?
  They are the same size today by accident of sharing a set, not by a decision.
- Does short landscape want the same policy as tall, or is 20vw narrow enough there to want its own?
