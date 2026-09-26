## ADDED Requirements

### Requirement: The analysis page SHALL NOT assert a presence state it has not observed

A presence indicator is a claim about a real person. The bughouse analysis page MUST NOT render one
whose value it never established — a permanently offline dot beside every player is a false
statement, not a neutral default.

The claim may be established either by reading the player's state when the page is served or by
holding a connection that reports it. It is NOT established by rendering a fixed value, by
rendering a third "unknown" state that still looks like presence, or by leaving the dot and
documenting that it is wrong.

**A connection is not required.** The page is server-rendered and the state is available at render
time, so "correct when the page opens" is reachable without one — which is how this shipped.

#### Scenario: A player of the game is online elsewhere on the site

- **WHEN** a viewer opens the analysis page for a bughouse game
- **AND** one of its four players is connected anywhere on the site — the lobby, another game, a
  tournament — but not on this page
- **THEN** that player's bar SHALL be drawn in the online state
- **AND** this SHALL hold on the first painted frame, with no connection opened by this page

#### Scenario: A player of the game is not on the site

- **WHEN** the analysis page is served and one of its players holds no socket anywhere
- **THEN** that player's bar SHALL be drawn in the offline state

#### Scenario: The page has no players to be about

- **WHEN** the analysis board is opened from the Tools menu, which has no game record and renders
  no usernames
- **THEN** no presence indicator SHALL be rendered in any player bar
- **AND** the indicator SHALL be omitted from the DOM rather than hidden by CSS, because a hidden
  element still carries a class asserting a state

#### Scenario: The round page is unaffected

- **WHEN** the round page draws its own per-game presence for the same players
- **THEN** it SHALL keep taking that state from the game socket
- **AND** the two indicators MAY disagree, because they answer different questions — see the
  `user-presence` capability

### Requirement: A presence subscription SHALL NOT depend on round-only state

Any connection added to the analysis page for presence MUST work against that page's own seats. The
existing `RoundControllerBughouseSocket` writes `ctrl.seats.all[].clock!.connecting` on every
reconnect, and analysis seats carry no clock — `Seat.clock` is assigned by the round controller and
is undefined here — so reusing that class as it stands would fail at the first reconnect.

This constrains work not yet done; no such connection exists today.

#### Scenario: The socket reconnects on the analysis page

- **WHEN** a presence connection on the analysis page drops and reconnects
- **THEN** no code path SHALL read a seat's clock
- **AND** the four player bars SHALL remain rendered
