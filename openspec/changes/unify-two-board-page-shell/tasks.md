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
- [ ] 3.4 A look in the four-window harness. The survey measures geometry, not landmarks; a
      screen-reader pass is what would confirm the point of the change.
