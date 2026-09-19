## Why

`static/bughouse.css` is 5,496 lines and holds every rule both two-board pages use: the app grids
for three layout modes, the merged column, the boards, the seat strips, the clocks, the pockets, the
chat, the preset buttons, the move list, the tab strip, the end-of-game block, the engine box and the
gauges. Nothing says where a rule belongs, so every change is made by searching the whole file, and
the same concern appears in four places because that is where the search happened to land. It is now
the main cost of working on this layout, and the next piece of work — renaming areas, classes and ids
that nobody can read — is impractical until a name's rules live in one findable file.

## What Changes

- **`static/bughouse.css` becomes `static/two-boards/`**, a folder of stylesheets that each hold one
  concern, loaded by explicit `<link>` tags from `templates/base.html` in a stated order.
- **The arrangement is split BY MODE, everything else BY COMPONENT.** Measured: only 40% of the file
  sits inside a top-level `@media` (landscape-shared 860 lines, tall landscape 447, short landscape
  431, portrait 456, width breakpoints 43) and 60% — 3,260 lines — sits outside one. A split by mode
  alone therefore leaves a ~3,300-line `common.css` and the problem with it.
- **No rule changes.** This is a move: every declaration keeps its text, and every rule keeps its
  position relative to any rule it ties with on specificity. The layout survey is the proof — 264
  rows, and the run after the split must differ from the run before it in nothing.
- **A load order is written down**, because the cascade currently depends on source order in places
  and will depend on file order afterwards.
- NOT in this change: renaming anything, deleting anything, merging duplicate rules, or changing how
  a mode is selected. Those are what the split is for, and each wants its own change and its own
  survey run.

## Capabilities

### New Capabilities

- `two-board-stylesheet-layout`: where a two-board rule lives — the file per concern, the mode split
  inside the arrangement, the load order, and the rule that a move may not change what is drawn.

### Modified Capabilities

_None._ No requirement about the layout itself changes; `bughouse-round-layout`, `bughouse-seat-strip`
and the rest keep every requirement they have. What changes is which file states them.

## Impact

- `static/bughouse.css` — deleted, its content distributed.
- `static/two-boards/` — new: `properties.css`, `page-shell.css`, `layout/` (five files, one per
  mode) and `components/` (eight files, one per part of the page).
- `templates/base.html` — one `<link>` becomes several, in order.
- `tests/layout_matrix` — unchanged, and used as the acceptance test.
- No TypeScript change: every class, id and custom property keeps its name in this change. The
  client reads `--bug-*` properties by name from `squareUnit.ts`, `toolsPlacement.ts` and
  `seatNamePlacement.ts`, and those names are exactly what the later renaming change will touch.
- No server change. `static()` in `templates/base.html` serves the files unversioned, as it does
  today, so the split inherits the existing cache question rather than creating one.
