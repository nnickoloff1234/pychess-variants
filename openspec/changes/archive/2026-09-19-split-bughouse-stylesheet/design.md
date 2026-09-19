## Context

`static/bughouse.css` is 5,496 lines, loaded by one `<link>` in `templates/base.html`, and shared by
the round and analysis two-board pages. It grew by accretion: every rule about this layout is in it,
and nothing says where a rule belongs, so a change is made wherever the search landed. Measured
across the whole file, by the concern its selector names and by the media query it sits in:

| file candidate | no media | landscape (both) | tall landscape | short landscape | portrait | width bp | total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| app rules not yet sorted | 192 | 158 | 166 | 95 | 103 | 0 | **714** |
| arrangement (areas, homes, drops) | 161 | 438 | 42 | 21 | 13 | 0 | **675** |
| boards and stacks | 401 | 24 | 49 | 71 | 43 | 0 | **588** |
| seats, clocks, names, pockets | 468 | 22 | 8 | 0 | 52 | 0 | **550** |
| preset buttons | 363 | 0 | 13 | 73 | 3 | 0 | **452** |
| the `--bug-*` values, and the page shell | 79 | 3 | 77 | 93 | 78 | 37 | **367** |
| move list | 205 | 0 | 0 | 0 | 0 | 0 | **205** |
| tab strip, tools bar, end of game | 179 | 0 | 0 | 0 | 3 | 0 | **182** |
| engine box, gauges, charts | 94 | 30 | 0 | 0 | 3 | 0 | **127** |
| chat | 97 | 0 | 0 | 0 | 0 | 0 | **97** |

Two facts come out of that table and they decide the design. **Only 40% of the file is inside a
top-level `@media` at all** — 3,260 lines are not mode-scoped. And **every mode's rules are spread
across every component**: portrait is 103 lines of app rules, 52 of seats, 43 of stacks, 13 of
arrangement, 3 of presets.

## Goals / Non-Goals

**Goals:**

- A rule's file is predictable from what the rule is about, so a change starts in one file.
- No file large enough to need searching rather than reading — target under ~700 lines.
- The load order written down, because the cascade depends on source order today and will depend on
  file order afterwards.
- Nothing drawn differently. The layout survey's 264 rows are the acceptance test, and the run after
  must differ from the run before in nothing at all.

**Non-Goals:**

- Renaming areas, classes, ids or custom properties. That is the next change and the reason for this
  one; doing both at once would leave nothing to compare a run against.
- Merging duplicate rules, deleting dead ones, or simplifying selectors — every one of those is a
  behaviour change wearing a refactor's clothes.
- Changing how a mode is chosen, or the media queries themselves.
- A CSS build step, a preprocessor, or a bundler.

## Decisions

### 1. Components first, and the arrangement split by mode inside itself

The obvious split — one file per layout mode plus a common file — was measured and rejected: it
leaves a ~3,300-line `common.css`, which is the file we are trying to get rid of, and each mode file
would still mix boards, seats, presets and the tab strip. Modes are not what a rule is ABOUT; they
are a condition a rule is under.

The arrangement is the exception, and genuinely so: areas, homes and drop classes exist to say what
each mode does differently, and 438 of its 675 lines are already inside the landscape media query.
So the arrangement gets a folder of its own, split by mode, and every other concern gets one file
holding its own mode variations — a seat's portrait rules beside its landscape ones, which is how
they are read.

```
static/two-boards/
  properties.css          every `--bug-*` value and its `@property` registration, grouped by use
  page-shell.css          what a two-board page changes about the page around it
  layout/
    shared.css            the two app grids, the merged column, what every mode declares
    landscape.css         what both landscape modes share — the zones vocabulary, the homes
    tall-landscape.css    zoom, the band, what only the tall mode states
    short-landscape.css   the pinned mode
    portrait.css          stack over stack, the drop templates
  components/
    stacks.css            boards, coordinates, the coordinate gap
    seats/
      strips.css          the strip itself and its two info-wraps
      usernames.css       the name, its size, and whether it gets a line of its own
      clocks.css          the clock, its digits, the hurry state
      pockets.css         the pockets at each end of a stack
    chat.css
    presets.css
    movelist.css
    tabs.css              tab strip, tools bar, end-of-game block
    engine.css            the engine box, multipv, the pv columns, the eval gauges
    movetime-chart.css    the move-time chart and the container query that turns it
```

### 2. `properties.css`, and the page shell out of it

"Tokens" was the first name for the file holding the `--bug-*` values, and it is jargon: a reader who
does not already know the term cannot tell what belongs there. It is `properties.css`, after the
thing it holds — custom properties — which is also the word a reader searches for.

The page shell came out with it. `body`, `#main-wrap` and `main.round` pinned to the viewport with
`overflow: hidden` are not values; they are what a two-board page changes about the page AROUND it,
and that is a different question from what `--bug-preset-btn-min` means. `page-shell.css` states
that in at most three lines at the top and holds nothing else.

### 3. Explicit `<link>` tags, in a stated order — not `@import`

`@import` serialises requests and delays first paint; a build step that concatenates is a new
dependency for a project that has none. Eleven `<link>` tags cost eleven requests on a connection
that is already HTTP/2 in development and production. The order is the design: `properties.css` and
`page-shell.css` first, then `layout/`, then `components/`, each group in the order the folder lists
them.

### 4. The move preserves relative order, and the survey proves it

Every rule keeps its text and its position relative to any rule it could tie with. Where two rules
have equal specificity and the winner is decided by source order, the split must not put them in
files loaded the other way round. This is the one way a pure move can change the page, so it is what
the acceptance test is aimed at: a full survey run before, a full run after, and a diff of
`facts.json` that comes back empty. A row that moves is a rule that moved past a tie.

### 5. Every property says what it is, and they are grouped by how they are used

61 distinct `--bug-*` properties are declared in this stylesheet and about 32 of them are set or read
from TypeScript. Moved as they are, they would be 61 names in a list. So each one gets a line or two
saying what it is about, and they are grouped by USE and by WHERE THEY COME FROM — the ones
`squareUnit.ts` publishes, the ones `toolsPlacement.ts` publishes, the ones a part declares for the
placement code to read, the ones only the stylesheet computes from others.

That grouping is also the evidence for the question after this change: two properties in the same
group with the same value are the same quantity under two names, and the file is where that becomes
visible. Reducing them is NOT part of this change.

### 6. Files are named for components, never for pages — and components live together

The first tree had an `analysis.css`, which read as "the analysis page's rules" and was not: it was
the analysis-only COMPONENTS — the engine box, the pv columns, the gauges, the chart. Named for a
page it invites a `round.css` beside it, and the measurement says that would be a mistake. Of the
3,957 lines that belong to a rule, 963 are round-only and 822 analysis-only — 45% — but the split
within that is two different things:

- **Components one page has and the other does not**: the engine box, multipv, the pv columns and the
  gauges (159 lines, no round-only rules at all) and, the other way, the preset buttons (461 lines,
  and the analysis column is zero), the end-of-game block, draw and resign.
- **One component, tuned per page**: the arrangement (230 round-only, 279 analysis-only), the
  unsorted app-level rules (313 and 209), the seats (212 round-only, mostly the clock and the
  info-wrap), the stacks (39 and 83).

The first kind already has a home under its own component name. The second kind must stay BESIDE THE
RULE IT TUNES — a page file would put an override and the rule it overrides in different files, which
is the thing this split exists to stop. So: no `round.css`, no `analysis.css`, and `engine.css` says
what it holds.

THE CHART IS NOT THE ENGINE. It shares a page and nothing else: 37 lines, its own `@property`, its own
container query, and `movetimeChart.ts` behind it. `movetime-chart.css`.

THE GAUGES ARE. They hang off the stacks and could have gone with them, but an eval bar is the
engine's output — it is drawn from what the engine says and it disappears with it — so the 18 lines
stay in `engine.css`. Nikolay's call, 2026-09-19.

AND COMPONENTS LIVE IN `components/`. Nine files at the top level would put `chat.css` and
`properties.css` in one list as if they were the same kind of thing. The folder says which are parts
of the page and which are the frame around them.

### 7. The seats are four concerns in 620 lines, and get four files

Measured, the group splits cleanly in four: the username and what carries it — `round-player0/1`,
`.player-data`, the `name-outside` arrangement — is 193 lines; the clock, its digits and its hurry
state is 182; the strip itself and its two info-wraps is 166; the pockets are 79. No file over 200.

`components/seats/`, four files, Nikolay's call on 2026-09-19. The username was nearly folded into
the strip on the reasoning that the strip is what it sits in — which would have made one 359-line
file holding two subjects, "how the strip is arranged" and "how the name is sized and when it takes a
line of its own". The second of those is a rule with a module behind it (`seatNamePlacement.ts`) and
a survey check watching it; it earns its own file.

### 8. One file at a time, each its own commit

The file is moved concern by concern — extract `chat.css`, run the survey, commit; then `movelist.css`,
and so on — smallest first. A split done in one commit cannot be reviewed and cannot be bisected;
done in eleven, each step is a diff a person can read and a survey run can confirm.

## Risks / Trade-offs

- **A tie broken by source order flips when the rules land in different files** → the survey run
  after each extraction; and where a flip is found, the rule that should win says so with its own
  specificity and the reason is recorded, rather than the file order being quietly relied on.
- **A rule belongs to two concerns** (a preset button inside a seat strip, the engine box inside the
  tools column) → the file is chosen by what the rule SELECTS, not by where the element sits, and the
  choice is noted at the top of each file. Where that is genuinely ambiguous, the arrangement file
  takes it, because that is the file about relationships between parts.
- **Eleven requests instead of one** → measured on the harness before and after; if first paint moves
  at all, the answer is a build-time concatenation, not a return to one file.
- **Merge pain against the fork's other branches** → this change is one move per commit, so a
  conflict lands in a small file rather than in a 5,500-line one.
- **The renaming that follows will move rules between files again** → accepted. The split is what
  makes the renames reviewable, and a rename that changes a file's contents is exactly the work this
  is for.

## Migration Plan

1. Create `static/two-boards/` with empty files and the `<link>` tags in `base.html`, keeping
   `bughouse.css` loaded last so nothing changes yet.
2. Extract one concern per commit, smallest first: chat, analysis, tabs, movelist, presets, seats,
   stacks, the properties and the page shell, then the arrangement folder. Survey run per commit.
3. When `bughouse.css` is empty, delete it and its `<link>`.
4. Rollback at any point is the previous commit: the file that was extracted goes back, since nothing
   else changed.

## Open Questions

- ~~Whether the app-level `--bug-*` declarations belong with the values or with the concern whose
  size they publish~~ — ANSWERED by Nikolay, 2026-09-19: they go in `properties.css`, all of them, so
  that there is one file to read when asking what a name means and one place to compare two names
  that may turn out to be the same number. See decision 5.
- Whether any of the 61 properties are the same quantity under two names. Nikolay suspects so, and
  the grouping in decision 5 is what would show it — but NOT in this change: reduction is a
  behaviour change, and it belongs with the renaming that follows.
- ~~Whether the round page and the analysis page want their own files where their rules differ~~ —
  ANSWERED, see decision 6: files are named for components, and a page's tuning of a shared component
  stays beside what it tunes.
- **THE TWO PAGES STATE THE SAME ARRANGEMENT TWICE, and it is 509 lines.** `layout` is 230 round-only
  and 279 analysis-only, and reading them they are not overrides of a shared rule: each page spells
  out its own `tools-below`, `tools-zonea`, `tools-lastresort` and `drop-*` rules over the same zone
  names and the same templates. That is the shape `seatNamePlacement.ts` had before 2026-09-19 — one
  question answered twice, one copy quietly drifting from the other — one level down in the
  stylesheet. Not this change: this change only moves them, and moving them into
  `layout/<mode>.css` is what will put the two copies side by side where the difference can be read.
  Recorded here as the thing to look at once the split is done.
- Whether `seats.css` should be split further into strips, clocks and pockets, at ~550 lines.

## What it came to — 2026-09-19

The estimate is in the table at the top; this is what the files actually hold. `bughouse.css` is
deleted.

| file | lines | | file | lines |
| --- | --- | --- | --- | --- |
| `layout/landscape.css` | 662 | | `components/seats/usernames.css` | 329 |
| `components/presets.css` | 545 | | `layout/portrait.css` | 311 |
| `components/tabs.css` | 498 | | `layout/tall-landscape.css` | 286 |
| `components/stacks.css` | 496 | | `components/engine.css` | 205 |
| `layout/shared.css` | 490 | | `components/seats/strips.css` | 198 |
| `properties.css` | 455 | | `components/seats/clocks.css` | 193 |
| `page-shell.css` | 330 | | `components/movelist.css` | 188 |
| | | | `layout/short-landscape.css` | 181 |
| | | | `components/seats/pockets.css` | 123 |
| | | | `components/chat.css` | 100 |
| | | | `bughouse-lobby.css` | 51 |
| | | | `components/movetime-chart.css` | 39 |

WHERE THE ESTIMATE WAS WRONG, and why it is worth recording: the component estimates were made
with a parser that took the line containing `{` as the selector, so every multi-line selector list
was under-counted. `tabs.css` came out 409 lines against an estimated 182, `presets.css` 475
against 452, `seats/` 693 against 620. The three biggest files are the ones whose rules the
stylesheet states twice — once per page — which is the finding in 5.4 and now partly fixed.
