## Why

In portrait the bottom board drew 368px inside a 380px container, leaving a gap down its left side,
on **every load**. The board was not mis-sized: its container changed after it had been measured,
and nothing measured it again.

A load trace shows the shape of it — the board's wrap growing while the viewport holds still:

```
 47ms  body=386.0x835.3   wrap=378.0   --cg-width-b=373.33
101ms  body=386.0x835.3   wrap=386.0   --cg-width-b=373.33
```

The first instinct — observe the wrap and re-measure — was **rejected**, and rightly. A layout that
has to be corrected after the fact by a listener is a layout whose sizes were not known when they
were needed, and loops closed by "re-measure until nothing changes" are how oscillation gets in.

The available width is knowable up front. `squareUnit.ts` already computes it, duplicating
chessgroundx's own `floor(width x dpr / files) x files / dpr`.

## What Changes

- **A board's container is given a width the board can render exactly** — the quantised width,
  not whatever the settling layout happens to leave. A container sized that way is indifferent to
  what moves around it during load.

- **Boards are measured once, at load, and redrawn only when the user explicitly zooms or resizes.**
  No new observers; `document.body` is the only observed element, which chessgroundx already does.

- **The full-width board is centred on the remainder.** Chessgroundx pins its container to the right
  of the wrap, so any leftover collects on one edge; preset rows keep theirs on the left
  deliberately, packing the buttons against the edge they share with the chat.

- **Anything still resizing during load is a defect to fix, not to observe.** `main` and
  `.round-app` still move 386 -> 384 -> 386 while the page settles. That no longer reaches a board,
  but it is not yet explained.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bughouse-round-layout`: that a board is measured once against a container it can render exactly,
  what may be observed, and where quantisation slack goes.

## Impact

- `static/bughouse.css` — portrait's board container takes the quantised width and is centred;
  preset rows pack right. **Done.**
- Tall landscape's partner track is `calc(var(--bug-tall-sq) * 8 * var(--board-scaleB))`, and the
  zoom multiplication leaves a width the board cannot render: 398.9 measured against a board of
  393.3, so 5.6px of slack. Same defect as portrait's, not yet fixed.
- `client/two-board/round/boardBounds.ts` — **reverted and deleted**, along with its call site. It
  was the rejected approach.

## Reverted

The observer is gone: module deleted, call removed from `roundCtrl`, zero references. With it gone,
portrait is still correct at load, because the container no longer moves. That is the evidence the
rule is the better fix rather than a matter of taste.
