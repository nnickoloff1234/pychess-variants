## Context

Measured on 2026-08-23 while adding usernames to the bughouse analysis page.

`RoundControllerBughouseSocket` (`client/two-board/socket/sockets.ts`) is constructed by
`RoundControllerBughouse` and by nothing else. `AnalysisControllerBughouse` extends the same
`TwoBoardController` base and constructs no socket: the string `socket` does not appear in
`client/two-board/analysis/analysisCtrl.ts`, in `twoBoardCtrl.ts`, or in `common/gameCtrl.ts`. The
analysis page is a static render of a finished game, and always has been.

Three consequences follow from that one fact:

1. **The presence dot has no source.** `player()` in `client/player.ts` renders
   `i-side.online.icon` unconditionally, keyed by an `online` boolean that defaults to `false`.
   `AnalysisSeatView` passes `false` because there is nothing else to pass.
2. **`#roundchat` has no source.** It is present in the analysis markup and given a tab by
   `analysis-page-round-layout` precisely so it could be observed; observed, it is one child and
   zero content, forever.
3. **The server side is already fine.** `wsr.py` sends `game_user_connected`, `user_present` and
   `user_disconnected` to whoever is connected to a game's socket. Nothing about them is
   round-specific, and none of them require the game to be in progress.

The dot is the visible half. Side by side, the round page draws a live green dot for a player while
the analysis page draws the same player grey — which reads as "that player is offline", not as
"this page does not know".

This design is written to be read later, not to be executed now. The decision at the top of it is
the whole of the work; everything below is what the two answers cost.

## Goals / Non-Goals

**Goals:**

- Stop the analysis page asserting a connection state it cannot observe.
- Settle `#roundchat` on that page by the same decision, since it has the same single cause.
- Record the reason the dot is grey, so it is not later diagnosed as a bug in `AnalysisSeatView`.

**Non-Goals:**

- Any change to the round page's presence, which works and is the reference for what a dot means.
- Any server change. The messages exist and are already sent to any subscriber.
- Live *game state* on the analysis page — moves, clocks, results. This is about presence and chat
  only. A finished game's board never changes, and reintroducing a live board here would be a much
  larger change with no reader asking for it.
- Presence on the single-board analysis page, which is out of this codepath entirely.

## Decisions

### Decision 1: Decide between "remove the claim" and "earn the claim" before writing code

The two options differ by roughly one line against one module, and the cheap one may be correct.
Building B and discovering nobody wanted presence on a finished game would be the expensive mistake.

**Option A — remove the indicator.** The analysis page shows names, ratings and titles, and no dot.
Nothing that works today is lost, because nothing about the dot works today.

**Option B — subscribe for presence.** The analysis page opens `wsr/<gameId>`, handles the three
presence messages, and repaints the affected bar.

**Recommendation: A, unless there is a reader for B.** A finished game's analysis page is not a place
people wait for each other; the round page is. B's value is real only if someone wants to see that a
former opponent is still around — which is a product question, not a technical one, and is exactly
why this is being left written down rather than answered here.

### Decision 2: If A, hide the icon by parameter, not by CSS

`player()` is shared by every page on the site. A `.analysis-app.bug i-side { display: none }` rule
would work and would be one line, but it leaves the element in the DOM asserting a class
(`icon-offline`) that is still false, and it hides the symptom where the cause is an argument being
passed. An optional parameter — the icon omitted rather than drawn and covered — says what is meant
and cannot be defeated by a later cascade change.

### Decision 3: If B, a separate presence socket, not a reuse of the round one

`RoundControllerBughouseSocket` cannot be reused as it stands. `setConnecting()` writes
`ctrl.seats.all.forEach(s => s.clock!.connecting = connecting)`, and analysis seats have no clock:
`Seat.clock` is documented as "left undefined on the analysis page, which has no live clocks and
never reads it". The first reconnect would throw.

Its `onMessage` is also a round-page dispatch table — board, gameStart, gameEnd, draw offers, rematch
— none of which the analysis page has handlers for.

So B is a small second class handling exactly the three presence messages, or a split of the existing
one into a presence half and a round half. The second is tidier and riskier: the round socket is
load-bearing during live play, and this change is not worth destabilising it. **Prefer the small
second class.**

### Decision 4: The chat element follows the socket

Under A the chat tab is removed with the element — a tab that renders nothing is worse than no tab,
and it was only ever given one so it could be judged on evidence. Under B the connection that carries
presence also carries `bugroundchat`, so the tab can be made real at little extra cost; whether a
finished game *should* have a chat is then a second, smaller question.

## Risks / Trade-offs

- **[A removes a feature people expected to see]** → It removes nothing that functions. If presence
  on a finished game turns out to be wanted, B is still available and A does not make it harder.
- **[B opens a websocket per analysis page view]** → Analysis pages are opened far more often than
  games are played, including by spectators and crawlers, so this is a real server cost for a
  cosmetic gain. It is the strongest argument for A and should be weighed before B is chosen.
- **[B makes a static page partly live]** → A page that updates while being read invites the
  question of what else should update. Scope has to be held to presence, or B grows without limit.
- **[Splitting the round socket destabilises live play]** → Do not split it; add a separate class.
  See Decision 3.
- **[Doing nothing]** → Accepted for now, and the reason this is written down: the dot stays grey and
  is at risk of being re-diagnosed from scratch, or "fixed" by faking an online state. This document
  is the mitigation.

## Open Questions

- Is presence on a finished game wanted at all? This decides A versus B and nothing else does.
- If B: should the dot show presence on the *analysis page* specifically, or presence anywhere on the
  site? The round page answers "connected to this game's socket", which for a finished game means
  "also reading this analysis page" — a different and much narrower meaning than a user might read
  into a green dot.
- Should the single-board analysis page behave the same way? It is a separate codepath and was not
  examined; whatever is decided here probably wants to be true there too.
