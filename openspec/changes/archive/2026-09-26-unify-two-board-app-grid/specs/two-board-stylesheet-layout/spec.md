## ADDED Requirements

### Requirement: One name for one thing, across pages and modes

A grid area, a class or a published property SHALL have one name that is true in every mode. A mode
SHALL NOT name a slot differently from the mode beside it when the two hold the same thing.

#### Scenario: Two modes name the same slot

- **WHEN** two modes place the same occupants in the same order in a region
- **THEN** they SHALL use the same area names for it

#### Scenario: A name that describes a position

- **WHEN** a name describes where an element sits in one mode
- **AND** the element sits elsewhere, or nowhere, in another
- **THEN** the name SHALL describe what the element holds instead

### Requirement: Every named area is claimed, and every claim is named

A template SHALL NOT name an area that no element claims, and an element SHALL NOT claim an area
that no template in force declares.

#### Scenario: A claim outliving its template

- **WHEN** the last template declaring an area is removed
- **THEN** the rules claiming that area SHALL be updated or removed in the same change

#### Scenario: An element with no box

- **WHEN** an element is `display: contents` in the mode being considered
- **THEN** its claim SHALL still name a declared area, because the next mode to give it a box
  would otherwise auto-place it into an implicit track

### Requirement: One grid per page

A two-board page SHALL NOT carry a wrapper element that generates no box in any mode. Where every
mode dissolves a container, the container SHALL be removed and its children placed by the app.

#### Scenario: A wrapper dissolved everywhere

- **WHEN** the last mode that gave a wrapper a box stops doing so
- **THEN** the wrapper SHALL be deleted, and any code that measured it SHALL ask the grid instead

### Requirement: A region is measured from the template in force

Code that sizes content to a region SHALL measure that region — the rows its slots occupy in the
resolved template — and SHALL NOT substitute the page's height budget.

#### Scenario: Sizing against the budget

- **WHEN** a component is sized to fit a region
- **THEN** the height used SHALL be that region's own, not `--bug-app-h`

#### Scenario: A capability test standing in for a measurement

- **WHEN** a flag records that a template has a feature, such as a zone B
- **THEN** it SHALL NOT be used to decide whether an unrelated published value may be read
- **AND** whether that region has ROOM SHALL be asked separately
