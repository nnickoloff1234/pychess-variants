## Context

Both opening items are the same shape: a widget that appears on the round page and the analysis page
is styled for the round page only. That is not an accident of either item — it is what happens when
a page's rules are scoped to its own app class and a second page starts using the same widget.

**Item 1, measured on p1 (1276x551, landscape-short) at 100% zoom, game `JJgZzLhJ`:**

| what | value |
|:--|:--|
| `--bug-coord-gap` on `.analysis-app.bug` | `0px` |
| `coords.bottom` | `bottom: -16px` — below the board |
| `coord` font size | `11.9px` (chessground default) |
| `coords` opacity | `0.8` (chessground default) |
| rules scoped `.round-app.bug …coord…` | 35 |
| rules scoped `.analysis-app.bug …coord…` | **0** |

The variable is the interesting part. `--bug-coord-gap: 0px` is exactly the signal the round page
acts on: zero room means the labels go on the squares. The analysis page computes the same zero and
does nothing with it, because every rule that reads it names the other page.

**Item 2, same window:**

| what | value |
|:--|:--|
| movelist element width | 284px |
| `clientWidth` | 276px (vertical scrollbar takes 8) |
| `scrollWidth` | **281px** |
| `move-bug` cell | `flex: 0 0 calc(25% - 3ch)`, `max-width` the same, `white-space: nowrap` |
| cell box width | 43px |
| cell `scrollWidth` for long moves | 47px, 45px, 53px |

No child extends past the container's right edge, so this is not a row that is too wide: it is
individual cells whose *content* is wider than the box they were given, with nothing to clip it.
`overflow-x` computes to `auto` because `overflow-y` is `auto` and a visible/auto pair is not
allowed, so the spill becomes a scrollbar.

**Why the round page appears not to have it.** The same `move-bug` rules apply there — this is the
shared widget, not an analysis-page copy — so the defect is latent on both. The round page's
movelist column is wider, and above 800px it also shrinks the font to `0.68vw`, so its cells more
often contain what they were given. It is a difference of degree, and the fix belongs to the widget.

## Goals / Non-Goals

**Goals:**

- The analysis page and the round page treat a shared widget identically, by SHARING the rules.
- The movelist fits the width it is given, in every place it is rendered and at every font size.
- Each item is closed on its own, with the measurement that identified it recorded next to it.

**Non-Goals:**

- Redesigning either widget. Coordinates and the movelist both look right on the round page; the
  work is making the other page agree.
- Changing behaviour, layout arithmetic, or anything either page does deliberately.
- Closing the list. This change is expected to grow and is not finished when items 1 and 2 are.

## Decisions

### Decision 1: Widen the existing selectors, never copy the block

The coordinate treatment is 35 rules including a sixteen-selector parity block that colours each
label by the square it sits on. Duplicating that under `.analysis-app.bug` would double a body of
CSS whose whole difficulty is that it has to stay internally consistent — and the two copies would
drift on the first change to either.

The mechanical form is to add the analysis page to each selector list, or to introduce one shared
class or `:is()` group that both app classes resolve to. Which of the two is a matter of how the
file reads afterwards, and is settled when the work is done rather than argued here.

### Decision 2: The movelist is fixed at the cell, not at the container

Hiding the container's horizontal overflow would remove the scrollbar and keep the defect: a long
move would still be cut mid-glyph at an arbitrary point with no indication. The cell is where the
constraint belongs — it already declares a width and `nowrap`, so it should also say what happens
when its content does not fit.

That is a decision about what a too-long move looks like, not merely about clipping. It is the one
question in this item and it is listed as open below.

### Decision 3: Items carry their measurement

Every item states the numbers that identify it, in the mode they were taken in. A cosmetic defect
without a measurement is a matter of taste and cannot be verified as fixed; with one, "the movelist
takes a horizontal scrollbar" becomes `scrollWidth 281 against clientWidth 276`, which is either
true afterwards or is not.

## Risks / Trade-offs

- **[Widening a selector applies 35 rules to a page that has never had them]** → The coordinate
  treatment reads `--bug-coord-gap`, which the analysis page already computes. Verify in all three
  layout modes and at more than one zoom, since the whole point of the variable is that the answer
  changes with available room.
- **[The parity colouring depends on `@container style()`]** → The round page's block is written so
  that a browser without support keeps labels on the squares in the page colour rather than losing
  them. Extending it must preserve that polarity, not merely the selectors.
- **[A standing list becomes a place things go to be forgotten]** → Items are closed individually
  and the change is archived when the list is closed, not when the last item happens to be done.
- **[Fixing the cell changes the round page too]** → It should: the defect is in the shared widget
  and is latent there. That page must be re-checked, not assumed unaffected.

## Open Questions

- What does a move that does not fit its cell look like — clipped, ellipsised, or scaled down? The
  cells are narrow (43px measured) and a move can be five characters plus a check mark.
- Should the movelist's font follow its container the way the round page's does above 800px? That
  would make cells fit by making the text smaller, which is a different answer to the same question
  and may make the cell rule unnecessary in practice — though not in principle.
- Shared rules between the two pages: one `:is()` group, or a shared class on both app roots? The
  second is tidier and touches the markup.
