## 0. Status

**Opened 2026-09-26**, out of the survey that closed `unify-two-board-app-grid`. Every item below was
found by reading or counting, and the counts are in the proposal and design so that a later reader can
check them rather than re-derive them. Sections 1-3 are the structural work; section 4 is the TypeScript
duplication the survey turned up; section 5 is verification; section 6 is what this change deliberately
does not do.

Names before behaviour, one commit each, a layout matrix run per commit diffed against the one before
it, and 0 geometry changes expected from every step in sections 1-4 except 2.1.

**Baseline for the diffs: 286 rows, 3 failing** at fork master `6a7902531` on 2026-09-26 —
`T6-landscape-C1-100x100`, `P5-C3-100x100`, `P5-C4-100x100`. Record the run before touching anything.

## 1. Settle the shape questions first

- [ ] 1.1 **Is the drop queue the declaration order?** Both pages comment that it is. Verify against
      every arrangement rather than against the comments: for each page, list the declared part order
      and the order the cascade charges parts in, and confirm they agree. Decision 2 in `design.md`
      depends on this, and the change is larger if it fails.
- [ ] 1.2 **Where does furniture get declared?** `bug-gameover` and the tools bar are slot occupants
      belonging to no tab. Decide between declaring them as parts of a detached tab — which is what the
      partner board already is — and a short separate list. Record which and why.
- [ ] 1.3 **What can the declaration express?** Write down the minimum set of fields needed to
      reproduce the round page's current DOM: the slot, the group, furniture-or-part. If that set grows
      past those, stop and reconsider Decision 1 — the design names this as the real risk.
- [ ] 1.4 Name the group, and name the seat slot vocabulary. Two open questions in `design.md`; the
      seat-slot one has an argument in it already (ids are load-bearing for flip and switch).

## 2. One vocabulary

- [ ] 2.1 One group element replacing `.bug-presets-group` and `.bug-tool-group`, box-or-contents
      stated per arrangement. **The one step expected to move geometry**, because the two elements have
      opposite defaults today; diff the row set, not the count, and account for every row that moves.
- [ ] 2.2 One seat-slot vocabulary across `roundSeatView.ts`, `analysisSeatView.ts` and
      `analysisClock.ts`. The slot union is currently declared twice — identically, in two files — with
      the same `SLOT_SELECTOR` and `Record<Slot, VNode | HTMLElement>` idiom beside each copy.
- [ ] 2.3 One accessor for the app element. Four occurrences in three modules today: `APP` in
      `toolsPlacement.ts`, `APP` again in `seatNamePlacement.ts`, and inline literals in
      `squareUnit.ts` and in `toolsPlacement.ts` itself.
- [ ] 2.4 Page identity through that accessor, replacing `squareUnit.ts`'s
      `document.querySelector('.analysis-app.bug') !== null`.
- [ ] 2.5 Remove `trackToolsPlacement`'s `container` parameter. Its default already matches the
      analysis app and the analysis page is its only caller, passing what the default would have found.

## 3. Declare once, derive the rest

- [ ] 3.1 The round page mounts from its declarations, as the analysis page does. A declared part that
      nothing mounts must stop being reachable.
- [ ] 3.2 Slot membership declared with the part. The stylesheet's rules keep one rule per arrangement
      and stop naming the members: `chatpresets-panel-2 + round-controls-panel` currently appears in 5
      rules, `bug-gameover + chatpresets-panel-1` in 4.
- [ ] 3.3 `ROUND_DROPPABLE` and the analysis page's inline list derived from the declarations. Today
      one is an exported const inside the shared module and the other is written inline at the call
      site — two conventions for one thing, and the comment on `ROUND_DROPPABLE` still says the
      analysis page passes "one entry, its tab list", which stopped being true when its engine and
      controls panels became droppable.
- [ ] 3.4 Confirm the counted result: 57 part-level `grid-area` assignments in 36 buckets, so 21
      assignments gone. If the number that actually goes is materially different, say so here — the
      estimate is from a survey, not from the edit.

## 4. The TypeScript duplication the survey found

- [ ] 4.1 `createBoards()` is duplicated in `round.ts` and `analysis.ts`: same six board and pocket
      parameters, same `.elm as HTMLElement` extraction, differing only in which controller and which
      views it constructs. One helper for the six-element handover, with each page passing its own
      controller and views.
- [ ] 4.2 `AnalysisClockView` exposes `topPlaceholder()` / `bottomPlaceholder()` per leaf while
      `AnalysisSeatView` exposes one parameterised `placeholder(board, position)` — two APIs for the
      same shape on the same page. Settle on the parameterised one; it is also what the widget rule
      about composed views asks for.
- [ ] 4.3 Sweep for the same fault elsewhere in `client/two-board/`: a type, constant or idiom declared
      once per page rather than once. The two found so far were both found by reading, so this is a
      search and not a formality — record what it finds even if nothing is changed.

## 5. Verify

- [ ] 5.1 Frontend gates on every commit: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`.
- [ ] 5.2 A layout matrix run per commit, diffed by row set against the run before it. 0 geometry
      changes expected everywhere except 2.1.
- [ ] 5.3 Final run against the 286/3 baseline: the failing set is the same three rows, or every
      difference is accounted for.
- [ ] 5.4 Both pages in the four-window harness at two homes each, because a mounting change is the
      kind that renders correctly in the matrix and wrongly in a real session — the parts are there and
      the tab that shows them is not.
- [ ] 5.5 Confirm the silent failures are now unreachable rather than merely absent: declare a part
      without mounting it, and rename a `panelClass` without touching anything else. Both should fail
      loudly or be impossible to express.

## 6. Not in this change

Pointers, carrying no checkbox on purpose — an open box here would inflate what this change owes.

- **The `zoneB2` collision on the analysis page.** `analysis` + `tools-below` assigns both
  `.analysis-controls-panel` and `[role='tablist']` to `zoneB2`. Never fires in the 286-row matrix,
  because all 12 landscape rows in that home also carry `drop-tools2`, which moves the controls out.
  Unproven either way and it needs a row that does not exist.
- **The 31 conditional slot rules.** The area is a queue position, not a part property — 20 buckets
  preserve the index, 13 shift, under three different rules. Recorded as a requirement so it is not
  attempted.
- **Zone A's definition** — `what-zone-a-is-for`. **The arrangement loop** — `idempotent-layout-pass`.
- **The matrix bed's `ok` flag disagreeing with its own `failures` array** on `P5-C4-100x100`: `ok`
  reads true with a non-empty failure list. The run summary counts by `failures`, so the headline
  number is right; the per-row flag is not. A bed fix, not a layout one.
