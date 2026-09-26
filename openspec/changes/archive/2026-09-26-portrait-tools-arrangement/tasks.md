## 0. Status

**Carried out of `what-zone-a-is-for` on 2026-09-26 and re-measured the same day.** Section 5 there
was a live walkthrough of six phones and six tablets on p4; the observations live in that change's
`design.md` under "Portrait, in a running game". Re-measuring cut the list from fourteen items to
two, and corrected the frame they were read under.

**THE FRAME THAT WAS WRONG:** a device held upright is not always a portrait page. The cut-off is
9/16 so that portrait means PHONES, and a tablet held upright is a tall-landscape page with a large
zone B — by design. Three of the inherited observations were tablet observations and are therefore
placement findings on a landscape page, not portrait findings. Recorded in
`tests/layout_matrix/viewports.py`, which previously called it something nobody had looked at.

## 1. The iPhone SE — 40px of chat, and nothing yields

- [x] 1.1 **DECIDED AND DONE — twice, and neither answer was the one this task offered.** The
      options listed were a smaller preset button, a chat minimum taken from a board, or accepting
      40px. What the SE actually needed was two things nobody had looked at:

      - the tab bar was 12.31px taller than its content, because `site.css` gave the draw and
        resign buttons a flat `height: 40px` (section 1b);
      - the chat entry spent 9px of padding and a 1px rule on trim, and the first preset panel put
        a 5px gap above itself (section 1c).

      Both were pixels the layout was spending on nothing, so the trade this task expected — board
      size against chat — never had to be made. **The message area went 13px to 39.9px, 0.8 lines
      to 2.5, and no board moved.**
- [x] 1.2 **CHECKED, and all six phones gained rather than any paying.** The chat region grew on
      every portrait viewport in the matrix — +9px at P1, +10 at P2, +10 at P3, +9 at P4, +9 at P5,
      +9 at P6 — because both fixes removed waste rather than moving space between parts. Two full
      matrix runs against the morning's baseline: identical 286-row set each time, one row FIXED
      (`T6-landscape-C1-100x100`) and none broken, and no new warning except the intended one.
- [x] 1.3 **The answer was not "accept it", so what is written in the stylesheet is the trade that
      WAS accepted**: the tolerated WCAG deviation, recorded beside the rule that causes it and in
      the delta spec as a named deviation. See 1c.6.

## 1b. DONE — the controls stop setting the bar's height

Found while measuring 1.1 and fixed on 2026-09-26. It is wider than portrait, but it arose here and
the SE is where it pays, so it is recorded here rather than moved.

- [x] 1b.1 **`site.css:2276` gives `.btn-controls button` a flat `height: 40px`** — an absolute
      value from the single-board page, where the controls have a row to themselves. The two-board
      stylesheet overrides their `flex`, `min-width` and `font` and never the height, so the pair
      was the tallest thing in the bar and the bar's auto-sized grid row became 40 everywhere.

      Measured in all four harness windows, bar height with the controls against without them:

      | window | viewport | mode | with | without | excess |
      |---|---|---|---|---|---|
      | p1 | 1418x612 | tall landscape | 39.99 | 31.92 | 8.07 |
      | p2 | 1701x957 | tall landscape | 40.00 | 32.53 | 7.47 |
      | p3 | 1276x551 | short landscape | 40.00 | 31.85 | 8.15 |
      | p4 | 375x667 | portrait | 40.00 | 27.69 | **12.31** |

      Nothing asked for 40: an emptied button still measured it. Fixed with `height: auto` on the
      button, `align-self: stretch` on the container so the TABLIST decides the row, and
      `line-height: 1` on the icon — whose `normal` leading (8.18px on a 21.83px glyph) would
      otherwise have become the new floor at 30px, still above the 27.69px tab.

      **RESULT ON THE SE: the chat's message area went from 13px to 25.3px**, nearly doubling for
      a change that touches no board. Buttons now equal the tab height in every window — 31.92,
      32.53, 31.85, 27.69 — all above WCAG 2.5.8's 24px. Landscape labels unaffected.

- [x] 1b.2 **AND IT EXPOSED A PORTRAIT RULE THAT HAD NEVER WORKED.** `properties.css` declared
      `--bug-controls-labels: 0` for portrait on `.bug-round-tools-bar`; `components/tabs.css`
      declares the default `1` on the same selector. One class each, and `properties.css` loads
      first (`base.html` line 21), so the `1` won on source order and portrait's opt-out had never
      taken effect.

      It was invisible because nothing could reach it: `labelControls()` only labels the pair when
      the row has width for the words, and in portrait's 240px strip it never did. Freeing 12.31px
      let the bar drop to the full 373px, the fit test found room, and "Draw" and "Resign" appeared
      on a phone — against a decision recorded in the stylesheet and in memory. The flag was wrong
      all along; the drop only made it visible.

      Moved into `tabs.css` immediately after the default it has to beat, beside the paragraph that
      explains why portrait never labels the pair. The dead copy in `properties.css` is deleted
      with a note saying where it went.

- [x] 1b.3 **Verified.** Frontend gates all pass. Layout matrix diffed by ROW SET against the
      morning's run: 286 rows both times, identical row set, **one row FIXED and none broken** —
      `T6-landscape-C1-100x100`, the partner stack overlapping preset panel 1 in zoneA2 by 25x6px.
      The survey goes 3 failing to 2. That row had been filed as zone A's; 8px of bar was the cause.

## 1c. DONE — portrait spends the chat's trim on messages

Nikolay, 2026-09-26: the other layouts keep these because they have the room and they improve the
look; portrait does not, and the pixels are better spent on the partner's words.

- [x] 1c.1 **The gap between the entry and the first row of buttons — 5px.** It is
      `.chatpresets`'s `padding-top: var(--bug-preset-row-gap)`, which exists so four stacked rows
      read as four evenly spaced rows rather than as two pairs. That reasoning is untouched: only
      the FIRST panel loses it, where the thing above is the chat entry rather than another part.
      The second panel keeps its 5px, so rows 1-2, 2-3 and 3-4 all stay 5px apart.
- [x] 1c.2 **The entry's own trim — 9px of padding and a 1px rule.** `site.css` draws it as a
      field (`padding: 5px 20px 4px 4px`, `border-top: 1px`), which is right where it has a column
      to itself. Overridden for portrait only, at (1,2,0) against the bare id's (1,0,0) — on
      specificity, not load order, which is the trap this stylesheet fell into earlier today.
- [x] 1c.3 **The focus ring is KEPT, and keeping it is free.** An `outline` paints outside the box
      and takes no layout, so removing it would save zero pixels and lose the only signal the
      field is active (WCAG 2.4.7). The placeholder — "Please be nice in the chat!" — is what says
      "type here" now that the rule is gone.
- [x] 1c.4 **Measured on the SE at 375x667, hard-reloaded:** the message area goes **25.3px to
      39.9px, +58%**, and the entry 25px to 15.3px. The system message that used to clip
      mid-sentence now reads in full on two lines. Boards unchanged at 373 and 133, no overflow,
      app bottom exactly 667.
- [x] 1c.5 **Verified.** Gates pass. Matrix: 286 rows, identical row set, **no failure fixed or
      broken** against the run before it. The tap-target check does see it — six portrait `C1`
      rows now list `INPUT 240x15` as undersized, where none did before.

      **THE COST, AND IT IS REAL:** the entry is 15.3px against WCAG 2.5.8's 24px, and the buttons
      sit directly against it so the spacing exception does not apply either. Deliberate, on
      portrait alone, and visible in the bed rather than forgotten. A `min-height` on the entry
      buys it back at the price of most of the gain — that is 1c.6 if it is ever wanted.
- [x] 1c.6 **DECIDED 2026-09-26: TOLERATED, and recorded as a deviation rather than left as a
      task.** Nikolay's call — the shortfall is kept for now and written down so that every place
      the layout falls short of WCAG can be reviewed together in one accessibility pass, rather
      than argued one at a time.

      It is in the delta spec as a named tolerated deviation, with the guideline, the measured
      value, the reason and the cost of undoing it: a `min-height: 24px` returns 8.7px to the entry
      and takes the message area from 39.9px back to 31.2px, 2.5 lines to 1.9 — more than half the
      gain. The stylesheet carries the same note beside the rule, and the matrix lists the entry
      among undersized tap targets on six portrait rows, so it stays visible in the survey.

      **NOT A TASK ANY MORE.** An open box would say someone owes the work; the decision is that
      nobody does, until the accessibility pass. See [[accessibility-deferred-raise-on-ui-review]].

      Recorded for that pass: the sharper risk is not the 15.3px dimension but the missing
      separation — the preset row abuts the entry and a preset tap sends a message to the partner
      immediately. A few pixels of separation buys most of the safety for a third of the cost of
      the floor, and is the first thing to try.

## 2. Tablets — MOVED to `zone-a-semantics` 1b

A tablet held upright is a tall-landscape page by design, so "what does placement do with the room
its shape leaves" is a zone A question in that mode, not a portrait one. Moved 2026-09-26 as 1b.1,
1b.2 and 1b.3 rather than carried here.

- [x] 2.1 Should a preset panel leave the tools track on a tablet → `zone-a-semantics` 1b.2.
- [x] 2.2 Is the chat's share on an upright tablet a problem → `zone-a-semantics` 1b.3.
- [x] 2.3 The tablet decision is written into `bughouse-round-layout` — it is in this change's
      delta spec, which states that a device held upright above the cut-off is a tall-landscape
      page and is improved by placement within that geometry rather than by a mode of its own.

**A CLAIM THIS CHANGE MADE AND GOT WRONG, corrected before it could mislead anyone.** An earlier
draft said zone A was "collapsed to height 0 on all six upright tablets" and treated that as
settling the question. It was read off the `C1` rows alone. Nikolay: the band under the right board
IS zone A whenever that board is smaller than the left one, and is only nothing when the two are
the same size.

Measured across all 72 upright-tablet rows: **24 have a non-zero, occupied zone A** — every `C3`
row, `zoneA2` at 136px tall, with the partner board smaller in each (248 against 488 at T1, 328
against 652 at T5, 252 against 512 at T6). What differs between the two states is not the board
sizes but what is shown: game over hides the preset panels and something takes zone A; live, they
hold zone B and zone A goes to zero. That asymmetry is now `zone-a-semantics` 1b.1.

## 3. Already built or fixed — do not re-open

Struck on the way in, each with what actually happened. Recorded because five separate notes asked
for the same thing and a later reader will find them all in the archived `design.md`.

- **(was 5.1-5.5, 5.11) The second preset set as one full-width row of ten.** BUILT. The note said
  it needed "a NEW area spanning both tracks"; portrait adopted `zoneTools1..4` and got exactly
  that. Measured: `[5, 10]` at P1/P2, `[10, 10]` at P3/P4/P6.
- **(was 5.6) The tab strip taking the full width.** BUILT — `drop-tools4` gives it a full-width row
  on every portrait viewport that drops.
- **(was 5.17) 1024x1366's "331x400 EMPTY band".** FIXED — `zoneA2 328x0`, `zoneA3 328x0`, zero
  occupants, on all six upright tablets. Zone A collapses when nothing is placed in it.
- **(was 5.17, in part) "The mode itself may be wrong" at 1024x1366.** ANSWERED: the mode is right
  and deliberate. A tablet held upright is a tall-landscape page.
- **(was 5.15) "All the slack goes to the chat; a rule is needed", at 800x1280.** RE-FRAMED. That
  viewport is a tall-landscape page, so it was never a portrait finding; and in portrait proper the
  chat takes 23-30%, not everything. What survives of it is 2.2.
- **(was 5.12, 5.14) 810x1080 and 820x1180.** The fold already existed when the note was written,
  and 820 was called the least interesting to review.
- **(was 5.16) Why 4x5 at 768 and 2x10 at 810.** Answered in its own text: `publishPresetSize()`
  computes the button for both arrangements and publishes whichever is larger. A decision, not a
  bug.
- **(was 5.8) The SE sits 0.6% inside the cut-off.** Not a defect and not a reason to move the
  cut-off — the cut-off is where it is on purpose. What the SE actually needs is section 1.

## 4. Not in this change

- **The mode cut-off.** Settled at 9/16 so portrait means phones; tablets upright are
  tall-landscape. Not to be re-opened here.
- **The preset panel's surface in portrait** — done, `portrait-preset-panel-and-flow`.
- **Zone A's rules** — `zone-a-semantics`.
- **Portrait not honouring zoom** — deliberate, `squareUnit.ts`'s `zoomReachesBoards()`.
- **`P5-C3-100x100`**, a live failing matrix row — `round-controls-panel` painting 3px outside
  itself with no drops involved. It belongs to the commit that created that part.
