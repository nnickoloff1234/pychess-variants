## Why

The two-board layout arranges itself by observing its own output. `toolsPlacement`'s
`ResizeObserver` watches the very parts whose size its decisions change, and the values it
publishes — `--bug-preset-btn`, the `drop-*` classes, `--bug-app-content-h` — come straight back
as inputs on the next pass. A pass is therefore not a function of the viewport: it is a function
of the viewport AND of what the previous pass happened to leave behind.

Two consequences are already measured, and they are the same defect at two gains.

**It does not converge.** On the analysis page at 904x686, driving the board A zoom slider down in
its native 1.15625 steps reaches a period-2 limit cycle at zoom 71.0938 that runs forever with no
further input:

```
X  regionHeight=626.00  stripWidth= 61.67  zoneA=NaN    btn= 9.93   engine panel to zone B
Y  regionHeight=514.57  stripWidth=150.77  zoneA=81.21  btn=27.75   engine panel to zone A
X  ...
```

The page pegs a core and draws boards over each other while it runs. Every input that differs
between the two states is read from the resolved grid template, and the `drop-*` classes each pass
writes are what rewrite it: the pass decides, the decision changes the template, and the next pass
reads the new template and decides the opposite. The engine panel is not undecided — it is being
asked two different questions in alternation.

**It settles on the wrong answer.** Arriving at the `P1` phone viewport (390x844) from `L1`
(820x640, the tools' last resort), the arrangement stops one pass short: `drop-tools4,drop-tools3`
with a 36.00px preset button, where the viewport implies `drop-tools4` with 31.98px. The
difference is 40.62px — the tab strip's own row, which is inside the region the preset size is
computed from, and which dropping the strip removes. Nothing re-triggers, because the drop
rearranges rows inside an app whose own size did not change. Three survey rows report it; arriving
at the same viewport from `D1` or `T1` gives the right answer, by luck, because unrelated passes
fire there.

A third symptom has the same shape: `strip-in-zoneb` is toggled inside a branch portrait never
enters, so it survives a resize into portrait and the final class state depends on which viewport
the reader came from.

Why now: the survey is otherwise clean enough that these are among the last ten failing rows, and
every one of the remaining problems is easier to judge on a layout that computes the same answer
twice.

## What Changes

- Establish one invariant for the layout pass: **a pass SHALL read nothing that a pass writes.**
  With it, a second pass on an unchanged viewport is a no-op by construction, extra passes are
  harmless whatever their order, and neither a limit cycle nor a one-pass lag can exist.
- Cut the feedback edges that break it today. The root one is that **`place()` reads the resolved
  grid template** — `gridTemplateRows` for the region's height, `gridTemplateColumns` for its
  width — and the `drop-*` classes it writes rewrite exactly those templates:
  - `stripWidth`, `zoneAWidth`, `regionHeight` and `zoneA` all come from the template and SHALL
    come from quantities the placement does not rewrite instead;
  - the preset button size follows from those widths, so it moves with them — sizing it "from the
    widths" is not sufficient while the widths are themselves outputs;
  - a part's cost is `heightOf()`, its height where it currently sits — it becomes the height the
    part would have in the region being considered;
  - the tab strip's height is measured wherever the strip currently is — same treatment.
- Fix two faults found while measuring the cycle, both of which give it its gain:
  - `toolsRegionHeight()` returns `NaN` when no row names a tools slot, and `zoneA` uses it
    unguarded — `Math.max(0, NaN)` is `NaN`, so every zone A comparison is silently false and a
    part is refused because the question could not be answered, not because it did not fit;
  - the one guarded consumer falls back to the whole app budget as "the tools' region" (626px
    against a true 514.57px in the measured cycle), which is not a conservative fallback.
- Clear `strip-in-zoneb` on every pass rather than only in the branch that sets it, so no class
  survives a mode change that cannot recompute it.
- Teach the layout matrix to detect non-convergence directly: run the arrangement forward N passes
  on an unchanged viewport and fail the row if the state ever revisits an earlier one. The existing
  stale-until-nudged check finds lag; it cannot see a cycle, because both of its probes sit inside
  the orbit.
- **No behaviour is being redesigned.** Every arrangement the layout chooses today for a settled
  viewport is the arrangement it must still choose; what changes is that it reaches it on the
  first pass rather than on the third or never.

## Capabilities

### New Capabilities
- `two-board-layout-convergence`: the arrangement pass is idempotent — what it reads, what it may
  not read, what a repeated pass must produce, and what the observers are therefore allowed to be.

### Modified Capabilities
- `bughouse-layout-matrix`: the survey gains a convergence check per row, and the two
  reproductions recorded above become rows it walks rather than facts in a commit message.

## Impact

- `client/two-board/common/toolsPlacement.ts` — `place()`, `publishPresetSize`, `presetFitAt`,
  `toolsRegionHeight/Width`, `heightOf`, the observer's target list.
- `client/two-board/squareUnit.ts` — only where the published home and budget are read back.
- `client/two-board/common/seatNamePlacement.ts` — its classes change stack heights that
  `toolsPlacement` reads; the ordering is in scope, the cycle is not believed to be.
- `tests/layout_matrix/` — `probe.js`, `driver.py`, `viewports.py` for the convergence check and
  the two reproduction rows.
- No server, database, or protocol surface is touched.
