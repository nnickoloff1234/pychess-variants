# Tasks

The rule this change exists to satisfy: **a board is rendered once, at load, with its exact bounds;
nothing before or after that rendering changes them.** Body is the only element that may be
observed, and explicit user zoom or resize is the only path that redraws a board.

## 1. Diagnosis, kept because it is what makes the rule concrete

- [x] 1.1 Portrait board measured 368 in a 380 container, `--cg-width-b: 368px`, against a quantised unit of 378.67 — reproducible on **every** load
- [x] 1.2 `updateBounds` takes `wrap.getBoundingClientRect().width` and quantises it, so a wrong width means the wrap really was that wide when it ran
- [x] 1.3 Load trace with the old geometry: wrap 378 at 47ms, 386 at 101ms, body identical at 386.0x835.3 throughout — the container and the viewport are decoupled by construction, since the container is a grid track inside a layout that fills the viewport
- [x] 1.4 A window resize always worked, because that is the one event that moves body too — which is why the bug looked intermittent
- [x] 1.5 Checked rather than assumed: all three modes already set `overflow: hidden` on the round page's body, so the ~8px from site.css's `body { margin: 0 0 2vmin }` is clipped, never a scrollbar

## 2. The rejected approach, reverted

- [x] 2.1 `boardBounds.ts` observed each board's wrap and re-measured through `updateBounds`/`renderResized`
- [x] 2.2 Rejected: a layout corrected after the fact is a layout whose sizes were not known when they were needed, and its termination guard never engaged in landscape — see [[boardbounds-guard-needs-review]]
- [x] 2.3 Module deleted, call removed from `roundCtrl`, zero references remaining, typecheck and 226 tests pass

## 3. Give the container a width the board can render

- [x] 3.1 Portrait's board container takes `calc(var(--bug-portrait-sq) * 8)` and is centred with `margin-inline: auto`
- [x] 3.2 Confirmed portrait-only: the rule sits at line 410, inside `@media (orientation: portrait)` which spans 187 to 491
- [x] 3.3 Preset sets and parts pack right (`justify-content: flex-end`)
- [x] 3.4 Tall landscape's partner track has the same defect — track 398.9 against a board of 393.3, because the zoom scale is applied after the quantisation. **Moved to `boards-resize-only-on-user-action` tasks 1.x**, with the measurement carried over
- [x] 3.5 Auditing the remaining tracks and stating the rule where they are defined — **moved to `boards-resize-only-on-user-action` tasks 2.x**

## 4. Verify the rule holds without any observer

- [x] 4.1 p4 portrait, fresh load, no observer: container 384, board 384, `--cg-width-b: 384px`, 1px each side, centred
- [x] 4.2 The load still wobbles around it — `main` and `.round-app` go 386 -> 384 -> 386 between 80ms and 126ms — and the board never moves, because its container is pinned to the quantised width
- [x] 4.3 p1 short landscape: both boards 437.3 in 437.3 containers, zero slack
- [x] 4.4 p3 tall landscape: own board 400 in 400, zero slack; partner board 393.3 in 398.9, which is task 3.4
- [x] 4.5 Presets unchanged throughout: 45.9 on p1, 38.2 on p3

## 5. Gates

- [x] 5.1 `yarn typecheck` clean
- [x] 5.2 `yarn test` — 226 passed
- [x] 5.3 Synced and hard reloaded all three windows; instrumentation removed and its absence verified in source and in the served bundle

## 6. Carried out of scope, deliberately

This change did what it set out to do: it established the rule and made portrait conform, with the
observer reverted. The rest is the same rule applied elsewhere, and grew past what belongs here.

- [x] 6.1 `main` and `.round-app` resizing during load (386 -> 384 -> 386) — **moved to `boards-resize-only-on-user-action` tasks 3.x**
- [x] 6.2 Tall landscape's partner track — moved, see 3.4
- [x] 6.3 The ~8px of clipped page height from site.css's body margin — **moved to `boards-resize-only-on-user-action` tasks 5.x**
- [x] 6.4 `ZoomSettings.update()`'s `setTimeout(..., 100)` redraw — **moved to `boards-resize-only-on-user-action` tasks 4.x**
- [x] 6.5 Reviewing the deleted `boardBounds.ts` guard before pushing to master — moved as task 7.1 there, and held in memory as [[boardbounds-guard-needs-review]]
