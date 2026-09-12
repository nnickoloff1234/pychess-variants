# Tasks

## 0. Status

**Proposed 2026-09-12, not started.** Found while finishing `reconnect-follow-ups`; nothing is
broken for a player today, so there is nothing here to rush. What must not happen is the measurement
being lost: the keys were counted in the harness profiles and the mechanism read in the code, and
both are written down in the proposal so neither has to be re-derived.

## 1. Decide

- [ ] 1.1 Choose the bound, from the three in the proposal: sweep on load, an age or a count, or ask
      the server. The sweep is the cheapest and is wrong as stated — two tabs on two live games would
      each delete the other's entry — so if it is chosen it needs a rule that distinguishes "another
      game's entry" from "another game's LIVE entry", and that rule is the actual work.
- [ ] 1.2 If an age is chosen, decide where the stamp goes. `StoredPendingMove` is written by
      `recordPendingMove()` from a `MsgMove` and read back as one, so an extra field has to be
      tolerated by the reader of an OLD entry — the same both-shapes problem
      `bughouse-shrink-ply-clock-record` describes for the ply record, in miniature.
- [ ] 1.3 Decide what a sensible cap is, and say why that number. A player with one long game and one
      abandoned one is the case to think about, not a hundred games.

## 2. Do

- [ ] 2.1 Implement the chosen bound in `pendingMoves.ts`.
- [ ] 2.2 Correct the comment on `clearPendingMoves()`. It currently says it is "what finally bounds
      the cache", which is what sent this investigation looking for the sweep that does not exist.
- [ ] 2.3 Leave the resend path alone — the matching rule, `consumePendingMove()`,
      `reconcilePendingMove()` and what a confirmation does are all correct and all tested.

## 3. Verify

- [ ] 3.1 A profile that has finished games in its cache is left with the bound's worth of entries
      and no more. The harness profiles are already in that state, which makes them the fixture:
      `localStorage` in p2 and p3 held 6 and 11 stale keys on 2026-09-12.
- [ ] 3.2 A queued move still survives what it must: a reload, a socket drop, and a resend. The
      scenario bed's Q-series covers this — `Q1`, `Q7`, `Q8` and `Q12` all turn on the entry being
      there when the page comes back, so a bound that is too eager fails them rather than passing
      quietly.
- [ ] 3.3 Frontend gates. No server change and no Python gates.

## 4. Not in this change

A pointer, not work:

- `client/result.ts`'s `default: text = '*'` for an unrecognised status — see the proposal. One line,
  and it belongs to whoever is next in that file.
