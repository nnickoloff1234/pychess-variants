## Context

A board's file labels are absolutely positioned by `--files-bottom`, which `extensions.css` sets to
`-16px` at `:root`, so they hang below the board and land on the seat strip beneath. On the two
mobile modes a media query listing them by name sets that variable to `0` and restyles the labels to
sit on the squares. Desktop keeps the overhang.

The height each mode has to spare is not the same quantity in each, and this is the crux:

- **Tall landscape** gives its own stack the whole app, so the spare height is
  `--bug-app-h - 10 x --bug-tall-sq-a` — measured 6.96px at full zoom, 66.96 at 91%, 156.96 at
  80%, 306.96 at 60%. The 6.96 at full zoom is precisely the quantisation remainder, which is the
  intuition this change started from and it is correct.
- **Short landscape** sizes its rows from `--bug-sq`, a tenth of the viewport, so its spare height is
  only that same remainder — measured 4.3px at 1276x551.
- **Portrait** gives the own stack a row, not the app: the partner's column takes the region above
  it, so the app's height is not this stack's budget at all.

`--bug-coord-gap` already exists — `@property`-registered, set once in the tall-landscape block to
`calc(-1 * var(--files-bottom))` — and **nothing reads it**. Its comment says `seatNamePlacement`
holds the height back through `reservedGap`; no such identifier exists. Three comments describe a
five-row template with a gap row that the current two-row template does not have.

Two live constraints bound anything built here. `seatNamePlacement` already spends spare height on
giving a username its own line, so the gap is not the only claim on it. And this codebase forbids
guard-based termination outright — a size must not be computed from anything that depends on it.

(An earlier draft recorded the stack overflowing its app by 33.66px at full zoom. It does not — that
number came from sampling during a zoom sweep before the observer had re-decided the name line.
Steady-state overflow is zero at every zoom measured.)

## Goals / Non-Goals

**Goals:**

- A gap below each board that is as large as the labels want and as small as the room allows,
  varying continuously between the two.
- Labels that stay whole at every gap size, by scaling to the gap rather than being clipped by it.
- One threshold, at zero, where coordinates move onto the squares.
- The rule stated once and answered by each mode's own numbers, rather than a list of mode names.

**Non-Goals:**

- The rank labels' gutter. They overhang sideways into a gutter that is kept for its own sake and
  contested by nothing, so the horizontal side of this is already settled.
- Any change to how `seatNamePlacement` decides. It reads the gap and is otherwise untouched.
- Changing the labels' house style. Outside the board where there is room for them, on the squares
  where there is not, which is what the two existing requirements already say separately.

## Decisions

### 1. The gap is a length computed from published sizes, not a track that resolves itself

The obvious CSS-native form is a shrinkable spacer — a flex item with `flex: 0 1 16px` inside each
stack, or a `minmax(0, 16px)` grid row — which shrinks to nothing when the container is squeezed and
needs no arithmetic at all. Two things rule it out. A grid row belongs to one grid, and the two
stacks live in different containers: the viewer's in the app's grid, the partner's in
`.bug-right-column`. A row could only ever serve one of them, which is what the existing comment at
that template already records. A flex spacer serves both, but the free space it must shrink against
lives in the app, not in the stack — the stack is content-sized — so the stack would have to be
stretched to a definite height first, making its height depend on its container while the container's
rows are sized from the stack.

Both also fail the second half of this change: a size that layout resolves for itself cannot be
asked about afterwards, and the coordinate switch needs to know whether the gap reached zero.

So the gap is a computed length:

```
--bug-coord-gap: clamp(0px, <this stack's spare height>, <the labels' overhang>)
```

with the floor of decision 3 applied. Every input is already published; nothing is measured, nothing
is observed, and the value is a plain length that both the layout and a query can read.

### 2. Each mode supplies its own spare height; the rule that consumes it is shared

The three modes do not agree on what "spare" means, as the Context sets out, and no single expression
covers them — the app's height is the own stack's budget in tall landscape and is not in portrait.
Rather than pretend otherwise, each mode publishes `--bug-coord-room` for the stacks it lays out, and
the gap expression, the label scaling and the switch are written once against that variable.

This is a shared rule with a per-mode input, which is a different thing from a special case: no mode
names another, and a fourth mode would supply its room and inherit the behaviour. It also lands
correctly for the two mobile modes without naming them, which is what the media query around the
internal-coordinate block exists to do today: their room is the quantisation remainder — 4.3px
measured in short landscape — which is below the floor, so they resolve to zero and take internal
coordinates by arithmetic instead of by being listed.

### 3. A legibility floor, because a 4px label is not a small label but an unreadable one

`min(room, overhang)` alone would give short landscape a 4.3px gap and 4.3px letters. The gap is
therefore clamped to **zero** below a floor rather than allowed to take any value between: below the
floor there is no useful external label, so the room is better returned to the strip.

Clamping to zero rather than raising a separate flag is deliberate — it keeps one variable carrying
the whole answer, which is what lets decision 4 ask a single question.

The floor is a constant tuned on the live page, not derived. **12px**, arrived at by driving
`--bug-coord-room` across the whole ramp and reading what each value produced: room 16 gives a 12px
label, 14 gives 10.5, 12 gives 9, 10 gives 7.5, 8 gives 6. The right comparison is not "is this
readable" in isolation but "is it better than what replaces it", and what replaces it is an internal
label at 0.3 of a square — 18.3px on a 61px square. Below a 12px gap the labels would be shrinking in
order to stay outside while going inside would make them twice the size, which is the wrong trade in
both directions at once. At 12 the smallest external label is 9px and still reads.

Tying the floor to the square instead was considered and rejected: at `square x 0.3` it would be
22.8px at full zoom and 18.3px at 80%, flipping desktop internal at zooms where its labels read
perfectly well.

### 4. Position needs no switch; only styling does — and the switch is written so that a missing feature degrades rather than deletes

`--files-bottom: calc(-1 * var(--bug-coord-gap))` makes the labels sit exactly in whatever gap
exists. At the full overhang they are where they are today; as the gap closes they slide up; at zero
they are on the board. The whole positional half of "internal versus external" is continuous and
needs no query, no class and no mode name.

What cannot be continuous is the styling — an on-board label needs the contrasting colour, the
in-square alignment and the padding that the existing block already defines. That is one discrete
question asked once:

```css
@container style(--bug-coord-gap: 0px) { /* the existing internal-coordinate rules */ }
```

Style queries match a custom property's value exactly, which is why decision 3 clamps to exactly
`0px`. The media query listing portrait and short landscape is then deleted, and those modes keep
their current appearance because their room resolves to zero.

**Which treatment is the default decides how this fails, and the on-square one has to be it.** The
obvious arrangement — outside by default, query switches to inside — breaks badly on a browser that
does not understand `@container style()`: the block is skipped, the outside treatment applies
everywhere, and since the gap is zero wherever there is no room, `calc(0px * 0.75)` renders every
coordinate at zero size. They vanish, on phones, which is the one place the requirement says they
must appear. Written the other way round — on the squares by default, `@container not style(...)`
moving them out — the same browser keeps every label present and readable and merely loses the
outside placement on desktop, plus an unused band under each board. The failure of a missing feature
should be that feature not helping, never the page losing something it had before the feature
existed.

The cost is that the outside treatment must now restore chessground.css's values by hand — opacity,
the rank gutter and width, the `translateY` nudge, the natural type size, weight, padding and
alignment — because an override cannot be un-done: `revert` goes to the user agent rather than to the
earlier author rule, and this file declares no cascade layers. Each restored value is a deliberate
copy and has to follow if chessground changes it.

One exception stays gated positively: the parity colours that paint a label in the other square's
colour. They are meaningless on a label out in the gap, so not applying is exactly right, and undoing
them would mean repeating sixteen five-class selectors to outrank them. A browser that ignores that
block leaves the labels inheriting the page colour on their squares — lower contrast, still visible,
the same bargain as the rest.

### 4a. A vertical margin does nothing to an inline box, which is the second time this file has paid for it

The gap is a `margin-bottom` on the board's box, and it computed correctly to 16px and moved nothing
at all. `selection` is an unknown element with no display of its own, so it is an inline box, and a
vertical margin on an inline box has no effect whatsoever.

The previous change hit the same element from the other side — a width does not apply to an inline
box either — and blockified it inside the portrait block, where that symptom appeared. The trap
belongs to the element and not to the layout, so `display: block` is now stated once for both stacks'
board boxes in every mode, and the portrait declarations are gone.

### 5. The gap is settled before names are, and the dependency runs one way

The gap and a username's extra line both want the same spare height. The gap is computed from
geometry alone — the app height and the unit, neither of which depends on a name — and
`seatNamePlacement` subtracts it from the space it believes it has. So the name decision reads the
gap and the gap never reads the name.

The alternative, letting each take what the other leaves, is two claims on one budget each measuring
the other. That is the shape this codebase rules out, and `seatNamePlacement`'s own comments record
it oscillating at roughly 12Hz the last time it compared against something that depended on the
answer.

## Risks / Trade-offs

- **Style query support.** Chrome 111+, Safari 18, Firefox 128+, and `round()` with length division
  needs comparable versions. → Resolved by construction rather than by verification: decision 4 puts
  the on-square treatment in the default so an unsupported browser degrades to it everywhere instead
  of losing its coordinates. Tested in Chrome only; the degraded path has not been seen running.
- **The floor is a tuned constant.** → Pick it on the live page across the three modes at several
  zooms, and record the measurement beside it, so the next reader knows what it was chosen against.
- **`seatNamePlacement` gets less room than it has today**, so a name that currently takes its own
  line may stop doing so at some zooms. That is the intended ordering, not a regression, but it is a
  visible change. → Record which zooms change behaviour when tuning the floor.
- **The gap is one more claim on a height `seatNamePlacement` is already spending.** Reserving it
  first means a name that takes its own line today may stop doing so. → Measured: the switch-off
  moves to between 80% and 91% zoom, and nothing overflows at any zoom.
- **A continuously scaled label re-renders at every zoom step.** It is a font size on eight elements,
  not a re-measure, so it costs nothing structurally. → No mitigation needed; noted so it is not
  mistaken for board work.

## Open Questions

- What is the legibility floor, in px? Tuning task; the starting point is half the natural label.
- Does the partner board in portrait want a gap at all? Its stack is a fifth of the viewport and its
  labels are already internal there; the arithmetic will hand it zero, and that should be confirmed
  rather than assumed.
- Should the gap also push the strip in short landscape if a future change gives that mode room? The
  rule says yes automatically. Worth a look on the live page to check it reads as an improvement
  rather than as a wobble near the threshold.
