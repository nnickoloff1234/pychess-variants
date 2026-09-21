## Context

Six things can start a layout pass on a two-board page, and three of them write values the others
read.

```
window resize ───────────► squareUnit.publishSquareUnit()
zoom slider → setBoardZoom ┘  writes --bug-tall-sq-a/b, --bug-app-h, the tools-* home class

ResizeObserver (seatNamePlacement) ──► pass()
   watches  app, .bug-partner-stack, #mainboard cg-board, #bugboard cg-board
   writes   own-name-outside / partner-name-outside      → changes stack heights

ResizeObserver (toolsPlacement) ─────► pass()
   watches  app, column, .bug-partner-stack, AND EVERY DROPPABLE PART
   writes   drop-*, strip-in-zoneb, --bug-preset-btn, --bug-preset-gap, --bug-app-content-h
                                                        → changes those same parts' sizes

notifyOnToolsHomeChange ─────────────► pass()
standing tab onSelect ───────────────► pass()
movetimeChart ResizeObserver; main.ts resize → notifyChessgroundResize
```

Three cycles are internal to `toolsPlacement`:

```
--bug-preset-btn ──► preset panels resize ──► observer ──► place() ──► --bug-preset-btn
drop-* ───────────► part leaves the tools region ──► region shrinks ──► preset size ──► drop-*
--bug-app-content-h ──► app height ──► both observers ──► place()
```

and one crosses modules:

```
square size ──► cg-board resizes ──► seatNamePlacement ──► *-name-outside
           ──► stack height ──► toolsPlacement (watches the stack) ──► place()
```

What `place()` reads, and who writes it:

| reads | written by | verdict |
|---|---|---|
| `toolsRegionHeight/Width` — the resolved grid template | its own `drop-*` classes | cycle |
| `heightOf(part)` — the part where it currently sits | its own `drop-*`, `--bug-preset-btn` | cycle |
| `stripHeight` — the strip where it currently sits | its own `drop-tools4` / `-b` | cycle |
| partner stack rect, `tallestStack()` | squareUnit squares, seatNamePlacement classes | ordering |
| `--bug-app-h`, `declaredMin()`, the viewport | squareUnit / static CSS | clean |

## Goals / Non-Goals

Goals

- One invariant: a pass reads nothing a pass writes, so a repeated pass cannot move the result.
- Kill the measured oscillation and the measured lag with the same cut, and prove both from the
  survey.
- Keep every arrangement the layout chooses today for a settled viewport.

Non-Goals

- Not redesigning which home or which drop a viewport gets. If a settled arrangement changes, that
  is a regression to explain, not an improvement.
- Not reducing the number of observers for its own sake. Once re-entry is harmless, an extra pass
  costs a frame, not a defect. Whether `toolsPlacement` still needs to watch every part is a
  separate question, answered after the invariant holds and judged on frames, not correctness.
- Not introducing any cross-observer bookkeeping — no generation counter, no dirty flag, no "the
  other observer already handled this". That is the approach this design exists to avoid.

## Decisions

### The invariant, not a loop and not a guard

The obvious repairs are to iterate to a fixed point, or to detect re-entry and suppress it. Both
are rejected. A loop terminated by a no-op guard hides the circularity rather than removing it and
leaves the answer dependent on the iteration count; bookkeeping between observers makes every new
trigger a question about what has already run. The invariant does neither: it makes the second
pass produce what the first did, so nothing has to know a second pass happened.

### The cut is the grid template, not the region's height

The first draft of this design said the fix was to size the preset button from the two widths
rather than from a region height. Instrumenting the cycle showed that is not enough, and the
reason is worth stating because it is the whole defect in one line: **the widths come from the
same place the height does.**

`stripWidth` is the last px track of `getComputedStyle(column).gridTemplateColumns`; `zoneAWidth`
is `toolsRegionWidth()`, the same property; `regionHeight` and `zoneA` are sums over
`gridTemplateRows`. The `drop-*` classes select which `grid-template-areas` / `-columns` / `-rows`
is in force. So every region the cascade measures against is a projection of the cascade's own
last answer.

The measured orbit, analysis page 904x686, board A near 72.4 with board B near 99.5:

| | regionHeight | stripWidth | zoneA | btn | engine panel |
|---|---|---|---|---|---|
| X | 626.00 | 61.67 | `NaN` | 9.93 | zone B (`drop-tools3-b`) |
| Y | 514.57 | 150.77 | 81.21 | 27.75 | zone A (`drop-tools3`) |

Read it as a loop and it is not subtle: in X the engine is out of the tools column, so the column
is 61.67 wide, so the button is 9.93, so the panel measures 133.69 tall — and zone A refuses it,
so it stays in zone B. Applying that writes a template in which the tools DO have rows, so Y
measures a 150.77 column, a 27.75 button and a 74.77 panel, which fits zone A — and applying THAT
writes X's template back.

So the rule is: `place()` reads no resolved grid template, for width or for height. The regions
have to be derived from what squareUnit publishes — the square sizes, the budget — and from the
declared track definitions, not from the tracks as resolved under the classes `place()` just set.

### Two faults that give the cycle its gain

Both were found by instrumenting, and both are worth fixing whatever else changes.

`toolsRegionHeight()` returns `NaN` when no row of the template in force names a tools slot. It
has two consumers and only one checks:

```ts
const zoneA = Math.max(0, toolsRegionHeight(column) - partnerStackHeight);   // NaN, unguarded
const regionHeight = Number.isFinite(toolsRegion) ? toolsRegion : budget;    // guarded
```

`Math.max(0, NaN)` is `NaN`, and every comparison against `NaN` is false — so in state X the zone
A test does not refuse the engine panel because it does not fit, it refuses it because the
question could not be answered. That is what makes X reachable at all.

And the guarded consumer's fallback is the app's whole budget: 626px offered as "the tools'
region" where the real one is 514.57. A fallback should be a region the tools could actually have;
this one is larger than any of them.

### A part is charged what it would cost where it is going

`heightOf()` measures a part where it is. For a preset panel that is two rows of five in the strip
and one row of ten when dropped; for the strip it is whatever row it has been given. The cascade
already computes `droppedPanelHeight` for exactly this reason and uses it for preset panels only —
the same treatment extends to the rest, and the measurement of last resort is the part's content
height, not its box.

### Every pass assigns every class it owns

`strip-in-zoneb` is toggled inside `if (hasZoneB && !tools-beside)`. Portrait names no zone B, so
the branch is skipped and the class survives the resize: arriving at `P1` from `T1` keeps it,
arriving from `L1` or `D1` does not. Its rules live inside the landscape media query so nothing is
visibly wrong today, which is what makes it worth fixing now rather than after it matters.

### The survey has to drive the passes itself

The existing stale-until-nudged check probes twice, nudges between, and reports a difference. It
cannot see a cycle: both probes sit inside the orbit, and `settle()` reports settled at every
point of it because the page is genuinely stable for three frame pairs between flips. The
convergence check therefore drives N passes and looks for a state that returns — the same test
that found the cycle by hand.

### Declarations beat modelled measurements

The sharpest cut is not the template read — it is that a part's cost is a measurement at all.
Instrumenting the oscillation showed the decision reversing on the engine panel's own height: 90px
in the tools column, 134px in a 56px implicit track, because its content wraps. The cascade
charged 74.77 — the height where the part WAS — to decide whether it fitted a region where it
would be 134. Neither state is a fixed point of that decision.

The part already declares what it needs: `--bug-part-min-w: 19ch; --bug-part-min-h: 3.2em`, about
45px. `const need = Math.max(height, min.height)` makes the measurement win every time, so the
declaration has never been the operative number for this part. Compare the declaration alone and
45 ≤ 81.21 holds in both phases: the decision is a constant, the second pass writes nothing, and
the chain dies whatever the template says.

This re-ranks the work. An earlier draft made "charge the part what it would cost where it is
going" the requirement — but that is still a measurement, and a modelled one, so it still has to
be proved stable. A declaration is stable by construction. It costs an inventory: only two
selectors declare anything today, and the initial value is 0, so flipping the comparison before
every droppable part has an honest declaration would make the undeclared ones free.

### Why this is a programme and not a fix

The oscillation that started this is already fixed, in `790702ed8`, by giving the analysis page the
template its twin had. Nothing on the page is broken today. What is open is that the same
mechanism produced the same class of defect twice — once on each page — and that both were found
by hand rather than by the survey.

So the work that matters is the map: for every component, which of its sizes the placement uses,
what determines its actual size, and what it can change about another component or about the
template in force. Content-sized content inside a content-sized container is the shape both known
oscillations took; that shape can be looked for rather than waited for.

The template inventory comes first because it is the cheapest step that can shrink everything
after it, and because one page having a rule its twin lacked is evidence the set is not held in
one mind.

## Risks / Trade-offs

- **The cap re-expressed wrongly makes buttons overflow their region.** The height input is doing
  real work; only its source is wrong. Mitigation: the survey already has a paints-outside check
  and a tap-target check, and both reproductions are walked.
- **A settled arrangement changes somewhere.** Charging a part its would-be height rather than its
  current one is a different number, and some rows may legitimately move. Mitigation: diff every
  row's home and drops against the run before the change and account for each difference, which is
  the routine this work has used throughout.
- **The cross-module ordering is not a cycle and is being left.** `seatNamePlacement` writes
  classes that change stack heights `toolsPlacement` reads, but nothing in those classes depends
  on the tools. If that proves wrong, the invariant names it as a defect rather than leaving it to
  be rediscovered.
- **The convergence check costs frames on every row.** N extra passes per row across 286 rows.
  Mitigation: N small, and only the published state is compared.

### The reproduction is narrower than the survey's zoom grid

Confirmed by hand on the sliders at A=72.375, B=99.5. Neither value is on the 1.15625 step grid,
and both boards have to be off their extremes: two full on-grid sweeps of board A with board B
pinned at 100 did not enter the cycle, having stepped over the band. A survey that only visits
100, the minimum, and one part-way step cannot be relied on to find a defect of this shape by
chance — which is the argument for walking the stated values as a declared row, and for the
convergence check being a per-row test rather than a sweep.

One earlier claim is withdrawn: a `62x134` engine panel spilling 72px, reported as a separate
stable failure just above the cycle, is one PHASE OF THIS ORBIT sampled twice in the same phase.
There is no distinct prelude defect; the three-column arrangement at that zoom is correct.

## Migration Plan

Each edge is cut on its own commit, with the full survey between, so a row that moves can be
attributed. The two reproductions are added to the matrix FIRST, so they fail before the fix and
pass after it.

## Open Questions

- Which components are legitimately sized by their content and must stay that way — the move list
  and the chat log take spare room by design — and how they declare "what I will accept" rather
  than "what I need".
- Whether a component harness (isolated components, and a visualisation of every area template and
  reachable arrangement) is worth building, and whether it complements or replaces the layout
  matrix. Deliberately not started before the map exists.

- What the regions are derived from once the template is off limits. The candidates are the
  declared track definitions (the custom properties the templates are built from, which no class
  rewrites) and arithmetic from squareUnit's published squares and budget. The first keeps one
  statement of the layout; the second does not depend on CSS at all. Not yet settled.
- What `toolsRegionHeight()` should return instead of `NaN`, given a fallback must be a region the
  tools could genuinely have and the current one is larger than any of them.
- Should `toolsPlacement` stop observing the parts once re-entry is harmless? It would save frames,
  but a part's CONTENT can change — a chat message, the move list growing — and that is a real
  trigger. Answer after the invariant holds.
