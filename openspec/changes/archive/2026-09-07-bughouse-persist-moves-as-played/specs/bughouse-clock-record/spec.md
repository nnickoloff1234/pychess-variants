## ADDED Requirements

### Requirement: A bughouse ply is persisted as it is played

Each move SHALL be written to the game document as it is applied, not accumulated in memory until the
game ends. A game interrupted mid-play SHALL be restorable to the ply it reached.

TODAY IT IS RESTORED TO PLY ZERO, WHICH IS WORSE THAN NOT BEING RESTORED. `GameBug.save_game()` is
the only writer and runs once, at termination; from creation the document holds `"m": []`. Startup
recovery matches the document — the insert writes `"r"` as the code for `*`, which is what the
active-game filter looks for, with status STARTED — and `load_game_bug_from_doc` decodes an empty
move list, then the clocks are restarted. Four clients then reconnect to a game that believes it is
at the starting position with full clocks. Every client mechanism trusts the snapshot, so a silent
rollback is accepted as truth and the real game is discarded.

THE DOCUMENT SHALL STAY CONSISTENT ON CLOSE. The end-of-game write SHALL remain authoritative and
SHALL overwrite the arrays whole, whatever the per-ply writes did, so a completed game's record does
not depend on the reliability of the incremental path.

A PARTIAL DOCUMENT SHALL BE READABLE. Restoration SHALL reconstruct both positions, the ply, which
board each ply belongs to, both boards' clock histories and both pockets, from a document that has
moves but has never been closed.

#### Scenario: A game survives a restart mid-play
- **WHEN** the server restarts during a bughouse game and the game is restored from the database
- **THEN** it resumes at the ply it had reached, with both positions, both pockets and both clocks
- **AND** the next move is accepted and recorded at the correct ply

#### Scenario: The end-of-game record is unaffected
- **WHEN** a game ends
- **THEN** the stored arrays are the authoritative ones written at close

### Requirement: Persistence does not delay a move, and does not reorder one

Writing a ply to the database SHALL NOT be on the path that answers the mover. The in-memory game
remains the authority; the document is a record kept behind it.

ORDER IS NOT NEGOTIABLE. The move list is decoded positionally, so two plies written out of order
decode to a different game. Whatever mechanism defers the write SHALL preserve the order in which
plies were applied, and a write that arrives late or twice SHALL be a no-op rather than a corruption.

THE LOSS WINDOW SHALL BE BOUNDED AND ACKNOWLEDGED. A restart between applying a ply and writing it
loses that ply, and the game resumes one ply behind. That is accepted deliberately in exchange for
not paying a database round trip on every move. What SHALL NOT happen is the window widening
silently: a backlog means a slow database is turning a one-ply risk into a many-ply one, and the
writer SHALL fall back to writing inline rather than let it grow.

SYNCHRONOUS IS AN ACCEPTABLE ANSWER. If ordered deferral cannot be made simple, the write SHALL be
awaited inline and the latency accepted — every other variant already does exactly that.

#### Scenario: Plies are recorded in the order they were played
- **WHEN** moves are made in quick succession on both boards
- **THEN** the stored move list decodes to the game that was played

#### Scenario: A late or repeated write changes nothing
- **WHEN** a write for a ply that is already recorded is applied
- **THEN** the document is unchanged

#### Scenario: The backlog does not grow silently
- **WHEN** writes fall behind the moves being played
- **THEN** it is reported, and the writer stops deferring
