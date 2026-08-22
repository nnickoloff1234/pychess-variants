## ADDED Requirements

### Requirement: A game is one object while anyone is connected to it

While any socket is open on a game, every message about that game SHALL be handled against the
same in-memory instance.

Two sockets on one game SHALL NOT be able to hold different instances, whatever the order in which
they connected and whatever happened to the cache between those connections.

This SHALL hold across a finished game being evicted and later loaded again: a client that connects
after an eviction SHALL NOT get a second instance while an earlier client is still attached to the
first.

#### Scenario: A client connecting after an eviction joins the same instance
- **WHEN** a game has been evicted from the cache while some clients remain connected, and another client then connects
- **THEN** all connected clients are handled against one instance of that game

#### Scenario: Two clients connecting at once produce one instance
- **WHEN** two clients connect to the same uncached game simultaneously
- **THEN** the game is parsed once and both are handled against the same instance

#### Scenario: State accumulated by one player is visible to the others
- **WHEN** one player's action records something on the game, and another player's action then reads it
- **THEN** the second action sees what the first recorded, regardless of when either client connected

### Requirement: A finished game is not evicted while it still has an audience

A finished game SHALL NOT be evicted from the cache while any of its players or spectators is
still active in it.

The eviction that is scheduled when a finished game is cached SHALL apply the same test as the
immediate eviction path, which already refuses while anyone is active. A timer alone SHALL NOT be
sufficient grounds to evict.

Where eviction is deferred for this reason, it SHALL be reconsidered later rather than abandoned,
so that a game whose audience has gone is still released.

#### Scenario: Players still on the page keep the game
- **WHEN** the keep time for a finished game elapses and its players are still connected to it
- **THEN** the game remains cached and remains one instance

#### Scenario: An empty room releases the game
- **WHEN** the last player or spectator leaves a finished game
- **THEN** the game becomes eligible for eviction and is released

### Requirement: Rematch agreement converges

A rematch SHALL start once every player of a finished game has asked for one, whatever the order
they ask in and whenever each of them connected.

A player's rematch offer SHALL be recorded where every other player's request will see it.

Where a player asks and everyone else has already asked, that request SHALL create the new game
rather than record another offer.

#### Scenario: All four players ask
- **WHEN** each player of a finished bughouse game asks for a rematch
- **THEN** a new game is created and every player is directed to it

#### Scenario: Asking after a reload still counts
- **WHEN** a player reloads the finished game's page and then asks for a rematch, while the others asked before the reload
- **THEN** their offer joins the others and the new game is created

#### Scenario: Offers are not lost
- **WHEN** a player asks for a rematch
- **THEN** every other player's subsequent request sees that offer recorded
