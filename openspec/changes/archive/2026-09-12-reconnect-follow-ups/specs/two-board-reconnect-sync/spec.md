## ADDED Requirements

### Requirement: The clock rules are stated where they are decided

Which seats take the server's clocks, which keep their local value, and which win on a conflict SHALL
be readable in one place: the decision a message produces, not the code that applies it. No caller
SHALL add a condition of its own.

TWO FIELDS CARRY IT, and the split between them is the shape of the news rather than an accident of
what each object can see. A single move answers for one board — both of that board's clocks, or
neither — because a message about one board carries a trustworthy pair only for that board. A
whole-game position answers for the game, because it is the only message that replaces every clock
together.

THE TEST FOR OUR OWN MOVE IS WHETHER THIS PAGE STOPPED THAT CLOCK, and not whether the clock is
running. The move's own client pauses the mover's clock as the move goes out, and that reading is
better than anything that can come back; there is no such reading when the server replayed the move
after a break, nor when a previous instance of the page sent it. "Is it running" is a symptom of the
same thing and an unreliable one, because applying clocks restarts them.

A MESSAGE BEHIND THE GAME THE CLIENT HOLDS REPLACES NOTHING. A single-move message's ply and its
clock values are read at the same instant, so one that arrives late or twice carries times as stale
as its ply, and applying them would set that board backwards.

#### Scenario: The rule can be read without reading both sides
- **WHEN** a reader asks which clocks a message replaces
- **THEN** the answer is a field of the decision, and the code that applies it adds no condition of its own

#### Scenario: A position for the whole game
- **WHEN** an authoritative position for an unfinished game arrives
- **THEN** all four clocks are replaced, both boards

#### Scenario: A position for a game that has ended
- **WHEN** the position that arrives carries a result
- **THEN** no clock is replaced: they have been stopped, and what they last showed is what they keep showing

#### Scenario: Our own move, whose clock this page stopped
- **WHEN** the server confirms a move this client sent and paused its own clock for
- **THEN** every clock keeps the value it holds

#### Scenario: Our own move, whose clock this page never stopped
- **WHEN** the server confirms a move it replayed after a break, or one a previous instance of this page sent
- **THEN** that board's two clocks come from the server, even though the mover's clock is not running

#### Scenario: Somebody else's move
- **WHEN** a move arrives that advances the game on one board
- **THEN** that board's two clocks come from the message, and the other board's go on ticking locally

#### Scenario: A move behind the game the client holds
- **WHEN** a single-move message arrives whose ply the client already holds
- **THEN** no clock changes

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

### Requirement: An arriving move's facts come from the message that carries it

The turn colour, which seat moved, the move itself and both boards' positions SHALL be read from the
arriving message rather than from the history the client already holds.

WHY IT IS NOT AUTOMATIC: a single move joins that history only when it is the NEXT one, so for a
message behind the game or ahead of it the client's own last step describes another ply — another
turn colour, another mover, another move. The turn colour decides which of a board's two clocks is
restarted, so reading it off the wrong step starts the seat the server does not have on the move.
And a client holding no history at all — its first message being a broadcast that overtook the
opening snapshot — has no last step to read, so the attempt fails before any decision is reached.

THE PARTNER BOARD'S LAST MOVE IS THE ONE EXCEPTION, because the message does not carry it: a live
move message records the move only for the board it was played on, while a stored game records both
boards' last moves in every step. That one fact is therefore read from the history, and nothing else
is.

#### Scenario: A move that is not the next one
- **WHEN** a single-move message arrives whose ply is not the next the client expects
- **THEN** the facts applied are the message's own, and the partner board's last move is left as it was

#### Scenario: A move arriving before any position
- **WHEN** a single-move broadcast is the first message a page receives
- **THEN** it is reported as a missing move rather than applied, and nothing fails

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

### Requirement: A full board message does not end an armed premove

An armed premove SHALL survive a message that replaces the position it was composed against.

IT IS AN INTENTION, NOT A COPY OF ANYTHING THE SERVER HOLDS, and that is what separates it from
everything else a snapshot restates. The position, the move list and the clocks are all the server's
to restate, and a snapshot restates all of them; a premove is a statement about a position that has
not arrived yet, so a snapshot has nothing to say about it. Both readings were defensible until this
was decided.

AND IT IS RELEASED INTO THE LIVE POSITION. A reader who arms one and then scrolls back to watch the
game is returned to the end before it goes — and only when one is armed, because arming a premove is
an explicit statement of intent to move, which being carried forward answers. A reader browsing
without one is left where they are.

#### Scenario: A premove across a full board message
- **WHEN** a full board message replaces the position an armed premove was composed against
- **THEN** the premove is still armed

#### Scenario: A premove belonging to a reader who has scrolled away
- **WHEN** the turn arrives for a reader who armed a premove and then scrolled to an earlier ply
- **THEN** the reader is returned to the live position and the premove is played, rather than silently discarded
