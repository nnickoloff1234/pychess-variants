## Why

The preset buttons are one size everywhere — measured 45.92px across all four sets on p1, which is
what the capability asks for and it holds. The spacing does not. Measured on the desktop at
1914x827, the row of ten under the board reads:

```
53.52  53.52  53.52  53.52   0   53.52  53.52  53.52  53.52
```

The fifth gap is **zero**: the last button of one set and the first of the next are touching, while
every other pair has 53.5px between them. Two independent causes, and both are in the stylesheet
rather than in any measurement.

`.chatpresets` has no `gap` at all, so the two sets always abut — in every mode. Portrait has the
same defect at 0 against 3, small enough that nobody has noticed it. And the tall-landscape override
gives each set `flex: 1 1 auto` with `justify-content: space-between`, which spends whatever the row
has left over on the gaps *inside* each set. That is why the two parts of the same control are drawn
at two spacings on one screen: 38.3 in the column, 53.5 under the board.

Nothing lines up either. The dropped row's last five buttons sit at 1199.34 and its neighbours above
sit at 1306.16 — a row of ten and two rows of five, sharing an edge and agreeing about nothing.

Portrait is the accidental proof of what this should be: its dropped row and its column rows both use
a pitch of 38.4, so its last five land at x=196.03, exactly under the five above them. That is why p4
reads correctly today and p1 does not.

## What Changes

- **One pitch per page, and every row uses it.** The five-button row sets it; the ten-button row
  copies it rather than computing its own from the width it happens to have.

- **Every gap equal, including the one between sets.** `.chatpresets` gets the gap it has never had,
  which is the whole of the `0` defect and fixes portrait's 0-against-3 at the same time.

- **Rows are right-aligned, so a ten-button row's last five sit exactly under the five above it.**
  Right rather than centred is what makes the two arrangements read as one grid extending leftwards.

- **The spare width goes to the margin, not between the buttons.** This reverses the capability's
  current instruction to spread, which is what makes the rows disagree.

- **No wiggle when a part drops.** The pitch comes from the parts column, measured at 382.797px at
  every board zoom, so the reflow from one row of ten to two rows of ten changes neither size, gap
  nor alignment — only which row a set is on.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout`: **A preset part holds two sets that pair when there is room** changes. The
  clause requiring a row to spread its spare width between the buttons is replaced by one pitch
  shared across rows, a single gap that applies between sets as well as within them, and right
  alignment so that rows of five and rows of ten agree column by column. Everything else in the
  requirement stands: one size everywhere, sets never broken, the size leaving the pairing possible,
  and portrait unaffected.

## Impact

- `static/bughouse.css` — the tall-landscape `.chatpresets-set` override (`flex: 1 1 auto` plus
  `space-between`), which is deleted; a `gap` on `.chatpresets`; and the desktop gap becoming an
  explicit value rather than a side effect of spreading.
- No TypeScript change. `--bug-parts-w` is already published and already stable across board zooms.
- No server change; frontend gates only.

## Out of scope

Changing the button size. It is already uniform and already derived from the column both parts share;
growing it was tried during investigation and it stopped the part dropping under the board at all,
because the size feeds the placement decision. That coupling is worth its own change if the buttons
should be larger.
