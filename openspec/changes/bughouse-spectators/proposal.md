## Why

Both two-board pages render `<under-left id="spectators">` and neither ever puts anything in it.

- **The round page receives the message and throws it away.** `client/two-board/socket/sockets.ts`
  has `case 'spectators':` with the one line inside it commented out —
  `// this.onMsgSpectators(msg);` — under a note saying the block was copied from `gameCtrl.ts`.
- **The analysis page cannot receive it at all**: it constructs no websocket, which is the subject
  of `analysis-page-presence-websocket`.

Measured on the analysis page: `<under-left id="spectators"></under-left>`, zero children,
`display: none`, 0x0. It occupies a named grid area (`uleft`) in every layout mode of both pages.

The single-board pages do this properly: `gameCtrl.onMsgSpectators` patches `#spectators` with
`renderSpectators(msg.spectators)`, and `under-left` in `site.css` lays it out as a centred wrapping
row. The two-board pages have the element and the area and neither the data nor the handler.

## What Changes

- The two-board round page renders its spectators the way the single-board pages do: uncomment the
  handler, or call the inherited one, and let the existing `under-left` styling place it.
- Decide what the analysis page does. It has no socket; either it gains one (see
  `analysis-page-presence-websocket`, which is the same missing connection behind the dead presence
  dots and the empty chat) or it stops reserving space and markup for something it cannot fill.
- Until then, the two-board layouts SHOULD NOT reserve a grid area for an element that is always
  empty — `uleft` is a row in every template on both pages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None yet — this is a decision plus a small wiring change. If the analysis page gains a socket, that
belongs to `analysis-page-presence-websocket`.

## Impact

- `client/two-board/socket/sockets.ts` — the commented-out handler.
- `client/two-board/round/round.ts`, `client/two-board/analysis/analysis.ts` — the element.
- `static/bughouse.css` — the `uleft` area in the landscape and portrait templates of both pages.

## Postponed

Deliberately not scheduled. Nothing is broken: an empty element that collapses to zero costs a row
that measures 0. It is written down so that the next person to see `uleft` in a template knows it is
a placeholder for a feature that was never wired, rather than something they must preserve.
