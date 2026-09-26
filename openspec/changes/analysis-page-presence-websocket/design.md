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

### Decision 5: the dot means ONLINE ANYWHERE, not "in this game" — decided 2026-09-26

Nikolay chose the site-wide meaning, from the rationale that opened the question: *"people should be
able to see if the players whose game they are analysing are online in case they want to interact
with them."* Interacting means messaging them wherever they are, so the dot has to answer "is this
person around", not "is this person also on this page".

**THE EXISTING MESSAGES CANNOT ANSWER THAT, which is what makes this bigger than the file assumed.**
All three are driven by one predicate:

```python
def is_user_active_in_game(self, game_id=None):
    return game_id in self.game_sockets  # connected to THIS game's socket
```

On a FINISHED game almost nobody is connected to that socket, so the narrow reading would leave the
dot grey nearly always — including for a player sitting in the lobby. That is not an improvement on
today; it is the same grey dot with a websocket behind it, and it would be wrong in a new way.

The site-wide flag already exists and is maintained:

```python
def update_online(self):
    self.online = (
        len(self.game_sockets) > 0
        or len(self.lobby_sockets) > 0
        or len(self.challenge_channels) > 0
        or len(self.tournament_sockets) > 0
        or len(self.simul_sockets) > 0
        or len(self.study_sockets) > 0
    )
```

**But nothing broadcasts it.** No websocket message type carries `online`; `update_online()` only
maintains internal state. So the server work is not optional, and the "no server change" non-goal in
the proposal is withdrawn rather than quietly ignored.

**AND THE ROUND PAGE'S DOT MUST NOT CHANGE MEANING.** It answers "in this game", it works, and it is
the reference. So this is a SECOND question the server can be asked, not a widening of the existing
one.

### Decision 5b: the site ALREADY draws this dot with this meaning — found 2026-09-26

Nikolay asked what the single-board analysis page does, to be consistent with it. **It does not draw
a dot at all.** `player()` has exactly three consumers — `client/roundCtrl.ts`,
`client/two-board/round/roundSeatView.ts` and `client/two-board/analysis/analysisSeatView.ts` —
and `client/analysis/analysisCtrl.ts` is not among them. It renders no player bars and
`templates/analysis.html` carries no player markup. So there was nothing there to be consistent
with.

**BUT THE SAME DOT EXISTS ELSEWHERE, AND ALREADY MEANS WHAT DECISION 5 CHOSE.**
`templates/players.html`, `players50.html` and `profile.html` render the same `i-side` element with
the same `online` / `icon-online` classes, from:

```python
context["highscore_online"] = {
    username
    for username in highscore_usernames
    if (live_user := app_state.users.data.get(username)) is not None and live_user.online
}
```

That is `user.online` — site-wide, any socket. So the site has **two meanings for one visual, and
they are already inconsistent**: round pages say "connected to this game's socket", player lists and
profiles say "online anywhere". Decision 5 puts the analysis page with the lists, which is the
reading a user most likely brings to a static page about people.

This makes the server work smaller and better founded: it is not a new notion of presence but
plumbing for a value the site already computes, trusts and renders.

### Decision 7: ship it in two phases, connect-time first — 2026-09-26

**Phase 1 needs no websocket at all.** The player lists get their dot from the page CONTEXT at render
time, and the analysis page is server-rendered the same way: `views/__init__.py` already puts
`wplayer`, `wtitle`, `wpatron` and their B-board twins into the context, `base.html` emits them as
`data-wplayer` and friends, and `main.ts` reads them into the model. Adding the players' online state
to that chain is the same edit those fields already are, and gives a dot that is correct on load —
exactly the guarantee the player lists offer.

**Phase 2 is the push**, and only that: keeping an open page's dot current as players come and go.
That is where Decision 6's registry belongs, and it can be judged on its own once phase 1 is
shipped and the dot is at least right when the page is opened.

Splitting here is what stops "open a websocket per analysis page view" — the strongest argument
against B in the risks below — from being paid before anyone has seen the feature work.

### Decision 6: how the site-wide state reaches the page — PROPOSED, needs agreement, PHASE 2

Answering on connect is easy; learning about CHANGES is the design. Three shapes were considered:

- **Poll.** The page asks every N seconds. No registry, no push, but the dot lags and every open
  analysis page adds steady traffic.
- **Broadcast on every flip.** `update_online()` notifies everyone. Simple to write and the worst
  thing here for load — most flips interest nobody.
- **A small interest registry — PROPOSED.** An analysis socket, on connect, registers interest in
  the four usernames of the game it is watching: `username -> set(game rooms that care)`. When
  `update_online()` flips a user, the server looks that username up and sends to those rooms only.
  Bounded by the number of open analysis pages, not by users or games, and cleaned on disconnect.

The third is the only one that is both push and proportionate. It is written here rather than built
because it adds a server-side structure, and that is worth agreeing before it exists.

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

- ~~Is presence on a finished game wanted at all?~~ **ANSWERED 2026-09-26: yes, Option B.**
- ~~Should the dot show presence on the analysis page specifically, or anywhere on the site?~~
  **ANSWERED 2026-09-26: anywhere on the site — Decision 5.**
- **NEW, and open: how does a change in site-wide state reach the page?** Decision 6 proposes a small
  interest registry; it is not yet agreed.
- **NEW: what does the dot mean for a user who is online but invisible?** If a "hide my online
  status" preference is ever added, a site-wide dot is the first thing that breaks it. Nothing like
  it exists today; worth knowing before this becomes load-bearing.
- Should the single-board analysis page behave the same way? It is a separate codepath and was not
  examined; whatever is decided here probably wants to be true there too.
