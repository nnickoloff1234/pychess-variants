## ADDED Requirements

### Requirement: One name for a group of parts, on both pages

A named grid area is one rectangle and holds one item, so several parts assigned the same area must
be wrapped in one element. Both two-board pages need that element, and there SHALL be one name for
it rather than one name per page.

Whether the group is a box or `display: contents` SHALL be stated per arrangement, in the mode that
needs it, and SHALL NOT be a fact about which page the group is on. A group that is a box in every
arrangement is not a group but a panel, and a group that is `display: contents` in every arrangement
SHALL be deleted — the rule the app's own wrapper was removed under.

#### Scenario: Two pages group parts for the same reason
- **WHEN** either page needs several parts to be one grid item
- **THEN** both use the same element name for the group

#### Scenario: An arrangement places the parts individually
- **WHEN** an arrangement gives each of a group's parts an area of its own
- **THEN** the group is `display: contents` in that arrangement, and the rule saying so names the
  arrangement rather than the page

#### Scenario: A group no arrangement needs
- **WHEN** no arrangement on either page gives the group itself an area
- **THEN** the group SHALL be removed and its parts placed directly

### Requirement: A part's slot is a queue position, not a property of the part

The area a part is assigned SHALL be understood as its position in the arrangement's drop queue at
the current drop state, not as a fixed attribute of the part. A rule assigning an area therefore
belongs to the arrangement — the home and the drop classes in force — and the same part SHALL be free
to occupy a differently numbered area in a different arrangement.

This is recorded so that no future change tries to replace those rules with one rule per part: a
survey of every `grid-area` declaration in the two-board stylesheets (2026-09-26) found the index
preserved in 20 buckets and shifted in 13, under three distinct rules — one page's zone A packs
upwards in queue order, zone B numbers per arrangement, and the last resort shifts every index by one
because the stack takes a row.

#### Scenario: A part moves up as parts ahead of it drop
- **WHEN** a part is assigned an area while another part has also dropped
- **THEN** the area may differ from the one it takes when it drops alone, and both rules name the
  drop state they apply to

#### Scenario: One rule per arrangement, not one per part
- **WHEN** several parts take the same area under the same arrangement
- **THEN** one rule states it for all of them, keyed on the arrangement

### Requirement: The two-board app element is reached one way

The element that is a two-board page's app SHALL be identified in one place, and every module that
needs it SHALL go through that. A module MUST NOT repeat the selector, whether as its own constant or
inline, and a module that needs to know WHICH of the two pages it is on SHALL ask that through the
same accessor rather than by testing a page class directly.

#### Scenario: A module needs the app element
- **WHEN** any two-board module looks the app element up
- **THEN** it uses the shared accessor, and the selector appears in exactly one place

#### Scenario: A behaviour differs between the two pages
- **WHEN** a shared module must behave differently on the two pages
- **THEN** page identity is asked through the same accessor, so a page added or renamed is one edit

#### Scenario: A caller passing what the default would find
- **WHEN** a shared entry point takes the app element as a parameter and a caller passes the value
  its own default would have resolved to
- **THEN** the parameter SHALL be removed
