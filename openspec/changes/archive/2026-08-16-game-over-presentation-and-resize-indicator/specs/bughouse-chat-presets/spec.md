## ADDED Requirements

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
