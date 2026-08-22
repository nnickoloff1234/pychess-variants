## Context

**Coordinates.** `chessground.css` draws them as absolutely positioned `coords` elements:

```css
.cg-wrap coords { position: absolute; display: flex; pointer-events: none; opacity: 0.8; }
.cg-wrap coords.side   { right: var(--ranks-right); top: var(--ranks-top); height: 100%; width: 12px; }
.cg-wrap coords.bottom { bottom: var(--files-bottom); left: var(--files-left); width: 100%; height: 16px; }
```

`extensions.css` sets the placement at `:root`: `--ranks-right: -15px`, `--files-bottom: -16px`,
`--files-top: -15px`, `--ranks-left: -8px`. Negative, so the labels sit outside the board.

Because they overhang, this page reserves a track for them:

```css
--ranks-gutter: calc(-1 * var(--ranks-right));
```

with a comment explaining that without it the left board's rank labels paint onto the right board.
That track is the width this change wants back.

On phones the labels are hidden outright:

```css
@media (max-width: 799px) and (orientation: portrait) { .cg-wrap coords { display: none; } }
```

So the tightest layout has no coordinates and still pays for the arrangement that assumes them.

## Goals / Non-Goals

**Goals:**

- Coordinates that can be drawn inside the squares, legibly, at least in short landscape and portrait.
- The rank gutter reclaimed wherever coordinates are internal.
- Coordinates available on phones.
**Non-Goals:**

- Changing the coordinate glyphs, the per-variant numbering systems, or `coords` markup. Placement only.
- A user-facing setting for inside/outside coordinates. If one is wanted it is its own change.
- Anything about zoom. The cap that was proposed alongside this is dropped; see the proposal.

## Decisions

### 1. Scope the placement variables rather than redefining them at `:root`

`extensions.css` sets them globally and every board on the site reads them — lobby, analysis, editor,
puzzles. `analysis.css` and `embed.css` already override a subset, which shows the intended pattern:
override where the layout differs, do not move the default.

*Recommendation:* set the internal values on the round page's board wraps, scoped by mode, and leave
`:root` alone. Redefining `:root` would silently re-place coordinates on pages nobody looked at.

### 2. Legibility is the real work, not placement

Outside the board, a label sits on the page background. Inside, it sits on a square whose colour
alternates, and it competes with a piece. What has to be settled:

- **Colour.** The usual solution is to colour each label with the *opposite* square's colour, so it
  always contrasts with what it sits on. That means the label needs to know its square's parity,
  which `coords coord` does not currently express — a nth-child rule can supply it, since the
  elements are in board order.
- **Corner.** Ranks conventionally go top-left or top-right of their rank's first square, files
  bottom-left or bottom-right of their file's last square. Anything centred fights the piece.
- **Weight.** `font-size: 0.85em` and `opacity: 0.8` were chosen against a page background; on a
  square they will need re-picking.

*Recommendation:* prototype in one mode, judge on screen, then apply. This is a "look at it" change,
not one that can be settled from the CSS alone.

### 3. Reclaiming the gutter is what makes it worth doing

`--ranks-gutter` is a real track in short landscape. With internal coordinates it can go to zero, and
the two boards move closer by 15px each. The archived spec already records that the seam between the
boards has only 1.5px of clearance, so this change also relieves that.

The gutter must go to zero **only where the coordinates are actually internal**, or the boards will
collide with labels that are still outside.

## Risks / Trade-offs

- **The placement variables are global.** Scoping to this page is the mitigation; anything set at
  `:root` reaches pages outside this work.
- **Internal coordinates on a small board may be unreadable** — the phone board is 384px, so a square
  is 48px and a label perhaps 8px. Hiding them may still be the right answer at the very bottom of
  the range; the change should establish where that point is rather than assume it is nowhere.

## Open Questions

- Which corner, and do ranks and files agree on it?
- Should internal coordinates apply to all modes or only the tight ones? Desktop has room for the
  current arrangement, and consistency across modes has its own value.
- Is there a board size below which coordinates should still be hidden?
