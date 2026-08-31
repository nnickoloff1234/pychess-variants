## Why

Landscape has just closed two gaps that portrait still has, so the same controls now behave
differently depending on which way the phone is held. Both gaps were left open deliberately —
the standing rule during the landscape work was that portrait is not to change — so this is
the record of what was skipped rather than a newly discovered defect.

**POSTPONED.** Nothing here is urgent: portrait is correct as it stands, it is simply less
capable than landscape now. Pick this up when portrait is next being worked on, most likely
alongside `portrait-gauges-and-board-letters`, which is already queued against the same mode.

## What Changes

- **The preset panels get the panel background in portrait, as they now have in landscape.**
  `--bg-color0` is painted on `.chatpresets-panel` and `.bug-presets-group` so the ground
  between the buttons belongs to the panel and the block reads as one object. Portrait
  currently carries an explicit opt-out — a rule setting those two back to `transparent` —
  which exists only to honour the "do not change portrait" rule and would be deleted here.
  Its comment says as much, so the opt-out is self-documenting until then.

- **Portrait gets somewhere for the preset buttons to flow to when there is room.** Landscape
  gained two zones and a fill order: zone A is the width the partner board frees when it is
  scaled down, zone B is the full width under both boards, and the tab bar takes zone B first
  with the presets landing above it. Portrait has one arrangement and no zone at all, so a
  portrait viewer with space to spare gets no benefit from it.

- Whether portrait's zones are the same two, or one zone under the lower board, or something
  shaped to the single-column grid, is an open question — see Design.

## Capabilities

### New Capabilities

_None._ Both items are changes to how an existing capability behaves in one orientation.

### Modified Capabilities

- `bughouse-round-layout`: portrait gains a preset panel surface, and gains at least one zone
  the preset parts can move into when the boards leave room — the behaviour landscape
  specifies today, stated for the other orientation.

## Impact

- `static/bughouse.css` — the portrait block's opt-out rule (`.round-app.bug .chatpresets-panel,
  .round-app.bug .bug-presets-group { background-color: transparent }`), and portrait's
  `grid-template-areas` if zones are added.
- `client/two-board/common/toolsPlacement.ts` — only if portrait gains zones. Its container
  resolution already handles portrait correctly (the merged column is a real box there, so it
  is measured directly rather than through the flattened page's published height), so the
  measuring side should need no change; what it would need is portrait entries in the
  droppable list and portrait templates to place them into.
- No server, protocol or data changes.
- No effect on landscape: every rule involved is either portrait-scoped already or would be
  reached by deleting a portrait-scoped override.
