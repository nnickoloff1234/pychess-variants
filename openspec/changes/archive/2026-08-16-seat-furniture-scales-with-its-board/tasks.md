# Tasks

Two halves, deliberately sequenced: the scaling first, then a look at the result before deciding
the username's own line. The second half is a response to the name being crushed, and the first
half changes how crushed it is.

## 1. A seat's furniture scales with its own board

- [x] 1.1 Add per-seat units to the `min-height: 600px` block, following portrait's shape: `.own-seat` from `--board-scaleA`, `.partner-seat` from `--board-scaleB`
- [x] 1.2 Record why own maps to A and partner to B — the scales belong to the columns, and the viewer's own board is the one in the left column, which is what `markRoles()` marks
- [x] 1.3 Derive `--bug-strip-h`, `--bug-clock-fs` and `--bug-name-fs` from the per-seat unit instead of `--bug-tall-sq`
- [x] 1.4 Leave the pockets alone — they are already sized from the board chessgroundx rendered, and are the one part that was right
- [x] 1.5 Do NOT derive the unit from `--cg-width-a`/`--cg-width-b`: that is a measurement of a board inside the track this value helps size, which is the circular sizing that has already produced a collapse to zero and a runaway to 1528px in this file

## 2. Verification of the first half

- [x] 2.1 p1 at full zoom on both boards: every measurement identical to before the change
- [x] 2.2 p1 with the partner board reduced: strip height, clock font and name font all in proportion to that board's square, and the pocket still the same number of squares
- [x] 2.3 Confirm the own board's furniture is untouched when only the partner's zoom changes
- [ ] 2.4 Switch the boards and confirm the furniture follows the role, not the board — the small board's furniture should stay small after it moves columns
- [x] 2.5 Short landscape unchanged in p2/p3
- [x] 2.6 Portrait unchanged in p4
- [x] 2.7 No seam between a board and its pockets at any zoom, and no page overflow
- [x] 2.8 Record what the clock and name actually measure at a low zoom, and say plainly whether they are still readable

### 2.8 — the numbers, at zoom-a 100 against zoom-b 35

| | own (100%) | partner (35%) | partner, before |
|---|---|---|---|
| strip height | 76 = 1 square | 26.6 = **1 square** | 76 = 2.9 squares |
| clock | 15.2px, 136.7 wide | **5.32px, 63.4 wide** | 15.2px, 136.7 wide |
| clock vs board width | — | 0.3x | 0.7x |
| pocket | 380 = 5 squares | 130 = 5 squares | 130 = 5 squares |
| username | 16.568px, 91.3 wide | 11.9px, **19.4 wide** | 16.568px, 5.8 wide |

The own seat is identical to before in every value, which is the "full size is unchanged"
scenario.

**The clock is not readable at 5.32px.** It is proportional, which is what was asked for, and it
is also a smudge. This is decision 5.1 and it is now a live question rather than a hypothetical.

**The username is no longer crushed to nothing but is still crushed** — 19.4px against 5.8px
before. Its font sits at the unscaled `0.85em` floor, 11.9px, where its own scale would give
26.6 x 0.218 = 5.8px. So on a small board the name is now the one part of the furniture that is
NOT proportional: 11.9px of text in a 26.6px strip. That is the risk the design predicted, and it
is what makes the second half — the name taking its own line — worth doing rather than optional.

## 3. Decide the second half, having seen the first

- [x] 3.1 Look at the reduced board's strip and decide whether the username still needs its own line
- [x] 3.2 If it does, choose the mechanism: content-sized strip rows, or a measured class as `toolsPlacement` uses — the trade is the ten-square stack against the extra work
- [x] 3.3 Whichever is chosen, the strip must not push the stack past the column: `toolsPlacement` reads the stack's height, so a strip that grew silently would move the tools as a side effect
- [x] 3.4 Confirm the name renders on one line when it takes its own, and that the pocket and clock keep their sizes

## 4. Gates

- [x] 4.1 `yarn typecheck`
- [x] 4.2 `yarn test`
- [x] 4.3 `yarn dev` and sync `static/` into the container

## 5. Decisions to record before archiving

- [x] 5.1 Whether there is a zoom below which the furniture should stop shrinking — at 35% the clock font computes to roughly 5.3px
- [x] 5.2 Whether the username's floor should scale too, or stay fixed so a small board's name stays readable at the cost of proportion
- [x] 5.3 Whether `max(scaleA, scaleB)` on the board row still holds once the two stacks can differ in strip height as well as board height

## 6. Still carried, and still blocked on a live game

Not part of this change, but they have now been carried across two archives and should not be
lost. Both need a game that starts, is played, and ends while the pages are open.

- [ ] 6.1 Click probes after a board switch — the boards move between containers and chessgroundx memoises hit-test bounds
- [ ] 6.2 `#offer-dialog` holding a real draw offer
- [ ] 6.3 The game-over transition itself: presets vanishing and the end-of-game buttons appearing in the same frame, and whether the tab bar's row moves

### How the second half came out

**The name goes below the pocket and the clock, at full strip width, on one line — everywhere
except at or near full zoom**, which is what was asked for. Verified in p1 with the own board at
100% and the partner at 35%: `own-name-below` absent and its name inline as before,
`partner-name-below` present with the name below the clock, spanning the full 212.8px strip, on
one line, visible, and the clock flush against the trailing edge in both seats.

**The floor came off the font** (5.1, 5.2). `--bug-name-fs` is now `--bug-seat-sq * 0.218` with no
`max(..., 0.85em)`, so the name scales like the rest — 5.8px on a 35% board. Small in the extreme
is accepted; the name is readable where it matters because it has a line to itself rather than
19px between the pocket and the clock.

**5.3 answered by reading the grid rather than guessing:** `max(scaleA, scaleB)` was already
obsolete. Board B lives inside `.bug-right-column`, which spans the app's three stack rows as a
single item and sizes itself, so that row carries board A alone and taking the larger of the two
only inflated it. It is now `scaleA`, and all three of board A's rows scale together so its stack
stays exactly ten of its own squares.

### Four CSS mistakes worth recording, all of the same family

Each looked like a layout bug and was a selector not matching what I thought it matched.

1. **The per-seat rules went into the wrong media block.** The anchor I inserted against exists in
   both landscape blocks and I matched the first — so the rules landed in short landscape, where
   `--bug-seat-sq` did nothing, and tall landscape lost its parameters entirely and fell back to
   defaults. The tell was `--bug-seat-sq` computing to empty while the clock jumped to 14px.
2. **The strip height lost on specificity.** `.own-name-below .own-seat` is (0,2,0) against
   `.round-app.bug .seat-strip0` at (0,3,0), so the strip stayed one square tall while the name
   moved below it — and a strip clips, so the name vanished entirely.
3. **`>` does not follow `display: contents`.** The clock is a flex ITEM of the strip once the
   block dissolves but remains a DOM CHILD of that block, so `.partner-seat > .clock-wrap` matched
   nothing and the clock sat mid-strip.
4. **The reserved line was a guess.** `font-size * 1.3` against a real line box nearer 1.8 — the
   name carries a presence dot and a rating — so the strip clipped the line it had just made room
   for. Both the strip and its grid row are content-sized now.

The wrap itself ended up needing no forced basis or order: `white-space: nowrap` on the inner text
makes the name's min-content the width of the whole name, which cannot fit beside the pocket and
clock, so the strip wraps it and it grows into the full line. The content decides, which is why it
still does the right thing for a name short enough to sit inline.

### Untidiness left in

`seatNamePlacement` runs in all three modes and toggles its classes everywhere, but only tall
landscape styles them — portrait carries `own-name-below` and nothing responds to it. Harmless and
settled (six samples, no flapping), but the module is doing work that means nothing in two of the
three modes.

## Disposition at archive — 2026-08-16

Both halves are done and verified live in all three modes; gates green.

**2.4 not run** — switching the boards to confirm the furniture follows the role rather than the
board. It should hold by construction, because the furniture is keyed to `.own-seat`/`.partner-seat`
and `markRoles()` re-marks those on every switch, but "should hold by construction" is not the same
as having watched it. It needs a live game, and the one available was resigned before it could be
used.

**Late change, after archiving was requested:** the zoom default went back to 80 for every board,
removing the two-board special case in `boardSettings.ts`, and `hasResult()` was folded into
`isGameOver()`. The second is a real behaviour change, decided deliberately: the "Game over. All
messages visible to all." notice now also appears on an aborted game, where the `> 0` test kept it
silent. The living spec's zoom requirement was corrected to match — it no longer claims this layout
sets its own default.

**Carried forward for the fourth time, all blocked on a live game that survives long enough:**
click probes after a board switch, `#offer-dialog` holding a real draw offer, and the game-over
transition watched as it happens.
