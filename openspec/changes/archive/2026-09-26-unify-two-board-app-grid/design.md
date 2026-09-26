## Context

Two decisions shape a two-board page, and keeping them apart is most of understanding the code:

```
viewport  →  squareUnit.arrangement()  →  a home class      a-priori, arithmetic, no measurement
                                              ↓
                                      CSS picks a template family
                                              ↓
             toolsPlacement.place()  →  drop classes        measured, after layout
                                              ↓
                                      CSS swaps the template
                                              ↓
                                   ResizeObserver → measure again
```

The home says which region the tools are meant to get; `place()` says which parts actually make it
there. Neither half states the arrangement: a layout is the fixed point of a loop between two
languages, and the JS reads the CSS back — `gridTemplateAreas` to learn the mode, and
`gridTemplateColumns` to recover a track's width.

That loop is fine. What was not fine is that each mode had private structure, names and
measurements inside it, so the same question had three answers depending on where it was asked.

## Goals / Non-Goals

**Goals:**

- One name per thing, across pages and modes.
- One grid per page: no element that is `display: contents` in every mode.
- Every region measured from the template in force, never from the page's budget.
- No template names an area nothing claims; no element claims an area no template names.

**Non-Goals:**

- Fixing the drop decision. It is the next change and it is named in the proposal.
- Zone B's sizing. A full-width row under both boards is a different region with a different width.
- The `drop-p1` / `drop-p2` / `drop-tablist` class names, which name the PART that drops rather
  than where it lands — a separate rename that reaches the droppable lists.

## Decisions

### Decision 1: `zoneTools1..4` wins over `chat / p1 / p2 / tablist`

They were the same four slots, occupant for occupant, which the survey shows directly: the tab
panel, the first preset set with the end-of-game controls, the second set, the tools bar — in that
order, under both vocabularies. `zoneTools*` wins because it is page-neutral and both pages already
used it in both landscape modes, while `chat`, `p1` and `p2` named things the analysis page does
not have. A comment in `portrait.css` used to say so, which is a name failing and prose
apologising for it.

### Decision 2: the wrapper goes, rather than being dissolved and kept

Once portrait dissolved `.partner-and-tools`, its whole stylesheet presence was one declaration —
`display: contents` — and it earned nothing else. The contrast that settles it: `.bug-parts` is
also `display: contents` in every mode and earns its keep in 73 selectors as a scope;
`.partner-and-tools` had none left. Deleting it also removed a conditional: `seatNamePlacement`
carried a dissolved-or-not branch that existed only because the element was a box in one mode.

### Decision 3: `hasZoneB`, not `isZoneBAvailable`

It tests that the template in force names a zone B. It says nothing about ROOM, and "available"
implies room — which is `budgetForZones(app) − tallestStack(app)`, asked separately at each site
that charges a part. Of its four uses, three pair the capability with a size test; the fourth was
not about zone B at all and is Decision 4.

### Decision 4: a capability test is not a budget test

`budget = flattened ? --bug-app-h : NaN` asked "does this template have a zone B" to decide whether
a published height could be trusted. `--bug-app-h` is published unconditionally for every mode, so
there was nothing to gate. The cost fell on the mode the gate excluded: portrait measured its
container instead, and when the merged column was dissolved that container became the app.

### Decision 5: the tools' region, not the page's budget

`--bug-app-h` is the viewport less the header — what the whole page has to spend, boards included.
The tools have never had it: their region follows the boards, the boards follow the zoom, and in
portrait it is the block beside the partner board with the viewer's whole board below it. Sizing
against the budget meant `min(byWidth, byHeight)` never bound on height, so width alone decided —
and width, in the strip, gives exactly the size that cannot pair into one wide row later.

`toolsRegionHeight()` counts the rows whose cells name a `zoneTools*` or a `zoneA*` slot. Both,
because they are one region in two drop states, which keeps the measurement stable as parts drop.

### Decision 6: one grid per page is what makes the rest possible

Every correction above became available once the app was the only grid. The container parameter
had one caller, the dissolved-or-not branch had one answer, and `rowsSpanned()` — the rows an item
occupies, read from the resolved template — replaced two different box measurements with one
question that needs no mode test.

## Risks / Trade-offs

- **[Portrait now drops, and drops wrongly]** → fourteen rows carry an overlap. Accepted
  deliberately: the dissolve is what exposed the budget fault, and the fault is the next change.
  Sizing the presets correctly halved the damage without touching the cause.
- **[The JS reads the CSS back]** → unchanged by this work, and still the reason no single place
  states the arrangement. Worth revisiting only with a design that owns a candidate arrangement.

## Open Questions

- Should the chat's minimum be subtracted before sizing at all, or may the chat disappear when
  there is no room?
- Should height enter the sizing of a part that is NOT dropping? Width is usually the limit.
- If a height matters, is it zone A's or zone B's — and the test is whether a usable tap target
  fits one row of ten, or of twenty in a zone B.
