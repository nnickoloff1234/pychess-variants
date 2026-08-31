## ADDED Requirements

### Requirement: The analysis page SHALL NOT assert a connection state it cannot observe

A presence indicator is a claim about a live connection. The bughouse analysis page holds no
websocket, so it observes no connection and MUST NOT render an indicator whose value it cannot
change — a permanently offline dot beside every player is a false statement, not a neutral default.

This requirement is satisfied either by removing the indicator from that page or by giving the page
a connection that makes the indicator's value real. It is NOT satisfied by rendering a static dot,
by rendering it in a third "unknown" state that still looks like presence, or by leaving it and
documenting it.

#### Scenario: A player of the game opens the analysis page

- **WHEN** a viewer who played in the game opens `/{gameId}?ply=N` for a bughouse game
- **AND** the page holds no websocket connection
- **THEN** no presence indicator SHALL be drawn in any of the four player bars

#### Scenario: The same player is shown on both pages at once

- **WHEN** the round page and the analysis page for the same finished game are open side by side
- **AND** the round page draws a player's dot in the online state
- **THEN** the analysis page SHALL NOT draw that player in the offline state

#### Scenario: The page is given a connection

- **WHEN** the analysis page subscribes to the game's websocket
- **AND** the server sends `game_user_connected`, `user_present` or `user_disconnected` for a player
- **THEN** that player's bar SHALL be repainted in the state the message reports
- **AND** the indicator MAY be drawn, because its value is now observed

### Requirement: A presence subscription SHALL NOT depend on round-only state

Any connection added for presence MUST work against the analysis page's own seats. The existing
`RoundControllerBughouseSocket` writes `ctrl.seats.all[].clock!.connecting` on every reconnect, and
analysis seats carry no clock — `Seat.clock` is assigned by the round controller and is undefined
here — so reusing that class as it stands would fail at the first reconnect.

#### Scenario: The socket reconnects on the analysis page

- **WHEN** a presence connection on the analysis page drops and reconnects
- **THEN** no code path SHALL read a seat's clock
- **AND** the four player bars SHALL remain rendered

### Requirement: The analysis page's chat element SHALL be resolved by the same decision

`#roundchat` on the analysis page is an empty element that nothing renders into, for the same reason
the dot has no value: there is no connection to feed it. It MUST NOT be left as a tab that renders
nothing.

#### Scenario: The page keeps no connection

- **WHEN** the decision is that the analysis page holds no websocket
- **THEN** the chat element and its tab SHALL be removed from that page

#### Scenario: The page gains a connection

- **WHEN** the analysis page subscribes to the game's websocket
- **THEN** the chat element SHALL either receive the game's chat messages or be removed
- **AND** it SHALL NOT remain present and permanently empty

### Requirement: The round page's presence behaviour SHALL be unchanged

The round page SHALL continue to observe presence over its own websocket and paint its dots from it,
with no change to when a dot is drawn or which state it is drawn in. It is the reference for what a
presence indicator means on this site, and nothing in this capability MUST alter it.

#### Scenario: A player connects during a live game

- **WHEN** a player connects to a live bughouse game
- **THEN** the round page SHALL paint that player's dot in the online state, exactly as it does today
