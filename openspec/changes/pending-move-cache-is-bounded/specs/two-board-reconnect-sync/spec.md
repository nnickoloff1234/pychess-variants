## ADDED Requirements

### Requirement: The resend cache is bounded without a page to witness the end

An entry SHALL be removed even when no page is open on its game at the moment the game ends. What
bounds the cache SHALL NOT be an event only a present client can see.

TODAY IT IS EXACTLY THAT, and the code says the opposite. `clearPendingMoves()` is documented as what
"finally bounds the cache", and it is reachable only from `gameEnded()`, which a page calls on the
final status it receives. A game that ends while the reader is elsewhere leaves its entry behind for
the life of the browser profile, because no later page load reads any key but its own.

THE HARM IS GROWTH, NOT A WRONG MOVE, and the requirement is written to that scale. Keys are per game
id and `loadPendingMoves()` reads one key, so a stale entry can never be resent into another game —
what it consumes is quota in a store that has a hard limit, and what it costs a reader is a comment
that states an invariant the code does not keep.

WHATEVER BOUND IS CHOSEN SHALL NOT SHORTEN THE LIFE OF A LIVE ENTRY. A queued move must still be
there after a reload, a socket drop and a resend, including when a second game is open in another
tab — "not this game" is not the same fact as "not a live game", and a bound that confuses them
destroys the only copy of a move the server never received.

#### Scenario: A game that ended while the reader was away
- **WHEN** a game with a cached entry ends and no page of that profile is open on it
- **THEN** the entry does not survive indefinitely

#### Scenario: Two live games at once
- **WHEN** two tabs of one profile each hold a queued move for a different live game
- **THEN** neither entry is removed by the other tab
