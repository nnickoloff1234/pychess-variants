## Context

Four items, three of which meet at the moment a game ends.

**The resize handle.** `client/cgCtrl.ts:103` creates a `cg-resize` element in `onInsert()` and
appends it to the board's container, unconditionally, for every board on the site.
`static/site.css:3736` hides it by default and shows it inside `@media (min-width: 799.3px)`.
Short landscape is a landscape phone viewport — 1276x551 on the harness — so it is well past that
width and the handle appears. But short landscape's board tracks are `calc(var(--bug-sq) * 8)`,
with no `--board-scaleX` anywhere, so a drag updates the zoom setting and nothing moves. Portrait
escapes only by being 386px wide; tall landscape shows the handle and honours it.

**The end-of-game controls.** `roundControls.ts` has three methods on one element:
`renderInitialGameControls()` patches `#game-controls` with Draw and Resign,
`renderGameOverControls()` patches the same element with `div.btn-controls.after` holding Rematch,
New Opponent and Analysis Board, and `insertRematchButton()` inserts a fourth into that. That
element lives in `.bug-round-tools-bar`, sharing a row with the tab list, sized for two icon
buttons.

**The presets.** `ChatPresetsView` builds two parts unconditionally; `round.ts` decides only
whether the viewer is a spectator.

**The status.** `roundCtrl.ts` compares `this.status` against zero in eight places, and separately
keeps `finishedGame`, assigned `this.status >= 0` at construction and `true` when a result
arrives. The constants live server-side in `server/const.py`: `CREATED = -2`, `STARTED = -1`,
`ABORTED = 0`, then real results from `MATE = 1` upward.

## Goals / Non-Goals

**Goals:**

- No resize handle in a mode that ignores zoom.
- End-of-game controls among the tab parts, each placed independently.
- No presets after a result.
- One named test for "is this game over", and the odd comparison identified rather than absorbed.

**Non-Goals:**

- Making short landscape honour zoom. Hiding the handle is the small change; giving that mode a
  zoom factor is a layout change with its own consequences.
- Touching the single-board round page. It shares `roundCtrl.ts`'s pattern and `site.css`'s handle
  rule, and must come out unchanged.
- Reworking `finishedGame` away. It is a second way of asking the same question and worth noting,
  but replacing a field that the base controller also maintains is a bigger change than this.

## Decisions

### 1. Hide the handle in CSS, per mode, rather than not creating it

A rule in the short-landscape block, scoped to this page, beating the `display: block` that
`site.css` sets inside its own media query. `display: none` also makes it unclickable, so the
control is gone rather than merely invisible.

*Alternative considered:* have `cgCtrl.ts` skip creating the element. Rejected: the element is
created once, in `onInsert()`, while the mode is a media query that changes under the user —
rotating a phone or resizing a window would leave the wrong answer baked in. CSS re-evaluates.

*Alternative considered:* delete the width-based rule in `site.css` and make every page opt in.
Rejected as out of scope — it changes every other page on the site.

The rule belongs next to the one that sizes the boards from `--bug-sq`, with a comment saying
they are the same fact: this mode does not size from zoom, so it does not offer a zoom handle.

### 2. The end-of-game controls become one more part-like element

A container mounted inside `.bug-parts`, beside the tab panels and the tab bar, with its own grid
area in the merged column. Inside it the three buttons are flex items that wrap — beside one
another where the width allows, stacked where it does not — which is exactly what
`.chatpresets-set` does within a preset part.

It is not a tab part: it belongs to no tab and must be visible whichever tab is selected, so it is
not registered with `TabbedPanels`. It is a sibling of the parts, which is what the requirement
asks for.

It sits in the area the presets vacate and takes part in the drop order there — see the decisions
recorded below. Since only one of the two ever occupies that area, the placement machinery has to
measure the area's current occupant rather than a fixed element.

### 2b. The element wears no class from another stylesheet

It briefly wore `btn-controls after` to inherit the button styling, and that turned out to be a
bad trade: `div.btn-controls.after` in `site.css` is specificity (0,2,1) and carries
`grid-area: game-controls`, which threw the element clean out of the merged column — measured at
x=1731 — and `flex-flow: column nowrap`, which is precisely the stacking these buttons must not be
fixed in. Both had to be out-ranked with a four-class selector.

The styling those classes provided is six declarations. Restating them here is cheaper than
owning that argument, and it means this page's layout does not depend on the internals of a rule
written for a different page. `site.css` is not modified either way — the choice is only about
which file this element takes its rules from.

One deliberate difference: buttons are `flex: 1 1 auto` rather than `site.css`'s `flex: 1`, so
each keeps the width of its own text instead of being forced to an equal share. That is what lets
two sit together and the third wrap in portrait.

### 3. The presets are suppressed by the same test as everything else

`round.ts` already decides whether to build them at all, from `twoBoardSeats(...).isSpectator()`.
Game-over is different in kind: a spectator is known before the page renders, whereas a result can
arrive at any moment, so this cannot be a construction-time decision. It has to be applied when
the result arrives as well as on load.

The controller already learns of a result in one place and already calls
`renderGameOverControls()` there, so that is where the presets are hidden.

### 4. `isGameOver()` is `status >= 0`, and the `> 0` site is left alone

The name goes on the common test. The one site that reads `this.status > 0` — the "Game over. All
messages visible to all." notice — is asking whether the game finished **with a result**, since
`0` is ABORTED. Folding it in would start showing that notice on aborted games.

**Changed while implementing:** that site got the name after all — `hasResult()`. The argument
against was that one caller does not earn a predicate, and that is usually right. It loses here
because the whole point of this item was that the distinction is invisible: a bare `> 0` sitting
among seven `>= 0` tests reads like an inconsistency, and the obvious tidy-up is to "fix" it,
which would start announcing the end of chat secrecy on aborted games. A name is what stops that
edit from looking correct. Both predicates say in their comment that the difference is the abort.

## Risks / Trade-offs

- **Hiding a control rather than removing its cause** → the handle still exists in the DOM and
  still carries its listeners in short landscape; only its box is gone. Acceptable because a
  `display: none` element receives no pointer events, but it means the real asymmetry — a mode
  that ignores zoom — is recorded in a comment rather than removed.
- **The end-of-game controls appear exactly when the presets vanish** → the two changes interact,
  and testing one without the other gives a misleading picture of the space available. They should
  be verified together, on the same live game, at the moment the result arrives.
- **A result arriving mid-layout** → the parts' heights change at that moment, and
  `toolsPlacement` recomputes from a `ResizeObserver`. Presets disappearing frees height, which
  may drop a part in the same instant the buttons appear. That is correct behaviour but it is a
  visible rearrangement at an emotionally loaded moment, and is worth looking at rather than only
  measuring.
- **`finishedGame` and `isGameOver()` will coexist** → two ways to ask one question, which is what
  this item set out to reduce. Naming the test is still an improvement, but the duplication should
  be stated in the code rather than quietly left.

## Migration Plan

1. `isGameOver()` first: pure refactor, no behaviour change, and it gives the other items their
   test. Verify by gates alone.
2. The resize handle: one CSS rule, independently verifiable in short landscape.
3. Hide the presets on game over, and move the end-of-game controls, together — they share the
   space and the moment.

## Decisions taken with Nikolay — 2026-08-16

**The end-of-game controls take the space the presets vacate.** They occupy the presets' place
between the chat and the tab bar, and they join the drop order there, so they move under a
shrunken board exactly as the presets did. Because the presets are hidden at the same instant,
the swap is one for one and nothing else in the column shifts.

That settles the design's first open question — they do take part in the drop order — and it
means the placement machinery needs the area's occupant, not a fixed element: `toolsPlacement`
measures whichever of the two is currently shown, since only ever one is.

**Draw and Resign disappear, and their strip keeps its height.** The tab list must not move at
the moment the game ends. This is closest to today, where the controls are replaced rather than
removed, so the row has always kept its size.

**The freed space closes up.** The rows collapse and the chat grows by what the presets held,
which is what the chat already does — it takes whatever the other parts leave. Nothing is held
open.
## Open Questions

- Whether the `> 0` site deserves a name of its own (`hasResult()`) or stays an explicit
  comparison with a comment. One caller does not obviously earn a predicate.
- What the rearrangement looks like at the instant a result arrives, when the presets vanish and
  the buttons appear in the same frame and a part may drop as height is freed. Measurable, but
  the judgement is visual.
