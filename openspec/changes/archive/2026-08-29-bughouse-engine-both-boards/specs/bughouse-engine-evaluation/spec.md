## ADDED Requirements

### Requirement: One switch SHALL enable evaluation of both boards

The analysis page SHALL offer a single control for local engine evaluation, and turning it on SHALL
evaluate both boards. There MUST NOT be a per-board switch, and turning evaluation on for one board
MUST NOT turn it off for another.

While the switch is on, each board SHALL have its own current evaluation, its own principal
variation source and its own gauge.

#### Scenario: The reader turns the engine on

- **WHEN** the reader turns on local engine evaluation
- **THEN** both boards SHALL receive evaluations
- **AND** both eval gauges SHALL move

#### Scenario: The reader turns the engine off

- **WHEN** the reader turns local engine evaluation off
- **THEN** the engine SHALL stop searching
- **AND** neither board SHALL continue to receive evaluations

### Requirement: One engine instance SHALL serve both boards, one ply at a time

The page SHALL hold one Fairy-Stockfish instance and give each board the engine in turn. A slice
SHALL be bounded by DEPTH, not by time: each visit asks a board for exactly one ply more than that
board has already reached, and hands the engine over as soon as that ply arrives. The target SHALL
be per board — its own achieved depth plus one — so that no shared rung can advance past a board
that never reached the previous one.

The page MUST NOT attempt two concurrent searches on one instance: UCI defines one search per
engine, and a second `position` or `go` arriving mid-search is undefined.

#### Scenario: Both boards are being evaluated

- **WHEN** the engine is on and has finished a slice on one board
- **THEN** it SHALL begin a slice on the other board
- **AND** it SHALL continue alternating while both boards are below the ceiling

#### Scenario: Two positions of unequal complexity

- **WHEN** one board's position is much harder to search than the other's
- **THEN** the two boards SHALL still advance in step BY DEPTH, never differing by more than the ply
  in flight
- **AND** the harder board MAY take much longer in wall-clock terms for the same ply, which is a
  property of the position and SHALL NOT be hidden

#### Scenario: A board is asked for a depth it cannot reach

- **WHEN** a board's search ends below the depth it was asked for
- **THEN** that board SHALL NOT be asked again for this position
- **AND** the page MUST NOT raise its target regardless

### Requirement: The transposition table SHALL persist across slices

The page MUST NOT send `ucinewgame` or `Clear Hash` when moving the engine between the two boards.
Returning to a board SHALL find that board's earlier search still in the hash, so that the search
resumes usefully deeper rather than repeating work.

This is what makes alternating affordable. `go` restarts iterative deepening at depth 1 in every
case — the depth carried across visits comes from the hash and from nothing else, so clearing it
removes the whole benefit silently, with no error and no visible failure.

The hash size SHALL be set explicitly and sized for TWO positions sharing one table, not left to the
engine build's default.

#### Scenario: The engine returns to a board it has already searched

- **WHEN** the engine begins a new slice on a board it evaluated earlier in the session
- **THEN** it SHALL reach at least the depth it previously reached on that board
- **AND** it SHALL reach exactly one ply deeper than its previous visit

#### Scenario: A new game or position is loaded

- **WHEN** the analysed position changes because the reader navigates the game
- **THEN** the hash MAY be retained
- **AND** it MUST NOT be cleared merely because the engine is switching boards

### Requirement: The end of a search SHALL be observable

The engine message loop SHALL handle `bestmove`. A slice scheduler cannot alternate without knowing
that a search has ended, and today the loop handles only `info`, `uciok`, `readyok` and the engine
banner, so a search that finishes on its own is indistinguishable from one still running.

#### Scenario: A slice reaches its target depth

- **WHEN** a search ends because the depth it was asked for has been reached
- **THEN** the page SHALL observe that it ended
- **AND** it SHALL start the next board's slice without waiting for anything else

### Requirement: Each board's evaluation SHALL say how current it is

Because one engine serves two boards in turn, a board's displayed evaluation is as of its last slice
and not of this instant. The page SHALL show the depth reached PER BOARD — one readout per board,
not one shared readout — so that a number which has not been refreshed recently is visibly so rather
than quietly wrong.

#### Scenario: One board has not been evaluated for several slices

- **WHEN** a board's evaluation is older than the other board's
- **THEN** the reader SHALL be able to tell from the displayed depth

#### Scenario: The engine is searching one board

- **WHEN** the engine is on one board
- **THEN** that board's depth readout SHALL follow its search
- **AND** the other board's readout SHALL hold its last value rather than blanking or borrowing the
  searched board's

### Requirement: A board that reaches the ceiling SHALL stop being searched

Revisiting a board already searched to the depth ceiling returns the same answer out of the hash. A
board that has reached the ceiling SHALL NOT be scheduled again, and when both boards have reached
it the engine SHALL stop searching entirely until the ceiling is raised. The switch SHALL remain on;
what stops is the scheduling.

#### Scenario: One board reaches the ceiling

- **WHEN** one board's search reaches the depth ceiling
- **THEN** the engine SHALL continue on the other board alone
- **AND** the finished board's readout SHALL hold its final depth

#### Scenario: Both boards reach the ceiling

- **WHEN** both boards have reached the ceiling
- **THEN** the page SHALL issue no further search commands
- **AND** it SHALL offer the reader a way to raise the ceiling
- **AND** raising it SHALL restart the alternation with both boards eligible again

### Requirement: The principal variations SHALL be shown for both boards at once

The panel SHALL show one column of principal variations per board rather than one list belonging to
whichever board reported last. The columns SHALL be ordered by the boards' POSITION on the page —
the viewer's own board first — never by board identity, so that a viewer seated on either board
finds each column under the board it evaluates.

The number of lines per board SHALL be settable by the reader on this page.

#### Scenario: Both boards are being evaluated

- **WHEN** the engine is alternating between the boards
- **THEN** each board's variations SHALL appear in that board's own column
- **AND** a slice on one board SHALL NOT overwrite the other board's column

#### Scenario: The viewer played on the second board

- **WHEN** the analysis page is opened by a viewer whose own board is board B
- **THEN** the first column SHALL belong to board B, matching where that board is drawn

### Requirement: A variation SHALL be rendered in full even when it depends on the partner

Fairy-Stockfish searches drops of pieces a side does not hold yet, because in bughouse those pieces
arrive from the partner's board. Such a variation SHALL be rendered in full rather than discarded or
truncated. The pieces that are not in hand SHALL be marked so the reader can see which part of a
line depends on the partner; the marking SHALL identify the PIECE and not its destination square.

A row whose variation cannot be rendered MUST NOT be left showing a variation from an earlier depth.

#### Scenario: A line drops a piece nobody holds

- **WHEN** a principal variation contains a drop of a piece the moving side does not hold
- **THEN** the whole line SHALL still be rendered in the reader's notation
- **AND** the piece that is not in hand SHALL be marked as depending on the partner

#### Scenario: A line drops a piece the side does hold

- **WHEN** a principal variation contains a drop of a piece that IS in that side's pocket
- **THEN** that drop SHALL NOT be marked

### Requirement: Each board's identity SHALL be stated where the gauges are

A reader has to be able to say which board is A and which is B, because identity is what the game
record, the pockets and the per-board columns are keyed to, while the boards themselves are PLACED
by seat. Wherever the layout carries the evaluation gauges, it SHALL also state each board's
identity next to the board that gauge reports on.

#### Scenario: A viewer opens a game in a layout that shows the gauges

- **WHEN** the analysis page renders with both gauges visible
- **THEN** each board SHALL be labelled with its own identity
- **AND** the label SHALL follow the board, not the position, for a viewer seated on either board
