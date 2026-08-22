## Context

Both offers share one mechanism today. `RoundControlsView` holds a `vdialog` vnode bound to
`#offer-dialog` (`roundControls.ts:22`) and patches one of four shapes into it: a draw offer, a
rematch offer, a plain text message, or empty. `#offer-dialog` sits inside `.bug-offer-dialog`,
whose only job is to carry `grid-area: toolsB` — an area that appears in all three layout modes and
holds nothing else.

The two buttons those offers belong to live in two different containers, and the distinction
matters for this change:

| | draw | rematch |
|---|---|---|
| button | `#draw`, an icon button carrying `½` | `.rematch`, a wide text button |
| container | `#game-controls` in `.bug-round-tools-bar`, sharing a row with the tablist | `.bug-gameover` in `.bug-parts` |
| when | during play | only once there is a result |
| neighbours | `#resign`, and the tab list | NEW OPPONENT, ANALYSIS BOARD, sometimes VIEW REMATCH |
| room | very little — a bar sized so two buttons are 2 x (2/3) of a board square | a wrapping column of full-width buttons |

That asymmetry is why the two get different answers rather than one shared rule. A three-part
confirm row fits where REMATCH is; it does not fit in the tools bar, which is why the draw offer
becomes a state of one button instead of a panel.

The controller side is `roundCtrl.ts`: `draw()` confirms then sends and calls
`setDialog('Draw offer sent')`; `renderDrawOffer()` binds reject to `rejectDrawOffer()` and accept
to `draw()` — the same `draw()`, modal and all. `rematch()` mirrors it.

## Goals / Non-Goals

**Goals:**

- Every state of an offer is drawn on the control that made it.
- The draw offer is one button with three looks and no separate reject.
- A declined offer returns its button to idle, on both sides.
- The offer strip and its grid area are gone, not merely emptied.

**Non-Goals:**

- The rematch offer's shape. It keeps confirm and reject; only its position changes.
- Anything the research turned up outside the two offers — flip/switch placement, the missing Abort,
  the dead `#count`/`#abort`/`helpDialog` machinery, the hidden crosstable and spectator list.
- Server behaviour. The same four messages are sent.
- The shelved rematch cache-eviction defect.

## Decisions

### 1. The draw offer is a state of `#draw`, not a panel anywhere

Three looks on one element, distinguished by a class the controller sets:

- **idle** — today's button, unchanged, with today's "Are you sure you want to draw?" confirm.
- **pending** (I offered) — the same geometry, visibly inert. This is what replaces the
  "Draw offer sent" text: the feedback appears where the click happened.
- **offered** (someone offered me) — the same geometry, **green**, one click accepts.

Sizing and glyph are untouched in all three, which is the point: the tools bar rule sizes these
buttons at two thirds of a board square precisely because they are reached for under time pressure,
and a state that changed the target would undo that. Only colour and interactivity change, so the
button reads as the same button having changed its mind.

*Why no reject control.* There is no room for one — the bar holds two buttons at a stated size
beside a tab list — and a draw offer does not need one: playing on IS the refusal, and it is the
refusal a player makes anyway without looking for a control.

### 2. A move declines the offer, and that is what sends `reject_draw`

The recipient's next move sends `reject_draw` and returns every button to idle. Without this the
message would have no sender at all and the offerer would be left with a pending button forever.

It hangs off the existing move path rather than a timer, so there is nothing to schedule and nothing
to cancel, and it is silent when no offer is outstanding.

*Alternative considered: let the offer stand until the game ends.* Rejected — it makes
`reject_draw` dead code and leaves the offerer's button pending with no way to learn otherwise.

*Alternative considered: expire after a timeout.* Rejected — it needs a number nobody has a reason
for, and a timer that has to be cancelled on four different events.

### 3. Accepting is one click, with no confirmation

The accept path sends `draw` directly. It does NOT route through `draw()`, which exists to OFFER a
draw and carries the offerer's modal — routing acceptance through it is what produces today's
"Are you sure you want to draw?" when answering someone else's offer.

This was raised as a risk and decided: the green button ends the game irreversibly on one click, on
a target two thirds of a square wide, beside `#resign`. The decision is deliberate — the button
exists to say yes, and a dialog to confirm a dialog is the thing this change removes — and it is
recorded here rather than argued again. **The green must therefore be unambiguous**, since colour is
now the only thing separating "offer a draw" from "end the game now"; it is the one visual decision
in this change that carries real weight.

### 4. Rematch keeps its pair, and takes it to the button

While a rematch offer is live, the `.rematch` button is replaced in place by the confirm and reject
controls; NEW OPPONENT and ANALYSIS BOARD stay where they are. `.bug-gameover` is a wrapping column
of full-width buttons, so a pair fits without the row arithmetic the tools bar would need.

**Derived, not stated in the request:** the rematch OFFERER gets the same pending look on `.rematch`
that the draw offerer gets on `#draw`, replacing "Rematch offer sent". Deriving it is the whole
reason the offer strip can be deleted — leave that one message behind and the strip has to stay for
it alone.

### 5. The strip is removed, not emptied

`#offer-dialog` and `.bug-offer-dialog` go, and with them the `toolsB` area in all three
`grid-template-areas`. Nothing else uses it, and `setDialogMessage` has exactly two callers, both of
which become button states.

Emptying it instead would leave a named area, a wrapper element and a patched vnode that no longer
carry anything — the shape of a thing whose job has moved, which is exactly the confusion the CSS
comment on `.bug-offer-dialog` already records about its own previous name.

### 6. The two commented-out clears become load-bearing

`onMsgDrawRejected` and `onMsgRematchRejected` currently comment out `clearDialog()`. Today that is
a cosmetic bug — a stale message. Once the offerer's state is a button look, it is the ONLY thing
that returns that button to idle, so the calls are restored as part of the state machine rather than
as a tidy-up.

## Risks / Trade-offs

**Colour is the sole carrier of a game-ending action.** → Accepted with decision 3, and it is the
sharpest edge here. The green must survive both themes and be distinguishable from the hover green
already used on `.bug-gameover > button`. A player who cannot distinguish it gets an inert-looking
button that ends the game — worth stating plainly given this page's standing accessibility debt.

**Only ONE opponent ever sees the green button — and that is a server bug, not a design choice.**
→ Measured live: `handle_draw` (`server/wsr.py`) resolves `opp_name` from `game.wplayer`/`game.bplayer`,
single-board fields that on a `GameBug` name board A's two players, so a draw offer reaches board A's
opponent and nobody else. The partner and the fourth player receive no message at all. This change
neither causes nor fixes that; it does make it visible, because a button that stays dark is easier to
notice than a strip that never appeared. Recorded for the backlog.

**The tools bar is tight.** → The change adds no element to it: three looks on one existing button,
at the same size. This is the reason the draw offer is not the same shape as the rematch offer.

**Removing a grid area touches all three layout modes.** → The area holds one element with one
consumer, and the templates are explicit, so each removal is a line. The risk is a mode whose row
count is load-bearing elsewhere; verified per mode rather than assumed.

## Open Questions

1. **What green?** It has to read as "accept" against both themes, differ from `--green-hover`
   already in use on the end-of-game buttons, and not be mistaken for a disabled or pending state.
   Settled by looking at it on the page, not chosen here.
2. **What does "pending" look like?** Outlined, dimmed, or reduced-opacity are all candidates; the
   requirement is only that it is neither the idle button nor mistakable for the green one.
