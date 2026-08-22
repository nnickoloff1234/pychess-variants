## ADDED Requirements

### Requirement: An offer is answered on the control that made it

Every state of an offer — that it has been made, and the means of answering it — SHALL be drawn on
the control the offer was made with. An offer SHALL NOT be answered from a panel, strip or area
placed apart from that control.

No element SHALL exist whose only purpose is to hold offers. Where the last such element's states
have moved onto their controls, that element and any layout area reserved for it SHALL be removed
rather than left empty.

An offer that is turned down SHALL return every control it touched to its resting state, on the side
that made it as well as the side that received it. A control SHALL NOT be left indicating an offer
that has already been answered.

#### Scenario: The answer appears where the question was asked
- **WHEN** a player is offered a draw or a rematch
- **THEN** the means of accepting it is drawn on the control that offers that same thing, and nowhere else on the page

#### Scenario: The offerer sees the offer on their own control
- **WHEN** a player has made an offer and it has not yet been answered
- **THEN** the control they used shows that the offer is outstanding, and no message about it appears anywhere else

#### Scenario: A declined offer resets both sides
- **WHEN** an offer is declined
- **THEN** the control that made it and the control that could have accepted it both return to their resting state

#### Scenario: Nothing is left behind for offers to live in
- **WHEN** the page is inspected while no offer is outstanding
- **THEN** there is no element, and no layout area, reserved for holding an offer

### Requirement: A draw offer is a state of the draw control

A draw offer SHALL be presented as a state of the draw control itself, distinguished from its resting
state by appearance alone. Its size, position and symbol SHALL be unchanged between states, so that
it reads as one control that has changed rather than as a different control appearing. The draw
control is sized deliberately for a target reached under time pressure, and no state may alter that.

The control SHALL have exactly three states: at rest, offering, and offered-to-me. There SHALL be no
separate control for declining.

Accepting SHALL take one press and SHALL NOT ask for confirmation. It SHALL NOT reuse the path that
OFFERS a draw, so that accepting never asks the accepting player to confirm that they wish to offer.

**Because appearance alone distinguishes accepting a draw from offering one, and accepting ends the
game irreversibly, the offered-to-me state SHALL be unmistakable** — distinct from the resting state,
from the offering state, and from any other emphasis already used on the page's controls.

#### Scenario: The control turns, rather than being replaced
- **WHEN** a draw is offered to a player
- **THEN** their draw control is drawn in the offered-to-me state at the same size, position and symbol as at rest

#### Scenario: One press accepts
- **WHEN** a player presses the draw control in the offered-to-me state
- **THEN** the draw is accepted immediately, with no confirmation step

#### Scenario: Accepting is not offering
- **WHEN** a player accepts a draw that was offered to them
- **THEN** they are never asked whether they are sure they want to offer a draw

#### Scenario: There is no decline control
- **WHEN** a player is looking at a draw offered to them
- **THEN** the only control presented is the one that accepts it

### Requirement: Playing on declines a draw offer

Making a move SHALL decline any draw offer outstanding against the player who moves. It SHALL inform
the offering player that the offer was declined, and SHALL return the controls on both sides to their
resting state.

This SHALL be the means by which a declined draw is reported, since no control declines one. Playing
on is what a player does instead of answering, so it SHALL carry the answer.

Making a move when no offer is outstanding SHALL do nothing of the kind.

#### Scenario: A move declines the offer
- **WHEN** a player who has been offered a draw makes a move
- **THEN** the offer is declined, the offering player is informed, and both controls return to rest

#### Scenario: A move with no offer outstanding is unaffected
- **WHEN** a player makes a move and no draw offer is outstanding against them
- **THEN** nothing about draw offers occurs

### Requirement: A rematch offer replaces the rematch control

A rematch offer SHALL replace the rematch control in place, for as long as the offer is live, with
the means of accepting and declining it. The controls beside it SHALL NOT move or change while it
does.

Unlike a draw, a rematch offer SHALL keep a decline control: the game is already over, so there is no
move by which playing on could carry the answer.

#### Scenario: The pair takes the button's place
- **WHEN** a player is offered a rematch
- **THEN** the accept and decline controls occupy the place of the rematch control, and the other end-of-game controls are where they were

#### Scenario: The rematch offerer's control shows it
- **WHEN** a player has offered a rematch and it has not been answered
- **THEN** their rematch control shows the offer is outstanding, and no message about it appears elsewhere
