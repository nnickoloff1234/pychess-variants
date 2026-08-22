## MODIFIED Requirements

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
