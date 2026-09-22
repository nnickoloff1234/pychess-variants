## Context

`main.round.bug` carried four structural rules. Laid out by mode, with what `#main-wrap` already
carried beside it:

| mode | `#main-wrap` (round) | `main.round.bug` |
|:--|:--|:--|
| portrait | `height: 100%`, rows `minmax(0,1fr)` | `height: 100%`, rows ×4 |
| short landscape | `grid-template-columns: 1fr` | columns `minmax(0,1fr) minmax(0,max-content)`, `justify-content: stretch`, `row-gap: 0` |
| tall landscape | `height: var(--bug-app-h)`, rows `minmax(0,1fr)` | `height: 100%`, `row-gap: 0`, rows ×4 |
| `min-width: 800px` | — | columns `max-content` ×2, `justify-content: center`, rows ×2, areas |

Every row list is longer than the template needs, every height is a pass-through, and the only
declarations that did real work — the fractional column in short landscape and the centring at
`min-width: 800px` — did it for two children, one of which was an empty aside.

## Goals / Non-Goals

**Goals:**

- One DOM shape and one set of shell rules for both pages.
- A `main` landmark on both pages, the analysis page included.
- No visual change: the survey's 264 rows are the acceptance test.

**Non-Goals:**

- Making `#main-wrap` a `<main>` on the pages that are not two-board. Same one-word change, same
  id-based CSS, but each of those pages needs checking for a `<main>` of its own first.
- Renaming areas or classes. That is the phase the stylesheet split was the prerequisite for.

## Decisions

### Decision 1: the wrapper becomes the element, rather than gaining an attribute

`role="main"` on `#main-wrap.bug` would have given both pages the landmark with no DOM change at
all, and it was the plan for about a minute. Making the wrapper a `<main>` is better for the same
cost: the role comes from the element name, cannot be dropped in a later refactor, and needs no
comment explaining why a div is announcing itself as the main region. `#main-wrap` is a direct
child of `<body>` — its siblings are the header block and the `#reconnecting` link — so it is a
legal place for `<main>`, not nested in a header, nav, aside or footer.

Nothing pins the tag: every rule and every lookup addresses it by id, and `getElementById` does not
care what element wears it. A repo-wide search for `div#main-wrap` finds only the generated bundle.

### Decision 2: the empty aside goes, which is what lets the grid go

`round.ts` rendered `h('aside.sidebar-first')` with no children and a comment saying whether an
empty aside should still render "is a layout question this change does not open". It is the
question, as it turns out: two children is why the shell was a grid. The analysis page has no
aside, so parity settles it in the same direction, and an empty `complementary` landmark is worse
than free for anyone navigating by landmark.

### Decision 3: `.round-app.bug { grid-area: main }`

The trap this change had to avoid. `round.css:5` gives `.round-app` `grid-area: app`, provided by
the shell's template; `analysis.css:10` gives `.analysis-app` `grid-area: main`, provided by
`#main-wrap.bug`. Delete the shell without addressing this and the round app names an area that no
longer exists, is auto-placed, and mints an implicit track — invisible, and the exact failure the
`uleft` element caused for a year. One declaration puts both apps in the same area.

### Decision 4: `minmax(0, max-content)`, not `auto`, for the centred column

An `auto` track stretches to fill, which would make the app full width and leave the boards against
the left edge. The shell centred two content-sized columns; the wrapper centres one. Short landscape
overrides this with `1fr` from its own body-prefixed rule, which outranks `#main-wrap.bug` whatever
the file order — that is the mode where filling is what is wanted.

## Risks / Trade-offs

- **[Specificity drops on the re-scoped component rules]** → `main.round.bug X` is (0,3,1) and
  `.round-app.bug X` is (0,3,0), one type selector lighter, so a rule that was winning a tie could
  stop. The survey is what catches this: the stylesheet split produced three such reversals and
  each showed as changed geometry. This run shows none.
- **[The other pages keep a `div#main-wrap`]** → An inconsistency, deliberately not fixed here.

## Open Questions

- Should every page's `#main-wrap` become a `<main>`? Each one needs checking for a `<main>` of its
  own in its template first — several server-rendered pages have one.
