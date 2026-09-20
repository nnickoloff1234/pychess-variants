## 0. Status

**Opened 2026-09-20, retroactive.** Seven commits had already landed, each surveyed, each recorded
only in its commit message. This change is their home and the home of what follows: the drop budget
in section 3 is why it is not archived.

## 1. Naming

- [x] 1.1 `.bug-right-column` → `.partner-and-tools` — `bf35f30b1`. Fourteen files; the class was
      wrong in every mode differently, a right column in neither. `baseline.json` renamed in place,
      328 strings, same run and same geometry; `notes.json` left alone, being Nikolay's own words.
- [x] 1.2 The portrait area `rightcol` → `partnerAndTools` — `4a07ef4e8`, portrait only at the time.
- [x] 1.3 `rightcol` was left claimed but declared nowhere once the dead landscape template went —
      `ab15f1841`. The shared claim says `partnerAndTools` and the portrait override is deleted with
      it: it existed only to beat the old name.
- [x] 1.4 One vocabulary for the four tools slots, `zoneTools1..4` — `697259f7a`. Portrait's
      `chat / p1 / p2 / tablist` named the same four slots, occupant for occupant.
- [x] 1.5 Five landscape assignments deleted — `48f9b5dd6`. They existed to beat the shared rules
      while the vocabularies differed; afterwards they said the same thing.
- [ ] 1.6 `drop-p1` / `drop-p2` / `drop-tablist` still speak the old vocabulary. They name the PART
      that drops rather than where it lands, so this is its own step and reaches the droppable lists.

## 2. One grid per page

- [x] 2.1 Portrait dissolves the merged column — `576a05b27`. Five rows, two columns, the viewer's
      block spanning both beneath: the landscape shape with one column fewer.
- [x] 2.2 The wrapper element deleted from both views — `576a05b27`. Zero geometry change.
- [x] 2.3 `rowsSpanned()` replaces the two box measurements in `seatNamePlacement` — same commit.
      Reproduces the old answers in all 264 rows.
- [x] 2.4 Dead declarations removed along the way: the analysis page's landscape areas and rows
      (`ef052ed7f`), short landscape's tracks on a boxless element (`bf35f30b1`), and a duplicated
      tab-list rule (`697259f7a`).

## 3. Measurement

- [x] 3.1 `flattened` → `hasZoneB`, and the budget stops depending on it — `f88abf76b`.
- [x] 3.2 The presets are sized against `toolsRegionHeight()` — `1b4d2bfac`. 130 failing checks
      became 120; P5 went from twelve failures to five and stopped overflowing the page.
- [x] 3.3 `ownHeight` / `stackHeight` → `ownStackHeight` / `partnerStackHeight` — same commit.
- [ ] 3.4 **The drop budget is a side-by-side formula.** `max(0, ownStackHeight − partnerStackHeight)`
      means "how much shorter is the partner stack" only while the two share a row. In portrait the
      viewer's board is below, so it reads that board as free space and every part drops. Fourteen
      rows carry an overlap.
- [ ] 3.5 The cost charged to a dropping part assumes the arrangement the button size has already
      ruled out: `heightOf()` charges a preset part as if its sets shared one row, which they cannot
      at a size chosen for the narrow strip. Budget too large, cost too small, both pushing the
      same way.
- [ ] 3.6 The size, the count per row and the decision to drop are one question asked in three
      places in the wrong order — size before the cascade, gap after it. One function taking a
      CANDIDATE region and returning `{button, perRow, rows, height}` collapses them.

## 4. Verify

- [x] 4.1 Frontend gates on every commit: lint, typecheck, md, jest.
- [x] 4.2 A layout matrix run per commit, diffed against the run before it. Every naming and
      structural step came out at 0 geometry changes once names were normalised.
- [ ] 4.3 Portrait reviewed row by row in the report once 3.4 lands. The count alone will not say
      it: the rows that improved under 3.2 stayed failing while their failures halved.
