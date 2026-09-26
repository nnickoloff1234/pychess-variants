## 0. Status

**Carried out of `what-zone-a-is-for` on 2026-09-26**, which is archived. That change answered the
questions it could and fixed what asking them turned up; these are the ones it never reached. The
task numbers from there are given so the original wording can be found.

**DECIDE BEFORE IMPLEMENTING.** Section 1 is decisions and nothing in section 2 may start until the
decision it depends on has an answer. Several are Nikolay's to make rather than derivable — they
trade board size against tool usability, and there is no measurement that settles a trade.

## 1. Decide

- [ ] 1.1 (was 2.1) **One rule or two?** Zone A has a different cause in each mode that has it: a
      reader's zoom in tall landscape, width pressure in short landscape. Decide whether one rule
      covers both or each gets its own, and say which in the delta.

      **RESTATED:** the original said three modes. Portrait is no longer one of them — it widens a
      part's own slot rather than placing it in a named zone, so it has no zone A to reason about.
- [ ] 1.2 (was 2.3) **Zone A over zone B in general, or only for parts that gain nothing from the
      extra width?** The move list is the case: both boards' width in zone B against one board's
      column in zone A. Decides 1.7 as well.
- [ ] 1.3 (was 2.4) **Where does a collapsed zone A's height go** — to the boards, or to zone B?
- [ ] 1.4 (was 2.8) **Does `beside` still beat `below` where `below` costs no board?** With room for
      zone B the tools could go there with both boards full size; the cascade shrinks the partner
      board to keep the column instead. "As big as possible" could equally prefer the home that
      costs no board at all.
- [ ] 1.5 (was 2.9) **Does width freed by a reader's zoom go back to the viewer's own board?** It
      goes to the tools today, by `toolsHome()`'s own reasoning. Together with the column gap for a
      zero-width tools track that was 52.7px of empty margin at 701x829. Two questions, one answer.
- [ ] 1.6 (was 2.6) **Does the zoom floor stay at four squares?** `MIN_STACK_IN_LEFT_SQUARES = 4`,
      chosen 2026-09-05, now that the width floor is 50%. A reader zooming their own partner board
      down is an explicit choice rather than the layout deciding, so the two may legitimately
      differ — say so either way rather than leaving it to coincidence.
- [ ] 1.7 (was 3.6) **Does the move list stay in the narrow column when the others take the band?**
      Measured at 900x639: engine and controls in 411px of zone A, the move list in the 115px the
      boards allowed — the part that most wants width, left with least. It cannot leave row 1: zone
      A grows upwards and row 1 is the row no template takes. So the answer may be "yes, and the
      band should not have been offered to the others either".

## 1b. Zone A on a device held upright

Moved from `portrait-tools-arrangement` on 2026-09-26. A tablet held upright is a TALL-LANDSCAPE
page by design — the cut-off is 9/16 so that portrait means phones — so these are zone A questions
in this change's own mode, not portrait ones.

- [ ] 1b.1 **Why does the live page leave the band under the smaller partner board unused?**
      Nikolay, 2026-09-26: the band under the right board is zone A and can host parts whenever
      that board is smaller than the left one; it is only nothing when the two are the same size.

      **MEASURED, AND IT CONTRADICTS AN EARLIER CLAIM IN THIS PROJECT.** A note in
      `portrait-tools-arrangement` said zone A was "collapsed to height 0 on all six upright
      tablets". That was read off the `C1` rows alone. Across all 72 upright-tablet rows, **24 have
      a non-zero, OCCUPIED zone A** — every `C3` row, at `zoneA2` 136px tall: T1 248x136, T5
      328x136, T6 252x136, with the partner board smaller than the viewer's in each (248 against
      488, 328 against 652, 252 against 512).

      So the band is real and reachable. What differs is the page STATE, not the board sizes: with
      the game over the preset panels are hidden and something takes zone A; with the game live
      they hold zone B and zone A goes to zero. **That asymmetry is the question** — the space
      under the smaller board exists in both states and is only used in one.
- [ ] 1b.2 **Should a preset panel take it while the game is live?** (was
      `portrait-tools-arrangement` 2.1, and before that `what-zone-a-is-for` 5.10 and 5.13, where
      it was phrased as "the presets take zone A, by the mechanism the analysis page has".)

      The price is visible. At T6 (800x1280) the tools all sit in zone B: chat 780x402, two preset
      panels 780x69 each, tab bar 780x40, with both boards 640 tall and about 60px spare in the
      viewport. Moving a panel beside the partner board — 252px wide, enough for five buttons at
      roughly 48px — frees its 69px of zone B.

      **AND THE ORIGINAL ARGUMENT FOR IT NO LONGER HOLDS**, which is why it needs deciding rather
      than doing: the note's reason was "so the chat gets the height", and the chat already has
      402px there and was itself described as nearly empty. If the freed height is worth anything
      it is worth it to the BOARDS, and that is a different trade to weigh.
- [ ] 1b.3 **Is the chat's share on an upright tablet a problem at all?** (was
      `portrait-tools-arrangement` 2.2.) It is the largest single consumer — 402px of 1280 at T6,
      278px at T5 — but the boards are 640 and 815 tall beside it and nothing overflows. This is
      what the archived "all the slack goes to the chat; a rule is needed" note was reaching for,
      asked of the right mode.

## 2. Implement, once decided

- [ ] 2.1 (was 3.1) Whatever section 1 selects, keeping `toolsHome()` a pure function of the
      viewport: a part COUNT may be an input, a measured height may not. This is the constraint that
      keeps the arrangement from depending on what it produced — see `idempotent-layout-pass`.
- [ ] 2.2 (was 3.2) Collapse the zone A row wherever nothing is placed in it, on both pages. This
      is the "a zone is occupied or it is not there" requirement made true in the remaining cases.
- [ ] 2.3 (was 3.5) Confirm the `beside` and `below` homes are untouched wherever the change is
      about zone A alone.

## 3. Verify

- [ ] 3.1 A matrix run per commit, diffed by ROW SET against the run before it — never by count.
      Baseline at the time of writing: 286 rows, 3 failing, at fork master `6a7902531`.
- [ ] 3.2 (was 4.4) Both modes that have a zone A, on both pages. A rule per mode has to be seen in
      each.
- [ ] 3.3 (was 4.5) Sweep the zoom across its range on the round page and confirm no arrangement
      oscillates. A fit test is a new input to a decision that changes what it measures, which is
      the shape the capability forbids — and `idempotent-layout-pass` has already measured one
      period-2 cycle on the analysis page.
- [ ] 3.4 Frontend gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`.

## 4. Dropped on the way in, and why

Struck from `what-zone-a-is-for` rather than carried here. Recorded so nobody re-derives them.

- **(was 2.7) Whether `TOOLS_MIN_SQUARES` stays at 2** — the constant does not exist. It is
  `TOOLS_MIN_WIDTH_PX` plus `TOOLS_MIN_ROWS = 3`. The underlying trade (how much partner board is
  spent on the tools column) survives inside 1.4 and 1.6; the question as phrased does not.
- **(was 3.7) The zone A HOME places the whole panel with no fit test** — the `tools-zonea` home
  was deleted in `5be122386`. There is no home to fit-test. What remains of its subject is 1.4.
- **(was 9.1) Zone A's room is measured by a side-by-side formula** — fixed in
  `unify-two-board-app-grid` by `3e9173a9f`: the budget is `toolsRegionHeight − partnerStackHeight`
  and asks nothing about the mode.
