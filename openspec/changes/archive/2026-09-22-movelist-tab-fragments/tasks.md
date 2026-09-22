# Tasks

## 1. Declare the fragments

- [x] 1.1 Split the analysis page's Moves tab into three parts — engine box (`#ceval` + the pv box),
      move list (`.movelist-block` + `#misc-info`), move controls (`#move-controls`) — each with its
      own `panelClass`. `analysis-moves-panel` stays on the move-list part, so nothing that names it
      had to change. The new classes are `analysis-engine-panel` and `analysis-controls-panel`.
- [x] 1.2 Mount every part of every attached tab, derived from the declarations: a tab with one part
      is mounted exactly as before, a tab with several is mounted inside one `.bug-tool-group`. The
      loop reads `panel.parts`, so a tab that gains a part needs no second edit.
- [x] 1.3 Rewrote the tab-grouping comment in `analysis.ts`: one tab in three parts, why the two
      statements do not conflict, where each boundary falls, and what dissolving the group will mean.

## 2. Place the group

- [x] 2.1 The group takes the panel's grid area in every home — `zoneTools1` beside the boards (and
      under `drop-tablist`/`drop-tablist-b`), `zoneB1` in `tools-below`, `zoneA2` in `tools-zonea`,
      `stack` in `tools-lastresort`, and `chat` in portrait's merged column. Verified by forcing each
      class on the live app and reading the computed area back: every one resolves to a name the
      template declares, so the group is never auto-placed into an implicit track.
- [x] 2.2 Sized inside it: the engine box and the controls take their content height, the move list
      takes the rest and scrolls. `height: auto` on each part — `site.css` pins every
      `div[role=tabpanel]` to `--panel-height` and `analysis.css` defines it as 240px on this page,
      which is exactly what was measured before the rule was added: three parts 240px tall in a
      515px group.

## 3. Verify

- [x] 3.1 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test` (78 suites, 490 tests) all
      pass. No Python change.
- [x] 3.2 Before and after, same window (1276x551 CSS px), game `JJgZzLhJ`, tools-beside +
      drop-tablist:

      | | before | after |
      |---|---|---|
      | the item in `zoneTools1` | `.analysis-moves-panel` 761,0 515x515 | `.bug-tool-group` 761,0 515x515 |
      | `#ceval` | y 0, h 44 | y 0, h 44 |
      | `.pvbox` | y 44, h 33 | y 44, h 33 |
      | `#movelist` | y 77, h 397 | y 77, h 397 |
      | `.btn-controls` | y 474, h 40 | y 475, h 40 |
      | `#misc-info` | y 514, h 1 | y 474, h 1 |
      | tab strip | 465,515 811x32 | 465,515 811x32 |

      **THE ONE DIFFERENCE IS ONE PIXEL, and it is `#misc-info`.** That element is three empty divs
      and measures 1px tall on this page; it travels with the move list, because it is the move
      list's footer on the single-board page, so the empty 1px band now sits above the button row
      instead of below it. Nothing else moved, and the boards and the tab strip are identical.

- [x] 3.3 The three parts still work, checked by clicking: fast-backward goes to the start and
      step-forward reaches `e4`; flip turns `#mainboard` from `orientation-white` to
      `orientation-black`; the engine switch turns the engine on (0.8 at depth 14/18 on one board,
      1/18 on the other, arrows drawn on both); the Multiple-lines slider raised to 3/5 gives six PV
      lines, and the engine box growing from 62px to 119px takes the height off the move list
      (277 -> 165) with the group unchanged at 395 and no page overflow. All restored afterwards.

## 4. Not here

- [x] 4.1 The relocation rule belongs to `what-zone-a-is-for`, the umbrella change for zone A and for the
      layout defects found working it out. This is what it inherits:
      - three parts, one group, and the group's area stated per home — so the rule has to dissolve
        the group and name an area for the part that leaves;
      - `#move-controls` DOES NOT SURVIVE: `MovelistView.createButtons()` patches that element into
        `div#btn-controls-top.btn-controls`, so a `Droppable` entry must name the PANEL —
        `.analysis-controls-panel` — and not the id the page declared;
      - the parts' heights, measured, for whatever test the rule uses: engine box 44px with the
        engine off, 62px on at one line, 119px at three; controls 40px; `#misc-info` 1px.
