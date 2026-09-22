## Why

Both two-board pages render `<under-left id="spectators">` and neither ever puts anything in it.

- **The round page receives the message and throws it away.** `client/two-board/socket/sockets.ts`
  has `case 'spectators':` with the one line inside it commented out —
  `// this.onMsgSpectators(msg);` — under a note saying the block was copied from `gameCtrl.ts`.
  The server does send it: `wsr.py:345/459/1205` broadcast `game.spectator_list`, built by
  `bug/game_bug.py:800`.
- **The analysis page cannot receive it at all**: it constructs no websocket, which is the subject
  of `analysis-page-presence-websocket`.
- **And there is no handler to uncomment into.** `onMsgSpectators` is `private` on
  `GameController`, and the two-board controllers do not extend that class. Wiring this up is a
  small fresh implementation, not a one-line change — which is also what frees the element from the
  single-board page's naming.

Measured on the analysis page: `<under-left id="spectators"></under-left>`, zero children,
`display: none`, 0x0. It occupied a named grid area (`uleft`) in every layout mode of both pages.

The single-board pages do this properly: `gameCtrl.onMsgSpectators` patches `#spectators` with
`renderSpectators(msg.spectators)`, and `under-left` in `site.css` lays it out as a centred wrapping
row. The two-board pages have the element and the area and neither the data nor the handler.

## What Changes

- **Done 2026-09-20.** The element is `spectators#spectators` and lives inside the **Info tab's
  panel** on both pages. A tab panel lays out its own children, so no template names it and nothing
  can auto-place it into an implicit track. `under-left` was a position in the single-board page's
  shell and described nothing about this page.
- **Done 2026-09-20.** `uleft` is gone from every two-board template — both modes of the analysis
  app, the round page's shell row (and `uboard` with it, which nothing has ever filled), the
  placement rule, and the two `display: none` rules that hid the element in the modes that could
  not afford its row.
- **Done 2026-09-22.** The two-board round page renders its spectators: `SpectatorsView` owns the
  node and patches it, the socket's `spectators` case calls into the controller, and the parsing
  left `gameCtrl` for `client/spectators.ts`, which both page families now read.
- **Done 2026-09-22, and not planned here.** Three things the wiring turned up:
  - **A departure was never announced, on any page.** `finally_logic` awaited the broadcast inside
    the handler task of the connection that had just closed, which aiohttp cancels on disconnect —
    so the server dropped the spectator and told nobody. Fixed by handing it to a background task
    on the user. Not a bughouse defect: the single-board pages have the same disconnect path, which
    is why a spectator list has only ever grown.
  - **The count belongs where a reader can see it**: the Info tab reads `Info (2)` while two people
    are watching and `Info` when none are. That needed the shared tab widget to be able to re-label
    a tab after construction, which it could not.
  - **The panel had to be a column.** A tab panel is a flex ROW by default here, so the game
    information and the list stood side by side, each taking half of the narrowest region on the
    page. They are now one above the other, and a team row breaks between its two members rather
    than inside a name.
- The analysis page keeps the placeholder for parity and cannot fill it until it has a socket — see
  `analysis-page-presence-websocket`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: a two-board page renders the spectators it is told about, the tab holding
  them carries their number, and the panel that holds both them and the game information is a
  column whose team rows break between members.
- `two-board-tabs`: the shared widget can re-label a tab after construction, preserving ids,
  references and the selection.

The original form of this change said "None — the layout half is a placement change with no
behaviour attached, and the wiring half, when it happens, restores a feature the single-board pages
already specify." That was true of the half done on 2026-09-20 and is not true of the wiring: the
count on the tab is behaviour neither page family had, and the departure fix changes what the server
does for every game type. If the analysis page gains a socket, that still belongs to
`analysis-page-presence-websocket`.

## Impact

- `client/two-board/round/round.ts`, `client/two-board/analysis/analysis.ts` — the element, moved
  into the Info tab and renamed.
- `static/two-boards/layout/portrait.css`, `layout/landscape.css`, `layout/shared.css`,
  `page-shell.css`, `components/stacks.css` — the `uleft` area and the rules that hid the element.
- `client/two-board/socket/sockets.ts`, `client/two-board/common/spectatorsView.ts` (new),
  `client/spectators.ts` (new, shared with the single-board pages), `client/gameCtrl.ts` (its
  private parser removed), `client/two-board/common/tabs.ts` (`setLabel`),
  `client/two-board/round/round.ts` and `roundCtrl.ts` — the wiring and the count.
- `client/two-board/common/gameInfo.ts` and `static/two-boards/components/game-info.css` (new) —
  the panel as a column, and a team that breaks between its members.
- `server/wsr.py` — the departure broadcast, moved off the task aiohttp cancels. The one change
  here that is not about bughouse.

## A consequence worth stating

Removing `uleft` from the analysis page's portrait template leaves the two pages' portrait
arrangements the same — identical areas, columns, rows, width and centring. What still differs
between the two rules is not arrangement: `display: grid`, which the round page picks up elsewhere,
and a `row-gap`/`column-gap` pair that are both zero. Portrait's app template can now be stated
once, which is what the portrait work was waiting on.
