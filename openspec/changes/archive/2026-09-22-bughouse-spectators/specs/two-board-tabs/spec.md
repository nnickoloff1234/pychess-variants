## ADDED Requirements

### Requirement: A tab may be re-labelled after construction

The shared tab widget SHALL allow a page to change one tab's label at any time after the strip has
been built, without rebuilding the strip. A label is a tab's name for a reader, and a name that has
to carry a changing quantity cannot be fixed at construction.

Re-labelling SHALL preserve everything a rebuild would disturb: the generated ids, the
`aria-controls` and `aria-labelledby` references that use them, and which tab is selected. Where a
tab is detached — absent from the strip, its parts named by `aria-label` rather than by the tab —
the new label SHALL reach that name too, so that what the strip shows and what the accessibility
tree announces cannot disagree.

#### Scenario: A label changes while the page is open

- **WHEN** a page sets a new label for a tab after construction
- **THEN** that tab shows the new text, and no id, reference or selection changes

#### Scenario: A detached tab is re-labelled

- **WHEN** the re-labelled tab is detached
- **THEN** the parts it names are announced by the new label
