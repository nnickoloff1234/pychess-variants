## 1. The two numbers are settled — verify them, do not re-derive them

`Wt` = 2 squares wide, `T` = 3 squares tall. Both were read off the resource table in Design rather
than chosen, and the table is in the change. Do not re-open them without a measurement that
contradicts it.

- [x] 1.1 Replace `TOOLS_MIN_SQUARES = 0.5` with `Wt = 2` and add `T = 3`, both counted in squares
      of the left board, beside the constants they join.
- [x] 1.2 Render a tools panel in a full-width row three squares tall — 150px at p4's square — and
      look at it. `T` is the one number never yet seen on screen; if 3 is wrong, the band
      (0.74, 5.45] says how far it may move without changing which of p1 and p4 qualifies.
- [ ] 1.3 Confirm `Wt = 2` leaves every ordinary desktop its column ON BOTH PAGES — 1920x1080,
      1600x900, 1280x720, 1024x640, 996x730. The analysis page is the one to watch: its stack is
      8.31 squares wide, so it is always the first of the two to run out of width.
- [x] 1.4 Implement the column test as "charging `Wt` costs the boards nothing", NOT as "there are
      `Wt` squares spare beside two full-size boards". The strict form was measured to send the
      analysis page at 1920x1080 and 1600x900, and both pages at 1024x640 and 996x730, to the last
      resort.
- [x] 1.5 Keep the right board's floor `f` in every home, including the two-column ones — settled,
      and it follows from the rule that the viewer's own board never yields. The formula therefore
      has one form for the floor and not one per home.

## 2. Enumerate the sub-cases and pin each to a viewport

- [ ] 2.1 Write down each tall-landscape sub-case with a concrete viewport, the expected
      arrangement, and the expected left-board square. Start from the four already identified:
      height-scarce desktop (996x730 -> BESIDE, 67.00); width-scarce with no room below
      (682x647 -> BESIDE, 50.61); width-scarce with room below (627x835 -> BELOW, 50.16); and
      both boards at the floor with the tools clipping.
- [ ] 2.2 Add the crossover viewport — the size at which the two candidates are equal — and check
      the arrangement either side of it. Ties go to BESIDE.
- [ ] 2.3 Add a 4:3 tablet (768x1024) and a 16:10 tablet (800x1280), since the portrait cut-off now
      sends both here.

## 3. The cascade, in `squareUnit.ts`

- [x] 3.1 Replace `TOOLS_MIN_SQUARES` with `Wt` as an absolute length, and update the width equation
      from a change of divisor to a subtraction.
- [x] 3.2 Add the cascade as a pure function of the viewport: column, else zone B, else zone A, else
      last resort. It must read no laid-out element.
- [x] 3.3 Publish the chosen home so the stylesheet can act on it, by the mechanism the drop classes
      already use.
- [ ] 3.4 Check `minZoomPercent()` and `clampZoom()` follow the new allowances unchanged — they read
      `allowanceFor()`, so they should.

## 4. The arrangement, in the stylesheet

- [x] 4.1 Add the BELOW arrangement to the shared `--bug-zones-*` vocabulary. Both pages get it, or
      neither; do not let the two drift apart again.
- [x] 4.2 State the column template whose third track is zero, and confirm the two board tracks
      take the whole width.
- [x] 4.3 Confirm no item is left naming an area the BELOW template does not declare — an item
      whose area does not exist auto-places and mints implicit columns whose GAPS come off the
      boards.

## 5. Placement, in `toolsPlacement.ts`

- [x] 5.1 Stop assuming a tools column exists. In the BELOW arrangement its width is zero and every
      part starts in zone B.
- [x] 5.2 Charge the tools row against `--bug-boards-h` and `--bug-app-content-h`, as zone B's
      occupants are already charged.
- [ ] 5.3 Keep the per-part zone A flow working inside the BELOW arrangement, for parts narrow
      enough to want it.
- [ ] 5.4 Confirm the BESIDE arrangement's behaviour is byte-for-byte what it is today.

## 6. Detached tabs, in the widget

A general capability, built before its first user. See the `two-board-tabs` delta.

- [x] 6.1 Add the detached state to `tabs.ts`: settable at construction, changeable at runtime, in
      both directions.
- [x] 6.2 Make switching act on the ATTACHED tabs rather than on all of them. Find every place that
      hides "every panel except the selected one" first — that is where this breaks.
- [x] 6.3 Preserve selection across both transitions: attaching a tab selects it; detaching the
      selected tab moves selection to another attached tab.
- [x] 6.4 Render the tablist as a SUBSET, without renumbering. Ids come from a tab's index, so a
      compacted list would change them and invalidate held part references.
- [x] 6.5 A detached part is a region named by its tab's label, not a `role="tabpanel"` pointing at
      a tab that is not rendered. It becomes a tabpanel again when attached.
- [x] 6.6 Check nothing is created, destroyed or reparented across repeated transitions.

## 7. The partner board as the first detached tab

- [x] 7.1 Make the right board's stack a tab, detached at construction, on both pages.
- [x] 7.2 Attach its tab only in the last resort. Attaching selects it, so nothing visibly changes
      as the arrangement flips; detach again when the arrangement changes back.
- [x] 7.3 Place the tools panels in the `stack` area in the last resort, sharing it with the board
      panel. They are never displayed at the same time, so the one-item-per-area rule holds; the
      last resort needs no new area, only a new occupant for an existing one.
- [x] 7.4 Keep the eval gauge with its board — part of the stack, a term of the width formula
      (`S` = 8.31 on the analysis page in every home), hidden and shown WITH the board rather than
      left beside another panel.
- [x] 7.5 Verify a board hidden and reshown by a tab change has correct bounds. It has moved without
      changing size, which is a cache-clearing event and not a re-measure.
- [x] 7.6 Check the board's own tab label. It needs a name in the strip that reads as the partner's
      board rather than as a tool.

## 8. `partsWidth.ts`

- [x] 8.1 RESOLVED BY DELETION, not by the fix written here. It read the app's last track as the
      tools' width, which is zero in the BELOW arrangement — and the repair, measuring the panels
      instead, closed a loop through their HEIGHT and oscillated. `partsWidth.ts` is gone and no
      reference to it remains; the control labels are placed by `labelControls()` instead.
- [x] 8.2 Control labels checked: they do not collapse to their floor, because nothing derives
      them from a width any more.

## 9. Verify

- [ ] 9.1 Walk every viewport from item 2 in the harness, checking arrangement, both board squares,
      the tools' rectangle, and zero overflow on both axes.
- [ ] 9.2 Confirm 996x730 is unchanged from before the change — same squares, same tracks, same
      arrangement. This is the regression that matters most.
- [ ] 9.3 Resize slowly across the crossover and watch for flicker; record what it looks like even
      if nothing is done about it.
- [ ] 9.4 Check both pages, since the round page and the analysis page differ by the gauge and
      therefore cross over at different viewports.
- [ ] 9.5 Exercise detach/attach on a panel that is NOT the board — the movelist, say — to check
      the widget feature stands on its own rather than fitting only its first user.
- [x] 9.6 Frontend gates: `yarn typecheck`, `yarn test`.

## 10. Short landscape's zone A fit — deferred

- [ ] 10.1 Zone A is admitted on a height proxy, not on whether the parts fit: measured 173px
      against a 150px threshold, with the round page's four parts needing 186px and the chat
      squeezed to zero. Page overflows 44px at 682x503. See Design, "Deferred".
- [ ] 10.2 Pick one of the three ways out recorded there before touching this again.

## 11. Fold the result back into the living spec

- [x] 10.1 Update `bughouse-round-layout` with the arrangement rule and the sub-cases, once they are
      measured rather than predicted.
- [x] 10.2 Restate "The boards take priority over the tools" to cover the case where the tools cost
      no width at all.

## 12. Zone A unused on the analysis page — deferred

- [ ] Decide what zone A is FOR when the parts fit without it. Measured on the analysis page at
      629x830: `zoneA2` is 199x240 at y 300-540 and EMPTY, while the only visible tab panel sits in
      zone B1 at 611x260 below both boards. The band exists because the partner board is half the
      own board's height, by design. Three questions first — is a part there wanted at all, should
      the row collapse instead, and is this really a partner-board-size decision. See Design,
      "Deferred — zone A goes unused while zone B takes everything". Pair it with section 10: both
      ask what zone A is for, from opposite directions.
