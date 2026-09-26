## ADDED Requirements

### Requirement: The green dot SHALL mean the same thing everywhere it is drawn

`User.online` — true when any of the user's game, lobby, challenge, tournament, simul or study
sockets is open — is the one meaning. Every page that draws the indicator MUST draw it from that
flag, whether it reads it at render time, fetches it, or is pushed it.

The round page's per-game presence is a DIFFERENT question — "is this player at this board" — and
keeps its own answer and its own transport. It MUST NOT be widened to answer the site-wide question,
and the site-wide answer MUST NOT be substituted for it.

#### Scenario: A player is on the site but not at the game

- **WHEN** a player of a game is in the lobby and not on that game's page
- **AND** a page that draws the site-wide indicator for that player is rendered
- **THEN** that player SHALL be drawn online

#### Scenario: The same player on the round page

- **WHEN** that same player is in the lobby and not at the board
- **AND** the round page draws its per-game presence for them
- **THEN** the round page MAY draw them as not present at the board
- **AND** this difference SHALL NOT be treated as an inconsistency to be fixed by making the two
  indicators share one source

#### Scenario: A page has no players to be about

- **WHEN** a page draws player bars for which there is no user — the analysis board opened from the
  Tools menu, which has no game record
- **THEN** no presence indicator SHALL be rendered at all
- **AND** it SHALL be omitted rather than rendered hidden or rendered in a neutral state

### Requirement: Presence delivery SHALL be scoped to the users a page is showing

A page that needs the indicator to stay current MUST express interest in specific usernames — the
ones it currently renders — and receive updates only for those.

Sending every online-state change to every connected browser is FORBIDDEN as a mechanism, whatever
its implementation cost, because the overwhelming majority of such messages concern users the
recipient is not looking at.

#### Scenario: A page shows two users and a third logs in

- **WHEN** a page has expressed interest in two usernames
- **AND** a different user's online state changes
- **THEN** that page SHALL receive no message

#### Scenario: What the page is showing changes

- **WHEN** a page stops rendering a user — a modal closes, a list paginates, the page is closed
- **THEN** its interest in that username SHALL end
- **AND** the server SHALL retain no interest entry for a connection that has closed

#### Scenario: A page shows more users than the interest limit allows

- **WHEN** a page would express interest in more usernames than one connection may hold
- **THEN** it SHALL NOT subscribe
- **AND** it SHALL obtain the state by request instead

### Requirement: A page that draws the indicator SHALL be correct when it opens

Whatever mechanism keeps a page current, the state at first render MUST already be right. A page
MUST NOT render a placeholder state and correct it after connecting, because the placeholder is
itself a claim about a real person.

#### Scenario: A page is opened for a player who is online

- **WHEN** any page that draws the indicator is served for a user who is online at that moment
- **THEN** the first painted frame SHALL show that user online
- **AND** this SHALL hold whether or not the page later opens a connection

#### Scenario: Liveness is not available

- **WHEN** a page draws the indicator and has no mechanism to learn of changes
- **THEN** it SHALL still draw the state correct at load
- **AND** it SHALL NOT draw a fixed value that is independent of the user's actual state

### Requirement: A page SHALL NOT offer a tab that renders nothing

Carried from `analysis-page-presence-websocket`, whose verdict on it depends on this change.

`#roundchat` on the two-board analysis page is an empty element that nothing renders into, reachable
through a clickable Chat tab in the tablist. It exists because the page was expected to gain a
connection and never did. It MUST NOT be left that way: either the connection this change decides on
carries the game's chat into it, or the element and its tab are removed.

#### Scenario: The page gains a presence connection

- **WHEN** this change builds a connection for the analysis page
- **THEN** that connection SHALL also carry the game's chat messages into `#roundchat`
- **AND** the Chat tab SHALL render them

#### Scenario: The page gains no connection

- **WHEN** this change concludes no connection is built for the analysis page
- **THEN** `#roundchat` and its Chat tab SHALL be removed from that page
