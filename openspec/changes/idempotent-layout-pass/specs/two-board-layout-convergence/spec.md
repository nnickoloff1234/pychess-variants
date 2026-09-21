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

### Requirement: The preset button size SHALL be a function of widths alone

One preset button size is published for the whole page and both regions a preset panel can occupy
— the strip beside the board, five to a row, and a dropped row spanning the partner's column and
the tools' together, ten to a row. The size SHALL be computed from those two WIDTHS, both of which
are known before any placement decision, and SHALL NOT be computed from the height of a region
whose rows the placement decisions add or remove.

A height input is what closes the loop: the tab strip's row is inside the tools region, dropping
the strip removes it, the region shrinks, and a size computed from the region changes underneath
the decision that caused it.

#### Scenario: Dropping a part does not resize the buttons

- **WHEN** any part is moved between the tools column, zone A and zone B
- **THEN** `--bug-preset-btn` SHALL be unchanged

#### Scenario: The WCAG floor still binds

- **WHEN** the widths available admit a button below the tap-target floor on a touch device
- **THEN** the published size SHALL be the floor, as it is today, and the arrangement SHALL give
  way instead

### Requirement: A part SHALL be charged what it would cost where it is being considered

The cascade decides a part's placement by comparing what it needs against what a region has left.
That need SHALL be the height the part would have IN THE REGION BEING CONSIDERED, computed from
the part's content and the published sizes. It SHALL NOT be the part's currently laid-out height,
which is a function of where the previous pass put it.

#### Scenario: A preset panel is charged its dropped height

- **WHEN** a preset panel that is currently two rows of five in the strip is considered for a
  dropped row of ten
- **THEN** the height charged SHALL be the one-row height, not the two-row height it has now

#### Scenario: The tab strip is charged its own height

- **WHEN** the strip is considered for zone B
- **THEN** the height charged SHALL be the strip's content height wherever the strip currently
  sits, and SHALL NOT include a row it has been stretched into

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
