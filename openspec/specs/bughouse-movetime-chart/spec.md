# bughouse-movetime-chart

## Purpose
What the bughouse analysis page's move-times chart plots, and how it is drawn. Synced 2026-08-23
from decisions taken directly rather than through a change proposal; every number quoted was
measured live against game `JJgZzLhJ`.

## Requirements

### Requirement: A clock line SHALL plot a team's clock, not a board's

Each of the two clock lines SHALL plot the total time remaining to ONE TEAM — its two seats, which
are on different boards: team 1 is white-A with black-B, team 2 is black-A with white-B. Team 1
SHALL be drawn above the axis and team 2 below.

The value MUST NOT be the sum of the two players sitting at one board. That is one player from each
team and therefore not a team quantity at all, and worse, the series it lands in is chosen by the
mover's team while the value comes from the mover's board — so a single line reports board A's total
at some plies and board B's at others. Measured before the fix: team 1's sixteen points came from
boards `a a b b a a a b b b b b b b b b`, and because the last nine plies were all on board B both
lines plotted the same number, converging at 6,477,922 against 6,471,569 — a difference of only the
6.35s between those two moves.

The team pairing SHALL come from the seat model rather than being restated as board/colour pairs.

#### Scenario: The two teams have spent different amounts of time
- **WHEN** one team has used substantially more clock than the other
- **THEN** the two lines diverge by that difference
- **AND** neither line's value depends on which board the last move was played on

### Requirement: The clock-difference line SHALL be one agreed number

The chart SHALL draw one difference line, positive when team 1 is ahead on time and negative when
team 2 is, valued at HALF the difference between the team totals.

The half is the point rather than a scaling choice: it is the number both of a team's difference
indicators would show if they agreed. The four indicators beside the clocks do not agree today —
they carry two magnitudes differing by exactly `boardA total - boardB total`, which disagreed on 29
of 32 plies in the reference game, by up to 465s. See the `bughouse-clock-record` capability.

The line SHALL have its own axis, symmetric about zero. A difference of minutes is a hairline on the
clock lines' scale of two hours, and an axis auto-scaled to a team that is always behind would put
zero at the top and draw a deficit as though it were an advantage.

#### Scenario: The teams are level
- **WHEN** the two teams have the same total time remaining
- **THEN** the difference line sits on the chart's centre line

### Requirement: Every ply SHALL draw a visible bar

A move that cost no time SHALL still draw. The think-time curve maps zero to exactly zero by
construction, so a flat floor of a fixed fraction of the panel SHALL be added to EVERY bar — not
only to the zeroes — so that the bars keep their relative order and spacing and only their starting
point changes.

The floor SHALL be solved against the panel it produces, not taken off the pre-baseline maximum:
lifting every bar also lifts the tallest one, which moves the height the fraction is measured
against.

Measured before: 10 of 32 plies drew nothing at all while the smallest bar that did draw was 11px,
so there was no gradual fade — just a hole where a move had been, indistinguishable from a move that
was missing.

#### Scenario: A premove
- **WHEN** a ply cost its player no time
- **THEN** a bar is still drawn for it, at the floor
- **AND** it is visibly shorter than every bar representing real elapsed time

### Requirement: The chart SHALL be legible against one ground

The whole chart SHALL share a single background, light enough to read a black bar against.

The two halves MUST NOT have different grounds. Measured before: the positive half was washed to
rgb(69,68,65) and a black column on it came out rgb(7,6,6) — readable — while the negative half was
rgb(13,13,11) and the same column came out rgb(1,1,1) against a nearly black backdrop. Team 2's
dark-side bars were not missing, they were invisible.

The ground SHALL be expressed as an alpha over the page rather than a resolved colour, so that it
follows the viewer's theme.

#### Scenario: A black bar below the axis
- **WHEN** a team-2 move is drawn with the dark fill
- **THEN** it is distinguishable from the chart's background

### Requirement: The chart SHALL follow the shape of its panel

The chart SHALL be drawn vertically — plies running down, teams left and right — where its panel is
taller than it is wide, and horizontally where it is not.

The RULE SHALL live in CSS, as a container query on the panel's own box, because it is a question
about a box and the stylesheet is what decides the boxes. Script SHALL only carry the answer across,
because the orientation transposes axes, bar direction, tooltip anchoring and hit areas at render
time and no stylesheet can reach that. A CSS transform MUST NOT be used: it rotates the picture,
labels and pointer geometry included.

The panel SHALL be a size container, which makes the arrangement incapable of looping — its box comes
from outside it, so nothing the chart draws can change the only input to the answer.

#### Scenario: The chart is in a tall narrow panel
- **WHEN** the panel is taller than it is wide
- **THEN** the chart is drawn vertically

#### Scenario: The panel changes shape
- **WHEN** the panel's proportions cross from taller-than-wide to wider-than-tall
- **THEN** the chart is redrawn in the other orientation without further input

### Requirement: Each bar SHALL be labelled with its move

Every bar SHALL carry the move's notation — the turn number, which board, and the SAN.

Labels SHALL be anchored to the CENTRAL AXIS, at the end each bar grows from, so that they read as
two columns either side of the centre line rather than tracking the ragged ends of bars of differing
lengths. Both alignment axes SHALL be stated, so one declaration survives the chart turning.

A label SHALL take the opposite colour to its own bar — dark on the white bars, light on the black —
so that no halo is needed behind the glyphs.

A label MUST NOT be dropped for want of room: overlapping is preferable to a chart that names some
moves and not others.

#### Scenario: Bars of very different lengths
- **WHEN** the chart is drawn
- **THEN** every label begins at the same distance from the centre line for its side

#### Scenario: A label longer than its bar
- **WHEN** a bar is shorter than the label naming it
- **THEN** the label is still drawn in full and is nudged inside the plot rather than clipped
