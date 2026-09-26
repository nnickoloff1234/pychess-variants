## Why

`unify-two-board-app-grid` unified the two-board pages' **structure, area names and measurements**,
and closed with three faults fixed and one survey to run. It left a boundary rather than a finish:
its non-goals were the drop decision and zone B's sizing, and its story — *mode-private structure,
mode-private names, mode-private measurement* — turned out to have a second half nobody had written
down. Where that change was about one page's modes disagreeing with each other, this one is about
**the two pages disagreeing with each other** while doing the same thing.

Surveyed 2026-09-26, the disagreements are not stylistic. Three of them have already cost a
measured failure:

- **A part the view declares but never mounts is silent.** `round.ts` mounts panels BY INDEX
  (`roundTabs.panel(2, 1)` written by hand); `analysis.ts` maps over its declarations. Splitting the
  round page's Moves tab therefore declared a part nothing mounted, `#move-controls` vanished with
  it, and the survey went from 26 failing rows to 120 (`5d805a5c3`). The analysis page had already
  hit the same wall from the other side and fixed it — its own comment records mounting
  `panel(1, 0)` on a one-tab widget as an index error.
- **Which parts share a slot is restated in every rule that places them.**
  `chatpresets-panel-2 + round-controls-panel` appears in 5 CSS rules and again in
  `ROUND_DROPPABLE`; `bug-gameover + chatpresets-panel-1` in 4 and again there. Six places and five
  places for one fact, coupled only by matching selector strings against `panelClass`.
- **A part in CSS but not in the drop list stays in the strip and is charged to the boards anyway.**
  That is `df988e68b`'s phantom 40px band, and its cause was a class the stylesheet declined while
  the cascade went on believing it had landed.

Two more were found by reading rather than by failing, and both are the naming fault of the previous
change one module over:

- **A seat slot has two vocabularies.** `roundSeatView` keys seats `${position}${board}` — `0a`,
  `1a`, `0b`, `1b`; `analysisSeatView` keys the same four seats `'top' | 'bottom' | 'top.bug' |
  'bottom.bug'`. Both files' comments say they key by physical screen position *for the same reason*,
  and then say it in different words. `AnalysisClockView` declares that union a **second time**, in
  its own file, with the same `SLOT_SELECTOR` and `Record<Slot, VNode | HTMLElement>` idiom beside
  it.
- **The two-board app element is looked up four ways in three modules.**
  `'.round-app.bug, .analysis-app.bug'` is a named constant `APP` in `toolsPlacement.ts` and again
  in `seatNamePlacement.ts`, and an inline literal in `squareUnit.ts` and in `toolsPlacement.ts`
  itself — the one file that has the constant. Page identity is asked a third way in
  `squareUnit.ts`, as `document.querySelector('.analysis-app.bug') !== null`.

And one element pair is one idea wearing two names with opposite defaults:
`.bug-presets-group` is `display: contents` everywhere and becomes a box only in zone B, because the
round page places its preset rows individually; `.bug-tool-group` is a box by default and has not yet
dissolved, because the analysis page places nothing individually yet. `shared.css` states the
contrast and names the follow-on work: *"the part that leaves needs an area of its own, and that is
the next change."*

## What Changes

- **A declared part is always mounted.** The round page mounts from its declarations as the analysis
  page does, so a part cannot be declared without appearing. The round page's non-uniform
  arrangement — chat free-standing, two preset parts inside a group, `bug-gameover` and the tools
  bar interleaved as furniture belonging to no tab — is expressed in the declaration rather than in
  the mounting code.
- **One group concept.** `.bug-presets-group` and `.bug-tool-group` become one element under one
  name, with box-or-contents stated per arrangement as both already state it. This is Decision 2 of
  the previous change applied one level in: an element that is `display: contents` in every mode has
  no reason to exist, and one that is a box in every mode is not a group but a panel.
- **Slot membership is declared once.** The view declares which parts occupy one slot and in what
  queue order; the stylesheet stops repeating the pairs; `ROUND_DROPPABLE` and the analysis page's
  inline list are derived from that declaration rather than restating selectors.
- **One accessor for the app element, and one question for page identity.** `APP` lives in one
  place; `squareUnit`'s gauge test and `trackToolsPlacement`'s redundant `container` parameter go
  through it. That parameter's default already matches the analysis app, and the analysis page is the
  only caller that passes one — passing exactly what the default would have found.
- **One vocabulary for a seat slot**, shared by both pages' seat views and the analysis clocks, with
  the slot union declared once instead of twice.
- **The six-element board handover is one function.** `createBoards()` is duplicated in `round.ts`
  and `analysis.ts` with the same six board and pocket parameters and the same
  `.elm as HTMLElement` extraction, differing only in which controller and which views it feeds.

Recorded as **deliberate asymmetry, not debt** — the change states these so a later reader does not
"unify" them:

- **Flip moves elements on the round page and re-renders on the analysis page.** Round swaps seat
  blocks between strips (`swapSeatBlocksForFlip`) because its clocks are live objects whose local
  reading is the authority; re-rendering would destroy them. Analysis has no ticking clock and
  re-renders from state.
- **The analysis page's presence dot is always offline**, because that page has no websocket at all.
- **`movesAllowed()` is unconditionally true in `gameCtrl`**, because the analysis page never wires
  it and a board under construction has nothing in flight.

## Capabilities

### Modified Capabilities

- `two-board-tabs` — gains the declaration/mounting contract. Its current requirement says *"Both
  pages SHALL declare a single part per tab and mount that one part per tab… the round page's use of
  it is a separate change"*, which both pages have outgrown: the analysis page declares three parts
  per tab and the round page two. This is that separate change.
- `two-board-stylesheet-layout` — gains the one-group requirement and slot membership declared once.
  It already carries the naming and single-grid requirements this continues.
- `bughouse-seat-strip` — gains one vocabulary for naming a seat slot, across both pages and the
  clocks beside the seats.

## Impact

- `client/two-board/round/round.ts`, `client/two-board/analysis/analysis.ts` — mounting, the
  declarations, `createBoards`
- `client/two-board/common/tabs.ts` — whatever the declaration has to carry for grouping and slots
- `client/two-board/common/toolsPlacement.ts` — `APP`, the `container` parameter, the derived
  droppable list
- `client/two-board/common/seatNamePlacement.ts`, `client/two-board/squareUnit.ts` — the app accessor
- `client/two-board/round/roundSeatView.ts`, `client/two-board/analysis/analysisSeatView.ts`,
  `client/two-board/analysis/analysisClock.ts` — the slot vocabulary
- `static/two-boards/layout/*.css`, `components/*.css` — the group's name, the slot-membership rules
- `tests/layout_matrix/baseline.json` — renames in place; geometry is expected not to move

## Relationship to the other changes

- `what-zone-a-is-for` — zone A's definition and the 31 conditional slot rules are its business, not
  this change's. The survey's finding that **the area a part lands in is a position in the drop
  queue, not a property of the part** belongs there: 13 of 33 buckets shift, under three different
  rules (analysis zone A packs bottom-up in queue order; zone B numbers per arrangement; the last
  resort shifts every index by one because the stack takes a row).
- `idempotent-layout-pass` — the JS-reads-the-CSS-back loop, which the previous change's design
  parked as *"worth revisiting only with a design that owns a candidate arrangement"*.
- **A latent collision found while surveying, and NOT this change's to fix**: `analysis` +
  `tools-below` assigns both `.analysis-controls-panel` (landscape.css:79) and `[role='tablist']`
  (landscape.css:93) to `zoneB2`, and a named area holds one item. It never fires in the 286-row
  matrix, because all 12 landscape analysis rows in that home also carry `drop-tools2`, which moves
  the controls to `zoneA3`. Whether the cascade guarantees that or it is merely true of these 30
  viewports is unproven, and proving it needs a row that does not exist yet.
