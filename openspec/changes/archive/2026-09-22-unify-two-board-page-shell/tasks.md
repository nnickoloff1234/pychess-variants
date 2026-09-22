## 1. Measure

- [x] 1.1 What the shell carried, per mode, beside what `#main-wrap` already carried — the table in
      `design.md`. Every height is a pass-through; two of the row lists declare four rows for a
      template with two areas.
- [x] 1.2 What holds it up: `aside.sidebar-first`, rendered empty since the game info and the chat
      moved into tabs. Two children is why the shell is a grid.
- [x] 1.3 The analysis page has no `<main>` — none in `template.html`, and `main.ts` puts its app
      straight into `#main-wrap`. No landmark to skip to.
- [x] 1.4 Nothing pins the wrapper's tag name: no `div#main-wrap` in any stylesheet or source file,
      only in the generated bundle. `#main-wrap` is a direct child of `<body>`.
- [x] 1.5 The trap: `round.css` gives `.round-app` `grid-area: app`, which only the shell declared.

## 2. Do

- [x] 2.1 `main.ts`: `div#main-wrap.bug` → `main#main-wrap.bug`, both branches; the round page's
      inner `main.round.bug` wrapper deleted.
- [x] 2.2 `round.ts`: `aside.sidebar-first` deleted.
- [x] 2.3 `page-shell.css`: the portrait, short-landscape and tall-landscape shell rules deleted;
      the `min-width: 800px` block's centring moved onto `#main-wrap.bug` as one content-sized
      column. The measurements in those comments are kept where they still explain a live rule.
- [x] 2.4 `layout/shared.css`: `.round-app.bug { grid-area: main; }`.
- [x] 2.5 `layout/landscape.css`: the shell dropped from the shared app-height selector.
- [x] 2.6 `components/movelist.css` (8) and `components/seats/pockets.css` (2): `main.round.bug …`
      → `.round-app.bug …`, plus the comments that named the old selector.

## 3. Verify

- [x] 3.1 Frontend gates: lint, typecheck, md, jest — all pass.
- [x] 3.2 Layout matrix, 264 rows, against the run immediately before this change: **0 rows changed
      geometry, 0 changed failures.** Against the 2026-09-20 baseline the only differences are the
      six `uleft` areas from the change before this one, and `D1-C1-minxmin`'s known
      `presetGap`/`presetGapAfforded` timing race.
- [x] 3.3 The emitted DOM: the two-board round view returns `[div.round-app.bug]` — no aside — and
      both branches emit `main#main-wrap.bug`.
- [x] 3.4 The LANDMARKS, read where a screen reader reads them: the accessibility tree, dumped over
      CDP (`Accessibility.getFullAXTree`) on a live round page and on the analysis page of the same
      game. Both now report:

      | | round | analysis |
      |---|---|---|
      | `<main>` elements | `main#main-wrap.bug` | `main#main-wrap.bug` |
      | `<aside>` elements | none | none |
      | app's ancestry | `div < main#main-wrap < body` | `div < main#main-wrap < body` |
      | AX landmarks | banner, main, form, region "Partner board" | banner, main, form, region "Partner board" |

      The two pages are landmark-identical, which is the point of the change: one `main` to skip to
      on both, where the analysis page had none, and no `complementary` at all, where the round page
      announced an empty one. The `form` is the header's search box and the `banner` is the site
      header; both are the shell's, not this app's.

      WHAT THIS IS NOT: a real assistive technology was not driven. The accessibility tree is what a
      screen reader consumes, so a wrong tree cannot read correctly — but "Orca announces it well" is
      a different claim and is not made here. Nor was the four-window harness used: the tree is a
      property of the DOM, identical in a headless page and a tiled Chrome one, and the harness had
      been torn down by the container rebuild. A human look remains worth having and is not blocked
      by anything here.
