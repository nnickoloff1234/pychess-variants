## ADDED Requirements

### Requirement: Both two-board pages SHALL reach their app through the same shell

The round page and the analysis page SHALL have identical structure above the app: a single
wrapper element, holding the app as its only child. Neither page SHALL carry a wrapper whose only
declarations pass a height through to the element below it.

#### Scenario: A wrapper that only relays height

- **WHEN** an element between the page wrapper and the app declares nothing but `height` and a
  track list
- **THEN** it SHALL be removed and its declarations SHALL be stated on the wrapper

#### Scenario: An app placed in its wrapper

- **WHEN** an app is placed in the page wrapper's grid
- **THEN** it SHALL claim an area that wrapper declares, and both pages' apps SHALL claim the same
  one

### Requirement: The two-board pages SHALL expose a main landmark

Each two-board page SHALL have exactly one element with the `main` role, wrapping the app.

#### Scenario: The landmark's element

- **WHEN** the page wrapper is the element that holds the app
- **THEN** it SHALL be a `<main>` element rather than a `div` carrying `role="main"`

#### Scenario: An empty landmark

- **WHEN** a landmark element — `<aside>`, `<nav>`, `<main>` — would render with no content
- **THEN** it SHALL NOT be rendered
