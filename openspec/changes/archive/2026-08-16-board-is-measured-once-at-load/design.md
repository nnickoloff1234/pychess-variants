## Context

chessgroundx computes a board's geometry in `updateBounds`, writes `--cg-width{suffix}` in
`renderResized`, and keeps itself in step with a ResizeObserver installed by `bindBoard`. For a
single-board page it observes the board's own wrap, which is right. For bughouse — anything with
`dimensionsCssVarsSuffix` — it observes `document.body` instead, to escape a recursion that
observing the wrap caused while zooming.

`boardSettings.ts` already works around the consequence for one case:

```js
// In case of bughouse updateZoom() doesn't trigger chessgroundx onResize() via ResizeObserver
// to prevent recursive call, so we have to force manual onResize() here
setTimeout(() => { updateBounds(state); renderResized(state); }, 100);
```

So the zoom path re-measures by hand. Nothing else does, and the page has several other ways for a
board's container to change: the grid settling during load, a tools part dropping, the merged
column resizing.

Measured in portrait, every load: `cg-board` 368 in a 380 container, `--cg-width-b: 368px`, while
this project's own quantised unit said 378.67. After a window resize — which body does see — the
board tracked correctly at 421.3 in a 423.3 container.

**Body and the board's container are decoupled, and a load trace shows it directly.** Instrumented
with the old geometry restored, observing both boxes:

```
 47ms  BODY-RO   body=386.0x835.3   wrap=378.0   --cg-width-b=373.33
 47ms  WRAP-RO   body=386.0x835.3   wrap=378.0   --cg-width-b=373.33
101ms  WRAP-RO   body=386.0x835.3   wrap=386.0   --cg-width-b=373.33
107ms  poll      body=386.0x835.3   wrap=386.0   --cg-width-b=384
```

At 101ms the container grew from 378 to 386 while body stayed identical at 386.0x835.3, so an
observer on body has nothing to report and never fires. This is not a timing accident that a delay
would paper over: body is the viewport, the container is a grid track inside a layout that fills the
viewport, so the track resizing while the viewport does not is the normal case rather than the
exception. Without the wrap observer the board stays at 373.33 inside a 386 container.

## Goals / Non-Goals

**Goals:**

- A board's drawn size follows the container it is in.
- No recursion, and no oscillation, in a file where measured layout decisions already exist.
- The bottom board fills its width; quantisation slack is centred.

**Non-Goals:**

- Patching chessgroundx. The observer target is its call, and the recursion it avoids is real.
- Removing the `body { margin: 0 0 2vmin }` overflow. Clipped, not scrolled; separate concern.
- Changing how the square unit is quantised. `squareUnit.ts` already mirrors chessgroundx's rule and
  the two agree once a board measures the right container.

## Decisions

### 1. REJECTED: observe the wrap and re-measure

The first fix added a ResizeObserver on each board's wrap, calling `updateBounds` + `renderResized`,
with a guard that returned when a re-measure would change nothing.

Rejected by Nikolay, and the objection is the right one: a layout that has to be corrected after the
fact by a listener is a layout whose sizes were not known at the moment they were needed. Loops
closed by "re-measure until nothing changes" are how oscillation bugs get in — and this one's guard
did not even hold, since quantisation leaves the board permanently narrower than its wrap in
landscape, so the guard never engaged there and termination rested on an empirical property.

The rule that replaces it: **body is the only element that may be observed, a board is measured once
at load, and only an explicit user zoom or resize redraws it.** A board that is wrong at load means
something resized during load that should not have, and that is what gets fixed.

The evidence that this is better rather than merely stricter: with the observer deleted, portrait is
still correct at load. The container stopped moving, so there was never anything to re-measure.

### 2. Give the container a width the board can render exactly

`cg-container` is pinned right inside its wrap, so slack shows on the left. Centring the container
would work, but it fights chessgroundx's own positioning. Setting the wrap to
`calc(var(--bug-portrait-sq) * 8)` and centring *that* leaves nothing inside to pin: the board fills
its wrap exactly, and the remainder sits outside it, split evenly.

This works because `--bug-portrait-sq` is this project's copy of chessgroundx's quantisation rule,
so the width handed to the wrap is one the board will agree with rather than round away from.

### 3. Presets pack right, boards centre

Asymmetric on purpose. A board that is not centred in its column reads as a bug. A row of buttons is
read from the edge it is anchored to, and these sit beside the chat, so the right edge is the one
that matters; the leftover goes to the left margin.

## Risks / Trade-offs

- **A new observer on a page that already has three.** Mitigated by the no-op guard, and checked:
  fourteen samples on p3 and twelve on p1, all identical.
- **The comparison is against the rendered board, not the memoised bounds.** Deliberate —
  `dom.bounds` is the cache the re-measure exists to refresh, so trusting it would defeat the check.
- **Portrait's width rule assumes the own board is the full-width one.** True by the mode's
  definition, and it is keyed on the role class rather than board identity, so a board switch keeps
  it pointed at the right element.

## Open Questions

- Should the partner board's slack be centred too? It is 5.6px at p3's zoom, inside the merged
  column, and nobody has complained; the rule here is deliberately limited to the board the mode
  gives full width to.
- Is the `setTimeout(..., 100)` in `ZoomSettings.update()` still needed now that the container is
  observed directly, or does the observer already cover the zoom path?
