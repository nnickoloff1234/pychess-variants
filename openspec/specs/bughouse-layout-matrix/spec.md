# bughouse-layout-matrix Specification

## Purpose
TBD - created by archiving change bughouse-layout-matrix-report. Update Purpose after archive.
## Requirements
### Requirement: The matrix is declared, and every combination in it is visited

The run SHALL be the product of two DECLARED lists — the viewports and the page cases — walked in
full, with nothing skipped silently. A combination that cannot be captured SHALL appear in the report
saying so and why; an absent row and a failed row SHALL NOT look the same.

THE VIEWPORTS SHALL BE CSS VIEWPORT SIZES WITH A DEVICE PIXEL RATIO, not display resolutions. The
layout branches on the viewport, and a 1080p display gives a page about 955px tall — testing 1080
tests a shape nobody has.

The list SHALL span both sides of every threshold the stylesheet branches on: the portrait cut-off,
the 600px zoom floor, and the width at which the tools lose their column. A list that covers only
comfortable shapes tests only the case that was already working.

#### Scenario: Every declared combination appears
- **WHEN** the run finishes
- **THEN** the report has one row per viewport, case and zoom combination declared
- **AND** a combination that could not be captured says so, with its reason

### Requirement: A screenshot without its arrangement is not evidence

Every screenshot SHALL be accompanied by the arrangement that produced it: the mode, the tools' home,
the drop classes standing, the grid template as computed, what occupies each named area, and the
values the sizing logic published.

WITHOUT THIS A REPORT IS 264 PICTURES AND NO DIAGNOSIS. The question a reader has is never "does this
look wrong" alone — it is "which rule decided this", because that is the thing that can be changed.
It is also what makes two runs comparable when the pictures differ by a pixel.

AREA OCCUPANCY SHALL BE PROBED, NOT INFERRED. A named area's box is not its row's box and not its
occupant's box; reading it off the template gives an answer that is right until it is not.

THE MODE SHALL BE READ FROM THE PAGE'S OWN MEDIA QUERIES, and the zoom-capability question asked of
the same query the page asks. A second copy of a threshold is a second thing to drift.

#### Scenario: A row explains itself
- **WHEN** a reader opens the report at any row
- **THEN** it states the viewport, mode, home, arrangement classes, template, area occupancy and
  published sizing values for that screenshot

### Requirement: One game serves the whole matrix

The driver SHALL play ONE game and order the cases around it: every during-game case at every
viewport, then the resignation, then every after-game case, then analysis.

A GAME PER COMBINATION WOULD BE THE OBVIOUS SHAPE AND THE WRONG ONE. Bughouse needs four seats, so a
game costs a seek, four joins and a redirect; multiplied across the matrix that dominates the run and
adds a failure mode — a flaky seat join — to every row rather than to one.

THE PARTNER CONTEXT SHALL STAY CONNECTED FOR THE WHOLE RUN. A disconnected client ends a bughouse
game after about a minute, and the walk takes several. Only the camera context is resized, navigated
or reloaded.

#### Scenario: The during-game cases share a game
- **WHEN** the round-page during-game cases are captured across every viewport
- **THEN** one game served all of them
- **AND** it was still live at the last of them

### Requirement: Zoom is exercised exactly where zoom exists

Where the page allows the reader to zoom the boards, each case SHALL be captured at three
combinations of the two boards' zoom: both at full, the right board alone reduced, and both reduced.

WHERE IT DOES NOT, NO ZOOM ROW SHALL BE PRODUCED. The mobile modes size their boards to fill a fixed
budget and have no slider at all; a zoom row there would report a difference that cannot happen and
would triple a third of the matrix for nothing.

The two boards SHALL be zoomed INDEPENDENTLY, and the asymmetric combination SHALL be among the
three. Independent zoom is what makes the two boards' squares diverge, which is what zone A is
measured from and what the tools' cascade decides on.

#### Scenario: A zoom-capable viewport is captured three times
- **WHEN** a viewport allows zoom
- **THEN** each of its cases appears at 100/100, 100/50 and 50/50

#### Scenario: A mobile viewport is captured once
- **WHEN** a viewport does not allow zoom
- **THEN** each of its cases appears once, with no zoom rows

### Requirement: The report fails the checks it can make itself

The driver SHALL test each captured state for the defects it can detect mechanically, and mark the
rows that fail: page overflow on either axis, stacks or boards overlapping, an interactive control
covered by another element, a declared area standing empty while parts are placed elsewhere, and a
panel overflowing its area.

A COVERED CONTROL SHALL BE TESTED BY HIT TEST, at the centre of the chat input, each visible tab,
each end-of-game button and each resize handle. Looking at a screenshot does not show it: an element
painted over a control is invisible when it has no background of its own, and the control looks
perfectly normal right up until it is clicked. Both of the covering defects this capability has
shipped were of exactly that kind.

A FAILING CHECK SHALL NOT STOP THE RUN. The matrix is a survey; one bad viewport must not hide the
twenty after it.

THE CHECKS ARE A TRIAGE AID, NOT A VERDICT. A marked row is a place to look, and an unmarked row is
not a guarantee: on the first full run some marks were false positives and some real defects went
unmarked. That is expected of a first cut and is not a reason to trust the report less than the
screenshots beside it — it is a reason to keep the SCREENSHOT the primary evidence and the check a
pointer to it. Sharpening the judgements is continuing work, done in passing while the survey is
used, and no run's output SHALL be read as an assertion that the unmarked rows are correct.

#### Scenario: A covered control is caught
- **WHEN** an element is painted over an interactive control at any viewport
- **THEN** that row is marked failing, naming the control and what covers it

#### Scenario: One failure does not end the survey
- **WHEN** a check fails at one combination
- **THEN** the remaining combinations are still captured

