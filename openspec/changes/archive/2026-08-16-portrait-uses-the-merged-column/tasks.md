# Tasks

Landscape is the reference throughout: it must come out unchanged to the pixel at every step.

## 1. Hoist what the modes share

- [x] 1.1 Move to the top level: `.bug-right-column`'s `display: grid`, row template, areas, `overflow: hidden`, `row-gap: 0`
- [x] 1.2 Move `.bug-partner-stack { grid-area: stack; align-self: start }` and `.bug-parts { display: contents }` with them
- [x] 1.3 Leave only `grid-template-columns` and the gap in each mode's block
- [x] 1.4 Measure both landscape modes before and after — identical, or the hoist took something that was not shared

## 2. Portrait adopts the structure

- [x] 2.1 Remove portrait's `display: contents` on `.bug-right-column` and `.bug-partner-stack`
- [x] 2.2 Remove portrait's `.bug-parts` flex block and its `tools` grid area
- [x] 2.3 App grid becomes one column: rightcol / clock-top / board / clock-bot / toolsB
- [x] 2.4 Give `.bug-right-column` portrait's widths: the partner board's eight squares, then the remainder
- [x] 2.5 Check the vertical arithmetic still reaches the viewport without the old slack row, so the own board does not move

## 3. Verify

- [x] 3.1 p4: parts sit beside the partner board when it is large, and under it when it is small
- [x] 3.2 p4: the own board is still full width at the bottom, same size as before
- [x] 3.3 p4: no unreachable region above the own board
- [x] 3.4 p4: rotated pockets, per-seat units and the name-on-its-own-line still behave — pockets measured at 4 x their own seat's square (181.3 own, 82.7 partner)
- [x] 3.5 p1 and p3: identical to before, measured not eyeballed — but see 6, which deliberately changes when landscape drops
- [x] 3.6 No page overflow in any mode
- [x] 3.7 Tab switching still shows and hides every part of a tab together — both chat parts hide on Moves/Info and return together on Chat

## 4. Gates

- [x] 4.1 `yarn typecheck` and `yarn test` if any client file is touched
- [x] 4.2 Sync `static/` into the container

## 5. Decisions recorded

- [x] 5.1 Portrait uses the same drop order as landscape — tablist, then the second preset part, then the first — and the chat never moves. No portrait special case: the order is a property of the parts, not of the mode, and one order is one thing to reason about.
- [x] 5.2 The merged column is height-bounded in portrait. It gets the region above the own board and no more, so `spaceFor` reads `column.clientHeight` in every mode. Letting it take what it needs would push the own board off the bottom of the viewport, which is the arrangement portrait exists to prevent.

## 6. An empty element is charged no height

Found while asking why the first preset part would not flow under the board in portrait even with room
for it twice over.

- [x] 6.1 `heightOf` skips an element with no children. `offsetParent === null` catches *hidden*; it does not catch *empty*, and `.bug-gameover` shares the first preset part's area, is empty during play, and stretches to its row — so it measured 64.1px in portrait and was billed against the space left for the board
- [x] 6.2 Confirmed in portrait: `drop-p1` now granted, both preset parts full width under the board, chat height 231.4 -> 264.9, column packs exactly
- [x] 6.3 Confirmed in tall landscape (p3, 1590x689) by sweeping the partner board's zoom through the slider — the honest path, since `ZoomSettings.update()` also calls `updateBounds`/`renderResized` where poking `--zoom-b` does not:

  | zoom | what happens |
  |---|---|
  | 74 | partner name takes its own line |
  | 68 | tablist drops |
  | 64 | second preset part drops |
  | 58 | first preset part drops |
  | 56 -> 20 | all three stay dropped, full width, no page overflow |

  Before the fix the first part never dropped at any zoom down to 30 — the phantom was blocking
  landscape as well, just less visibly, because landscape has more width to hide it in.

- [x] 6.4 No flapping anywhere in the sweep: every step was sampled twice, ~350ms apart, and agreed
