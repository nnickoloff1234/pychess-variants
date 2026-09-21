## ADDED Requirements

### Requirement: A layout pass SHALL read nothing a layout pass writes

The arrangement pass — `placeStandingTab`, `place`, `publishPresetGap` and whatever a page hangs
off `onSettled` — SHALL derive its decisions only from quantities no pass assigns. The viewport,
the published square sizes, the app budget, declared CSS minimums and a part's intrinsic content
size are such quantities. The `drop-*` classes, `strip-in-zoneb`, `--bug-preset-btn`,
`--bug-preset-gap`, `--bug-app-content-h`, and any geometry that follows from them — a resolved
grid template, a part's laid-out height, the height of the tab strip where it currently sits — are
not.

This is what makes a repeated pass harmless. A pass that reads its own output is a recurrence
relation, and the arrangement it produces depends on how many times it has run and on what the
previous viewport left behind; a pass that does not is a function of the viewport, and running it
again cannot move it.

#### Scenario: A second pass changes nothing

- **WHEN** the arrangement has run on a viewport and no viewport, zoom, tab, game state or content
  has changed since
- **THEN** running the pass again SHALL produce an identical set of `drop-*` classes, an identical
  `strip-in-zoneb` state, and identical `--bug-preset-btn`, `--bug-preset-gap` and
  `--bug-app-content-h` values

#### Scenario: The arrangement never revisits a state

- **WHEN** the pass is run repeatedly on an unchanged viewport
- **THEN** the published state SHALL NOT return to a value it has already left

#### Scenario: The answer does not depend on the previous viewport

- **WHEN** a viewport is reached by resizing from any other viewport, at any zoom, in any tools
  home including the last resort
- **THEN** the arrangement SHALL be the one that viewport implies, and SHALL equal the arrangement
  reached by loading that viewport directly

### Requirement: The placement SHALL NOT read the resolved grid template

The regions a part is measured against — the tools' column width, the band's width, the region's
height, zone A's height — SHALL be derived from quantities the placement does not write. They
SHALL NOT be read back from `gridTemplateColumns` or `gridTemplateRows`, because the `drop-*`
classes the placement writes are what select the template those properties resolve to.

This is the edge that closes the loop. Measured on the analysis page at 904x686, zoom 71.0938:
`stripWidth` alternates 61.67 and 150.77 and the region's height 626.00 and 514.57, purely
according to whether the engine panel is in the tools column or in zone B — which is the decision
being taken from those numbers.

The preset button size follows from the region widths, so it inherits the same defect: publishing
it "from the widths" is not sufficient while the widths are themselves outputs.

#### Scenario: Dropping a part does not change the region a decision is taken from

- **WHEN** a part is moved between the tools column, zone A and zone B
- **THEN** the region widths and heights the next pass measures against SHALL be unchanged, and
  `--bug-preset-btn` SHALL be unchanged

#### Scenario: The WCAG floor still binds

- **WHEN** the widths available admit a button below the tap-target floor on a touch device
- **THEN** the published size SHALL be the floor, as it is today, and the arrangement SHALL give
  way instead

### Requirement: A region that cannot be measured SHALL NOT read as a region that is full

`toolsRegionHeight()` returns a non-finite value when no row of the template names a tools slot.
Every consumer SHALL test for that before using it. A comparison against a non-finite region
SHALL NOT be allowed to decide a placement, because `Math.max(0, NaN)` is `NaN` and every
comparison against it is false — a part is then refused for being unmeasurable rather than for not
fitting, which is how the measured cycle pushes the engine panel into zone B.

Where a fallback is used it SHALL be a region the tools could genuinely have. The app's whole
budget is not one: measured at 904x686 the fallback offered 626px where the tools' real region was
514.57px.

#### Scenario: An unmeasurable region refuses nothing silently

- **WHEN** the tools' region cannot be summed from the template in force
- **THEN** no placement decision SHALL be taken from that value, and the arrangement SHALL be the
  same as if the region had been computed by the means that replaces it

### Requirement: A part's cost SHALL NOT be a measurement

The cascade decides a part's placement by comparing what it needs against what a region has left.
What it needs SHALL be the part's declaration — see `two-board-component-sizing` — and SHALL NOT
be its measured height, whether measured where it sits or modelled for where it is going.

An earlier draft of this requirement said the part should be charged the height it WOULD have in
the region being considered. That is still a measurement, and it still has to be stable to be
safe. The declaration is a constant, so it is stable by construction.

#### Scenario: The same part costs the same in consecutive passes

- **WHEN** the cascade evaluates a part, applies its decision, and evaluates it again
- **THEN** the cost charged SHALL be identical in both passes, whatever the decision moved

#### Scenario: No measured box reaches a placement decision

- **WHEN** a placement decision is taken
- **THEN** no term in it SHALL derive from a part's laid-out box, its wrapped content height, or
  a track sized by that content

### Requirement: A class SHALL be cleared by every pass that cannot compute it

A class that records a placement decision SHALL be assigned on every pass, including passes in
modes whose branch does not compute it. Leaving a class standing because the branch that owns it
was skipped makes the element's state a record of which viewports the reader has visited.

#### Scenario: strip-in-zoneb does not survive into portrait

- **WHEN** the page is resized from a landscape mode that had set `strip-in-zoneb` to portrait,
  which declares no zone B
- **THEN** `strip-in-zoneb` SHALL be absent, and the class state SHALL equal the one reached by
  loading that portrait viewport directly

### Requirement: Observers SHALL be free to fire in any order and any number of times

No part of the arrangement SHALL depend on how many observers exist, which of them fired, in what
order, or whether another has already handled the same change. There SHALL be no flag, generation
counter or "already handled" bookkeeping between them; correctness SHALL rest on the pass being
idempotent instead.

#### Scenario: An extra observer is harmless

- **WHEN** an element is observed that resizes as a result of the pass's own output
- **THEN** the extra pass it triggers SHALL leave the arrangement unchanged
