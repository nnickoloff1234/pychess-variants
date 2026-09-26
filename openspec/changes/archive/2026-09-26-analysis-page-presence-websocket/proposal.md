## Why

The bughouse analysis page draws four presence dots that can never be anything but "offline",
because **the page has no websocket at all**. `RoundControllerBughouseSocket` is constructed by
`RoundControllerBughouse`; `AnalysisControllerBughouse` extends the same `TwoBoardController` and
constructs nothing — there is no `sock`, no `onMessage`, and no handler for the three presence
messages the server already sends (`game_user_connected`, `user_present`, `user_disconnected`).

The dots arrived with the seat strips in `analysis-page-round-layout`, which put usernames beside
each board the way the round page does. Everything else about that bar is live and correct; the dot
alone is a claim the page cannot support. Side by side the difference is visible: the round page
shows `Test–SilverAiWok` with a green dot while the analysis page shows the same player grey.

The same absence explains a second finding from that change: `#roundchat` on the analysis page is an
empty `<div>` that nothing ever renders into. It is not an unwired view — there is no connection to
feed it. **One missing websocket is the cause of both**, which is why they belong in one proposal
rather than two.

Nothing is broken today, so this is deliberately not urgent. It is written down so the dot is not
mistaken later for a bug in the seat view, and so the chat tab is not deleted on the assumption that
it was never meant to work.

## What Changes

The proposal is to **decide first and build second** — the two ends of the range differ by an order
of magnitude in cost, and the cheap end may well be the right answer.

- **Option A — remove the claim.** Omit the presence icon from the analysis page's player bars.
  `player()` in `client/player.ts` renders `i-side.online.icon` unconditionally, so this needs either
  a parameter it does not have or a CSS rule hiding it under `.analysis-app.bug`. One rule, no new
  connection, and the page stops asserting something it cannot know. Loses nothing that works today.
- **Option B — give the page a connection.** Subscribe the analysis page to `wsr/<gameId>` for the
  presence messages only, and wire `AnalysisSeatView` to repaint a bar on each. This makes the dot
  mean what it means on the round page and, as a consequence, makes `#roundchat` feedable.
- **Whichever is chosen, `#roundchat` is settled by the same decision**: deleted under A, or given a
  reason to exist under B. It must not be left as it is, a tab that renders nothing.
- **No change to the round page**, which already has all of this and is the reference for how a
  presence dot should behave.

## Capabilities

### New Capabilities
- `analysis-presence`: what the analysis page may claim about who is connected — whether it shows a
  presence indicator at all, what it shows before any presence is known, and what the chat element
  on that page is for.

### Modified Capabilities

None. The round page's presence behaviour is unchanged, and no existing spec covers the analysis
page's player bars — they were introduced by `analysis-page-round-layout`, whose specs cover their
layout and sizing rather than what they assert about connection state.

## Impact

- `client/two-board/analysis/analysisSeatView.ts` — the `false` passed as `online` today, and the
  comment recording why. Under B this becomes a value that changes; under A the argument goes away
  with the icon.
- `client/two-board/analysis/analysisCtrl.ts` — under B, gains a socket and presence handlers it does
  not have; under A, untouched.
- `client/two-board/socket/sockets.ts` — under B, either a second, smaller socket class or a split of
  the existing one into a presence half and a round half. Note it currently reaches into
  `ctrl.seats.all[].clock!` in `setConnecting`, which the analysis page's seats do not have, so it
  cannot be reused as it stands.
- `client/player.ts` — under A, if the icon is made optional there rather than hidden in CSS. Shared
  by every page, so a parameter is preferable to changing its default.
- `client/two-board/analysis/analysis.ts` and `static/bughouse.css` — the `#roundchat` element and its
  tab, whichever way the decision goes.
- **Server: none expected.** `server/wsr.py` already emits the presence messages to anyone connected
  to the game's socket; nothing about them is round-specific.
