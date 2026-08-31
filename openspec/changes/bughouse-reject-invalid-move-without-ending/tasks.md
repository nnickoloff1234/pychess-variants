## 0. Status

**POSTPONED. Do not start.** Opened 2026-08-30 to record a decision that is deliberately not being
made yet. Ending the game on an invalid move stays in place meanwhile, because it is the loudest
available detector while `bughouse-clock-record-investigation` hunts the causes.

## 1. Decide, before anything is written

- [ ] 1.1 What the client does with a rejection. Its board has already applied the move; rolling back
      needs a path that does not exist. Establish whether the existing full-board resync is enough,
      or whether a targeted undo is needed.
- [ ] 1.2 What happens to the clock entries the failed move already appended — measured at four
      entries for two plies on `4G3ZyGze`. Unwind, or leave and mark?
- [ ] 1.3 Whether repeated invalid moves escalate, and to what. A pure rejection is a DoS surface.
- [ ] 1.4 Whether one-board variants change too, or keep today's behaviour.

## 2. Only then

- [ ] 2.1 Implement, with the three Python gates and the frontend gates.
- [ ] 2.2 Re-run the stress playbook's S5 and S7 against the new behaviour.
