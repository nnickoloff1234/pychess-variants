## 1. Draw: three looks on one control

- [x] 1.1 Gave `#draw` its three states via `OfferState` in `RoundControlsView` — `rest` / `offering` / `offered` — with `paintGameControls()` as the single painter. The controller only calls `setDrawOffer(state)`; no handler renders a button itself.
- [x] 1.2 **`--green-switch` (#629924)**, not `--green-hover`. The hover green is what every button on the page turns under the pointer, so it would make "a draw is offered" indistinguishable from "your pointer is here" — and it is theme-split (#89b25b light, #537c23 dark) where this state must read the same in both. `--green-switch` is defined once for both themes and already means affirmative on this site. Confirmed on the page in task 5.7.
- [x] 1.3 No new look was needed: the offering state renders the button `disabled`, and site.css already dims a disabled button's icon (`button[disabled] i`) and withholds the hover colour. Recorded in the CSS that this is deliberate so nobody adds a rule for it.
- [x] 1.4 Verified by construction — the three states differ only in `class`, `attrs.disabled`, `on.click` and `title`. Selector, geometry and the `½` glyph are one code path. Measured in task 5.7.
- [x] 1.5 Added `acceptDraw()`, which sends `draw` directly. It deliberately does not call `draw()`, which carries the offerer's "Are you sure you want to draw?" modal — the cause of today's wrong prompt when accepting.

## 2. Draw: playing on declines

- [x] 2.1 `declineDrawByMoving()` hangs off `sendMove()`, replacing the `clearDialog()` that was already there: sends `reject_draw` and returns the control to rest.
- [x] 2.2 It returns immediately unless `controlsView.hasDrawOfferToAnswer()` — i.e. only when someone else's offer is outstanding against this player. Every other move is untouched.
- [x] 2.3 Restored in `onMsgDrawRejected`, with a comment recording that it is now load-bearing rather than tidying: the offerer's button IS the record of an outstanding offer, so this is the only thing that returns it to rest.

## 3. Rematch at its button

- [x] 3.1 `.rematch` is replaced in place by `div.rematch-answer` holding ACCEPT and DECLINE. VIEW REMATCH, NEW OPPONENT and ANALYSIS BOARD are rebuilt in their existing order around it.
- [x] 3.2 `.rematch` renders `disabled` while offering, the same idiom as `#draw`. "Rematch offer sent" is gone.
- [x] 3.3 Restored in `onMsgRematchRejected`, same reason as 2.3.

## 4. Remove the strip

- [x] 4.1 `.bug-offer-dialog` and `#offer-dialog` removed from `round.ts`, with a comment recording what used to be there and why it left.
- [x] 4.2 Removed `vdialog`, `renderDrawOffer`, `renderRematchOffer`, `setDialogMessage`, `clearDialog` from `roundControls.ts`, and `setDialog`/`clearDialog`/`renderDrawOffer`/`renderRematchOffer` from `roundCtrl.ts`. Also converted `insertRematchButton()` — a raw `insertBefore` outside snabbdom's knowledge — into `setViewRematch()`, since `.bug-gameover` is now repainted and the spliced button would have been discarded by the next paint.
- [x] 4.3 Removed the `.bug-offer-dialog` rule and the `toolsB` area from all three templates, each with its matching row track: portrait lost an `auto`, short landscape lost an `auto`, desktop went from two rows to one. Four stale comments referring to the strip were rewritten rather than left pointing at nothing.
- [x] 4.4 Grepped clean. The only remaining `offer-dialog` hits are in `client/roundCtrl.ts` and `client/round.ts` — the single-board round page, which this change does not touch.

## 5. Verify on the live page

- [x] 5.1 Offered from p1 (desktop, 1914x827): the offerer's `#draw` went `disabled` with its icon at 0.5 opacity, size unchanged at 47x40, and no text appeared anywhere on the page. `#offer-dialog` absent throughout.
- [x] 5.2 **The proposal was wrong here and the artifacts are corrected.** Exactly ONE opponent saw the green button, not three: `handle_draw` in `server/wsr.py` derives `opp_name` from `game.wplayer`/`game.bplayer`, single-board fields that on a `GameBug` name board A's two players. p1 (A-white) offered; only p3 (A-black) got the message and the green button. The partner (p2) and the fourth player (p4) received nothing — no chat line, no state change. Pre-existing server limitation, logged for the backlog.
- [x] 5.3 p3 pressed the green button: **no modal of any kind** (`document.querySelectorAll('.confirm-dialog-content, dialog[open], [role=dialog]')` empty after the click), game drawn — movelist `1.e4 e5 1/2-1/2 Draw` — and `.bug-gameover` rendered through the new painter.
- [x] 5.4 Offered, then p3 played 1...e5. `reject_draw` went out (confirmed in the server log), p3's green reverted to rest, and p1's button returned to rest with the chat reading "Draw offer sent" then "Draw offer rejected". Also confirmed the offerer's OWN move (1.e4) does not retract their own offer.
- [x] 5.5 p1 pressed REMATCH: its button went `disabled`. p3 got `.rematch-answer` holding ACCEPT and DECLINE at **386x40, x=890 y=387** — exactly the slot REMATCH occupied — with NEW OPPONENT and ANALYSIS BOARD unmoved at the same x and width directly below. DECLINE reset both sides: p3's pair collapsed back to one REMATCH button, p1's returned to rest.
- [x] 5.6 All three modes, live, after the row removal. **desktop** (1914x827): `"ownstack rightcol"`, one row of 767px, app bottom exactly 827 in an 827px viewport, no overflow. **short landscape** (1276x551): six areas, six rows, no `toolsB`. **portrait** (386x835): `"rightcol" "ownstack"`, two rows (355.3 + 480.0). No `#offer-dialog` or `.bug-offer-dialog` in any of them.
- [x] 5.7 Judged on the live page in the dark theme at the real 36x40 button size, beside `#resign`. `--green-switch` resolves to `rgb(98,153,36)` with white text; the pending state resolves to the same dark background with the icon at 0.5 opacity. The three states are plainly distinct from each other and from the hover green. Screenshots captured for all three.

## 6. Close out

- [x] 6.1 `yarn typecheck` clean, `yarn test` 226 passed / 41 suites, `yarn dev` clean, `css-tree` 0 errors on the stylesheet. No Python gates — no server change.
- [x] 6.2 Backlog noted below, and one item added by this change's own verification.

## 7. Found while verifying — for the backlog, not for this change

- **A bughouse draw offer reaches one opponent, not the opposing team.** `handle_draw` (`server/wsr.py`)
  is single-board: `opp_name` comes from `game.wplayer`/`game.bplayer`, which on a `GameBug` resolve to
  board A's two players. Measured live — p1 offered, only board A black saw it; the partner and the
  fourth player got no message at all. Needs a bughouse branch the way `abort` already has one in
  `bug/wsr_bug.py`.
- **`handle_moretime` has the same shape of bug** and would need fixing before any "give time" control
  could be added: it reads `game.wplayer`/`bplayer`/`stopwatch` on a game with four players and two clocks.
- Carried over from the research that scoped this change: flip and switch stranded inside the closed
  Moves tab; Abort implemented server-side for bughouse with no button anywhere; the dead
  `#count`/`#abort`/`helpDialog` machinery; the hidden crosstable and spectator list.
