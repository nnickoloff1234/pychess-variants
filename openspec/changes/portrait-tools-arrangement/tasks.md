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

- [ ] 1.1 **Decide what gives — and the question is about HEIGHT, not width.** `P5` (375x667) is
      the only portrait viewport in the matrix where the cascade drops NOTHING — `[5, 5]`,
      `drops: []` — so every mechanism that hands the other five phones room is inactive and the
      chat is left with 40px.

      **MEASURED LIVE 2026-09-26, and it is a CLIFF rather than a gradient.** The p4 tile was taken
      to the SE's width at the harness's own height and a real game played on it:

      | | live p4 at **375x667** | live p4 at 376x**835** |
      |---|---|---|
      | drops | **none** | `drop-tools4`, `drop-tools3`, `drop-tools2` |
      | preset panels | 240x61 each, in the strip | both full width, 373x39 each |
      | chat panel | **240x38** | 208x250 |
      | chat MESSAGE AREA | **240x13** | 208x225 |
      | chat input | 240x25, usable | 208x25 |
      | boards | own 373, partner 133 | own 373, partner 133 |

      **THE NUMBER THAT MATTERS IS 13px OF MESSAGE AREA.** The 40px quoted from the first walk was
      the whole chat panel; of that, 25px is the input and **13px is everything left for reading**,
      which is not one line of text. So the SE can type a message and cannot read one — the input
      is the part that survives, and the part that does not is the reason to have a chat at all.
      Reproduced live at exactly 375x667 in a real game on 2026-09-26 (`i3BeAwNt`), portrait
      confirmed by `matchMedia('(aspect-ratio <= 9/16)')`, no overflow, app bottom exactly 667.

      Same width; 168px more height. Everything that is wrong at the SE is right at 835 — the two
      preset panels fold to full width and hand their 122px back, and the message area goes from 13
      to 225. Bracketing it against the other portrait rows — 360x800 drops three, 390x844 drops
      two, 375x667 drops none — **the cliff is between 667 and 800px of height**, and finding where
      is the first implementation step rather than a decision.

      Options, none obviously right: a smaller preset button so a panel becomes droppable at this
      height; a chat minimum that takes its height from a board instead of from what is left;
      accepting 40px and saying so.
- [ ] 1.2 Whatever 1.1 chooses, check it against the other five phones FIRST. They are healthy —
      23-30% of the viewport to the chat — and a rule written for the SE that costs P1-P4 or P6
      their current arrangement is a bad trade. The matrix shows all six in one run.
- [ ] 1.3 If the answer is "accept it", say so in the stylesheet beside the portrait templates and
      close this. An accepted limit that is written down stops being re-discovered; this one has
      been found twice already.

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
- [ ] 1c.6 OPEN, and only if the tap target is judged too small to ship: put a floor under the
      entry. It costs about 9 of the 15 pixels back. Decide by looking at it on a phone rather
      than from the number.

## 2. Tablets: rearranging into the free space

The mode is settled — these are tall-landscape pages and stay that way. What is open is only what
the placement logic does with the room their shape leaves.

- [ ] 2.1 **Should a preset panel leave the tools track on a tablet?** The original idea was "the
      presets take zone A, by the mechanism the analysis page has". Zone A is COLLAPSED on all six
      upright tablets (`zoneA2`/`zoneA3` at height 0, zero occupants), so the free space is zone
      B's: 780x402 of chat at T6 (800x1280), 1001x278 at T5 (1024x1366). Re-ask it against that
      region and that price.
- [ ] 2.2 Decide whether the chat's share on an upright tablet is a problem at all. It is the
      largest single consumer — 402px of 1280 at T6 — but the boards are 640 tall beside it and
      nothing overflows. This is the question the "a rule is needed" note was reaching for, asked
      of the right mode.
- [ ] 2.3 Write the tablet decision into `bughouse-round-layout`: a device held upright above the
      cut-off is a tall-landscape page, and is improved by placement within that geometry rather
      than by a mode of its own. Today it lives only in a test-bed comment.

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
