## ADDED Requirements

### Requirement: A username and its rating are one sized unit

A seat's username and its rating SHALL be sized by a single rule applied to the element containing
both, so that a rating follows its username without a second rule being kept in step with the first.

#### Scenario: The rating follows the name
- **WHEN** a seat displays a rating beside its username
- **THEN** the rating's size follows from the same rule that sizes the username

### Requirement: The clock sits against the board and the name on the outside

A seat strip SHALL be laid out according to which side of its board it is on. The clock SHALL be
placed against the board and the username on the far side of the strip, so that a strip above its
board mirrors one below it:

| strip | inside the strip, top to bottom | popped out |
|---|---|---|
| above the board | username, then clock filling the height down to the board | above the strip |
| below the board | clock filling the height from the board, then username | below the strip |

Which strip is which SHALL be read from `.seat-strip0` and `.seat-strip1`, which already carry that
fact: the grid areas `clock-top`, `clock-bot`, `clockB-top` and `clockB-bot` are assigned from those
classes, so a strip's class is what puts it on its side of the board. **No further marker SHALL be
introduced**, since a second statement of the same fact would have to be kept in step with the flip
and switch logic by hand.

This holds through the DOM moves those operations make: a flip swaps the blocks inside the strips
and a switch exchanges top strips with top strips, so a strip never changes the side it is on.

#### Scenario: A strip above its board is the mirror of one below
- **WHEN** the strips above and below a board are compared
- **THEN** the one above has its username at the top and its clock beneath, and the one below has its clock on top and its username beneath

#### Scenario: A popped-out name leaves on the outward side
- **WHEN** a username is given a row of its own
- **THEN** it appears above the strip if the strip is above its board, and below the strip if the strip is below it

#### Scenario: The side survives a flip and a switch
- **WHEN** the boards are flipped, or the two boards are switched between columns
- **THEN** each strip is still laid out for the side it is on, with no class maintained by that logic

## MODIFIED Requirements

### Requirement: A seat's furniture is sized from its own board

Every part of a seat's furniture that has a physical relationship to the board — the strip that
holds it, the pocket and the clock — SHALL be sized from the board that seat is playing on, and
SHALL change with that board's size.

It SHALL NOT be sized from a unit shared by the whole layout where the two boards can differ in
size. A shared unit is derived from the viewport and cannot distinguish the two, so a board
reduced to a third of its partner's size keeps the furniture of a full-size board.

**The username and its rating are excepted, and are sized by the requirement below instead.** Text
has a readable size that is not a property of a chessboard: sizing the name from the square produced
7.21px on a seat whose row was 165.3px wide with nothing else on it, and 16.74px on its neighbour,
for no reason other than that one board was smaller than the other. The pocket must match its
board because it sits pieces on squares; the clock must fit its strip; a name must be legible.

At full size the furniture SHALL be what it is today: this requirement fixes how it changes, not
what it looks like when nothing has been changed.

The pocket SHALL be a fixed number of its own board's squares wide. That number is NOT fixed
across layout modes — the modes differ deliberately, and a pocket may be five squares in one and
four in another — only that it is expressed in the squares of the board it belongs to.

#### Scenario: Two boards at different sizes get different furniture
- **WHEN** one board is reduced and the other left at full size
- **THEN** the reduced board's strip, clock and pocket are all smaller than its partner's, in proportion to the two boards

#### Scenario: A smaller board does not get a smaller name
- **WHEN** one board is reduced and the other left at full size, and both seats have room for their names
- **THEN** both usernames are drawn at the same size

#### Scenario: Full size is unchanged
- **WHEN** both boards are at full size
- **THEN** the strip, pocket and clock are the size they were before this change

#### Scenario: The strip does not tower over its board
- **WHEN** a board is reduced
- **THEN** its strip's height stays proportional to that board's square, rather than staying at the height a full-size board would give it

#### Scenario: A pocket is measured in its own board's squares
- **WHEN** a board is reduced
- **THEN** its pocket occupies the same number of that board's squares as it did before, and no space is left over inside the strip around it

### Requirement: The seat strip apportions its width by priority

A seat strip SHALL be the full width of its board, and SHALL apportion that width in this order,
which holds in every mode and in both arrangements of the strip:

1. The **pocket** takes its natural width and is flush with the strip's leading edge. It is never
   reduced to make room for anything else, because its squares match the board's.
2. The **username**, where it is drawn inside the strip, takes the whole of the width the pocket
   leaves, on a line of its own.
3. The **clock** takes the space that remains — the same width, on its own line above or below the
   name, and the height left over.

The clock SHALL NOT stand beside the username and take the width from it. Measured with them side
by side, a 400px strip gave the pocket 250, the clock 122.5 and the username 27.5 — which is an
initial, not a name. The previous ordering, which gave the clock its natural width before the name
saw any, is what produced that.

Neither the pocket nor the clock SHALL be resized by a longer or shorter name. A name that does not
fit the width it is given is truncated, not accommodated.

Where the stack has vertical room to grow, the username SHALL take a line of its own outside the
pocket-and-clock row, spanning the full width of the strip and rendering on a single line. This is
the ordinary arrangement, not an option: the exception is a board at or near full zoom, where the
stack is already the full height it is given and there is no room to spend. There the strip keeps
its single row and the username takes the full width the pocket leaves, as above.

Whether there is room SHALL be decided per seat, from the space that seat's stack is given, since
the two boards can be at different zooms and the answer differs between them — except in a mode that
reserves the room in its height budget, where the answer cannot vary and SHALL NOT be measured.

Taking a line of its own SHALL NOT change the pocket's size, and SHALL NOT widen the strip.

#### Scenario: A long name does not disturb the pocket or the clock
- **WHEN** a seat is occupied by a player whose name is long enough to fill the strip
- **THEN** the pocket and the clock keep the same rendered size they have with a short name, and the name is truncated instead

#### Scenario: The strip does not widen the grid
- **WHEN** any name, from the shortest to the longest permitted, is rendered
- **THEN** the width of the round app is unchanged, satisfying the existing requirement that no grid track is sized by late-arriving content

#### Scenario: The name has the width the pocket leaves
- **WHEN** a seat strip is drawn with the username inside it
- **THEN** the username and its presence indicator span the strip's width minus the pocket, and the clock spans the same width on its own line

#### Scenario: The name takes its own line
- **WHEN** a board is reduced enough that its stack no longer fills the height it is given
- **THEN** that seat's name occupies its own line outside the pocket and the clock, spans the full width of the strip, and renders on one line

#### Scenario: Full zoom keeps the single row
- **WHEN** a board is at or near full zoom
- **THEN** its strip keeps its single row, the username takes the full width the pocket leaves with the clock on its own line, and nothing is pushed outside the space the stack is given

#### Scenario: The two seats are decided separately
- **WHEN** one board is at full zoom and the other is reduced, in a mode that does not reserve the room
- **THEN** only the reduced board's seats give their names a line of their own

### Requirement: The clock is anchored and sized to the strip

The clock SHALL be aligned to the trailing edge of its strip and to the edge nearest its board, and
SHALL be sized as large as the space left to it allows rather than at a fixed point size or at a
fixed fraction of the board's square.

The space left to it is what the pocket and the username have not taken, by the priority above. It
SHALL grow into that space: a clock sized from the board's square is blind to its room, measured at
65.1 x 19.2 in a space 194 x 49 once the username had left the strip entirely, and 105 wide in a
218.7px slot with the username on a line below it.

The space SHALL come from the seat's own board and its own strip, so a clock beside a reduced board
is smaller than one beside a full-size board. It SHALL NOT be derived from a unit shared by both
boards: measured with one board at 35%, an unshrunk clock was 136.7px against a 208px board — 70% of
the board's entire width — and it was what left the username 5.8px.

The clock's size SHALL be bounded, or the bound's absence justified, so that a clock on a strip the
name has vacated does not become the loudest element on the page.

The clock SHALL NOT reserve room for the wider form it takes when it falls under ten seconds and
begins showing tenths. Reserving that width leaves it standing empty for almost the whole game —
measured at 21.8px of a 218.7px strip. Since the username now occupies its own line rather than the
width beside the digits, a clock crossing into tenths widens within its own line and the username is
unaffected.

Alignment SHALL be stated in terms of the strip's visual trailing edge, not its flex main-end. The
clock's own box is laid out in reverse, so an alignment expressed against the main axis places it on
the wrong side.

#### Scenario: The clock grows into a strip the name has left
- **WHEN** a username is drawn on a row of its own rather than inside the strip
- **THEN** the clock takes the width and height the pocket leaves, and its digits are drawn larger than they would be sharing the strip with the name

#### Scenario: Clock scales with its own board
- **WHEN** one board's size is changed and the other's is not
- **THEN** only that board's clocks change size, and each remains the largest size its own strip allows

#### Scenario: Clock scales with the square unit
- **WHEN** the viewport height changes, changing the square unit and so the strip's height
- **THEN** the clock's rendered size changes with it

#### Scenario: Clock stays in the corner
- **WHEN** the strip's width changes for any reason
- **THEN** the clock remains flush with its strip's trailing edge and the edge nearest its board

#### Scenario: The name uses the width the clock is not using
- **WHEN** a clock is displaying its ordinary form, without tenths
- **THEN** no empty width is held anywhere in the strip against the wider form the clock may later take

#### Scenario: A clock entering tenths takes the width back
- **WHEN** a clock falls under ten seconds and begins displaying tenths
- **THEN** its box widens within its own line, and the username's line is unchanged — where the name once re-wrapped, it now has a line of its own and is untouched

#### Scenario: Clocks of different forms all sit in the corner
- **WHEN** clocks showing different forms are compared across the four strips
- **THEN** each ends flush with its strip's trailing edge, whatever its width

### Requirement: The username is legible, and truncated rather than reflowed

The username and its online indicator SHALL be rendered at a size bounded above by a single
constant, which is the size a single-board round page draws a username at — measured at 16.8px,
being `1.2em` of a 14px root. That bound SHALL be the same value in every mode and for every seat.

Within that bound the size SHALL follow the room the name has been given, so that a name grows up to
the cap wherever there is room for it, and is drawn smaller where there is not — that is, where it
is squeezed into the width the pocket leaves rather than given a row of its own.

The size SHALL NOT be smaller than the board's own coordinate labels, which remains the floor.

Sizing SHALL NOT be expressed as a fraction of the viewport width, because the bughouse round page
is routinely used in a window narrow enough for such a value to fall below legibility — at `0.7vw` a
quarter-tiled window renders the name under 7px.

Sizing SHALL NOT be a fixed fraction of the board's square either, for the reason given under the
furniture requirement above.

No multiplier SHALL be applied to the size according to which arrangement the name is in. A name on
its own row is larger because its row is wider, not because it is doubled.

The size SHALL NOT depend on the length of the particular username. A size that varied per player
would make the reserved row's height unknowable, which is what the height budget depends on.

A name SHALL occupy exactly **one** line, in both arrangements. A name too long for the width it is
given SHALL be truncated with an ellipsis. It SHALL NOT wrap: a wrapped name in a one-square strip
is two clipped fragments, the second usually cut mid-word by the character-level breaking this
requirement previously mandated, and an ellipsis says the name continues where a hard clip merely
looks broken.

The complete name SHALL remain present in the document, so that truncation is a visual limit only
and assistive technology and hover text still carry the whole value.

#### Scenario: A name grows up to the cap and no further
- **WHEN** a username has a row of its own that is wider than the capped size needs
- **THEN** it is drawn at the cap, and not larger

#### Scenario: Name is at least as large as a coordinate label
- **WHEN** a seat's name is compared with a rank label on the adjacent board
- **THEN** the name's font size is greater than or equal to the label's

#### Scenario: A squeezed name gets smaller before it truncates
- **WHEN** a username is drawn inside the strip, in the width the pocket leaves
- **THEN** it may be drawn below the cap, and is truncated only once it still does not fit at that size

#### Scenario: A name too long for one line
- **WHEN** a name does not fit the width available to it
- **THEN** it is truncated with an ellipsis on that line rather than continuing onto a second, which is the reverse of what this scenario previously required

#### Scenario: A name too long for two lines
- **WHEN** a name is far longer than its width can hold
- **THEN** no second line appears at any length: the name stays on one line, ends in an ellipsis, and the full value remains in the document for assistive technology and hover text

#### Scenario: Two names of different lengths are the same size
- **WHEN** two seats with equal room hold usernames of very different lengths
- **THEN** both are drawn at the same font size, and only the longer one is truncated
