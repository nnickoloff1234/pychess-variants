# Tasks

**The measured baseline, desktop 1914x827, `.clock-wrap` 183.03 x 62.** One ratio today, 3.5, so the
font is 52.29 in every state. `60:00` measures 2.56 and `00:09.9` measures 3.40; bounded for the
narrow form alone the font would be 57.04, where the height term takes over. The 4.75px between them
is what this change recovers for the 99% of a game that is not the last ten seconds.

Portrait and short landscape cannot change: the height binds in both states there — 26.39 and 19.92
against width terms of 54.86 and 23.63 in portrait, 32.52 against 62.48 in short landscape.

**The rule these are judged against:** the bound follows the form on screen, and it learns the form
from a class the clock already sets. Nothing measures text.

## 1. Confirm the signal before building on it

- [x] 1.1 Confirmed at `client/clock.ts:210` and `:228` — `millis < HURRY && this.byoyomiPeriod === 0` and `time < HURRY && this.byoyomiPeriod === 0`, HURRY = 10000. Same constant, same guard
- [x] 1.2 `hurry` is on `div.clock`, which is what the font rule targets. `.round-app.bug .clock.hurry` is four classes against three, so it wins by specificity and does not depend on source order
- [x] 1.3 Confirm `.clock-wrap` keeps `container-type: size`. That containment is why a font derived from the box can never change the box, in either state, and it is what makes two states safe rather than two chances to oscillate

## 2. Two ratios

- [x] 2.1 Done. The ratio moved from `.clock-wrap` onto `.clock`, where the class lives, with the forms named beside each value
- [x] 2.2 Keep the headroom on the same side as the existing constant — above the measurement, so an inexact ratio costs size rather than fit
- [x] 2.3 Rewrite the comment that argues for a single ratio. It currently states that the clock is bounded for the widest form at all times, and says why; that reasoning is what this change replaces and it must not be left standing next to the new rule
- [x] 2.4 Re-measured on all four seats after a server restart and a fresh game: 2.56 narrow, 3.40 wide, unchanged from the earlier session

## 3. Verify both states fit, everywhere

- [x] 3.1 Ordinary form fits everywhere, and grew by exactly 4.75px (52.29 -> 57.04) on the two seats where the width binds
- [x] 3.2 Tenths fits on every seat in every mode — 177.56 of 183.03 and 158.36 of 210.03 on the desktop, 89.61 of 192.02 and 67.66 of 82.69 in portrait, 110.43 of 218.69 in short landscape
- [x] 3.3 Confirmed on the desktop partner seats: 57.04 ordinary, 52.29 tenths. The desktop OWN seats are height-bound at 46.63 in both states and do not change — which seat is width-bound depends on the strip, not on the mode, so 'the desktop changes' is true of seats rather than of the whole mode
- [x] 3.4 Unchanged: portrait 26.39 and 19.92, short landscape 32.52, each equal to its height term in BOTH states
- [x] 3.5 Drive the transition by toggling the `hurry` class directly as well as by injecting the text, so the class and the text are seen to agree

## 4. What moves with the font

- [x] 4.1 Badge outside in the ordinary state (overlap 0, room 37.23) and retreating under tenths (overlap 15.97, room 5.47) on the width-bound seats
- [x] 4.2 Nothing reflows. Strip height and width, stack height, board width, wrap box, name width and name top are all identical across the transition — only the font changes
- [x] 4.3 Reversible and exact: toggling back returns every measured value to the ordinary state byte-for-byte, font included

## 5. Judge it

- [x] 5.1 Captured in both themes by flipping `[data-theme]` on the body. The background change dominates the moment and the 8% size drop reads as part of it; comparison saved to ~/clock-two-ratios-themes.png for the final call
- [x] 5.2 **Accepted by Nikolay on 2026-08-22**, on the both-themes comparison, by archiving the change rather than reverting it. The transition stays. Were it ever to be reconsidered, the revert is one line — set `.clock`'s ratio to 3.5 and delete the `.hurry` rule — and the spec change comes out with it

## 6. Gates and records

- [x] 6.1 `yarn typecheck` and `yarn test`
- [x] 6.2 Synced and hard-reloaded all four. NOTE: the docker `server` container had died at some point during the session — only caddy was up — so this needed `docker compose up -d server` and a fresh game before anything could be verified
- [x] 6.3 Rewritten. It now states the two-ratio rule, keeps the two things that must not be undone (never collapse to one ratio, never measure text) and records that a size change at the ten-second mark is correct rather than a bug
