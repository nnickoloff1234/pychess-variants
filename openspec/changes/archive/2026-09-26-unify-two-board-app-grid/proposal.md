## Why

Seven commits of decisions exist only in commit messages. Each was surveyed and each is sound, but
a commit message merges into nothing: when a change archives, only its `specs/` deltas become part
of the living spec. The rules below have been enforced repeatedly, in code review of ourselves,
without ever being written as requirements.

They are one story, which is why they belong in one change rather than scattered across three. The
two-board pages had **mode-private structure, mode-private names, and mode-private measurements**,
and every fault we hit for a week came from one of the three:

- `uleft` claimed an area no template declared, and minted implicit tracks whose gaps took 30px off
  the tools.
- `rightcol` survived as a claim after the last template that declared it was deleted.
- Portrait named four slots `chat / p1 / p2 / tablist` that landscape called `zoneTools1..4` —
  the same four slots, occupant for occupant, and two of the portrait names described things the
  analysis page does not have.
- `.partner-and-tools` was a real grid in exactly one mode, so `toolsPlacement` needed a `container`
  parameter and `seatNamePlacement` needed a dissolved-or-not branch.
- `flattened` tested whether a template names a zone B, and was used to decide whether a published
  BUDGET could be trusted — two unrelated questions on one flag.
- `publishPresetSize` was handed the page's budget as the height to size buttons in, when the tools'
  region follows the boards and in portrait is a block with the viewer's whole board below it.

## What Changes

Landed, each with its own survey run:

- **The class** is `.partner-and-tools`, not `.bug-right-column` — a name true in every mode, where
  the old one was wrong in each mode differently.
- **The area** is `partnerAndTools`; `rightcol` is declared nowhere and claimed nowhere.
- **One vocabulary** for the tools' four slots, `zoneTools1..4`, in every mode. Five landscape
  assignment rules became redundant on the spot and were deleted.
- **One grid per page.** Portrait dissolves the merged column as the landscape modes always did,
  and the wrapper element is deleted from both views. `seatNamePlacement` asks the grid for the
  rows a stack spans instead of measuring a box that no longer exists.
- **`hasZoneB`** replaces `flattened`, and the budget no longer depends on it.
- **The presets are sized against the tools' own region**, measured from the template in force.

Still open, and the reason this change is not archived:

- **The drop budget is a side-by-side formula.** `ownStackHeight − partnerStackHeight` means "how
  much shorter is the partner stack" only while the two stacks share a row. In portrait the viewer's
  board is BELOW, so the difference is the board you are playing on, and every part drops.

## Capabilities

### Modified Capabilities

- `two-board-stylesheet-layout` — gains the naming and single-grid requirements. It already
  anticipated this: its cascade requirement says a specificity pair "SHALL be recorded for the
  renaming change that follows", and this is that change.

## Impact

- `client/two-board/round/round.ts`, `client/two-board/analysis/analysis.ts` — the wrapper
- `client/two-board/common/toolsPlacement.ts` — the container, `hasZoneB`, the budget, the region
- `client/two-board/common/seatNamePlacement.ts` — `rowsSpanned()` replaces two box measurements
- `static/two-boards/layout/*.css`, `components/*.css` — the names, the templates, the assignments
- `tests/layout_matrix/baseline.json` — the class renamed in place, same run, same geometry

## Relationship to the other changes

- `portrait-preset-panel-and-flow` — its premise ("portrait has no drop templates") was already
  false and is now doubly so. The structural half of it is here; what remains there is the band's
  own design.
- `what-zone-a-is-for` — zone A's definition is its subject, and the budget fault above is a
  finding for it. Recorded there as a pointer rather than duplicated.
