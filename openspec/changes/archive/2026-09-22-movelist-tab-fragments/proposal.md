## Why

The analysis page's Moves tab is one panel holding four different things: the engine box (its
switch, the two boards' scores, the principal variations and the Multiple-lines slider), the move
list, the flip/swap/back/forward buttons, and `#misc-info`. As one panel it is one grid item, and a
named grid area holds exactly one item — so the whole tab can only ever be in one place at a time.

That is the obstacle in front of the zone-A question. Zone A — the band the shorter partner board
frees — measured 177x291 and EMPTY on the analysis page at 701x829, while the tools column beside
the boards was the only home anything had. The parts that could plausibly live there are the engine
box and the button row: both are content-height, neither needs the movelist's scroll, and both are
read at a glance rather than followed line by line. Neither can be moved while they are welded into
one panel with the move list.

The tab widget already allows this: a tab is an ordered list of PARTS, each an independently
mountable vnode (`2026-08-09-separable-tab-widget-parts`, `2026-08-15-multi-part-tab-widget`). The
round page already uses it — its Chat tab declares the chat and one part per preset group. The
analysis page declares one part per tab and has never used the mechanism.

## What Changes

The Moves tab becomes THREE PARTS instead of one. It stays ONE TAB: a fragment is a placement
unit, not a switcher entry, so every part of the selected tab is shown together and the
"engine and moves are read together" requirement is untouched.

- **The engine fragment** — `#ceval` (the switch, both boards' scores and depths, the engine name)
  and the pv box (the two PV columns and the Multiple-lines slider with its readout).
- **The move list fragment** — `.movelist-block` and `#misc-info`.
- **The controls fragment** — `#move-controls`, the flip / switch / back / forward buttons.

**NOTHING MOVES ON SCREEN.** The three parts are mounted inside one group element that is the grid
item their single panel used to be, and that element takes the area the panel took in every one of
the page's homes. This is the round page's `.bug-presets-group` in reverse: there the group is
dissolved by default and becomes a box only in zone B; here it is a box today because all three
parts still live in the tools column together, and the mode that relocates one of them is what will
dissolve it.

## Capabilities

- `bughouse-round-layout` — the requirement that the analysis tools are one tabbed panel is where
  the Moves tab's contents are stated. It gains what a fragment is and what mounting one costs.

## Impact

- `client/two-board/analysis/analysis.ts` — the Moves tab's declaration and the mount loop.
- `static/bughouse.css` — the group element, and the area it takes in each home.
- No server change, no message change, no controller change. `movelist.createButtons()` finds
  `#move-controls` by id and patches into it, so it does not care which box the element sits in.

## Not in this change

- **THE RULE FOR WHEN A FRAGMENT RELOCATES TO ZONE A.** That is the next change, and it is where
  zone A's height, the drop cascade in `toolsPlacement.ts` and the per-part grid areas belong.
  Defining the fragments first means that change is about the rule and nothing else.
- The engine settings the single-board page has and this page does not (CPUs, Memory, arrow,
  infinite analysis, NNUE). Deferred deliberately; if they ever land they land in the engine
  fragment, which is one reason to draw its boundary now.
