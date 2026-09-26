## 0. Status

**Opened 2026-09-26 as an EVALUATION, not a plan.** It carries phase 2 out of
`analysis-page-presence-websocket`, which is complete at phase 1 and does not wait on this.

**Nothing in section 2 or 3 may start until section 1 has a verdict**, and "no registry, copy the
poll" is a legitimate verdict — in which case this change archives with the reason recorded and
any page that wants a live dot gets twelve lines instead.

## 1. The gate — is a push registry worth existing?

- [ ] 1.1 **Confirm the baseline** (design Decision 1). `/api/users/status?ids=` exists
      (`server/user.py:1218`, routed `routes.py:440`) and `client/tournamentRR.ts:494-529` already
      polls it every 35s scoped to the two usernames its open modal shows. Verify that a second
      page could use it as-is — no auth quirk, no per-page server work — because if it can, the
      alternative to a registry is a copy-paste and the bar moves accordingly.
- [ ] 1.2 **Test the following page's reader.** Design Decision 2 says this is the only strong
      candidate and the whole case rests on it. Is this a page someone leaves open waiting for a
      friend, or one they check and leave? Nikolay's call, not a measurement.
- [ ] 1.3 **Agree the census and the verdict per consumer** (design Decision 2's table and
      classification). Seven read at load, one fetches per hover, one polls, one is the round
      page's different question. Challenge the classification rather than accept it — a consumer
      wrongly filed as "would not notice" is how the gate reaches the wrong answer.
- [ ] 1.4 **Check `update_online()` actually fires on every transition** (design Decision 5). Its
      callers are `user.py:311` and five sites in `header_challenges.py`. A registry publishing
      from a function that misses transitions gives a live dot that is wrong in a new way — and if
      it does miss some, fixing that is a prerequisite, not part of the registry.
- [ ] 1.5 **Cost the three transports against each other**, in messages rather than adjectives:
      poll (N pages × M users ÷ 35s, HTTP), broadcast (every flip × every connection), registry
      (every flip × interested connections). Use plausible numbers for this site, not a thought
      experiment.
- [ ] 1.6 **Verdict, written down either way.** If it fails, say which of latency / volume /
      no-poll-owner would have had to be true, so the next person does not re-derive it.

## 2. If the gate passes — the registry

- [ ] 2.1 A subscribe/unsubscribe message and a `username -> set(connections)` map, cleaned on
      socket close. Keyed on the connection, per design Decision 3.
- [ ] 2.2 Publish from `update_online()` and nowhere else (Decision 5).
- [ ] 2.3 A cap on one connection's interest set, chosen and documented before the first consumer
      (Decision 4).
- [ ] 2.4 **A second question the server can be asked, NOT a widening of `is_user_present`.** That
      one answers "in this game", the round page depends on it, and it keeps its meaning. (Carried
      verbatim from the presence change's 3.0b.)

## 3. If the gate passes — two consumers, in this order

- [ ] 3.1 **The following page.** The case that justified the registry has to be the first thing
      built on it, or the justification was not real.
- [ ] 3.2 **The two-board analysis page.** A presence-only socket class alongside
      `RoundControllerBughouseSocket` in `client/two-board/socket/sockets.ts`. **Do not reuse or
      split the round one**: its `setConnecting()` writes `ctrl.seats.all[].clock!.connecting` and
      analysis seats have no clock, so the first reconnect would throw. (Carried from the presence
      change's 3.1 and its Decision 3.)
- [ ] 3.3 `AnalysisSeatView.setPresence(username, online)` repainting only that username's bars,
      the way `RoundSeatView.setPresence` does — a username can hold two seats in simul mode, so
      it must repaint all of them. (Carried from 3.3.)
- [ ] 3.4 Construct it only when there is a real game — the no-game analysis board renders no
      indicators at all since phase 1, so it must not subscribe to anything.
- [ ] 3.5 **Then `#roundchat`.** `analysis-page-presence-websocket` 3.6 is blocked here: the same
      connection would carry `bugroundchat`, so the empty Chat tab is either wired or removed, and
      which one depends on whether this connection exists. If the gate FAILS, that task is
      unblocked the other way — remove the tab.

## 4. Verify, if built

- [ ] 4.1 A dot goes green when that player appears anywhere on the site — the lobby, not this
      page — and grey when they leave, **without a reload**. This is phase 1's 3.1f done live.
- [ ] 4.2 The round page's dot is unchanged, verified on a live game. Phase 1 could only check this
      structurally.
- [ ] 4.3 Closing a subscribed page removes its interest; the map does not grow.
- [ ] 4.4 Frontend gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`. Python gates:
      `ruff format`, `ruff check`, `pyrefly check`, `pytest tests/test_simul.py`, and the unittest
      suite — this change touches the server, unlike phase 1's frontend-heavy edit.

## 5. Not in this change

- **What the dot means.** Decided: online anywhere on the site, matching the player lists.
  `analysis-page-presence-websocket` Decisions 5 and 5b.
- **The round page's per-game presence.** A different question with its own socket; it keeps it.
- **An "appear offline" preference.** Does not exist. Noted in the design only because a push
  registry is the thing that would make adding one hardest.
- **Making the load-time readers live.** players50, players, ublog, profile, admin. Explicitly
  ruled overkill by Nikolay; if any of them is ever wanted, it polls.
