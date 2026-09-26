## 0. Status

**Carried out of `what-zone-a-is-for` on 2026-09-26**, which is archived. Section 5 there was a live
walkthrough of six phones and six tablets on p4; the observations live in that change's `design.md`
under "Portrait, in a running game" and are still the source for the numbers below.

**RE-MEASURE BEFORE ACTING ON ANY OF IT.** Every number was taken before portrait gained the shared
vocabulary and its three drop templates. The main item those notes asked for has since shipped, and
what is left has to be re-read against a build where portrait drops.

## 1. The one question: where does portrait's slack go

- [ ] 1.1 **Decide the rule.** Today the chat takes every spare pixel, and nobody chose that — the
      boards are sized from WIDTH, every part above the chat takes its content height, and the chat
      is what is left. Decide what SHOULD have it: a chat maximum, a board that may grow past its
      width-derived size, a part that may claim the band, or the slack simply left empty.
- [ ] 1.2 (was 5.15) **800x1280 — the case for a maximum.** Chat 459px and nearly empty; boards
      512²/251² sized by width. The note says a rule is needed and does not say which.
- [ ] 1.3 (was 5.9, 5.7) **375x667 — the same mechanism starving the chat instead.** The chat gets
      **44px**, a line and a bit, and the notes record it as NOT CLEAR HOW TO ADDRESS. The SE is
      the only viewport in the matrix where NO part drops (`P5-C1` is `[5, 5]`, drops empty), so
      nothing yields and the chat absorbs the shortfall. Whatever 1.1 decides has to work at both
      ends or say why the ends differ.
- [ ] 1.4 (was 5.8) **The SE sits 0.6% inside the portrait threshold** — 375/667 = 0.5622 against
      9/16 = 0.5625. Emulated at 373x655 (0.569) the page flips to landscape: boards side by side,
      own board 228². Decide whether a device that close to the line should be in portrait at all,
      and whether the threshold is the right test. Answer alongside 1.5 — they are the same
      question at opposite ends.

## 2. Is portrait right at tablet sizes at all

- [ ] 2.1 (was 5.17) **1024x1366 — the mode itself may be wrong.** Own 651², partner 331², chat
      372, and a **331x400 empty band** — larger than most phones' whole tools column. Decide
      whether a 1024-wide viewport belongs in portrait's arrangement, or whether the threshold
      should consider absolute width and not only the aspect ratio.
- [ ] 2.2 (was 5.10, 5.13) **Should a preset panel leave the tools track on a tablet?** RESTATED:
      the notes proposed "the presets take zone A, by the mechanism the analysis page already has".
      Portrait has no zone A and its parts drop by widening their own slot instead, so the idea
      survives with a different mechanism and a different price. Re-measure at 768x1024 and
      810x1080 before deciding it is still wanted — both now drop all three parts.

## 3. Already built — do not re-open

Struck on the way in, with what shipped. Recorded because five separate notes asked for the same
thing and a later reader will find them in the archived `design.md`.

- **(was 5.1-5.5, 5.11) The second preset set as one full-width row of ten.** Built. The note said
  it needed "a NEW area spanning both tracks" because portrait's areas were `chat / p1 / p2 /
  tablist`; portrait adopted `zoneTools1..4` and gained templates where a slot spans both tracks.
  Measured 2026-09-26: `[5, 10]` at P1 and P2 (inner 221/389 and 224/392), `[10, 10]` at P3, P4 and
  P6 (inner 360, 411, 429).
- **(was 5.6) The tab strip taking the full width.** Built — `drop-tools4` gives it a full-width row
  on every portrait viewport that drops.
- **(was 5.12, 5.14) 810x1080 and 820x1180.** The fold the note wanted already existed at 810 when
  it was written, and 820 was called the least interesting to review. Both now drop all three parts.
- **(was 5.16) Why 4x5 at 768 and 2x10 at 810.** The note answers itself: `publishPresetSize()`
  computes the button for both arrangements and publishes whichever gives the larger button. A
  decision, not a bug. It was never ticked.

## 4. Not in this change

- **The preset panel's surface in portrait** — done, `portrait-preset-panel-and-flow`, archived
  2026-09-26.
- **Portrait not honouring zoom** — deliberate and documented in `squareUnit.ts`'s
  `zoomReachesBoards()`: the mobile layouts draw every board at its allowance, which is why they
  show no resize handle. Changing it is a much larger proposal.
- **`P5-C3-100x100`**, a live failing matrix row in portrait — the `round-controls-panel` painting
  3px outside itself, with no drops involved. It belongs to the commit that created that part.
