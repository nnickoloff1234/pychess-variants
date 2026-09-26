## 1. Panel surface in portrait

- [x] 1.1 DONE 2026-09-26. The rule is deleted and the shared paint reaches portrait: measured on
      the p4 tile (386x835) in game `LwNKl7cM`, both panels and the group now compute
      `rgb(38, 36, 33)` against a body of `rgb(22, 21, 18)`.

      **THE FILE HAD MOVED.** The task says `static/bughouse.css`, which no longer exists — the
      stylesheet was split on 2026-09-19 and the opt-out was living at
      `static/two-boards/components/presets.css:15-23`.

      **IT WON ON SPECIFICITY, NOT ORDER, and that is worth keeping.** The override was three
      classes (`.round-app.bug .chatpresets-panel`) against the shared rule's one, and it sat 300
      lines ABOVE the rule it beat. A note now says so where the shared rule is, because anyone
      wanting a portrait-only surface later will not get it from source order.

      **ITS OWN JUSTIFICATION HAD EXPIRED.** The comment read "Portrait has one arrangement and is
      not being changed". Portrait states three drop templates of its own and moves its parts
      through the same cascade as landscape, so it has exactly the "wherever the parts end up" the
      shared rule is about.
- [x] 1.2 LOOKED AT, AND KEPT. 2026-09-26 in p4, live game, Chat tab showing.

      The lift is `rgb(38,36,33)` over `rgb(22,21,18)` — about 16 points on each channel. On the
      phone tile it reads as a gentle raise rather than a slab: the panel is legible as one object
      and nothing about it is heavier than the same block in landscape. Judgement: keep.

      **WHAT THE TASK DID NOT ANTICIPATE — THE TWO PARTS ARE NOT THE SAME WIDTH.** At this viewport
      the arrangement is `tools-below` with `drop-tools4 drop-tools3`, so panel 1 is 219px wide
      beside the partner board while panel 2 has dropped to the full 384. They abut exactly
      (194+81 = 275) but the painted block is a STEP, not a rectangle. It reads fine — the step
      follows the boards above it — but "one panel" in portrait means one surface across two
      widths, which is worth knowing before anyone tries to make it a rectangle.
- [x] 1.3 NO SEAM. Panel 1 occupies y 194..275 and panel 2 begins at exactly 275 — no gap, no
      overlap, and nothing of the page shows between them.

      The task's premise that the two are "stacked in one column" in portrait is out of date: one
      of them drops. They still abut, which is what the check was for.

## 2. Does portrait have room at all

- [x] 2.1 ANSWERED, AND THE QUESTION'S PREMISE IS WRONG. Measured 2026-09-26 on p4.

      **PORTRAIT'S BOARDS DO NOT SCALE AT ALL, so there is no "as the boards are scaled down".**
      `zooma` was driven from 98.97 to 40 and the boards did not move: board A stayed 165px, board
      B stayed 384px, `--bug-own-sq` stayed `calc(384px / 8)` and `--bug-sq` stayed 83.338px. Three
      full sweeps (40/80, 70/90, 100/100) produced byte-identical arrangements and geometry.

      This is DELIBERATE and documented in `squareUnit.ts`'s `zoomReachesBoards()`: *"ONLY TALL
      LANDSCAPE ZOOMS. The mobile layouts — short landscape and portrait — draw every board at its
      allowance and always have… That is why those modes show no resize handle."* So it is not a
      defect, and no measurement across zoom levels is available to be taken.

      **AND PORTRAIT DROPS ANYWAY**, which is what makes the answer a yes rather than a no. The
      budget is not freed board space: it is `toolsRegionHeight − partnerStackHeight`, the part of
      the tools' own block the partner stack does not need. At 386x835 that is enough for two
      drops, constantly.
- [x] 2.2 THE ESCAPE HATCH IS NOT NEEDED, because the answer came out the other way. Portrait is
      NOT short landscape: its parts do drop, and section 3 is already built — see below. The
      change is archived with item 1 done and item 3 satisfied by other means, rather than with
      item 3 dropped.

## 3. A zone for the preset parts in portrait

**BUILT ELSEWHERE, in `unify-two-board-app-grid` (archived 2026-09-26).** Every item below was
satisfied while portrait was being brought onto the shared cascade, which is also why this section
was never started here. Verified against the code and against the live p4 tile on 2026-09-26.

- [x] 3.1 ONE ZONE OR TWO — **neither, and that is the better answer.** Portrait does not add a
      zone row at all: the part's OWN slot widens to the full column. `portrait.css` states three
      templates where `zoneTools4`, then `zoneTools3`, then `zoneTools2` each go from sharing a row
      with `stack` to spanning both tracks (`'zoneTools3 zoneTools3'`). Nothing has to decide
      between a zone A and a zone B, because portrait has one width and the slot simply takes it.
- [x] 3.2 THE ROWS EXIST — the three templates above, keyed to the APP rather than to the merged
      column, because the column was dissolved and the classes go on the element whose template
      they swap. Every named area is a filled rectangle, which is what 3.2 warned about.
- [x] 3.3 NO PORTRAIT ENTRIES WERE ADDED, AND NONE ARE WANTED. The droppable list stays one shared
      list and the TEMPLATES decide what a drop means per mode. That is better than both options
      this task offered — it is neither an orientation-aware list nor a mode check hidden in data,
      because no code asks about the orientation at all.
- [x] 3.4 THE COST IS CHARGED THE LANDSCAPE WAY, reusing the rule rather than re-deriving it:
      `zoneA = max(0, toolsRegionHeight − partnerStackHeight)` with the same cumulative cascade.
      That formula was made mode-independent in `3e9173a9f` precisely because the old side-by-side
      form read portrait's lower board as free space.
- [x] 3.5 THE FILL ORDER HOLDS. The tools bar goes first (`drop-tools4`), then the second preset
      panel (`drop-tools3`), then the first (`drop-tools2`) — the bar taking the lower slot with
      the presets above it, exactly as landscape does. Observed live at 386x835:
      `drop-tools4 drop-tools3`, bar full width at the bottom, panel 2 full width above it.

## 4. Verification

- [x] 4.1 SAMPLED OVER SEVEN FRAMES at 150ms, plus three full zoom settings. **One distinct state
      throughout** — `drop-tools3 drop-tools4 tools-below | btn=35.5031px | h=835` — so the
      arrangement is settled and not alternating between two self-consistent answers. Zoom cannot
      perturb it here for the reason recorded under 2.1.
- [x] 4.2 LANDSCAPE UNTOUCHED, and unreachable by construction: the deleted rule sat inside
      `@media (aspect-ratio <= 9/16)`. Checked anyway on the p1 tile (1418x612, `tools-beside`,
      all three drops): both panels paint `rgb(38, 36, 33)` as they always did, and `scrollWidth`
      equals `innerWidth` at 1418.
- [x] 4.3 NO HORIZONTAL OVERFLOW AND NOTHING UNPAINTED. Portrait `scrollWidth` 386 against an
      `innerWidth` of 386, and the app's bottom at 835 in an 835px viewport — the check the first
      gauge attempt failed, passing here.
- [x] 4.4 GATES — the full CI set rather than the two named: `yarn lint` (oxlint --deny-warnings),
      `yarn typecheck`, `yarn md` and `yarn test` (89 suites, 645 tests). All pass. No Python gates:
      this is one CSS deletion and a comment.

## 5. What this change turned out to be

Opened 2026-08-29 as two items, POSTPONED on the grounds that portrait was correct but less capable
than landscape. By the time it was picked up on 2026-09-26, **item 2's structural half had been
built by another change and item 1 was three lines of CSS**, so what remained was one deletion, one
judgement call and the recording of what the other change had already settled.

Two things are worth carrying forward rather than losing in an archive:

- **Portrait's boards never scale.** Documented in `squareUnit.ts` but not obvious from the
  layout work, and it invalidates any task phrased as "at the zoom levels people actually use" for
  portrait or short landscape. Three sweeps produced identical geometry.
- **Portrait's drop is a widening slot, not a zone.** There is no `zoneA`/`zoneB` in portrait and
  there does not need to be. Anything that later assumes "a part that drops lands in a zone" is
  wrong for this mode.
