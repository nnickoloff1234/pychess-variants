## Why

Zone A — the band the partner's board frees by being shorter than the viewer's own — is the one
region of this layout nobody has settled. Two defects were measured while doing other work, and they
are the SAME question asked from opposite directions:

- **Admitted, and the parts do not fit.** `toolsHome()` accepts zone A on a proxy — "is it at least
  `T` squares tall" — rather than on whether what is going there will fit. Measured on the round
  page in short landscape at 682x503: zone A offered 139px, the four parts needed 186px with the
  chat already squeezed to zero, and the page overflowed by 44px. The analysis page hides it by
  having two parts instead of four.
- **Fits, and nothing is put in it.** Measured on the analysis page at 629x830: `zoneA2` is
  199 x 240 and EMPTY while the only visible tab panel sits in zone B1 below both boards. The band
  exists because the partner board is deliberately half the own board's height, so this is free
  space the layout created on purpose and then declined to use — a black rectangle beside a board.

Both were deferred with `tall-landscape-tools-below-boards`, which is now archived. This change
carries them forward so they stay in `openspec list` rather than being readable only inside an
archived design document.

## What Changes

- Decide what zone A is FOR, once, covering both directions: nothing is placed there that does not
  fit, and nothing is left there empty that could hold something or could collapse.
- Implement whichever of the recorded ways out that decision selects — see `design.md`, which
  carries the three options and the recommendation as they were written.
- No behaviour is assumed here. The delta states the acceptance criteria the answer has to satisfy,
  not the mechanism, because the mechanism is the open question.

## Impact

- `client/two-board/squareUnit.ts` — `toolsHome()`, if the fit test moves there.
- `client/two-board/common/toolsPlacement.ts` — the per-part cascade, if zone A gains one.
- `static/bughouse.css` — the zone A templates and rows on both pages.
- Both pages, both landscape modes. The round page reaches the first defect and the analysis page
  the second, so neither can be verified alone.

## Capabilities

- `bughouse-round-layout`
