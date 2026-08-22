## Context

A preset part is a wrapping flex row (`.chatpresets`) holding two sets; a set (`.chatpresets-set`) is
a grid of five fixed tracks, one per piece, with `gap: var(--bug-preset-gap)` — 3px — and
`justify-content: flex-end`. A part beside the board is too narrow for both sets and stacks them; a
part that has dropped below the board is wide enough and pairs them on one row of ten.

Measured on p1 at 1914x827, button 45.92 everywhere:

| row | width | gaps | last five at |
| --- | --- | --- | --- |
| column, five buttons (x2) | 382.8 | 38.3, 38.3, 38.3, 38.3 | 1306.16 … 1643.03 |
| dropped, ten buttons | 887.36 | 53.52 x4, **0**, 53.52 x4 | 1199.34 … 1643.02 |

and on p4 at 386x835, button 35.4:

| row | width | gaps | last five at |
| --- | --- | --- | --- |
| column, five buttons (x2) | 218.66 | 3, 3, 3, 3 | 196.03 … |
| dropped, ten buttons | 384.03 | 3 x4, **0**, 3 x4 | 196.03 … |

Two things follow from those tables. The `0` is universal — `.chatpresets` sets no `gap`, so sets
always abut, and portrait only looks right because 0 against 3 is invisible while 0 against 53.5 is
not. And portrait's rows already share a pitch, which is why its last five land exactly under the
five above; the desktop's rows do not, because each spreads across whatever width it happens to have.

The spreading is required by the capability today: "A row SHALL spread to the width it is given …
Spreading SHALL move the spare width between the buttons." That clause is the defect's author.

## Goals / Non-Goals

**Goals:**

- One gap value at every boundary on a row, whether it falls inside a set or between two.
- One pitch shared by every row of buttons, so rows of five and rows of ten agree column by column.
- A ten-button row whose last five sit exactly under the five above it.
- Nothing about the buttons moving when a part drops or the board is resized.

**Non-Goals:**

- Changing the button size, and with it the placement decision. Out of scope in the proposal.
- Breaking a set across rows to make spacing uniform. Tried; it puts eight buttons on one row and two
  on the next, and the piece alignment the sets exist for is gone.
- Making portrait look different. It is the reference for what this should be, not a target.

## Decisions

### 1. The pitch is the unit, and the five-button row defines it

Alignment is not a separate feature to add — it is what happens for free when both rows step by the
same amount. So the ten-button row does not compute a spacing from its own width; it takes the
column's pitch and steps left with it.

Which makes the column's pitch the only thing to decide, and the answer is per mode because the modes
already differ and both are wanted:

- Desktop: five buttons and four gaps fill the parts column — `gap: calc((var(--bug-parts-w) - 5 *
  var(--bug-preset-btn)) / 4)`, which computes to 38.27 against the 38.3 that `space-between`
  produces today. The column keeps exactly the appearance it has.
- Portrait: the base `--bug-preset-gap` of 3px, unchanged, with the spare width staying in the margin
  as it does now.

That is one variable set per mode, which is the structure this file already uses for
`--bug-preset-btn`. Deriving the gap from the column in EVERY mode was tried on paper and rejected:
in portrait it computes to 10.41px against today's 3px, which would change the mode this change uses
as its reference.

### 2. The missing gap is the whole of the zero

`.chatpresets` never set `gap`, so the boundary between sets has always been zero. Setting it to the
same `--bug-preset-gap` the sets use internally makes every boundary on a row identical by
construction rather than by arithmetic — there is one value and three places it applies.

This is also the only part of the change portrait sees: its boundary goes from 0 to 3 and matches its
own internal spacing.

### 3. Right-aligned, which is also what protects the alignment

Rows are already `justify-content: flex-end`; the desktop override is what defeats it. Keeping it has
a property worth stating: the spare width collects on the LEFT, so the last set is anchored to the
row's right edge. Adding the boundary gap therefore pushes the first set left and leaves the last
five where they are — the alignment survives the fix rather than needing to be re-established after
it. Centring would break that: half the new gap would move the last five.

### 4. Why the spare width must not go between the buttons

Spreading is what the capability asks for today and it is the cause of every symptom here. Measured
as the right board shrinks and the parts drop, the gaps slide 53.52 → 38.52 → 26.52 while the button
stays 45.92 — the row rearranges continuously under a control that is not being touched. With one
pitch the same sweep changes nothing at all: same size, same gap, same alignment, and the only
difference at the reflow is which row a set is on.

Two alternatives were tried live on p1 and rejected by what they did:

- **Grow the button to fill** (45.92 → 74.16, gaps fixed): the part stopped dropping below the board
  entirely and all four sets went back into the column. Button size feeds the placement decision, so
  this is not a spacing change at all.
- **Spread all ten evenly by dissolving the sets** (`display: contents`): the dropped row became
  perfectly even at 47.57, and the column row broke into eight buttons and two, destroying the
  piece alignment. Forbidden by the same requirement this change edits.

### 5. The pitch is horizontal only, which implementation had to learn

Setting `gap` on the part applies the pitch to BOTH axes, and the vertical one is wrong: measured
38.27 between the two rows of a part against 5 between two parts, so four stacked rows grouped into
two visible pairs. The pitch answers a horizontal question — do buttons on different rows line up —
and says nothing about how far apart rows should be.

Every vertical gap is therefore the 5px that already separated one part from the next, named and used
for both the row gap and the padding that produces it so the two cannot drift apart again.

## Risks / Trade-offs

- **Pairing now costs twice the parts column.** Ten buttons at the column's pitch need 803.7px
  against the 486.2 they needed at the old tight spacing, so a dropped part narrower than that stacks
  its sets: measured, the paired arrangement survives to a part width of 823 and is gone by 783. The
  two-rows-of-ten case still works. Accepted deliberately — the alternative is a row stepping by a
  different amount from the rows above it, which is the whole defect.
- **The dropped row no longer fills its width** — 803.6 of 887.36 on p1, with 83.75 left over as
  margin. That is the trade for alignment and stability, and the leftover reads as the row being part
  of the column above it rather than as a separate ragged block. → Judge on the live page.
- **The desktop gap becomes an explicit expression** where it used to be a layout side effect, so it
  now depends on `--bug-parts-w` being right. → It is already published, already used for the button
  size, and measured stable at 382.797 across every board zoom.
- **Portrait changes by 3px** at one boundary per row. → Intended: it is the same defect, and leaving
  it would keep the rule from being general.
- **A very narrow parts column** would make the desktop gap small or negative. → The expression needs
  a floor; the base 3px is the natural one, and the button floor already bounds the other term.

## Open Questions

- Should the leftover sit entirely on the left, or should the dropped row's first set be allowed to
  run under the board's left edge? Right alignment is settled; where the row's left end falls is a
  consequence and worth a look on the page.
- Does short landscape have a dropped state at all? It was not exercised in this investigation, and
  the rule should be checked there rather than assumed.
