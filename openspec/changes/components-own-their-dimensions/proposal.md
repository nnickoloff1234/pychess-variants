## Why

A layout question about a component is answered today by code that is not the component. The
arrangement asks `squareUnit.ts` how wide a stack is, asks the DOM which page it is on, and asks a
stylesheet to make the answer true. The component itself is asked nothing, so nothing stops a call
site from forgetting what the component costs — and one already has.

**THE CASE THAT PROMPTED THIS, and it is a good one because the answer is already half-built.** A
stack on the analysis page carries a gauge: it is a two-column grid, pocket/board/pocket down the
first column, the gauge parked in the second on the board's row. `squareUnit.ts` knows what that
costs and says so:

```ts
const GAUGE_SQUARES = 0.31;                       // measured, not chosen
function stacksIncludeGauge() { return document.querySelector('.analysis-app.bug') !== null; }
/** A stack's width in squares: the board, plus the gauge where the page draws one. */
function stackSquares()       { return FILES + (stacksIncludeGauge() ? GAUGE_SQUARES : 0); }
```

Five call sites use it. **Portrait does not.** Its square is `quantize(availableWidth(), FILES) /
FILES` — bare `FILES`, so eight — and `portrait.css` then hides the gauge to keep that arithmetic
true, with a comment explaining that the stack would otherwise be "8.31 squares against an app of
8". A board letter went too, because it lives in the gauge's column.

So the knowledge existed, in a well-named helper, with its constant measured and its reason
written down — and a call site still bypassed it, and a stylesheet absorbed the consequence. That
is not a lapse to be fixed by being more careful next time. **It is what happens when knowledge
about a component lives outside it: the component cannot refuse to be measured wrongly.**

## What Changes

Nothing yet. **This change is a discussion first** — its first section is whether the idea survives
contact with one component, and the answer may be that it does not generalise.

The shape being proposed, in Nikolay's words: *"any kind of such calculations should not be written
as logic in one place, but returned by an object that owns each such component, so maybe we start by
creating such object for stacks, similarly to how we have objects for various widgets, and each such
object owns any kind of logic for returning its current or expected dimensions, so any logic that is
outside it and needs it to decide various arrangement calls that object or relies on the code in
that object to populate css properties needed for it — thus make each such component more
self-contained and concerns are grouped inside their object of concern."*

Concretely, for the first component:

- A **Stack** that answers what it is made of and what that costs — *how wide am I in squares, given
  what I am showing* — instead of `squareUnit.ts` deriving it and the DOM being asked which page
  this is.
- Arrangement code asks the stack rather than computing from `FILES` and a constant, so a call site
  that forgets is a call site that does not compile rather than one a stylesheet has to cover for.
- If it holds for stacks, the same question for the other components: the parts, the seat strips,
  the preset panels, the tab bar.

## Capabilities

To be decided with the design. Likely `two-board-stylesheet-layout` or a new capability about where
a component's measurements live; naming it before the discussion would prejudge the outcome.

## Impact

- `client/two-board/squareUnit.ts` — `stackSquares()`, `stacksIncludeGauge()`, `GAUGE_SQUARES` and
  the five call sites.
- `client/two-board/common/` — wherever a Stack would live.
- `static/two-boards/components/stacks.css`, `layout/portrait.css` — the rules that currently
  compensate.
- Related and overlapping: `further-round-analysis-unification` is the same story at a different
  scale — a part declared in one place and consumed in another, with a silent mismatch. Its task
  1.3 already asks "what can the declaration express?", and the answer here should not contradict
  the answer there.
- Blocked on nothing, and blocking `portrait-gauges-and-board-letters`'s implementation only in the
  sense that doing that work first would put the fix in `squareUnit.ts` rather than in a stack.

## What this change is NOT

- **Not a rewrite of the layout engine.** The arrangement cascade, the homes and the drop logic stay
  where they are. This is about who answers questions about a component's size.
- **Not a promise that it generalises.** One component first, and an honest verdict.
