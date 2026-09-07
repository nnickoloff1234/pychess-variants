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

### Requirement: A move waiting for its confirmation is not silently repainted away

A player who has moved and reconnects before the server confirms SHALL NOT be left to discover, with
no explanation, that their move has been undone on the board — or, if the repaint stands, its
behaviour SHALL be covered by a test so it cannot change unnoticed.

WHAT HAPPENS TODAY: the full board message clears the steps and repaints both boards to the server's
position, so the move disappears; it returns when the confirmation arrives. The board is held shut in
between, precisely so the reader cannot play the move a second time and start the overwrite race.

WHAT IS NOT TESTED IS THE FRAME ITSELF. The round trip's endpoints are asserted and so is the shut
board; nothing looks at the moment in between.

#### Scenario: The intermediate frame is covered
- **WHEN** a client reconnects holding a move the server has not yet confirmed
- **THEN** what the board shows between the snapshot and the confirmation is asserted by a test

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
