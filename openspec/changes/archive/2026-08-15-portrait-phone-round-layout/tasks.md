## 1. Capture the reference first

The previous change left its reference tasks permanently unobtainable because the
code was already written when they were attempted. Do these before touching CSS.

- [x] 1.1 In p4 at 386x835, record `grid-template-columns`, `grid-template-rows` and `grid-template-areas` of `.round-app.bug`, plus `--cg-width-a`, `--cg-width-b`, `--files` and `--pocketLength`
- [x] 1.2 Record the rendered width and height of both boards, all eight pockets, both pairs of seat strips and the tools panel, and the document's scroll height against the viewport
- [ ] 1.3 Repeat 1.1 and 1.2 at 376x835 (20:9) so there are two phone aspect ratios on record
- [x] 1.4 Record the same for short landscape and the analysis page, as the controls for "nothing outside portrait changed"

## 2. Break the circular dependency

- [x] 2.1 Replace the partner column's `calc((var(--cg-width-a) / var(--files)) * var(--pocketLength))` with `20vh`, and the second column with `minmax(0, 1fr)` rather than a `100vw` subtraction
- [x] 2.2 Rewrite `grid-template-rows` and `grid-template-areas` for the eight areas actually in use — `boardPartner`, `clockB-top`, `clockB-bot`, `clock-top`, `board`, `clock-bot`, `tools`, `toolsB` — and drop the areas no element occupies, saying which they were
- [x] 2.3 Confirm `--cg-width-a` leaves zero and settles at 20vh's worth, and that all eight pockets have non-zero width
- [ ] 2.4 Establish whether the shipped path re-measures unaided or whether the browser experiment's `resize` dispatch was doing the work; record the answer either way and do not add a compensating call without stating it

## 3. Square boards without viewport arithmetic

- [x] 3.1 Give both boards `width: 100%` and `aspect-ratio: 1 / 1`, removing the `100vw`-derived heights
- [ ] 3.2 Confirm the player's board is no wider than its container and its left edge is not negative while the page has a scrollbar
- [ ] 3.3 Confirm both boards are square at more than one viewport width

## 4. Recover vertical space

- [x] 4.1 Lay the player's own seat strips out as a row, leaving the partner's stacked, and confirm the drop from ~91px to ~57px each
- [x] 4.2 Hide the site header in portrait for bughouse, matching the existing short-landscape rule
- [x] 4.3 Give the tools panel `minmax(0, 1fr)` and `overflow-y: auto`, with `min-height: 0` so it can actually shrink

## 5. Verify

- [x] 5.1 The document does not scroll at 386x835 — compare against the 1.2 reference
- [x] 5.2 Both boards and all eight pockets are non-zero and on screen; the partner board is square, at least 20vh, and above the player's own
- [ ] 5.3 The player's board is full width and its height equals the window width
- [x] 5.4 The tools panel is visible, non-zero, and scrolls its own content without moving the boards
- [ ] 5.5 Repeat 5.1-5.4 at 376x835, and at a shorter viewport to test the 20vh choice against a second height
- [x] 5.6 Clicks land on the intended squares on both boards — probe first, never seed a remembered offset
- [x] 5.7 A piece can be dropped from a pocket on both boards, which is the point of the whole change
- [x] 5.8 Short landscape, desktop and the analysis page are unchanged against the 1.4 reference
- [x] 5.9 The longest test-user names still leave the pocket and clock intact in a row-direction strip
- [x] 5.10 `yarn typecheck` and `yarn test`

## 6. Decide

- [x] 6.1 ~~Whether the partner seat strips need fixing now~~ **SUPERSEDED.** The question described the rotated strip in a ~205px column, which no longer exists: the strips were put back above and below the partner board, and 5.9 confirms the pocket, name and clock apportion the width exactly at both scales with 20-character names.
- [ ] 6.2 Whether `20vh` stays a bare fraction or becomes a `clamp()` against the board's square size
- [ ] 6.3 Whether tablet portrait is acceptable under these same rules, or needs its own treatment before this is archived

## Progress log

### Step 1 — the experimented changes, applied 2026-08-15, live on game `OxGfiYSv`

Reference captured first (1.1, 1.2, 1.4) while p4 was pristine, which is the thing the
previous change could never recover. p4 at 386x835, applied via the no-rebuild loop
(edit -> `pychess-sync-static.sh` -> `PB.reloadCss()`), **without reloading the page**, so
the live game survived the change.

| | before | after |
|---|---|---|
| `grid-template-columns` | `0px 386px` | `167.062px 204.938px` |
| `--cg-width-a` | `0px` | `165.33px` |
| partner board | **0 x 0** | **165 x 165** |
| our board | 384 x 384 | 373 x 373 |
| pockets non-zero | **0 of 8** | **8 of 8** |
| header | 60px | 0 |
| our seat strips | 34px (pockets collapsed) | 58px, holding real pockets |
| document overflow | **483px** | **86px** |

The circular dependency is broken and the mode is functional: both boards render and all
eight pockets are usable, which is the point of the change.

**Still open after step 1 — the page overflows by 86px.** Rows resolve to
`83.5 83.5 57.5 378 57.5 222.24 0` = 882 against an 835 viewport. The boards and strips
take 660, leaving 175, but the tools row resolves to 222.24 rather than shrinking to the
175 available. `minmax(0, 1fr)` plus `min-height: 0` on `.bug-round-tools` was expected to
allow that and did not, so something inside the panel is still asserting a height. Next
step is to find it rather than to force the row.

**Also observed:** the partner's seat strips remain cramped in the ~205px column, as
predicted in design's Open Questions.

### Step 2 — the quantisation seam, 2026-08-15

Nikolay spotted a line between the board and the pocket beneath it, and named it as the
same defect short landscape used to have. Correct: it is the quantisation seam, and it was
already forbidden by the existing requirement "The board's grid slot equals the board it
renders".

`cg-board` is `position: absolute` and contributes no layout height, so step 1's
`width: 100%; aspect-ratio: 1` was sizing the box while chessgroundx quantised the board
inside it. Box 378, board 373.33, gap **4.66px**.

Fixed by publishing two quantised units from `squareUnit.ts` — `--bug-portrait-sq` from
the viewport width, `--bug-portrait-partner-sq` from a fifth of the viewport height — and
making every track and both board boxes whole multiples of them. See design decision 6,
including why `--cg-width-b` is the right number from the wrong source.

| | step 1 | step 2 |
|---|---|---|
| our board box / board | 378 / 373.33 | **384 / 384** |
| seam under our board | **4.66px** | **0** |
| partner box / board | 167.06 / 165.33 | **165.33 / 165.33** |
| seam under partner board | 1.73px | **0** |
| pockets non-zero | 8 of 8 | 8 of 8 |

**This is a scope change**: the design promised stylesheet-only and now touches
`client/two-board/squareUnit.ts`. Recorded in Goals/Non-Goals rather than left implied.
`yarn typecheck` passes.

**New, and coupled to the outstanding overflow.** The unit comes from `clientWidth`, which
excludes the scrollbar. It is published before the boards exist, when `clientWidth` is 386,
giving a 384px board; the page then overflows vertically, the scrollbar appears,
`clientWidth` becomes 378, and the 384px board overflows **horizontally by 6px**. Fixing
the vertical overflow removes the scrollbar and closes both. Do not make the unit defensive
about scrollbars instead — that would hide the coupling.

- [x] 5.7-partial: pieces render and pockets are usable; a real drop is still untested

### Step 3 — pockets adopt short landscape's spacing rule, 2026-08-15

Nikolay: pocket pieces were larger than board squares. Short landscape had already
settled this — a pocket piece is exactly one board square tall, and the CELL is 0.8 of a
square, so pieces sit closer together than they would on the board. He asked for the same
*spacing*, noting 0.8 is not a fixed width rule: a variant with a different
`--pocketLength` keeps the spacing and takes whatever width follows.

Measured against L-short (p3) as the reference:

| ratio to that mode's board square | L-short | portrait before | portrait after |
|---|---|---|---|
| pocket cell width | 0.80 | 1.18 | **0.80** |
| pocket piece height | 1.00 | 1.18 | **1.00** |
| pocket piece width | 0.80 | 1.18 | **0.80** |

Portrait now reproduces L-short's pocket geometry exactly. With five slots that comes to
192px against a 384px board — half the board's width, as predicted.

**Keyed by board identity, not by role.** `twoBoardCtrl.ts:157` swaps the boards' inline
`grid-area` per player, so the `board` area is always the *player's own* board — but the
pocket selectors (`.pocket-top` vs `.pocket-top-partner`) are fixed to board A vs board B.
The published units are keyed by role, so they do not correspond and cannot be used here.
Each pocket is therefore sized from its own board's `--cg-width-a` / `--cg-width-b`, which
is chessgroundx's own quantised measurement and so exact. This is **not** the forbidden
self-reference: a pocket does not sit in the track it takes its size from.

Also restored `.round-app.bug .twoboards .cg-wrap.pocket { width: max-content }` in this
mode — only the inner element carries the variant's real `--pocketLength`, and the wrap
would otherwise fall back to the default of 5 and mis-size any variant that differs.

Overflow improved 90px -> 73px as a side effect of the shorter pocket rows.

### Step 4 — role marker, strip rotation, and the line-box gap, 2026-08-15

**Role marker.** `roundControls.markSeatRoles()` sets `own-seat` / `partner-seat` on each
strip, derived from the effective grid area so it stays true through SWITCH. Called after
the initial placement in `roundCtrl` (covering board-A players, spectators and simul, none
of which switch) and again inside `switchBoards()`. This is what makes "the partner's
anything" selectable at all — `.bug` is board B and would select the wrong strip for every
board-B player. Nikolay: a cleaner rethink of how boards and their adjacent elements are
referred to will come later; the marker is enough to identify what we want for now.

**Whole strip rotated**, not just the pocket, via `writing-mode: vertical-rl` rather than
`transform: rotate()` — a transform leaves the layout box unrotated, so the grid would keep
reserving a wide, short slot. Two ordering corrections followed, both from the writing mode
rather than from the design:

- `flex-direction: row` follows the INLINE axis, which vertical-rl turns downward, so the
  pocket ate the strip's whole vertical extent and left the name and clock at 231x0,
  clipped by `overflow: hidden`. Laying the children along the block axis fixed it.
- vertical-rl's block axis runs right-to-left, which put the name against the board and the
  pocket 164px away. `column-reverse` puts the pocket against the board it feeds.

**The gap Nikolay spotted was a LINE BOX, not quantisation.** `.cg-wrap.pocket` computes
`display: inline`. An inline box generates a line box whose extent runs horizontally under
vertical-rl, so the pocket sat baseline-aligned to its far end — 28px of leading between
board and pocket. And `inline-size` does not apply to a non-replaced inline box at all, so
the `max-content` added in step 3 was inert. `display: block` fixes both.

| | inline | block |
|---|---|---|
| wrapper width | 48.67 | **20.67** |
| gap board to pocket | **28px** | **0** |

**Carried to the deferred list, not fixed here:** short landscape uses the same
`width: max-content` on the same inline wrap, so that declaration is inert there too. It is
invisible because the leading falls on the axis the strip already sizes, but a variant whose
`--pocketLength` differs from the default 5 would expose it.

Geometry now: partner pockets 20.67 x 83.67 flush at the board's right edge, run capped at
half the board's height; own pockets unchanged at 192 x 49.

**Overflow regressed 73px -> 152px.** Rows are `82.7 82.7 49 384 49 300.9 0` = 948 against
835: the tools row reclaimed its full 300.9 content height instead of yielding. Same
unresolved tools-panel problem, now costing more.

### Step 5 — L-short click-offset regression, found and fixed 2026-08-15

Nikolay reported the one-file click offset back in p2 and p3 while playing. **Not from this
change** — every portrait rule is inside `@media (orientation: portrait)`, verified — and
not new today: the p3 reference captured in step 1, before any portrait CSS, already shows
the broken state (`cols 437.333 15 437.333 321.885`, app 1211.55 centred in 1276).

It is a regression from the archived `desktop-round-layout-fixes`, task 4b.1. That change
gave `main.round.bug` two content-sized columns and centred them under
`@media (min-width: 800px)` — correct for the desktop mode, but **short landscape is also
wider than 800px**, so it matches too. A content-sized wrapper makes this mode's `1fr`
tools column inert, the chat reverts to max-content, and the app widens the moment a
message arrives. The centred boards slide left out from under the bounds chessgroundx
memoised at init, and clicks land one file off.

It therefore violates a requirement of the very spec that change updated: *"the containing
wrapper's own track SHALL also be made to fill the available width; a fractional tools
column alone has no effect while the wrapper is content-sized."*

Proven, not inferred — one chat line appended to a live game:

| | before fix | after fix |
|---|---|---|
| app width | 1211.55 -> **1276** on the message | **1276**, unchanged |
| board A x | 32.22 -> **0** (moved 32.22px = 0.59 squares) | **0**, unchanged |
| tools column | 321.885px (max-content) | **386.333px** (real 1fr remainder) |

Fixed by overriding the columns in the short-landscape block so the wrapper fills. Two
notes for whoever reads this later: the selector needs the `body[data-variant='bughouse']`
prefix purely for **specificity**, because the `min-width: 800px` rule is also
`main.round.bug` and sits later in the file — without the prefix the override silently does
nothing, which is exactly what happened on the first attempt. And only the columns are
overridden, not the whole block, because its rows and areas are still wanted here.

Verified on clean hard reloads of both p2 and p3: app fills 1276, board exactly fills its
437.333px track, and appending a chat line moves nothing.

**Watch out when measuring after `PB.reloadCss()`**: it briefly leaves the page unstyled,
and chessgroundx re-measured board A to 490.67px in a 437.33px track during that window.
That is a measurement artifact of the dev loop, not a layout bug — confirm anything
suspicious on a real hard reload before believing it.

### Step 6 — strips above and below, panel beside the partner, no scrolling, 2026-08-15

**The rotation was a mistake and is reverted.** Nikolay's call: both seats read the same
way as in every other mode — pocket, name, clock in a row above and below their board —
with the partner's block simply drawn at its own scale. Ratio 0.43 throughout: board
165.33 against 384, strip 20.67 against 48, pocket 82.67 against 192, and both font
parameters the same fraction of their own square.

`--bug-seat-sq` is set per strip from the ROLE class and inherits into the pocket, which
let the `--cg-width-a` / `--cg-width-b` pocket rules go entirely — those carried the
identity-vs-role mismatch. The `max(…, 0.85em)` floor short landscape puts on the name is
deliberately NOT used here: it would break the small block's proportions, and Nikolay
chose proportions over legibility at this size.

**`markSeatRoles` is now `markRoles` and marks the boards too.** Board sizing was still
keyed on `#mainboard`/`#bugboard`, which is board identity — correct for p4 only by luck.
A board-A player would have been given the partner's 165px size on their own board.

**The partner block is left-aligned** with the full-width board below it (both at x=0).

**The tools panel moved beside the partner board** — the partner board is a fifth of the
viewport height and square, so most of that width was empty. It now occupies
220.67 x 206.67 there instead of taking a row below everything.

That single move fixed the overflow and everything downstream of it:

| | before | after |
|---|---|---|
| page overflow | 112px | **0** |
| scrollbar | 8px | **none** |
| `clientWidth` | 378 | **386** |
| own board | 373.33, clamped, offset x=4.67 | **384**, x=2 |

The scrollbar coupling from decision 6 resolved exactly as predicted: no overflow means no
scrollbar, so `clientWidth` matches `innerWidth`, so the published unit matches the space
the board actually gets and it renders full size instead of being quantised down.

**No-scroll is now structural, not incidental.** `body[data-variant='bughouse'][data-view='round']
{ height: 100vh; overflow: hidden }`, the same guarantee short landscape makes. Beyond
tidying the scrollbar away it removes the unit/scrollbar failure mode by construction:
`--bug-portrait-sq` comes from `clientWidth`, which excludes a scrollbar, so a page that can
never have one can never publish a unit wider than the space available.

Stress-tested with 40 long chat lines appended live: **boards did not move at all**, no
scrollbar appeared, no horizontal overflow, and the panel scrolled internally.

Residual `scrollHeight` overflow is 8px, and it is `#reconnecting` — an indicator parked
just below the viewport by design. For comparison L-short, the mode being matched, carries
52px and genuinely clips `under-board`. Portrait clips less than its reference.

**Open: ~148px of dead space** below the player's board. The stack is 686.67 of 835 and
nothing claims the remainder; the board cannot grow into it without breaking the
full-width invariant, and the panel cannot occupy two disconnected regions.

### Step 7 — the verification sweep, 2026-08-15, game `ZSmwOLN2`

**5.7 — a piece was actually dropped.** This is the change's whole premise and had never
been tested. In p4 at 386x835: clicked the pocket pawn, **34 drop squares lit up**, clicked
d3, and the server logged `Got USER move Test-CommonerFersAlf ZSmwOLN2 P@d3`. The pocket
count went 1 -> 0. Bughouse is playable in portrait, demonstrated rather than inferred.

Caveat on the task's wording: "on both boards" is not achievable from one client — a player
may only drop on the board they hold a seat on, and the partner's pockets are display-only.
Verified on the player's own board; the partner's pockets render at 8/8 but are not
interactive by design.

**5.6 — clicks land where they are aimed.** In portrait the drop is itself the proof: the
click went to the computed centre of d3 and the server recorded d3. Separately probed in
p2 (short landscape) with a real click: intended `c6`, selected `c6`, offset `{0,0}` — which
also re-confirms the step 5 fix with a genuine click rather than geometry alone.

**5.9 — long names hold at both scales.** With 20-character test names, no name/pocket
overlap in any strip, and the width apportions exactly:

| | pocket | name | clock | = strip |
|---|---|---|---|---|
| own | 192 | 128.9 | 65.1 | **386** |
| partner | 82.7 | 45.5 | 37.1 | **165.3** |

Fonts scale with the seat: own 10.46/9.6px, partner 4.51/4.13px, the same 0.43 ratio.

**5.8 — desktop and analysis unaffected.** Desktop (p1, 1914x827, hard-reloaded so it runs
the new bundle): boards adjacent, each exactly 0.25 of the viewport, tools exactly 0.2,
pockets 8/8, overflow 0, header still shown. Analysis (same-origin overlay iframe at
1400x800, so p1 kept its seat): loads, both boards 328px, 8/8 pockets, its own
`analysis-app bug` grid untouched, and no role classes present — `markRoles` is round-page
only, as intended. Overlay removed and p1 confirmed still on the game afterwards.

**A dividend from the desktop check:** p1 plays board A and gets `own-board` / `own-seat`
on exactly the elements p4 marks `partner-*`. That is the board-A direction of `markRoles`,
which until now had only been reasoned about rather than observed.

## Disposition at archive — 2026-08-15

Archived at 20/28. The goal is met and demonstrated: bughouse is functional in portrait on
a phone-shaped viewport. Both boards render, all eight pockets are usable, **a piece was
actually dropped** (`P@d3`, server-confirmed), clicks land where they are aimed, the page
does not scroll, and desktop, short landscape and analysis are unaffected. Frontend gates
pass — typecheck clean, 41 suites / 226 tests.

**Not deferred, done differently: the landscape click-offset fix.** Hunting a regression
Nikolay hit mid-session turned up a defect belonging to the archived
`desktop-round-layout-fixes`: its `min-width: 800px` rule for `main.round.bug` also matches
short landscape, un-filling the wrapper there and reviving the one-file click offset. Fixed
in this change and written into the spec as a new scenario under "No grid track is sized by
late-arriving content", so the constraint outlives the memory of the incident.

**Deferred, with reasons.**

- **1.3, 5.5, 3.3 — one viewport only.** Everything was verified at 386x835 (19.5:9). The
  `20vh` partner size has never been seen at a second height, and design already flags it as
  "a guess seen at one aspect ratio". This is the largest genuine gap; a squatter phone will
  give the partner board a different share of the width.
- **2.4 — unanswered, not papered over.** Whether the shipped path re-measures unaided, or
  whether the browser experiment's `resize` dispatch was doing the work, was never
  established. No compensating call was added, so nothing hides the answer.
- **3.2 — moot.** It asks about behaviour "while the page has a scrollbar"; portrait can no
  longer have one.
- **5.3 — satisfied modulo quantisation.** The player's board is full width and square, but
  its 384px is the device-pixel-aligned unit, not the raw 386px viewport. That is the
  intended behaviour of the quantised unit rather than a shortfall.
- **6.2 — `clamp()` for the partner size.** Worth revisiting together with 5.5, since both
  are about how 20vh behaves across the phone range.
- **6.3 — tablet portrait.** Renders through these same rules and has never been looked at.
  Nikolay's stated plan is to experiment with tablet ratios in the same p4 window later.

**Related intent, recorded outside this change:** the partner board should be smaller than
the player's own in every mode, and the per-board quantised unit is expected to generalise
to short landscape and desktop. Both are out of scope here and captured in the
`partner-board-smaller-intent` memory and design's Open Questions.
