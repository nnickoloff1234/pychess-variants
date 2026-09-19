## ADDED Requirements

### Requirement: A two-board rule lives in the file named for what it selects

Every rule for the two-board pages SHALL live in `static/two-boards/`, in the file whose concern its
SELECTOR names — not the file for the element's surroundings, and not the file for the mode it
applies under. A rule that selects a seat strip lives in the seats file whether it applies in
portrait or in landscape; a rule that selects a preset button inside a seat strip lives in the
presets file. Where a rule is about the RELATIONSHIP between parts — an area, a home, a drop class,
a grid template — it lives in the arrangement folder, which is the file about relationships.

#### Scenario: A component's mode variations stay with the component

- **WHEN** a rule applies to one layout mode only — a seat strip's portrait rule, say
- **THEN** it SHALL sit in that component's file, inside a media query there
- **AND** it SHALL NOT be moved to a file named for the mode

#### Scenario: The arrangement is the exception, and splits by mode

- **WHEN** a rule declares grid areas, a home, a drop class or a grid template
- **THEN** it SHALL sit in `layout/`, in the file for the mode it applies under —
  `shared.css`, `landscape.css`, `tall-landscape.css`, `short-landscape.css` or `portrait.css`

### Requirement: The load order is stated, and the cascade may not depend on anything else

`templates/base.html` SHALL load the two-board stylesheets as explicit `<link>` elements in a stated
order: `properties.css`, `page-shell.css`, `layout/`, then `components/`. A rule whose outcome
depends on losing or winning a specificity tie SHALL say so through its own selector rather than
relying on which file happens to be loaded first.

#### Scenario: A tie that was decided by source order is made explicit

- **WHEN** two rules of equal specificity disagree, and the split would place them in files whose
  order reverses the winner
- **THEN** the rule that must win SHALL be given the specificity that makes it win
- **AND** the reason SHALL be recorded beside it

### Requirement: Splitting the stylesheet changes nothing that is drawn

A change that only moves rules between files SHALL leave the rendered layout identical. The layout
survey (`tests/layout_matrix`) SHALL be run before and after each extraction, and the two runs'
`facts.json` SHALL differ in no row.

#### Scenario: A row changes after an extraction

- **WHEN** the survey's run after a move differs from the run before it in any row
- **THEN** the move SHALL be treated as having changed behaviour
- **AND** the cause SHALL be found and recorded before the extraction is committed

#### Scenario: One concern per commit

- **WHEN** the stylesheet is being split
- **THEN** each commit SHALL extract exactly one concern
- **AND** each commit SHALL carry its own survey run

### Requirement: A property says what it is, beside the properties it is used with

`properties.css` SHALL hold every `--bug-*` declaration and its `@property` registration, grouped by
how the property is used and where its value comes from — what `squareUnit.ts` publishes, what
`toolsPlacement.ts` publishes, what a part declares for the placement code to read, and what the
stylesheet computes from the others. Each property SHALL carry one or two lines saying what it is
about.

#### Scenario: A property is moved into the file

- **WHEN** a `--bug-*` declaration is moved into `properties.css`
- **THEN** it SHALL be placed in the group for where its value comes from
- **AND** it SHALL carry a line or two saying what the property is about

#### Scenario: Two properties look like one quantity

- **WHEN** the grouping shows two properties that appear to be the same quantity under two names
- **THEN** the pair SHALL be recorded for the renaming change that follows
- **AND** they SHALL NOT be merged in this change, because merging is a behaviour change

### Requirement: The page shell is its own file and states its purpose briefly

The rules that a two-board page applies to the page AROUND it — `body`, `#main-wrap`, `main.round`,
the pinning and the `overflow: hidden` — SHALL live in `page-shell.css`, which SHALL open with at
most three lines of comment saying that this is what the file is for, and SHALL hold nothing else.

#### Scenario: A rule about the page around the app

- **WHEN** a rule targets the body, the page wrapper or the page's main element
- **THEN** it SHALL live in `page-shell.css`
