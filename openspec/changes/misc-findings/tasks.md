## 0. Status

**Opened 2026-09-26 as a holding pen.** Every item below is measured and none is scheduled. The
work is deciding where each belongs, not fixing it here — a finding that gets adopted by another
change should be struck from this list with a pointer, and one that turns out to be nothing should
be struck with the reason.

**This change is finished when the list is empty**, whatever emptied it. It is not a backlog to
grow: a new finding gets appended only if it is genuinely unowned, and anything with an obvious
home goes straight there instead.

## 1. The draw offer tells the offerer nothing

- [ ] 1.1 Check the PARTNER's view first, because it may change what the finding is. A bughouse
      draw is a team offer (`bughouse-team-offers`); if the offerer's partner is prompted to
      confirm, the offerer's own silence may be deliberate rather than missing. Not measured on
      2026-09-26 — only the offerer and one opponent were read.
- [ ] 1.2 Decide whether `round.ts`'s comment describes an intent that was never carried out, or a
      behaviour that was lost with `.bug-offer-dialog`. The wording — "a look on the control that
      made it" — reads as the former, and the look is measurably on the control that did not.
- [ ] 1.3 Then either give it a change of its own (offerer feedback, and something to cancel with)
      or correct the comment to describe what the page actually does. **Do not leave both.**

## 2. No re-cascade when the game ends

- [ ] 2.1 Settle the cheap question: does `place()` run at all on the game-over swap? Instrument it
      and end a game. If it runs and reaches the same answer, this is closed as not a defect and
      the measurement is worth keeping.
- [ ] 2.2 If it does NOT run, that is `idempotent-layout-pass`'s subject — it owns what a pass may
      read and when one runs. Move it there with the 2026-09-26 numbers rather than restating them.

## 3. The zoneA tools home removal is recorded nowhere — DONE 2026-09-26

- [x] 3.1 Recorded in `zone-a-semantics`, which inherited zone A's subject when
      `what-zone-a-is-for` was archived. It is in that change's proposal, under the ground that
      moved beneath the questions it carries.
- [x] 3.2 Re-read the 43 open tasks against it, and two were moot because of it: 3.7 (the zone A
      HOME places the whole panel with no fit test — there is no such home) and 2.7 (whether
      `TOOLS_MIN_SQUARES` stays at 2 — the constant went in the same period). Both struck with the
      reason rather than carried into a successor.
- [x] 3.3 Section struck. It was a transcription task and the transcription is done.

## 4. The zoneB2 collision

- [ ] 4.1 Determine whether the cascade GUARANTEES `drop-tools2` in the analysis page's
      `tools-below` home, or whether it merely happens to hold for the 30 viewports the matrix
      walks. Reading `place()` should answer it without a browser.
- [ ] 4.2 If it is guaranteed, say so in the stylesheet beside both rules and close this. A rule
      that is safe by a coincidence nobody wrote down is the shape of `rightcol` and of the
      `df988e68b` phantom band — the coincidence is not the problem, the silence about it is.
- [ ] 4.3 If it is not guaranteed, add the matrix row that reaches it — analysis, landscape,
      `tools-below`, without `drop-tools2` — and let the bed report the overlap. That row does not
      exist today, which is why the collision is unproven rather than confirmed.

## 5. Draw and resign sizing

- [ ] 5.1 Decide whether the draw and resign controls should follow the tablist buttons' size in all
      cases, as Nikolay asked. The wrapping that prompted it is already fixed; what is missing is
      the rule, so the two can drift apart again silently.
- [ ] 5.2 If yes, give the bed a check for it — the four short-landscape `C2` rows are accepted now,
      so a regression here would pass. A rule with no check is how this note came to be a year old.

## 6. Not in this change

Pointers, carrying no checkbox on purpose.

- **`P5-C4-100x100`** — the third of the matrix's three failing rows, analysis page in portrait,
  partner stack painting 4px outside itself (box 132x165, painted 132x172). Unowned like the four
  above, but it is a live failing row rather than a finding, so it belongs to whoever next works
  the matrix rather than to a holding pen. Recorded here only so it is not mistaken for accounted
  for.
- **The matrix bed's `ok` flag disagrees with its own `failures` array** on that same row: `ok`
  reads true with a non-empty failure list. The run summary counts by `failures`, so the headline
  number is right. A bed fix.
