## ADDED Requirements

### Requirement: A component SHALL declare what it needs, and the placement SHALL compare only declarations

Every component the arrangement can place SHALL declare its minimum width and height in CSS, as
`--bug-part-min-w` and `--bug-part-min-h`. The cascade SHALL compare those declarations against
the region it is considering, and SHALL NOT ask a component how large it currently happens to be.

A declaration is a constant the layout pass never writes. A measurement is not: a component's
height follows its width, its width follows where it was put, and where it was put is the decision
being taken. Measured on the analysis page, the engine panel is 90px tall in the tools column and
134px tall in a 56px implicit track, against a declared minimum of 45px — and it is the
measurement that decides, because `need` is `Math.max(measured, declared)`. Comparing the
declaration instead makes the same answer come out of every pass.

#### Scenario: A part costs the same wherever it is

- **WHEN** the cascade evaluates a part for any region, in any arrangement
- **THEN** the height and width charged SHALL be the part's declared minimums, and SHALL NOT
  depend on where the part is currently placed or on how its content currently wraps

#### Scenario: Every droppable part has a declaration

- **WHEN** a part appears in a page's `Droppable` list
- **THEN** it SHALL declare both `--bug-part-min-w` and `--bug-part-min-h`, and a part that
  declares neither SHALL NOT be treated as costing nothing

### Requirement: A component SHALL be able to live at its declared minimum

A component that declares a minimum is promising it can be drawn at that size. Where its content
wants more, it SHALL say how it gives way — scrolling, clipping, or compressing — and that SHALL
be a stated decision per component rather than an overflow nobody chose.

#### Scenario: Content exceeds the declared minimum

- **WHEN** a component is placed in a region matching its declared minimum and its content needs
  more room than that
- **THEN** the component SHALL handle the excess by its stated means, and SHALL NOT paint outside
  the area it was given

### Requirement: A component SHALL state whether its size follows its content or its container

For every component in a two-board layout it SHALL be recorded which of these it is: sized by its
content, sized by its container, or sized from a published unit. A component sized by its content
inside a container sized by its content is the shape every oscillation found so far has taken, and
SHALL be identified rather than discovered.

#### Scenario: The record exists and is checkable

- **WHEN** a component participates in a two-board layout
- **THEN** its sizing basis SHALL be recorded, and a component whose basis is unrecorded SHALL be
  treated as unreviewed rather than as safe

### Requirement: The dependency map SHALL exist before the rules are asserted

There SHALL be a written map of which components can change the size of which other components,
and which can change the grid template in force. It SHALL cover both two-board pages and every
mode, and it SHALL name, for each edge, what carries the change — a published custom property, a
class that selects a template, or a track sized by its content.

The map is the deliverable that turns the fixed oscillation into knowledge of where the others
are. Two have been found by hand so far, both in the same shape; neither was found by the survey.

#### Scenario: An edge is named rather than implied

- **WHEN** one component's size can change another's
- **THEN** the map SHALL record the pair and what carries the change between them

#### Scenario: A template switch is an edge

- **WHEN** a class written by the placement selects a different `grid-template-areas`
- **THEN** that SHALL be recorded as an edge from the placement to every component the template
  positions
