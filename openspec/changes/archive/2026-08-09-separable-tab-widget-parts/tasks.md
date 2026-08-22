## 1. Record the reference behaviour

- [x] 1.1 On the current build, capture the round page's tools area: the widget element, its panels and tablist, their geometry, which panel is open, and the computed rules that make the column yield (`min-width`, `min-height`, `overflow`, the flex column)
- [x] 1.2 Capture the analysis page's tabs on the no-game board — panel geometry, collapsed tablist, and the switching behaviour with the tablist revealed

## 2. Turn the widget into a constructed object

- [x] 2.1 Replace `renderTabbedPanels` with a widget class taking the id prefix, the panel definitions and the aria label, building every vnode in the constructor
- [x] 2.2 Expose the tablist vnode and the panel-area vnode, each returning the same retained object on every access — never rebuilding, since selection operates on the vnodes the widget holds
- [x] 2.3 Give the two mounted elements `<id>-tablist` and `<id>-tabpanels`; keep `<id>-tab-<i>` and `<id>-panel-<i>` as they are
- [x] 2.4 Remove the container the widget used to build, and remove `hideTabList` with it
- [x] 2.5 Make show/hide address the retained content vnodes only; confirm no widget behaviour reads an id, and that ids remain solely for `aria-controls` / `aria-labelledby`
- [x] 2.6 Comment why the getters must not rebuild, and why this widget exposes two views where the house convention is one composed view per widget

## 3. Refactor the analysis page

- [x] 3.1 Construct the widget in `analysis.ts` with its own id prefix
- [x] 3.2 Render `under-board` in the page itself and mount the panel area inside it
- [x] 3.3 Mount the tablist only when the page describes a game, replacing what `hideTabList` did; keep `isAnalysisBoard` computed once
- [x] 3.4 Confirm `analysisCtrl.ts` still has no reference to the tabs module

## 4. Refactor the round page

- [x] 4.1 Render the tools-area element in `round.ts` as page markup, with the classes and grid placement it has today
- [x] 4.2 Construct the widget with its own id prefix and mount the panel area and the tablist inside that element, panels first so the tablist still reads as a bottom tab bar
- [x] 4.3 Keep the three panels and their single-element contents exactly as they are

## 5. Follow the new structure in CSS

- [x] 5.1 Move the round page's widget rules off `#round-tabs` and its direct children onto `.bug-round-tools` and the new `#round-tabs-tabpanels` / `#round-tabs-tablist` elements — the flex column, `min-width: 0`, `min-height: 0`, `overflow: hidden auto`, and the tab-label clipping
- [x] 5.2 Check nothing else keyed off the old structure, on either page
- [x] 5.3 Confirm the round page still introduces no fixed panel height

## 6. Verify

- [x] 6.1 Analysis page against the 1.2 reference — panel geometry, no-game board with no tablist mounted, switching when the tablist is present

      At the same 1362x551 viewport the reference was taken at, panel-0 is
      **761.74x240 at (468.06, 411.92)** — identical — with the same display,
      height, alignment, flex-flow and font size; panel-1 unchanged. `under-board`
      carries no id and its only child is `analysis-tabs-tabpanels`; **the tablist
      is not mounted at all** on the no-game board, which is what replaced
      `hideTabList`. The new panel-area element occupies exactly the panel's box,
      so the extra wrapper costs no space.
- [x] 6.2 Round page against the 1.1 reference — three tabs in order, Chat open, switching, and each panel's content still updating in place
- [x] 6.3 Selected tab still survives a content update — open Moves, play a move, confirm it did not revert to Chat
- [x] 6.4 Narrow the viewport and confirm the widget still yields before the boards: both boards fully on screen, no horizontal overflow, labels clipping

      1362 / 1100 / 1000 / 950 / 900: app right edge equals the viewport at every
      step, board A stays at x=0 and board B's right edge at 889.67, tools column
      absorbs 472.33 → 210.33 → 110.33 → 60.33 → 10.33, labels clip from 950.
- [x] 6.5 Confirm a long panel still scrolls internally rather than pushing the tablist out of view
- [x] 6.6 Mount the two parts in different containers once, as a throwaway check that the separation actually works, then revert it

      Tablist moved into `aside.sidebar-first` — a different grid area entirely —
      and clicking Info still switched the panel area from panel-1 to panel-2.
      Reverted; child order back to `[round-tabs-tabpanels, round-tabs-tablist]`.
- [x] 6.7 `yarn typecheck` and `yarn test`

## 7. Decide

- [x] 7.1 ~~Whether `<id>-tabs` is the right name for the panel area~~ — **settled before implementation: `<id>-tabpanels`**, pairing with `<id>-tablist` and matching the `role="tabpanel"` of the elements it holds
- [x] 7.2 ~~Whether the round page's container keeps the `round-tabs` id~~ — **settled before implementation: it does not.** `div.bug-round-tools` carries no id; CSS keys off the class plus `#round-tabs-tabpanels` / `#round-tabs-tablist`, and `round-tabs` remains only the widget's id prefix
