## 0. Not scheduled

Written down on 2026-08-23 so it is not forgotten and not re-diagnosed. **No task below is to be
started until the question in 1.1 is answered.** Nothing is broken today; the analysis page renders
correctly, and the only defect is that one element makes a claim the page cannot support.

## 1. Decide

- [ ] 1.1 Answer the one question everything else depends on: **is presence wanted on a finished
      game's analysis page at all?** No, and it is Option A — remove the indicator. Yes, and it is
      Option B — subscribe for presence. See design decision 1; the recommendation is A unless there
      is a reader for B.
- [ ] 1.2 Answer the same question for the single-board analysis page, which is a separate codepath
      and was not examined. Whatever holds here probably wants to hold there too.

## 2. Option A — remove the claim

Only if 1.1 answers "no".

- [ ] 2.1 Give `player()` in `client/player.ts` an optional way to omit the presence icon entirely,
      rather than hiding it with CSS on `.analysis-app.bug`. Hidden, the element is still in the DOM
      carrying an `icon-offline` class that is still false — see design decision 2.
- [ ] 2.2 Pass it from `renderSeatNamesCC` in `client/two-board/analysis/analysisSeatView.ts`,
      replacing the `false` and the comment that records why it is there.
- [ ] 2.3 Remove `#roundchat` and its Chat tab from `client/two-board/analysis/analysis.ts`, and any
      rule that referenced them from `static/bughouse.css`. It renders nothing and only ever had a
      tab so it could be judged on evidence; the evidence is in.
- [ ] 2.4 Verify on the live page that the round page still draws its dots, that no analysis bar
      draws one, and that the tools panel is down to Moves and Info.

## 3. Option B — earn the claim

Only if 1.1 answers "yes".

- [ ] 3.1 Add a small presence-only socket class alongside `RoundControllerBughouseSocket` in
      `client/two-board/socket/sockets.ts`. **Do not reuse or split the round one**: its
      `setConnecting()` writes `ctrl.seats.all[].clock!.connecting` and analysis seats have no clock,
      so the first reconnect would throw — design decision 3.
- [ ] 3.2 Handle `game_user_connected`, `user_present` and `user_disconnected`, and nothing else.
- [ ] 3.3 Give `AnalysisSeatView` a `setPresence(username, online)` that repaints only the bars for
      that username, the way `RoundSeatView.setPresence` does — a username can hold two seats in
      simul mode, so it must repaint all of them.
- [ ] 3.4 Construct the socket from `AnalysisControllerBughouse`, and only when there is a real game:
      the blank analysis board (`/analysis/<variant>`, no gameId) has no game to subscribe to.
- [ ] 3.5 Decide what the dot means on this page before shipping it — "connected to this game's
      socket" on a finished game means "also reading this analysis page", which is narrower than
      what a green dot suggests. See the second open question in design.md.
- [ ] 3.6 Wire `#roundchat` or remove it. The same connection carries `bugroundchat`, so leaving the
      tab empty is no longer defensible either way.
- [ ] 3.7 Verify with two harness windows on the same analysis page that one sees the other go
      online, and that closing one turns the other's dot offline.

## 4. Close out

- [ ] 4.1 Frontend gates: `yarn typecheck`, `yarn lint`, `yarn test`. No Python gates — no server
      change is expected, since `wsr.py` already emits all three presence messages to any subscriber.
- [ ] 4.2 Delete the note in `analysisSeatView.ts` explaining why `online` is always `false`, whichever
      option was taken. It documents a state that will no longer exist.
