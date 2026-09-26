## Why

`tests/layout_matrix` started as an instrument inside `what-zone-a-is-for` and outgrew it. It is now
the thing that says whether a layout change is safe: **286 rows — 30 viewports x 4 cases x zoom
variants — screenshotted, probed and diffed against a stored baseline**, with per-row notes and an
accepted flag so a fix is reviewed rather than believed.

It replaced an earlier practice rather than supplementing it. The original work was done by hand on
about twelve viewports in the four-window harness, playing a real game in tiled windows. The bed
covers those twelve and 274 more, in four page states, without a game or a human. The four-window
harness is still the right tool for a problem you already know about; the bed is the one that finds
problems nobody was looking for.

**IT IS GOOD ENOUGH TO BE THE STANDARD, AND IT IS NOT FINISHED.** Those are not in tension, and this
change exists to hold both at once. The trajectory through September is the argument: 127 failing
rows, then 122, 120, 112, 99, 95, 40, and **3 today** at fork master `6a7902531` — with five of its
own checks found wrong and corrected, removed or demoted along the way. A bed that catches its own
false positives is one you can put in front of a change.

## What Changes

**The bed becomes the standard way a two-board layout change is validated**, and this change is its
permanent home. Anything about the instrument goes here rather than into whatever layout change
happened to notice it.

**THIS CHANGE IS NOT MEANT TO BE FINISHED.** It is expected to stay open, gain items, and have
**partial deltas synced out** as requirements settle — `openspec sync-specs` rather than
`openspec archive`. Closing it would recreate the problem it exists to solve: an instrument whose
improvements have nowhere to live end up recorded in the commit message of an unrelated layout fix,
which is how `what-zone-a-is-for` came to carry three jobs.

Known open items are in `tasks.md`. The ones that matter today:

- A per-row `ok` flag that disagrees with that row's own `failures` array.
- No row reaches the analysis page's `tools-below` home without `drop-tools2`, which is why a
  `zoneB2` collision in the stylesheet can be neither confirmed nor dismissed.
- Convergence is not asserted — a settled page and a converged page are different things, and
  `idempotent-layout-pass` needs the bed to tell them apart.
- The accept workflow (`notes.json`) is a file people edit by hand.

## Capabilities

### New Capabilities

- `bughouse-layout-matrix` — what the bed guarantees, what a row means, what an accepted row means,
  and what a change is obliged to do with it. A capability already exists under this name from the
  bed's first version; this change takes ownership of it rather than leaving it stranded in an
  archived change.

## Impact

- `tests/layout_matrix/` — `driver.py`, `probe.js`, `viewports.py`, `report.py`, `baseline.json`,
  `notes.json`.
- No production code. A bed finding about the APP is a finding for a layout change, not for this one.
- Related: `idempotent-layout-pass` needs convergence checks from here; `further-round-analysis-unification`
  and every future layout change use the bed as their verification step.

## What this change is NOT

- **Not a place for layout defects the bed finds.** A failing row is evidence for whichever change
  owns that part of the page. Only the bed's own behaviour belongs here.
- **Not a rewrite.** The instrument works. Items here are improvements to something trusted, and a
  change that would invalidate the baseline needs saying so out loud.
