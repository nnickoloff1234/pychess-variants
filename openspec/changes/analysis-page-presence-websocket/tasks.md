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

### PHASE 1 — correct on load, no websocket (design Decision 7)

The player lists already draw this dot from the page context at render time. The analysis page is
server-rendered the same way, so phase 1 is the same edit those fields already are.

- [x] 3.1a DONE. `views/__init__.py` puts `wonline`/`bonline` beside the names, and
      `wonlineB`/`bonlineB` in the two-board block, from `game.wplayer.online` — the User object is
      already to hand here, so no `users.data.get()` lookup is needed as `players50.py` does. Typed
      in `typing_defs.py`'s `ViewContext`.
- [x] 3.1b DONE. `base.html` emits `data-wonline`, `data-bonline`, `data-wonline-b` and
      `data-bonline-b` beside the patron attributes they follow.
- [x] 3.1c DONE. `main.ts` reads all four with the `=== 'True'` idiom every other boolean in
      that file uses; typed in `types.ts`.
- [x] 3.1d DONE. `renderSeatNamesCC` resolves the flag by board and colour and passes it where
      it passed `false`. The comment explaining the permanent `false` is gone with the state it
      described. `at(position)` became `colorAt(position)` so the colour is available to the
      lookup rather than being computed twice.
- [x] 3.1e DONE — **verified 0 indicators on `/analysis/bughouse`.** `player()` gained a last
      `presence = true` parameter that OMITS the icon rather than hiding it, per design Decision 2;
      `renderSeatNames` passes `ctrl.model['gameId'] !== ''`, which is the page's own
      `isAnalysisBoard` test. Measured on the no-game board: 4 player bars, 0 `i-side` elements, no
      names — against 4 indicators before.
- [x] 3.1f **VERIFIED, and this is the check that distinguishes the build from the one we
      nearly made.** With `Test–ShogiKnightQuee` in the LOBBY and nowhere near the game page, the
      analysis page drew that player **green**. Under the per-game meaning they would have been
      grey.

      The negative half too: navigating that window off the site entirely flipped the server to
      `data-bonline="False"` and the page to a grey dot, with the other three still green. So the
      dot tracks real presence in both directions, not just "someone is here".
- [x] 3.1g **ROUND PAGE UNTOUCHED, by construction and by diff.** No round file is in the
      changeset — only `main.ts`, `player.ts`, `analysisSeatView.ts`, `types.ts`, the two server
      files, the template and one test fake. `player()`'s new parameter is LAST and defaults to
      `true`, and no round caller passes it, so both round pages render the icon exactly as before
      and still take their state from the socket path this change does not touch.

      **NOT verified live on a round page** — that needs a game in progress, and the harness had a
      finished one. The evidence above is structural; a live check is cheap to add next time a game
      is running.
- [ ] 3.0a **Agree the mechanism (design Decision 6) before building it.** The proposal is a small
      interest registry: an analysis socket registers the four usernames it cares about, and a flip
      in `update_online()` is sent only to the rooms that asked. Bounded by open analysis pages. The
      alternatives are polling (laggy, steady traffic) and broadcasting every flip (simple, worst
      for load).
- [ ] 3.0b A second question the server can be asked, NOT a widening of `is_user_present`. That one
      answers "in this game", the round page depends on it, and it must keep its meaning.
- [ ] 3.0c Publish the flip from `update_online()`, which is the one place the site-wide state is
      computed. Note its current callers are `user.py:311` and five sites in `header_challenges.py`.
- [ ] 3.1 Add a small presence-only socket class alongside `RoundControllerBughouseSocket` in
      `client/two-board/socket/sockets.ts`. **Do not reuse or split the round one**: its
      `setConnecting()` writes `ctrl.seats.all[].clock!.connecting` and analysis seats have no clock,
      so the first reconnect would throw — design decision 3.
- [ ] 3.2 Handle the site-wide presence answer and its updates, and nothing else.
- [ ] 3.3 Give `AnalysisSeatView` a `setPresence(username, online)` that repaints only the bars for
      that username, the way `RoundSeatView.setPresence` does — a username can hold two seats in
      simul mode, so it must repaint all of them.
- [ ] 3.4 Construct the socket from `AnalysisControllerBughouse`, and only when there is a real game.
- [ ] 3.6 Wire `#roundchat` or remove it. The same connection carries `bugroundchat`, so leaving the
      tab empty is no longer defensible either way. **Phase 2, because phase 1 opens no connection**
      — until then the empty tab is untouched and still indefensible.
- [ ] 3.7 Verify with harness windows that a player's dot goes green when that player is online
      ANYWHERE — in the lobby, not only on this same analysis page — and grey when they leave the
      site entirely, WITHOUT reloading the page. Phase 1's version of this is 3.1f.
- [ ] 3.8 Verify the ROUND page's dot is unchanged.

## 4. Close out

- [ ] 4.1 Frontend gates: `yarn typecheck`, `yarn lint`, `yarn test`. No Python gates — no server
      change is expected, since `wsr.py` already emits all three presence messages to any subscriber.
- [ ] 4.2 Delete the note in `analysisSeatView.ts` explaining why `online` is always `false`, whichever
      option was taken. It documents a state that will no longer exist.
