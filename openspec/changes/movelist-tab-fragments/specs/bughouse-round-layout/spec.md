## MODIFIED Requirements

### Requirement: The analysis tools are one tabbed panel

The analysis tools SHALL be a single tabbed panel, not a stack of separately placed elements.

The move list, the move controls, and the engine — its switches, its name panel, its principal
variation and its position information — SHALL be in ONE tab. They are one activity: reading the
game. Separating the evaluation from the move it evaluates would make a reader choose which half to
see.

**BEING ONE TAB IS NOT BEING ONE PANEL.** That tab SHALL be declared as three PARTS — the engine
box, the move list, and the move controls — because a part is the smallest thing the page can place
and a single panel can only ever be in one place at a time. A part is a PLACEMENT UNIT, not a
switcher entry: selecting the tab shows every one of its parts, so the reader still sees the
evaluation beside the move it evaluates wherever the parts are mounted.

The three parts SHALL be:

- **the engine box** — the engine switch, each board's score and depth, the engine's name, the two
  principal-variation columns and the Multiple-lines control with its readout;
- **the move list** — the movelist block and `#misc-info`;
- **the move controls** — the flip, switch, step-back and step-forward buttons.

Declaring them SHALL NOT move anything on screen. Where every part of a tab still shares one home,
the page SHALL mount them inside ONE GROUP ELEMENT which is the grid item that tab's single panel
was, and that group SHALL take the area the panel took in every home the page has. A named area is
one rectangle and holds one item, so parts assigned the same area OVERLAP rather than stack — the
group is what keeps them a single item until an arrangement has somewhere else to put one.

The group SHALL be the page's own element, not the widget's: the tab widget aggregates nothing.

The game information SHALL be a second tab.

**IT SHALL BE THE PAGE'S ONLY TABBED PANEL.** Everything that is not a board belongs to it — the move
list and engine, the game information, the chat, the move-times chart and FEN & PGN. There were two
for a while, this one beside the boards and a second beneath them, which meant two places to look for
something not on screen and cost the page a full-width row it could not afford: that row is what put
the chart below the fold in every mode, and removing it brought the app from 843px to 548px in a
612px viewport in landscape.

The page SHALL mount one panel per declared PART, derived from the declarations rather than listed
separately, so that a conditional tab — or a tab that gains a part — cannot leave the mounts out of
step with the declarations.

Any panel that exists in the page's markup but renders nowhere visible SHALL be given a tab rather
than left unreachable or deleted. A panel nobody can see cannot be judged, and deleting it decides
its fate without ever having looked at it.

#### Scenario: Engine and moves are read together
- **WHEN** a player opens the tab holding the move list
- **THEN** the engine's evaluation and its principal variation are visible at the same time

#### Scenario: The Moves tab is three parts
- **WHEN** the Moves tab's declaration is inspected
- **THEN** it declares three parts — the engine box, the move list, and the move controls — and the
  tab strip still shows one Moves tab

#### Scenario: Fragmenting changes no arrangement
- **WHEN** the page is rendered after the Moves tab is split into parts
- **THEN** the engine box, the move list and the move controls occupy the same rectangle, in the same
  order, that the single Moves panel occupied, in every one of the page's homes

#### Scenario: Parts sharing a home are one grid item
- **WHEN** several parts of one tab are mounted in the same home
- **THEN** they are children of one group element which carries the grid area, and no two of them
  are assigned the same area

#### Scenario: Every declared part is mounted
- **WHEN** a tab gains or loses a part, or a tab is present only conditionally
- **THEN** the number of mounted panels follows the declarations without a second list to update

#### Scenario: Game info has its own tab
- **WHEN** the tools panel is inspected
- **THEN** the game information is one of its tabs

#### Scenario: An invisible panel is surfaced rather than dropped
- **WHEN** the page's markup contains a panel that renders nowhere
- **THEN** it is given a tab of its own, so that what it contains can be seen and then decided upon
