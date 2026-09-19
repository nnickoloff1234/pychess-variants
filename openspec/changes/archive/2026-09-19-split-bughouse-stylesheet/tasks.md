# Tasks

## 1. Before anything moves

- [x] 1.1 A full survey run on the current tree, kept as the baseline for every extraction below:
      `env PYTHONPATH=server:tests uv run python -m layout_matrix --out <dir>`. Every step compares
      against the run before it, not against this one, so a drift introduced in step 5 is not hidden
      by a row that was already failing in step 1.
- [x] 1.2 Create `static/two-boards/` and add the `<link>` tags to `templates/base.html` in the
      stated order — `properties.css`, `page-shell.css`, `layout/`, then the components — with
      `bughouse.css` still loaded LAST.
      Empty files change nothing, and the order is then in place before anything depends on it.
- [x] 1.3 A survey run to confirm 1.2 changed nothing. Eleven empty stylesheets should be invisible;
      if they are not, the reason is worth knowing before a rule is moved.

## 2. The extractions, smallest first, one per commit

Each item: move the rules with their comments, keeping their relative order; run the survey; diff
against the previous run; commit only on an empty diff.

- [x] 2.1 `components/chat.css` — 97 lines, no mode variations, nothing else selects what it
      selects, and not one page-scoped rule in it. The one that proves the procedure.
- [x] 2.2 `components/movetime-chart.css` — 37 lines: the chart container, `#chart-movetime`, the
      `movechart` container query and `--bug-chart-inverted`. It shares a page with the engine and
      nothing else.
- [x] 2.3 `components/engine.css` — the engine box, multipv, the pv columns and the eval gauges.
      ~192 lines of engine and pv rules plus the gauges' 18, including the `engine-side` and `pvcol`
      rules currently unsorted.
- [x] 2.4 `components/tabs.css` — the tab strip, the tools bar and the end-of-game block. ~182 lines.
- [x] 2.5 `components/movelist.css` — ~205 lines, none of it mode-scoped.
- [x] 2.6 `components/presets.css` — ~452 lines, including the short-landscape block's 73 and the
      sizing rules that `publishPresetSize()` reads. A round-page component: the analysis page has no
      preset rule at all.
- [x] 2.7 `components/seats/` — 620 lines in four files, none over 200. 212 of them are round-only,
      mostly the clock and the info-wrap, and they stay beside what they tune.
      - [x] 2.7.1 `pockets.css` — 79 lines, the smallest and most self-contained of the four.
      - [x] 2.7.2 `clocks.css` — 182 lines: the clock, its digits, the hurry state. Round-only in
            effect; the analysis page draws no clock.
      - [x] 2.7.3 `strips.css` — 166 lines: the strip and its two info-wraps, including the height it
            is pinned to and the overflow that clips what hangs out of it.
      - [x] 2.7.4 `usernames.css` — 193 lines: `round-player0/1`, `.player-data`, the font ceiling
            and the `own-name-outside` / `partner-name-outside` arrangement both pages now reach
            through `seatNamePlacement.ts`. The one file in `seats/` with a module and a survey check
            behind it.
- [x] 2.8 `components/stacks.css` — ~588 lines: the boards, the coordinates and the coordinate gap.
- [x] 2.9 `page-shell.css` — `body`, `#main-wrap` and `main.round`: the pinning and the
      `overflow: hidden` a two-board page needs from the page around it. At most three lines of
      comment at the top saying that, and nothing else in the file.
- [x] 2.10 `properties.css` — all 61 `--bug-*` declarations and their `@property` registrations,
      including the app-level ones on `:is(.round-app, .analysis-app).bug`.
      - [x] 2.10.1 DONE — and it found that the file holds only 27 of the 48 names: `squareUnit.ts`
            writes 8 and `toolsPlacement.ts` 7 straight onto the app's style attribute, so a reader
            looking `--bug-preset-btn` up in the stylesheet would have found nothing at all.
            ORIGINAL: First the inventory: for each property, where it is DECLARED, whether TypeScript
            sets it (about 32 do — `squareUnit.ts`, `toolsPlacement.ts`, `seatNamePlacement.ts` and
            the chart), whether TypeScript reads it, and which other properties it is computed from.
      - [x] 2.10.2 DONE, AS A MAP AT THE TOP RATHER THAN AS AN ORDERING, and the reason is
            load-bearing: seven names are declared MORE THAN ONCE — `--bug-stack-allow` eight
            times, `--bug-stack-sq` six, `--bug-coord-room` five, `--bug-tools-track` three, and
            `--bug-coord-gap`, `--bug-sq`, `--bug-own-sq` twice — once per mode, the winner decided
            by which selector and query match. Sorting the file into groups would reorder those and
            change which wins. So the declarations stay in written order and the grouping is stated
            above them, in five groups: what `squareUnit` publishes, what `toolsPlacement`
            publishes, what a part declares for the placement code, what the stylesheet computes,
            and — exposed by the grouping — the `--bug-zones-*` templates, which are not numbers at
            all and are read only by `layout/`. Survey after: no row changed.
            ORIGINAL: Then the file: grouped by that — what `squareUnit` publishes, what `toolsPlacement`
            publishes, what a part declares for the placement code to read, what the stylesheet
            computes from the others — with each property carrying one or two lines saying what it
            is about.
      - [x] 2.10.3 DONE. Two pairs resolve to the same value — `--bug-sq` = `--bug-stack-sq` and
            `--bug-sq-b` = `--bug-stack-sq` — and they are INDIRECTION rather than redundancy:
            `--bug-stack-sq` is the per-stack alias that lets `seatNamePlacement.ts` and the
            coordinate arithmetic ask for "this stack's square" without knowing which column they
            are on. Recorded, not merged.
            ORIGINAL: Anything the inventory shows to be two names for one quantity is RECORDED, not
            merged. Reduction is a behaviour change and belongs with the renaming.
- [x] 2.11 `layout/` — what is left, split into `shared`, `landscape`, `tall-landscape`,
      `short-landscape` and `portrait`. Last, because by then it is all that remains and the split
      is between five files rather than out of a large one.
- [x] 2.12 Delete `static/bughouse.css` and its `<link>`. A survey run confirms the file was empty in
      effect as well as in fact.

## 3. What each file says about itself

- [x] 3.1 Every file opens with a comment stating what belongs in it and what does not, in the same
      voice as the rules it holds — a reader deciding where to put a new rule should not have to
      guess.
- [x] 3.2 `templates/base.html` carries the load order with the reason for it, so the next person to
      add a `<link>` knows where in the sequence it goes.
- [x] 3.3 Any tie that had to be made explicit under requirement 2 is recorded where the winning rule
      is, with the measurement that found it.

## 4. Verify

- [x] 4.1 A final survey run against 1.1's baseline: 264 rows, and the only differences are the rows
      known to jitter.
- [x] 4.2 `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test` — unchanged by a CSS move, and run so
      that the claim is checked rather than assumed.
- [x] 4.3 DONE, AND IT FOUND THE ONE THING EVERYTHING ELSE MISSED — see 6.7. ORIGINAL: The four-window harness on the round page and the analysis page, one look per mode, for
      the things a geometric survey cannot see: colours, borders, hover states, the scrollbars.
- [x] 4.4 DONE. Median of three cold loads each, same page, same server, HTTP/1.1 on localhost:
      before — 14 stylesheets, 652,815 bytes, first paint 103.7ms, DOMContentLoaded 489ms;
      after — 32 stylesheets, 679,300 bytes, first paint 137.7ms, DOMContentLoaded 545ms.
      So the split costs ~34ms of first paint and ~55ms to DCL on a cold cache, and 26KB of
      headers and re-created `@media` wrappers. It lands on a first visit only, on the transport
      where 18 extra requests are at their most expensive. Recorded rather than acted on; if it
      ever matters the answer is a build-time concatenation, not one file again.
      ORIGINAL: First paint measured before and after on the harness. Eleven requests instead of one is the
      trade this change makes, and it should be stated in numbers rather than assumed to be free.

## 5. What this unlocks, and does not do

- [x] 5.1 DONE — the final file map is in `design.md`'s "What it came to". ORIGINAL: Record in `design.md` which files ended up holding what, against the estimate above — the
      difference is the map of where the concerns actually are, which is what the renaming change
      will work from.
- [~] 5.2 NOT THIS CHANGE, by design — a forward pointer, not a task. The renaming of areas, classes and ids is NOT part of this change. Once the split is in,
      each rename is one file, one survey run, one commit.
- [x] 5.3 DONE — the two pairs are in `properties.css`'s map, with what the indirection buys, so
      the renaming starts from them. ORIGINAL: Carry 2.10.3's list forward: the properties that look like two names for one quantity, with
      the values that make them look that way. That list is the reduction's starting point, and it
      is worth nothing until the renaming gives the survivors names that say what they are.
- [x] 5.4 **The two pages state the same arrangement twice — DONE, 2026-09-19.** Of the 569
      page-scoped lines in `layout/landscape.css`, eight selector pairs differed only in the app
      class and their declarations matched to the character — 189 lines. Merged to
      `:is(.round-app, .analysis-app)`, which costs no specificity, and the survey confirmed no
      row changed. The file went 727 to 662 lines. What remains page-scoped is rules for parts one
      page has and the other does not, which are right to say which page they are for.
      ORIGINAL NOTE: **the two pages state the same arrangement twice — 509 lines**, 230 round-only and 279
      analysis-only, each spelling out its own `tools-*` and `drop-*` rules over the same zone names.
      Once `layout/<mode>.css` puts the two copies side by side, that is the next thing to read: it
      is the same shape the seat-name rule had before 2026-09-19, one question answered twice, one
      level down. Not this change — this change only moves them.

## 6. What the split turned up — 2026-09-19

- [x] 6.1 **THE FILE WAS NOT ALL TWO-BOARD.** `.bugseekteam1/2`, `.bug-join-button`, `.bugwaiting`,
      `player.bug` and `.versus.bug` — the lobby's seek and team UI — were in `bughouse.css` because
      the variant's name was on the file. They are `static/bughouse-lobby.css` now, 51 lines, and
      never entered `two-boards/`.
- [x] 6.2 **TWO TIES FLIPPED, AND THE SURVEY IS THE ONLY REASON EITHER WAS SEEN.** Both were the
      move-list panel's `flex`, tying at (0,4,0) with `tabs.css`'s `[role='tabpanel']` rule. In one
      file the later rule won; across two, the LINK order decides, and `layout/` loads before
      `components/`. The second one shipped as far as a run: 270px of content painted in a 173px
      group at 375x667, overlapping the board above and the strip below. Fixed as requirement 2
      says — `.analysis-moves-panel[role='tabpanel']`, one attribute more specific, with the
      measurement recorded beside it — not by reordering the links.
- [x] 6.3 **THE EXTRACTOR HAD TO LEARN CSS TWICE.** First it took the line containing `{` as the
      selector, so a multi-line selector list left orphans behind that attached themselves to the
      next rule — `.movelist-block`'s declarations silently applied to the tool group, which lost
      `flex-flow: column` and laid three panels out in a row. Then a comment whose first line
      contains `{ display: contents }` was cut in half the same way. Both were found by disbelieving
      a clean-looking result: the first by a 6-row diff, the second by prose left in an
      otherwise-empty file. The parser now reads whole units — leading comment, every selector line,
      interleaved comments, body — and the split files were checked for balanced comments and braces.
- [x] 6.4 **THE PROSE FOLLOWED ITS RULES.** 35 orphaned comment blocks were matched back to the rule
      they were written for by looking up what followed them in the original; 13 section banners were
      placed by hand; 3 dividers whose whole content was "the rules below came from analysis.css"
      were dropped, because the folder says that now.
- [x] 6.5 **`layout/landscape.css` was 725 lines, now 662** — see 5.4. ORIGINAL NOTE: it was, the only file over the target — and it is the 509
      lines of two pages stating the same arrangement twice (task 5.4). The split is what makes that
      readable; reducing it is the next change.
- [x] 6.6 **THE NINETEEN FILES LOAD ON EVERY PAGE, AND THAT IS THE ANSWER — retired, 2026-09-19.**
      `bughouse.css` did too, so the split changed nothing here; the question was whether to make
      them conditional on the view and save 331 KB on a first visit to a non-bughouse page.
      Nikolay: no. The files are cached after the first load, so the saving is one cold load, and
      against it stands template complexity and a condition that CANNOT BE WRITTEN RELIABLY —
      "some pages might contain fragments of bughouse/two-boards related view, for example ... the
      profile view where a list of games is rendered", which my proposed view list omitted.
      Measured after the fact: 146 of the 386 rules in `two-boards/` are not scoped to an app class
      or to `body[data-variant]` — `move-bug`, `.bugroundchat`, `#messages`, `#gaugePartner` — so
      any page rendering a fragment of a bughouse game needs them, and `bughouse-lobby.css`'s
      `player.bug` and `.versus.bug` are game-list row styles, which is the profile case exactly.
      A condition that is wrong fails silently and cosmetically, which is the worst kind to hunt.
