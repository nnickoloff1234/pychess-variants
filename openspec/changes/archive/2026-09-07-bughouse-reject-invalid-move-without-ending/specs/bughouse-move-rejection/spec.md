## ADDED Requirements

### Requirement: A move the position does not allow SHALL NOT end the game

When a move reaches the server that the position does not allow, the server SHALL refuse the move
and hand the sender the position as the server holds it, and the game SHALL continue.

THE DECISION THIS CHANGE EXISTED TO MAKE, NOW MADE. Ending the game was a heavy answer to a light
problem: a client whose move is refused is a client whose picture of the position is stale, which is
what a reconnection, a crossed move, or a page returning with a move it had not sent all produce.
None of that is cheating, and none of it is worth a loss.

ONLY THE SENDER IS TOLD, because nobody else's picture changed — the move was not played. The
resync is a full board message, which the client applies like any other snapshot; it then drops the
waiting move as unplayable in the position it has just been given, which is what stops the same
impossible move being sent again on every later reconnection.

WHAT THIS GIVES UP, STATED PLAINLY: a client that sends refused moves in a loop now costs the server
one legal-move generation and one message per move, where before the first one stopped the game.
That is bounded, and it is accepted rather than rate-limited.

#### Scenario: The game survives a move the engine refuses

- **WHEN** a client sends a move the position does not allow
- **THEN** the game is still in progress and has no result
- **AND** nothing is recorded for the move

#### Scenario: The sender is handed the position

- **WHEN** a move is refused
- **THEN** that client, and only that client, receives the position as the server holds it

### Requirement: A refused move SHALL change nothing

The server SHALL determine that a move is not allowed BEFORE it changes any game state, so that
refusing costs the game nothing at all.

THIS IS THE HALF THAT WAS MISSED FIRST, and it only became serious because of the requirement above.
Validation used to happen by whichever engine call threw first, several statements into the move
path — by which time the clocks had been stopped, one seat's recorded time overwritten with a number
the refusing client itself had sent, an extra entry appended to the per-ply clock record, and a
captured piece possibly already added to the partner's pocket. While a refused move ended the game
that damage died with the game. Once the game continues, it persists and can be repeated at will.

A CAPTURE IS COMPUTED BEFORE THE MOVE IS APPLIED AND WRITTEN AFTER IT. The capture must be read from
the position before the move, but it writes to the OTHER board, and applying a move can only roll
back its own board. Written first, a failure anywhere afterwards left a piece in the partner's
pocket for a move that never happened, which nothing would ever take back. It is still written
before checkmate is assessed, because a piece arriving in a pocket can be the escape from mate.

#### Scenario: A refused move leaves the clocks alone

- **WHEN** a client sends a move the position does not allow
- **THEN** no clock is stopped or restarted
- **AND** no seat's recorded time is changed
- **AND** the per-ply clock record gains no entry

#### Scenario: A refused move leaves the pockets alone

- **WHEN** a move that would capture cannot be applied
- **THEN** the partner board's pocket is unchanged

#### Scenario: The move was produced by a client race

- **WHEN** the invalid move results from a reconnect or premove race rather than deliberate abuse
- **THEN** the player SHALL NOT lose the game because of it
- **AND** the sender SHALL be given the server's position so its next move can be a legal one
