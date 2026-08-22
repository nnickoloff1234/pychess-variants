## 1. Record the reference behaviour

- [x] 1.1 Capture where the draw and resign buttons are today — element, grid area, position relative to the viewport, and whether they are reachable in each mode

      `div.btn-controls` in `.bug-round-tools-part`, grid area `game-controls`,
      1362x40 at (0, **546.67**) in a 551px viewport — `inViewport: false`.
      Buttons `#draw` (title "Draw", "½") and `#resign` (title "Resign").
- [x] 1.2 Capture the tools column as it stands: the tablist's box and flex settings, and how the column behaves as the viewport narrows

## 2. Move the controls into the tools column

- [x] 2.1 Add the controls bar to `round.ts` as the page's own element, holding the tablist and then `div#game-controls`
- [x] 2.2 Remove `div#game-controls` from `.bug-round-tools-part`, leaving `div#offer-dialog` there
- [x] 2.3 Confirm `roundControls.ts` is untouched and still finds the placeholder by id after the page's patch

## 3. Lay out the bar

- [x] 3.1 Make the bar a row that takes its natural height in the column
- [x] 3.2 Make the tablist the flexible one — `flex: 1 1 auto` with `min-width: 0` so it can shrink past its labels
- [x] 3.3 Make the controls `flex: 0 0 auto` so they neither grow into spare space nor shrink under pressure
- [x] 3.5 Fix each control button to two thirds of a board square, from the square unit the page already publishes
- [x] 3.4 Give the bar `overflow: hidden` so the controls are clipped at the column's edge rather than widening the grid

## 4. Verify

- [x] 4.1 The buttons are within the viewport in short landscape, where they were 4px below the fold
- [x] 4.2 They are the same buttons — same labels, same handlers, produced by the same owner
- [x] 4.3 Narrowing takes width from the tablist first: measure the controls' width and the tablist's at several viewport widths

      Controls hold **48.81px at every width**. Tablist absorbs the whole
      difference: 423.52 → 161.52 → 61.52 → 11.52 → 0 → 0 as the viewport goes
      1362 → 1100 → 1000 → 950 → 920 → 900.
- [x] 4.4 At the narrowest widths the controls are clipped rather than scaled, and both boards stay fully on screen with no horizontal overflow

      From 920 down the tablist is at 0 and the controls overflow the bar and are
      clipped, still at their natural 48.81. Board A stays at x=452.33 and board B's
      right edge at 437.33 throughout, and the app's right edge equals the viewport
      at every step.
- [x] 4.5 The panel area still takes the height the bar leaves, and a long panel still scrolls internally
- [x] 4.6 The desktop (`min-height: 600px`) mode still renders sensibly with the controls in the tools column

      At 1354x916 (dpr 1.5) the tools column is 203.33 wide between the boards, and
      the bar renders at its foot: tablist 154.52 + controls 48.81 = 203.33 exactly,
      controls `inViewport: true`. The `toolsB` column now holds only `#offer-dialog`.
- [x] 4.8 Measure the buttons against the square unit in both landscape modes, and re-check that the tablist still absorbs narrowing

      Sized from the board chessgroundx actually rendered — `--cg-width-a / --files`
      — not from `--bug-sq`. The two agree in short landscape (both 54.67, since
      that mode's boards are 8 x --bug-sq) but not elsewhere: in the
      `min-height: 600px` mode --bug-sq measured 91.33 against a real square of
      40.67, so keying to it gave 60.89px buttons taking 60% of a 203px column.
      One rule now covers both modes. `min-width: 0` is required alongside the
      basis: the automatic minimum size floored resign at its flag glyph's 28.79px
      while draw's narrower ½ obeyed, so only one of the pair took the stated width.

      Measured: short landscape 36.44 each (2/3 x 54.67), pair 72.88, tablist 399.46;
      desktop 27.10 each (2/3 x 40.67), pair 54.21, tablist 149.13. Controls hold
      their width at every viewport width tested and the tablist absorbs the whole
      shortfall; clipping begins at 950 rather than 920 now that they are wider.
- [x] 4.7 `yarn typecheck` and `yarn test`

## 5. Decide

- [x] 5.1 Whether the controls should sit before the tablist rather than after — **recorded, not settled; this is Nikolay's call.** After the tablist is what
      was asked for and is what shipped. The measured trade-off: because they are
      last, the controls are the part that gets clipped once the tablist reaches 0,
      which happens below a 920px viewport — so at the very narrowest widths resign
      is partly cut off. Putting them first would make them always fully visible and
      clip the tablist instead, which is arguably better given the whole point of
      the change is reachability.
- [x] 5.2 Whether `#offer-dialog` should follow them onto the bar — **left where it is.** It is now the only thing in `.bug-round-tools-part`,
      so that container and its `toolsB` column exist for one element. Whether the
      offer dialog belongs on the bar, in a panel, or somewhere else entirely is a
      question about how an incoming offer should be surfaced, which this change
      does not open.
