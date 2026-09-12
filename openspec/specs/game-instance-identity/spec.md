# game-instance-identity Specification

## Purpose
TBD - created by archiving change rematch-survives-cache-eviction. Update Purpose after archive.
## Requirements
### Requirement: A game is one object while anyone is connected to it

While any socket is open on a game, every message about that game SHALL be handled against the
same in-memory instance.

TWO MECHANISMS CARRY THIS, and between them they close the paths by which a second instance was
reachable. The cache entry is held while the game has an audience, so no connection arriving during
that time finds it absent and parses another. And a game that genuinely has to be loaded is
constructed once: concurrent loads share one construction task and publish through a single
`setdefault`, so the loser of a race returns the winner's object rather than its own.

WHAT IS NOT CLAIMED, because it is not built. The instance is resolved once per socket and held for
the life of that connection, so a socket outliving an eviction remains conceivable — it needs the
eviction to race the last player leaving and returning. Making it impossible means resolving the
game per message rather than per socket, which is recorded as a follow-up rather than done here.
Requiring it in this spec would state a guarantee the code does not give.

A CLIENT CONNECTING TO AN EVICTED FINISHED GAME SHALL STILL CONVERGE with the others: the first
connection caches the instance and later ones find it, so the split needs an overlap — someone
holding a reference across the eviction — and not merely a gap.

#### Scenario: A client connecting to an evicted finished game joins the instance others get
- **WHEN** a finished game has been evicted and clients connect to it afterwards
- **THEN** the game is constructed once and all of them are handled against that one instance

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

