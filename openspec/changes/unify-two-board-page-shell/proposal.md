## Why

The two two-board pages reached their app through different DOM:

```
round     div#main-wrap.bug > main.round.bug > aside.sidebar-first + div.round-app.bug
analysis  div#main-wrap.bug >                                        div.analysis-app.bug
```

The extra `main.round.bug` hop was a **height relay** and nothing else. Every structural rule it
carried was `height: 100%` plus a `grid-template-rows` list, and two of those lists still declared
four rows for a template with two areas. The only other thing it did was name the `app` area that
`round.css` asks for — the single-board page's shell talking.

What kept it alive was `aside.sidebar-first`, rendered empty: the one-board page fills it with the
game info and the chat, and this page moved both into tabs years of commits ago. Two children
instead of one is the entire reason the shell needed a grid. The empty aside also announced an
empty `complementary` landmark to anyone navigating by landmark.

Meanwhile the analysis page had **no `<main>` at all** — no landmark in `template.html`, and
`main.ts` puts its app straight into `#main-wrap`. Two pages, two shapes, one of them with no way
to skip to the content.

## What Changes

- `#main-wrap.bug` **is** the `<main>` element on both pages. The landmark comes from the element
  name, so no `role` attribute and no extra box.
- The `main.round.bug` shell is deleted, and the empty `aside.sidebar-first` with it.
- `.round-app.bug` claims `grid-area: main` — the one area `#main-wrap.bug` declares, and the area
  `.analysis-app` has always claimed. Without this the app would name an area no template declares
  and be auto-placed into an implicit track.
- The shell's centring moves to `#main-wrap.bug` at `min-width: 800px`: one content-sized column,
  `justify-content: center`. It had two children to centre; there is one now.
- The dozen component rules scoped `main.round.bug …` are scoped `.round-app.bug …`, which is what
  they meant.

Both pages are now `main#main-wrap.bug > app`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a structural refactor: the survey is the acceptance test and it reports no change.

## Impact

- `client/main.ts` — the wrapper element and the round page's lost shell.
- `client/two-board/round/round.ts` — the empty aside.
- `static/two-boards/page-shell.css` — four shell rules deleted, the centring moved.
- `static/two-boards/layout/shared.css` — the app's area.
- `static/two-boards/layout/landscape.css` — the shell dropped from a shared height rule.
- `static/two-boards/components/movelist.css`, `components/seats/pockets.css` — re-scoped.
