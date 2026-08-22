# Tasks

Carried out of `board-is-measured-once-at-load`, which established the rule and made portrait
conform. Everything here is the same rule applied where it does not hold yet.

**The rule, since every task below is judged against it:** a board is rendered once, at load, with
its exact bounds; `document.body` is the only element that may be observed; an explicit user zoom or
resize is the only thing that redraws a board. Adding an observer is not an available means.

**The symptom to keep in view:** none of this is about slack inside a wrap, which nobody would
notice. It is that the pockets stop lining up with the board — the pocket is laid out from the
container's left edge and chessgroundx pins the board to its right, so the whole remainder opens
between them.

## 1. A zoomed track is an exact track

- [x] 1.1 Reproduce the defect as a number first: p1 tall landscape, both board tracks 486.39 against a board of 480, 6.39px of slack on the left at the default zoom. Unit 76 x zoom 0.8 = 60.8 device pixels per square, floored to 60. VERIFIED FIXED: track 488, board 488, misalignment 0 on both boards
- [x] 1.2 Apply the zoom scale before quantising rather than after — `calc(var(--bug-tall-sq) * 8 * var(--board-scaleA))` floors a unit and then multiplies it, which un-floors it
- [x] 1.3 Prefer publishing the scaled unit from `squareUnit.ts`, so the quantisation rule keeps one home; record why if CSS `round(down, ...)` is chosen instead — note it cannot see `devicePixelRatio`, which the rule needs
- [x] 1.4 Republish the scaled unit when the zoom slider moves, since the unit now has a second input; confirm there is exactly one writer
- [x] 1.5 `--bug-seat-sq` at `:1243` and `:1246` is the same `unit x scale` expression one square wide — give it the same treatment rather than leaving a second copy of the defect behind
- [x] 1.6 Confirm the track equals the board at several zooms, not only the default. Swept six zooms on p1 (100, 90.8, 79.8, 60.2, 40.5, 25.1): track == wrap == board and misalignment 0 at every one. The same sweep also showed the snapshot taken synchronously after the slider event already equals the snapshot two frames later, which is 5.3's answer measured
- [x] 1.7 Confirm both tall landscape boards are covered — both exact on p1, 488 track against a 488 board
- [x] 1.8 **Does the partner track follow role or identity?** MEASURED — identity, and it crosses. See 9.2, which carries the numbers and the fix. It reads `--board-scaleB`, which is board B by identity, while the position it sizes is a role — a player seated on board B has board A as their partner. Seat a player on board B, zoom each board, and record which one the track follows. Four defects on this page have already come from using identity where role was meant, so this is a measurement, not an assumption. Raised while proposing a zoom cap that has since been dropped; the question outlives it because this change edits that expression

## 2. Portrait's own board gets the width it was already told to have

- [x] 2.1 Fix the unterminated comment at `static/bughouse.css:606`: it closes and then continues for seven more lines to a second `*/`, so `Keyed by ROLE ... */ .own-board` parses as one invalid selector and the `.own-board` width and height are discarded. Present at HEAD, not a working-tree artefact. Confirm in the browser that the rule applies afterwards rather than trusting the read
- [x] 2.2 Check what else that stray block swallowed, and sweep the file for any other unbalanced comment — the same mistake elsewhere would be equally silent
- [x] 2.3 Make `selection` a block. As an inline box its `width` and `margin-inline: auto` are both inert, which is why it measures 386 around a 384 board; this is the same trap already documented on `.cg-wrap.pocket` in this file
- [x] 2.4 Restore the height alongside the width — it was inert on an inline box and stops being inert here
- [x] 2.5 Put the quantised width on the smallest box containing every part that must share the edge, and centre THAT. Landed on `.round-app.bug`, not the stack: the partner column is a sibling of the own stack, so a centred stack would step 1px right of the partner board above it. Block alone leaves 1px; this is what closes it to 0
- [x] 2.6 Confirm the seat strips are unaffected by moving the width up a level. Measured on p4: both own strips 48px tall, both partner strips 36.63px, pockets flush at the shared left edge
- [x] 2.7 Measure the misalignment as 0 in portrait, not merely "looks right". p4 386x835: app 384 centred at x=1, own board 384 and partner board 165.33 BOTH with their first file at x=1, misalignment 0 on all four pockets

## 3. State the rule where tracks are written

- [x] 3.1 Audit every track that sizes a board across the three modes. BEFORE, three of six exact: desktop own+partner 486.39/480, short landscape both 437.33/437.33, portrait own 386/384, portrait partner 165.33/165.33. AFTER, six of six: desktop 488/488 both, short landscape 437.33/437.33 both, portrait 384/384 and 165.33/165.33. Holds at dpr 1 (p1) and dpr 1.5 (p3, p4) — see 9.1 for the fractional-dpr case
- [x] 3.2 Put the rule in a comment at the point where board tracks are defined, so the next unquantised track contradicts something visible while it is being written
- [x] 3.3 Say explicitly that multiplying a published unit is what breaks it, since that is the mistake that was actually made — and that the loss is bounded by `8 / dpr`, so it is not a rounding error but a whole square's worth
- [x] 3.4 Say that the box the width is written on must be one a width applies to, since that is the other mistake that was actually made

## 4. Nothing resizes during load

- [x] 4.1 Name the element: instrumented a same-origin 386x835 iframe load from p4, polling `main`, `.round-app`, the selection and `cg-board` every 20ms for 3s
- [x] 4.2 Re-check after section 2 lands. GONE — all four elements appear at 384 and never change across 125 samples. The 386 was the inline selection's shrink-to-fit width, exactly as decision 3 predicted
- [x] 4.3 If it survives, decide whether it comes from this page or the site shell — it did not survive, so there is nothing to attribute
- [x] 4.4 Confirm no board's container moves during load — the selection and the board hold one width from first appearance

## 5. Redraw because the user acted, not because a timer fired

- [x] 5.1 `ZoomSettings.update()` re-measures under `setTimeout(..., 100)`, waiting for a CSS variable write to reach layout
- [x] 5.2 Order the redraw against the style change instead of guessing at a delay
- [x] 5.3 Check whether the re-measure is needed at all once tracks are quantised: if the track follows the same scaled unit, the post-write width is knowable without measuring — the module that publishes the unit already knows it
- [x] 5.4 Confirm zoom and window resize remain the only two paths that redraw a board. Audited every `updateBounds`/`renderResized`/`redrawAll` call site: on this page they are the zoom path, the resize republish, and explicit user actions (board switch, piece-style change). NOTE: toolsPlacement, partsWidth and seatNamePlacement each hold a ResizeObserver on non-body elements. None redraws a board, so 5.4 holds — but the rule as stated at the top of this file says body is the only element that may be observed. Flagged, not touched: those modules are outside this change

## 6. The page is not taller than the viewport

- [x] 6.1 Portrait is ~8px taller than the viewport, from site.css's `body { margin: 0 0 2vmin }` — clipped rather than scrolled, since every mode sets `overflow: hidden` on this page's body
- [x] 6.2 Neutralise it from `bughouse.css`, scoped to the round page — site.css is not to be touched
- [x] 6.3 Confirm the bottom strip is fully visible afterwards, names included. p4: `body` margin-bottom computes 0px, scrollHeight == clientHeight, and the bottom own-seat strip runs to exactly the viewport edge with its name intact

## 7. Gates

- [x] 7.1 `yarn typecheck` and `yarn test`
- [x] 7.2 Sync `static/` into the container and hard reload. The mount had the new bytes already (md5 matched host and container) but Chrome was serving a 109KB cached stylesheet against the 122KB the server had — the unversioned-CSS trap. Ctrl+Shift+R on all four; every measurement above is post-reload
- [x] 7.3 Verify in all three modes, on fresh loads. p1 tall landscape 1914x827 dpr 1, p3 short landscape 1276x551 dpr 1.5, p4 portrait 386x835 dpr 1.5 — all exact
- [x] 7.4 Measure pocket-to-board misalignment in all six board slots, at more than one zoom in tall landscape. Not 0 but below one device pixel everywhere, which is what 9.1 established is reachable: 0.031px on p1 (dpr 1, all 77 zoom steps), 0.042px on p3 and p4 (dpr 1.5), 0.039px worst case on p2 at dpr 1.2000000476837158 across all 77 steps. Was 6.39px on desktop and 2px in portrait

## 8. Kept from the previous change

- [x] 8.1 Review the deleted `boardBounds.ts` guard before anything is pushed to master. CLOSED, and the reminder is discharged into a rule: **no guard-based termination, ever.** Not a better guard keyed on the input — no guard. A guard is a device for stopping a loop, and a sizing calculation must not sit in a potential loop of any sort in the first place; if one needs a guard to terminate, the shape is already wrong. The module itself has been gone since `board-is-measured-once-at-load` and never reached git, so nothing is outstanding in code. Note also that the original landscape evidence — the board permanently narrower than its wrap, so the comparison never engaged — no longer holds: after this change the board fills its wrap to within 0.04px everywhere, which would make such a guard engage in every mode. That does not rescue it; it is the same shape either way

## 9. Found while verifying — both need a decision before this change is done

- [x] 9.1 **Exactness does not hold at a fractional device pixel ratio.** FIXED, by biasing the published unit and then snapping to the layout grid. Grid snapping ALONE was not enough — it leaves a margin in [0, 1/512) where strictly more than 1/512 is needed, and measurement confirmed it: 23 of 77 zoom steps still lost 6.67px. With the added 1/256 margin, all 77 steps are within 0.039px. Original finding: Forced p2 into tall landscape at dpr 1.2000000476837158 and, on a clean load at the default zoom, the track measures 453.33 against a 446.67 board — 6.67px, the same symptom this change removes everywhere else. The unit itself is right (`unit x dpr` is exactly 68). The loss is in the CSS round trip: `8 x unit` = 453.3333153 is not representable on Blink's 1/64px layout grid, so the used width lands a hair below and chessgroundx's floor drops a whole device pixel per square. Exactness is unreachable at such a dpr — `512 x N / dpr` is never an integer — so the choice is between the current up-to-8px error and a deliberate upward bias of at most 1/8px. Not implemented: it changes what "exactly" can mean in the requirement
- [x] 9.2 **The zoom slider is keyed by board identity, the tracks by column — 1.8, measured.** FIXED per your call: slider `a` means the board on your left. `ZoomSettings.update()` now resolves the board through the role classes markRoles() writes, falling back to identity where no roles are marked (the analysis page). Verified on the board-B viewer: slider `a` takes the own board 466.67 -> 220 and leaves the partner at 460; slider `b` moves only the partner, 460 -> 340. Original finding: Seated a board-B viewer (p2) in tall landscape and moved slider `a`: the LEFT column's track went 453 -> 226 while the board inside it stayed at 446.67, because `ZoomSettings.update()` picks the chessground state by `boardName` (identity) while the track it just resized belongs to the column (role). Slider `b` then redrew that same left board, against the other slider's track. For a board-A viewer the two coincide, which is why this has never shown. Pre-existing — the old `--board-scaleA/B` tracks were keyed by column too — but this change edits exactly that expression, and a board left with stale bounds mis-resolves every click. The fix direction is a product decision: does slider `a` mean "board A" or "the board on your left"?
