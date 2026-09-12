## Why

`reconnect-sync-controller` was archived on 2026-09-07 with seven tasks still open. Five of them are
real work; leaving them in an archived change means they are a record of what was NOT done, filed
where nobody looks. This change carries them forward so they stay visible.

They are not one subject, but they share a cause: the reconnect work drew a line around "which
message is this, and what should the client do with it", and each of these sits just outside that
line while depending on it.

**One is a decision left half-expressed.** `MoveDecision.takeClocks` answers the part of the clock
rule the controller can know — was this move resent, so the server charged the disconnected time to
us. The other half is still in the caller: `roundCtrl` ORs in "this seat's clock is still running",
which is a fact about a `Clock` object the controller has never held. And branch 1's rule — a whole
position replaces all four clocks — is applied by the caller and is not expressed as a decision at
all. The division works; it is just not stated anywhere as a rule.

**One is a user-visible wart nothing tests.** A player who moves and reconnects before the server
confirms watches their move vanish and come back: the full board message repaints to the server's
position, and the move only returns with its confirmation. It is deliberate — keeping the optimistic
position strands the client somewhere the server has never been if the move is ultimately refused —
and the shut board exists because of it, so a reader cannot simply play the move again. What is
missing is any test of that intermediate frame: Q1 and Q8 assert the round trip's endpoints and R1
asserts the board is shut between them, so the unconditional repaint could be made conditional and
every scenario would still pass.

**Two are the same question about premoves**, which the reconnect tree deliberately did not settle: a
premove may stay ARMED while a board is shut, because it is an intention for a position that has not
arrived — but nothing clears it when a full board message replaces the position it was composed
against, and nothing stops it firing while the reader has scrolled away.

**One is verification debt.** Four of the eleven clock stress tests were re-run on 2026-09-06; the
other seven were not.

## What Changes

- The clock rules SHALL be expressed as part of the decision, or the division between controller and
  caller SHALL be stated as a rule rather than left as an accident of what each can see.
- The flicker SHALL be either tested as it stands or removed by holding the pending move
  optimistically — a product decision, not a mechanical one.
- An armed premove's fate across a full board message SHALL be decided and stated.
- The remaining stress tests SHALL be re-run, or retired with a reason.

WHICH ALTERNATIVES WERE TAKEN, added 2026-09-12 so the bullets above are not read as still open:
the clock rules are expressed as fields of the decision — `MoveDecision.takeClocks` and
`SnapshotDecision.takeAllClocks` — rather than as a documented division, and the caller adds no
condition of its own. The flicker was removed by holding the pending move optimistically rather than
tested as it stood. The premove's fate is decided: a full board message does not end one.

AND TWO DEFECTS THE READING FOUND, which are in this change because they were found by doing it and
would otherwise go unrecorded (tasks 5.1–5.3): the caller was taking an arriving move's turn colour,
mover and move from the client's own history rather than from the message, which could restart the
wrong seat's clock and threw outright on a page holding no history; and branch 2.1.2 was taking the
clocks from a message behind the game, which set that board backwards.

## Impact

- `client/two-board/socket/reconnectController.ts` — `MoveDecision`, and the clock rules in the header.
- `client/two-board/round/roundCtrl.ts` — the clock application sites and the premove release.
- `tests/reconnect_matrix/` — a scenario for the flicker, and one for a premove across a snapshot.
- No server change is expected.

## Capabilities

- `two-board-reconnect-sync`
