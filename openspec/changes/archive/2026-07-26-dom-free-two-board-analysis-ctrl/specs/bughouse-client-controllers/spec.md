## ADDED Requirements

### Requirement: Analysis controller performs no direct DOM manipulation
`AnalysisControllerBughouse` SHALL NOT create DOM elements or set styles/classes directly (no `document.getElementById`/`classList`/`style` mutation, no `patch()` calls building ad-hoc elements). All static, unconditional DOM setup SHALL live in `client/two-board/analysis/analysis.ts`'s initial markup instead; any setup that genuinely depends on runtime data unavailable at static-template-build time SHALL be decided from `model` in `analysis.ts` when a template-time-available signal suffices, or delegated to the dedicated rendering module already responsible for that DOM area (e.g. `analysisClock.ts`, `movetimeChart.ts`, `pgn.ts`, `engine.ts`) — never left inline in the controller.

#### Scenario: Static setup lives in the view
- **WHEN** the analysis page is constructed
- **THEN** the `gaugePartner` element's `flipped` class and the four `anal-clock-*` elements' `.anal-clock.*` classes are present from `analysis.ts`'s initial render, with no controller code assigning them afterward

#### Scenario: Model-decided visibility replaces a runtime DOM toggle
- **WHEN** the analysis page is constructed for a real game (`isAnalysisBoard` false) versus the plain variant analysis board (`isAnalysisBoard` true)
- **THEN** `#chart-movetime`'s initial visibility is decided by `analysis.ts` from `isAnalysisBoard` at render time, with no controller code toggling its `style.display` afterward

## MODIFIED Requirements

### Requirement: Behavior parity across the refactor
The refactor SHALL NOT change any user-visible behavior of bughouse round play or analysis, with two deliberate exceptions: the initial orientation of the analysis boards for a viewer who participated in the analyzed game (viewer-oriented boards, per the "Viewer-oriented initial board orientation on the analysis page" requirement), and the initial visibility of the `#chart-movetime` movetime-chart placeholder for a real, in-progress game with zero moves played (per the "Analysis controller performs no direct DOM manipulation" requirement — this case now shows an empty chart placeholder where it previously stayed hidden, since `isAnalysisBoard` is the only signal available at static-template-build time and does not distinguish "no game" from "a game with no moves yet"). Known divergences between the two controllers (e.g. round-only chat markers in the step loop, analysis-only eval stamping) SHALL be preserved in the respective subclass, not unified.

#### Scenario: Round play smoke
- **WHEN** a bughouse game is played after the refactor (moves on both boards, clock updates, game end)
- **THEN** moves, sounds, clocks, movelist, chat markers, and game-over controls behave exactly as before

#### Scenario: Analysis smoke
- **WHEN** a finished bughouse game is opened on the analysis page and the user scrolls plies, toggles the engine, and switches/flips boards
- **THEN** board states, evals, movelist, and PGN output behave exactly as before, except the documented initial-orientation change for participants and the documented zero-move chart-placeholder visibility change
