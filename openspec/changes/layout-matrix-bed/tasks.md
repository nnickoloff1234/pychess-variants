## 0. How this change is used

**Standing, not finishable.** Items are added as the bed is used and struck as they land. When a
group of them settles into a rule, sync that requirement out (`openspec sync-specs`) and keep the
change open. Do not archive it to tidy the list: an empty list here means the instrument is
currently trusted, which is a state it passes through rather than arrives at.

**A failing ROW is not a task here.** It is evidence for whichever change owns that part of the
page. Only the bed's own behaviour belongs in this file.

## 1. Where it stands — 2026-09-26

Recorded so a later reader can tell drift from change. At fork master `6a7902531`, clean tree:

- **286 rows, 3 with a failing check, 207s.** `T6-landscape-C1-100x100` (partner stack over preset
  panel 1 in zoneA2, 25x6px), `P5-C3-100x100` (round-controls-panel paints 3px outside itself and
  over the tools bar), `P5-C4-100x100` (partner stack paints 4px outside itself).
- 30 viewports x 4 cases (`C1` round/live/Chat, `C2` round/live/Moves, `C3` round/over/Moves,
  `C4` analysis/Moves) x zoom variants. 238 tall-landscape rows, 24 short-landscape, 24 portrait.
- The trajectory it came down: 127 → 122 → 120 → 112 → 99 → 95 → 40 → 3.

```bash
env PYTHONPATH=server:tests uv run python -m layout_matrix --out <dir>
```

Self-contained: its own aiohttp app on a mongomock database with two cookie-seeded users, so two
runs are comparable. It does not drive the four-window docker harness and must not start to.

## 2. Correctness of the instrument itself

- [ ] 2.1 **A row's `ok` flag disagrees with its own `failures` array.** `P5-C4-100x100` reports
      `ok: true` with a non-empty failure list. The run summary counts by `failures`, so the
      headline number is right and the per-row flag is not — which is worse than either being
      wrong, because a reader checking one row believes it.
- [ ] 2.2 Audit every other place the bed reports a verdict twice, and leave ONE. A second opinion
      computed a second way is the same defect waiting to recur.
- [ ] 2.3 Re-check the five checks already corrected, removed or demoted, and record which is which
      in one place. Today that history is spread across the changes that happened to touch them.

## 3. Coverage the bed does not have

- [ ] 3.1 **No row reaches the analysis page's `tools-below` home without `drop-tools2`.** All 12
      landscape rows in that home carry it, which moves the controls panel out of `zoneB2` and
      leaves the tab list alone there. Two stylesheet rules assign both elements to `zoneB2`, so
      the collision is unprovable either way without such a row — see `misc-findings`.
- [ ] 3.2 Decide whether the bed should enumerate arrangements it cannot reach by viewport, or
      whether an unreachable arrangement is by definition not worth a rule. This is the general
      form of 3.1 and the answer decides how the bed grows.
- [ ] 3.3 The `100x50` zoom variants named by older findings no longer exist as rows. Establish
      whether they were dropped deliberately and say so in `viewports.py`, because two archived
      findings point at rows that cannot be re-checked.

## 4. Convergence, for `idempotent-layout-pass`

- [ ] 4.1 Assert CONVERGENCE, not just settling. A page that stops moving is not a page that would
      reach the same answer from another starting point; the bed currently probes twice (arrive,
      nudge, re-probe) and reports staleness, which is close but is not the same question.
- [ ] 4.2 Add the oscillating shape as a row: analysis page, 904x686, board A ~72.375, board B
      ~99.5 — the measured period-2 limit cycle. It does not sit on the slider's step grid, so a
      sweep steps over it and it has to be walked explicitly.
- [ ] 4.3 Keep "stale until nudged" and "does not converge" as DISTINCT findings. A lag and a cycle
      have different causes and the same symptom at one sample.

## 5. Tolerances, and saying what they mean

- [ ] 5.1 The same-size check tolerates one device pixel PER SQUARE. At minimum zoom 13 of 76
      `minxmin` rows differ by 4px of board — half a device pixel per square — and pass. That is
      the tolerance working as designed, but nothing states the drawn consequence, so record what
      a reader would and would not see.
- [ ] 5.2 The clearance warning is parked and should stay parked until the question changes: of 141
      findings, 108 were a 0.0px flush edge between a panel and a board, which is a grid track
      ending where the next begins. The real case — a surface drawn OUTSIDE its own part's box and
      close to a board — is a different question and needs asking that way.

## 6. The accept workflow

- [ ] 6.1 `notes.json` is hand-edited. Decide whether accepting a row should be a command rather
      than an edit, and whether an accepted row should expire when the row's geometry changes —
      today an accept can outlive the thing it accepted.
- [ ] 6.2 State what a change is OBLIGED to do with the bed: run it, diff by row set rather than by
      count, and account for every row that moved. This is practice already; it is nowhere written.

## 7. Making it the standard

- [ ] 7.1 A script and a skill, so a run is one command and its diff is read the same way every
      time — the four-window harness has both and they are why it is reliable.
- [ ] 7.2 Decide whether the bed runs in CI. It takes ~3.5 minutes and needs Playwright; the
      argument against is that its output is a diff to be read, not a pass/fail, and a red build
      nobody can interpret trains people to ignore it.
- [ ] 7.3 Write down the division from the harness side too: the bed finds what nobody was looking
      for, the four-window harness investigates what you already know about. Both memories say it;
      neither repository file does.

## 8. Not in this change

- **Layout defects the bed finds.** They belong to the change that owns that part of the page.
  Today's three failing rows are owned by `what-zone-a-is-for`'s successors and by the commit that
  created `round-controls-panel`.
- **The four-window docker harness.** Separate instrument, separate skill, and the bed must stay
  independent of it.
