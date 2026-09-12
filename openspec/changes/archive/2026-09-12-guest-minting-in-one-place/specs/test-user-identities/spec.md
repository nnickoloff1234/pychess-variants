## ADDED Requirements

### Requirement: A guest identity is minted in one place

The steps that materialize a guest identity SHALL be written once, and every entry point that mints
one SHALL go through them. No entry point SHALL carry its own copy of the sequence.

THE ENTRY POINTS ARE IRREDUCIBLE; THE COPIES WERE NOT. A guest is created lazily at whichever entry
point the browser reaches first — a page render, a websocket connection, or the puzzle page — because
anonymous page rendering is stateless by design and minting an identity for every request that never
needs one is what that design avoids. So there are three callers by nature, and there was no earlier
point at which to put the rule. That is an argument for one function, not for three copies.

WHAT THE COPIES COST IS PARTIAL COMPLIANCE WITH THE REQUIREMENT ABOVE. "A test user is a database
user" was satisfied at two entry points out of three: when test users gained a persisted document,
the page and socket copies learned to write it and the puzzle copy did not, so a browser whose first
landing was the puzzle page received an identity that still vanished on restart. Nothing announced
that; the identity simply behaved like the old ones.

THE ENTRY POINT MAY DIFFER IN WHAT IT IS CALLED, AND NOTHING ELSE. The one real difference between
the copies was the word in the log line, so the shared form SHALL take that word as an argument and
SHALL NOT branch on it.

AN IMPORT CYCLE IS NOT A REASON TO COPY A RULE. `user` imports the websocket helpers, so the socket
path imports the shared function at call time. That cycle is why the copies existed, and deferring
one import is the whole of what it costs to be rid of them.

#### Scenario: Every entry point persists a test user's document
- **WHEN** a guest's first landing is a page render, a websocket connection, or the puzzle page, with
  `anon_as_test_users` enabled
- **THEN** the identity is written to `db.user` in all three cases, and survives a restart in all
  three

#### Scenario: A new entry point cannot miss a step
- **WHEN** a further entry point needs to mint a guest
- **THEN** it calls the shared form, and gains the rate limiting, the persistence and the session
  stamping without restating any of them
