## Context

`squareUnit.ts` duplicates chessgroundx's quantisation — `floor(width x dpr / files) x files / dpr`
— and publishes the results as `--bug-portrait-sq`, `--bug-sq`, `--bug-tall-sq`. Tracks built
straight from those units give a board a width it can draw exactly, which is what makes measuring
once at load sufficient.

### Why a track built from a published unit is exact

`squareUnit()` returns `quantize(h, rows, dpr) / rows`, which is `floor(h x dpr / rows) / dpr`.
Multiply that by `dpr` and the result is an integer: **every published unit is a whole number of
device pixels per square.** Chessgroundx's own floor therefore leaves it untouched — its
quantisation is idempotent on our output, and the remainder is zero by construction rather than by
luck. That is the invariant this module exists to hold, and it is why the modes that use a published
unit directly measure exactly zero.

### How scaling breaks it, and why the remainder is so large

**And this case is ordinary, not exotic.** It was found by force-resizing a tile, and first written
up as an unusual device pixel ratio. It is browser page zoom: 1.5 x 0.8 is 1.2000000476837158
exactly, so any user pressing Ctrl+Minus once lands on it. The 6.67px that opened between a board and
its pocket was reachable on an ordinary desktop with the zoom turned down, not only under OS
fractional scaling — which is what makes the margin below worth its sub-pixel cost.

Multiplying a published unit by an arbitrary fraction re-enters the region the floor was there to
leave. The loss is `files x frac(unit x scale x dpr) / dpr`, bounded by `8 / dpr` — about 8px at
dpr 1 for an 8-file board. Desktop's 6.39 is near that maximum, not a small rounding: the unit is 76
and the default zoom is 80, so a square asks for 60.8 device pixels and gets 60. Zoom 75 would give
57 exactly and look flawless; 80 is close to the worst multiplier available. The size of the number
is a symptom of a re-quantisation happening at all, not of quantisation being lossy.

### Why the compensation cannot happen in TypeScript today

It looks as though `publishSquareUnit()` should simply subtract the remainder. It cannot, because in
tall landscape TypeScript never computes the container width. It publishes the unit; CSS composes
the track at `bughouse.css:1107`:

```css
grid-template-columns: calc(var(--bug-tall-sq) * 8 * var(--board-scaleA))
                       minmax(0, max-content);
```

`--board-scaleA` comes from `--zoom-a`, written to `document.body` by `boardSettings.ts:326` when
the slider moves — a second input that `publishSquareUnit()` has never seen and that changes long
after it ran. TypeScript quantised correctly for the width it knew about; CSS then built a different
width out of it. Nor can CSS correct itself: the correction needs a floor *and* `devicePixelRatio`,
and dpr is not exposed to CSS at any level.

Portrait avoids the scaling trap entirely — its board is always the full width — and fails for an
unrelated reason recorded below.

### What the six board slots measure today

| slot | track | board drawn | remainder |
| --- | --- | --- | --- |
| desktop, own | 486.39 | 480 | 6.39 |
| desktop, partner | 486.39 | 480 | 6.39 |
| short landscape, own | 437.33 | 437.33 | 0 |
| short landscape, partner | 437.33 | 437.33 | 0 |
| portrait, own | 386 | 384 | 2 |
| portrait, partner | 165.33 | 165.33 | 0 |

Three of six are exact, and they are exactly the three whose track is a published unit times the
file count with nothing multiplied in afterwards.

## Goals / Non-Goals

**Goals:**

- Every board's container is a width its board can render exactly, at any zoom.
- A board and the parts stacked with it share a left edge, in every mode.
- Nothing resizes during load, or the reason it must is written down.
- A board is redrawn because the user acted, not because a timer fired.

**Non-Goals:**

- Any observer, or any post-hoc re-measurement. Explicitly excluded by the rule.
- Changing the quantisation itself. It mirrors chessgroundx and must keep mirroring it.
- Editing site.css, per standing preference; its body margin gets neutralised locally.
- A desktop-specific correction. The point is one rule the three modes share.

## Decisions

### 1. Quantise after scaling, not before

The unit is currently quantised and then scaled. It has to be scaled and then quantised, so the
result is a width the board can draw at that zoom.

Where the multiplication happens decides where the fix goes. Options:

- **Publish a scaled unit from `squareUnit.ts`.** The zoom lives in the settings store JS already
  owns, so a `--bug-tall-sq-a` / `-b` published per column keeps the flooring in the one module that
  owns the rule, and the tracks become `calc(var(--bug-tall-sq-a) * 8)` with no scale in them at
  all. Costs a variable per board.
- **Quantise in CSS.** `round(down, ...)` exists in modern CSS, so the track could floor to whole
  device pixels itself. Keeps the arithmetic beside the track, but puts a second copy of the rule in
  a second language — and cannot see `devicePixelRatio`, which the rule needs.

*Recommendation:* the first. `squareUnit.ts` exists precisely so this rule has one home, and its
comment already says so; the second option cannot express the rule fully in any case.

`--bug-seat-sq` at `:1243` and `:1246` is `calc(var(--bug-tall-sq) * var(--board-scaleA|B))` — the
same expression one square wide, so it becomes `var(--bug-tall-sq-a|b)` and stops being a source of
sub-pixel strip heights at the same time.

The cost of publishing a scaled unit is that the unit now depends on the zoom, so it must be
republished when the slider moves. That is an explicit user zoom, which the rule already names as a
sanctioned redraw point — this sits inside the rule rather than against it, and it is what makes
task 4.3 worth asking.

### 2. Portrait: one box owns the quantised width, and the remainder is spent outside it

`selection#bugboard` is `display: inline`. Its `width: 384px` and `margin-inline: auto` are
therefore both inert — a sizing property does not apply to an inline box, and `margin: auto` cannot
centre one. It takes 386 from its block child instead, and chessgroundx pins the 384 board to the
right, leaving 2px down the left.

Compounding it, the rule that sets that width and height never reaches the element at all in
portrait. The comment above `.own-board` closes at `bughouse.css:606` and then continues for seven
more lines to a second `*/`, so the parser reads `Keyed by ROLE ... */ .own-board` as one invalid
selector and discards the rule it introduces. `.partner-board` below it parses normally, which is
why only one of the two boards shows the symptom. Present at HEAD, not a working-tree artefact.

Probed live, in order:

| step | selection | wrap | board left | pocket left | misalignment |
| --- | --- | --- | --- | --- | --- |
| as-is | 386 | 386 | 2 | 0 | 2 |
| `selection { display: block }` | 384 | 384 | 1 | 0 | 1 |
| + stack 384, centred | 384 | 384 | 1 | 1 | 0 |

Making the element a block is what lets its width and `margin: auto` start working, but it only
halves the problem: the pocket is still laid out from the stack's left edge, so 1px remains. The
quantised width has to be carried by a box the misaligned parts are both inside, and centring *that*
closes the gap to zero, because they then share its left edge by construction.

**Implemented on `.round-app.bug` rather than on the stack.** The probe stopped at the stack, which
is the smallest box that fixes the pocket. It is not the smallest box that fixes portrait: the
partner's column is a sibling of the own stack, so a centred stack would sit 1px right of the
partner board above it — trading a 2px gap between a board and its pocket for a 1px step between the
two boards, which is the alignment the portrait comment exists to protect. The app is the smallest
box containing both, every child starts at the same x, and the remainder falls in the page margins
where nothing reads it as a gap. The stack then needs no width of its own.

That is the general form of the fix, and it is the same statement as decision 1 seen from the other
end: the container is what must be exact, and any remainder belongs outside the box the board and
its pockets share, never inside it. Stated that way it covers all three modes with no mode-specific
provision — which is the actual requirement.

Note that the capability already asks for this and portrait already violates it: "a board given the
full width of the page SHALL be centred on it", where portrait pins the remainder right.

The inline-box trap is documented in this same file on `.cg-wrap.pocket` — "display: block is
load-bearing, not tidying ... a sizing property does not apply to it at all, so max-content was
inert." It was found and fixed there and left in place here. Whatever comment ends up on the stack
should say the trap applies to every box in the chain, not to that one wrap.

### 3. A margin the measurement cannot eat, because grid alignment alone is not one

Publishing a device-pixel-exact unit is necessary and not sufficient. The track is a CSS length; the
browser holds a used length on a 1/64px grid; and a measured width can return one grid step under
what the track was given, because the box may start at a fractional offset. chessgroundx floors that
measurement, so a unit worth exactly N device pixels per square can be drawn as N-1 — a whole
square's worth. Measured on a live board at dpr 1.2000000476837158: 6.67px lost, on 23 of 77 zoom
steps.

Working the inequality through, the unit must exceed the exact one by at least (1/64)/8 = 1/512.
Snapping UP to the 1/512 grid gives a margin in [0, 1/512) — short by exactly the amount that
matters, which is why grid snapping alone fixed the default zoom and left 23 steps broken. The
margin is therefore ADDED (1/256) and the grid snapped afterwards.

The result is a slack that is small but no longer zero, and that is the honest trade: exactness is
unreachable wherever `512N/dpr` is not an integer, so the goal becomes a slack no board can render.
Measured after: at most 0.042px, at every mode, ratio and zoom tried — against up to 6.67px without
it. The cost is that the modes which previously measured exactly 0 now measure 0.031-0.042, a
thirtieth of a device pixel.

### 4. The zoom slider follows the column, so the redraw must too

`--zoom-a` scales the LEFT column, whose board is the viewer's own in every seating, because
roundCtrl switches boards between columns rather than re-keying tracks. `ZoomSettings.update()` chose
the chessground state by `boardName`, which is identity. For a board-A viewer the two coincide; for a
board-B viewer they cross.

Measured on a live game with a board-B viewer: moving slider `a` took the left column's track from
453px to 226px while the board sitting in it stayed at 446.67 — never told to re-measure, so every
click on it would resolve against a box it no longer occupied. Slider `b` then redrew that same left
board, against the other slider's track.

The redraw now resolves through the role classes markRoles() writes, which is where the page records
which board is in which column and what the stylesheet already selects on. Absent — the analysis page
marks no roles — it falls back to identity, which is what that page's single grid means by A and B.

### 5. Find what resizes during load before deciding whether it matters

`main` and `.round-app` move 386 -> 384 -> 386 in the first 130ms. Those two numbers are now
accounted for elsewhere: 386 is what the inline `selection` measures and 384 is the quantised width.
The likeliest reading is that the app is briefly sized from the board's box rather than from the
viewport, and that decision 2 removes the transient as a side effect. That is a lead, not a
conclusion — the transient is on ancestors of the element in question, so it still has to be
instrumented rather than assumed.

Instrument once, name the element, then decide. A trace of ancestor widths at 20ms intervals was
enough to find this; the same technique will name it. Check it again *after* decision 2 lands, since
the cheapest outcome is that there is nothing left to explain.

### 6. The zoom redraw should not be a timer

```js
// In case of bughouse updateZoom() doesn't trigger chessgroundx onResize() via ResizeObserver
// to prevent recursive call, so we have to force manual onResize() here
setTimeout(() => { updateBounds(state); renderResized(state); }, 100);
```

The 100ms is waiting for the CSS variable write to reach layout. That is a real thing to wait for,
but a timer is a guess at how long it takes. Under the rule, a zoom is a sanctioned redraw point, so
the redraw should be ordered against the style change — a `requestAnimationFrame`, or writing the
variable and measuring in the same synchronous pass — rather than scheduled and hoped for.

Worth checking whether the delay is needed at all now that tracks are quantised: if the track is
computed from the same scaled unit, the width after the variable write is knowable without
measuring — the unit is published by the same code that would do the measuring.

## Risks / Trade-offs

- **A scaled unit per board multiplies the published variables.** Two boards, three modes; naming
  has to stay legible or the CSS becomes a lookup puzzle.
- **The unit now depends on zoom**, so a missed republish is a stale track rather than merely a
  stale board. Bounded by there being exactly one writer.
- **`round(down, ...)` in CSS would be tidier at the point of use** and is the tempting shortcut;
  the cost is two copies of the quantisation rule that can drift, and it cannot see dpr.
- **Moving the quantised width from the board box to the stack** changes what the seat strips are
  measured against. They are pinned to the unit, not content-sized, so this should be inert — but it
  is the kind of inertness worth confirming rather than assuming.
- **Removing the load transient may be more invasive than it looks** if it comes from the site
  shell rather than this page. Bounded by deciding after it is named, not before.

## Open Questions

- ~~Is an exact width always achievable once scaling is quantised?~~ **No** — see decision 3. Below
  one device pixel is the strongest reachable claim, and centring remains the disposal rule.
- ~~Does the 2px load transient survive decision 2?~~ **No** — 125 samples at 20ms over an
  instrumented load show 384 from first appearance, never 386.
- ~~Is `ZoomSettings.update()`'s delay needed once tracks are quantised?~~ **No** — the snapshot taken
  synchronously after the slider event equals the one two frames later, at all six zooms tried.
- Three modules on this page (toolsPlacement, partsWidth, seatNamePlacement) hold ResizeObservers on
  non-body elements. None redraws a board, so this change's rule is intact, but the broader "body is
  the only observed element" rule is not. Untouched here; worth its own look.
