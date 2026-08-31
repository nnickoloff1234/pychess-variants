## Outcome — CLOSED 2026-08-30

**Not adopted.** The flow model was probed and rolled back; what shipped instead is one flat grid
with the drop targets as named areas (commit `8f0f877`), which keeps this change's two-zone idea and
reparents nothing. The delta spec below is NOT synced to the main specs: it requires arrangement by
flow with no track declared for the tools, and the page declares one. See `tasks.md` section 0 for
the evidence and for what each open question turned out to be.

## Why

The two-board layout is expressed as nested grids with mode-specific track lists: an app grid, a
merged-column grid inside it, and a stack grid inside that. Three modes each state their own tracks,
and `toolsPlacement.ts` measures and toggles classes to move parts between named areas. It works —
every mode was verified on 2026-08-29 — but it is a lot of machinery to say "boards first, then
whatever else fits".

The proposal is to let the elements arrange themselves: one flex container, the boards first, and
everything after them falling into place as the space allows, with no third track declared anywhere.

**A working shape already exists and was measured before this was written.** On the analysis page at
1276x551, with `.bug-right-column` flattened to `display: contents` and the app set to
`flex-flow: column wrap`:

| item | column | position | size |
|:--|:--|:--|--:|
| own stack | 1 | x 0 | 454x551 |
| partner stack | 2 | x 465 | 454x551 |
| tools panel | **3, implicit** | x 931, y 0 | 277x503 |
| tab list | **3, implicit** | x 931, y 503 | 277x49 |

No overflow on either axis. The third column is created by wrapping, not declared.

## What Changes

- The app becomes a flex container; `.bug-right-column` becomes `display: contents` so the partner
  stack, the tab panels and the tab list are siblings of the own stack.
- The two board stacks each take a full column; everything after them wraps into an implicit column
  and stacks.
- Mode-specific track lists give way to one arrangement, with per-mode differences reduced to the
  square unit each mode already chooses.
- **Portrait is not touched, on either page.** It stays exactly as it is.
- **The round page is converted only after the analysis page holds**, and only with a live game to
  test against.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: the two-board pages arrange their boards and tools by flow rather than by
  declared tracks, in the landscape modes only.

## Impact

- `static/bughouse.css` — the app and merged-column rules in both landscape blocks, both pages.
- `client/two-board/common/toolsPlacement.ts` — see design decision 3: its span-based drop has no
  expression in a wrapped flex container, so it either goes or the model does.
- No server change, no Python gates.

## Checkpoint

Commit `52b6e5daf` is the state to return to. `git checkout .` restores it; `openspec/` is not in
the commit and is unaffected.
