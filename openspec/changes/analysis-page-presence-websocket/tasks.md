## 0. Status — DECIDED 2026-09-26, OPTION B

Written down on 2026-08-23 so it is not forgotten and not re-diagnosed, and parked until 1.1 had an
answer. **It has one now: Option B, earn the claim.** Nikolay: *"lets add a websocket for analysis
as well and have the indicators function. people should be able to see if the players whose game
they are analysing are online in case they want to interact with them."*

So section 2 is struck and section 3 is the work. The file's own recommendation was A; the reader
for B is the person analysing a game who wants to reach the players in it, and that reader is real.

Confirmed live on 2026-09-26 (game `i3BeAwNt`, four windows on the analysis page): all four player
bars carry `icon offline icon-offline` and every dot claims offline, while `#roundchat` is a 0x0
empty div with a **clickable Chat tab** in the tablist that opens onto nothing.

## 1. Decide

- [x] 1.1 **ANSWERED: YES — Option B.** Presence is wanted, so the page earns the claim rather than
      dropping it. The reader is someone analysing a game who wants to know whether its players are
      around to talk to.
- [ ] 1.2 Answer the same question for the single-board analysis page, which is a separate codepath
      and was not examined. Whatever holds here probably wants to hold there too.
- [ ] 1.3 **AND THE NO-GAME ANALYSIS BOARD MUST LOSE ITS INDICATORS ENTIRELY.** Nikolay,
      2026-09-26: the analysis page opened from the Tools menu has no game record and no players,
      so it renders no usernames — **but it still renders the presence indicators**. There is
      nobody for them to be about, so they are a claim about nothing rather than a false claim
      about someone.

      This is Option A's removal, applied to the one case where Option B has no subject. The page
      already computes `isAnalysisBoard` (`model['gameId'] === ''`) once in `analysis.ts` for other
      view decisions, so the condition exists and does not need deriving. Whatever `player()` gains
      for omitting the icon — Option A's 2.1, which is now built for this case rather than for the
      whole page — is what this uses.

## 2. Option A — NOT TAKEN

Struck by 1.1. Kept for the record of what was weighed; nothing here is to be done.

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

## 3. Option B — earn the claim — THIS IS THE WORK

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
