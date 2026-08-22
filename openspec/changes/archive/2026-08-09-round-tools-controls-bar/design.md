## Context

The tools column is `div.bug-round-tools`, the page's own element since the widget stopped owning a container. It is a flex column holding `#round-tabs-tabpanels` (which takes the remaining height) and `#round-tabs-tablist` (31.85px, natural height).

The draw and resign buttons are built by `roundControls.ts`, which reads `#game-controls` by id after the page's patch and replaces it with `div.btn-controls` holding the two buttons. The page only supplies the placeholder, so moving the placeholder is the entire relocation.

## Goals / Non-Goals

**Goals:**

- The draw and resign buttons are reachable in every layout mode.
- Under pressure the tablist yields and the controls do not.
- The controls keep their natural size; they are clipped rather than compressed.

**Non-Goals:**

- Changing how the buttons are built, labelled or wired — `roundControls.ts` is untouched.
- Moving `#offer-dialog`, or anything else still in `toolsB`.
- Adding keyboard shortcuts for draw or resign.
- Deciding what else, if anything, belongs on the bar.

## Decisions

### 1. A controls bar in the page's markup, not in the widget

The tablist and the controls share a row, so something must hold them. That element is `round.ts`'s, matching the rule the previous change established: the widget contributes its two parts and nothing else. The tools column becomes:

```
div.bug-round-tools            flex column
├── #round-tabs-tabpanels      flex 1 1 auto   the open panel
└── div.bug-round-tools-bar    flex row, flex 0 0 auto
    ├── #round-tabs-tablist    flex 1 1 auto, min-width 0   yields
    └── div#game-controls      flex 0 0 auto               does not
```

### 2. The tablist becomes the flexible one

In the column the tablist was `flex: 0 0 auto`, taking its natural height. In the bar it takes the remaining *width*, so it becomes `flex: 1 1 auto` with `min-width: 0`. That `min-width: 0` is what lets it shrink past its labels' width — the same automatic-minimum-size rule that governs the column itself — and the tab labels already clip, so the yielding is visible rather than overflowing.

The controls are `flex: 0 0 auto`: they neither grow into spare space nor shrink under pressure.

### 3. Clipping is the bar's job

Once the tablist has shrunk to nothing and the controls still do not fit, the overflow has to go somewhere. The bar carries `overflow: hidden`, so the buttons are cut off at the column's edge rather than widening the grid — which is the property the whole column depends on, since this column yielding is what keeps both boards on screen.

The consequence is deliberate and worth stating: at extreme narrowness the buttons are *partly* visible rather than shrunk to illegibility. A clipped button is still recognisable and still clickable where it is drawn; a button scaled to 3px is neither.

## Risks / Trade-offs

- **The buttons can be clipped to uselessness at the narrowest widths**, which is the same regime where the tab labels are already down to a few pixels. → Accepted for now: the column is unusable at that width regardless, and the alternative is letting the controls widen the grid and push a board off screen, which is worse.
- **The desktop layout loses the controls from its `toolsB` column**, where they currently sit alone at the top right. → That column keeps `#offer-dialog`; whether it should still exist at all is a separate question this change does not open.
- **The bar is a fourth thing in a column already tuned for two.** → Its height is natural and the panel area takes what is left, so the panel simply gets shorter by the bar's height; nothing else in the column is fixed.

## Open Questions

- Whether the controls should sit before the tablist rather than after, so they are the part that stays put at the column's leading edge.
- Whether `#offer-dialog` should follow them onto the bar, since a draw offer arriving is the moment the player needs to see something.
