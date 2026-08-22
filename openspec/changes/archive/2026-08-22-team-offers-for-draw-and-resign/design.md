## Context

`offers-replace-their-buttons` put every state of an offer onto the control that made it. It did so
with a per-viewer state (`rest` / `offering` / `offered`) set from the messages that arrive. That
model is right and stays; what it lacks is any notion of a TEAM, which is what a four-player game
needs and what the server never told it.

**What the server does today.**

`handle_draw` (`server/wsr.py`) is single-board throughout:

```python
color = WHITE if user.username == game.wplayer.username else BLACK
opp_name = game.wplayer.username if color == BLACK else game.bplayer.username
if opp_name not in game.draw_offers:
    game.draw_offers.add(user.username)
response = await draw(game, user, agreement=opp_name in game.draw_offers)
await ws_send_json(ws, response)          # the offerer
... opp_player.send_game_message(...)     # ONE opponent
await round_broadcast(game, response)     # spectators only — no full=True
```

On a `GameBug`, `wplayer`/`bplayer` are board A's players, so `opp_name` is board A's other seat and
the other two players are never addressed. `game.draw_offers` is a set of usernames whose meaning —
"the one opponent has also offered" — has no four-player reading. `handle_reject_draw` goes through
`reject_draw()`, which reads `game.board.count_started`; `game.board` on a `GameBug` is a
compatibility shim that logs when used.

`handle_resign_bughouse` (`bug/wsr_bug.py`) already exists and is the model to follow — it is
dispatched from `wsr.py:256` for two-board games and handles `abort`/`resign`/`abandon`/`flag`. It
ends the game on the spot.

**What the model already provides.** `GameBug` has `team1 = [wplayerA, bplayerB]` and
`team2 = [bplayerA, wplayerB]`, and `game_ended` computes `result = "0-1" if user.username in
self.team1 else "1-0"`. So teams and team results exist; only the offer protocols are missing.

## Goals / Non-Goals

**Goals:**

- An offer addresses a team, and every player learns of it.
- The Python change stays inside `server/bug/`. Shared round logic is not modified.
- The team that may answer can see that it may; the team that asked can see that it is waiting.
- Resigning takes two teammates.
- No modal stands in front of a message that can be declined or that needs a second person.

**Non-Goals:**

- `abort`, `flag`, `abandon`. They end the game immediately and continue to.
- Rematch. It is already answered at its button and is not team-scoped in this change.
- The single-board round page. Every change here is inside a bughouse branch.
- Rating, result or crosstable semantics — `game_ended` already resolves by team.

## Decisions

### 1. One rule, stated once: the asking team waits, the answering team acts

| | may answer | asked |
|---|---|---|
| **draw** | both opponents — **green** | offerer AND partner — pending |
| **resign** | the partner — **red** | the initiator — pending |

The offering player's partner gets the same pending look as the offerer rather than a look of their
own. It is the truthful one: their team has asked and they are not the one who answers. A third
"someone offered but not you" state would be a state whose entire job is to be ignored, and would
make the pending look mean "you personally asked" rather than "your team is waiting", which is what
the resign case needs it to mean too.

### 2. Draw becomes team-scoped on the server, in a bughouse branch

A new `handle_draw_bughouse` in `bug/wsr_bug.py`, dispatched from `wsr.py` the way
`handle_resign_bughouse` already is. It records which TEAM has offered, broadcasts with
`full=True` so all four players and the spectators receive it, and treats a `draw` message from a
member of the opposing team as acceptance.

`game.draw_offers` — a set of usernames compared against `wplayer`/`bplayer` — is not reused. Its
meaning is "one of the two players has offered", which cannot be stretched to four players without
lying about what it holds. The bughouse state is the offering team, held on `GameBug`.

*Alternative considered: add `full=True` and fix `opp_name` in the shared `handle_draw`.* Rejected.
It would leave one function branching on `two_boards` through four separate assumptions, and the
codebase has already chosen the other pattern — `abort` is a bughouse branch, not a flag.

### 3. Resign is two messages of one type, not a new verb

The client sends `resign` exactly as it does today. The server decides what it means:

- no resignation pending for that team → record it, notify the partner, do **not** end the game
- the initiator's partner is the sender and a resignation is pending → end the game

One message type, one place that knows the rule, and a client that cannot get the two steps out of
order because it does not know there are two.

What the client DOES need is to be told, which is one new outbound message carrying the pending
state so the partner's button can turn red and the initiator's can go inert.

*Alternative considered: a distinct `confirm_resign` message.* Rejected — it lets a client confirm a
resignation that was never asked for, and the server would have to validate that anyway, at which
point the first message was enough.

### 4. A pending resignation is private to the team

The new message goes to the two teammates, not through `round_broadcast`. Opponents learn nothing.
This is the one place in this change where a message is deliberately NOT broadcast, and the reason is
not privacy for its own sake: knowing your opponents are considering resignation is information about
their evaluation of the position, and handing it over mid-game changes the game.

The consequence to accept: spectators do not see it either, and a resignation will appear to
spectators as a single event with no lead-up.

### 5. A move cancels a pending resignation; a move by an opponent declines a draw

Both hang off the move path, and both are the same thought — playing on is an answer.

- **Resign**: a move by EITHER teammate cancels. The initiator playing on has changed their mind; the
  partner playing on has declined without needing a control for it.
- **Draw**: a move by either OPPONENT declines for the team, which is the rule already shipped, now
  reaching both of them.

### 6. Every Python change lives in `server/bug/`, and the dispatcher is the only exception

The shared round path — `wsr.py`'s `handle_draw`, `draw.py`, `broadcast.py`, `utils.py` — is not
modified. The single-board page and every other variant keep the code they have, byte for byte.

What that costs and how it is paid:

- **Dispatch.** `wsr.py` must route `draw` and `reject_draw` to the bughouse handlers for two-board
  games. That is the same two-line `if game.server_variant.two_boards:` shape `abort`/`resign`
  already use at `wsr.py:253`, and it is the ONLY edit outside `server/bug/`.
- **Broadcasting to all four.** No change to `broadcast.py` is needed: `round_broadcast` already
  takes `full=True`, and the bughouse handler simply passes it. The bug was never in the broadcaster.
- **Ending a game drawn.** `draw.py`'s `draw()` does the status update and save, but it also reads
  `game.is_claimable_draw` and writes corr-game state keyed on `wplayer`/`bplayer`. Rather than
  branch it, `GameBug` gets its own method to end drawn — the counterpart of the `game_ended` it
  already has for resign, abort and flag.
- **Offer state.** Held on `GameBug`, not in `game.draw_offers`, which stays exactly as it is for the
  single-board page and for `save_draw_offer`'s `wd`/`bd` columns.

This is the pattern the codebase already chose. `abort` is a bughouse branch rather than a flag
threaded through shared code, and following it keeps the blast radius of this change to files whose
only consumer is bughouse.

### 7. The modals go, and one of them was load-bearing

Offering a draw loses its modal because the message is answerable — the opponents can decline by
playing on, and nothing has happened yet. Resigning loses its modal because clicking no longer ends
anything; the partner's confirmation IS the guard, and a better one, since it is a second person
rather than the same person asked twice.

## Risks / Trade-offs

**The same button does two different things, and only colour says which.** → This is the sharpest
risk in the change, and it is NOT that the two buttons could be confused with each other — they carry
different glyphs, `½` and a flag, so that much is already clear. It is that ONE button's meaning
changes with its state:

| button | at rest | lit |
|---|---|---|
| flag | ask my partner to resign | **resign the game now** |
| ½ | offer a draw | accept the draw |

For the draw button this is mild: both readings end in a draw, which is roughly what the player
wanted either way. For resign it is not — a player who cannot see that their flag is red presses it
meaning "ask my partner" and loses the game instead. Roughly one man in twelve has some red-green
deficiency, and this button is two thirds of a board square.

So the requirement is not "distinguish red from green"; it is **distinguish LIT from AT REST without
relying on colour**, on the resign control at minimum. A border, an outlined-versus-filled glyph, or
any non-colour cue does it. Settled by looking at the page rather than asserted here.

**A misclicked draw offer cannot be retracted.** → Removing the modal makes offering one click, and
nothing in this change lets the offerer take it back: their own move does not retract it (verified
behaviour today), only an opponent's answer ends it. That is an accepted asymmetry with resign, where
a teammate's move cancels — but it is an asymmetry, and it is listed as an open question rather than
argued away.

**Two protocols change at once on a live game type.** → Draw and resign share the team model and the
move-cancellation path, so splitting them would mean building the same server plumbing twice. The
mitigation is ordering: the draw propagation fix is worth having on its own and comes first, so the
change has a working, verifiable midpoint before resign is touched.

**`game.draw_offers` stays in use by the single-board page.** → The bughouse branch must not write to
it, or the corr-game draw persistence (`save_draw_offer`, keyed on `wd`/`bd`) will record nonsense
for a four-player game.

## Open Questions

1. **Should the offerer be able to retract a draw offer?** Resign can be cancelled by playing on;
   draw cannot be cancelled by anything the offering team does. Making the offerer's own move retract
   it would make the two symmetric, at the cost of changing behaviour that currently works as
   intended.
2. **What is the non-colour signal that says a control is LIT?** Needed on the resign control before
   this ships, for the reason in the risks above. Candidates are a border, an outlined-versus-filled
   glyph, or a shape change; the answer comes from the live page.
3. **Should a pending resignation survive a page reload?** It lives on `GameBug`, so the server knows
   it; whether a reconnecting client is told is a separate decision from whether the state exists.
