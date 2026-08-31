## ADDED Requirements

### Requirement: The tools column SHALL be arranged the same way on both two-board pages

The merged second column — the partner board's stack together with the tools — SHALL use one
arrangement mechanism on the round page and the analysis page. A part that cannot fit beside the
partner board SHALL move under it and SHALL span the full width of the column pair, on either page.

The mechanism SHALL live in one place and take each page's parts as input. It MUST NOT be
duplicated per page.

#### Scenario: The partner board leaves room beside it

- **WHEN** the partner board is large enough that every part fits in the strip beside it
- **THEN** all parts SHALL sit beside the board on either page

#### Scenario: The partner board is small enough to leave room under it

- **WHEN** the partner board is scaled down so that a part no longer fits beside it
- **THEN** that part SHALL be placed under the board on either page
- **AND** it SHALL span the board's track and the tools track together, not the tools track alone

#### Scenario: Portrait with a short partner board

- **WHEN** the page is in portrait and the partner board's stack is shorter than the row it sits in
- **THEN** the space under that board SHALL be reachable by a part that has dropped
- **AND** the tab list SHALL be able to take the full width rather than staying in its column

### Requirement: The two-board pages SHALL differ only in named ways

The analysis page and the round page SHALL be laid out by the same rules. The permitted differences
are exactly: the eval gauge's share of each stack's track, the clocks, each board's identity label,
and which tabs the tools panel holds. Any other difference in the main layout — the app's tracks,
the merged column's tracks, or how the tools are arranged within it — is a defect.

#### Scenario: Comparing the two pages' tracks

- **WHEN** both pages are rendered at the same viewport in the same layout mode
- **THEN** their app-level and column-level track lists SHALL differ only by the gauge's share

#### Scenario: A new layout rule is added for one page

- **WHEN** a rule is written that decides where a board, the tools, or a part is placed
- **THEN** it SHALL apply to both pages unless it is one of the named differences
