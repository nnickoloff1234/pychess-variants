## Why

Five things are known, measured and owned by nobody. Each was found while doing something else,
each is recorded in a change that has since been archived or in no change at all, and none is
anybody's next task. **This is a holding pen so they stop being lost, not a plan to fix them.**

The pattern is the reason it exists. Three separate times in one week a decision lived only in a
commit message and had to be re-derived: `unify-two-board-app-grid` was opened for exactly that and
then had it happen to it twice more. A finding with no owner is the same failure one step earlier —
it is not even in a commit message, it is in a conversation.

**NOTHING HERE IS SCHEDULED, and some may turn out to be nothing.** What each needs is a
decision about where it belongs, which is cheaper to make than to re-derive the measurement.

## What Changes

Nothing in the code. Each finding either moves to the change that owns its subject, gets a change of
its own, or is deliberately closed as "not a defect" — all three are results.

## The findings

### 1. A player who offers a draw is told nothing

`client/two-board/round/round.ts` states the design: *"An offer is now a look on the control that
made it — the draw button turns green to be accepted, the rematch button is replaced in place by an
accept/decline pair — so there is nothing left for a strip to hold, and the row went with the
element."*

Measured 2026-09-26 on game `LwNKl7cM`. The offer was real and reached the server —
`{'type': 'draw', 'gameId': 'LwNKl7cM'}` in the log. The **recipient's** control became
`button#draw.draw-offered`, background `rgb(98, 153, 36)`, title "Offer draw" → "Accept draw". The
**offerer's own** control kept `title="Offer draw"` and an empty class list: no colour, no state, no
way to cancel, and nothing anywhere on the page saying an offer is outstanding.

So the comment describes a look on "the control that made it" and the look is on the control that
did not. Either the intent was never carried out, or the offerer's half went with `.bug-offer-dialog`
when that was deleted and nobody noticed because the remaining half is the one you see when testing
as the recipient.

**Not measured, and it matters:** a bughouse draw is a TEAM offer (`bughouse-team-offers`). Whether
the offerer's PARTNER is shown anything was not checked, and the answer changes what "no feedback"
means — if the partner is prompted to confirm, the offerer's own silence may be deliberate.

### 2. The arrangement does not re-cascade when the game ends

Measured 2026-09-26 in three modes at once, by a recorder sampling every 120ms and keeping only the
rows where geometry changed. At the moment the game ended:

- both preset panels collapsed from 54 / 119 / 81px to **0**
- the gameover block filled and became **128px** tall in every mode
- the tab bar moved and shrank, 40 → 32 in both landscape modes and 40 → 28 in portrait
- **the drop classes were identical before and after, in all three windows**

Content heights moved by up to 119px and the arrangement did not change. Nothing was wrong on
screen and nothing overflowed, so this is a question rather than a defect: either the cascade ran
and reached the same answer, or nothing re-triggered it. `toolsPlacement` observes the stack and
every droppable part, so it ought to have fired — but "ought to" is what the ordering traps in this
codebase have repeatedly turned out not to mean.

It is cheap to settle: assert whether `place()` runs on the game-over swap at all.

### 3. `5be122386` removed a whole tools home and is recorded nowhere — RESOLVED 2026-09-26

**Struck while archiving `what-zone-a-is-for`.** The commit is now recorded in `zone-a-semantics`,
which inherited zone A's subject, and its consequences were applied to that change's task list:
task 3.7 (the zone A home places the whole panel with no fit test) was struck outright because the
home no longer exists, and 2.7 with it. Kept here for the record of what it was.

Landed 2026-09-21, in no change then or now. It deleted the `zoneA` tools home — the fallback
between `below` and the last resort, which shrank the partner board to seven tenths of the viewer's
and put the WHOLE tools panel in the band that freed under it. Seven survey rows used it; all seven
now go to the last resort.

The argument for removing it, from the commit: it was the only home in which the partner board's
size was DECIDED rather than followed — a board shrunk to make room for a panel — and the band it
had to fill was what a board shrunk by three tenths gives back, under a board that is already the
smaller of the two.

What went with it: the analysis page's band order and zone B swap, both strip slots, the shared
tabpanel rule, the round page's four placements, and the home's name out of three selector lists.
In `place()`, the whole `inBand` fork — **the only direction in which a fragment moved DOWN into
zone B from a placed home**, so the region a part is offered no longer depends on which home asked.
`drop-tools2-b` now has no rule at all rather than one scoped to that home.

`what-zone-a-is-for` carried 43 open tasks about zone A and mentioned none of this. Two of them
turned out to be moot because of it, which is exactly the cost of leaving a commit unrecorded.

### 4. A `zoneB2` collision on the analysis page that never fires

Two rules assign the same named area to two different elements:

```
layout/landscape.css:79   .analysis-app.bug.tools-below .bug-tool-group > .analysis-controls-panel { grid-area: zoneB2 }
layout/landscape.css:93   .analysis-app.bug.tools-below .bug-parts > [role='tablist']              { grid-area: zoneB2 }
```

A named grid area is one rectangle holding one item, so if both are placed they overlap.

**It does not fire in the 286-row matrix.** All 12 landscape analysis rows in the `tools-below` home
also carry `drop-tools2`, which moves the controls panel to `zoneA3` and leaves `zoneB2` to the tab
list. The only row in that home without `drop-tools2` is `P5-C4-100x100`, and it is portrait, where
rule :93 does not apply — it sits inside `@media (aspect-ratio > 9/16)`.

So the rules are safe by a coincidence nobody wrote down, which is the shape of `rightcol` (a claim
outliving its template) and of `df988e68b` (a class the stylesheet declined while the cascade
believed it had landed). Whether the cascade GUARANTEES `drop-tools2` in that home, or it is merely
true of these 30 viewports, is unproven — and proving it needs a matrix row that does not exist.

### 5. Draw and resign are sized unlike the tabs they share a row with

Nikolay's note, on the four short-landscape `C2` rows: *"there is enough space for the draw and
resign button to fit in the tablist row if they were slightly smaller ... they should probably
follow similar size as the tablist buttons in all cases, which would allow them to stay on same row
more often than not."*

The wrapping he saw is gone — the track was given the width it was short of — but **the sizing rule
he asked for was never written, and the survey has no check for it**, so nothing would notice if the
two drifted apart again. It sat in `what-zone-a-is-for` because that is where the note was taken;
that change is archived and this is not its subject, so it comes here rather than disappearing.

Small, and the only one of the five with a named person waiting on it.

## Capabilities

None. These are findings about existing behaviour; whichever of them turns out to be real will name
its own capability in its own change.

## Impact

- No code, unless a finding is adopted and fixed elsewhere.
- Finding 3 is resolved; it changed `zone-a-semantics`'s task list and no code.
- Finding 4 would need a new row in `tests/layout_matrix` before it can be settled either way.
