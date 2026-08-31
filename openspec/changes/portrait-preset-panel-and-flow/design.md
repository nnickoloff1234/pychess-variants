## Context

Portrait is a single column. The partner board and the tools share the region above, and the
viewer's own board is the row below it — `grid-template-areas` measured at one column and two
rows, 355.3px and 480.0px in a 386x835 viewport. `.bug-right-column` is a real grid there, not
`display: contents`, which is the difference that keeps every landscape-only rule away from it.

Landscape now differs in two visible ways:

1. **Panel surface.** `.chatpresets-panel` and `.bug-presets-group` are painted `--bg-color0`,
   so the ground between the buttons belongs to the panel. Portrait has an explicit rule
   setting both back to `transparent`, added at the same time and for the stated reason that
   portrait was not to change.

2. **Zones.** Landscape has `zoneA` (the width the partner board frees when scaled down) and
   `zoneB` (the full width under both boards, two slots: presets above, tab bar below), with
   `toolsPlacement.ts` choosing between them by measurement. Portrait has neither.

The measuring side is already portrait-safe. `toolsPlacement.ts` resolves the element it
measures by asking whether the named container is `display: contents`, so in portrait it
measures `.bug-right-column` itself. `seatNamePlacement.ts` and `partsWidth.ts` do the same.
Adding portrait zones therefore needs templates and droppable entries, not new machinery.

## Goals / Non-Goals

**Goals:**

- Portrait's preset block reads as one panel, the way landscape's now does.
- Portrait's preset parts have somewhere to go when the boards leave room, rather than one
  fixed arrangement regardless of space.
- Landscape is untouched.

**Non-Goals:**

- Reworking portrait's two-row shape. The partner-board-and-tools-above, own-board-below
  arrangement stays.
- Matching landscape's zone geometry for its own sake. Portrait is one column; the answer that
  suits it may be one zone, not two.
- The tab bar. Landscape moves it first because it is the cheapest thing to move; whether
  portrait should move it at all is part of the open question below, not a goal.

## Decisions

**The paint is a deletion, not an addition.** The shared rule already covers
`.chatpresets-panel, .bug-presets-group`; portrait only opts out. Removing the portrait
override is the whole of item 1, which is why it is worth almost nothing to do and worth
recording rather than doing now. Alternative considered: leave portrait deliberately different
as a density signal on a small screen — rejected, since the buttons are the same controls doing
the same job and reading them two ways is not a design, it is an accident of sequencing.

**Zones are a template question, not a mechanism question.** `place()` already toggles classes
on whichever element owns the arrangement, and portrait's owner is a real box. So portrait
needs: rows in its `grid-template-areas` for the zone(s), assignments moving the parts into
them, and portrait entries in `ROUND_DROPPABLE`. No changes to the measuring, the cumulative
order, or the class plumbing are expected.

**One zone is the likely answer, not two.** Landscape has two because it has two boards side
by side and therefore two distinct widths — the partner column, and the full width. Portrait's
tools already span the full width of the column, so the second one has no distinct meaning.
The candidate is a row under the lower board, which is where portrait actually frees space when
the boards are scaled down. To be confirmed by measurement when this is picked up.

**Reuse the fill order's shape if a second zone appears.** If portrait does end up with two
places, the tab bar goes to the lower one and the presets above it, as landscape does — the
ordering that stops the two swapping places as the boards shrink. That reasoning is orientation
independent.

## Risks / Trade-offs

- **Portrait's vertical budget is tight** → a zone that costs height competes with the boards,
  which are the point of the screen. The landscape rule (charge what the zone costs against the
  taller stack before granting it) transfers directly and should be reused rather than
  re-derived.
- **The paint could make a dense portrait panel look heavier** → it is a background, reversible
  in one line, and can be judged on screen before keeping.
- **Adding portrait entries to `ROUND_DROPPABLE` affects landscape too**, since the list is
  shared → either the entries must be inert in landscape or the list becomes orientation-aware.
  The second is the honest option if it comes to it; the first hides a mode check inside data.
- **Portrait has no drop mechanics today, so this is new behaviour, not a fix** → it can be
  scoped down to item 1 alone at any point, which is the cheap half and carries none of this
  risk.

## Open Questions

- Does portrait actually free enough height to be worth a zone, at the zoom levels people use?
  Measure before building — short landscape turned out to have no usable drop mechanics at all
  because its board row is pinned, and portrait may be the same.
- One zone under the lower board, or two as in landscape?
- Should the tab bar participate in portrait, or only the presets?
