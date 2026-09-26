## Why

Portrait was walked resolution by resolution in a live game — six phones and six tablets — and the
notes filled a section of `what-zone-a-is-for` that had nothing to do with zone A. Re-measured on
2026-09-26 against a build where portrait drops, **most of what those notes asked for is built, and
one of the two questions left is smaller than it looked.**

## A DEVICE HELD UPRIGHT IS NOT ALWAYS A PORTRAIT PAGE, AND THAT IS DELIBERATE

The portrait cut-off is 9/16, set so that **portrait means phones**. Every tablet held upright is
therefore a tall-landscape page with a large zone B beneath the boards — 768x1024 and 1024x1366 are
0.75, 800x1280 is 0.625, all well clear of 0.5625. **This is the design, not an accident**: the mode
is settled, and a tablet is improved only by the placement logic rearranging parts into the free
space its shape leaves. Nothing in this change proposes a third mode, a moved cut-off, or portrait's
single-column geometry on a tablet.

That correction matters here because three of the observations this change inherited were taken on
tablets and read as portrait findings. They are not; they are placement findings on a tall-landscape
page, and one of them has already been fixed by a rule this project adopted since.

## What the re-measurement found

**Built, and no longer open** — the recurring item across five resolutions was that the second preset
set should become one full-width row of ten with the freed height going to the chat. The note said
it needed "a NEW area spanning both tracks", because portrait's areas were `chat / p1 / p2 /
tablist`. Portrait adopted `zoneTools1..4` and gained templates where a slot spans both tracks:

| viewport | preset sets | inner widths |
|---|---|---|
| P1 390x844, P2 393x852 | `[5, 10]` | 221/389, 224/392 |
| P3 360x800, P4 412x915, P6 430x932 | `[10, 10]` | 360, 411, 429 |

**Fixed by a later rule** — the sharpest tablet observation was a *331x400 empty band* at 1024x1366.
Measured today: `zoneA2 328x0`, `zoneA3 328x0`, **zero occupants**, on all six upright tablets. Zone
A collapses when nothing is placed in it, which is one of the five requirements `what-zone-a-is-for`
earned on its way out.

**Not true any more** — "the chat takes every spare pixel" was the frame these notes were read
under. In portrait it does not: the chat is 23-30% of the viewport on five of six phones.

| row | viewport | chat | own board | drops | chat share |
|---|---|---|---|---|---|
| P1 | 390x844 | 221x194 | 389 | 2 | 23.0% |
| P2 | 393x852 | 224x198 | 392 | 2 | 23.2% |
| P3 | 360x800 | 200x234 | 360 | 3 | 29.2% |
| P4 | 412x915 | 229x274 | 411 | 3 | 29.9% |
| **P5** | **375x667** | **240x40** | 372 | **0** | **6.0%** |
| P6 | 430x932 | 245x265 | 429 | 3 | 28.4% |

## What Changes

Two things are left, and they are the two ends of the same mechanism — what placement does with the
space a shape leaves.

- **The iPhone SE gets a 40px chat, and nothing drops there.** `P5` is the only portrait viewport in
  the matrix where the cascade moves nothing at all, so every mechanism that gives the other five
  phones room is inactive. The original note said it was NOT CLEAR HOW TO ADDRESS and that still
  stands. It is the smallest phone still in use.
- **Should a preset panel leave the tools track on a tablet?** The original idea was "the presets
  take zone A, by the mechanism the analysis page has". Zone A is collapsed on every tablet, so the
  free space is zone B's — 780x402 of chat at 800x1280, 1001x278 at 1024x1366. The question survives
  with a different region and a different price, and it is exactly the "rearrange into free space"
  the tablet approach allows.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout` — gains, if decided, a rule for what placement does with a shape's free
  space; and gains the statement that a tablet held upright is a tall-landscape page by design,
  which is currently written only in a test-bed comment.

## Impact

- `client/two-board/common/toolsPlacement.ts` — the cascade, if a part's minimum has to change for
  the SE to yield anything.
- `static/two-boards/layout/portrait.css` — only for the SE end.
- `tests/layout_matrix/viewports.py` — the tablet decision is recorded there as of 2026-09-26.

## What this change is NOT

- **Not a mode change.** The 9/16 cut-off and tablets-as-tall-landscape are settled. No third mode,
  no moved threshold.
- **Not the preset panel's surface** — done, `portrait-preset-panel-and-flow`.
- **Not zone A's rules** — `zone-a-semantics`.
- **Not portrait ignoring zoom** — deliberate, documented in `squareUnit.ts`'s `zoomReachesBoards()`.
