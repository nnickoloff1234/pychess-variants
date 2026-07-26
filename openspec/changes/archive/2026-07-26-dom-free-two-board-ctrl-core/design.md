## Context

`dom-free-two-board-analysis-ctrl` (archived 2026-07-26) established the rule that `AnalysisControllerBughouse` should not create DOM elements or set styles/classes directly, but its scope was limited to *static, one-time* setup (baked into `analysis.ts`'s initial markup). This change extends the same architectural direction — DOM belongs in view/rendering modules, not controller state or inline controller methods — to the two remaining controller files, and to *dynamic, event-driven* re-rendering, which is a different and larger problem than static setup: it can't simply be "baked into initial markup," because it re-runs in response to live state changes (tree navigation, live moves, dialogs appearing/disappearing during play).

A survey of all three files found five `VNode`/`HTMLElement`-typed fields and a cluster of inline `document.*`/`patch()`/`h()` calls. Each field's actual necessity was verified by tracing whether the stored value is ever read back as the "old vnode" input to a later `patch()` call (load-bearing, since snabbdom needs that reference to diff incrementally instead of recreating the subtree) versus only ever written (dead):

| Field | File | Read back? | Disposition |
|---|---|---|---|
| `vpgn` | `analysisCtrl.ts` (written by `pgn.ts`) | No — single write site, no read | Delete |
| `moveControls` | `twoBoardCtrl.ts` (written by `movelist.ts`'s `createMovelistButtons`) | No — single write site, no read | Delete |
| `vmovelist` | `twoBoardCtrl.ts` (written/read by `movelist.ts`) | Yes — `updateMovelist` diffs against it explicitly to avoid resetting the movelist's scroll position | Relocate to a view-state holder owned by `movelist.ts` |
| `vdialog` | `roundCtrl.ts` | Yes — `renderDrawOffer`/`setDialog`/`clearDialog`/`renderRematchOffer` all diff against it | Relocate to a new round-view module |
| `gameControls` | `roundCtrl.ts` | Yes — the post-game button transition diffs against the constructor's initial render | Relocate to a new round-view module |

Beyond these fields, `roundCtrl.ts` has further inline `document.getElementById`/`patch()`/`h()` calls that don't use a stored field at all (chat rendering, extension-choice cleanup, abort-button cleanup, rematch-button insertion, online-status icon, player-bar/info-wrap orientation swap) — these are simpler "fire and forget" DOM writes, but still inline view code living in the controller file.

`twoBoardCtrl.ts` also has three free functions (`swap`, `switchBoards`, `initBoardSettings`) that directly manipulate the DOM (grid-area styles, node reordering) — not controller-class state, and out of scope for this change (see Non-Goals); they remain in `twoBoardCtrl.ts` unchanged.

## Goals / Non-Goals

**Goals:**
- No `VNode`/`HTMLElement`-typed fields remain on `AnalysisControllerBughouse`, `TwoBoardController`, or `RoundControllerBughouse`.
- No inline `document.*`/`patch()`/`h()` calls remain in any of the three controller files' class bodies.
- Load-bearing retained-vnode state (needed for snabbdom diffing) is preserved exactly — same diffing behavior, same avoidance of full-subtree recreation (e.g. movelist scroll position).
- Dead fields are deleted outright, not relocated.

**Non-Goals:**
- Not touching the `HTMLElement` constructor parameters (`el1`, `el1Pocket1`, etc.) used to mount chessground boards — these are structural handles passed in from the view layer, not view rendering performed by the controller.
- Not touching `roundCtrl.ts`'s `document.hidden`/`visibilitychange` listener — that's tab-focus/environment detection, not DOM content manipulation, and has no natural home in a "view" module.
- Not touching `twoBoardCtrl.ts`'s `swap`/`switchBoards`/`initBoardSettings` free functions — out of scope for this change; they stay where they are.
- Not changing any user-visible behavior — this is a pure structural move, same as the prior two DOM-extraction changes.
- Not redesigning the movelist/dialog/game-controls rendering logic itself — only relocating where its retained state lives and where its code is defined.

## Decisions

### Dead fields are deleted, not relocated
`vpgn` and `moveControls` are write-only: nothing in the codebase ever reads them back. Wrapping dead state in a "view-state class" for consistency would be over-engineering — they're simply removed, and their single `patch()` call site keeps working exactly as before, just without assigning the (unused) return value to anything.

### Load-bearing retained-vnode state moves into a dedicated view-state class per concern, owned by the module that already renders it
Two options were considered: a bare module-level variable (`let retained: VNode`) in the owning module, or a small class instantiated once per controller instance and held via a single non-DOM-typed member (mirroring the `EngineController`/`AnalysisTreeController` precedent from earlier changes). The class approach was chosen: a module-level variable would work today (there's exactly one live controller per page) but has no encapsulation boundary and doesn't match how the codebase already handles "a cohesive piece of state + behavior extracted from the controller" (engine, analysis tree). Concretely:
- `common/movelist.ts` gains a small class (e.g. `MovelistView`) holding the retained movelist vnode privately, with a method that performs the diffed patch. `TwoBoardController` holds one instance (non-`VNode`-typed) instead of the raw `vmovelist` field.
- A new module `client/two-board/round/roundControls.ts` gains a class, `RoundControlsView`, holding both `vdialog` and `gameControls`'s retained vnodes (they're both round-only, both dialog/button-adjacent), with methods for each dialog/button transition currently inlined in `roundCtrl.ts`. `RoundControllerBughouse` holds one `RoundControlsView` instance instead of the two raw fields, and calls the instance's methods instead of `document.*`/`patch()`/`h()` directly.

### The remaining ad-hoc `roundCtrl.ts` DOM code (no stored field) moves into the same new `roundControls.ts` module
Chat rendering, extension-choice cleanup, abort-button cleanup, rematch-button insertion, the online-status icon patch, and the player-bar/info-wrap orientation swap don't need the "retained vnode" treatment (they don't currently store state across calls), but they're still DOM-authoring code that doesn't belong inline in the controller. They become plain functions in `roundControls.ts` taking whatever state they need (not a full controller reference where avoidable), called from `roundCtrl.ts`.

### `swap`/`switchBoards`/`initBoardSettings` stay in `twoBoardCtrl.ts`
Out of scope for this change (explicit user decision): although these free functions do direct DOM manipulation, they aren't controller-class state, and relocating them is deferred. `twoBoardCtrl.ts` will still contain these three functions after this change; the "no DOM code in the controller files" goal applies to the controller classes' fields and methods, not to these pre-existing free functions.

## Risks / Trade-offs

[A jest suite stubs `vmovelist` directly on a plain object] → Update `tests/bugAnalysisNavigation.test.ts` to construct/stub `MovelistView` instead of a raw `vmovelist` field; verify jest still passes at 100% after the change (same count as before, no skipped tests). (`tests/analysisPageSmoke.test.ts` also has a `vmovelist` stub but targets the unrelated single-board stack — confirmed out of scope, left untouched.)

[Relocating `roundCtrl.ts`'s dialog/button code touches live-game code, higher risk than the analysis-only prior change] → No logic changes, only code motion; verify via the existing browser smoke harness (round page: draw/resign/rematch flows, game-controls buttons, chat, player-bar swap) in addition to typecheck/lint/jest, same verification bar as the prior DOM-extraction changes.

[`MovelistView`/`RoundControlsView` taking a reduced surface instead of the full controller] → Where a function genuinely only needs one or two pieces of controller state, pass those directly rather than threading the whole controller through, to avoid recreating the "reaches into everything" problem the extraction is trying to fix in the first place; where broader state is genuinely needed (e.g. the dialog callbacks calling back into `this.draw()`/`this.resign()`), the controller passes itself or bound callbacks as before — no new constraint is invented here beyond what the existing `pgn.ts`/`engine.ts`/`analysisTree.ts` extractions already do.

## Open Questions

None — scope and disposition of every touchpoint were confirmed against the actual code before writing this design.
