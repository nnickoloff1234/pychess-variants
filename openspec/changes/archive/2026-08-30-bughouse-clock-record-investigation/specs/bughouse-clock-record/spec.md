## ADDED Requirements

### Requirement: A game SHALL have exactly one authoritative clock history

A bughouse game's clock history MUST have a single source of truth. Today two are written: the
`ply_clocks` arrays that reach MongoDB as `cw` / `cb` / `cwB` / `cbB`, and the `clocks` / `clocksB`
that each step carries from the move message that produced it. Any client deriving a think time, a
total or a difference MUST be able to name which series it is reading and rely on that series being
complete and correctly indexed.

Where two series exist, they MUST agree index for index, or one of them MUST be removed.

#### Scenario: The two recorded series are compared

- **WHEN** a finished bughouse game's `cw` / `cb` / `cwB` / `cbB` arrays are compared with the
  `clocks` / `clocksB` of the steps served for the same game
- **THEN** the value for each seat at each ply SHALL be equal in both
- **AND** they SHALL NOT be offset from one another by any number of plies

#### Scenario: A client derives a think time

- **WHEN** a client computes a move's think time as one seat's clock at its previous move minus its
  clock at this move
- **THEN** the two readings SHALL come from the same series at the plies they claim to come from

### Requirement: A recorded clock SHALL reflect the time that seat actually spent

Every move a seat makes SHALL be recorded with that seat's own clock as it stood when the move was
made. A seat's recorded clock MUST NOT repeat the value from its previous move unless no time
elapsed on that seat's clock between the two.

This is what makes a think time derivable at all. Where the value repeats, the derived think time is
exactly zero, which is indistinguishable from a premove and cannot be told apart after the fact.

#### Scenario: A seat moves twice with time in between

- **WHEN** a seat makes a move, its opponent replies, and it moves again after thinking
- **THEN** the seat's recorded clock at the second move SHALL be smaller than at the first

#### Scenario: A premove

- **WHEN** a seat's move is sent immediately on the opponent's move, costing that seat no time
- **THEN** a recorded think time of zero is correct
- **AND** it SHALL be distinguishable from a missing or unchanged reading

### Requirement: A difference indicator SHALL show one agreed quantity per team

The clock difference shown beside a seat SHALL be defined so that both seats of a team show the same
number, and the two teams show that number with opposite signs.

Each seat shows its own clock minus that of the opponent's partner — the same colour on the other
board. That already satisfies this requirement, and not by accident: bughouse has no increment, so
each board always has exactly one clock running, both boards have consumed the same wall time at
every instant, `wA + bA == wB + bB`, and therefore `wA - wB == bB - bA`. VERIFIED, not chosen:
`PB.invariant()` held in every window through the whole stress suite, and the one case where it did
not (a client keeping a stale value for its own seat after a replayed move) was a client defect,
since fixed.

#### Scenario: Partners compare their indicators

- **WHEN** two players on the same team look at their own difference indicators at the same moment
- **THEN** both SHALL show the same number

#### Scenario: Opponents compare their indicators

- **WHEN** a player and any member of the opposing team look at their indicators at the same moment
- **THEN** the two numbers SHALL be equal in magnitude and opposite in sign

#### Scenario: The boards are unevenly paced

- **WHEN** one board has spent substantially more total time than the other
- **THEN** every indicator SHALL still agree with its partner's

### Requirement: The reference game's clock record SHALL be preserved outside the database

The games every finding above is measured from SHALL be kept in the repository so the investigation
survives the loss of the database: `JJgZzLhJ` (32 plies, the original reference), `PHdCmezP` (10
plies, four separate players) and `sLF5O6kj` (10 plies, the stress-test game carrying the 447-second
non-owned value).

#### Scenario: The database is lost or reset

- **WHEN** the MongoDB volume is discarded, or the game document is evicted
- **THEN** the complete document and both derived tables SHALL still be readable from this change
- **AND** every number quoted in the proposal SHALL be reproducible from them

### Requirement: A game SHALL read back the same whether it is in memory or from the database

A finished bughouse game's clocks SHALL be identical whether the game is served from the server's
memory or rebuilt from its stored document. A reader MUST NOT be able to tell which path served it.

Where a stored array already carries the starting time at index 0, the rebuild MUST NOT add it
again, and the step for a move MUST read the entry recorded for that move rather than an earlier one.

#### Scenario: The same game is read twice across a restart

- **WHEN** a finished game's analysis page is read, the server is restarted, and the same page at the
  same ply is read again
- **THEN** all four seats' clocks SHALL be identical in both readings
- **AND** they SHALL equal the values stored for that ply

#### Scenario: A ply's clock is attributed

- **WHEN** a step is labelled with a ply
- **THEN** the clocks it carries SHALL be the ones recorded after that ply was played

### Requirement: A disconnection SHALL NOT corrupt the clock record

A page reload, a websocket drop, a replayed queued move, or one user holding two seats SHALL NOT
produce a clock history that could not have happened. With no increment, every seat's series is
non-increasing, and all four series cover the same plies.

#### Scenario: A seat's clock never gains time

- **WHEN** a game with no increment has finished
- **THEN** each seat's recorded series SHALL be non-increasing from index to index

#### Scenario: The four series describe the same game

- **WHEN** a game's four clock arrays are read
- **THEN** they SHALL all hold the same number of entries

#### Scenario: A move is replayed after a reconnect

- **WHEN** a client reconnects and replays a move it queued while disconnected
- **THEN** the clock recorded for that move SHALL be the mover's clock as it stood when the move was
  made, not when it was replayed

### Requirement: A clock SHALL be recorded only from the client that owns it

A move message carries all four seats' clocks, but only the mover's own clock is authoritative. The
other three are that client's local estimate of clocks it does not run, and they are wrong by
whatever that client has failed to observe — measured at **132 seconds** on a two-move game, where
the board A mover reported board B white as having spent 1.1s when it had spent about 133s.

Those estimates MUST NOT be TREATED as the seats' clocks: nothing that runs a clock, decides a flag,
or renders a seat's time at a ply may read them. Where a value for a non-moving seat is needed it
SHALL be derived from authoritative values — that seat's own last report, plus the invariant that
both boards' totals fall together — never taken from another client's copy.

Persisting them is permitted, and is the current choice: they are inert diagnostics, useful for
investigating a divergence after the fact, and every entry's authorship is recoverable because `o`
says which board moved at each ply. Reducing the record to the mover's single value is tracked
separately in `bughouse-shrink-ply-clock-record`.

#### Scenario: A move arrives carrying four clocks

- **WHEN** a client sends a move with `clocks` and `clocksB`
- **THEN** only the value for the seat that made the move SHALL be treated as that seat's clock
- **AND** the other three SHALL NOT overwrite what those seats last reported themselves, nor be
  displayed as those seats' clocks at that ply

#### Scenario: A board that has not moved yet

- **WHEN** one board has made no move and the other board's player moves
- **THEN** the first board's running clock SHALL NOT be recorded as untouched merely because the
  moving client has not been watching it

### Requirement: A game end SHALL reach every player of that game

When a bughouse game ends — by any means, including abandonment — all four players SHALL be told.
None SHALL be left with a running clock on a game the server has finished and stored.

A notification path that names two players, or that reaches only spectators, is insufficient: a
bughouse game has four seats across two boards, and a player on the board where nothing happened is
as much a player as the one who caused the end.

#### Scenario: A player abandons the game

- **WHEN** one player disconnects for longer than the abandon timeout and the server ends the game
- **THEN** all four players SHALL receive the game-end message
- **AND** every client SHALL stop its clocks and show the result

#### Scenario: The end happens on the other board

- **WHEN** the event that ends the game occurs on one board
- **THEN** the two players on the other board SHALL be notified on the same terms as the two on the
  board where it happened
