## ADDED Requirements

### Requirement: Reconnection is one subject with one owner

The decision of what to do when a connection returns SHALL be made in one place, by a component
whose only subject is that. Nothing else SHALL decide it: the round controller, the socket and the
move cache SHALL consult it rather than each answering a piece.

IT IS NOT A REFACTOR FOR TIDINESS. The question a reader has is "what happens if I reload while my
move is in flight and the other board has moved twice", and today that answer is distributed across
six places — the socket's open handler, four entry points of the move cache, an in-memory field, the
board-message handler, the snapshot applier and the clock resync — none of which names reconnection
as its subject. Each carries a correct comment about the case it handles. The knowledge exists; it
has nowhere to live.

EVERY CASE SHALL BE NAMED AND ENUMERATED, and the enumeration SHALL be exhaustive over the state
that distinguishes them: what move of ours was outstanding, what the server did with it, what
happened while we were away, and whether the page survived.

EVERY CASE SHALL ANSWER IN THE SAME TERMS — what is accepted from the message, what local state is
overwritten, what happens to each clock, what is resent or replayed or dropped, whether each board
may be moved on, and what becomes of the cache — so that two cases can be compared by reading them
instead of by tracing them.

#### Scenario: A case can be named
- **WHEN** a connection returns in any state this capability admits
- **THEN** exactly one enumerated case applies
- **AND** it is identifiable from the state, not from which code path was taken

#### Scenario: One place decides
- **WHEN** the client resynchronises after a connection returns
- **THEN** the decision came from the one component whose subject that is

### Requirement: The shipped behaviour is the specification

The behaviour of the current implementation SHALL be preserved. It is the product of measured
incidents, not of guesses, and each is recorded where it was fixed: a resent move leaving its mover
63 seconds richer than every other window and the record; a snapshot re-setting running clocks and
subtracting the elapsed time twice, leaving a board that had not moved in 19 minutes reading 19
minutes short; a reconnect handing one seat 44 seconds back; a premove firing into a ply the server
had already passed and ending the game as INVALIDMOVE against the player who reconnected.

WHERE THE ANALYSIS FINDS THE CURRENT CODE SURPRISING, THE BURDEN IS ON THE ANALYSIS. A case it
cannot explain is a candidate defect to be raised with its evidence, not a licence to change
behaviour while moving it.

ANY INTENDED BEHAVIOUR CHANGE SHALL BE RECORDED AGAINST THE CASE IT BELONGS TO, so that a later
reader can tell what was moved from what was decided.

#### Scenario: A move survives the move
- **WHEN** the reconnection logic has been relocated
- **THEN** every case behaves as it did before, or the difference is recorded against its case

### Requirement: Two answers to "is a move outstanding", and they are not the same answer

The client SHALL keep both a durable record of moves to RESEND and a live record of boards the
client is AHEAD of, and SHALL NOT collapse them into one.

THEY DIFFER EXACTLY WHERE IT MATTERS. The resend record outlives the page, because a move typed
before a refresh still has to reach the server. The ahead-of-server record does not, because it
describes a claim this page is making and a new page makes no claim. A single field cannot be both:
made durable it would gate boards after a reload on the strength of a move the server may already
have; made transient it would lose the move it exists to resend.

A BOARD THE CLIENT IS AHEAD OF SHALL NOT INVITE A MOVE. Its legal-move map SHALL be emptied until
the server answers, because a snapshot that predates our move hands the turn back to us and both a
premove and a player will take it — and the move that follows is for a ply the server has passed.

#### Scenario: A move typed before a refresh still arrives
- **WHEN** the page is reloaded with a move that never reached the server
- **THEN** it is resent

#### Scenario: A board we are ahead of cannot be moved on
- **WHEN** a snapshot arrives that does not yet include a move we have sent
- **THEN** that board is drawn as the server sees it
- **AND** it accepts no move, from the player or from a premove, until the server answers

### Requirement: A resend may never be answered

The client SHALL NOT assume a resent move produces a reply. The server drops a move it has already
seen from that player on that board, logs it, and returns without broadcasting — so a client waiting
for a confirmation to clear its cache waits forever, and resends the same move on every subsequent
reconnection.

THE SNAPSHOT IS THEREFORE ALSO AN ANSWER. A cache entry SHALL be cleared when an authoritative board
state shows the server already holds that move, and that SHALL be a separate act from clearing it on
confirmation.

MATCHING SHALL BE ON THE MOVE, NOT ON A PLY. The ply advances on the other board's moves too, so a
ply comparison would also discard a move that never reached the server at all — and that entry is
the only thing that can still recover it.

#### Scenario: A duplicate resend is reconciled without a reply
- **WHEN** a resent move is one the server had already played
- **THEN** no confirmation arrives
- **AND** the cache entry is cleared by the board state that shows the move

### Requirement: Clocks resync from the server only where the local clock cannot be trusted

The local ticking clock SHALL remain the source of what is displayed, and server values SHALL be a
resync point. On a connection returning, the cases where the server's value wins SHALL be stated
rather than inferred.

A CLOCK SHALL BE PAUSED BEFORE IT IS SET. Setting a value on a running clock subtracts the elapsed
time a second time, because the server has already deducted it and the local clock keeps rendering
from an origin that was not refreshed. This does not arise on an ordinary move — the side to move
next was waiting, so its clock is stopped — and it arises on every snapshot, which is exactly when
both boards' clocks are running.

A RESENT MOVE'S LOCAL CLOCK IS THE STALE ONE. The server replayed it with its own clocks and charged
the stall to the seat whose turn it still was, which is ours; the value paused locally never saw
that. So for a move known to have been resent, the server's value SHALL win even though the local
clock is not running.

#### Scenario: A snapshot does not charge the elapsed time twice
- **WHEN** a full board message resyncs a running clock
- **THEN** the value shown afterwards is the server's value, not the server's value less the time
  since that board's last move

#### Scenario: A resent move takes the server's clocks
- **WHEN** a move that was resent after a reconnection is confirmed
- **THEN** the mover's clock takes the server's value
