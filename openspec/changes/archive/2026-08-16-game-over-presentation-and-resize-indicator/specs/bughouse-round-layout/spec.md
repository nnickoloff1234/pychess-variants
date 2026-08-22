## ADDED Requirements

### Requirement: A board offers a resize handle only where resizing works

A board SHALL render its resize handle only in a mode where dragging it changes the board's size.

Where a mode derives its board size from something other than the zoom setting — as short
landscape does, sizing from the height-derived square with no zoom factor in the track — the
handle SHALL NOT be shown, and SHALL NOT be draggable.

This SHALL be decided per layout mode rather than per viewport width. The shared rule that shows
the handle above a fixed viewport width is the reason a mode that ignores zoom still displays it.

#### Scenario: Short landscape shows no handle
- **WHEN** the round page is displayed in short landscape
- **THEN** neither board renders a visible resize handle, and there is nothing in the board's bottom-right corner to drag

#### Scenario: The handle stays where it works
- **WHEN** the round page is displayed in tall landscape
- **THEN** each board renders its resize handle, and dragging it changes that board's size

#### Scenario: Hiding the handle does not disable zoom
- **WHEN** a mode that hides the handle is displayed and the zoom setting is changed by other means
- **THEN** the setting is stored as it always was; only the handle is absent

### Requirement: The end-of-game controls sit with the tab parts

When a game has finished, the controls it offers — rematch, a new opponent, the analysis board —
SHALL be placed among the tab parts, in the region the parts occupy.

They SHALL NOT be placed in the strip that holds the in-game controls. That strip is sized for
Draw and Resign and shares its row with the tab list; the end-of-game controls are wide text
buttons and replacing the in-game controls with them is what puts them there today.

The in-game controls SHALL remain in their own strip and SHALL simply no longer be offered once
they no longer apply.

The controls SHALL be **stacked, one above the next**, and each SHALL span the width it is given.
They SHALL share a row only where the height available will not hold them stacked — pairing is the
fallback, not the arrangement.

There SHALL be a visible gap between the topmost control and whatever part sits above it, so the
buttons do not read as a continuation of the panel above them.

#### Scenario: They are not in the control strip
- **WHEN** a game finishes
- **THEN** the rematch, new opponent and analysis controls are inside the region the tab parts occupy, and none of them is inside the strip that held Draw and Resign

#### Scenario: The in-game controls give way
- **WHEN** a game finishes
- **THEN** Draw and Resign are no longer offered, and the strip that held them does not hold the end-of-game controls in their place

#### Scenario: They stack by default
- **WHEN** a game finishes and the region holding the controls has room for them stacked
- **THEN** each control is on its own row, spanning the width of that region, whatever the layout mode

#### Scenario: They pair only when they must
- **WHEN** the height available will not hold all of them stacked
- **THEN** they occupy more than one column, sharing the width evenly, rather than overflowing the region

#### Scenario: They are not flush against the part above
- **WHEN** a game finishes
- **THEN** there is a gap between the topmost control and the part above it

#### Scenario: Every mode can reach them
- **WHEN** a game finishes in any of the three layout modes
- **THEN** all three controls are within the viewport and can be clicked
