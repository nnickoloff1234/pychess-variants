## Why

Every layout defect this capability has fixed was found by a person looking at one of four windows
that happen to be open. That harness is good at what it is for — a live four-player game, driven by
hand, on four fixed shapes — and it is the wrong instrument for the question "does this layout hold
on the devices people actually use". It cannot answer it, for three reasons: four shapes are not a
sample, its shapes are whatever the tiling left, and nothing it produces can be compared with what
the same code did last week.

The defects found this session make the case. The chat input was unreachable on two of four windows
because a site-wide `min-height: 15em` overflowed a 133px row; the end-of-game controls were covered
by an emptied panel that stretched over them; zone A stood 199x240 and empty on one page while
overflowing by 44px on another. All three are visible in a screenshot, all three were found by
accident, and none of them would have survived a matrix that visited every popular viewport and
looked.

This is a SEPARATE test bed, not a change to the existing harness. The four-window harness stays
what it is: a live game you can play, for working on a problem you already know about. This one
answers a different question — WHAT DOES THE LAYOUT DO EVERYWHERE — and answers it the same way
every time it is run.

## What Changes

- A declared list of viewports: six representative devices for each of desktop, phone and tablet,
  in both orientations for the mobile classes — 30 viewports, each with its device pixel ratio.
- A declared list of page cases: the round page during a game with chat shown, during a game with
  the movelist shown, after the game has ended, and the analysis page with the movelist shown.
- A driver that walks the product of the two, ordering the cases so that ONE game serves the whole
  matrix: every during-game case first, then a resignation, then every after-game case, then
  analysis.
- Three zoom combinations — left 100 / right 100, left 100 / right 50, left 50 / right 50 — at every
  viewport where zoom reaches the boards at all, and none where it does not.
- A screenshot per combination, and beside each one the ARRANGEMENT IT PROVOKED: which home the
  tools took, which template and areas were used, which re-arrangement rules fired, what the sizing
  logic published.
- An HTML report listing all of it, plus the failures the driver can detect for itself — overflow,
  overlapping stacks, an interactive control covered by another element, a declared zone left empty.

## Impact

- New: a Playwright driver and its report generator, alongside `tests/test_gui.py` rather than
  inside it — it is a report, not a pass/fail test, and should not fail a test run.
- Reuses the simul seek flow from `tests/test_bughouse_lobby_flow.py`, which seats four players from
  two browser contexts.
- Reads only what the pages already publish. No production code changes; if the driver cannot see
  something it needs, that is a finding about the page, not a licence to add hooks for the test.
- The four-window harness and its skill are untouched.

## Capabilities

- `bughouse-layout-matrix`
