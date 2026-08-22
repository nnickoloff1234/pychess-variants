# bughouse-chat-presets Specification

## Purpose
TBD - created by archiving change extract-bughouse-chat-presets. Update Purpose after archive.
## Requirements
### Requirement: The presets are their own widget, not part of the chat view

The bughouse chat presets SHALL be a widget of their own, in `client/two-board/round/chatPresets.ts`, exposing a single composed view in the same shape as the round page's other widgets.

The shared chat view (`client/chat.ts`) SHALL NOT render the presets, import the module that builds them, or branch on whether the page is bughouse in order to decide about them. A shared module SHALL NOT reach into a page-specific one for this.

Everything the buttons look like — which pieces get a "need" and a "don't give" button, their classes, their titles — derives from the variant alone, so the widget SHALL render them at construction, before any controller exists.

#### Scenario: The shared chat view no longer knows about presets
- **WHEN** `client/chat.ts` is inspected
- **THEN** it neither imports nor calls the presets, and no branch in it decides whether presets should appear

#### Scenario: Single-board pages are unaffected
- **WHEN** a single-board page renders its chat
- **THEN** it renders exactly as it did before, since the removed branch never applied to it

#### Scenario: Rendered from the variant alone
- **WHEN** the widget is constructed with a variant
- **THEN** it produces one "need" and one "don't give" button per pocket role, plus the fixed set of tells, with their titles and classes, without a controller being involved

### Requirement: The ability to send arrives in a second step

The buttons need to send a chat message, and only the round controller can send one — which does not exist when the page's view is built. The widget SHALL therefore be usable in two steps: constructed and rendered first, then given its sender once the controller exists.

Sending SHALL go through the same path a typed message takes, so that a preset is reported and delivered exactly as typing it would be. The widget SHALL NOT assemble the message envelope itself.

Before the sender has been supplied, a click SHALL do nothing observable — no error, no message. The window in which this is possible is the gap between the page's patch and the controller's construction, in which a user cannot realistically click, so nothing more elaborate than discarding is warranted.

#### Scenario: Rendering does not wait for the controller
- **WHEN** the page's view is built, before any controller exists
- **THEN** the presets are already in the returned vnodes, fully rendered

#### Scenario: A preset behaves like a typed message
- **WHEN** a preset button is clicked after the widget has its sender
- **THEN** the same message is sent, by the same path, with the same reporting as if the user had typed it

#### Scenario: A click before wiring is discarded
- **WHEN** a preset button is clicked before the widget has been given its sender
- **THEN** nothing is sent and no error is raised

### Requirement: A preset button holds a usable size

A preset button SHALL NOT shrink below a floor at which it stops being usable. Its size SHALL be expressed relative to the player's own board square rather than as a fixed pixel count, so that it scales with the rest of the page instead of being tuned per mode.

The floor SHALL be **at least 60% of the size a button takes when the layout is not constrained**, measured at 45.92px on the desktop, giving a floor of roughly 27.5px — which also clears the 24px minimum target size that WCAG 2.2 states.

Where the available width cannot accommodate every button at that floor, the grid SHALL reflow rather than shrink the buttons below it.

#### Scenario: A button does not shrink without limit
- **WHEN** the presets are rendered in the narrowest supported layout
- **THEN** each button is at least the floor in both dimensions

#### Scenario: The floor tracks the board
- **WHEN** the same layout is rendered at two board sizes
- **THEN** the floor differs in proportion to the player's own board square, rather than being the same pixel count in both

#### Scenario: Reflow rather than shrink
- **WHEN** the presets are given less width than their buttons need at the floor
- **THEN** the grid takes more rows, and no button is rendered smaller than the floor

### Requirement: Chat takes the space, presets take what they need

Where the chat area and the presets are placed together, they SHALL be flex siblings: the chat area SHALL take the space that is available, and the presets SHALL take the height their buttons require and no more.

The `order` the presets currently carry is meaningful only inside the chat view's own flex box. Once they are a sibling of the chat view rather than a child, their position SHALL be established by where they are mounted.

Where the two are placed together, the presets SHALL sit **below** the chat area, and this SHALL hold in every layout. No layout SHALL reverse the pair. A layout that wants them elsewhere SHALL mount them elsewhere rather than reorder them in place, since reordering is what made portrait disagree with the rest.

The chat area's own contents SHALL likewise run in one direction in every layout: the messages above, the input below them.

#### Scenario: Chat absorbs the slack
- **WHEN** the container holding both is made taller
- **THEN** the chat area grows and the presets keep the height their buttons need

#### Scenario: The presets are not squeezed by a long chat
- **WHEN** the chat holds more messages than fit
- **THEN** the chat area scrolls and the presets keep their height

#### Scenario: Portrait agrees with the other layouts
- **WHEN** the round page is displayed in portrait orientation with the Chat tab selected
- **THEN** the presets are below the chat area, and the chat's input is below its message list — the same order the landscape layouts show

#### Scenario: No layout reverses the pair
- **WHEN** any supported layout is displayed
- **THEN** neither the presets panel nor the chat view carries a rule that reverses their order relative to how they are mounted

### Requirement: The presets are not offered once the game has a result

The preset buttons SHALL NOT be shown once the game has finished.

They exist to tell a partner something about a game in progress — what to send, what to hold, when
to sit. After a result there is nothing they can say, and they occupy the space the end-of-game
controls move into.

A game that has finished SHALL be recognised the same way the rest of the round page recognises
it, from the game's status, rather than by a separate notion of doneness that could disagree.

Hiding them SHALL NOT disturb the parts around them: the chat remains, and the parts that were
below them close up rather than leaving a gap where they were.

#### Scenario: The presets go when the result arrives
- **WHEN** a game in progress finishes, without the page being reloaded
- **THEN** the preset buttons are no longer shown

#### Scenario: A finished game never shows them
- **WHEN** a page is opened on a game that has already finished
- **THEN** the preset buttons are not shown at any point

#### Scenario: They are there while the game is on
- **WHEN** a game is in progress
- **THEN** the preset buttons are shown, as they always have been

#### Scenario: Nothing is left behind
- **WHEN** the presets are hidden because the game finished
- **THEN** no empty space remains where they were, and the chat and the tab bar keep their places

