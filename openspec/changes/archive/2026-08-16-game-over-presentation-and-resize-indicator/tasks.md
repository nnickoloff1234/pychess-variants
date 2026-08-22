# Tasks

Ordered so the refactor lands first and gives the rest its test, then the one item that is
independent, then the two that share the same space and moment.

## 1. isGameOver()

- [x] 1.1 Add `isGameOver()` to `RoundControllerBughouse`, returning `status >= 0`, with a comment recording that `0` is ABORTED and anything above it a real result
- [x] 1.2 Replace the `this.status >= 0` and `this.status < 0` comparisons with it, including the negated form
- [x] 1.3 The `> 0` site became `hasResult()` rather than a commented comparison — see the design; a name is what stops the site being "tidied" into `isGameOver()`
- [x] 1.4 Check the `msg.status` and `status` parameter comparisons too: those test a value arriving from the server rather than the controller's own field, so they need the test applied to that value, not to `this.status`
- [x] 1.5 Note in the code that `finishedGame` asks the same question a second way, without removing it — the base controller maintains it too
- [x] 1.6 Confirm no behaviour change: `yarn typecheck`, `yarn test`

## 2. The resize handle where resizing does nothing

- [x] 2.1 Hide `cg-resize` for this page in the `max-height: 600px` landscape block, scoped so no other page is affected
- [x] 2.2 Put it next to the rule that sizes the boards from `--bug-sq`, with a comment saying these are the same fact: no zoom in the track, so no zoom handle
- [x] 2.3 Verify in p2/p3 that no handle is drawn and that the board's bottom-right corner has nothing draggable
- [x] 2.4 Verify in p1 that the handle is still there and still resizes
- [x] 2.5 Verify in p4 that portrait is unchanged (it never showed one — it is under the width threshold)
- [x] 2.6 Confirm the single-board round page still shows its handle

## 3. The end-of-game controls among the parts

- [x] 3.1 Add a container for them in `round.ts`, mounted inside `.bug-parts` as a sibling of the tab panels and the tab bar
- [x] 3.2 Give it the presets' grid area, and make `toolsPlacement` measure whichever of the two occupies it — only one is ever shown
- [x] 3.3 Lay its buttons out as wrapping flex items, so they sit side by side where there is room and stack where there is not
- [x] 3.3b Take no class from `site.css` — restate the six button declarations here rather than out-ranking `div.btn-controls.after`, which carried a grid area and a column flow with them
- [x] 3.4 Point `renderGameOverControls()` at the new container instead of `#game-controls`
- [x] 3.5 Point `insertRematchButton()` at the new container too — it currently finds `.btn-controls.after` by selector
- [x] 3.6 Leave `#game-controls` holding only Draw and Resign, and empty it when they no longer apply
- [ ] 3.7 Confirm the tab bar's row is unchanged in size when the game ends — needs the live transition; measured after the fact the bar is 32.2 / 31.9 / 27.7 across the three modes, but whether it *moves* at the moment the result arrives has not been seen

## 4. No presets after a result

- [x] 4.1 Hide both preset parts when the game is over, applied where the controller already handles a result
- [x] 4.2 Apply it on load too, so a page opened on a finished game never shows them
- [x] 4.3 Use `isGameOver()` rather than a second notion of doneness
- [x] 4.4 Confirm nothing is left behind — no empty band where they were

## 5. Gates

- [x] 5.1 `yarn typecheck`
- [x] 5.2 `yarn test`
- [x] 5.3 `yarn dev` and sync `static/` into the container

## 6. Live verification — needs a real game

Everything here needs a game that starts, is played, and then ends while the pages are open. The
last session had only a finished game, which is why several checks are still outstanding from the
previous change.

- [ ] 6.1 Bring up the harness and start a game per the usual routine
- [ ] 6.2 While the game is on: presets present, Draw and Resign in their strip, no end-of-game controls
- [ ] 6.3 End the game by resigning, and watch the moment: presets go, end-of-game controls appear among the parts
- [ ] 6.4 Confirm the end-of-game controls are not in the tab bar's strip, in all three modes
- [ ] 6.5 Confirm they sit side by side where there is room and stack where there is not
- [ ] 6.6 Confirm all three are clickable in all three modes
- [ ] 6.7 Watch what the layout does at the instant the result arrives — parts may drop as the presets free height
- [ ] 6.8 Carry over from the previous change: click probes after a board switch (its task 4.14), which needs a live game and is the highest-priority carried item
- [ ] 6.9 Carry over: `#offer-dialog` holding a real draw offer (its task 4.13)

## 7. Decisions to record before archiving

- [x] 7.1 They join the drop order, in the presets' place — decided 2026-08-16
- [x] 7.2 The space closes up and the chat grows by it — decided 2026-08-16
- [x] 7.3 They disappear; the strip keeps its height so the tab list does not move — decided 2026-08-16
- [x] 7.4 It got a name, `hasResult()`, against the design's initial position — recorded there with the reason

## Disposition at archive — 2026-08-16

All four items are implemented and verified in all three layout modes; gates green throughout
(typecheck, 41 suites / 226 tests). `static/site.css` is not modified, and after Nikolay pushed
back on the coupling, the end-of-game element takes no class from it either.

**Stage 6 is entirely unverified, and it is the honest gap.** Everything there needs a game that
starts, is played, and *ends* while the pages are open. What was verified is the neighbouring
case — a page opened on a game that had already finished — which exercises the same code path,
since the controller reaches its game-over handler either way. What has NOT been seen is the
transition itself:

- the presets vanishing and the buttons appearing in the same frame
- whether a part drops at that instant as the presets free height (`toolsPlacement` will recompute
  from its ResizeObserver, and at some zooms that will change the arrangement)
- **3.7**, whether the tab bar's row moves when Draw and Resign go. Measured after the fact the bar
  is 32.2 / 31.9 / 27.7 across the three modes, but a measurement after the fact cannot tell you
  whether it moved.

**Two items carried forward from `2026-08-16-two-column-landscape-and-full-height-boards`**, both
still needing the same live game, and both listed here as 6.8 and 6.9: click probes after a board
switch — the highest-priority one, since the boards now physically move between containers and
chessgroundx memoises hit-test bounds — and `#offer-dialog` holding a real draw offer.

**Where the implementation departed from the design, and why.**

*The `> 0` site got a name.* The design argued one caller does not earn a predicate. It lost:
a bare `> 0` among seven `>= 0` tests reads like an inconsistency, and the obvious tidy-up would
have started announcing the end of chat secrecy on aborted games. `hasResult()` is what stops that
edit from looking correct.

*The end-of-game element wears no shared class.* It briefly wore `btn-controls after` for the
button styling, which brought `grid-area: game-controls` — throwing it out of the merged column,
measured at x=1731 — and `flex-flow: column nowrap`. Six declarations restated locally were
cheaper than out-ranking a rule written for another page.

*Stacking is the default, not the fallback.* The spec above was corrected before archiving: it had
said the controls sit beside one another where there is room. Nikolay asked for the reverse — a
stack, with pairing only if the height will not hold three — which is the mirror of how the preset
sets behave. The gap above the topmost button came with that request.

**Not addressed, and still true:** the resize handle is hidden rather than not created, so in
short landscape the element and its listeners remain in the DOM with only its box gone. The real
asymmetry — a mode that ignores zoom while the shared rule keys on viewport width — is recorded in
a comment rather than removed.
