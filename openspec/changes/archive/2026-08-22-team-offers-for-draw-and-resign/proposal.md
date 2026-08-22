## Why

**A bughouse draw offer reaches two of the four players, and the two are the wrong ones.**
Measured live: p1 offered, and only p1 and the board-A opponent learned anything. The partner and
the fourth player got no message and no chat line. Two separate single-board assumptions cause it:

- `round_broadcast(game, response)` in `server/broadcast.py:26` takes a `full` flag and reaches
  **spectators only** without it — `players = tuple(game.non_bot_players) if full else ()`.
  `handle_draw` never passes it. (`handle_reject_draw` does, which is why *rejections* propagate
  correctly and offers do not.)
- `handle_draw` derives the recipient as `opp_name` from `game.wplayer`/`game.bplayer`, fields that
  on a four-player `GameBug` resolve to board A's two players.

So a draw cannot currently be offered to the opposing team as a whole, which is the only thing a
bughouse draw could mean.

**Resigning is a team decision taken unilaterally.** One player clicks resign and both teammates
lose immediately, with only a modal in between. In a game where your partner's position is half the
result, one player should not be able to end it alone.

**Two modals stand where nothing needs confirming.** Offering a draw asks "Are you sure you want to
draw?" before sending a message that the opponent can simply decline. Resigning asks before doing
something that will now require a second person anyway.

## What Changes

**One rule underlies both.** An offer belongs to a TEAM. The initiating team's control goes inert
while it waits; the team that may answer gets a coloured, clickable one. Draw and resign differ only
in who may answer.

**Draw — offered to the opposing team, answered by either opponent.**

| who | control | may act |
|---|---|---|
| offerer and their partner | the ½ button, pending look (as today's "I offered") | no |
| both opponents | the ½ button, **green** | yes — one click draws the game |

- The confirmation modal is removed. One click offers.
- All four windows get the chat line, including the offerer's, so everyone knows an offer is live.
- Any opponent playing on declines for the team — the rule already shipped, now team-scoped.

**Resign — asked of your partner, and private to the team.**

| who | control | may act |
|---|---|---|
| initiator | the flag button, pending look | no |
| partner | the flag button, **red** | yes — one click ends the game |
| both opponents | unchanged | nothing to see |

- The confirmation modal is removed; clicking no longer ends the game, so there is nothing to guard.
- **Clicking resign does NOT end the game.** It asks the partner. The game ends only when the
  partner presses the red button, and it is then resigned in favour of the opposing team.
- A move by either teammate cancels a pending resignation — playing on means you are not resigning.
- The opposing team sees nothing. A pending resignation is the team's own business and telling
  opponents that their opponents are wavering is information the game should not hand out.

**Rematch — one control, three labels, and a way out.**

| state | label | press does |
|---|---|---|
| at rest | REMATCH | offers |
| my offer stands | CANCEL REMATCH | withdraws it |
| someone else's stands | **ACCEPT REMATCH** (green) | accepts |

- The ACCEPT/DECLINE pair is gone. DECLINE did nothing that not pressing ACCEPT did not already do,
  while the thing genuinely missing — a way for the offerer to take the offer back — had no control
  at all. `reject_rematch` now means exactly that withdrawal, and it clears the sender from the
  offer set so the withdrawal also stops counting towards the all-four total that starts a rematch.
- No non-colour signal is needed here, unlike the resign control: this is a wide TEXT button whose
  label changes with its state, so the words carry the meaning and the green only reinforces it.

**The result is announced in chat.** When a game ends, a line naming how it ended and who won —
"…resigned • …won", "Checkmate • …won", "Time out • …won", "Draw" — appears ahead of the
housekeeping notices about who can now read what. The movelist already showed this, but only to
whoever had the Moves tab open, and the tab open by default is Chat.

**Not changed:** `abort`, `flag` and `abandon` keep ending the game immediately. Only `resign` gains
the second step.

## Capabilities

### New Capabilities

- `bughouse-team-offers`: what a draw offer and a resignation mean in a four-player game — who they
  are addressed to, who may answer, and what ends them.

### Modified Capabilities

- `bughouse-round-layout`: the requirement that a draw offer is a state of the draw control gains the
  team dimension and loses its confirmation step; the resign control gains states it did not have.

## Impact

- **Server, and this is the larger half.** A bughouse branch for `handle_draw` and
  `handle_reject_draw` in `server/bug/wsr_bug.py`, modelled on the `abort` branch already there;
  `full=True` on the broadcasts; team-scoped offer state replacing the `game.draw_offers` pair logic,
  which is keyed on `wplayer`/`bplayer`. A two-step resign protocol with its own pending state on
  `GameBug` and a new outbound message so the partner's button can turn red. Python gates apply:
  `ruff format`, `ruff check`, `pyright`, and the unittest suite.
- `GameBug` already has `team1`/`team2` (`bug/game_bug.py:73`) and `game_ended` already resolves the
  result by team, so neither needs inventing.
- **Client**: the draw button's states become team-driven rather than sender-driven; the resign
  button gains pending and confirm states; both confirmation modals go; the decline-by-moving path
  extends to cancelling a pending resignation.
- Builds directly on `offers-replace-their-buttons`, which put offer state on the controls. This
  change adds who the state belongs to.
- **Scope constraint: the Python change stays inside `server/bug/`.** Shared round logic —
  `handle_draw` in `wsr.py`, `draw.py`, `broadcast.py`, `utils.py` — is not modified, so the
  single-board page and every other variant keep the code they have. The one exception is the
  dispatcher: `wsr.py` routes `draw`/`reject_draw` to the bughouse handlers using the same two-line
  `two_boards` branch `abort` already uses. `round_broadcast` needs no change at all — it already
  accepts `full=True`; the caller simply never passed it.
- **One control, two meanings, told apart only by colour.** Pressing the flag at rest asks your
  partner; pressing it lit resigns the game. Same glyph, same place — only the colour differs, and a
  player who cannot perceive it resigns when they meant to ask. (The draw control has the same shape
  of problem but a mild version: both readings end in a draw.) The lit resign state therefore needs a
  non-colour signal. This is not about confusing the two buttons with each other — their glyphs
  already differ.
