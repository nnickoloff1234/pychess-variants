## MODIFIED Requirements

### Requirement: A draw offer is a state of the draw control

A draw offer SHALL be presented as a state of the draw control itself, distinguished from its resting
state by appearance alone. Its size, position and symbol SHALL be unchanged between states, so that
it reads as one control that has changed rather than as a different control appearing. The draw
control is sized deliberately for a target reached under time pressure, and no state may alter that.

The control SHALL have exactly three states: at rest, waiting, and answerable. There SHALL be no
separate control for declining.

**The state SHALL follow the viewer's TEAM, not the sender.** Both members of the team that offered
show the waiting state; both members of the team that may answer show the answerable one.

Accepting SHALL take one press and SHALL NOT ask for confirmation. Offering SHALL likewise take one
press and SHALL NOT ask for confirmation, since an offer proposes rather than decides. Neither SHALL
reuse the path of the other, so that neither ever asks the wrong question.

**Because appearance alone distinguishes accepting a draw from offering one, and accepting ends the
game irreversibly, the answerable state SHALL be unmistakable** — distinct from the resting state,
from the waiting state, and from any other emphasis already used on the page's controls.

#### Scenario: The control turns, rather than being replaced
- **WHEN** a draw is offered to a player
- **THEN** their draw control is drawn in the answerable state at the same size, position and symbol as at rest

#### Scenario: One press accepts
- **WHEN** a player presses the draw control in the answerable state
- **THEN** the draw is accepted immediately, with no confirmation step

#### Scenario: One press offers
- **WHEN** a player presses the draw control at rest
- **THEN** the offer is sent immediately, with no confirmation step

#### Scenario: The state follows the team
- **WHEN** a draw is offered
- **THEN** both offering players show the waiting state and both opposing players show the answerable one

#### Scenario: There is no decline control
- **WHEN** a player is looking at a draw offered to them
- **THEN** the only control presented is the one that accepts it

## ADDED Requirements

### Requirement: The resign control carries the state of a pending resignation

The resign control SHALL have three states: at rest, waiting, and confirmable. As with the draw
control, they SHALL differ in appearance only — size, position and symbol SHALL be identical — so
that it reads as one control that has changed.

The player who asked SHALL see the waiting state. Their partner SHALL see the confirmable state, and
pressing it SHALL end the game. Opposing players SHALL see the resting state throughout.

**Colour SHALL NOT be the only thing distinguishing the confirmable resign state from the resting
one.** The same control, with the same glyph in the same place, asks a partner in one state and ends
the game in the other, so a player who cannot perceive the difference resigns when they meant to ask.
The confirmable state SHALL therefore carry a signal that does not depend on colour perception.

This is about telling LIT from AT REST, not about telling the resign control from the draw control —
those already differ by glyph.

#### Scenario: The asking player's control waits
- **WHEN** a player has pressed resign and their partner has not answered
- **THEN** their resign control shows the waiting state and cannot be pressed again to resign

#### Scenario: The partner's control confirms
- **WHEN** a resignation is pending
- **THEN** the partner's resign control is drawn in the confirmable state, at the same size, position and symbol as at rest

#### Scenario: Lit is told from at rest without colour
- **WHEN** the resign control is compared in its confirmable and resting states with colour disregarded
- **THEN** the two remain distinguishable, so that pressing it can never mean the wrong thing

### Requirement: The rematch control offers, withdraws, and accepts

The rematch control SHALL be a single button with three states: at rest it offers, while this
player's own offer stands it WITHDRAWS that offer, and while another player's offer stands it
accepts. Its place among the end-of-game controls SHALL NOT change between them, so the controls
beside it never move.

There SHALL be no separate control for declining a rematch. Declining is not pressing accept, and a
control whose only effect is to do nothing has to be explained. What SHALL exist instead is the
withdrawal: a player who has offered SHALL be able to take that offer back, and doing so SHALL stop
it counting towards the agreement that starts a rematch.

Because this control is wide enough for text, its LABEL SHALL say which of the three states it is
in. Colour may reinforce that but SHALL NOT be what carries it — unlike the icon controls, where
there is no room for a word.

#### Scenario: The offerer can take it back
- **WHEN** a player has offered a rematch and presses the same control again
- **THEN** the offer is withdrawn, every player is told, and the control returns to offering

#### Scenario: A withdrawn offer no longer counts
- **WHEN** an offer is withdrawn and the remaining players all accept
- **THEN** no rematch begins, because the withdrawn offer is not counted towards agreement

#### Scenario: One control, and its label says which
- **WHEN** the rematch control is inspected in each of its three states
- **THEN** it is the same single button in the same place, and its label distinguishes offering from withdrawing from accepting

### Requirement: The result is announced where the players are looking

When a game ends, a line stating how it ended and which team won SHALL appear in the round chat,
ahead of any notice about who may now read which messages.

The movelist states the same thing, but only to a player who has the moves in front of them; the
tab shown by default is the chat. A player SHOULD NOT have to change tabs to learn whether they won.

The wording SHALL be the one the movelist already uses, so the two can never describe the same
result differently, and SHALL be emitted once however many times the end of the game is reported.

#### Scenario: The chat says how it ended and who won
- **WHEN** a game ends by resignation, checkmate, timeout or agreement
- **THEN** a line naming that reason, and the winning team where there is one, appears in the chat

#### Scenario: Said once
- **WHEN** the end of a game is reported more than once
- **THEN** the result line appears a single time

## REMOVED Requirements

### Requirement: A rematch offer replaces the rematch control

**Reason**: Superseded by "The rematch control offers, withdraws, and accepts", and directly
contradicted by it. That requirement mandated a PAIR of controls in the rematch button's place and
said in as many words that "a rematch offer SHALL keep a decline control". Both are gone. Declining
a rematch turned out to be indistinguishable from not accepting one, so the decline control did
nothing that inaction did not already do — while the thing genuinely missing, a way for the offerer
to withdraw, had no control at all.

**Migration**: Its two guarantees are preserved by the requirement that replaces it. "The controls
beside it SHALL NOT move or change" is now "Its place among the end-of-game controls SHALL NOT
change between them, so the controls beside it never move." "The rematch offerer's control shows
it" is now the withdrawing state, which both shows the offer is outstanding and acts on it. Nothing
that requirement promised is lost; only the decline control is, deliberately.
