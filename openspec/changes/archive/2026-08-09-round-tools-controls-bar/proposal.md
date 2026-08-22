## Why

A player in the short-landscape layout cannot offer a draw or resign. The two buttons live in `div.btn-controls` inside `.bug-round-tools-part`, in the `toolsB` grid area below the boards, measured at **y = 546.67 in a 551px viewport** — four pixels below the fold, in a mode that pins `body` to `100vh` with `overflow: hidden`, so the page cannot be scrolled to reach them. Neither button has a keyboard shortcut. There is no route to leaving a game.

The tools column now has room for them: its tablist is a 31.85px strip across a 472px column, most of it empty. Putting the controls on that strip makes them reachable in the one grid area that is always on screen, and they are the last content below the boards that a player actually needs mid-game.

## What Changes

- Move `div#game-controls` out of `.bug-round-tools-part` and into the tools column, on the same row as the tablist and following it.
- Introduce a **controls bar** in the tools column — the page's own markup, since the tab widget owns only its two parts — laid out as a row: the tablist first, then the game controls.
- When the column narrows, **the tablist yields and the controls do not**: the tablist shrinks and its labels clip as they do today, while the buttons keep their natural width and are clipped by the bar only once the tablist has given up everything it can.
- `div#offer-dialog` stays where it is. Only the buttons move.

## Capabilities

### Modified Capabilities

- `round-page-tools-tabs`: the tools area gains a second row-level element beside the tablist, and a rule about which of the two yields when the column narrows.

## Impact

- `client/two-board/round/round.ts` — `div#game-controls` moves from `.bug-round-tools-part` into a new controls-bar element in the tools column; the tablist is mounted inside that bar rather than directly in the column.
- `static/bughouse.css` — the bar's row layout, the tablist becoming shrinkable within it, and the controls holding their width.
- `client/two-board/round/roundControls.ts` is **not** touched: it finds `#game-controls` by id after the page's patch and replaces it with `div.btn-controls`, so relocating the placeholder changes nothing about how the buttons are built or wired.
- The desktop (`min-height: 600px`) layout also shows the controls in the tools column now rather than in the `toolsB` column, where they sat alone.
- No server, API, persistence or i18n surface; no new strings.
