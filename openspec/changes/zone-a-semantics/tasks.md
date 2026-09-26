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
