## MODIFIED Requirements

### Requirement: The round page's tools area is a tabbed panel
The bughouse round page SHALL render the element occupying the `tools` grid area — the area that today holds only the chat — and SHALL mount the shared two-board tab widget's two parts, its panel area and its tablist, inside that element. The element is the page's own markup; the widget contributes no container of its own.

The widget SHALL present exactly three panels, in this order: **Chat**, **Moves**, **Info**. Chat SHALL be the panel shown when the page loads.

#### Scenario: The tools area holds both parts of the widget
- **WHEN** the round page is rendered
- **THEN** the element occupying the `tools` grid area is markup the page rendered, carrying the tools area's existing grid placement and layout rules, and it contains the widget's panel area and its tablist

#### Scenario: Three panels in a fixed order
- **WHEN** the tablist is rendered
- **THEN** it offers exactly three tabs labelled Chat, Moves and Info, in that order

#### Scenario: Chat is open on load
- **WHEN** the round page finishes rendering
- **THEN** the Chat panel is the visible one and its tab is the selected one, without any interaction
