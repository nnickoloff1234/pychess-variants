# Tasks

## 1. Persist

- [ ] 1.1 Write the test user to `db.user` when it is created, on the `-a` path only.
- [ ] 1.2 Confirm the reconstructed user comes back with `anon` False and whatever else the test-user
      branch depends on — the registered path builds it, and what that path produces for a document
      written this way has never been checked.
- [ ] 1.3 Confirm production writes nothing: without `-a`, no test user is created, so no document is.

## 2. Seats and games

- [ ] 2.1 Confirm a reconstructed test user is recognised as the seat holder of a game restored from
      the database. Seats are held by username, so this should follow, and "should follow" is not
      evidence.
- [ ] 2.2 All four windows, each to its own seat, in any order of return.

## 3. Housekeeping

- [ ] 3.1 Make test-user documents identifiable and removable — a development database should be able
      to shed them without touching real accounts.
- [ ] 3.2 Check the name generator's collision check, which today consults the in-memory users only.
      With documents present it may need to consult those too, or accept that a restarted server can
      re-mint a name that exists in the database.

## 4. Verify

- [ ] 4.1 Restart the server mid-game with `-a` and confirm all four harness windows keep their names
      and their seats.
- [ ] 4.2 Confirm the category modal does NOT reappear after a restart — the side effect, and the
      cheapest possible evidence that the document is really being written and read.
- [ ] 4.3 Confirm the cookie rule still holds: a cookie naming a test user that is in neither the
      store nor the database yields a new identity.
- [ ] 4.4 Python gates.

## 5. Not in this change

- [ ] 5.1 Whether the GAME survives the restart with its moves — `bughouse-persist-moves-as-played`.
      This change only makes the PLAYERS survive.
