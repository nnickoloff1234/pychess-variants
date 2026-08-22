# Tasks

**The rule every task is judged against:** a size is computed from inputs that do not depend on it.
No guard, no epsilon, no settling. If the gap needs one to terminate, the shape is wrong — see
[[no-guard-based-termination]] and the ordering in design decision 5.

**The baseline, so a change can be told from a coincidence.** Measured at 1914x827, dpr 1, own board:
spare height 6.96px at full zoom, 66.96 at 91%, 156.96 at 80%, 306.96 at 60%, 456.96 at 40%. Labels
overhang 16px and currently land on the strip — measured overlap 15.97px. Short landscape at
1276x551 has 4.3px spare.

**Struck from the baseline:** "the bottom strip already runs 33.66px past the fold at full zoom".
It does not. That was sampled during a zoom sweep before the ResizeObserver had re-decided the name
line, so it caught a transient. Steady-state overflow is zero at every zoom from 40% to 100%.

## 1. Clear the ground

- [x] 1.1 `--bug-coord-gap` is `@property`-registered and set in the tall-landscape block, and **nothing reads it**. Decide it in or out in one move rather than leaving a third state
- [x] 1.2 Delete or correct the three comments describing a five-row template with a gap row, a `minmax(0, labels)` track, and a `reservedGap` in `seatNamePlacement`. None of the three exists; the current template has two rows and that identifier is nowhere in the file
- [x] 1.3 Confirm what `--files-bottom` and `--ranks-right` are set to and where, so the overhang the gap is sized against is read from one place rather than assumed to be 16px

## 2. Each mode publishes its spare height

- [x] 2.1 Tall landscape: `--bug-tall-app-h - 10 x --bug-tall-sq-a` for the own column and the `-b` twin for the partner's. Confirm against the baseline above before building on it
- [x] 2.2 Short landscape: the same shape over `--bug-sq`, which should resolve to about 4.3px — below the floor, so zero
- [x] 2.3 Portrait: the own stack's budget is its grid row, NOT the app. Established: the row template gives the slack to the partner's column (`minmax(0, 1fr)`) and sizes the own stack `min-content`, so no spare height reaches either stack — portrait's room is genuinely zero. It therefore declares nothing and takes the shared 0px default, which is the honest statement rather than an expression contrived to evaluate to zero
- [x] 2.4 One variable name across all three, so the rule that consumes it is written once
- [x] 2.5 Verify no mode's expression reads a board, a strip, or anything sized from the gap

## 3. The gap, and labels that scale with it

- [x] 3.1 `clamp(0px, <room>, <overhang>)`, per column, applied so it pushes the strip rather than growing the board
- [x] 3.2 Below the legibility floor, clamp to exactly `0px` — exactly, because section 4's query matches the value
- [x] 3.3 Tune the floor on the live page. **12px**, not the 8 it started at. Driven by overriding `--bug-coord-room` across the ramp and reading the label each value produced: 16 -> 12px, 14 -> 10.5, 12 -> 9, 10 -> 7.5, 8 -> 6. At an 8px floor the last external label is 6px against an 18.3px internal one, so the labels would shrink in order to stay outside when going inside would treble them. Recorded beside the constant
- [x] 3.4 Scale the file labels to the gap so a label is whole at every size, never clipped
- [x] 3.5 `--files-bottom: calc(-1 * var(--bug-coord-gap))`, which makes the positional half continuous and needs no switch at all
- [x] 3.6 Confirm the labels still do not take pointer events. Untouched: `coords { pointer-events: none }` in chessground.css and again per-mode in this file, and the gap changes position and size only. With a full gap they no longer overlap the strip at all — measured overlap -0.03px, against 15.97px before

## 4. The switch, asked once, naming no mode

- [x] 4.1 `@container style(--bug-coord-gap: 0px)` carrying the existing internal-coordinate styling — colour, alignment, padding, size
- [x] 4.2 Delete the media query listing portrait and short landscape. They must keep their current appearance through the arithmetic alone; verify by measurement, not by eye
- [x] 4.3 Establish the container the query resolves against, and that it is one both stacks sit inside
- [x] 4.4 Check the browsers this ships to. Made safe by construction instead of by testing, which is the better answer to a question the Chrome-only harness cannot settle: the polarity is inverted so the ON-SQUARE treatment is the unconditional default and `@container not style(--bug-coord-gap: 0px)` moves the labels out. A browser without style queries now keeps every coordinate readable and merely loses the outside placement, where before it would have rendered them at `calc(0px * 0.75)` and shown nothing at all on phones. Verified both directions in Chrome: external restores opacity 0.8, the -15px rank gutter, the translateY nudge, 0.85em ranks and inherited grey; internal keeps 22.8px parity-coloured labels on the squares. The degraded path itself is untested — it needs a browser old enough to lack the feature
- [x] 4.5 Confirm the desktop mode flips to internal at full zoom and back at lower zooms, cleanly, with no intermediate state that shows both treatments

## 5. Names take what the labels left

- [x] 5.1 `seatNamePlacement.spaceFor()` subtracts the gap — the `reservedGap` its comment already claims exists
- [x] 5.2 Confirm the dependency runs one way only: the name decision reads the gap, the gap reads nothing the name touches
- [x] 5.3 Record which zooms change behaviour. The own name's extra line now switches off between 79.8% and 90.8% zoom: granted at 79.8 and below, denied from 90.8 up. That is the gap taking its 16px first, exactly as intended, and nothing overflows at any zoom in the range
- [x] 5.4 Confirm the full-zoom overflow is no worse than before. There is no overflow, before or after: steady-state document overflow is 0 at every zoom from 40% to 100%, and the stack fits the app at each (760.03 of 767 at full zoom, 766.03 at 98.3%). The 33.66px in the original baseline was a sampling artefact — see the note at the top of this file

## 6. Verify on the live page

- [x] 6.1 Four-window harness, all three modes, fresh loads
- [x] 6.2 Desktop: sweep the zoom range and record gap, label size, and coordinate mode at each step. The transition through the floor is the interesting part, not the endpoints
- [x] 6.3 Confirm full zoom is unchanged. The GEOMETRY is: gap 0, stack exactly 10 x 76 = 760.03, nothing moved. The coordinates are not — they are now drawn inside the squares at 22.8px, which is the second half of this change doing its job at the one desktop zoom that has no room. Worth stating plainly because the proposal promised full zoom would 'look as it does today', and the layout does while the labels deliberately do not
- [x] 6.4 Confirm portrait and short landscape are unchanged after the media query is deleted
- [x] 6.5 Confirm the two boards can hold different gaps at different zooms without either affecting the other
- [x] 6.6 `yarn typecheck`, `yarn test`, and a hard reload after syncing static — a CSS-only swap leaves chessgroundx stale

## 7. Polarity inversion, after the fact

- [x] 7.1 Make the on-square treatment the unconditional default and move the outside treatment into `@container not style(--bug-coord-gap: 0px)`, so a browser lacking style queries degrades to readable labels rather than to none
- [x] 7.2 Restore chessground.css's own values by hand in the outside block — opacity 0.8, `right: var(--ranks-right)`, `width: 12px`, `bottom`, `height`, `text-align: center`, `font-weight: bold`, `line-height: normal`, `padding: 0`, `translateY(39%)`, 0.85em ranks — because an override cannot be reverted to an earlier author rule without cascade layers
- [x] 7.3 Keep the parity colours gated positively. Undoing them would mean repeating sixteen five-class selectors to outrank them, and they are meaningless on a label that is not on a square. Caught during implementation: a `color: inherit` restore at (0,3,2) would silently have lost to them at (0,5,2)
- [x] 7.4 Re-verify both directions and all three modes after the inversion. Desktop at 79.8% zoom: gap 16.03, bottom -16px, opacity 0.8, files 12px grey, ranks 10.115px in the -15px gutter with the nudge. Desktop at 100%: gap 0, bottom 0, opacity 1, files 22.8px in alternating square colours. Portrait and short landscape: unchanged, reaching the default without a query
