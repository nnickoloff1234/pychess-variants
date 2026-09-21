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
drop-tools3-b   --bug-preset-btn 9.93px     engine panel in zone B
drop-tools3     --bug-preset-btn 27.75px    engine panel in zone A
drop-tools3-b   --bug-preset-btn 9.93px     ...
```

The page pegs a core and draws boards over each other while it runs.

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
- Cut the four feedback edges that break it today:
  - the preset button size is computed from a region height that the drops change — it becomes a
    function of the two widths alone, which is what `toolsPlacement.ts` already documents it as;
  - a part's cost is `heightOf()`, its height where it currently sits — it becomes the height the
    part would have in the region being considered;
  - the tab strip's height is measured wherever the strip currently is — same treatment;
  - the tools region is read from the resolved grid template, which the `drop-*` classes rewrite.
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
