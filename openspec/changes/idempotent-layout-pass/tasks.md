## 1. Make the failures reachable from the survey

- [ ] 1.1 Add a convergence check to `probe.js` / `driver.py`: drive N passes on the unchanged
      viewport, record the published state after each, and fail the row when a state returns after
      one or more intermediate states. Name the distinct states of the orbit in the finding.
- [ ] 1.2 Keep the stale-until-nudged finding distinct from the cycle finding, so a lag is never
      reported as an oscillation or the reverse.
- [ ] 1.3 Add the oscillating shape to the matrix: analysis page, 904x686, board A at ~72.375 and
      board B at ~99.5 — stated values, not a sweep, since the band is off the slider's step grid
      and needs both boards off their extremes. Confirm the row FAILS before any fix.
- [ ] 1.4 Add the lagging transition: the phone viewport entered directly from the last-resort
      viewport. Confirm it reproduces the existing `P1` finding as a declared row rather than as
      an accident of walk order.
- [ ] 1.5 Add the undeclared-area check: for every tracked part, assert the area its computed
      `grid-area` names appears in the computed `grid-template-areas`. Run it against the commit
      before `790702ed8` and confirm it catches the analysis page's missing template, which was
      found by hand rather than by the survey.
- [ ] 1.6 Record the pre-fix run as the baseline the later diffs are read against.

## 2. Stop reading the resolved grid template

- [ ] 2.1 Fix the `NaN` first, on its own commit — it is a defect regardless of the rest. Guard
      `zoneA` as `regionHeight` is guarded, and replace the whole-budget fallback with a region
      the tools could genuinely have. Re-run the reproduction and record whether the cycle
      survives.
- [ ] 2.2 Decide what the regions are derived from once `gridTemplateColumns` / `gridTemplateRows`
      are off limits — the declared track definitions, or arithmetic from squareUnit's published
      squares and budget. Settle the open question in `design.md` and record which and why.
- [ ] 2.3 Derive `stripWidth`, `zoneAWidth`, `regionHeight` and `zoneA` that way, so no region the
      cascade measures against is a projection of the cascade's own last answer.
- [ ] 2.4 The preset button size then follows from regions that no longer move; confirm it is
      stable across a drop.
- [ ] 2.5 Confirm the WCAG tap-target floor still binds on touch rows, and that the arrangement —
      not the button — gives way when the floor cannot be met.
- [ ] 2.6 Full survey. Diff every row's home, drops and published sizes against 1.5; account for
      each difference before continuing.

## 3. Cut the measured-in-place edges

- [ ] 3.1 Charge every droppable part the height it would have in the region being considered,
      extending what `droppedPanelHeight` already does for preset panels.
- [ ] 3.2 Charge the tab strip its own content height rather than the row it has been given, and
      remove the `align-self: start` reasoning's dependence on that being true by accident.
- [ ] 3.3 Take the tools region from the template as it stands with nothing dropped, so
      `toolsRegionHeight/Width` stops depending on the `drop-*` classes.
- [ ] 3.4 Full survey and diff, as 2.4.

## 4. Clear what a pass cannot compute

- [ ] 4.1 Assign `strip-in-zoneb` on every pass, including in modes with no zone B.
- [ ] 4.2 Sweep the other classes the pass owns for the same fault — a class set in one branch and
      never cleared in another — and fix any found.
- [ ] 4.3 Confirm the class state at a viewport is identical whether reached by resize from any
      other viewport or by direct load.

## 5. Prove the invariant

- [ ] 5.1 Both reproductions pass: no cycle at the analysis shape, no lag at the phone viewport.
- [ ] 5.2 The orbit test used during the investigation reports zero revisits and zero lags across
      every viewport, on both tabs, at every zoom in the matrix.
- [ ] 5.3 The survey's failing set is the pre-change set less the three `P1` rows, with nothing
      newly failing.
- [ ] 5.4 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`; Python gates for the
      harness changes.

## 6. Write down what the invariant is

- [ ] 6.1 State the invariant at the top of `toolsPlacement.ts` — what a pass may read, what it may
      not, and why there is no loop and no bookkeeping — so the next edge added is recognised as
      one.
- [ ] 6.2 Record in the matrix docs that a settled page is not a converged page, and that the
      convergence check is what tells them apart.
