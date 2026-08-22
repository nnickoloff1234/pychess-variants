## MODIFIED Requirements

### Requirement: A board offers a resize handle only where resizing works

A board SHALL render its resize handle only in a mode where dragging it changes the board's size.

Where a mode derives its board size from something other than the zoom setting — as short
landscape does, sizing from the height-derived square with no zoom factor in the track — the
handle SHALL NOT be shown, and SHALL NOT be draggable.

This SHALL be decided per layout mode rather than per viewport width. The shared rule that shows
the handle above a fixed viewport width is the reason a mode that ignores zoom still displays it.

**The handle SHALL remain draggable at every value the zoom setting can take.** A board that can be
reduced to a size at which its own handle can no longer be grasped is a board that cannot be
restored by the control that shrank it. Measured at zoom 0: the board's wrap is 0x0, and
`elementFromPoint` at the handle's own centre returns the round app rather than the handle, while
the handle's layout box is still reported as 22x22 with `display: block` and `pointer-events: auto`
— present, and unreachable.

This is a restatement, not a new obligation: the scenario below already required that dragging the
handle changes the board's size wherever the handle is rendered, and at zoom 0 it does not.
Whether the fix is a floor on the zoom setting, a minimum board size, or a handle that escapes the
collapsed box is left open.

#### Scenario: Short landscape shows no handle
- **WHEN** the round page is displayed in short landscape
- **THEN** neither board renders a visible resize handle, and there is nothing in the board's bottom-right corner to drag

#### Scenario: The handle stays where it works
- **WHEN** the round page is displayed in tall landscape
- **THEN** each board renders its resize handle, and dragging it changes that board's size

#### Scenario: A board can always be resized back
- **WHEN** a board has been dragged to the smallest size its zoom setting allows
- **THEN** its resize handle is still hit-testable at its own centre, and dragging it makes the board larger again

#### Scenario: Hiding the handle does not disable zoom
- **WHEN** a mode that hides the handle is displayed and the zoom setting is changed by other means
- **THEN** the setting is stored as it always was; only the handle is absent
