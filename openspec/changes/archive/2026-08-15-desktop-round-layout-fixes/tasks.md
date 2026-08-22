## 1. Record the reference behaviour

- [ ] 1.1 In the desktop mode, capture the document's scroll height against the viewport, and every element whose bottom edge is below the fold
- [ ] 1.2 Capture the computed `grid-template-areas`, `grid-template-columns` and `grid-template-rows` of `#main-wrap`, `main.round` and `.round-app.bug`
- [ ] 1.3 Capture the board and tools geometry that the reorder must preserve — board sizes, the gutter between them, and where each seat strip sits relative to its board
- [ ] 1.4 Capture the same three grids in short landscape and on the analysis page, as the controls for "nothing else changed"

## 2. Stop the wrapper inheriting the round page's rows

- [x] 2.1 Scope the `@media (min-width: 800px)` `.bug` rule to the element it was written for, so `#main-wrap.bug` no longer receives its rows and areas
- [x] 2.2 Confirm `#main-wrap` now has only the rows its single `'main'` area needs, and ends at its child's bottom edge
- [x] 2.3 Check the other elements carrying `.bug` and confirm none of them lost a rule it was relying on

## 3. Stop reserving a fixed height for the sidebar

- [x] 3.1 Replace the hardcoded `743px` `side` row with a track sized from its content
- [x] 3.2 Confirm an empty `aside.sidebar-first` now contributes no height
- [ ] 3.3 Confirm a populated sidebar is still laid out correctly — check any page that shares this rule and does fill it

## 4. Put the boards next to each other

- [x] 4.1 Reorder the desktop grid to three columns — board A, board B, tools — with `column-gap` matching the existing row gap
- [x] 4.2 Reorder `grid-template-areas` to match, keeping each seat strip in its board's column
- [x] 4.3 Replace the invalid `2 * minmax(...)` columns declaration with valid track sizes
- [x] 4.4 Size a board column as `calc(31.25vw * var(--board-scaleA))` — 31.25vw at full zoom, so the default zoom of 80 gives a quarter of the page — and the same with `--board-scaleB` for board B
- [x] 4.5 Size the tools column at a flat `20vw`, deliberately not scaled by zoom
- [x] 4.6 Give `toolsB` a content-sized row beneath the tools column instead of a column of its own, so the offer dialog still has somewhere to render
- [x] 4.7 Remove the `move-controls` and `uboard` rows, which measurement showed have no occupant, and say so

## 4b. Fold in the two findings from verification

- [x] 4b.1 Give `main.round.bug` two content-sized columns and centre them, replacing the three inherited from `site.css`'s `.round`
- [x] 4b.2 Confirm the empty third track is gone and the page is centred — equal left and right margins
- [x] 4b.3 Let the controls bar wrap, with the tablist's flex-basis as the trigger rather than a breakpoint
- [ ] 4b.4 Confirm the bar stays on one row where the column is wide, and wraps where it is narrow
- [ ] 4b.5 Confirm mobile's tablist is restored to what it was before the controls bar — full column width, ~24.8px per label

## 5. Verify

- [x] 5.1 The desktop page no longer scrolls over empty space — compare scroll height against the 1.1 reference
- [x] 5.2 Boards are adjacent with the tools column to their right, each board a quarter of the viewport and the tools a fifth at the default zoom
- [x] 5.2a Move each zoom slider and confirm the board tracks follow it, that the two boards move independently, and that the tools column does not move at all
- [ ] 5.2b Confirm a board resize driven by the grid refreshes chessgroundx's bounds — `ZoomSettings.update()` already forces `updateBounds()`/`renderResized()` for the zoom path, and the dry run needed a `resize` dispatch for the same reason
- [x] 5.3 Each seat strip is still directly above or below its own board, with names and clocks on the correct sides
- [ ] 5.4 Look at the seam between the two boards: the ranks gutter and any labels that overhang into it were tuned with a column in between
- [x] 5.5 The tab widget still works in its new position, and the controls bar still holds its width while the tablist yields
- [x] 5.6 Clicks still land on the intended squares on both boards after the reorder
- [ ] 5.7 Short landscape and portrait are unchanged against the 1.4 reference
- [ ] 5.7a Phone landscape (697x382) and iPhone SE (667x375): tabs readable again, controls reachable on the second row, both boards on screen
- [ ] 5.8 The analysis page is unchanged
- [x] 5.9 `yarn typecheck` and `yarn test`

## 6. Decide

- [ ] 6.1 Whether the tools column should keep a pocket-derived width now that it holds a tab panel
- [ ] 6.2 Whether `aside.sidebar-first` should render at all, now that its cost is zero either way

## Verification run — 2026-08-15, game `x3tFwbaS`

Four-window harness, L-tall measured at 1701x733 @dpr1.125 and 1914x825 @dpr1,
L-short at 1276x551 @dpr1.5. Section 1 was never captured, so every "unchanged
against the reference" item is judged against the documented intent, not a
before/after diff.

**Headline numbers.** `scrollHeight` 825 == `innerHeight` 825, so the desktop page
scrolls over **0px** against the 1237px this change set out to remove.
`main.round` rows are `646.688px 39.5px 0px` — the `side` row is 0 and the empty
`aside.sidebar-first` measures 0 high. `#main-wrap.bug` keeps only its `"main"`
row. Columns resolve to `478.5px 478.5px 382.797px` at 1914 wide: each board
exactly 25.00vw, tools exactly 20.00vw. Moving `#zooma` to 60 took column A to
359.6 and left B and tools untouched; `#zoomb` to 100 took B to 594.75 and again
left tools at **382.797px, unmoved throughout**. A click on the computed centre
of e2 selected e2 with offset `{0,0}`; `e2e4` on both boards confirmed in the
server log.

### Open items, and why

- **5.4 is a concern, not a pass.** The gutter measures 16.5px and board A's side
  rank labels overhang **15px** into it — **1.5px of clearance** before board B's
  left edge. It renders correctly today but has essentially no margin; a larger
  coord font or a narrower viewport collides. Widening the L-tall `column-gap` or
  moving board A's ranks to its left edge would both buy room.
- **5.2b — one unreproduced anomaly worth keeping.** Immediately after a browser
  zoom change, two consecutive fresh loads showed `--cg-width-a: 526.222px`
  against a 425.33px column: `cg-board` overflowed its wrap by ~101px, spilled
  left and overlapped board B. A `window resize` dispatch did not correct it
  within 600ms, though it had healed by the next sample. It has not reproduced
  since across several reloads and a further zoom step, so it is recorded rather
  than fixed. Note this is the L-tall instance of the risk already logged in the
  `bughouse-responsive-modes` memory: the grid depends on `--board-scaleA` and the
  board depends on the grid, so any paint before the JS resolves the var leaves
  chessgroundx measuring the wrong container with nothing to re-measure it.
- **4b.4 half-done.** The wide case is confirmed — tabs and the two control
  buttons share one 383px row. The narrow-column wrap was not exercised.
- **5.7 partial.** L-short is intact: `--bug-sq` is exactly 54.667px, each board
  fills its wrap at 437.3px, the 12-row template is untouched, board A is on
  screen.

  Portrait **was** rendered (same-origin overlay iframe in p4) and is **broken —
  but not by this change.** At both 892x1385 and 382x829, `.round-app.bug`
  computes `grid-template-columns: 0px <100vw>`; board A renders 0 wide with all
  33 pieces present, and all 8 pockets are 0 wide. The phone case is under 800px
  so it never touches the rule this change edited, and it fails identically —
  therefore pre-existing. Root cause is circular, at `static/bughouse.css:182`:
  column 1 is sized from `--cg-width-a`, chessgroundx writes `--cg-width-a` from
  board A's measured width, and board A sits in column 1. Measured
  `--cg-width-a: 0px` against `--cg-width-b: 389.33px`. Zero is a stable fixed
  point with no path back. Worth its own change; do not fold it in here.
- **5.7a, 3.3, 5.8 not done.** Phone viewports, a populated sidebar, and a real
  analysis-page comparison all still outstanding. Partial evidence for 5.8:
  `#main-wrap` on `/analysis/bughouse` carries `.bug` and has only its `"main"`
  row in both modes, so the scoping fix behaves there.

## Disposition at archive — 2026-08-15

Archived with 22/36 checked. Nothing open needs immediate attention; the desktop
mode works and its two headline defects are fixed and measured. Everything below
is carried into `openspec/specs/bughouse-round-layout/spec.md` under
"Deferred — revisit when next working on desktop mode", so the next desktop
proposal surfaces it rather than rediscovering it.

**Unobtainable, not pending — 1.1 through 1.4.** These capture the *before* state.
The change was already implemented when verification began, so there is no before
to capture without reverting. They cannot be completed and should not be read as
outstanding work. The lesson is carried into `portrait-phone-round-layout`, whose
section 1 is the same capture done *first*.

**Superseded — 5.7 (portrait half).** Short landscape is verified. Portrait is not
"unchanged" — it is broken, by a pre-existing circular dependency now owned by
`portrait-phone-round-layout`. Closed here as belonging there.

**Deferred with a finding — 5.4.** The seam was measured, not skipped: the gutter
is 16.5px and board A's rank labels overhang 15px into it, leaving **1.5px** of
clearance before board B. It renders correctly today and has no margin at all.

**Deferred, unverified — 3.3, 4b.4, 4b.5, 5.2b, 5.7a, 5.8.** A populated sidebar,
the narrow-column controls wrap, mobile's tablist, the bounds-refresh question
behind the 526px anomaly, phone landscape, and a full analysis-page comparison.

**Deferred decisions — 6.1, 6.2.** Neither blocks anything shipped.
