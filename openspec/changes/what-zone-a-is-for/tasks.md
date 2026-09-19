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
- [x] 1.26 **An anonymous `DIV` paints outside itself in the tools column — DIAGNOSED AND FIXED,
      15 of the 19 rows.** The `DIV` is the tab panel and the thing painting outside it is THE CHAT.
      The chat is a flex item, so its `min-width` is `auto` — the automatic minimum, which resolves
      to its CONTENT's min-content width — and its content includes a text input. An `<input>` with
      no `size` attribute has an intrinsic width of 20 characters: cloned at `width: max-content` it
      measures 201px at this font, which is the painted width the survey reported in every one of
      those rows. The tools track is routinely narrower — 190px at 844x390, 141px at 1024x768, 61px
      at 667x375 — so the chat was wider than the panel holding it and the panel's `overflow:
      hidden` cut the right edge off the input. At 667x375 the input's centre was off the viewport
      entirely, which the hit test had been reporting separately as `chat input is covered by
      nothing (outside the viewport)`: it could not be clicked at all.
      Fixed with `min-width: 0` on `.bugroundchat`, beside the `min-height: 0` that refuses
      `site.css`'s `15em` for the same reason — the track is the authority on how wide the chat is,
      as the row is on how tall, and what the chat needs is declared as `--bug-part-min-w` like
      every other part. ISOLATED FIRST, on the live page: hiding the input drops the chat to the
      panel's width, `min-width: 0` on the INPUT alone changes nothing (an item's own minimum is not
      what its parent's automatic minimum is computed from), and the chat rule and `width: 100%` on
      the input fix it identically. 15 rows went clean, none newly failing.
      THE REMAINDER IS A DIFFERENT CAUSE: `P5-landscape` (667x375) has a 61px tools column, and the
      button rows in it — movelist controls at 103px, the engine box at 129px, the end-of-game block
      at 75px — are icons that cannot shrink. That is the partner board's cap, parked by Nikolay for
      a change of its own.
- [ ] 1.27 **`T5-landscape-C1-100x100` gained `DIV (zoneA) overlaps chatpresets-panel`** when the
      preset rows started spreading — the only row the preset fixes made worse. Not yet looked at.
- [x] 1.28 **The band spread its parts with the own stack's leftover instead of their own height —
      FIXED.** In the `below` home zone A's two rows were `min-content`, and the own stack SPANS the
      board row and both of them: grid hands a spanning item's leftover equally to every spanned row
      whose MAX sizing function is intrinsic, and `min-content` is intrinsic. Measured at 768x1024,
      an own stack of 590 over rows of 295 + 40 + 75 — each of the three rows was given 60px it had
      no content for, so the engine box and the button row were drawn 60px apart with another 60
      below them; on the round page at the same size an EMPTY band row was 55px tall. The pair are
      now `minmax(min-content, 0)`: a definite max keeps them out of that distribution, `min-content`
      keeps each row at its own part's height, and an empty one collapses. All the leftover lands in
      the board row above, under the partner board, which is where the rule in 2.11 says it belongs.
      Chromium and Firefox agree at three own-stack sizes, one of them short enough to show the move
      list keeps exactly the height it has today. The `align-self: start` the parts carried here went
      with it — there is no longer a row to stretch into.
- [x] 1.29 **The engine box sat BELOW the button row wherever both were in the band — FIXED**, by
      2.11's second half. The parts drop in the order tablist, engine, controls and each new one
      takes the next row UP, which is what put the button row on top. Stated per home instead:
      engine `zoneA2`, controls `zoneA3` in `below` and in `beside` once both have dropped; engine
      `zoneA3`, controls `zoneA4` in `zonea`, under the move list. The engine box alone keeps
      `zoneA3` in `beside` — the only band row that template has for it — and it does not matter,
      because an empty band row collapses and a lone part is at the bottom of the band either way.
- [x] 1.30 **The survey called the band a defect, in 40 rows.** `area stack is Npx tall and its
      occupants use Npx` fired on the partner stack's OWN area — but zone A is defined as the height
      the partner board leaves in its column, so that area is underfilled by exactly the band, and
      always. The check was reporting the layout for being itself, and 1.28 would have added 48 more
      of them by putting the slack where the rule wants it. Now a warning rather than a failure, and
      only while the partner stack is alone in that area: the last resort puts the tools there too,
      and height going unused under a panel is an ordinary finding. How much band there is and
      whether anything is in it is what the zone A areas say on their own.
- [x] 1.32 **THE SURVEY NOW COMPARES THE TWO STACKS — a class of defect it could not see.**
      Nikolay, on `T1-C4-minxmin`: "if both are at minimum they should both have same size, which
      here seems to be the case and is good, but also they should have the same state of the
      username... the pocket strip and usernames are rendered differently causing the stacks to have
      different size, even though the boards inside the stack match." Nothing in the survey asked
      about that: every check was about an area, a part, or a pair of surfaces, and a stack 45px
      taller than its twin breaks none of them — nothing overlaps, nothing overflows, and each stack
      fits the area it was given. The new check asks its question ONLY where the two boards are the
      same size, because different sizes are meant to carry different furniture, and it reads the
      name's state from its DRAWN WIDTH rather than from a class — a name on its own line is as wide
      as its strip, squeezed into the pocket row it gets a fraction of it — since two different
      mechanisms decide it and neither can be trusted to speak for the other. The stacks' numbers are
      recorded on every row as `seats`, whether or not the check fires.
- [ ] 1.33 **The analysis page gives its two stacks different furniture at the same board size** —
      found by 1.32; four rows when it was found, TWO NOW. `T3-C4-minxmin` and `T4-C4-minxmin` were
      fixed by 2.12: their partner stacks had room for the line all along and were refused by the
      cap the CSS rule charged. `T1-C4-minxmin` and `T6-C4-minxmin` remain, and they are the case
      no implementation reaches — 44px of room against a line that really costs 45.2.
      At `T1-C4-minxmin` both boards are 188x188 while the own strips are 46.1px each with the
      username on a line of its own and the partner's are 23.5px with it inline — 45px of difference
      from furniture alone. THE ROUND PAGE NEVER DISAGREES: in every equal-board row its two seats
      reach the same answer, inline or outside together.
      THE CAUSE, measured. Each page answers the question its own way — `seatNamePlacement.ts` by
      measuring (round page only) and `--bug-name-outside` by arithmetic (both pages) — and the
      arithmetic spends `--bug-coord-room`, which is `10 * (--bug-stack-allow - --bug-stack-sq)`:
      the stack's spare height INSIDE ITS OWN ALLOWANCE. The partner board is width-capped at half
      the own board's allowance (29.5px per square against 59), so at "minimum zoom" the two are
      drawn the same size but stand at very different fractions of their own ceilings — the own
      board at 40% of its allowance with 355px of room, the partner at 80% with 60px, just short of
      the ~64px two name lines cost.
      WHAT IS NOT DECIDED. The room the rule spends is the BOARD's; the room Nikolay is looking at
      is the COLUMN's, and that column has 85px unused on the same row — the survey says so in its
      own warning. Letting a stack spend the column was refused once, deliberately and with a
      measurement (`spaceFor()`, "The room was never the board's to spend"), because at full zoom the
      partner sits in a column taller than it may use. The band is also what zone A offers the tools,
      so a name taking it is a name taking the tools' room. Nikolay to decide; not a fix to guess at.
- [ ] 1.31 **Draw and resign are sized unlike the tabs they share a row with** — Nikolay, on the
      four short-landscape `C2` rows: "there is enough space for the draw and resign button to fit in
      the tablist row if they were slightly smaller ... they should probably follow similar size as
      the tablist buttons in all cases, which would allow them to stay on same row more often than
      not." The wrapping he saw is gone — 1.23 gave the track the width it was short of — but the
      sizing rule he asked for is not written, and the survey has no check for it. Recorded here
      because those rows are accepted now and the note went with them.

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

- [x] 2.12 **ONE IMPLEMENTATION OF THE SEAT-NAME RULE, FOR BOTH PAGES — decided by Nikolay,
      2026-09-19.** "this logic does not belong to page level - it belongs to the stack components
      and they are the same in both pages more or less so maintaining two different implementations
      for two different pages but same thing inside them makes no sense."
      MEASURED FIRST, as he asked. Both rules were evaluated on every row of the survey — 528 stack
      decisions — and they agree on 485. Every disagreement is the same one and runs one way: 33
      partner stacks on the round page are granted a line by the measuring module that the CSS
      arithmetic refuses, because the arithmetic charges the font's CAP (53.8px for the pair) where
      the line really costs 31.9 to 40.6. Nowhere does the arithmetic grant one the module refuses.
      The room the two compute is identical, and both decide per stack; the cost was the whole of
      the difference.
      DONE. `seatNamePlacement.ts` moved to `client/two-board/common/`, its app selector widened to
      both pages, and `analysisCtrl` now calls it with `clearBoardBounds` — the invalidation the
      round page always had for a board that MOVES inside its stack without resizing. The CSS
      decision is deleted: `--bug-name-outside`, `--bug-name-room`, `--bug-name-line` and the
      `@property` registration are gone, and the style query that rendered the state became
      ordinary rules on the same two classes. What each page says "outside" LOOKS like stays its
      own — the analysis page's strips need a full flex basis where the round page's name reaches
      the next line by itself — which is the half that legitimately differs.
      AND THE COST IS NOW MEASURED IN BOTH DIRECTIONS, which the move required rather than merely
      allowed. The module charged a seat without the line twice its RENDERED font size: an
      over-estimate on the round page, where the name sits at its 16.8px cap, and a wild
      under-estimate on the analysis page, where the name's size comes from a container query and
      falls with the strip — a name rendering near 5px would have been charged about 20px for a
      line costing 45.2, granted it, measured the truth on the next pass and taken it back. That is
      the 12Hz flip by a new route. `lineCost` now TRIES it: the class goes on, the strip is read,
      the class comes off, and the caller decides against a real number. One forced layout per seat
      that does not already have its line.
      RESULT: 57 failing rows to 55, nothing newly failing, every row settling within three frames
      and no `layout never settled` anywhere. The two rows that went clean are the ones the cap had
      been refusing.
      DEFERRED, DELIBERATELY: oscillation. The arithmetic could not oscillate and needed no
      observer; the analysis page now has both. Nikolay: "we will address oscillation at the very
      end when everything else is decided so at that point we know exactly what depends on what."

- [x] 1.34 **TWO MORE CHECKS THE SURVEY DID NOT HAVE — the minimum-zoom invariant, and tap
      targets.** Both are Nikolay's, 2026-09-19, and both came from rows reported as clean that he
      could not accept.
      THE FIRST IS A RULE THE CODE ALREADY STATES. `MIN_STACK_IN_LEFT_SQUARES` is four squares OF
      THE LEFT BOARD — a size, not a percentage, "because a flat no-less-than-50% lets one board
      shrink to half of a big square and the other to half of an already small one" — and each
      column converts that one size back into its own percentage. The comment says what must
      follow: "The two sliders therefore stop at different numbers AND AT THE SAME BOARD SIZE,
      which is the whole point." So the check asserts exactly that, with one device pixel of
      tolerance because the two squares are quantised independently. It has to be asked of the
      REQUEST — a drawn page cannot tell a board sitting on its floor from one asked for 39% — so
      the walk now hands the probe `{zoom, minZoom}` and the check runs only where both columns
      were set to minimum.
      THE SECOND IS WCAG 2.2's 24x24px target size (2.5.8), which this stylesheet already cites as
      the reason `--bug-preset-btn-min` exists. Measured first as a plain failure and it turned
      EVERY row red — 264 of 264, with 1056 of the 1163 findings the four username links (19-21px
      tall, 70-190px wide) and 64 the multipv slider's track. Short on one axis and long on the
      other is the shape the standard's inline and spacing exceptions are written for, so the check
      is now two-tiered: under the minimum in BOTH dimensions is a FAILURE — small every way, no
      exception reaches it — and under on one axis is a WARNING. Four rows fail: twenty preset
      buttons at 9.8x9.8 in `P5-landscape-C1`'s 61px tools column, the same buttons a pixel under at
      `D2-C1-minxmin`, and the multipv slider drawn 14.2px and 2px wide on two analysis rows. That
      is the starved column detected at last, in a published standard's units rather than in a
      number either of us invented.
- [ ] 1.35 **At minimum zoom the two boards are NOT the same size — 45 rows**, found by 1.34 and not
      yet fixed, on Nikolay's instruction that the harness comes first. Every `minxmin` row on all
      six desktops and five of the tablets, in all four cases, and the partner board is consistently
      the LARGER: `D1` 35.0 against 41.0 per square, `D4` 28.0 against 33.0, `D5` 50.0 against 58.0.
      Where to look: `minZoomPercent()` computes `floorHeight` from `allowanceFor('a')` and divides
      by `allowanceFor(boardName)` — both read from the viewport directly — while the page PUBLISHES
      allowances that disagree with the second of those. At `D4-C1-minxmin` the published allowances
      are equal (71 and 71), so the two minimum percentages should be equal too, and they come out
      39 and 46. 34 of the 45 rows had been accepted before this check existed.

- [x] 2.11 **How the parts sit in the band — ANSWERED by Nikolay, 2026-09-19.** Two rules, one
      general and one not:
      - **Whatever zone A holds stacks at the BOTTOM of the band, glued, with the slack above it** —
        several parts or one, and a single part is bottom-aligned for the same reason. The band is
        the space the partner board frees, so the empty part of it belongs under that board, where
        it reads as the band not being full rather than as gaps between the parts.
      - **The engine box is above the button row wherever both are in the band.** This one is about
        those two parts only — it is not a rule about the band — and it holds whether the move list
        is beside them in the tools column or below them in zone B.
      Implemented in 1.28 and 1.29; the homes beside the boards already satisfied the first, their
      first row being `minmax(0, 1fr)` and taking the slack by being flexible.

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

## 6. Where this stands — 2026-09-19

WHAT IS DONE. The layout survey (`tests/layout_matrix`) is the instrument this change works through,
and it is trusted: five of its checks were wrong and were corrected, removed or demoted to warnings.
Its report carries per-row notes and an accepted flag (`notes.json`) and diffs against
`baseline.json`, so a fix is reviewed rather than believed. Findings 1.20 to 1.24 are fixed and
confirmed on screen, and 1.28 to 1.30 with them: zone A's rule — parts glued at the bottom of the
band, slack above, engine box above the button row — is 2.11, and the run went from 122 failing rows
to 63 with nothing newly failing and 59 rows going clean. 1.26 followed, the chat's inherited
minimum: 15 more rows clean and again none newly failing. Then 2.12 put the seat-name rule in one
place for both pages, which took two more rows with it — 55 failing at that point. The two checks in
1.34 then took the count to 85, all of it work that was always there and unseen: 45 rows where two
boards at their minimum are not the same size, and 4 where a tap target is under the accessibility
floor in both dimensions.

WHERE TO PICK UP. 1.25 first — it has a reproduction and is the remainder of a class already fixed
twice: no preset gap is published at base zoom, so the rows sit compacted where they have 7-30px to
spread into. Then 1.26, which needs identifying before it can be judged, and 1.27, which is one row.
1.31 is Nikolay's, small, and has no check behind it yet.

WHAT THE SURVEY STILL HAS OPEN, by unaccepted rows: the preset gap and the compacted rows at base
zoom, the tools column's anonymous `DIV`, and PORTRAIT — where the space between the boards goes
unused by every tool that could take it. Portrait is the biggest group and it is not this change's:
`portrait-preset-panel-and-flow` holds it, and its premise needs rewriting first, because portrait
is not without a zone. The analysis page in portrait already drops all three parts and gives the tab
strip a full-width row of its own; the round page in portrait fires no drop at all.

WHAT IS PARKED, DELIBERATELY. The clearance warning: of 141 findings, 108 were a 0.0px flush edge
between a panel and a board, which is a grid track ending where the next begins. The real case (a
seat name overhanging its own stack by 1.7px, a preset button 3.3px below) reads as crowding rather
than breaking, and separating the two needs a different question — is a surface drawn OUTSIDE its
own part's box and close to a board.

THE WORK SO FAR IS OUT. Fork master carries all of it; PR #2355 took the layout and reconnect work to
gbtami without the fork-only material.

## 7. Record

- [ ] 6.1 Fold the decisions into `bughouse-round-layout`, replacing this change's acceptance criteria
      with the rules actually chosen — and keep the findings' requirements, which are not criteria but
      facts about where a size may be stated.
