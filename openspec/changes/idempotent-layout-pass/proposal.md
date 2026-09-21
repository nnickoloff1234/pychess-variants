## Why

The two-board layout arranges itself by observing its own output. `toolsPlacement`'s
`ResizeObserver` watches the very parts whose size its decisions change, and the values it
publishes — `--bug-preset-btn`, the `drop-*` classes, `--bug-app-content-h` — come straight back
as inputs on the next pass. A pass is therefore not a function of the viewport: it is a function
of the viewport AND of what the previous pass happened to leave behind.

Two consequences are already measured, and they are the same defect at two gains.

**It does not converge.** On the analysis page at 904x686, with board A near 72.4 and board B near
99.5, the arrangement enters a period-2 limit cycle that runs forever with no further input:

```
X  regionHeight=626.00  stripWidth= 61.67  zoneA=NaN    btn= 9.93   engine panel to zone B
Y  regionHeight=514.57  stripWidth=150.77  zoneA=81.21  btn=27.75   engine panel to zone A
X  ...
```

The page pegs a core and draws boards over each other while it runs.

The band is narrow and does not sit on the slider's 1.15625 step grid, and it needs BOTH boards off
their extremes — a sweep of board A alone, on-grid, with board B pinned at 100, steps over it. It
was found by hand on the sliders, and the matrix row that walks it has to use the values above
rather than a sweep. Every input that differs
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
- **The primary cut: the cascade compares DECLARATIONS, never MEASUREMENTS.** A part states what
  it needs, in CSS, as a constant; the cascade compares that against a region and never asks the
  part how tall it happens to be right now. This is what actually kills the class of defect. The
  mechanism already exists and is already overridden — the engine panel declares
  `--bug-part-min-w: 19ch; --bug-part-min-h: 3.2em`, and `const need = Math.max(height,
  min.height)` makes the measurement win every time (90px in the tools column, 134px in the
  implicit track, against a declared 45). Had the declaration decided, the measured oscillation
  could not have formed: 45px fits the 81.21px band in both phases, so the decision is a constant
  and the second pass writes nothing.
- Cut the remaining feedback edge: **`place()` reads the resolved grid template** —
  `gridTemplateRows` for a region's height, `gridTemplateColumns` for its width — and the `drop-*`
  classes it writes are what select that template. `stripWidth`, `zoneAWidth`, `regionHeight` and
  `zoneA` all come from it and SHALL come from quantities the placement does not rewrite.
- Give every droppable part an honest declaration, because today only two selectors have one — the
  engine panel and the analysis controls panel — and everything else resolves to `0` by design.
  Flipping to declaration-only before that inventory exists would make every undeclared part cost
  nothing, fit everywhere and drop always.
- Settle what a part does when it is given its declared minimum and its content wants more. Today
  the cascade promises a part its measured height, so nothing ever has to cope with being smaller.
- Fix two faults found while measuring the cycle, both of which give it its gain:
  - `toolsRegionHeight()` returns `NaN` when no row names a tools slot, and `zoneA` uses it
    unguarded — `Math.max(0, NaN)` is `NaN`, so every zone A comparison is silently false and a
    part is refused because the question could not be answered, not because it did not fit;
  - the one guarded consumer falls back to the whole app budget as "the tools' region" (626px
    against a true 514.57px in the measured cycle), which is not a conservative fallback.
- Clear `strip-in-zoneb` on every pass rather than only in the branch that sets it, so no class
  survives a mode change that cannot recompute it.
- Teach the layout matrix to report a part placed into an area its template does not declare. The
  browser reports nothing: the item goes into an implicit track, is drawn at whatever width that
  leaves, and every later measurement of the template is taken from a grid that grew a track nobody
  declared. This has now happened twice — diagnosed and fixed on the round page, then reached
  again on the analysis page, where it oscillated undetected until it was found by hand (fixed in
  `790702ed8`).
- Teach the layout matrix to detect non-convergence directly: run the arrangement forward N passes
  on an unchanged viewport and fail the row if the state ever revisits an earlier one. The existing
  stale-until-nudged check finds lag; it cannot see a cycle, because both of its probes sit inside
  the orbit.
- **Open a component-by-component review**, which is the larger half of this change and the reason
  it is scoped as one. For every component that takes part in a layout: which of its sizes the
  placement logic uses — real, current, minimum, declared — what determines its actual size,
  content or container, and how it can change the dimensions of another component or the area
  template in force. The output is a dependency map, and then a stated rule per component.
  The map is what turns "we fixed the oscillation we found" into "we know where the others are".
- **Review the declared area templates for redundancy first.** There are ten
  `grid-template-areas` selections in `layout/landscape.css` drawing on `--bug-zones-*`, and the
  survey walks a handful of combinations of them. Reducing the set before mapping how they switch
  saves the mapping work, and the analysis page's missing template — one page having a rule its
  twin did not — is itself evidence that the set is not held in one mind.
- Record two defects found while measuring, which are **not** understood yet and are listed so they
  are not lost: the unguarded `NaN` from `toolsRegionHeight()`, and `strip-in-zoneb` surviving a
  resize into portrait. Both are expected to be answered by the review rather than before it.
- **No behaviour is being redesigned.** Every arrangement the layout chooses today for a settled
  viewport is the arrangement it must still choose; what changes is that it reaches it on the
  first pass rather than on the third or never.

## Capabilities

### New Capabilities
- `two-board-layout-convergence`: the arrangement pass is idempotent — what it reads, what it may
  not read, what a repeated pass must produce, and what the observers are therefore allowed to be.
- `two-board-component-sizing`: what a component declares, what determines its actual size, what
  it may do to another component's size or to the template in force, and the dependency map that
  has to exist before any of that can be asserted.

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
- `static/two-boards/components/*.css` and `properties.css` — every droppable part needs a
  declared minimum, and today two selectors have one.
- `static/two-boards/layout/*.css` — the `--bug-zones-*` inventory and whatever the redundancy
  review removes.
- No server, database, or protocol surface is touched.

## Scope note

This is days of work, not one sitting, and it is deliberately scoped as a programme rather than a
fix. The measured oscillation is already fixed separately (`790702ed8`) by giving the analysis page
the template its twin had; nothing here is urgent in the sense that the page is broken today. What
is open is that the mechanism which produced it is intact, unmapped, and has produced the same
class of defect twice.
