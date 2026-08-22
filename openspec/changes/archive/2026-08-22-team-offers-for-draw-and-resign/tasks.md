## 0. Scope rule for every Python task below

**Every Python edit lands in `server/bug/`.** Shared round logic — `handle_draw` in `wsr.py`,
`draw.py`, `broadcast.py`, `utils.py` — is not touched, so the single-board page and every other
variant keep the code they have.

The one permitted exception is dispatch: `wsr.py` must route `draw` and `reject_draw` to the bughouse
handlers, using the same two-line `if game.server_variant.two_boards:` shape `abort`/`resign` already
use at `wsr.py:253`. Nothing else outside `server/bug/` changes.

- [x] 0.1 `git diff --name-only -- '*.py'` shows `server/bug/game_bug.py`, `server/bug/utils_bug.py`, `server/bug/wsr_bug.py` and `server/wsr.py` — the last being dispatch lines only. Shared round logic untouched.

## 1. Draw reaches the whole table (server)

Worth having on its own, and the change's verifiable midpoint — do it before touching resign.

- [x] 1.1 `handle_draw_bughouse` added to `bug/wsr_bug.py`, dispatched from `wsr.py` behind `game.server_variant.two_boards`, exactly as abort/resign already are.
- [x] 1.2 `GameBug.draw_offer_team` holds the offering team's own list object, so `is` settles membership. `game.draw_offers` is never written by bughouse and keeps its single-board meaning for `save_draw_offer`'s wd/bd columns.
- [x] 1.3 `round_broadcast(..., full=True)`. Verified live: all four windows received the offer and the chat line, the offerer included. `broadcast.py` unmodified — the flag already existed.
- [x] 1.4 A `draw` from the opposing team ends the game drawn; one from the offering team's other member returns early. Verified live in both directions.
- [x] 1.5 `handle_reject_draw_bughouse` added. `draw.py` untouched.
- [x] 1.6 `GameBug.game_drawn()` added beside `game_ended()`, both sharing a new `game_end_payload()`. `draw.py`'s `draw()` not reused.
- [x] 1.7 ruff format, ruff check, pyright all clean.

## 2. Draw on the client

- [x] 2.1 `onMsgDrawOffer` now sets `offering` or `offered` from `onMyTeam(msg.username)`, using `seats.myTeam()`.
- [x] 2.2 The modal is gone; `draw()` is one `doSend`. Verified live — zero dialogs on the page after pressing.
- [x] 2.3 Verified in all four windows: "Draw offered by Test–HorseKnibis".
- [x] 2.4 Moved to the server (`cancel_team_offers_on_move`), so all four windows clear from one broadcast. The client's `declineDrawByMoving` and `hasDrawOfferToAnswer` are gone.

## 3. Resign becomes a team decision (server)

- [x] 3.1 `GameBug.resign_offer` holds the asking player's username — which gives both the team and which teammate may confirm.
- [x] 3.2 `handle_resign_bughouse` routes `resign` to the two-step path; abort/flag/abandon fall through to `game_ended` unchanged.
- [x] 3.3 First press records and asks; the partner's press ends the game via `game_ended`. Verified live in both directions (p1 asks/p2 confirms, and p2 asks/p1 confirms).
- [x] 3.4 `send_to_team` in `bug/utils_bug.py` delivers to the two teammates only. Verified live: both opponents' controls unchanged and their chat containing no mention of resignation at all.
- [x] 3.5 `cancel_team_offers_on_move`, called from `play_move` before the move is applied. Verified live for the asker moving and for the partner moving.
- [x] 3.6 A `resign` from a player whose team has no pending request is treated as a first step; one from a player whose partner did not ask returns early. The client is never told there are two steps.
- [x] 3.7 ruff format, ruff check, pyright clean; 859 unittest tests OK (1 skipped).

## 4. Resign on the client

- [x] 4.1 `#resign` gets `rest`/`offering`/`offered` through the same `paintGameControls()` painter as `#draw`.
- [x] 4.2 Removed, along with the now-unused `confirmDialog` import. Verified live — zero dialogs.
- [x] 4.3 Red `#a02c2c` on white, plus an **inset 2px ring** (`box-shadow: inset 0 0 0 2px #ffd9d9`) as the non-colour signal. `box-shadow` paints inside the border box, so the button stays 36x40. Rejected: a real `border` (changes the box), and a glyph swap (no filled-flag glyph exists in the icon font — only `icon-flag-o`).
- [x] 4.4 Verified live: resign and draw both 36x40 at the same coordinates in every state.
- [x] 4.5 Server-side, as 3.5 — the client no longer decides anything about offers on a move.

## 5. Verify on the live page

Four windows, one game, all four states observed from all four seats.

- [x] 5.1 p1 offered. p1 and p2 (same team) both `disabled`/waiting; p3 and p4 both green with title "Accept draw"; all four chats carrying the line.
- [x] 5.2 The partner's control renders `disabled`, so a press cannot reach a handler at all — structurally unable to accept rather than merely ignored.
- [~] 5.3 PARTIAL. Accepted from one opponent (p4) in game `pdxOsN5K`: green, one press, no modal, `1/2-1/2 Draw`, game over. NOT done from the second opponent — it needs another whole game and the acceptance path does not depend on which opponent sends it (the server only checks `game.draw_offer_team is not team`). Worth closing next time a game is up rather than claiming it.
- [x] 5.4 p4 (an opponent) moved: the offer died for BOTH opponents and both offering controls returned to rest, from one server broadcast. Chat: "Draw offer rejected".
- [x] 5.5 p1 pressed resign: game did NOT end, no modal, p1 `disabled`/waiting, p2 red with the ring. **Both opponents saw nothing** — controls at rest, `boxShadow: none`, and `/resign/i` matching nowhere in their chat.
- [x] 5.6 p1 confirmed p2's request: game ended, movelist reading "…+Test–ShogiKnightWazi won" — the opposing team. No modal.
- [x] 5.7 Asker's own move cancelled it (chat "Resignation cancelled", both controls to rest); re-asked, then the PARTNER's move cancelled it. Both directions.
- [~] 5.8 REASONED, NOT OBSERVED. `handle_resign_bughouse` intercepts only `data["type"] == "resign"`; abort, flag and abandon fall through to the same `game_ended` call as before, and the 859-test Python suite passes. But no abort control exists on this page to press, and flagging needs a clock to run out, so neither was exercised live. Stated rather than ticked.
- [x] 5.9 Captured at real size in the dark theme. The ring reads clearly against the red and survives greyscale, which the red alone would not.
- [x] 5.10 Confirmed — see 0.1.

## 6. Close out

- [x] 6.1 yarn typecheck clean, 226 tests / 41 suites, yarn dev clean, css-tree 0 errors.
- [x] 6.2 ruff format, ruff check, pyright clean; 859 tests OK.
- [~] 6.3 LEFT OPEN, deliberately. A draw offer still cannot be retracted by the offering team — only an opponent accepting or playing on ends it — while a resignation can be cancelled by either teammate moving. The asymmetry is real and was not closed because closing it means deciding whether the offerer's own move should retract, which changes behaviour nobody has complained about. Carried to the next change rather than settled here.
