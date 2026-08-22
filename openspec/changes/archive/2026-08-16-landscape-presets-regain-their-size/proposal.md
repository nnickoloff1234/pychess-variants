## Why

A preset button used to be sized from the width it was given — the set's tracks were `1fr` — so
landscape drew 45.9px buttons and the two sets stacked: four rows of five.

Making the size uniform replaced that with a fixed track, `--bug-preset-btn`, whose only value is
a floor of `0.55 x` the player's own square. Portrait raises that floor from the viewport;
**landscape raises it nowhere**, so it draws at the floor: 30.1px in short landscape, 27.5px on the
desktop. Smaller buttons then fit ten to a row, and the arrangement flipped to two rows of ten.

Measured on p1, 1272x551, same window before and after:

| | button | rows | parts column |
|---|---|---|---|
| before | 45.9px | 4 rows of 5 | 382.3px |
| now | 30.1px | 2 rows of 10 | 382.3px |

The width was always there. Nothing claims it.

## What Changes

- **Every mode gets a policy for raising the button floor, not only portrait.** The floor stays
  what it is — a floor is not a size.

- **Landscape sizes a button at 60% of its share of the parts column** — the size the presets drew
  at before the fixed track. That proportion is what leaves room for the two sets to pair: at 60% a
  set is too wide to have company beside the board and narrow enough for two to fit the width a
  part gets once it has dropped. The arrangement follows from the size rather than being asserted.

- **One size per page, still.** The size comes from the parts column, which is the same width
  whether a part has dropped or not, so a dropped part and a part beside the board keep drawing the
  same control at the same size. This is the property the fixed track was introduced to get, and it
  is kept.

- **Portrait is not touched.** Its viewport rule stays exactly as it is, and the measurements that
  describe p4 today become the test that it did not move.

- **The spec catches up with two things it already got wrong.** "Beside the board the sets stack"
  is violated on master right now — p1 has both parts beside the board showing ten to a row. And
  "buttons in a part that has left MAY be smaller than the floor" was overtaken by the rule that
  every preset button is the same size, which was implemented but never written down.

## Capabilities

### New Capabilities

None. This is a defect in a capability that already exists.

### Modified Capabilities

- `bughouse-round-layout`: the requirement "A preset part holds two sets that pair when there is
  room" — how a button's size is chosen, that one size holds across parts and drop states, and what
  the pairing follows from. Its stale scenarios are restated against measured behaviour.

## Impact

- `static/bughouse.css` — `.chatpresets` and `.chatpresets-set`, plus a per-mode rule in the short
  and tall landscape blocks. The portrait block is deliberately untouched.
- The parts column's width has to reach CSS. All three modes size that track as `minmax(0, 1fr)` or
  `minmax(0, 20vw)`, so it does not depend on its contents and can be measured without circularity
  — see design.md, which recommends publishing it from JS over re-deriving it per mode in CSS.
- `client/two-board/round/toolsPlacement.ts` — not edited, but its thresholds move: bigger buttons
  make a part taller, so the zoom at which each part drops shifts. The p3 sweep is the check.
- No server change, so only the frontend gates apply.
