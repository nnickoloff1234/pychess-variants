## 0. Status

**Exploration, opened 2026-08-29. CLOSED 2026-08-30: the answer is NO, and the good half of it
shipped as grid.** Section 2 said the answer might be no; it is. The flow model was never committed
— `bug-boards-row`, `bug-drop-a` and `bug-drop-b` appear nowhere in `static/bughouse.css` and
nowhere in git history, so the probes of 3.1 and 3.2 lived in a working tree that was rolled back to
the checkpoint below.

**What survived is decision 3a's TWO ZONES, expressed as named grid areas** — commit `8f0f877`,
"bughouse analysis: one flat grid, zones named by position": `zoneTools1/2` in the tools column,
`zoneA` under the partner board, `zoneB` the full width under both. Its message answers this
change's central risk in one line — *"a part moves by changing one property and nothing is
reparented"* — which is task 2.2's question, avoided rather than resolved. The design document said
as much in advance: *"If any of it is unsafe, the fallback is grid areas — which is the current
design."*

The zones are live and still being worked on: on 2026-08-30 zone B was gated to the flattened
layout, because it had been claiming the tools bar in modes that have no row under both boards.

**The delta spec is deliberately NOT synced.** It requires arrangement by flow with no track
declared for the tools, and that is not what the page does. Syncing it would write a requirement the
code contradicts.

Checkpoint to return to: commit `52b6e5daf`. `git checkout .` restores it; `openspec/` is not in
that commit.

Portrait is out of scope on both pages and must not be touched.

## 1. What has already been measured

- [x] 1.1 **The DOM has three levels and two grid contexts**, so ordering is confined per container:
      the app has two participants (own stack, merged column); the column has seven grid items,
      because `.bug-parts` is already `display: contents`; a stack's children are sealed off. The
      own board cannot be ordered against the tools at all today.
- [x] 1.2 **App-level flex with `row nowrap` is pixel-identical to the grid** on the analysis page
      in BOTH landscape modes — every number matched, no overflow.
- [x] 1.3 **`row wrap` breaks it**: the column grew to 756px in a 551px app, the page overflowed,
      and the tab list dropped spuriously. A wrapped line sizes to content, not to its container.
- [x] 1.4 **`column wrap` with the merged column flattened produces the wanted arrangement**: own
      stack column 1, partner stack column 2, panel and tab list stacked in an implicit column 3
      (277x503 and 277x49 at x931). No overflow, no third track declared.
- [x] 1.5 **The panel's flex-basis decides the arrangement**: `1 1 auto` pushes the tab list into a
      fourth column and overflows; `1 1 0` tucks the panel into column 2 at zero height; `1 1 1px`
      is correct.
- [x] 1.6 **The round page's own stack collapses** under the same app-level flex — 437x547 to
      225x334, board clipped — because it is `display: block` with no intrinsic width where the
      analysis page's is a grid. `flex: 0 0 calc(var(--bug-sq) * 8)` repairs it, to within ~4px.

## 2. Decide, before any conversion

- [x] 2.1 **Answered: the drop stays, and gets two landing places.** A single wrapped container
      cannot span, so the outer structure becomes two parts — a `column wrap` container for the
      boards and tools, and a full-width zone below it. Design decision 3a.
- [x] 2.1a **Zone A measured and free.** An item after the partner stack lands in the leftover of
      that board's column — x465 y547 with the partner board short, no JS involved. With both
      boards full height there is no leftover and it goes to column 3 instead, which is the right
      condition for it to depend on.
- [x] 2.1b **Answered by the grid, not by flex.** Under `column wrap` the competition was real —
      a `1px` basis fits any gap, so the tab PANEL tucked into column 2 at 2px tall. A named area
      cannot be fallen into: `toolsPlacement.place()` decides zone B first and the zone A loop then
      skips any part zone B has taken, so exactly one zone holds each part by construction. The
      original wording, for the record: **Zone A competes with the tools for that gap.** In the same probe the tab PANEL also
      tucked into column 2 at 2px tall, because a `1px` basis fits any gap. Whatever is allowed to
      fall into zone A has to be the only thing that can.
- [x] 2.2 **Never needed: nothing is reparented.** The two zones are grid AREAS on one container,
      so a part moves by changing `grid-area` and its element never leaves its parent — no snabbdom
      `vnode.elm` question, no Highcharts re-init, no scroll or focus state to preserve. This is the
      fallback the design named, and it is what shipped. The original wording: **Confirm DOM moves
      are safe — the new risk in 3a.** Nothing in this design moves DOM
      today; two zones in two containers means reparenting, because `order` only works within one
      container. Check snabbdom's `vnode.elm` after a move, the Highcharts instance in the movetime
      panel, and scroll/focus state. If any of it is unsafe, the fallback is grid areas — which is
      the current design.
- [x] 2.3 **Answered: no.** Every board width would have moved from a track to a `flex-basis` — the
      same number in another property, as the design itself noted — and `.bug-right-column`'s
      `overflow: hidden` and zero minimums would have had to be re-expressed on each promoted child,
      since a `display: contents` element forms no box. Against that, the flat grid gets the same
      arrangement by naming areas, keeps the drop, and reparents nothing. The conversion does not
      pay.

## 3. Only if section 2 says yes

- [x] 3.1 **Analysis page, short landscape: applied and working.** `.bug-boards-row` wraps the own
      stack and `.bug-right-column`; `.bug-drop-a` follows the partner stack; `.bug-drop-b` is a
      sibling of the row. Short landscape builds the row as `column wrap` and dissolves
      `.bug-right-column`; every other mode dissolves the row. Measured: own 454x551 column 1,
      partner 454x551 column 2, panel 277x503 and tab list 277x49 in an implicit column 3, no
      overflow. Portrait and desktop landscape unchanged to the pixel.

      Three failures worth keeping, all from the same family — a rule that means something
      different once `display` changes:
      - applied to ALL landscape, desktop broke: it still carries `justify-content: center` and its
        grid tracks, which mean other things under flex (app at x538, panel at x1604 in 1595px);
      - dissolving per-mode left the row an unstyled BLOCK in desktop, so the app grid held a
        wrapper instead of the two stacks it names. Fixed by making dissolve the DEFAULT and having
        one mode opt in — an inert wrapper cannot break a layout that has never heard of it;
      - the default was stated AFTER the media block and a media query adds no specificity, so it
        won everywhere and short landscape silently kept the dissolved row: both boards at x0, tab
        list at y1103 in a 551px viewport.
- [x] 3.2 **Analysis page, desktop landscape: applied and working, and the earlier "it cannot" was
      wrong.** Two things had to be right. First, restating the declarations that change meaning
      under `display: flex` — that mode's `justify-content: center` and `align-content: start` were
      written for the grid. Second, a `column wrap` container has no usable intrinsic width: asked
      for its max-content it answers with about ONE column, so an app whose width is derived from
      its contents collapsed to 554px with the rest overflowing to x1863 in a 1701px viewport.

      **Giving it a width does not cost the centring**, which is what made this look structural. The
      cross axis of a `column wrap` container is horizontal, so the COLUMNS are placed by
      `align-content`: the row runs full width and `align-content: center` centres the columns
      inside it. Measured: content x206 to x1495 in a 1701px viewport — 206px of margin each side,
      the same centring that mode always had. `#main-wrap` hands the app the width via
      `grid-template-columns: 1fr`, as short landscape already did.

- [x] 3.3 **Not run — moot.** There is no implicit column: the flat grid declares the tools column,
      so the 68px it was to have recovered is not lost in the first place. (The finding stands as a
      fact about `column wrap`: its implicit column is content-width, 277px against the grid's 356.)
- [x] 3.4 **Not run against flex — the round page was never converted.** The underlying worry, that
      every probe had used a FINISHED game whose control rows are 0px, has since been retired
      anyway: on 2026-08-30 the round page was measured in all three modes against a live bughouse
      simul (`ZdoeZseB`), rows populated, no overflow in tall landscape or portrait — recorded in
      `bughouse-shared-tools-column` task 4.1.

## 4. Verify

**Nothing to verify: no conversion was committed.** These four are closed as not-run rather than as
passed, and the page they would have covered is verified elsewhere — the flat grid that shipped
instead was checked in all three modes on both pages (commit `8f0f877`, and
`bughouse-shared-tools-column` tasks 4.1–4.4).

- [x] 4.1 Not run — portrait was never touched by this change, on either page.
- [x] 4.2 Not run — no landscape conversion exists to overflow.
- [x] 4.3 Not run — nothing was moved, so nothing could go missing.
- [x] 4.4 Not run for this change; the gates are green on the code that did ship.
