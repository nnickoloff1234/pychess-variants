## Why

A board's file labels hang 16px below it, straight onto the pocket strip beneath. That is deliberate
today — a requirement says they paint above the pocket and stay transparent to input — but it is a
concession made when there was nowhere else to put them, and on desktop there usually is somewhere:
below full zoom the app has room to spare that nothing currently claims. Measured at 1914x827, the
height left over after the stack is 6.96px at full zoom, 66.96 at 91%, 156.96 at 80% and 306.96 at
60%. The labels want 16 of it.

So the room exists exactly when the boards are small enough to leave it, which is also when the
labels are hardest to read. Nothing spends it: `--bug-coord-gap` is declared with `@property`, set
once in the tall-landscape block, and **read by nothing**. Its comment says `seatNamePlacement`
holds the height back through a `reservedGap` — that identifier does not exist in that file, or
anywhere. The mechanism was designed, described in three separate comments, and lost in a
restructure; what is left is a variable and a story about it.

The second half follows from the first. Coordinates move inside the squares in portrait and short
landscape, and the rule that decides this is a media query naming those two modes — the layout is
asked what it is called rather than whether it has room. Once a gap exists that shrinks to nothing on
its own, "there is no room for the labels outside" becomes a thing the layout can be asked directly,
and the two mobile modes stop being a list to maintain: they have no spare height by construction,
their stacks being exactly ten squares, so they answer "no room" without being named.

## What Changes

- **A gap below each board, sized by what is actually free.** It grows to at most the labels'
  overhang and shrinks gradually to zero as the boards grow, so the strip is pushed clear of the
  labels whenever the height allows and nothing moves when it does not.

- **At full zoom the desktop layout is unchanged.** The leftover there is the quantisation
  remainder — 6.96px of a 767px app — which is less than the labels need, so the gap is small or
  absent and the page looks as it does today.

- **The coordinate mode follows the room, not the mode name.** Where the gap cannot reach the size
  the labels need, coordinates are drawn inside the squares instead. Portrait and short landscape
  satisfy that test by construction rather than by being listed, so the media query naming them goes
  away.

- **The leftover is apportioned in one direction only.** The gap and a username's own line both want
  the same spare height. The gap is settled first, from published sizes, and the name decision then
  sees what is left — so nothing that depends on the name can change the gap. Two claims on one
  budget, each measuring the other, is the loop shape this codebase does not allow.

- **`--bug-coord-gap` stops being a variable nothing reads** — either wired to the mechanism its
  comments describe, or deleted with them.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: one requirement is added — **A board is given room for its labels when
  there is room to give**, which is the gap itself: its size, its continuity, its floor and the rule
  that its inputs may not depend on it. Three existing requirements change. **File labels overhang the strip and stay
  transparent to input** becomes conditional — the overhang is what happens when there is no room,
  not what always happens. **Coordinates may be drawn inside the squares** is re-gated on available
  room rather than on a named list of modes, which also removes its clause reserving external labels
  to desktop. **The round page reserves no space it does not use** gains the converse: space that is
  free SHALL be spent on the labels before it is spent on anything optional.

## Impact

- `static/bughouse.css` — the gap itself; the media query listing the two mobile modes around the
  internal-coordinate block; the `--bug-coord-gap` declaration and the three stale comments that
  describe a mechanism that is not there.
- `client/two-board/round/seatNamePlacement.ts` — the name decision must take the gap as already
  spent, which is the `reservedGap` its comment already claims exists.
- `client/two-board/squareUnit.ts` — only if the gap is computed rather than expressed in CSS; the
  inputs it would need (the app height and the unit) are already published from there.
- No server change; frontend gates only.

## Out of scope

**Correction, recorded because it was in this proposal as a finding.** This originally claimed the
bottom seat strip runs 33.66px past the fold at full zoom, from `seatNamePlacement` granting a
username its own line without room. It does not. That reading was taken during a zoom sweep without
waiting for the ResizeObserver that re-decides the name line, so it caught a transient mid-decision.
Measured in steady state at every zoom from 40% to 100%, the document overflow is zero and the stack
always fits the app. There is no such defect and nothing here needs to guard against one.
