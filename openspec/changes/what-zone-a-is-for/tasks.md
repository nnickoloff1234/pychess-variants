# Tasks

## 0. How this change is used

This change has TWO jobs, and they run together: settle zone A's rules, and fix the layout defects
that deciding them turns up. A finding gets a task in section 1 with its measurement and its
mechanism, not a proposal of its own — see `design.md` "Findings".

## 1. Findings, as they are found

- [x] 1.1 **The analysis page's partner stack laid out as a block, not the grid its sheet declares.**
      `TabPartDef.display` is written inline and beats the stylesheet; the part said `block`, copied
      from the round page. The stack was therefore not a grid, its 8-square board column did not
      exist, and board B took whatever its grid area gave it. Fixed by declaring `grid` — the value
      this page's own sheet needs — and `tabs.ts` now says why the value matters. Measured at
      1276x430: columns 354.6/225.1/679.1 -> 354.6/354.6/549.6, board B 225 -> 341, the partner gauge
      225x0 -> 13x341, zone A 103 -> 0, tools 679 -> 550, no overflow either way. Full table in
      `design.md`.
- [ ] 1.2 Portrait, for 1.1: the partner stack is now a grid there too, sized from
      `--bug-portrait-partner-sq`. Published and correct, but unverified — the tiled harness window
      cannot reach portrait. Measure the partner board, its pockets and the app width in portrait
      before this change is archived.
- [x] 1.3 The round page, for 1.1: its partner part keeps `display: 'block'`, which is right there.
      Confirmed by the width sweep — the round page follows the cascade and nothing about its stacks
      moved: 1300 -> 1.00 beside, 1000 -> 0.87 with a 116px column, 820 -> 0.70 in zone A, 700 ->
      0.47 with the partner board showing as the selected "Partner board" tab.
- [x] 1.4 **The engine row's min-content exceeds a minimum-width tools column** — the multipv row
      lays out 136px in a 116px column, so the "1 / 5" readout's box ends 20px past it. CLIPPED, not
      overhanging: the group's `overflow: hidden` holds, its `scrollWidth` equals its `clientWidth`.
      Recorded, not fixed — the right fix depends on the `TOOLS_MIN_SQUARES` decision (2.7).
- [x] 1.5 **The shared site header overflows between ~750 and 1050 CSS px, on every page** — at 820
      the document's `scrollWidth` is 1001 and the elements past the edge are `.site-buttons`,
      `#search-input`, `#username` and the three header buttons. NOT OURS: variant-agnostic, the
      shared header, and it belongs upstream on its own. Noted so the next sweep does not
      re-diagnose it — at those widths a horizontal scrollbar is the header, and the app's own
      overflow has to be measured against the app.

- [x] 1.6 **The side margins on a narrow viewport, asked of p2 at 701x829.** Not an enforced gap:
      `#main-wrap.bug` replaces the site's five tracks with ONE `minmax(auto, auto)` column
      (`bughouse.css:4057`) and leaves `place-content: center` standing from `#main-wrap`
      (`site.css:393`), so the width no track claims is centred as two equal margins. Measured:
      app 648.6 in a 701.3 wrapper, 26.4 each side; of the 52.7 unclaimed, ~44.3 is the partner
      board's zoom handing width back (66% stored, clamped to 78%), ~14.0 is the column gap charged
      for a tools track that is 0 wide, and the rest is the own board's quantisation. At 100% zoom
      the margins are about 4px. The two decisions it exposes are 2.9.

- [x] 1.7 **Both eval gauges were hidden on the analysis page by a single-board phone breakpoint.**
      `analysis.css:129` hides `#gauge, #gaugePartner` under `(max-width: 799px) and (orientation:
      portrait)`; that query's `orientation` is the viewport's aspect, while every mode decision in
      `bughouse.css` is made on `aspect-ratio > 9/16`, and 701x829 (aspect 0.846) falls between
      them — landscape here, with both stacks reserving their gauge column (16.5px own, 8.5px
      partner), and no gauges in them. Fixed by re-asserting `display: block` for
      `.analysis-app.bug #gauge, #gaugePartner` inside this file's landscape block, so bughouse
      portrait still hides them with its own rule (which also drops the column). Measured after:
      gauge 17x427 and gaugePartner 9x220, both beside their boards, no overflow.
- [x] 1.8 **Swept `analysis.css` — the gauges were the only live defect.** Audited on the live page
      at 701x829 (both narrow queries on) and 1276x430 (the `min-width: 800px` band), asking of
      every rule whether its query matches, whether its selector hits an element in
      `.analysis-app.bug`, and whether its value is the COMPUTED one. Results table in `design.md`,
      Finding 6. In short: `.analysis-app`'s grid columns/rows/areas are overridden in every mode;
      `.movelist-block`'s height pin is overridden; `.pv-hover-board` cannot reach us at all
      (`pvHoverPreview` is single-board only); `pvline { padding-left: 0 }` does reach us and is
      benign; `#main-wrap { --main-max-width }` and `--board-scale` are inert for want of a
      consumer; `under-left { display: none }` agrees with this page's own intent. The unconditional
      variables were audited too — `--pocketMargin: 0` against the root's 10px turned out to make no
      difference, measured: both pages' stacks are exactly ten squares.

- [x] 1.9 **A home change re-ran nothing, so the arrangement went stale — FIXED.**
      `toolsPlacement` re-runs from a `ResizeObserver`; a change of HOME resizes nothing it watches
      (the boards are capped by the width, the app is pinned to the height the last arrangement
      published), so the placement stayed the one the old home needed. Measured on p2 at 701x744:
      `--bug-app-content-h` stuck at the 769px the `below` home had published, the app stood 769
      tall in a 744 viewport that cannot scroll, zone A's row grew to the panel's 464px, and the tab
      strip was drawn at y=800 — off the page. Fixed with one notification:
      `squareUnit.notifyOnToolsHomeChange()` fires when the published home actually changes, and
      `trackToolsPlacement` registers its pass. After: app 562, zone A row 258, strip at y=593, no
      overflow. Full table in `design.md`, Finding 7.

- [x] 1.10 **The strip could not reach zone B because it was measured stretched — FIXED.** In the
      last resort the tools bar fills `zoneA2`, so `strip-in-zoneb`'s test read its 264px box
      against content of about 75 and 124px of zone B room: `124 >= 264`, false, and the strip
      stayed in a 220px column with four tabs. `align-self: start` in the zone A homes makes the
      measurement the content, and the missing `tools-lastresort.strip-in-zoneb` rules place it in
      `zoneB1`. After: 683x29, full width, no overflow.
- [x] 1.11 **The partner board scrolled once it became a tab — FIXED.** `site.css` gives every
      `div[role=tabpanel]` `overflow-y: auto` and the partner stack is a tab panel; `cg-resize`
      hangs 9px outside the stack by design, so in the last resort — where the stack is exactly its
      column's width — that became a horizontal scrollbar across the board (`scrollWidth` 229 vs
      `clientWidth` 220). `overflow: visible`, scoped to the apps because `div[role=tabpanel]` is
      (0,1,1) and a bare `.bug-partner-stack` is (0,1,0) — measured the losing way round first.
- [x] 1.12 **The partner board's tab is first in the strip, on both pages.** A tab's position is its
      declaration order, so the declarations moved: `unshift` on the analysis page, the entry to the
      head of the array on the round page, `PARTNER_BOARD_TAB = 0`, and the mounts shifted. Verified
      by clicking every tab: each shows its own content, and the round page's strip reads Partner
      board, Chat, Moves, Info.

- [x] 1.20 **The preset set was drawn outside the track it sits in.** Five fixed columns, centred,
      cannot shrink: measured at 915x412, five 46.66px buttons wanting 245px of a 183px track, the
      31px spilling left landing on the partner board. FIXED — `publishPresetSize()` caps the button
      by the region, and that cap outranks the tap-target floor. Requirement in the delta spec.
- [x] 1.21 **The preset row was spaced for an exact fit, so rounding decided the arrangement.**
      Ten buttons paired when they fitted to the last fraction; the flex then wrapped to five and
      five keeping the ten-across gap — 290px of row in a 584px box. FIXED — a pixel of slack.
- [x] 1.22 **A published size survived the arrangement that published it.** The publisher is whichever
      element owns the tools, and an inner copy shadows the outer: the app carried 61px while
      `.bug-right-column` still carried 46.67px from an arrangement that had ended. Four passes could
      not shift it; only a reload could. FIXED — stale carriers are cleared on publish. NOT ONLY A
      SURVEY ARTEFACT: resizing a window or rotating a phone reaches a viewport the same way.
      Requirement in the delta spec.
- [x] 1.23 **Short landscape left 21-44px claimed by no track**, centred as margins by `#main-wrap`,
      because `--bug-tools-track` was a `20vw` share while the boards are sized from the height.
      FIXED — in short landscape the track takes what the boards leave. 15 rows lost the finding,
      12 went clean, no row in 264 gained one.
- [x] 1.24 **The site header overflowed between 800px and the width it needs, on every page.** NOT
      OURS: fixed upstream directly (`0613e725b`, `f16c2fa58`) — the nav now yields, DONATE falls
      back to its icon, and the username is capped. It was 48 of the 56 overflow rows in the survey.

- [ ] 1.25 **No preset gap is published at all in 15 rows** — `C1` at base zoom, on phones and
      tablets. Both rows are identical and afford 7-30px; the page publishes 3, which is the floor
      showing through because nothing wrote a value for that arrangement. Same family as 1.22.
      Reproduction and the per-row affordances are in the survey's facts (`presetRowBoxes`).
- [ ] 1.26 **An anonymous `DIV` paints outside itself in the tools column, 19 rows.** Never
      diagnosed; may be the same shape as 1.20 or a fifth false positive. Identify it first.
- [ ] 1.27 **`T5-landscape-C1-100x100` gained `DIV (zoneA) overlaps chatpresets-panel`** when the
      preset rows started spreading — the only row the preset fixes made worse. Not yet looked at.

## 2. Decide zone A, per mode

- [ ] 2.1 Zone A has a different CAUSE in each mode — a reader's zoom in tall landscape, width
      pressure in short landscape, a constant fraction in portrait. Decide whether one rule covers
      all three or each gets its own, and say which in the delta.
- [x] 2.2 **Which parts may enter zone A, and in what order — DECIDED AND IMPLEMENTED.** The engine
      box first, then the move controls; the move list never leaves. Nikolay chose engine-first
      because it is the taller of the two, so moving it frees the most for the list. The ORDER then
      fixes the column: zone A grows upwards from the bottom row, so a part's row is its place in
      the queue and the column now reads move list, controls, engine, strip — the engine box has
      moved from the top of the column to just above the strip. See `design.md`, "What goes into
      zone A".
- [ ] 2.3 Whether zone A is preferred to zone B in general, or only for parts that gain nothing from
      zone B's extra width. The move list is the case to argue from: the width of both boards in zone
      B against one board's column in zone A.
- [ ] 2.4 Where a collapsed zone A's height goes — to the boards, or to zone B.
- [x] 2.5 **How much smaller the partner board should be** — ANSWERED by Nikolay, 2026-09-12, and it
      was never a matter of taste: as big as possible; it shrinks ONLY because the tools area's
      minimum width cannot otherwise fit; the floor is 50% of the main board; below that floor it
      becomes an attached tab in the tab list. Zone A is therefore a BY-PRODUCT of that cascade, not
      a design choice about board sizes. Recorded in `design.md`, "The partner board's size", with
      the three places `squareUnit.ts` currently differs.
- [ ] 2.7 **Whether `TOOLS_MIN_SQUARES` stays at 2 now that the partner board pays for it.** Before
      the cascade an unaffordable column moved the tools; now a board is spent on it, so the value
      decides how much board. Measured at 1000x639: the column is 116px and holds an engine switch,
      a four-line engine name, a clipped slider, an unreadable 60px PV block and a 60px movelist —
      for 20% of the partner board. Four squares would keep `beside` only while the column is usable
      and hand over to zone A sooner. A decision with a visible price, and yours.
- [ ] 2.8 Whether `beside` should still be preferred over `below` where `below` costs no board at
      all: with room for zone B, the tools could go there with BOTH boards full size, and the
      cascade shrinks the partner board to keep the column instead. The rule permits it; "as big as
      possible" could equally prefer the home that costs no board.
- [ ] 2.9 Whether width freed by a reader's ZOOM goes back to the viewer's own board — it already
      goes to the tools, by `toolsHome()`'s own reasoning — and whether the column gap for a
      zero-width tools track should be dropped. Together they are the 52.7px of empty margin
      measured on p2 at 701x829.
- [ ] 2.6 Whether the ZOOM floor stays where it is — `MIN_STACK_IN_LEFT_SQUARES = 4`, four squares of
      the main board's stack, Nikolay's number from 2026-09-05 — now that the WIDTH floor is 50%. A
      reader zooming their own partner board down is an explicit choice rather than the layout
      deciding, so the two may legitimately differ; it needs saying either way.

- [x] 2.10 **How a part says what it needs — THE FRAMEWORK.** Each arrangeable part declares
      `--bug-part-min-w` / `--bug-part-min-h` in the stylesheet, beside the rules that produce its
      content; `toolsPlacement.declaredMin()` reads them. Registered with `@property`
      (`syntax: '<length>'`) so the browser resolves `ch`, `em` and `calc()` to pixels — an
      unregistered property hands JS back the token it was written as. NOT `min-width`/`min-height`,
      because a real minimum would bind the layout and every part here may be clipped in a column too
      narrow for it. Initial value 0, so a part that declares nothing behaves exactly as before.
      Values seeded from measured intrinsics: engine box `19ch` (min-content 147.7px), controls
      `13ch` (min-content 100.8px, and it does not wrap).

## 3. Implement

- [x] 3.0 **The partner-board cascade from 2.5 — DONE.** `squareUnit.ts` now decides both boards'
      squares and the tools' home in ONE pure function, `arrangement()`, because each answer
      constrains the next:
      - the partner board's allowance carries the tools' minimum as a term, so it — and only it —
        pays for the column;
      - `RIGHT_MIN_IN_LEFT_SQUARES = 0.5` is the floor and the charge comes OFF below it: a board
        shrunk for a column it is no longer making room for would be shrunk for nothing;
      - the viewer's own board keeps the height's answer, capped ONLY by the width the pair needs:
        `leftStackWidthCap()`'s formula survives, its justification does not. It is not "the pair
        shrinks together" — it is the width at which the partner board sits exactly on its floor,
        because two boards side by side is the only arrangement these templates have. Deleting it
        outright was measured at 701x829 (p2's shape): a 635px own stack in 701px, 37px left for the
        partner board AND the tools, a 36x94 board and a 37px vertical tab strip. Restored, the same
        viewport gives a 432px board, a 216px partner on its floor and the tools below both;
      - `lastResort` is reached on the rule's own trigger — the width cannot hold the pair with the
        partner board at or above its floor — and the fall-through to a clipped `beside` is gone;
      - zone A gained `ZONE_A_MAX_PARTNER`, derived as `1 - TOOLS_MIN_ROWS / ROWS` = 0.7: the
        largest partner board that still leaves the tools their rows. Without it the cascade was
        NOT MONOTONE — measured at 850 in short landscape, the board was tabbed away at 0.73 while
        800 kept it beside at 0.62, because zone A was 152px against a 172px threshold. Shrinking
        to exactly 0.7 is the rule's step 2 again, in the height rather than the width;
      - short landscape's own `--bug-sq-b` got the same floor. It had the tools term from the start
        and no floor at all, which is how it drew a 2px square — a 16px board — at 700px of width.
      The regression the old form was written to avoid is recorded in `arrangement()`'s comment: the
      tools term and the floor only work together, because an unfloored charge leaves the tools'
      minimum beside the boards at every viewport and makes every other home unreachable.
- [ ] 3.1 Whatever 2.1-2.4 select, keeping `toolsHome()` a pure function of the viewport: a part
      COUNT may be an input, a measured height may not.
- [ ] 3.2 Collapse the zone A row wherever nothing is placed in it, on both pages.
- [x] 3.3 **DONE.** `.bug-tool-group` is `display: contents` in the tools-column home — each part a
      grid item of the app, an area name enough to move one — and a real box in `tools-below`,
      `tools-zonea` and `tools-lastresort`, where every part shares one area. The parts take
      `zoneTools1/2/3` in queue order, drop to `zoneA3`/`zoneA2` under `drop-engine`/`drop-controls`
      (templates `a34`, `a234`), and the engine box has a zone B fallback at `zoneB1` under
      `drop-engine-b`. The `Droppable` entries name the PANELS — `.analysis-engine-panel`,
      `.analysis-controls-panel` — not `#move-controls`, which does not survive `createButtons()`.
- [x] 3.4 **The cascade now tests both dimensions.** The zone A loop asks `zoneAWidth >= min.width`
      and charges `max(measured height, min.height)`; zone A's width is the partner stack's, which is
      the band's own width. A third `Droppable` field names a part's zone B class, and the zone B
      fallback runs after the zone A pass, cumulatively, for the parts that opted in. The height
      publish moved after both passes so `--bug-boards-h` accounts for a row zone B has just taken.
- [x] 3.8 **BOTH REGIONS IN EVERY HOME — the ladder.** The placed homes no longer move the panel as
      one box: the home decides where the move list goes, and the two fragments take the other
      region one at a time while it has room. Into the band the tallest goes first (it costs the
      boards nothing); into zone B the cheapest goes first (it takes height from both boards).
      Measured on p2 at 701 wide: 652 -> everything in the band; 684 -> controls to `zoneB1`, list
      184; 744 -> engine follows, list has the whole 258 band; 812 -> the swap, list full-width in
      `zoneB1` and both fragments up in the band. No overflow at any step. `align-self: start` in
      the band, because the own stack spanning those rows was handing them its leftover — a 40px
      button row drawn 88. Templates: `--bug-zones-zonea` +1 zone B row, `--bug-zones-below` +1
      zone A row.
- [x] 3.9 The round page is untouched: no `Droppable` entry of its own names a zone B class, so it
      has no fragments and the new pass does nothing. Verified at 701x652 in `tools-lastresort`,
      rows `296 / 264 / 0 x 6`, no overflow.
- [ ] 3.5 Check the beside and below homes are untouched where the change is about zone A only.
- [ ] 3.7 **The zone A HOME places the whole panel with no fit test** — `toolsHome()` admits zone A
      on its two proxies (2 squares wide, 3 tall) and the per-part cascade never runs there, so
      measured on p2 at 701x744 a panel wanting 464px was placed in 258px of band. Direction one,
      in the one regime the cumulative cascade does not cover. Decide with 2.3: either the home test
      asks what the panel needs, or the cascade runs in that home too.
- [ ] 3.6 **The move list is left in the narrow column when the others take the band — IN THE
      TOOLS-COLUMN HOME ONLY**, now that 3.8 has fixed the two placed homes. Measured at 900x639:
      engine and controls in 411px of zone A, the move list in the 115px column the boards allowed,
      which is the part that most wants width. The answer may differ here, because the list cannot
      leave row 1: zone A grows upwards and row 1 is the row no template takes.

## 4. Verify

- [x] 4.0 **The four homes for the fragments, measured.** 1276x430: zone A is 0, nothing drops.
      900x639: zone A 283x233, all three drop — strip `zoneA4`, engine `zoneA3`, controls `zoneA2`.
      1300x639 with both boards at 70%: zone A is 0 and zone B takes over — strip `zoneB2`, engine
      `zoneB1` at 950x77. 1000x779: the home itself is `tools-zonea`, the group a box again with all
      three stacked in the band. No app overflow at any of them.
- [ ] 4.1 Analysis page, 701x829 — no empty 177x291 band beside the partner board.
- [ ] 4.2 Round page, short landscape, 682x503 — still no overflow, every part in zone A drawn at or
      above its minimum.
- [x] 4.3 **The width sweep for 3.0 — DONE**, on a floated window, both pages, both landscape
      families. Before/after tables in `design.md`. At every width after the change: the main board
      keeps the height's answer (57.34 throughout), the partner board is never under half of it
      while beside, the tools column is at or above its 115px minimum or gone, and the app is inside
      the viewport. Before the change: a 22px column at 1000, the board tabbed away at 0.83, kept
      beside at 0.49, and the main board shrunk at 700.
- [ ] 4.4 All three modes on both pages: a rule per mode has to be seen in each.
- [ ] 4.5 Sweep the zoom across its range on the round page and confirm no arrangement oscillates — a
      fit test is a new input to a decision that changes what it measures, which is the shape this
      capability forbids.
- [x] 4.6 Frontend gates for 3.0: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test` (490) pass.
- [ ] 4.7 Portrait, for 3.0 as well as 1.1: the cascade is shared, and portrait is the one family
      the floated window has not been taken to yet.

## 5. Portrait, in a running game — the walkthrough and what it turns up

Walked on p4 at dpr 2.25 in the LIVE round page (game `mFTDKzoH`, 60+0), six phone and six tablet
resolutions, one at a time. Observations are recorded per resolution in `design.md`, "Portrait, in a
running game".

- [ ] 5.1 **360x800 — the second preset set as ONE full-width row.** Nikolay's idea: the second
      ten-button set should rearrange itself into a single row under BOTH the partner board and the
      tools column instead of stacking two rows of five in the 199px tools track, with the buttons
      resized to fit ten across and the freed height going to the chat. Measured: the row would go
      from 199.1 to 355.6 wide, the pitch from 40.3 to 35.6, the button from 37.4 to ~31 (clear of
      the 24px WCAG minimum), and the panel from 84.8 to ~36 — about 49px back to the chat.
      **PORTRAIT HAS NO ZONE A OR ZONE B**, confirmed by measurement: its areas are
      `chat / p1 / p2 / tablist` inside `.bug-right-column`, and every row is scoped to one of the
      two tracks — even the tab bar is `"stack tablist"`. So this needs a NEW area spanning both
      tracks (or portrait adopting the landscape vocabulary, which is a much bigger change and would
      have to say what zone A means when the boards are stacked). Full note, with the four things to
      decide, in `design.md`. Not a defect: nothing overlaps or overflows at this size.

- [ ] 5.2 **390x844 — the same note, recorded verbatim against this resolution too** (see
      `design.md`). The numbers make the case stronger: the tools track is 224 wide, each preset row
      90 tall, both 180 of a 348px column, and the chat 128 — SIX PIXELS LESS than at 360x800, on a
      phone 30px wider, because the buttons scale with the board square and the chat takes what is
      left. One row of ten would hand back ~54px here against ~49 at 360x800, so the improvement
      grows with the phone. Nothing overlaps or overflows.

- [ ] 5.3 **393x873 — the same note again** (see `design.md`). Tools track 217, chat 153, preset
      rows 92 each = 184 of a 377px column; one row of ten hands back ~56px, the most of the three
      phones so far. The 29px of extra viewport height over the iPhone all went to the chat while
      the rows barely moved — the rows follow the board's square, the chat takes the remainder.
      Nothing overlaps or overflows.

- [ ] 5.4 **412x915 — the same note, and the strongest case for it** (see `design.md`). Preset rows
      98 each = 196px, HALF the 392px column, against a 157px chat; one row of ten hands back ~62px.
      Across four phones the rows take 169.6 -> 180 -> 184 -> 196 as the screen grows, because they
      are sized from the board's square rather than from the column's room — the bigger the phone,
      the larger the share the presets claim, which is backwards. Nothing overlaps or overflows.

- [ ] 5.5 **414x896 — the same note, and the worst ratio of the six** (see `design.md`). Preset rows
      99 each = 198px against a 135px chat, more than half a 373px column; one row of ten returns
      ~63px. A 19:9 phone is shorter for its width than a 20:9 Android, so it loses twice: less
      height, same rows to pay for. Nothing overlaps or overflows.
- [ ] 5.6 **THE TAB STRIP HAS ROOM FOR THE FULL WIDTH TOO — across every phone so far.** Nikolay,
      alongside the preset note: there is space for the tablist to take the full width as well, and
      it will probably happen naturally once the full-width row exists. Measured, the strip uses
      **39-41% of the viewport width** at all five sizes (140/356, 159/388, 152/390, 163/409,
      167/412), because it lives in `"stack tablist"` — the tools track only — sharing it with the
      draw and resign controls, which is why its three tabs ellipsise on the narrowest phones. The
      same new both-tracks row would hold it, and it is the part with the least to lose by being
      wide. It changes nothing about the ½ and ⚑ labels (portrait never labels them, by rule) and
      costs no height: the strip is already 28px of content inside a 40px bar.

- [ ] 5.7 **375x667 (iPhone SE) — the same note, a 44px chat, and the one place the row is NOT
      free.** Worst of the six: chat **44**, preset rows 61 each = 122 of the same column, own board
      370². The buttons did shrink (`publishPresetSize()` working). **But in portrait the full-width
      row costs the own board**: the tools column's height is `max(partner stack, tools content)`, so
      moving the second set out saves only 10px there while the new row adds ~36 below — about 27px
      of own board for about 51px of chat (44 -> ~95). Landscape has no such cost, because zone A is
      space the shorter board already freed. **This is the decision to take before designing the
      row**, and it is not the landscape decision.
- [ ] 5.8 **The SE sits 0.6% inside the portrait threshold** — 375/667 = 0.5622 against 9/16 =
      0.5625. Emulated at 373x655 (0.569) the page flips to the landscape arrangement: boards side
      by side, own board 228², the tools in a 118px band. On a real SE the URL bar hiding on scroll
      could flip the whole layout. Decide whether the threshold wants hysteresis, or whether the SE
      belongs on the portrait side by construction.

- [ ] 5.9 **375x667 — A SECOND ITEM, and it is NOT CLEAR HOW TO ADDRESS: there is hardly any space
      for a proper chat text area.** Nikolay's message is recorded verbatim in `design.md`. Measured:
      the chat gets **44px** — a line and a half — with nothing overlapping or overflowing. To be
      REVIEWED before anything is designed, and there are two candidate directions, neither chosen:
      (1) render the chat and the buttons differently at this size rather than scaling them down —
      the full-width preset row (5.7) returns ~51px of chat for ~27px of own board, and whether that
      is enough is the open part; or (2) MOVE THE THRESHOLD, since this resolution is liminal —
      375/667 = 0.5622 against 0.5625, so a few pixels less height enters the other mode — and if
      portrait cannot hold a usable chat at this height, the SE may belong in the other layout with
      the boards drawn differently. Related to 5.7 and 5.8; the trade in 5.7 only matters if
      direction (1) is taken.

- [ ] 5.10 **768x1024 — THE PRESETS SHOULD TAKE ZONE A, by the mechanism the analysis page already
      has.** Nikolay's note recorded verbatim in `design.md`: use for the preset buttons what we did
      for the analysis page's engine box and controls, so the chat gets the height. Measured: zone A
      is **245 x 306 and EMPTY** while the whole tools stack queues in zone B and the chat has 143.
      **It cannot happen today for a structural reason** — the cascade offers the band only to parts
      that declare a zone B class, and `ROUND_DROPPABLE`'s entries declare none, so the round page
      has no fragments at all. The step is small and already designed: give `.chatpresets-panel-1`
      and `-2` the third `Droppable` field and a declared `--bug-part-min-w/h`; the areas (`zoneA2`,
      `zoneA3`) and the group element already exist. A row folded to the band's 245px is ~61px tall,
      so both rows fit the band twice over and the chat goes 143 -> ~317 at no cost to either board.
- [ ] 5.11 **768x1024, second item — TEN IN A ROW here too, for the opposite reason.** The two rows
      are already 751px wide and still hold five buttons each, strung out with huge gaps. Ten across
      751 is a 75px pitch and halves the block (174 -> ~45), handing ~87px to the chat, with no
      trade at all. **Interacts with 5.10**: in zone A the presets are back in a 245px column and
      want five per row; in zone B they want ten — the row count is a function of the region's
      width, which `publishPresetSize()`/`SET_COLUMNS` already decide from. Settle 5.10 first.

- [ ] 5.12 **810x1080 — better than 768, and the ten-in-a-row fold ALREADY EXISTS.** Nikolay's
      comment recorded verbatim in `design.md`; to be reviewed again. Measured: the same two panels
      are five-across and 87 tall at 768 but **ten-across and 44 tall at 810**, buttons shrinking
      ~43 -> ~38, so both rows cost 88 instead of 174 and the chat goes 143 -> **252**. Therefore
      5.11 is not "invent ten-in-a-row" but **"why does 768 miss the fold and should the threshold
      move"** — `zoneB()`'s `oneRow` test and `publishPresetSize()`'s height-derived button size
      interact, and 768 lands on the wrong side. On the phones the fold still has nowhere to go: the
      tools track is 199-235 wide and a folded row needs both tracks.
- [ ] 5.13 **810x1080 — EXPERIMENT: the presets in zone A here too.** Even with the fold, zone A is
      256 x 327 and empty while the presets hold 88px of zone B. Moving them to the band hands the
      chat those 88px (252 -> ~340) at no board cost, and in a 256px column they go back to five per
      row (~122px, which the band holds twice over). Whether a 340px chat beside the boards reads
      better than a 252px one with the presets below is a judgement for the screen — try it both
      ways at this resolution. Depends on 5.10 (the round page's parts becoming fragments).

- [ ] 5.14 **820x1180 — the same as 810 with more room; THE LEAST INTERESTING TO REVIEW.** Nikolay's
      note recorded verbatim in `design.md`. Own board 523², partner 261², chat **346**, preset rows
      44 each with the fold holding, zone A 261 x 326 empty, 184px of header overflow (Finding 3),
      no overlaps. Nothing new in kind — skip it when re-reviewing. It does turn 5.13 around,
      though: at 346px the chat is already more than the conversation needs, so the presets moving
      to the band here is about putting them beside the boards and filling a dead 261 x 326 region,
      not about buying chat height. **834x1194 (iPad Pro 11") IS FILED WITH IT AS SKIPPABLE:** 533²
      and 267² boards, the same 346px chat, folded rows at 44, zone A 267 x 334 empty, 170px of
      header overflow, no overlaps — 14px wider than the Air and identical in kind.

- [ ] 5.15 **800x1280 — all the slack goes to the chat; A RULE IS NEEDED.** Nikolay's note recorded
      verbatim in `design.md`. Measured: chat **459** and nearly empty, boards 512²/251² (sized by
      WIDTH, not height), zone A 251 x 327 empty, ~460px of slack spent entirely on the chat.
      **The rule he asks for — move the presets on how much chat is visible — has its ingredient
      already**: `chatMinHeight()` computes what the chat needs from its line height and input, and
      `publishPresetSize()` already subtracts it. So "the presets leave the chat's column while the
      chat is under N times its minimum" is writable against a number the module measures. The four
      tablet chats bracket it: 143 / 252 / 346 / 459.
- [ ] 5.16 **Why 4x5 at 768 and 2x10 at 810 — ANSWERED, and it is a decision, not a bug.**
      `publishPresetSize()` computes the button for BOTH arrangements — two sets per row (2x10) and
      one (4x5) — and publishes whichever gives the LARGER button, floored at 0.55 of a board square
      and capped at one square; the stylesheet then wraps to match, since a set is five fixed tracks.
      At 768 the four-row option won (~43px buttons), at 810 the two-row one (~38). Whether "biggest
      button" is the right objective — rather than "fewest rows, so the chat keeps its height" — is
      the same decision as 5.15. Full derivation in `design.md`.

- [ ] 5.17 **1024x1366 — "plenty of unused space", and THE MODE ITSELF MAY BE WRONG.** Nikolay's
      note recorded verbatim in `design.md`. Measured: own 651², partner 331², chat **372**, zone A
      **331 x 400 EMPTY** (larger than most phones' whole viewport), content 1313 of a 1372 budget
      with the chat absorbing the slack, and no header overflow for the first time in the set.
      **The boards cannot take the space**: they are WIDTH-capped at 82.8 per square while the
      height's answer is 131 — the cap exists so the partner board fits beside them. So the real
      item is the THRESHOLD: every tablet is in the landscape family because the portrait test is
      `aspect-ratio <= 9/16` and a 4:3 tablet upright is 0.75, yet the portrait arrangement would
      give a **1024px own board instead of 651** and use ~1364 of the 1372 height. Decide whether a
      viewport this tall should be stacked regardless of aspect. Interacts with 5.8, where the same
      threshold is 0.6% away in the other direction.

- [x] 5.18 **The layout matrix re-run, 2026-09-12: 127 failing rows -> 102.** Diffed row-by-row
      against the stashed-HEAD baseline of 2026-09-07, same 264 rows: **31 fixed, 6 broken, 52 with
      different text**. Empty-zone-A failures 36 -> **12**, chat input covered 10 -> **1**, REMATCH
      and NEW OPPONENT covered 14 -> **0**, stale arrangement 2 -> **0** (Finding 7 in a second
      harness). Report at `~/dev/layout-matrix-2026-09-12/index.html`. Full tables in `design.md`.
- [ ] 5.19 **The six rows the matrix broke.** `T1-C3-100x100`, `T1-C3-100x50`, `T5-C3-100x100`,
      `T5-C3-100x50` — the END-OF-GAME case finding a new empty `zoneA3`, which is this change's own
      "a zone is occupied or it is not there" requirement arriving in a case the walkthrough never
      opened. `T1-C4-50x50` — tab "Moves" covered by a piece and `bug-own-stack` overlapping a
      `zoneB2` div by 245x30. `T6-landscape-C1-50x50` — `bug-partner-stack` overlapping
      `bug-presets-group` by 412x5. Note `own-stack` overlaps rose 35 -> 45 while `partner-stack`
      fell 38 -> 34, which with the new "tab Moves covered" rows points at the analysis page's parts
      being grid items in `zoneB`/`zoneA` rows at 50% zoom.

## 6. Where this stands — 2026-09-13

WHAT IS DONE. The layout survey (`tests/layout_matrix`) is the instrument this change now works
through, and it is trusted: four of its checks were wrong and were corrected or removed, a fifth was
demoted to a warning. Its report carries per-row notes and an accepted flag (`notes.json`, 229 rows
recorded, 187 accepted) and diffs against `baseline.json` so a fix is reviewed rather than believed.
Findings 1.20 to 1.23 are fixed and confirmed on screen; 1.24 went upstream on its own. Two
requirements were added to the delta spec, and `design.md` records how the instrument is used.

WHERE TO PICK UP. 1.25 first — it has a reproduction and is the remainder of a class already fixed
twice. Then 1.26, which needs identifying before it can be judged. 1.27 is one row. The survey's
remaining classes, by unaccepted rows: area slack (~38), the tools column's `DIV` (17), the
unpublished gap (12), zone A declared and empty (12).

WHAT IS PARKED, DELIBERATELY. The clearance warning: of 141 findings, 108 were a 0.0px flush edge
between a panel and a board, which is a grid track ending where the next begins. The real case (a
seat name overhanging its own stack by 1.7px, a preset button 3.3px below) reads as crowding rather
than breaking, and separating the two needs a different question — is a surface drawn OUTSIDE its
own part's box and close to a board.

THE WORK SO FAR IS OUT. Fork master carries all of it (`8afa1ac90`); PR #2355 takes the layout and
reconnect work to gbtami without the fork-only material, for Nikolay to review and merge.

## 7. Record

- [ ] 6.1 Fold the decisions into `bughouse-round-layout`, replacing this change's acceptance criteria
      with the rules actually chosen — and keep the findings' requirements, which are not criteria but
      facts about where a size may be stated.
