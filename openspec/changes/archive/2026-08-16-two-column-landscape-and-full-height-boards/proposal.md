## Why

Three complaints that look unrelated share a root: the round layout does not spend its space
on the boards.

Portrait inherited a reversal nothing else has — the presets sit above the chat, and the chat's
own input sits above its messages — because the presets used to be the last child of a
`column-reverse` flex box. That box is gone; the reversal outlived its cause.

The `min-height: 600px` landscape mode sizes a board as `31.25vw` scaled by a zoom slider whose
default is 80, so an untouched page draws each board at a quarter of the viewport width and
leaves the rest idle. "100%" currently means nothing in particular; it should mean the board is
as large as its space allows.

And that mode spends a whole third column on the tools, running the full height of the page
beside both boards. That column is why nothing can ever sit under the right board: the tools are
structurally beside the boards, not with one of them.

## What Changes

- **Portrait presets move below the chat.** The presets stop carrying `order: -1`, and
  `.bugroundchat.chat` stops being `column-reverse` in portrait. Portrait then reads like every
  other layout: messages, input, presets underneath.
  - Note this single rule drives both halves — removing it also puts the chat's input back
    below its messages, which is the same order the other layouts use.

- **Default zoom becomes 100, and 100 comes to mean full height.** **BREAKING** for the
  existing requirement that a board column is a quarter of the page at the default zoom. A
  board's column is derived from the height available to it rather than from `31.25vw`: the
  board plus the pocket row above it and the pocket row below it together fill that height, so
  at zoom 100 the board is as large as the space permits. Zoom below 100 scales down from there
  and the two sliders stay independent.

- **The landscape grid drops from three content columns to two.** Column one holds the left
  board's stack exactly as it does now. Column two holds the right board's stack **and** the
  tools. This is the structural half only: which tabs may later flow under a shrunken right
  board, and how, is deliberately **not** decided here.

- Applies to both landscape modes (`max-height: 600px` and `min-height: 600px`). Portrait keeps
  its own single-column-plus-tools arrangement and is out of scope for the column change.

## Capabilities

### New Capabilities

None. Both changes land in existing layout capabilities.

### Modified Capabilities

- `bughouse-round-layout`: the requirement "A board column is a quarter of the page at the
  default zoom" is replaced by a full-height rule; a new requirement fixes the landscape grid at
  two columns with the tools sharing the second.
- `bughouse-chat-presets`: the requirement "Chat takes the space, presets take what they need"
  gains the ordering — presets below chat in every layout, portrait included.
- `bughouse-seat-strip`: "Switch moves whole strips" changes mechanism. Switching currently
  swaps the inline `grid-area` between `#mainboard` and `#bugboard`, which only works while the
  two boards are siblings in one grid. Once the right board shares a container with the tools
  they are not, so switching becomes a move between containers.

## Impact

- `static/bughouse.css` — the portrait block at line 872, the `max-height: 600px` landscape grid
  at 484, and the `min-height: 600px` landscape grid at 611.
- `client/boardSettings.ts` — `ZoomSettings`' default of 80.
- `client/two-board/squareUnit.ts` — likely a published height-derived unit for landscape, the
  way portrait already publishes one, since the full-height rule needs a quantised square.
- Existing users carry a stored per-board zoom in `localStorage`; a changed default reaches only
  those who never moved the slider. The dev harness profiles already hold values.
