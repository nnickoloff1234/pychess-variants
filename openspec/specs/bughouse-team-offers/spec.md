# bughouse-team-offers

## Purpose

What a draw offer and a resignation mean in a four-player game: who they are addressed to, who may answer them, and what ends them. Bughouse is played by two teams of two, so an offer belongs to a team rather than to a player — the team that asked waits, and the team that may answer acts. Established by the `team-offers-for-draw-and-resign` change (2026-08-22).

## Requirements

### Requirement: An offer addresses a team, and every player it concerns is told

In a four-player game an offer SHALL be addressed to a TEAM rather than to a single opponent. Every
player the offer concerns SHALL receive it, and no player it concerns SHALL be left unaware of it
because of how a recipient was derived.

A draw offer SHALL reach all four players. The player who made it SHALL be told that it was sent, so
that no player can be uncertain whether their own action took effect.

An offer SHALL NOT be delivered by naming one opponent. Deriving a recipient from a single board's
two seats leaves the other two players unaddressed, which is the defect this requirement exists to
forbid.

#### Scenario: A draw offer reaches everyone
- **WHEN** a player offers a draw
- **THEN** all four players are told of it, the offering player included

#### Scenario: No player is left out by a single-board derivation
- **WHEN** the code that addresses an offer is inspected
- **THEN** it addresses teams, and no recipient is derived from one board's two seats

### Requirement: Only the opposing team may accept a draw

A draw offer SHALL be answerable only by the team that did not make it. Either member of the opposing
team SHALL be able to accept it, and accepting SHALL draw the game and end it.

The offering player's partner SHALL NOT be able to accept. They SHALL see that their team has an
offer outstanding, presented the same way it is presented to the player who made it, since in both
cases the team is waiting and the player is not the one who answers.

A move by either member of the opposing team SHALL decline the offer on behalf of that team, and
SHALL return every control to its resting state.

#### Scenario: Either opponent can accept
- **WHEN** a draw is offered and either opposing player accepts it
- **THEN** the game is drawn and ends

#### Scenario: The partner cannot accept
- **WHEN** a draw is offered and the offering player's partner looks at their own draw control
- **THEN** it shows that their team is waiting and cannot be used to accept

#### Scenario: Playing on declines for the team
- **WHEN** either opposing player makes a move while a draw offer is outstanding
- **THEN** the offer is declined, the offering team is told, and all four controls return to rest

### Requirement: Resigning requires both teammates

A single player SHALL NOT be able to resign a four-player game alone. Clicking resign SHALL NOT end
the game; it SHALL ask that player's partner to confirm.

The game SHALL end only when the partner confirms, and SHALL then be resigned in favour of the
opposing team. A resignation is a decision about a result both teammates receive, so it SHALL take
both of them.

Confirming SHALL take one press of the partner's own resign control. There SHALL be no separate
control for it.

A move by either teammate SHALL cancel a pending resignation and return both controls to rest.
Playing on is an answer, and it SHALL serve as one whether it is the player who asked or the player
who was asked.

#### Scenario: One player cannot end the game
- **WHEN** a player presses resign
- **THEN** the game continues, and their partner is asked to confirm

#### Scenario: The partner confirms
- **WHEN** the partner presses their own resign control while a resignation is pending
- **THEN** the game ends, resigned in favour of the opposing team

#### Scenario: Playing on cancels it
- **WHEN** either teammate makes a move while a resignation is pending
- **THEN** the resignation is cancelled and both controls return to rest

#### Scenario: Abort and flag are unaffected
- **WHEN** a game is aborted, flagged or abandoned
- **THEN** it ends immediately, with no second step

### Requirement: A pending resignation is private to the team

A pending resignation SHALL be told only to the two players on the resigning team. The opposing team
SHALL NOT be told, and it SHALL NOT be broadcast.

Whether opponents are considering resignation is information about how they judge the position, and
disclosing it during play changes the game. This is the one offer state deliberately not shared with
everyone.

#### Scenario: Opponents see nothing
- **WHEN** a resignation is pending on one team
- **THEN** neither opposing player is told, and neither of their controls changes

#### Scenario: The teammates both see it
- **WHEN** a resignation is pending
- **THEN** the player who asked sees that their team is waiting, and the partner sees that they may confirm

### Requirement: An answerable offer needs no confirmation step

An action that only proposes something SHALL NOT ask the player to confirm it. Offering a draw
proposes a result the opponents may decline by playing on, and resigning now asks a partner rather
than ending the game, so neither SHALL be guarded by a confirmation.

Where an action IS irreversible, the guard SHALL be a second person or a distinct control state
rather than a dialog repeating the question to the same person.

#### Scenario: Offering a draw is one press
- **WHEN** a player presses the draw control at rest
- **THEN** the offer is sent immediately, with no confirmation step

#### Scenario: Asking to resign is one press
- **WHEN** a player presses the resign control at rest
- **THEN** their partner is asked immediately, with no confirmation step, and the game does not end
