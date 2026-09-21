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
