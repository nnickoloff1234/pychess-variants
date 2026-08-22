## Context

Chessground renders one element per coordinate axis, absolutely positioned inside `.cg-wrap`:

```html
<coords class="side">   <coord>8</coord> <coord>7</coord> …   <!-- ranks, right of the board -->
<coords class="bottom"> <coord>a</coord> <coord>b</coord> …   <!-- files, below the board -->
```

`static/chessground.css` gives `coords.side` `position: absolute; height: 100%; width: 12px;
right: var(--ranks-right)`, with each `coord` a `flex: 1 1 auto` item in a column. So the ranks are
one box holding eight cells, anchored by its RIGHT edge.

`static/bughouse.css` has two branches, selected by whether `--bug-coord-gap` is zero: labels inside
the squares, or labels outside the board. Only the outside branch is in scope here.

In that branch the two axes are placed by different logic:

| | file labels | rank labels |
|---|---|---|
| anchored from | the board's bottom edge (`bottom: calc(-1 * --bug-coord-gap)`, box height `--bug-coord-gap`) | 15px past the board's right edge (`right: -15px`, box width `12px`) |
| aligned | centred in the box | `text-align: right` — pushed to the far end |
| distance to the board | whatever the line box leaves, a small amount | 3px of box, plus the whole right-aligned remainder |

`--ranks-right: -15px` and `width: 12px` come from `static/extensions.css` and `chessground.css` and
predate this page's coordinate scheme. They were restored verbatim when the outside branch was
written, and never reconciled with the file placement beside them.

## Goals / Non-Goals

**Goals:**

- One named distance between a board's edge and its external labels, used on both axes.
- Its value is the distance the file labels currently show, measured rather than chosen.
- The rank digit is nearer its own board than anything else.
- No constant left in the rank placement that can drift from the file placement.

**Non-Goals:**

- Coordinates drawn inside the squares. They are correct and are not touched.
- Any `column-gap`. What is left of a gutter once the labels have moved is a separate question, and
  cannot honestly be answered before this change is on the page and can be looked at.
- The rank label's font size, and the machinery that produces `--bug-coord-gap`.
- The file labels' placement. They are the reference.

## Decisions

### 1. Anchor the ranks from the board's edge, not from a distance past it

```css
.round-app.bug .cg-wrap coords.side {
    left: calc(100% + var(--bug-coord-lead));
    right: auto;
    width: max-content;
}
.round-app.bug .cg-wrap coords.side coord {
    text-align: left;
}
```

`coords.side` is `position: absolute` inside `.cg-wrap`, so `left: 100%` IS the board's right edge.
Adding the lead to it states the wanted distance directly: the box begins exactly
`--bug-coord-lead` past the board and the digit begins at the start of the box. `right: auto` is
required to release chessground's own anchor — without it both edges are constrained and the width
is ignored.

`width: max-content` retires the 12px. The box becomes exactly as wide as the widest digit in it, so
there is no slack for `text-align` to push a digit across and no constant to keep in step with
anything. `text-align: left` is then belt-and-braces on an 8x8 board, where every rank digit is the
same width; it is declared anyway so the intent survives a board with a two-character rank.

`--ranks-right` stops being read on this page. It is left at its `:root` value for the rest of the
site, and the rule carries a comment saying this page no longer positions from it.

*Alternative considered: keep `right: var(--ranks-right)` and just change the number.* Rejected —
it keeps the anchor on the wrong edge, so the distance to the board is `-ranks-right` minus the box
width minus whatever alignment leaves, which is three numbers that have to agree instead of one that
says what is meant.

### 2. The lead is 2px, measured, and the file labels are not touched to get it

**The measurement.** A replica of the board box was built in the live page — same browser, same
device pixel ratio (1.5), driven by the real `chessground.css`, `extensions.css` and `bughouse.css`,
with `--bug-coord-room` fed in so the page's own formula produced the gap rather than a number being
asserted. The file box's top edge measured at exactly **0px** from the board's bottom edge,
confirming it is flush, and the ink tops of the letters measured:

| `--bug-coord-gap` | file font | `b d f h` (ascenders) | `a c e g` (x-height) |
|---|---|---|---|
| 16px | 12px | **2.00px** | 5.00px |
| 15px | 11.25px | 3.00px | 5.00px |
| 14px | 10.5px | 3.33px | 5.33px |
| 13px | 9.75px | 2.00px | 4.00px |
| 12px | 9px | 2.33px | 4.33px |

**The lead is 2px**, the ascender distance at a 16px gap. Three reasons that row is the one to read:

- 16px is the gap in practice. The room is roughly `--bug-app-h x (1 - zoom)`, so in a 767px app it
  is 6.96px at full zoom — below the 12px floor, no external labels at all — and past 16px within
  about 2% of zoom. The 12-15px band is a sliver of the slider; below it the labels are inside.
- The ascender letters are the reference because they are the *minimum* the files show, and minimal
  is what is wanted. Matching `a c e g` would put the rank digits 5px out, visibly further than the
  file letters that reach highest.
- The variation across the band is 2-3.33px, under one and a half pixels. A constant is honest at
  that spread.

**Verified against the proposed rule, not just predicted.** With
`left: calc(100% + 2px); right: auto; width: max-content` and `text-align: left` applied to the
replica, the rank box measured **2.000px** from the board's right edge and **5.021px** wide — one
digit exactly — and the digits' ink measured **2.000px** from the board. Digits in this font stack
have a zero left side bearing at these sizes, so the box edge and the ink edge coincide. Before the
change the same replica put the rank ink at **9.979px** from its own board.

**Why the file labels are not changed to declare the same 2px.** The 2px is emergent — the box is
flush and the space is `line-height: normal` half-leading over type at `0.75 x --bug-coord-gap`. It
could be made explicit, but only by moving the file labels to match a number taken from where they
already are, and by spending the reserved gap differently: the box height IS the room the layout set
aside, so taking a lead out of it makes the letters smaller. The comment records that the constant
came from the files and that the files were deliberately left alone, so the direction of the
dependency is visible.

**One thing the replica could not settle.** The rank labels' font size is `0.85em` of `coords`,
which is itself `0.85em` — so it depends on the font size inherited into `.cg-wrap`, which on the
lobby page (12.15px, giving an 8.78px digit) is not necessarily the round page's. That affects how
big the digit is, not how far out it sits: the lead is a length and `width: max-content` follows
whatever size the digit turns out to be. It is the one number to re-read on a real round page.

*Alternative considered: give the files an explicit lead too, so both are declared.* Rejected for
this change, for the reason above. Worth revisiting only if the lead ever needs to stop being a
constant.

### 3. Nothing outside the outside-labels branch changes

The whole change lives inside `@container not style(--bug-coord-gap: 0px)`. The inside branch, the
room arithmetic, the legibility floor, and the switch between the two are untouched, so portrait and
short landscape — which are always on the inside branch — cannot be affected.

## Risks / Trade-offs

**The digit may read as cramped against the board edge at 2px.** → It is exactly the distance the
file ascenders have, and those do not. But 2px of *horizontal* air beside a digit is not obviously
the same to the eye as 2px of vertical air above a letter, and the measurement cannot settle that.
If it reads tight on the page, the lead is the one number to change and it is named.

**`width: max-content` on an absolutely positioned flex column is less obvious than a fixed width.**
→ It is what the inside branch already does (`width: auto`), so the pattern is not new to this file,
and it measured at 5.021px against a 5.014px digit advance — exactly one digit, no slack.

**The gutters are left as they are.** → Intentional, and it costs nothing: the ranks measured a 7px
footprint against the old 15px, so each seam gains 8px and the digits sit against their own board.
At the 1914x825 case the *Deferred* note records, that turns 1.5px of clearance into 9.5px without a
gutter moving. Whether that is *adequate* is the open question below.

## Open Questions

1. **What is left of the gutter, and is it enough?** The arithmetic says 8px more than today at every
   size, and 9.5px of clearance where the *Deferred* note measured 1.5px. Whether that reads as
   adequate separation is to be answered by looking at the page after this change, at several
   viewport sizes and zooms — not before. The two seams may want different
   answers: a player reads across the board-to-board seam constantly and wants the boards close,
   while the board-to-tools seam is a boundary between different kinds of thing.
2. **`--ranks-gutter` in the short landscape block** is `calc(-1 * var(--ranks-right))` — 15px, named
   after a label overhang that mode no longer has, since its labels are inside the squares. It is a
   separation now and the name says otherwise. Left alone here to keep this change to one thing;
   worth renaming whenever question 1 is picked up.
