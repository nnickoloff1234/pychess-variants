## 1. Make the failures reachable from the survey

- [ ] 1.1 Add a convergence check to `probe.js` / `driver.py`: drive N passes on the unchanged
      viewport, record the published state after each, and fail the row when a state returns after
      one or more intermediate states. Name the distinct states of the orbit in the finding.
- [ ] 1.2 Keep the stale-until-nudged finding distinct from the cycle finding, so a lag is never
      reported as an oscillation or the reverse.
- [ ] 1.3 Add the oscillating shape to the matrix: analysis page, 904x686, board A at ~72.375 and
      board B at ~99.5 — stated values, not a sweep, since the band is off the slider's step grid
      and needs both boards off their extremes. Confirm the row FAILS before any fix.
- [x] 1.4 The lagging transition — the phone viewport entered directly from the last-resort
      viewport — is walked by the matrix's own order today and was fixed in `ca2019af9`. Keep a
      declared row for it so it does not depend on walk order remaining what it is.
- [ ] 1.4a Add the "reads what it does not observe" check implied by that fix: for each module
      that arranges, assert the elements it measures are a subset of the elements it observes.
      This is checkable from the code rather than from a rendered page, so it may belong in a
      unit test rather than in the survey.
- [ ] 1.5 Add the undeclared-area check: for every tracked part, assert the area its computed
      `grid-area` names appears in the computed `grid-template-areas`. Run it against the commit
      before `790702ed8` and confirm it catches the analysis page's missing template, which was
      found by hand rather than by the survey.
- [ ] 1.6 Record the pre-fix run as the baseline the later diffs are read against.

## 2. Review the area templates before mapping how they switch

Done first on purpose: reducing the set of templates is cheaper than mapping the switching of a
set that turns out to be redundant.

- [ ] 2.1 Inventory every `--bug-zones-*` template and every rule that selects one, per page and
      per mode. Record which class combinations reach each, and which are reachable at all.
- [ ] 2.2 Identify templates that differ only in ways nothing depends on, and merge them.
- [ ] 2.3 Identify combinations that reach NO rule and fall back to a default — the defect fixed
      in `790702ed8` was one of those, and it was found by hand.
- [ ] 2.4 Record the surviving set as the vocabulary the rest of this change works against.

## 3. Stop reading the resolved grid template

- [ ] 3.1 Fix the `NaN` first, on its own commit — it is a defect regardless of the rest. Guard
      `zoneA` as `regionHeight` is guarded, and replace the whole-budget fallback with a region
      the tools could genuinely have. Re-run the reproduction and record whether the cycle
      survives.
- [ ] 3.2 Decide what the regions are derived from once `gridTemplateColumns` / `gridTemplateRows`
      are off limits — the declared track definitions, or arithmetic from squareUnit's published
      squares and budget. Settle the open question in `design.md` and record which and why.
- [ ] 3.3 Derive `stripWidth`, `zoneAWidth`, `regionHeight` and `zoneA` that way, so no region the
      cascade measures against is a projection of the cascade's own last answer.
- [ ] 3.4 The preset button size then follows from regions that no longer move; confirm it is
      stable across a drop.
- [ ] 3.5 Confirm the WCAG tap-target floor still binds on touch rows, and that the arrangement —
      not the button — gives way when the floor cannot be met.
- [ ] 3.6 Full survey. Diff every row's home, drops and published sizes against 1.6; account for
      each difference before continuing.

## 4. Make the cascade compare declarations

- [ ] 4.1 Inventory every droppable part on both pages and give each an honest
      `--bug-part-min-w` / `--bug-part-min-h`. Only the engine panel and the analysis controls
      panel declare anything today; everything else resolves to 0, so this must come FIRST or
      every undeclared part becomes free and drops always.
- [ ] 4.2 Decide, per part, what it does when handed its declared minimum and its content
      wants more — scroll, clip or compress — and state it in the component's own stylesheet.
- [ ] 4.3 Replace `const need = Math.max(height, min.height)` with the declaration alone, so
      no measured box reaches a placement decision.
- [ ] 4.4 Full survey and diff, as 3.6. Expect rows to move here: this is the one step that
      changes what the cascade believes a part costs.

## 5. Clear what a pass cannot compute

- [ ] 5.1 Assign `strip-in-zoneb` on every pass, including in modes with no zone B.
- [ ] 5.2 Sweep the other classes the pass owns for the same fault — a class set in one branch and
      never cleared in another — and fix any found.
- [ ] 5.3 Confirm the class state at a viewport is identical whether reached by resize from any
      other viewport or by direct load.

## 6. Prove the invariant

- [ ] 6.1 Both reproductions pass: no cycle at the analysis shape, no lag at the phone viewport.
- [ ] 6.2 The orbit test used during the investigation reports zero revisits and zero lags across
      every viewport, on both tabs, at every zoom in the matrix.
- [ ] 6.3 The survey's failing set is the pre-change set less the three `P1` rows, with nothing
      newly failing.
- [ ] 6.4 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`; Python gates for the
      harness changes.

## 7. Write down what the invariant is

- [ ] 7.1 State the invariant at the top of `toolsPlacement.ts` — what a pass may read, what it may
      not, and why there is no loop and no bookkeeping — so the next edge added is recognised as
      one.
- [ ] 7.2 Record in the matrix docs that a settled page is not a converged page, and that the
      convergence check is what tells them apart.

## 8. Map the dependencies between components

The larger half of this change, and the reason it is a programme rather than a fix. Two
oscillations have been found by hand, both the same shape; neither was found by the survey.

- [ ] 8.1 For every component in a two-board layout, record which of its sizes the placement logic
      uses: real, current, declared minimum, or a published unit.
- [ ] 8.2 For every component, record what determines its actual drawn size — its own content, its
      container, or a published unit — and flag every case of content-sized content inside a
      content-sized container, which is the shape both known oscillations took.
- [ ] 8.3 For every component, record what it can change: another component's size, a published
      custom property, or the grid template in force. Name what carries each edge.
- [ ] 8.4 Write the map up as a document that can be checked against the code, not as prose.
- [ ] 8.5 From the map, state a rule per component, and mark any component whose behaviour the
      rule cannot express as needing a decision rather than a description.

## 9. Two defects recorded but not understood

Both were found while measuring the oscillation. They are listed separately because neither is
understood yet, and both are expected to be answered by the review rather than before it.

- [ ] 9.1 The unguarded `NaN`. `toolsRegionHeight()` returns `NaN` when the template in force has
      no row naming a tools slot, or when its row count disagrees with `gridTemplateRows`. Of its
      two consumers only `regionHeight` tests for it; `zoneA` is `Math.max(0, NaN - h)`, which is
      `NaN`, so every zone A comparison silently answers false. Open questions: when can the row
      counts legitimately disagree, what should the function return instead, and is the
      whole-budget fallback ever right?
- [ ] 9.2 `strip-in-zoneb` survives a resize into portrait. It is toggled inside
      `if (hasZoneB && !tools-beside)`; portrait declares no zone B, so the branch is skipped and
      the class persists. Arriving at the same portrait viewport from `T1` keeps it and from `L1`
      or `D1` does not. Nothing is visibly wrong because its rules sit inside the landscape media
      query. Open question: is clearing it enough, or is a class that only one mode can compute a
      sign the class is in the wrong place?

## 10. Idea, not yet a task: a component harness

Recorded so it is not lost. NOT to be started before the map exists — it is a bigger build than it
looks and the map may change what it should show.

- [ ] 10.1 Sketch a harness that renders each component in isolation at a range of widths and
      heights, so what a component does at its declared minimum can be seen without a whole page
      around it.
- [ ] 10.2 Sketch a visualisation of every area template a page supports, and an enumeration of
      the arrangements reachable on each page, so a combination with no rule — the defect fixed in
      `790702ed8` — is visible rather than inferred.
- [ ] 10.3 Decide whether this is one harness or two, and whether it replaces or complements the
      layout matrix.
