## Why

`analysis-page-presence-websocket` shipped phase 1: the two-board analysis page now draws each
player's dot from `User.online` at render time, so it is correct when the page opens. Its phase 2
was "keep it current while the page stays open", proposed as a small server-side interest registry.

**Nikolay declined to build that inside a one-page change**, and the reasoning is the proposal:

> *"the question is what other pages can benefit from such push registry and what kind of
> performance overhead this adds to the server. if each browser has to always receive a message
> whenever another user opens their browser, it will a lot of push messages to browsers who don't
> at that exact time care about whether that user has connected or not. if each page 'subscribes'
> to what users they are interested in, i.e. if they are currently rendered somewhere on the page,
> in order to receive those push notifications for these particular users only, then the amount of
> messages will be reduced to something acceptable, but sounds like complicated logic for something
> that might not be that much worth the effort ... i can imagine one more case where something
> similar makes sense, i.e. when we keep track of which of our friends/followees have appeared
> online ... and if such registry ultimately proves useful for more than the analysis page, then we
> can go ahead and implement it, but just for the analysis page, and for slight improvement of some
> pages that could be made more quickly updated about something that hardly anyone cares while
> browsing them, like the profiles list etc. then this is overkill."*

So this change is **the evaluation, not the build**. It asks one question across the whole app —
who actually needs to learn that a user came online, rather than merely to know it when their page
loads — and only then decides whether a registry is worth existing.

**AND THE SURVEY ALREADY FOUND THE FACT THAT DECIDES IT.** Interest-scoped presence is not
hypothetical here; a shipped page already does it. `client/tournamentRR.ts:494-529` polls
`/api/users/status?ids=<white>,<black>` every 35 seconds for exactly the two usernames the open
modal is showing, and stops when it closes. The endpoint (`server/user.py:1218`, routed at
`routes.py:440`) takes an arbitrary id list and answers `User.online` for each.

That changes the comparison this change has to make. The alternative to a push registry is **not**
"nothing" — it is twelve lines copied from `tournamentRR.ts`. A registry has to beat *that*, not
beat a stale dot.

## What Changes

Nothing yet. **Section 1 of the tasks is a gate**, and one legitimate outcome is that no registry
is built and the analysis page (and anything else that wants liveness) copies the existing poll.

What the gate has to produce:

- **A census of who draws the dot and how they get it**, which the tasks already carry from this
  change's own research — seven render-time consumers, one poller, one per-game socket.
- **A reader for each**, in the same terms phase 1 used: who is looking at this page, and would
  they notice or act on a dot that changes while they watch? "Correct on load" already serves most
  of them.
- **A cost for each of the three transports**, measured against the poll that exists rather than
  against zero.
- **A verdict**, and if it is "not worth it", the reason written down so it is not re-proposed.

If the gate passes, sections 2 and 3 build it: the registry, then at least two consumers, because
one consumer is not a registry — see [[no-abstraction-without-a-consumer]].

## Capabilities

To be decided with the design; likely a new `user-presence` capability covering what the dot means
and how a page may learn it. Naming it before the gate would prejudge the outcome.

## Impact

- `server/user.py` — `User.online`, `update_online()` (line 443), and `get_status` (line 1218).
- `server/views/following.py`, `players50.py`, `players.py`, `profile.py`, `ublog.py`,
  `user_mini.py`, `admin.py`, `__init__.py` — every current reader of `live_user.online`.
- `client/tournamentRR.ts` — the existing poller, which becomes either the pattern to copy or the
  first thing a registry replaces.
- `client/two-board/socket/`, `client/two-board/analysis/` — where the analysis page's consumer
  would go.
- **`analysis-page-presence-websocket`** — phase 2 is struck from it and lives here. That change is
  complete at phase 1 and its task 3.6 (`#roundchat`) is blocked on whatever this decides.

## What this change is NOT

- **Not a promise to build a registry.** The gate can fail, and failing is a result.
- **Not a change to what the dot MEANS.** That was decided: online anywhere on the site, matching
  the player lists. This is only about how a page learns it changed.
- **Not about the round page.** Its per-game presence over the game socket answers a different
  question ("is my opponent at this board") and keeps its meaning — see the presence change's
  Decision 5.
- **Not a privacy feature.** An "appear offline" preference does not exist and is out of scope,
  though the gate should note that a push registry is the thing that would make adding one hardest.
