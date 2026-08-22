## Why

Four things on the bughouse round page, three of them about what happens when a game ends and
one unrelated.

**The board offers a resize it will not perform.** Every board renders a `cg-resize` handle in
its bottom-right corner, and `site.css` shows it at any viewport wider than 799.3px. Short
landscape is wider than that, so the handle appears — but that mode sizes its boards from
`--bug-sq`, the height-derived square, with no zoom factor anywhere in the track. Dragging the
handle moves the zoom setting and the board does not change. A control that visibly does nothing
is worse than no control.

**The end-of-game buttons take over the wrong element.** Rematch, New Opponent and Analysis Board
are patched into `#game-controls`, which is the slot in the tab bar that holds Draw and Resign, so
they replace the in-game controls in a strip sized for two small icon buttons. They are three
wide text buttons and they do not belong in that strip.

**The presets outlive their usefulness.** "Need a knight" and "don't trade" address a partner in a
game that is still being played. After the result they are twenty dead buttons occupying the best
space on the page — exactly the space the end-of-game buttons need.

**And a readability point.** `roundCtrl` decides whether a game is still running by comparing a
raw status number against zero, in eight places, spelled `>= 0` in some and `< 0` in others.
Nothing says what zero means.

## What Changes

- **The resize handle is hidden where resizing does nothing.** Short landscape stops rendering it.
  The handle's presence follows whether zoom actually reaches the board's size in that mode.

- **The end-of-game buttons become siblings of the tab parts.** They move out of `#game-controls`
  into the region the tab parts occupy, with their own place in the merged column. Each button
  floats independently rather than being stacked in a fixed column: side by side where there is
  room, one above the other where there is not — the same behaviour the preset sets already have.
  Draw and Resign keep their strip, which simply empties when they no longer apply.

- **The presets are hidden once the game is over**, which is also what frees the space the
  end-of-game buttons move into.

- **`isGameOver()` replaces the bare comparisons.** **NOTE:** one existing site is `> 0`, not
  `>= 0`, and it is not the same question — `0` is ABORTED, so that site means "finished with a
  result" and deliberately excludes an aborted game. It keeps its own explicit test rather than
  being folded into `isGameOver()`, which would silently change behaviour for aborted games.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: gains a requirement that a board offers a resize handle only where
  resizing has an effect, and one placing the end-of-game controls with the tab parts rather than
  in the tab bar's control strip.
- `bughouse-chat-presets`: gains a requirement that the presets are not shown once the game has a
  result.

## Impact

- `static/site.css` provides the handle rule that `static/bughouse.css` will override per mode;
  `client/cgCtrl.ts` creates the handle unconditionally and is where a stronger fix would live if
  hiding proves insufficient.
- `client/two-board/round/roundControls.ts` — `renderGameOverControls()` and
  `insertRematchButton()`, which currently target `#game-controls` and `.btn-controls.after`.
- `client/two-board/round/round.ts` — a mount point for the end-of-game buttons among the parts.
- `client/two-board/round/toolsPlacement.ts` — the placement order, if the new element takes part
  in it.
- `client/two-board/round/roundCtrl.ts` — the status comparisons, and the existing `finishedGame`
  field, which is the same question already asked a second way.
- Single-board pages share `roundCtrl.ts`'s pattern and `site.css`'s handle rule; neither is
  changed by this, and the single-board round page must be left exactly as it is.
