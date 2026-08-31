## 1. Panel surface in portrait

- [ ] 1.1 Delete the portrait opt-out in `static/bughouse.css` — the rule setting
      `.round-app.bug .chatpresets-panel, .round-app.bug .bug-presets-group` back to
      `background-color: transparent` inside the portrait block. The shared rule already
      paints both, so this is the whole of the change.
- [ ] 1.2 Look at it in the harness's portrait window before keeping it. The block is dense on
      a phone and a background may read heavier there than it does on a desktop; this is the
      one judgement call in item 1.
- [ ] 1.3 Confirm no seam shows between the two preset parts in portrait — they are stacked in
      one column there, so they should abut as they do beside the board in landscape.

## 2. Does portrait have room at all

- [ ] 2.1 Measure, at the zoom levels people actually use, how much height portrait frees below
      the lower board as the boards are scaled down. Compare against what one preset part costs
      when folded to a single row.
- [ ] 2.2 If the answer is "not enough at any usable zoom", stop here and archive the change
      with item 1 done and item 3 dropped, recording the measurement. Short landscape turned
      out this way — its board row is pinned, so nothing can ever drop — and portrait may be
      the same. Finding that out is a result, not a failure.

## 3. A zone for the preset parts in portrait

Only if 2.1 says there is room.

- [ ] 3.1 Decide one zone or two, from the measurement rather than by analogy with landscape.
      Portrait is a single column, so the second landscape zone (the partner board's own width)
      has no distinct meaning here.
- [ ] 3.2 Add the zone row(s) to portrait's `grid-template-areas`, and the assignments that put
      a part into them. Every named area must be a single filled rectangle — a non-rectangular
      area makes the whole declaration invalid and it is dropped silently, which then places the
      item in an implicit track and misreports every width read from that grid.
- [ ] 3.3 Add the portrait entries to the droppable list. If they cannot be inert in landscape,
      make the list orientation-aware rather than hiding a mode check inside the data.
- [ ] 3.4 Charge the zone's cost against the boards before granting it, reusing the landscape
      rule rather than re-deriving it.
- [ ] 3.5 If both the tab bar and the presets can move, the bar takes the lower slot and the
      presets sit above it — the fill order that stops the two swapping places as the boards
      shrink.

## 4. Verification

- [ ] 4.1 Sample each zoom level over several frames, watching the arrangement classes and the
      app's own height. A single reading cannot tell a settled layout from one alternating
      between two self-consistent states.
- [ ] 4.2 Confirm both landscape modes are untouched: the merged column is still a real grid in
      short landscape and still dissolved in tall, and no arrangement class changes in either.
- [ ] 4.3 Confirm no horizontal overflow and no board is left unpainted at first load.
- [ ] 4.4 `yarn typecheck`, `yarn test`.
