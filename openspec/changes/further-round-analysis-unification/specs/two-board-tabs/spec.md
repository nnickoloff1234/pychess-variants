## MODIFIED Requirements

### Requirement: Two-board pages consume the shared widget

The bughouse analysis page (`client/two-board/analysis/`) SHALL construct the widget in `analysis.ts` with its own id prefix and mount its panels — and, when the page describes a game, its tablist — inside the `under-board` element, which the page itself renders. `isAnalysisBoard` (`model['gameId'] === ''`) SHALL decide whether the tablist is mounted, and SHALL continue to be computed once in `analysis.ts` for reuse by other view decisions. `analysisCtrl.ts` MUST NOT reference the tabs module at all. The FEN & PGN panel SHALL carry `panelClass: 'fenpgn-panel'` on its part, styled by a rule of that name in the stylesheet.

The bughouse round page (`client/two-board/round/`) SHALL construct the widget with its own id prefix and mount the tablist and its panels inside the tools-area element, which the page itself renders.

Both pages MAY declare more than one part per tab, and both do: a tab is split wherever the cascade must be able to move one piece of it without the rest. A part is the unit the arrangement moves, so what is one part is a layout decision and not a reading-order decision.

The single-board `client/analysis/` page, its own tab-equivalent code (if any), and `static/analysis.css`'s id-keyed panel rules are unaffected.

#### Scenario: Normal game analysis
- **WHEN** a finished bughouse game's analysis page loads
- **THEN** both tabs are visible and clickable, switching between the move-time chart and the FEN/PGN panel exactly as before, and the FEN/PGN panel retains its styling

#### Scenario: No-game analysis board
- **WHEN** the plain variant analysis board (no game, `isAnalysisBoard` true) loads
- **THEN** no tablist is present in the markup, the default panel renders visible, and no controller-side call is involved in reaching that state

#### Scenario: Each page owns the element that holds both parts
- **WHEN** either page's markup is inspected
- **THEN** the element containing the tablist and the panels is one the page rendered, and the widget rendered only those parts inside it

#### Scenario: Two consumers, no interference
- **WHEN** the analysis page and the round page are each rendered
- **THEN** each constructs its own widget, and neither page's ids appear in the other

#### Scenario: A tab is split because the layout needs it split
- **WHEN** a tab holds content the arrangement must be able to place separately
- **THEN** that content is declared as its own part, and the number of parts is not required to match between the two pages

#### Scenario: Single-board page unaffected
- **WHEN** the single-board analysis page (`client/analysis/index.ts`) loads
- **THEN** its own `panel-4` element and `static/analysis.css`'s `#panel-4` rule continue to apply exactly as before this change

## ADDED Requirements

### Requirement: A declared part is always mounted

A page SHALL mount its tab parts from the same declarations it builds the widget from, so that
declaring a part is sufficient for it to appear. A page MUST NOT address a part by a hand-written
index, because an index that does not match the declarations fails silently: the element is simply
absent, and anything that finds its content by id disappears with it.

Where a page's parts are not mounted in one uniform sequence — some grouped, some free-standing,
with page furniture belonging to no tab among them — that arrangement SHALL be expressed in the
declaration rather than in hand-written mounting code.

#### Scenario: A part is added to a tab
- **WHEN** a part is added to a tab's declarations and nothing else is changed
- **THEN** the part is mounted and rendered, and no separate mounting call has to be written

#### Scenario: A tab count that differs between builds
- **WHEN** a page build declares fewer tabs than another build of the same page
- **THEN** mounting follows the declarations of that build, and no index reaches past them

#### Scenario: Furniture that belongs to no tab
- **WHEN** an element the arrangement places is not part of any tab, such as the end-of-game
  controls or the bar holding the tablist
- **THEN** it is declared alongside the parts as something the arrangement may place, and its
  presence does not depend on which tab is selected

### Requirement: A slot's occupants are declared once

Where more than one part occupies the same layout slot — never coexisting, because they belong to
tabs the strip shows one at a time — that membership SHALL be declared in one place. The stylesheet's
placement rules and the arrangement code's list of what may move SHALL both follow that declaration
rather than each restating the set of parts.

A part's identity SHALL NOT be coupled to another file only by a matching selector string.

#### Scenario: Two parts share a slot
- **WHEN** two parts occupy one slot because they never appear at the same time
- **THEN** that pairing is stated once, and neither the stylesheet nor the arrangement code repeats
  the pair

#### Scenario: A part is renamed
- **WHEN** the class naming a part changes
- **THEN** nothing else has to be changed for the part to keep its slot and stay movable, or the
  build fails — it SHALL NOT silently stop being placed or stop being moved

#### Scenario: A part the arrangement cannot move
- **WHEN** a part is placed by the stylesheet but absent from what the arrangement may move
- **THEN** that is a contradiction in one declaration rather than agreement between two, so it
  cannot be reached
