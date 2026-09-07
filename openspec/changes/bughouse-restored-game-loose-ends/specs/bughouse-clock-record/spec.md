## ADDED Requirements

### Requirement: A restored game presents its last move

A game rebuilt from its document SHALL present, for each board, the move most recently played on
that board, so a client joining or rejoining sees the same highlighted move it would have seen had
the server never stopped.

THE POSITION ALONE IS NOT ENOUGH. A player who has just been reconnected is working out what
happened while they were away, and the highlight is the cue that answers it. A restored game today
renders both positions correctly and highlights nothing.

#### Scenario: The highlight survives a restart
- **WHEN** a game is rebuilt from the database and a client connects to it
- **THEN** each board shows the last move played on that board

### Requirement: State a restart drops is restored or abandoned deliberately

In-memory game state that is absent from the document SHALL be rebuilt where it can be, and where
it cannot, its loss SHALL be visible rather than silent.

`lastmovePerBoardAndUser` — the map that lets the server ignore a move a user has already made — IS
REBUILDABLE from the move list, and rebuilding it removes a behaviour difference that depends on
nothing but whether the server happens to have restarted: the same resent move is answered with
silence by a long-running server and with a rejection-and-resync by one that has just come back.

A PENDING TEAM OFFER IS THE CASE THAT CANNOT SIMPLY BE REBUILT, because an offer is a live intention
and not a fact about the position. It is dropped today, and both the player who made it and the
player who was asked may still be looking at it.

#### Scenario: A resent move is answered the same way after a restart
- **WHEN** a client resends a move the server already holds, to a server that has restarted
- **THEN** it is recognised as already played, as it would be by a server that never stopped

#### Scenario: A dropped offer does not linger on screen
- **WHEN** a draw or resignation offer is outstanding and the server restarts
- **THEN** the offer is either restored, or the clients showing it are told it is gone
