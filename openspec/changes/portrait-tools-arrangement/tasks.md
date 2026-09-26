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

      | | bed `P5` 375x**667** | live p4 376x**835** |
      |---|---|---|
      | drops | **none** | `drop-tools4`, `drop-tools3`, `drop-tools2` |
      | preset panels | `[5, 5]`, 240 wide | both full width, 373x39 each |
      | chat | **240x40** | panel 208x250, messages 208x225, input 208x25 |

      Same width to within a pixel; 168px more height. Everything that is wrong at the SE is right
      at 835. Bracketing it against the other portrait rows — 360x800 drops three, 390x844 drops
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
