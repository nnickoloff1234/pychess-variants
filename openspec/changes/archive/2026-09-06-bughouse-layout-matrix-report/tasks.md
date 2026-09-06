# Tasks

## 1. The two lists

- [x] 1.1 Declare the 30 viewports from Design as data — name, CSS size, DPR — in one place the
      driver and the report both read.
- [x] 1.2 Declare the four page cases as data: page, required game state, which tab is selected.
- [x] 1.3 Assert at load that the list spans both sides of every threshold: the portrait cut-off,
      the 600px zoom floor, and the width where the tools lose their column. A list that drifts to
      one side of a threshold is the failure this whole change exists to prevent.

## 2. The driver

- [x] 2.1 Seat four players from two contexts with the simul seek, reusing the flow in
      `tests/test_bughouse_lobby_flow.py`. Time control 60+0.
- [x] 2.2 Play a handful of moves on both boards so the movelist case has a movelist and the
      pockets are not empty.
- [x] 2.3 Walk viewport x zoom for the during-game cases, resizing only the camera context.
- [x] 2.4 Resign, then walk the after-game case; follow the Analysis board link, then walk the
      analysis case.
- [x] 2.5 Keep the partner context connected and untouched for the whole run — the abandon timeout
      is about a minute and the run is minutes.
- [x] 2.6 Ask the page's own media query whether zoom reaches the boards, rather than deciding from
      the viewport table.
- [x] 2.7 Set the two boards' zoom independently for the three combinations, and confirm the page
      actually redrew at the requested zoom before capturing.

## 3. The probe

- [x] 3.1 Capture the arrangement facts listed in Design for every state: mode, home, drop classes,
      template, published sizing values.
- [x] 3.2 Probe every named grid area with a throwaway element for its true box, and record what
      occupies it.
- [x] 3.3 Record which rules fired — ragged or uniform preset gap, ceiling or floor on the button,
      how far the tools cascade fell, whether the standing tab was attached.
- [x] 3.4 Write the facts as JSON beside the HTML, so a later change can diff two runs without
      re-running either.

## 4. The checks

- [x] 4.1 Page overflow on either axis.
- [x] 4.2 Stack and board overlap — implemented as OCCUPANTS OF DIFFERENT AREAS overlapping, with
      the depth reported. "Occupant taller than its own track" was tried first and was noise: a
      part is routinely a few pixels taller than its track and spills into the gutter, touching
      nothing — 757px of stack in a 752px row on a page with no overflow at all.
- [x] 4.3 Hit test every interactive control: chat input, visible tabs, end-of-game buttons, resize
      handles.
- [x] 4.4 Declared-but-empty areas. The "panel overflows its area" half was dropped for the reason
      in 4.2; the overlap check covers what it was meant to catch.
- [x] 4.5 Mark failing rows and carry on to the end of the matrix.

## 5. The report

- [x] 5.1 One HTML file listing every row: screenshot, case, viewport, arrangement, checks.
- [x] 5.2 Screenshots as files beside the HTML, referenced relatively — not inlined, at this count.
- [x] 5.3 Group by case and sort by viewport within it, so the same page across shapes reads down
      the column.
- [x] 5.4 Put the failing rows first, or give the report an index of them; a survey nobody can
      triage is a survey nobody reads.

## 6. Verify

- [x] 6.1 Ran end to end twice: 264 rows, 264 screenshots, ~180s, zero driver errors. All 127
      failing rows triaged by category and representative screenshots opened — not read row by row,
      which at this count is not a thing anybody will do and is why 5.4 exists.
- [x] 6.2 Confirmed: desktop is `beside` at all six and tall landscape throughout; phones are
      portrait upright and short landscape rotated, 24 rows each; tablets are tall landscape in all
      144 rows, which is the predicted consequence of the 9/16 cut-off. The LAST RESORT appears for
      the first time ever — T1-T6 rotated — and the partner board's tab is attached exactly there
      and nowhere else.
- [ ] 6.3 Deliberately break one thing — cover the chat input again — and confirm the check catches
      it at the viewports it should and nowhere else.
- [x] 6.4 Two full runs agree on all 264 rows, in arrangement, drop classes and every published
      size. CAVEAT WORTH KEEPING: two runs over different SUBSETS do not agree — the same viewport
      at the same zoom published a 41.86px button after a phone and 61px after a desktop, with the
      page reporting itself settled both times and a nudge not reconciling them. A full run in a
      fixed order is deterministic; the page's dependence on what preceded it is real and is a
      finding, not a harness defect. Suspected but unproven: the mobile-emulation transition.
- [x] 6.5 `ruff format`, `ruff check`, `pyrefly` clean over the driver and the one server file it
      needed; `tests.test_basics` and `tests.test_manage_videos` 41 tests OK.

## 7. Deferred — sharpen the judgements

- [ ] 7.0 The checks produce false positives AND false negatives, assessed on the first full run.
      See Design, "Deferred — the checks judge imperfectly". Improved in passing while the survey is
      used, not as a blocking piece of work.

## 8. Not in this change

- [ ] 7.1 Spectator views — a different arrangement, deliberately left out to keep the matrix at one
      game.
- [ ] 7.2 Screenshot diffing against a baseline. The JSON in 3.4 is the half that is cheap now.
