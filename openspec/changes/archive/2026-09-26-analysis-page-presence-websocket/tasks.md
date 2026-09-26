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
- [x] 1.2 **MOVED to `app-wide-online-presence`'s open questions.** The single-board analysis page
      is a separate codepath and was never examined. It stays unanswered, but it now sits with the
      change that decides the mechanism, because the answer depends on that verdict rather than on
      anything here.
- [x] 1.3 **DONE — built and measured in 3.1e.** Nikolay,
      2026-09-26: the analysis page opened from the Tools menu has no game record and no players,
      so it renders no usernames — **but it still renders the presence indicators**. There is
      nobody for them to be about, so they are a claim about nothing rather than a false claim
      about someone.

      This is Option A's removal, applied to the one case where Option B has no subject. The page
      already computes `isAnalysisBoard` (`model['gameId'] === ''`) once in `analysis.ts` for other
      view decisions, so the condition exists and does not need deriving. Whatever `player()` gains
      for omitting the icon — Option A's 2.1, which is now built for this case rather than for the
      whole page — is what this uses.

## 2. Option A — NOT TAKEN as a whole, but two of its parts were built anyway

Struck by 1.1. Kept for the record of what was weighed — and because the interesting outcome is
that **Option A turned out to be the right answer for one case inside Option B**, which is not what
either side of the argument predicted.

- [x] 2.1 **BUILT, for the no-game board rather than the page.** `player()` gained a last
      `presence = true` parameter that OMITS the icon rather than hiding it, exactly as this task
      specified and for design Decision 2's reason. What changed is the caller that passes `false`:
      not the whole analysis page, only the board with no players.
- [x] 2.2 **BUILT, in 3.1e.** `renderSeatNames` passes `ctrl.model['gameId'] !== ''`, and the
      comment recording why `online` was permanently `false` is gone with the `false` itself.
- [x] 2.3 **SUPERSEDED by 3.6**, which is moved to `app-wide-online-presence`. Removing `#roundchat`
      is now one of two possible answers there rather than a decided action here.
- [x] 2.4 **VERIFIED, in the form Option B needs.** Measured on the no-game board: 4 player bars,
      0 `i-side` elements, against 4 indicators before. The round page is untouched by construction
      and by diff (3.1g). The tools panel was NOT reduced — Option B keeps the page's tabs.

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
### PHASE 2 — MOVED OUT 2026-09-26

**Everything that needed a websocket now lives in `app-wide-online-presence`.** Nikolay declined to
build a server-side push registry inside a one-page change: *"what other pages can benefit from
such push registry and what kind of performance overhead this adds to the server ... if such
registry ultimately proves useful for more than the analysis page, then we can go ahead and
implement it, but just for the analysis page ... then this is overkill."*

Carried there verbatim: the registry mechanism (was 3.0a/3.0c, now design Decision 3 and tasks
2.1-2.2), "a second question, not a widening of `is_user_present`" (was 3.0b, now 2.4), the
separate socket class and why the round one cannot be reused (was 3.1-3.2, now 3.2), the
`setPresence` repaint (was 3.3, now 3.3), constructing it only for a real game (was 3.4, now 3.4),
and the live verification (was 3.7-3.8, now 4.1-4.2).

**That change opens with a GATE, not a plan** — it may conclude no registry is worth building, in
which case a page wanting a live dot copies the 35-second scoped poll that
`client/tournamentRR.ts:494` already runs against `/api/users/status?ids=`. Either way this page's
dot is already correct on load, which was phase 1's whole promise.

- [x] 3.6 **MOVED to `app-wide-online-presence`** — its task 3.5, and a requirement in its
      `user-presence` spec delta. Wire `#roundchat` or remove it: if that change builds a connection
      for this page, the same connection carries `bugroundchat` and the tab is wired; if it does
      not, the tab is removed. Either way the decision belongs to the change that decides whether
      the connection exists, so it does not hold this one open.

      **The requirement left this change's spec delta with it**, so archiving does not sync a
      living requirement that today's code violates.

## 4. Close out

- [x] 4.1 DONE for phase 1. Frontend gates `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`
      plus the Python gates, which phase 1 DID need after all — it touched `views/__init__.py`,
      `typing_defs.py` and one test fake. Committed as `2e47b2de9`.
- [x] 4.2 DONE. The note explaining the permanent `false` went with the `false` itself in 3.1d.
