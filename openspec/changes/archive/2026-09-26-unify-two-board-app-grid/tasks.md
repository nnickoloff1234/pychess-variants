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
- [x] 1.6 The drop classes name the SLOT that widens, not the part that moved into it: `drop-tools4`,
      `drop-tools3`, `drop-tools2`. They were `drop-tablist` / `drop-p2` / `drop-p1` on the round
      page and `drop-tablist` / `drop-engine` / `drop-controls` on the analysis page — two sets of
      names for one set of slots, so every rule about a slot was written twice. The `-b` variants
      follow: `drop-tools4-b`, `drop-tools3-b`, `drop-tools2-b`. `drop-presets-b` is left alone,
      naming both preset panels rather than a slot.
      104 occurrences across 7 files; 0 drop decisions changed once the names are mapped.

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
- [x] 3.4 **The drop budget is a side-by-side formula.** DONE 2026-09-20 in `3e9173a9f`, recorded
      here 2026-09-26 — the commit landed at 21:14 and the box was still open at 22:44, which is the
      exact failure this change was opened to fix, committed against itself.

      `max(0, ownStackHeight − partnerStackHeight)` means "how much shorter is the partner stack" only
      while the two share a row. In portrait the viewer's board is below, so it read that board as
      free space and every part dropped — 277px claimed on an iPhone 12 where 67 existed.
      `toolsRegionHeight − partnerStackHeight` is the same number wherever the stacks do share a row
      and the right question where they do not, and nothing about the mode is asked.

      **AND THE WIDTH WENT THE SAME WAY, which was not in this task's description.** The cascade
      tested a part's declared minimum against the PARTNER STACK's width — the width the part has
      while still in the strip — when every drop template merges the partner's column with the
      tools'. It refused parts that would have landed in something twice as wide.
      `toolsRegionWidth` reads the merged width from the resolved template.

      Survey: 75 failing rows to 72, 112 failing checks to 99, three rows clean, none newly failing,
      and no landscape row changed at all. Every overlap caused by dropping is gone from portrait.
- [x] 3.5 DONE 2026-09-20 in `5310d5897`, recorded here 2026-09-26. The cost charged to a dropping
      part assumed the arrangement the button size had already ruled out: `heightOf()` charged a
      preset part as if its sets shared one row, which they cannot at a size chosen for the narrow
      strip. Measured at 412x915: 52.8 charged against a 50.8 remainder, for a row that would really
      have been 43.

      Fixed by making the size the SMALLER of the two regions' answers — the strip's five-across and
      a dropped row's ten-across. One size is published for the page, so it has to suit both, and
      mixed is the normal arrangement rather than an edge case. The size is then a function of two
      WIDTHS, both known before any decision, so the cascade can charge a part what it would really
      cost in the row it would land in.

      Three things learned the hard way, each now a comment where it matters: the tap-target floor
      decides whether ten is an option at all; the cap applies DOWNWARDS ONLY and before the `widest`
      cap, because that cap may take the size under the floor on purpose; and the paired row is
      predicted with two pixels of slack, because being a pixel over makes the row fall back to five
      and the drop buys nothing.

      Survey: 72 failing rows to 68, 99 failing checks to 95, four rows clean, none newly failing.
- [x] 3.6 THE ORDERING FAULT IS FIXED; THE COLLAPSE THIS TASK ASKED FOR WAS NOT BUILT, and the
      honest record is that the answer went a different way. Closed 2026-09-26 on that basis.

      What the task named: the size, the count per row and the decision to drop are one question asked
      in three places in the wrong order — size before the cascade, gap after it. **That is fixed**,
      in `5310d5897`: the size no longer depends on what drops, being a function of two widths known
      before any decision, so the circle the old order was caught in is broken.

      What it proposed: one function taking a candidate region and returning
      `{button, perRow, rows, height}`. **That does not exist.** `presetFitAt(app, region)` answers
      the candidate-region question and returns `{button, pairs, pad}`; `publishPresetSize()` keeps
      its own `for (const setsPerRow of [PANEL_SETS, 1])` loop over rows and height and returns a
      number. Two functions, each owning part of the arrangement question.

      Left as two deliberately rather than collapsed in a hurry: they answer different questions —
      one predicts, one publishes — and the fault that mattered was the ORDER, not the count of
      functions. Carried into `further-round-analysis-unification` as one line rather than left as an
      open box here, because nothing about the two-board unification depends on it.

- [x] 3.7 **NOT IN THIS LIST WHEN IT WAS WRITTEN — found and fixed while doing 3.4.** `df988e68b`,
      2026-09-20, recorded here 2026-09-26.

      A part asking for zone B is not the same as a home having a row to give it. The analysis page's
      controls panel declares `drop-controls-b` scoped to one home on purpose; in every other home the
      cascade put the class on, nothing matched it, the part stayed in the strip, and its height was
      charged to the boards regardless. `--bug-app-content-h` is `tallestStack + zoneBUsed`, so the
      app was pinned 40px taller than the content it holds, and the 40 came out as dead space UNDER
      THE TALLER BOARD — which then read, to anything measuring the region, as a band that could hold
      something.

      The computed area is the honest answer and the one `zoneBHeight()` already trusts: if the part
      did not land in a zone B row, the home declined it, so the class comes back off and nothing is
      charged. Eighteen rows carried the phantom, all analysis-page at minimum zoom; on the worst the
      band fell from 40.2px to 0.2. Survey: 120 failing checks to 112.

## 4. Verify

- [x] 4.1 Frontend gates on every commit: lint, typecheck, md, jest.
- [x] 4.2 A layout matrix run per commit, diffed against the run before it. Every naming and
      structural step came out at 0 geometry changes once names were normalised.
- [x] 4.3 DONE 2026-09-26, on a full run at fork master `6a7902531` with a clean tree:
      **286 rows, 3 with a failing check, 207s.** Portrait is 24 of those rows and carries 2 of the 3.

      Read by row set rather than by count, as the task asked:

      - `T6-landscape-C1-100x100` — round, tall landscape, `beside`, all three drops: partner stack
        overlaps preset panel 1 in **zoneA2** by 25x6px. A zone A question, so
        `what-zone-a-is-for`'s, not this change's.
      - `P5-C3-100x100` — round, portrait, `below`, **no drops at all**: `round-controls-panel` paints
        3px outside itself and 40x3px over the tools bar. Not a cascade decision — it is the sizing of
        the part `5d805a5c3` created when it split the Moves tab, and it belongs with that work.
      - `P5-C4-100x100` — analysis, portrait, `below`, `drop-tools4`: partner stack paints 4px outside
        itself (box 132x165, painted 132x172).

      **Neither survivor is unification debt, and none of the fourteen portrait overlaps 3.4 described
      is left.** The trajectory across this change, from the commit messages: 127 → 120 → 112 → 99 →
      95 → 40 → 3.

## 5. Landed in the same week, and NOT this change's

Pointers, carrying no checkbox on purpose. Both are commits that went in while this change was open,
belong to other changes' subjects, and are recorded in no change at all as of archiving. Written down
here because the whole argument of this change is that a commit message merges into nothing.

- **`5be122386` "Remove the zoneA tools home"** (2026-09-21) — deletes a whole tools home: the
  fallback that shrank the partner board to seven tenths of the viewer's and put the entire tools
  panel in the band that freed under it. Seven survey rows used it and all seven now go to the last
  resort. With the home gone its CSS went too, and in `place()` the whole `inBand` fork with it — the
  only direction in which a fragment moved DOWN into zone B from a placed home. **This is
  `what-zone-a-is-for`'s subject** and that change records none of it.
- **`5d805a5c3` "The round page's Moves tab is two parts, so its buttons can drop"** (2026-09-21) —
  the round page's Moves tab became two parts so the cascade could move the buttons, which is what
  `.round-controls-panel` is. It cost a survey run to learn that mounting is by index on that page: a
  declared part nothing mounts is silent, and the survey went 26 failing rows to 120 from one missing
  line. **That silence is the subject of `further-round-analysis-unification`**, and the part's own
  3px overflow at `P5-C3-100x100` belongs with this commit rather than with either change.
