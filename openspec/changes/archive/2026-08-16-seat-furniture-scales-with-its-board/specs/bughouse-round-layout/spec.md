## ADDED Requirements

### Requirement: A seat's furniture is sized from its own board

Every part of a seat's furniture — the strip that holds it, the pocket, the clock and the
username — SHALL be sized from the board that seat is playing on, and SHALL change with that
board's size.

It SHALL NOT be sized from a unit shared by the whole layout where the two boards can differ in
size. A shared unit is derived from the viewport and cannot distinguish the two, so a board
reduced to a third of its partner's size keeps the furniture of a full-size board.

At full size the furniture SHALL be what it is today: this requirement fixes how it changes, not
what it looks like when nothing has been changed.

The pocket SHALL be a fixed number of its own board's squares wide. That number is NOT fixed
across layout modes — the modes differ deliberately, and a pocket may be five squares in one and
four in another — only that it is expressed in the squares of the board it belongs to.

#### Scenario: Two boards at different sizes get different furniture
- **WHEN** one board is reduced and the other left at full size
- **THEN** the reduced board's strip, clock, pocket and username are all smaller than its partner's, in proportion to the two boards

#### Scenario: Full size is unchanged
- **WHEN** both boards are at full size
- **THEN** every part of both seats' furniture is the size it was before this change

#### Scenario: The strip does not tower over its board
- **WHEN** a board is reduced
- **THEN** its strip's height stays proportional to that board's square, rather than staying at the height a full-size board would give it

#### Scenario: A pocket is measured in its own board's squares
- **WHEN** a board is reduced
- **THEN** its pocket occupies the same number of that board's squares as it did before, and no space is left over inside the strip around it

## MODIFIED Requirements

### Requirement: The clock is anchored and sized to the strip
The clock SHALL be aligned to the trailing edge and the bottom edge of its strip, and SHALL be sized as large as the strip's height allows rather than at a fixed point size. Its height is a fixed multiple of its font size — close to four — so "as large as fits" is a statement about the strip's height, not a free choice.

The strip's height SHALL come from the seat's own board, so a clock beside a reduced board is smaller than one beside a full-size board. It SHALL NOT be derived from a unit shared by both boards: measured with one board at 35%, an unshrunk clock was 136.7px against a 208px board — 70% of the board's entire width — and it was what left the username 5.8px.

The clock SHALL take its **natural** width at all times, and SHALL NOT reserve room for the wider form it takes when it falls under ten seconds and begins showing tenths. Reserving that width leaves it standing empty for almost the whole game — measured at 21.8px of a 218.7px strip — and the username is a better use of the space than a placeholder for a state that has not happened yet.

The consequence is accepted deliberately: when a clock crosses into tenths the username loses that width and re-wraps. The username is already subject to truncation, and a clock in its last seconds is what the player is looking at.

Alignment SHALL be stated in terms of the strip's visual trailing edge, not its flex main-end. The clock's own box is laid out in reverse, so an alignment expressed against the main axis places it on the wrong side.

#### Scenario: Clock scales with its own board
- **WHEN** one board's size is changed and the other's is not
- **THEN** only that board's clocks change size, and each remains the largest size that fits its own strip

#### Scenario: Clock scales with the square unit
- **WHEN** the viewport height changes, changing the square unit and so the strip's height
- **THEN** the clock's rendered size changes with it, remaining the largest size that fits the strip

#### Scenario: Clock stays in the corner
- **WHEN** the strip's width changes for any reason
- **THEN** the clock remains flush with the strip's trailing and bottom edges

#### Scenario: The name uses the width the clock is not using
- **WHEN** a clock is displaying its ordinary form, without tenths
- **THEN** no empty width is held between the username and the clock's digits, and the username's line runs up to them

#### Scenario: A clock entering tenths takes the width back
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its box widens, and the username beside it re-wraps into what remains

#### Scenario: Clocks of different forms all sit in the corner
- **WHEN** clocks showing different forms are compared across the four strips
- **THEN** each ends flush with its strip's trailing edge, whatever its width

### Requirement: The seat strip apportions its width by priority
In short landscape a seat strip SHALL be the full width of its board, and SHALL apportion that width in this order:

1. The **pocket** takes its natural width and is flush with the strip's leading edge.
2. The **clock** takes its natural width and is flush with the strip's trailing edge.
3. The **username** takes all width remaining between them.

The username SHALL be the only element that absorbs a change in the strip's width, so that neither the pocket nor the clock is resized by a longer or shorter name.

Where the stack has vertical room to grow, the username SHALL take a line of its own below the pocket and the clock, spanning the full width of the strip and rendering on a single line. This is the ordinary arrangement, not an option: the exception is a board at or near full zoom, where the stack is already the full height it is given and there is no room to spend. There the strip keeps its single row and the username goes on absorbing the width left between the pocket and the clock, as above.

Whether there is room SHALL be decided per seat, from the space that seat's stack is given, since the two boards can be at different zooms and the answer differs between them.

Taking a line of its own SHALL NOT change the pocket's or the clock's size, and SHALL NOT widen the strip: it spends vertical room that was otherwise unused, and nothing else.

#### Scenario: A long name does not disturb the pocket or the clock
- **WHEN** a seat is occupied by a player whose name is long enough to fill the strip
- **THEN** the pocket and the clock keep the same rendered size and position they have with a short name, and the name occupies exactly the space between them

#### Scenario: The strip does not widen the grid
- **WHEN** any name, from the shortest to the longest permitted, is rendered
- **THEN** the width of the round app is unchanged, satisfying the existing requirement that no grid track is sized by late-arriving content

#### Scenario: The name takes its own line
- **WHEN** a board is reduced enough that its stack no longer fills the height it is given
- **THEN** that seat's name occupies its own line below the pocket and the clock, spans the full width of the strip, and renders on one line, while the pocket and clock keep their sizes and positions

#### Scenario: Full zoom keeps the single row
- **WHEN** a board is at or near full zoom
- **THEN** its strip keeps its single row, the name sits between the pocket and the clock as before, and nothing is pushed outside the space the stack is given

#### Scenario: The two seats are decided separately
- **WHEN** one board is at full zoom and the other is reduced
- **THEN** only the reduced board's seats give their names a line of their own
