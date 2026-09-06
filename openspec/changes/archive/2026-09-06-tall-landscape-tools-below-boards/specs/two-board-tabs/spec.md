## ADDED Requirements

### Requirement: A tab may be detached from the tablist and shown permanently

The widget SHALL support a tab being **detached**: absent from the tablist, its parts always
displayed, and its visibility not governed by which tab is selected. Detachment SHALL be settable at
construction and changeable at runtime, in both directions, so that a page may detach a tab when it
has somewhere to put it and re-attach it when it does not.

This is a general capability of the widget, not a property of any one panel. A page with room to
show a panel permanently — beside the boards, under them, in a region another element has freed —
SHALL be able to take it out of the strip and give it that room, and SHALL be able to put it back
when the room goes away.

DETACHING SHALL NOT MOVE A PANEL. The widget contributes no container and makes no assumption about
where a part is mounted; where a detached panel appears is the page's placement decision, expressed
as it already expresses every other placement. Detachment governs only whether the strip decides the
panel's visibility, and whether the tab is offered in the strip.

SELECTION SHALL BE PRESERVED ACROSS BOTH TRANSITIONS. Attaching a tab SHALL select it, so that the
panel already on screen stays on screen and the reader is not moved. Detaching the SELECTED tab
SHALL move selection to another attached tab, so that the strip is never left with nothing shown.

POSITIONS SHALL NOT RENUMBER. A tab's index, and therefore every id generated from it, SHALL be
unchanged by detaching or attaching; the tablist renders a subset of the tabs, and a subset is not a
renumbering. A page holding a reference to a part SHALL keep it across both transitions.

A DETACHED PANEL IS NOT A TABPANEL. Its tab is not rendered, so `role="tabpanel"` and an
`aria-labelledby` pointing at an element that does not exist would both be false. A detached part
SHALL instead be exposed as a region named by its tab's label, and SHALL resume being a tabpanel
when the tab is attached again.

#### Scenario: A detached tab is not offered in the strip
- **WHEN** a tab is detached
- **THEN** the tablist renders no tab for it
- **AND** its parts are displayed
- **AND** selecting any other tab leaves them displayed

#### Scenario: The tab comes back
- **WHEN** a detached tab is attached
- **THEN** the tablist renders it at its declared position
- **AND** it becomes the selected tab, so its parts stay on screen and every other tab's parts are hidden

#### Scenario: Detaching the tab that was selected
- **WHEN** the selected tab is detached
- **THEN** another attached tab becomes selected and its parts are shown
- **AND** the detached tab's parts remain displayed

#### Scenario: Nothing is created or destroyed
- **WHEN** a tab is detached and attached repeatedly
- **THEN** no panel element is created, destroyed or reparented
- **AND** a reference to a part obtained before the first transition still addresses the same part

#### Scenario: Ids are stable
- **WHEN** a tab is detached
- **THEN** the ids generated for every tab and panel are the same as before, including its own

#### Scenario: A detached part is named without a tab
- **WHEN** a detached part's markup is inspected
- **THEN** it does not claim `role="tabpanel"` and does not reference a tab element that is not rendered
- **AND** it carries an accessible name taken from its tab's label
