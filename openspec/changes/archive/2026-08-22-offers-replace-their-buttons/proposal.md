## Why

An offer's answer is drawn nowhere near the thing that asked the question.

Both the draw offer and the rematch offer render into `#offer-dialog`, wrapped by
`.bug-offer-dialog`, which is `grid-area: toolsB` — a strip spanning the FULL width of the app,
below both boards (`round.ts:192`, `bughouse.css:1549`, and the desktop template
`'ownstack rightcol' / 'toolsB toolsB'`). The buttons those offers belong to are somewhere else
entirely: REMATCH is in `.bug-gameover` inside the tools column on the right
(`roundControls.ts:57,66`), and the draw button is `#draw` in `#game-controls`, in the tools bar at
the bottom of that same column. So a player presses a control on the right and the response to it
appears centred under the whole page.

The draw dialog has a second problem beyond where it is drawn. It is a three-part row — reject, a
sentence, accept — and its accept handler calls `this.draw()`, which re-runs the OFFERER's modal
asking "Are you sure you want to draw?" (`roundCtrl.ts:385-392, 400-405`). Accepting a draw
therefore asks you to confirm that you want to offer one.

And neither offer clears when it is turned down: `onMsgDrawRejected` and `onMsgRematchRejected` both
have their `clearDialog()` commented out (`roundCtrl.ts:979, 989`), so "Draw offer sent" and
"Rematch offer sent" sit on screen after the answer has already come back as no.

## What Changes

**An offer is answered where it was asked.** Every state of an offer is drawn on the button that
started it, and the strip that used to hold them is removed.

**Rematch** — the confirm/reject pair replaces the REMATCH button in place, inside `.bug-gameover`,
for as long as the offer is live. NEW OPPONENT and ANALYSIS BOARD are untouched beside it.

**Draw** — the dialog is not moved, it is deleted and replaced by a state of the draw button itself.
`#draw` gets three looks and nothing else on the page changes:

| state | look | action |
|---|---|---|
| idle | the ½ button as it is today | offers a draw (keeps today's confirm modal) |
| I have offered | the same button, a pending look | inert |
| offered to me | **the same button, green** | one click accepts, **no confirm** |

There is deliberately **no reject control**. Making a move declines the offer: it sends
`reject_draw` and reverts the button, which is what chess clients have always done and what leaves
the offerer with an answer.

**BREAKING for the offer strip.** `#offer-dialog`, `.bug-offer-dialog`, and the `toolsB` grid area
are removed from all three layout modes. Nothing else occupies that area, and the two messages it
carried — "Draw offer sent" and "Rematch offer sent" — become the pending look on their own buttons.

**The two clears are fixed**, because the new looks depend on them: a rejected offer must return its
button to idle, which is exactly what the commented-out calls were for.

**Out of scope, deliberately.** The research that produced this change also found the flip and switch
buttons stranded inside the closed Moves tab, an Abort action fully implemented server-side for
bughouse with no button anywhere, dead `#count`/`#abort`/`helpDialog` machinery, and the hidden
crosstable and spectator list. None of that is here; this change is the two offers and nothing else.
This change also does not touch the shelved rematch cache-eviction defect, which is about offers not
converging across two `GameBug` instances, not about where they are drawn.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: gains a requirement that an offer's answer is drawn on the control that
  made it, and loses nothing — no existing requirement describes the offer strip.

## Impact

- `client/two-board/round/roundControls.ts` — `renderDrawOffer`, `renderRematchOffer`,
  `setDialogMessage`, `clearDialog` and the `vdialog` field they patch.
- `client/two-board/round/roundCtrl.ts` — the draw and rematch flows, the two commented-out clears,
  and a new "a move declines an offer" path.
- `client/two-board/round/round.ts:192` — the `.bug-offer-dialog` element is removed.
- `static/bughouse.css` — `.bug-offer-dialog`, the `toolsB` area in all three `grid-template-areas`,
  and the new button looks.
- No server change. `draw`, `reject_draw`, `rematch` and `reject_rematch` are all sent exactly as
  they are today; only what triggers `reject_draw` moves.
- **This claim was wrong and is corrected by measurement.** The proposal originally said a draw
  offer reaches all three other players, so three green buttons would appear. It reaches exactly
  ONE: `handle_draw` in `server/wsr.py` is single-board code — it derives `opp_name` from
  `game.wplayer`/`game.bplayer`, which on a four-player `GameBug` resolve to board A's two players
  only. Verified live: p1 (board A white) offered, and only board A black saw anything at all. The
  partner and the fourth player got no message and no chat line.
  That is a pre-existing server limitation, not something this change introduces or can fix from the
  client, and it is now recorded in the follow-up backlog. It makes the feature *safer* than
  described — one green button, not three — but it also means a bughouse draw cannot currently be
  offered to the opposing team as a whole.
