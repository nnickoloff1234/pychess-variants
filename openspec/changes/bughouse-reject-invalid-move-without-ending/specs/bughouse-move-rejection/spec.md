## ADDED Requirements

### Requirement: A move the position does not allow SHALL NOT silently corrupt the game

When a move reaches the server that the position does not allow, the server SHALL leave the game in a
state every client can agree on. It MUST NOT leave some clients believing the game continues while
others believe it has ended, and it MUST NOT leave the recorded clock history holding entries for a
move that was never played.

This requirement deliberately does NOT say whether the game ends. That is the decision this change
exists to make.

#### Scenario: An out-of-turn move arrives

- **WHEN** a client sends a move for a seat whose turn it is not
- **THEN** every client SHALL end up agreeing on whether the game is still in progress
- **AND** the stored clock arrays SHALL NOT contain an entry for the rejected move

#### Scenario: The move was produced by a client race

- **WHEN** the invalid move results from a reconnect or premove race rather than deliberate abuse
- **THEN** the player SHALL NOT lose the game because of it
