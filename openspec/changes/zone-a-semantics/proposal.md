## Why

`what-zone-a-is-for` was opened to answer one question — what zone A is for — and ended up carrying
three jobs: the question, the layout defects that asking it turned up, and the survey instrument
built to see them. The defects were fixed and the instrument outgrew its host. **The question was
never answered**, and it is the only part still worth a change.

Zone A is the band beside the tools that a shorter partner stack leaves over. Today the code places
parts into it, charges their cost against the boards, and grows it upwards from the bottom row — all
correct, all measured, and none of it decided. It behaves the way the cascade happens to make it
behave.

**THE GROUND HAS MOVED UNDER SEVERAL OF THESE QUESTIONS, which is why they are restated rather than
carried over.** Since they were written:

- **The `tools-zonea` HOME was deleted** (`5be122386`, 2026-09-21). The fallback that shrank the
  partner board to seven tenths of the viewer's and put the whole tools panel in the freed band is
  gone; seven survey rows used it and all seven go to the last resort now. Only `beside`, `below`
  and `lastResort` remain. Any question phrased in terms of that home no longer has a subject.
- **`TOOLS_MIN_SQUARES` no longer exists.** It is `TOOLS_MIN_WIDTH_PX` and `TOOLS_MIN_ROWS = 3`, so
  "does 2 stay at 2" is not a question that can be asked of the current code.
- **The budget formula changed** (`3e9173a9f`): zone A's room is `toolsRegionHeight −
  partnerStackHeight`, mode-independent, where it used to be a side-by-side difference that read
  portrait's lower board as free space.
- **Portrait has drop templates now** and does not use a zone at all — its slot widens in place. So
  "zone A in portrait" is not one of the three modes; it is two modes plus a different mechanism.

## What Changes

Nothing, until the questions are answered. Then the answers become requirements in
`bughouse-round-layout` and whatever code follows from them.

The questions, restated for the code as it is:

- **Is zone A one rule or two?** It has a different CAUSE in each mode that has it — a reader's zoom
  in tall landscape, width pressure in short landscape. (Portrait is no longer a third case.)
- **Is zone A preferred to zone B in general, or only for parts that gain nothing from zone B's
  extra width?** The move list is the case to argue from: both boards' width in zone B against one
  board's column in zone A.
- **Where does a collapsed zone A's height go** — to the boards, or to zone B?
- **Does `beside` still beat `below` where `below` costs no board at all?** With room for zone B the
  tools could sit there with BOTH boards full size, while the cascade shrinks the partner board to
  keep the column. The rule permits it; "as big as possible" could equally prefer the home that
  costs nothing.
- **Does width freed by a reader's ZOOM go back to the viewer's own board?** It goes to the tools
  today, by `toolsHome()`'s own reasoning. With the column gap for a zero-width tools track, that
  was 52.7px of empty margin measured at 701x829.
- **Does the zoom floor stay at four squares?** `MIN_STACK_IN_LEFT_SQUARES = 4`, chosen 2026-09-05,
  now that the WIDTH floor is 50%. A reader zooming their own partner board down is an explicit
  choice rather than the layout deciding, so the two may legitimately differ — but it needs saying.
- **Does the move list stay in the narrow column when the other parts take the band?** Measured at
  900x639: engine and controls in 411px of zone A, the move list in the 115px the boards allowed —
  and it is the part that most wants width. It cannot leave row 1, because zone A grows upwards and
  row 1 is the row no template takes.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout` — gains whatever is decided. It already carries the five requirements
  `what-zone-a-is-for` earned on its way here: a zone is occupied or it is not there; a board's
  drawn size is not decided by where the layout puts it; the partner board is as big as possible
  and yields only to the tools' minimum; a control is never drawn outside the region it was placed
  in; the same viewport produces the same layout however it was reached.

## Impact

- `client/two-board/squareUnit.ts` — `toolsHome()`, the floors, the homes.
- `client/two-board/common/toolsPlacement.ts` — the cascade and what it charges.
- `static/two-boards/layout/*.css` — whichever templates the answers need.
- Verified through `tests/layout_matrix` (see `layout-matrix-bed`), diffed by row set.

## What this change is NOT

- **Not the defects.** Those were `what-zone-a-is-for`'s second job and they are fixed; the matrix
  went from 127 failing rows to 3.
- **Not the instrument.** `layout-matrix-bed` owns it.
- **Not portrait's arrangement.** `portrait-tools-arrangement` owns that, and portrait does not use
  a zone.
