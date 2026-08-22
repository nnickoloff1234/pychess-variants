## 1. Record the reference behaviour

- [x] 1.1 On the current build, capture the two-board analysis page's tabs: both panels' rendered geometry, the FEN & PGN panel's computed `align-items` and `justify-content`, and what switching tabs does — this is the reference the widget refactor must reproduce

      Captured on `/analysis/bughouse` (no-game board, viewport 1362x551):
      - `#tab-0` "Move times" → `#panel-0`, `aria-selected=true`, `tabindex=0`; `#tab-1` "FEN & PGN" → `#panel-1`, `aria-selected=false`, `tabindex=1`.
      - `#panel-0` `.chart-container`: `display: flex`, `height: 240px`, `align-items: center`, `justify-content: center`, `flex-flow: row nowrap`, `font-size: 14px`, rect 761.74x240 at (468.06, 411.92).
      - `#panel-1` `.fenpgn-panel`: `display: none`, `height: 240px`, **`align-items: center`, `justify-content: center`**, `flex-flow: column nowrap`, `font-size: 12.6px`.
      - Tablist `display: none` — collapsed mode, as expected for the no-game board.
      - Switching (tablist revealed temporarily to exercise the click path): clicking `#tab-1` sets its `aria-selected=true` and `#tab-0` to `false`, sets `#panel-0` inline `display: none` and `#panel-1` inline `display: flex`.
      - **The centring on `#panel-1` comes from `analysis.css:416` `div#panel-1`, not from `.fenpgn-panel`** — this is the collision task 4.2 must resolve.
- [x] 1.2 Capture the round page's current tools area and the three elements being moved — the chat container, the movelist block and the game-info placeholder — including which of them are reachable in each layout mode

      Captured on the round page in short landscape (viewport 1362x551):
      - `.bug-round-tools` (grid area `tools`): 472.33x546.67 at (889.67, 0) — **in viewport**, the only one that is.
      - `#bugroundchat`: fills it, 472.33x546.67 at (889.67, 0), carries its own `grid-area: chat`.
      - `.movelist-block` (in `.bug-round-tools-part`, grid area `toolsB`): 1362x437.33 at (0, 546.67) — **below the fold**, carries `grid-area: moves`.
      - `.game-info` (in `aside.sidebar-first`, grid area `side`): 1362x138.02 at (0, 1170.06) — **below the fold**.
      - `#offer-dialog`: at (0, 984), height 0 — below the fold. `#game-controls` was not present in the DOM at capture time.
      - Note: `#bugroundchat` and `.movelist-block` each declare their own `grid-area`. Once they are panel children rather than grid items those declarations become inert, the same way the pocket and seat-block declarations did in the seat-strip change.

## 2. Refactor the widget: namespaced ids

- [x] 2.1 Add the widget id parameter to `renderTabbedPanels` and apply it to the container element
- [x] 2.2 Derive every generated id from it — `<id>-tab-<i>`, `<id>-panel-<i>` — leaving position as the only thing that determines identity
- [x] 2.3 Update the analysis page's single call site to pass its own widget id
- [x] 2.4 Confirm no CSS or code anywhere keys off the bare `tab-<i>` / `panel-<i>` ids for two-board pages

## 3. Refactor the widget: no DOM queries

- [x] 3.1 Retain the tab and panel vnodes inside `renderTabbedPanels` and close the click handler over them
- [x] 3.2 Replace the parent/grandparent traversal and `querySelector` in `onTabClick` with direct access to the retained vnodes' elements
- [x] 3.3 Comment why the widget toggles element state rather than re-patching its container — `MovelistView` and `GameInfoView` retain and patch their own vnodes, and the chat renders into its container after insertion, so a container re-patch could leave those owners writing to detached nodes
- [x] 3.4 Confirm the module contains no `document` reference and no selector of any kind
- [x] 3.5 Verify switching still works with the tablist and panels at differing depths, not only as direct children

      Satisfied by construction rather than by experiment: the module no longer
      traverses at all, so depth cannot affect it. `select()` addresses the tab and
      panel vnodes it retained, and never looks at parents or siblings.

## 4. Verify the analysis page is unchanged

- [x] 4.1 Compare both panels against the 1.1 reference — geometry, switching, collapsed (no-game) mode
- [x] 4.2 Check the FEN & PGN panel specifically: `analysis.css:416`'s `div#panel-1` rule no longer matches once ids are prefixed, so decide whether the centring it was contributing is wanted, and if so restore it on `.fenpgn-panel` rather than by reinstating the collision

      **Decision: do not restore it.** After prefixing, `analysis-tabs-panel-1`
      computes `align-items: normal; justify-content: normal` where it read
      `center/center` before; everything else is identical to the 1.1 reference.
      The centring was never meant for this panel — `analysis.css`'s `div#panel-4`,
      the single-board page's FEN & PGN panel, sets only `font-size` and
      `flex-flow` and has no centring. Dropping it makes the two-board panel match
      the single-board one: `#fentext`, `#copyfen` and `#pgntext` now stretch to
      the panel width and start at its left edge, which is the right presentation
      for text fields and is what the screenshot confirms.

## 5. Put the round page's tools into tabs

- [x] 5.1 Build the tools area in `round.ts` as a single `renderTabbedPanels` call whose container is the existing `div.bug-round-tools`, carrying a widget id
- [x] 5.2 Chat panel: the existing chat container element, moved as it is
- [x] 5.3 Moves panel: the existing `div.movelist-block`, moved out of `div.bug-round-tools-part` as it is, with the movelist placeholder and move-controls still inside it
- [x] 5.4 Info panel: the `GameInfoView` placeholder, moved out of `aside.sidebar-first` as it is
- [x] 5.5 Order the panels Chat, Moves, Info so that Chat is index 0 and therefore the default
- [x] 5.6 Leave `div#offer-dialog` and `div#game-controls` where they are, and leave `aside.sidebar-first` in the markup

## 6. Size the widget from its container

- [x] 6.1 Make the widget a flex column: tablist `flex: 0 0 auto`, panel area `flex: 1 1 auto` with `min-height: 0` so it can shrink below its content and scroll internally
- [x] 6.1a Set the panels' overflow as `overflow: hidden auto` — x hidden, y auto — not `overflow-y` alone. Setting only the y axis makes `overflow-x` compute from `visible` to `auto`, which the dry run showed producing a horizontal scrollbar on the Info panel once the column was narrower than the game-info's ~170px min-content width
- [x] 6.2 Give the widget and its panels `min-width: 0` and `min-height: 0`, so the container can drive it to zero in either axis
- [x] 6.3 Give the tab labels `min-width: 0` and `overflow: hidden` so they clip rather than setting a floor on the tablist's width — no ellipsis
- [x] 6.4 Confirm the round page introduces no fixed panel height, and note in the stylesheet that `height: var(--panel-height)` from `site.css` falls back to `auto` here because `--panel-height` is defined only in `analysis.css`, which this page does not load
- [x] 6.5 Re-home whatever `.bug-round-tools-part .movelist-block` was contributing, now that the movelist has moved out of that container

      It was pinning the block to board B's height
      (`max-height`/`min-height: calc(var(--cg-height-b))`). Deleted rather than
      re-homed: its selector no longer matches, and a fixed height is the opposite
      of taking size from the container. `main.round.bug .movelist-block`'s
      `flex: 1` still applies and fills the panel.

## 7. Verify on the round page

- [x] 7.1 Build, hard-reload the harness windows, and confirm the boards did not move or change size
- [x] 7.2 Confirm the three tabs render in order with Chat open, and that switching shows the right panel
- [x] 7.3 Confirm each panel's content still updates in place — play a move and watch the movelist grow, send a chat message, and check the game info rendered
- [x] 7.4 Confirm the selected tab survives content updates: open Moves, play a move on each board, and check the panel did not revert to Chat
- [x] 7.5 Narrow the viewport and confirm the widget yields first — both boards stay fully on screen, no horizontal overflow, labels clip

      Measured at 1362 / 1100 / 1000 / 950 / 900: the app's right edge equals the
      viewport at every step, board A stays at x=0 and board B's right edge at
      889.67 throughout, and the tools column absorbs the whole difference
      (472.33 → 210.33 → 110.33 → 60.33 → 10.33). Labels begin clipping at 1000.
- [x] 7.6 Drive the tools column to near zero and confirm nothing forces the grid wider or taller
- [x] 7.7 Confirm a long movelist scrolls inside its panel rather than pushing the tablist out of view

      Two probes with synthetic content, each removed after measuring. 2000px added
      inside `#movelist` changed nothing — it has its own `overflow-y: auto` and
      absorbs growth first. 2000px added directly to the panel gave it
      `scrollHeight` 2000 while its height stayed 515, the widget stayed 547 and the
      tablist stayed at y=515 and visible. The panel scrolls; the tablist is never
      pushed out.
- [x] 7.8 Check the phone landscape viewports already used for this layout — iPhone SE 667x375 is the tightest and the one where three labels have least room

      iPhone SE landscape (664x361 at dpr 1.875, `--bug-sq` 35.73): app exactly 664
      wide at x=0, both boards fully on screen, tools column 77.27px, tablist 29.42
      tall, open panel 327.92. All three labels clipped, reading "Cha / Mov / Info"
      in 25.75px each. Marginal but not broken — the widget yields rather than
      pushing a board off screen, which is the requirement.
- [x] 7.9 `yarn typecheck` and `yarn test`

## 8. Decide what the dry run surfaced

- [x] 8.1 Judge whether Chat should stay the default, or whether the movelist is what a player wants between moves — **kept as Chat, provisionally.** Chat as index 0 works and the panel is the
      one a player needs continuously. Nothing seen so far argues against it, but
      this cannot be settled without real play: the cost only shows up when a
      message arrives while Moves is open, which no test can judge. Nikolay to
      confirm or overturn after using it.
- [x] 8.2 Judge whether the tablist reads better above the panels than below, and if so express it as CSS ordering rather than a widget change — **settled: leave it below.** Emitted after the panels it renders as a bottom
      tab bar and reads naturally in the column at every width tested, including the
      iPhone SE. No CSS ordering applied, and the widget is unchanged.
- [x] 8.3 Record where `div#offer-dialog` and `div#game-controls` should end up — they are still unreachable in short landscape after this change — **still unreachable, and now the only thing that is.** They remain in
      `div.bug-round-tools-part` in the `toolsB` area below the boards, which the
      short-landscape mode cannot scroll to. A fourth tab is the obvious home, but
      they are controls rather than content — resign, draw, rematch — and putting a
      control behind a tab hides it at the moment it is needed. Left for its own
      change.
- [x] 8.4 Record whether the empty `aside.sidebar-first` should still render — **left rendering, empty.** Verified `aside.sidebar-first` now has zero
      children and nothing in the layout broke. Removing it touches `grid-area: side`
      and the modes this change does not otherwise alter, so it stays as a separate
      question.
