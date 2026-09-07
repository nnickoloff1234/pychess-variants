## ADDED Requirements

### Requirement: The clock rules are stated where they are decided

Which seats take the server's clocks, which keep their local value, and which win on a conflict SHALL
be readable in one place. Where the answer depends on facts held by different objects — the
controller knows whether a move was resent, the caller knows whether a clock is still running — the
division SHALL be stated as a rule rather than inferred from which object can see what.

TODAY IT IS SPLIT AND THE SPLIT IS UNDOCUMENTED. `MoveDecision.takeClocks` carries the branch-2 rule;
`roundCtrl` ORs in the running check; branch 1's "a whole position replaces all four" is applied by
the caller and expressed nowhere.

#### Scenario: The rule can be read without reading both sides
- **WHEN** a reader asks which clocks a message replaces
- **THEN** the answer is stated in one place, whatever code applies it

### Requirement: A move waiting for its confirmation is not repainted away

A player who has moved and reconnects before the server confirms SHALL go on seeing their move. The
snapshot cannot carry it — the server never had it — so the client SHALL put it back on top of the
position that arrived, and SHALL keep the board shut while it does, so the move cannot be played a
second time into the overwrite race.

THE REPLAY SHALL REPRODUCE THE OPTIMISTIC STATE, NOT RECOMPUTE THE POSITION. On the round page a
move the reader makes advances chessground alone; ffish, `turnColor`, `lastmove` and the clocks all
still say it is our turn, because as far as the server knows it is. A replay that advances ffish
instead flips `turnColor`, and the clock update that follows then starts the OPPONENT's clock while
the server has the mover on the clock and their time running.

#### Scenario: The move survives the snapshot
- **WHEN** a client reconnects holding a move the server has not yet confirmed
- **THEN** the board shows that move, and refuses to accept another on that board

#### Scenario: A refused move is not replayed
- **WHEN** the position that arrives cannot accept the waiting move
- **THEN** the move is dropped, nothing is replayed, and the board is returned to the reader

### Requirement: A waiting move's legality is judged against the position that arrived

The check that decides whether a waiting move can still be played (branch 1.2.2) SHALL be asked of
the position the message carried, not of the one the client already held.

WHY IT IS NOT AUTOMATIC: a round-page move is never pushed to ffish, so between a move and its
confirmation ffish holds the position the move was GENERATED from — where it is legal by
construction. A check asked before the repaint therefore answers "yes" whatever the server said, and
branch 1.2.3.4 cannot self-heal: the invalid-move resync arrives on a still-open socket, so no
reconnection follows and nothing resends the move. It stays pending, the board stays shut, and the
server waits for a move it has thrown away.

#### Scenario: The server refuses a move on a live socket
- **WHEN** the server refuses a move and hands back its position without the connection breaking
- **THEN** the move is dropped and the board becomes playable again, with no reconnection needed

### Requirement: An armed premove has a stated fate across a full board message

Whether a premove survives a message that replaces the position it was composed against SHALL be
decided and written down.

BOTH READINGS ARE DEFENSIBLE, which is why it is open. A premove is an intention for a position that
has not arrived, so it is arguably not a copy of server state at all — which would put it beside the
pending move as a second thing only the client has. But it is composed against a SPECIFIC position,
and a snapshot may have replaced that position with one where the move is meaningless or means
something else.

#### Scenario: A premove that the new position invalidates
- **WHEN** a full board message arrives whose position makes an armed premove illegal
- **THEN** the client's behaviour is the one that was decided, and a test holds it there
