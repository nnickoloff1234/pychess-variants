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

### Widths, not the region's height, size the preset button

`publishPresetSize(column, { width, height }, cap)` takes a height today, and the height is
`toolsRegionHeight()` — the sum of the template rows the tools occupy, which is exactly what a
drop changes. This is the edge behind both measured failures:

- at `P1` the strip's 40.62px row is inside the region, so the first pass sizes the button at
  36.00px, drops two parts, and the region it measured no longer exists;
- on the analysis page at 904x686 the same edge has enough gain to reverse, and the button
  alternates 27.75 ↔ 9.93 while the engine panel alternates zone A ↔ zone B.

The file already states the intended rule — *"the size no longer depends on what drops — it is a
function of the two WIDTHS, both known before any decision"*. The height is there to stop a button
growing taller than the region it sits in. That cap has to be re-expressed against something the
drops do not move: the region as the template defines it with nothing dropped, or the app budget
less the taller stack, both of which are squareUnit's outputs rather than `place()`'s.

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

## Migration Plan

Each edge is cut on its own commit, with the full survey between, so a row that moves can be
attributed. The two reproductions are added to the matrix FIRST, so they fail before the fix and
pass after it.

## Open Questions

- What replaces the height cap on the preset button: the undropped region from the template, or
  the app budget less the taller stack? Both are outside `place()`'s own writes; which is the
  truer statement of "a button may not be taller than where it sits" is not yet settled.
- Should `toolsPlacement` stop observing the parts once re-entry is harmless? It would save frames,
  but a part's CONTENT can change — a chat message, the move list growing — and that is a real
  trigger. Answer after the invariant holds.
