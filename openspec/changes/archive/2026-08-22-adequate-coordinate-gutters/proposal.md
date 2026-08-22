## Why

A board's rank labels do not sit against the board they name. In the desktop
(`min-height: 600px` landscape) mode the rank labels of the left board are 8-15px away from it and
1.5px from the RIGHT board, so they read as belonging to the board they do not name — measured at
1914x825 and already recorded in `openspec/specs/bughouse-round-layout/spec.md` under *Deferred*.
Below roughly 750px of viewport height they are painted onto the right board outright. The right
board's labels do the same thing to the tools panel.

The cause is not the width of the gutter. It is where the label is put inside it. `static/bughouse.css`
restores chessground's own placement verbatim for the ranks:

```
right: var(--ranks-right);   /* -15px: the element's RIGHT edge, 15px past the board */
width: 12px;                 /* so it starts 3px past the board and runs to 15px */
text-align: right;           /* and the digit is pushed to the FAR end of those 12px */
```

Three separate reasons the digit ends up nearer the neighbour than its own board. The file labels
have none of them: their box begins at the board's bottom edge, and the only distance between the
board and a letter is what the line box leaves — a small, correct-looking amount.

So the two axes disagree about one simple thing: how far a label sits from the board it names.

## What Changes

**A label drawn outside a board sits one fixed, minimal distance from that board, the same distance
on both axes.**

- That distance is named once, as `--bug-coord-lead`, and its value is **2px** — measured, being
  what the file labels already show below the board. See design.md for the measurement.
- The rank labels are anchored from the board's RIGHT edge outward by that distance, instead of
  being anchored from 15px away and then pushed further out by `text-align: right`. They stay on
  the right edge, where they are today; only their distance from it changes.
- The rank element stops being a fixed 12px box. It becomes as wide as the digit in it, so there is
  no constant left over to drift.
- The file labels are NOT touched. They are the reference this change measures against, and they
  already look right.

**Everything else is deliberately out of scope.**

- Coordinates drawn INSIDE the squares are correct as they are and are not changed. This proposal
  concerns only the case where the labels are outside.
- The width of the gutters — between the two boards, and between the right board and the tools — is
  a separate question, to be looked at once the labels have moved and it is possible to see what is
  left over. Nothing here changes a `column-gap`.
- The rank label's font size is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: gains one requirement fixing where an external coordinate label sits
  relative to the board it names, stated once for both axes. No existing requirement changes.

## Impact

- `static/bughouse.css`, inside the `@container not style(--bug-coord-gap: 0px)` block only — the
  branch that draws labels outside the board. Four declarations on `coords.side` and its `coord`
  children.
- No TypeScript. No change to `--bug-coord-gap`, to the room arithmetic that produces it, or to the
  switch that chooses between inside and outside placement.
- Portrait and short landscape draw their coordinates inside the squares, so this block does not
  apply to them and they are unaffected.
- Side effect worth stating, measured: the ranks occupy **7px** of gutter where they occupied 15px
  (a 2px lead plus a 5.02px digit, against a 3px lead plus a 12px box), and they hug their own
  board. That hands 8px back to each seam without any gutter changing width. Whether what remains
  is enough is the deferred question, not this change's claim.
