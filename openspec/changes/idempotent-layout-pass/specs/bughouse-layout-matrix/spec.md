## ADDED Requirements

### Requirement: The survey SHALL detect an arrangement that does not converge

A row's facts are taken once the page reports itself settled, and a page caught in a limit cycle
reports itself settled at every point of the orbit. The survey SHALL therefore drive the
arrangement forward on an unchanged viewport and compare the states it passes through, rather than
trusting that a page which has stopped changing between two adjacent probes has finished.

A row SHALL fail if the published state ever returns to a value it has already left, and the
failure SHALL name the orbit so the two arrangements it alternates between can be read without
re-running anything.

#### Scenario: A limit cycle is reported

- **WHEN** repeated passes on an unchanged viewport produce a state that repeats after two or more
  intermediate states
- **THEN** the row SHALL fail, and the finding SHALL list the distinct states of the orbit

#### Scenario: A converged row is silent

- **WHEN** repeated passes leave the state unchanged after the first
- **THEN** the row SHALL report no convergence finding

#### Scenario: Lag is still distinguished from a cycle

- **WHEN** the arrangement settles on a second value and stays there
- **THEN** the row SHALL report the existing stale-until-nudged finding, and SHALL NOT report a
  cycle

### Requirement: The matrix SHALL walk the two arrangements that are known to break

A defect the survey cannot reach is a defect that comes back. The matrix SHALL include the
viewport, zoom and page that reproduce each known convergence failure, so that a fix is proved by
the survey rather than by a note.

The two are the analysis page at 904x686 with board A near 72.4 and board B near 99.5, which is a
period-2 cycle; and the phone viewport reached immediately after the tools' last resort, which
settles one pass short.

The first SHALL be walked at stated zoom values rather than found by sweeping. The band is narrow,
does not fall on the zoom slider's step grid, and needs both boards off their extremes: a sweep of
one board on-grid with the other pinned at 100 steps over it, which is how it escaped two runs of
the survey's own zoom set.

#### Scenario: The oscillating shape is walked

- **WHEN** the survey runs
- **THEN** a row SHALL visit the analysis page at the shape and zoom that cycles, and SHALL apply
  the convergence check to it

#### Scenario: The lagging transition is walked

- **WHEN** the survey runs
- **THEN** a row SHALL arrive at the phone viewport directly from the last-resort viewport, and
  SHALL apply the stale-until-nudged check to it


### Requirement: The survey SHALL report a part placed into an area the template does not declare

A `grid-area` naming an area the template in force does not contain is not an error the browser
reports: the item is placed in an IMPLICIT track outside the explicit grid, drawn at whatever width
that leaves it, and every measurement taken from the template afterwards is taken from a grid that
has grown a row or a column nobody declared. The survey SHALL check, for every part it already
tracks, that the area named by its computed `grid-area` appears in the computed
`grid-template-areas`, and SHALL fail the row when it does not.

This is worth a check of its own rather than being left to the convergence check, because the
stylesheet has now produced it twice. It was diagnosed and fixed on the round page — the note above
`--bug-zones-a3` records the whole mechanism — and the analysis page reached the same class
combination with no template rule of its own and oscillated for the same reason, undetected, until
it was found by hand on the zoom sliders.

#### Scenario: An undeclared area is named

- **WHEN** a part's computed `grid-area` names an area absent from the computed
  `grid-template-areas`
- **THEN** the row SHALL fail, naming the part, the area it asked for, and the template in force

#### Scenario: Both pages are checked against their own template

- **WHEN** a class combination selects a template on one page and no rule selects one on the other
- **THEN** the page without a rule SHALL fail the check, rather than passing because its sibling
  page is correct
