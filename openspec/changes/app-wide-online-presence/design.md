## Context

One boolean, `User.online`, is drawn as one green dot in nine places. It is computed in one place —
`update_online()` at `server/user.py:443`, which ORs the user's game, lobby, challenge, tournament,
simul and study sockets — and **nothing publishes a change to it.** Every consumer either reads it
once at render time or asks again later.

`analysis-page-presence-websocket` made the two-board analysis page the seventh render-time reader
and then stopped, because its phase 2 would have added a server-side push structure for one page.
This change is where that structure is judged on the whole app.

### The census, as measured 2026-09-26

| Consumer | How it gets the state | Fresh? |
|---|---|---|
| `templates/following.html:18` | `views/following.py:124`, `bool(live_user.online)` | at load |
| `templates/players50.html:15` | `views/players50.py:28`, `highscore_online` set | at load |
| `templates/players.html:21,31,51` | `views/players.py:19,46` | at load |
| `templates/ublog_post.html:24` | `ublog_author_online` | at load |
| profile page | `views/profile.py:196`, `profile_online` | at load |
| admin page | `views/admin.py:183` | at load |
| **two-board analysis** (phase 1) | `views/__init__.py:337`, `data-wonline` → `main.ts` → `player()` | at load |
| user-mini hover card | `views/user_mini.py:261`, fetched on hover | **on demand** |
| **round-robin tournament** | `client/tournamentRR.ts:494`, polls `/api/users/status?ids=` every 35s | **every 35s** |
| round page | `client/roundCtrl.ts:1821`, per-game socket | live, **different meaning** |

Two of those are not "at load", and they are the two that matter to this design.

## Goals / Non-Goals

**Goals**
- Decide whether a push registry for online state should exist at all, on evidence about consumers
  rather than about one page.
- If it should, define it once for the app instead of per page.
- Leave a written reason either way, so the next person to want a live dot finds the answer.

**Non-Goals**
- Changing what the dot means. Decided: online anywhere on the site.
- Touching the round page's per-game presence.
- An "appear offline" preference.
- Making every list live. Most of these pages are read once and left.

## Decisions

### Decision 1: the baseline is the existing poll, not a stale dot

`/api/users/status?ids=a,b` already exists, is already routed, already answers `User.online` for an
arbitrary id list, and is already polled with **interest scoping** by a shipped page — the
round-robin arrangement modal asks about exactly the two players it is showing and stops when it
closes.

**So the "subscribe to the users on this page" concept Nikolay described is not new work. It is
shipped, and it cost one `setInterval` and one endpoint.** A page that wants a live dot today can
have one for about twelve lines.

Everything below is therefore measured against *that*, not against nothing. A registry must be
justified by what a 35-second poll cannot do:

- **latency** — up to 35s late, and the poll's own cost scales with how short you make it;
- **request volume at scale** — N open pages × M users each ÷ 35s, all of it HTTP with session
  lookup, against a push that sends only on an actual flip;
- **pages with no natural poll owner** — a long list of 50 users is a worse poll than a modal
  showing two.

If none of those three hurts any real consumer, the answer is "copy the poll" and this change
archives having said so.

### Decision 2: a consumer counts only if a reader would ACT on the change

The distinction that kills most of the census. Knowing a player is online when the page opens is
enough to decide whether to message them. Learning it *while you read* only matters if you are
waiting for it.

By that test, of the ten:

- **Waiting** — the following/followees page. This is the one Nikolay named, and it is the only
  page whose entire purpose is "who of mine is around". A user leaves it open. **Candidate.**
- **Might act, does not wait** — the two-board analysis page. You open a game to study it, and you
  may decide to reach a player. Phase 1's load-time answer serves that; liveness is a small bonus.
  **Weak candidate.**
- **Would not notice** — players50, players, ublog author, profile, admin. Nikolay's own words:
  *"something that hardly anyone cares while browsing them"*. **Not candidates.**
- **Already solved** — user-mini (fetched per hover, so always fresh by construction) and
  round-robin (polls, scoped, bounded). **Not candidates, and they are the evidence for Decision 1.**

**So the honest count of consumers that would benefit is one strong and one weak.** That is the
number the gate has to weigh, and it is close to the number that makes a shared registry not worth
building. Section 1 of the tasks exists to check this reasoning rather than to assume it.

### Decision 3: if it is built, the interest set is per CONNECTION, not per page or per user

Nikolay's shape: *"if each page 'subscribes' to what users they are interested in, i.e. if they are
currently rendered somewhere on the page"*. The three transports, restated app-wide:

- **Poll** (exists). No server state. Latency 35s. Cost proportional to open pages × time.
- **Broadcast every flip.** `update_online()` sends to everyone. No registry, trivial to write,
  and worst at scale: every login wakes every browser, almost all of which do not care. **Rejected
  by Nikolay's own argument and repeated here so it is not re-proposed.**
- **Interest registry.** `username -> set(connections that asked)`, populated by a subscribe
  message, cleaned on disconnect, consulted by `update_online()`. Cost proportional to *actual
  flips × interested connections*, which is the only one of the three that is proportional to
  anything a user did.

The registry keys on the **connection**, not on the page or the viewing user, because that is what
has a lifetime the server can observe. A page that changes what it shows — pagination, a modal
opening — re-subscribes; a browser that vanishes is cleaned by the socket close that already
happens.

### Decision 4: a subscribe cap, decided before the first consumer

A long list is the case that breaks this. The following page could ask about hundreds of usernames
on one connection, and `players50` about fifty. Whatever the registry's shape, it needs a limit on
the size of one interest set, chosen and written down rather than discovered under load — and a
consumer that would exceed it is a consumer that should poll instead.

### Decision 5: `update_online()` is the single publish point, and its callers are already few

The one place the site-wide flag is computed. Its callers today: `server/user.py:311` and five
sites in `server/header_challenges.py`. That is a small enough surface to hook once, and it is
the reason a registry is *cheap on the publish side* even though it is expensive to justify.

Worth confirming in the gate: does `update_online()` actually run on every transition, or only
where the five challenge sites happen to call it? A registry that publishes from a function that
is not called on every flip would be a live dot that is wrong in a new way.

### Decision 6: two consumers or none

If the gate passes, the registry ships with the following page AND the analysis page, in that
order. A registry serving one page is a websocket with extra steps, and this project has a rule
about it — [[no-abstraction-without-a-consumer]]. If the following page turns out not to want it
after all, the answer reverts to "copy the poll".

## Risks / Trade-offs

- **[Building a registry for one page]** → Decision 6. The gate's most likely failure is that the
  analysis page is the only taker.
- **[The poll is good enough and we build anyway]** → Decision 1 forces the comparison against the
  shipped poll rather than against a stale dot.
- **[Broadcast looks simpler and gets built by accident]** → named and rejected in Decision 3.
- **[A live dot makes "appear offline" harder later]** → true, and the registry is the hardest
  version of it: a push means the server has already told browsers the thing a hidden user wants
  hidden. Not in scope, but it argues for deciding it before, not after.
- **[Subscribing to a long list]** → Decision 4.
- **[Doing nothing]** → acceptable. Phase 1 gave every load-time reader a correct dot; this is only
  about the ones that change while watched.

## Open Questions

- Does the following page have a real reader who leaves it open? It is the whole case; if not, the
  gate fails immediately.
- Is `update_online()` called on every transition, or only where those six sites happen to call it?
  (Decision 5.)
- Should the existing 35s poll be shortened as the cheap alternative, and what does that cost?
- Does the single-board analysis page want the same thing, since it is a separate codepath?
  (Inherited unanswered from `analysis-page-presence-websocket` 1.2.)
