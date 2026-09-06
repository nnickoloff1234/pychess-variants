# The layout matrix

## The viewports

CSS viewport sizes, which is what the layout actually reads — not panel resolutions. Desktop figures
already have browser chrome deducted from the display height; a 1080p screen gives a page about
955px tall, and quoting 1080 would test a viewport nobody has.

These are REPRESENTATIVE POPULAR SHAPES, chosen from the sizes that dominate current usage, not
figures read off this project's own analytics — pychess has none of this kind. The point of the list
is coverage of the shapes the CSS branches on, so what matters is that it spans every side of every
threshold, which the last column checks.

### Desktop and laptop

| # | Stands for | CSS viewport | DPR | Aspect | Mode |
|---|---|---|---|---|---|
| D1 | 1080p desktop, the commonest of all | 1920 x 955 | 1 | 2.01 | tall landscape, zoom |
| D2 | 768p laptop | 1366 x 643 | 1 | 2.12 | tall landscape, zoom |
| D3 | 1080p at 125% scaling | 1536 x 739 | 1.25 | 2.08 | tall landscape, zoom |
| D4 | 16:10 laptop | 1440 x 775 | 1 | 1.86 | tall landscape, zoom |
| D5 | QHD desktop | 2560 x 1315 | 1 | 1.95 | tall landscape, zoom |
| D6 | 14" MacBook Pro class | 1512 x 857 | 2 | 1.76 | tall landscape, zoom |

### Phone — portrait, and the same six rotated

| # | Stands for | CSS viewport | DPR | Aspect | Mode |
|---|---|---|---|---|---|
| P1 | iPhone 12-14 | 390 x 844 | 3 | 0.462 | PORTRAIT |
| P2 | iPhone 15/16 | 393 x 852 | 3 | 0.461 | PORTRAIT |
| P3 | Android baseline, 20:9 | 360 x 800 | 3 | 0.450 | PORTRAIT |
| P4 | Pixel 7/8 | 412 x 915 | 2.625 | 0.450 | PORTRAIT |
| P5 | iPhone SE 2/3 — the smallest still in use | 375 x 667 | 2 | 0.562 | PORTRAIT, on the line |
| P6 | Pro Max class | 430 x 932 | 3 | 0.461 | PORTRAIT |

Rotated, every one of them is short landscape: aspect above 1.7 and height below 600, so no zoom.

P5 IS THE INTERESTING ONE. 375/667 = 0.5622 against a cut-off of 9/16 = 0.5625 — inside portrait by
three ten-thousandths. It is the row that proves the cut-off is where we think it is, and the row
that will move first if anyone ever touches it.

### Tablet — portrait, and the same six rotated

| # | Stands for | CSS viewport | DPR | Aspect | Mode |
|---|---|---|---|---|---|
| T1 | iPad 9.7/10.2, 4:3 | 768 x 1024 | 2 | 0.750 | tall landscape, zoom |
| T2 | iPad 10th | 810 x 1080 | 2 | 0.750 | tall landscape, zoom |
| T3 | iPad Air | 820 x 1180 | 2 | 0.695 | tall landscape, zoom |
| T4 | iPad Pro 11 | 834 x 1194 | 2 | 0.698 | tall landscape, zoom |
| T5 | iPad Pro 12.9 | 1024 x 1366 | 2 | 0.750 | tall landscape, zoom |
| T6 | Android 16:10 | 800 x 1280 | 2 | 0.625 | tall landscape, zoom |

EVERY TABLET IN PORTRAIT IS A LANDSCAPE-RULES PAGE. That is not an oversight in this table, it is
the decision taken when the portrait cut-off was set to 9/16 so that portrait would mean phones:
every one of these is taller than it is wide and every one of them gets the two-column landscape
geometry, in a window whose height is 1.3 to 1.6 times its width. Nothing has ever looked at that
combination on purpose. Six of the thirty rows exist to look at it.

30 viewports: 6 desktop, 12 phone, 12 tablet.

## The page cases

| # | Page | State | Needs |
|---|---|---|---|
| C1 | Round | game live, Chat tab selected | a live game |
| C2 | Round | game live, Moves tab selected | a live game, some moves played |
| C3 | Round | game over | the same game, resigned |
| C4 | Analysis | Moves tab selected | the finished game |

## One game for the whole matrix

The cases are ordered so the driver plays a single game:

1. Seat four players from TWO browser contexts using the simul seek — the flow
   `tests/test_bughouse_lobby_flow.py` already exercises: one user takes both seats of team 1, the
   other both seats of team 2.
2. Play a handful of moves on both boards, so C2 has a movelist and the pockets are not empty.
3. Walk every viewport x zoom for C1 and C2, resizing only the CAMERA context.
4. Resign. Walk every viewport for C3.
5. Follow the Analysis board link. Walk every viewport x zoom for C4.

THE OTHER CONTEXT STAYS CONNECTED THROUGHOUT. A disconnected client ends a bughouse game after about
60 seconds, and this run takes minutes — so the partner context is never navigated, never resized,
and never closed until the matrix is done.

Time control 60+0, so nothing flags mid-run.

## Zoom

Three combinations, named by the two boards' zoom percentages: `100/100`, `100/50`, `50/50`.

APPLIED ONLY WHERE ZOOM REACHES THE BOARDS, which the page itself defines as
`(aspect-ratio > 9/16) and (height >= 600px)`. The driver SHALL ask that same question of the same
media query rather than re-deriving it from the table above — a copy would be one more place for
the rule to drift.

That makes 18 of the 30 viewports zoom-capable (6 desktop, 12 tablet) and 12 not (every phone
orientation). `100/100` is the base shot, so zoom adds two extra shots per zoom-capable
viewport x case.

## The size of the run

| | |
|---|---|
| base shots | 30 viewports x 4 cases = 120 |
| zoom extras | 18 zoom-capable x 4 cases x 2 extra combos = 144 |
| **total** | **264 screenshots** |

At roughly two to three seconds each — set viewport, settle, probe, capture — the walk is about ten
to fifteen minutes plus game setup.

SCREENSHOTS GO TO FILES, NOT INTO THE HTML. 264 PNGs at these sizes is on the order of 50-100MB;
inlined as data URIs that is a report no browser will open comfortably. The report references them
relatively and travels as a directory.

## What is recorded beside each screenshot

The screenshot says what it looked like. These say WHY, and they are what makes two runs comparable:

- **Input**: viewport, DPR, aspect, orientation, case, zoom combination.
- **Mode**: portrait / short landscape / tall landscape, read from the media queries themselves.
- **Home and arrangement**: the `tools-*` class, every `drop-*` class standing, `strip-in-zoneb`,
  `controls-labelled`, `partner-name-outside`, `game-over`.
- **Template**: `grid-template-areas`, rows and columns as computed.
- **Occupancy**: every named area, its box, and what is in it — probed by placing a throwaway element
  in each area rather than inferred from the row list, which is how this session learned the
  difference between a row and its occupant.
- **Published values**: the square units, `--bug-preset-btn`, `--bug-preset-gap`,
  `--bug-preset-align`, `--bug-app-h`, and the chat budget.
- **Which rules fired**: whether the preset gap came from a ragged arrangement or a uniform one,
  whether the ceiling or the floor bound the button size, whether the tools cascade fell past its
  first choice, whether the standing tab was attached.

## The checks the driver makes for itself

A person reading 264 screenshots will miss things. These are mechanical, and every one of them is a
defect this capability has actually shipped at some point:

1. **Page overflow** on either axis.
2. **Stacks overlapping** each other, or a board overflowing its column.
3. **An interactive control covered**: for the chat input, every visible tab, every end-of-game
   button and both resize handles, a hit test at its centre must return that control. This is the
   check that would have caught both of this session's covering bugs.
4. **A declared area left empty** while parts sit elsewhere — the open zone A question, made
   visible on every viewport at once instead of on the one somebody happened to look at.
5. **A panel overflowing its area.**

A failing check marks its row in the report. The run does not stop: the matrix is a survey, and one
bad viewport must not hide the twenty after it.

## Why not the existing harness

Four windows, sized by a tiling window manager, driven through a browser extension. Setting an exact
CSS viewport with an exact DPR is the one thing it cannot do — the window is whatever i3 gives it,
the device pixel ratio is the display's, and page zoom has been used to fake sizes, which changes
the very ratio being tested. Playwright sets both directly, headless, with no window manager in the
loop, and it is already how `tests/test_gui.py` and `tests/test_bughouse_lobby_flow.py` drive this
application.

## Deferred — the checks judge imperfectly, and that is the next work

Assessed on the first full run, 2026-09-06: some marked rows are FALSE POSITIVES and some genuinely
broken states went UNMARKED. Both directions, so this is not a threshold to nudge — it is the
question of what each check is really asking.

What is already known to be shaky, from building them:

- **"Occupant overflows its area"** was removed for exactly this reason and replaced with occupants
  of different areas overlapping. That replacement is better and still blunt: it cannot tell a board
  drawn across its neighbour from a part spilling five pixels into a gutter, beyond reporting the
  depth. 69 rows carry a 5px overlap that may be entirely benign.
- **"A declared area is empty"** fires on areas that are empty ON PURPOSE in some arrangements.
- **A hit test at the CENTRE** of a control says nothing about a control covered at its edge, and
  nothing about one that is present, uncovered and nevertheless unreachable — off-screen, behind a
  scroll, or under a transparent layer that passes the hit test.
- Nothing checks what the eye actually catches first: text clipped, a control drawn outside the box
  it belongs to, two things misaligned that should share an edge.

THE SURVEY IS STILL WORTH RUNNING WHILE THIS IS TRUE. It found a 255px overflow on four tablets and
a broken last-resort arrangement on its first run, and the screenshots are evidence whatever the
checks say about them. The intent is to run it often and sharpen the judgements in passing, rather
than to hold it back until they are right.

## Open Questions

- Whether C1-C4 should also be captured for a SPECTATOR, who has no seat and therefore no controls
  bar. It is a different arrangement and it is untested; it is left out of the first list to keep
  the matrix at one game.
- Whether to keep a baseline run and diff against it. Comparing screenshots is a separate discipline
  and a separate change; recording the arrangement facts as structured data is the half of it that
  is cheap now, so the report should also write them as JSON beside the HTML.
- Whether the two mobile orientations should both be walked for every case, or whether landscape
  phones only need the round page. 264 shots is already large.
