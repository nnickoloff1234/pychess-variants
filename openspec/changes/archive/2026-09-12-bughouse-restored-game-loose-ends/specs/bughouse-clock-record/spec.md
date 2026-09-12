## ADDED Requirements

### Requirement: A restored game presents its last move on both boards

A game rebuilt from its document SHALL present, for each board, the move most recently played on that
board, so a client joining or rejoining sees the same highlighted move it would have seen had the
server never stopped.

THE POSITION ALONE IS NOT ENOUGH. A player who has just been reconnected is working out what happened
while they were away, and the highlight is the cue that answers it.

BOTH BOARDS, AND THE PARTNER BOARD IS THE ONE AT RISK. Its last move sits at a different ply from our
own, so a restore that carried only "the last move of the game" would highlight one board and leave
the other blank. The loader fills both `move` and `moveB` in every step it builds, which is what makes
this hold — and it was measured holding rather than assumed.

#### Scenario: The highlight survives a restart
- **WHEN** a game is rebuilt from the database and a client connects to it
- **THEN** each board shows the last move played on that board, ours and the partner's alike

### Requirement: State a restart drops is rebuilt, or its loss is bounded and stated

In-memory game state absent from the document SHALL be rebuilt where the move list can supply it.
Where it cannot, the consequence SHALL be bounded, self-correcting and written down — not left as a
difference nobody has looked at.

`lastmovePerBoardAndUser` — the map that lets the server ignore a move a player has already made —
IS REBUILDABLE, and SHALL be rebuilt at load. Without it the same resent move is answered two ways:
with silence by a server that has been up all along, and with a rejection-and-resync by one that has
just restarted. Both leave the client in step, so nothing observable broke; what could not stand is an
answer that depends on nothing the message expresses.

A PENDING TEAM OFFER IS NOT REBUILDABLE, because an offer is a live intention rather than a fact about
the position, and it SHALL NOT be persisted for this. Its loss is accepted on the grounds that it
corrects itself: a client that lived through the restart still shows the control, and the press that
follows is read as a fresh offer and broadcast to every player, so no game ends wrongly and no client
is left stuck. A client that reloaded shows nothing, which is already correct.

#### Scenario: A resent move is answered the same way after a restart
- **WHEN** a client resends a move the server already holds, to a server that has restarted
- **THEN** it is recognised as already played, as it would be by a server that never stopped

#### Scenario: A stale offer corrects itself rather than lingering unanswerably
- **WHEN** a draw or resignation offer was outstanding, the server restarted, and a client that still
  shows the control presses it
- **THEN** the press is taken as a new offer and announced to the players it concerns, leaving every
  client agreeing with the server
