# Tasks

Exploratory: internal coordinates have to be judged on screen, not from the CSS. The placement is
already parameterised, so the work is legibility and deciding which modes get it — and then taking
back the width that outside labels were costing.

## 1. Coordinates inside the squares — establish what it costs

- [x] 1.1 Before state captured: labels overhang right 15px and bottom 16px in both landscape modes; hidden outright in portrait. The gutter is `column-gap: 15px` in short landscape. In tall landscape the 15px reach exceeds the 13.8px gap, so the labels already painted **1.2px onto the partner board**
- [x] 1.2 Placement set on the round page's wraps only (`--ranks-right`/`--files-bottom` to 0), not at `:root`
- [x] 1.3 Judged on screen in all three, and the tall landscape collision is gone: label reach 15 -> 0, clearance -1.2 -> 13.8
- [x] 1.4 Files sit in the bottom-left corner of their square; ranks stay against the right edge. Nikolay's call
- [x] 1.5 Legibility solved the way Nikolay specified — a label carries the OTHER square's colour, no outline or shadow:
  - `client/boardColors.ts` holds the two square colours per theme, extracted from the theme's own image: `fill` attributes for the SVG themes, and the mean of a patch at two adjacent square centres for the photographic ones, which have no flat colour. Ordered light-first by luminance, because `8x8ic` and `8x8purple` declare the darker colour first
  - published as `--cg-light`/`--cg-dark` beside `--board-image` in `setBoardStyle`, so they change with the theme or not at all
  - the parity selectors mirror chessgroundx's own `forward`/`backward` rules rather than re-deriving the direction. Screen parity is orientation-independent on an 8x8 board — flipping maps (f,r) to (9-f,9-r) and 18 minus a number keeps its parity — so only DOM direction matters
  - font size is `0.3` of the board's own square, paired identity-to-identity (`#mainboard` with `--cg-width-a`) so a board switch cannot mismatch them
- [x] 1.6 Verified from geometry rather than by eye: for every label, compute which square it overlays and check it carries the opposite colour. **0 wrong of 32 in p3** (covering both orientations, since its own board is black-oriented and its partner white-oriented), 0 in p1, 0 in p4

## 2. Do NOT reclaim the gutters — decided

Nikolay: the gutters are wanted for their own sake, not only as room for labels.

- [x] 2.1 The gutters stay in every mode. Measured after the change: short landscape still `column-gap: 15px`, tracks `437.333px 819.667px`, parts column back to 382.3
- [x] 2.2 Recorded for the future, since it was measured while exploring: zeroing the short landscape gutter would have given the tools column 15px and grown the preset buttons 45.9 -> 47.7. Not taken
- [x] 2.3 Tall landscape keeps its 2vmin gap, which the labels no longer intrude on

## 2b. Mobile only — the desktop keeps what it had

- [x] 2b.1 The whole block sits inside `@media (orientation: portrait), (max-height: 600px) and (orientation: landscape)`, so it applies to portrait and short landscape and to nothing else. Nikolay's call: internal coordinates buy room on a small screen, they are not a change of house style
- [x] 2b.2 Desktop verified back to exactly what it had — overhang 15 right and 16 bottom, `rgb(186,186,186)`, 11.9px, centred alignment
- [x] 2b.3 Both mobile modes verified still internal after the scoping: p1 overhang 0, 0 colour mismatches, files left-aligned, gutter still 15px; p4 overhang 0, 0 mismatches, coordinates visible

## 3. Coordinates on a phone

- [x] 3.1 Overridden for this page rather than removed globally — `.round-app.bug .cg-wrap coords { display: flex }` beats `.cg-wrap coords` on specificity, so other pages keep the old behaviour until someone chooses otherwise. Portrait now shows coordinates: own board 48px squares, labels 14.4px
- [ ] 3.2 **Open, and it is a judgement rather than a measurement.** Portrait's partner board is 20.7px per square, which puts its labels at 6.2px — drawn correctly, too small to read. A size threshold below which they hide is wanted, stated as a size rather than as a device. Left for Nikolay's eye; nothing is broken while it is undecided
- [x] 3.3 On a 48px square the label sits in the corner and pieces draw over it, which is chessgroundx's own z-order — a label is never hidden by an empty square and is partly covered on an occupied one, the same behaviour as every board that draws coordinates inside

## 4. Verify

- [x] 4.1 All three modes on fresh loads: 0 colour mismatches, 0 overhang, no shadow, no page overflow. Fonts 16.4px (p1), 15px (p3), 14.4px (p4 own board)
- [x] 4.2 A board switch cannot affect this, by construction rather than by test: the parity rules key on chessgroundx's own `forward`/`backward` classes and not on role, and the font size pairs `#mainboard` with `--cg-width-a` — identity with identity — so moving an element between containers carries its measurement with it. Verified live on p3, whose own board is black-oriented and partner white-oriented: 0 mismatches across both
- [x] 4.3 No page overflow in any mode
- [x] 4.5 Maintainability of the theme table, since it is the thing most likely to rot: `boardColors.ts` documents how to derive a new theme's pair — the regex for flat SVGs, the patch-mean for photographs, and the luminance ordering with the warning that file order lies for `8x8ic` and `8x8purple`. Adding a theme is one line keyed by the same filename that goes in `boardCSS`
- [x] 4.4 Analysis checked on the page itself, at two window widths: coordinates keep the site defaults — `rgb(186,186,186)`, centred, 10.3px and 11.9px — and `roundAppPresent: false`, so none of these rules can match. `--cg-light`/`--cg-dark` are published there too, since `setBoardStyle` runs everywhere, and nothing reads them. Embed follows the same argument: every rule added here is prefixed `.round-app.bug`

## 5. Gates

- [x] 5.1 `yarn typecheck` clean, `yarn test` 226 passed
- [x] 5.2 Synced and hard reloaded all three windows
