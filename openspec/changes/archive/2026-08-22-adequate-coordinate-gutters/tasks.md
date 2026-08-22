## 1. The reference distance is measured

Done before implementation; recorded here so the numbers travel with the change.

- [x] 1.1 Measured in a replica of the board box built in the live page — same browser, dpr 1.5, driven by the real `chessground.css` / `extensions.css` / `bughouse.css`, with `--bug-coord-room` fed in so the page's own formula produced the gap. The file label box sits **0px** from the board's bottom edge; at a 16px gap the ink of `b d f h` sits **2.00px** below it and the ink of `a c e g` **5.00px**.
- [x] 1.2 Swept the gap from 16px down to 12px: the ascender distance stays in 2.00–3.33px. `--bug-coord-lead` is therefore **2px**, taken from the ascenders because they are the minimum the files show.
- [x] 1.3 Confirmed the proposed rule reproduces it: `left: calc(100% + 2px); right: auto; width: max-content` put the rank box at **2.000px** from the board's right edge, **5.021px** wide (one digit), ink at **2.000px**. The same replica before the change put the rank ink at **9.979px**.

## 2. Move the rank labels

- [x] 2.1 In `static/bughouse.css`, inside the `@container not style(--bug-coord-gap: 0px)` block only, declare `--bug-coord-lead: 2px` with the measurement table from design.md in the comment, and the note that it was taken from the file ascenders and why the file labels are not being changed to match.
- [x] 2.2 Replace `coords.side`'s `right: var(--ranks-right); width: 12px` with `left: calc(100% + var(--bug-coord-lead)); right: auto; width: max-content`. `right: auto` is required, not tidying — without it both edges are constrained and the width is ignored.
- [x] 2.3 Change `coords.side coord` from `text-align: right` to `text-align: left`, keeping the `translateY(39%)` nudge, and note in the comment that the right alignment inside a 12px box is what put the digit 9.979px from its own board.
- [x] 2.4 Note in the comment that this page no longer positions from `--ranks-right`, and leave the `:root` value alone for the rest of the site.
- [x] 2.5 Change nothing on the file labels, nothing in the inside-labels branch, and no `column-gap`.

## 3. Verify on a real round page

- [x] 3.1 Live round page (`/pm1Q2PCu`, desktop mode): the rank digit is **10.115px** at a 2560x1440 viewport and **9.891px** at 1063x742 — not the replica's 8.78px, as expected, and it changes nothing about the placement. The box tracks it: 5.78px wide at 10.115px type.
- [x] 3.2 Both boards measured **2.00px** from their own board's right edge, at every viewport tried. The file ascenders measured **1.97px** below the board on the same page — the replica predicted 2.00px, so the two axes now agree to within 0.03px.
- [x] 3.3 At 2560x1440: digits 2.00px from their own board, 21.8px of clear air to the neighbour. At the mode's floor (1063x602): 2.00px against 5.04px. Nearer their own board by a wide margin in every case.
- [x] 3.4 Rank footprint is **7.00px** at every size (2px lead + 5px digit), against the old 15px. Seams measured:

| viewport | gutter (2vmin) | board→board | board→tools | was (15px footprint) |
|---|---|---|---|---|
| 2560x1440 | 28.80px | 21.80px | 21.80px | 13.80px |
| 1063x742 | 14.84px | 7.87px | 7.84px | −0.16px (touching) |
| 1063x602 (floor) | 12.04px | **5.04px** | **5.04px** | **−2.96px (overlap)** |

Recorded, not acted on. The overlap the change was raised for is gone at every size.
- [x] 3.5 Judged at the mode's floor, which is the worst case — smallest digits (9.89px) and tightest gutter. Zoomed captures of both seams show the digit sitting against its own board, legible and unambiguously attached to it. Not cramped; the lead stays at 2px.
- [x] 3.6 Both verified on the same live page by resizing:

- short landscape (1063x569): gap `0px`, `coords.side` at `right: 0; width: auto; text-align: right`, box **inside** the board, gutter still 15px.
- portrait (526x782): gap `0px`, same inside placement, both gutters `0px`.

The container query gates the change correctly — it did not escape its block.

## 4. Close out

- [x] 4.1 Gates green: `yarn typecheck` clean, `yarn test` 226 passed / 41 suites, `yarn dev` build clean. Also parsed the edited stylesheet with `css-tree` (0 errors), since nothing in the pipeline compiles CSS. No Python gates: nothing under `server/` is touched.
- [x] 4.2 Narrowed the *Deferred* paragraph in `openspec/specs/bughouse-round-layout/spec.md`: the 1.5px clearance it recorded is gone (21.8px at 2560x1440, 5.04px at the 602px floor, against a 2.96px overlap before), and the board-to-tools seam it never mentioned is noted as having had the same defect. What remains open — `column-gap` still being a free `2vmin` that shrinks as the window shrinks — is stated as the question, with a floor named as the obvious shape.
- [x] 4.3 Gutter numbers from 3.4 reported. The decision is not opened inside this change.
