# Tasks

## 0. Status

**RUN 2026-09-26 on game `LwNKl7cM`** (bughouse 60+0, four windows, played to a real ending by an
accepted draw). All four observed; two produced findings that need changes of their own, recorded
under section 2.

**Carried out of `rematch-survives-cache-eviction` on 2026-09-12, unstarted.** That change needed a
long-lived finished game and so did these, which is the only reason they lived there. Nothing here is
a reported defect; each is a fact nobody has checked.

Requires the harness and a game played to a real ending, 60+0 so the clock is not what ends it.

## 1. The observations

- [x] 1.1 CLEAN ON BOTH BOARDS, IN BOTH MODES — the memoised bounds are NOT stale after a switch.

      **p1, tall landscape 1418x612.** Board A calibrated before the switch: e2 clicked, e2
      selected, offset `{dx:0, dy:0}`. The switch moved it from x=226 w=439 to x=677 w=219 — it
      changed grid container AND halved in size. After: e2→e2, a2→a2, h2→h2, every one at offset
      `{0,0}`, with the two corner probes 192px apart so a scale error could not hide between them.

      **p4, portrait 386x835.** Board B before: e2→e2. The switch moved it from y=403 w=384 to
      y=40 w=165 — 363px up and a 2.33x shrink, the harshest version of the move. After: e2→e2,
      a2→a2, offset `{0,0}`.

      **WHAT DOES DIFFER PER WINDOW IS THE CLICK SPACE, and that is the thing that will actually
      bite.** Measured by arming a `mousedown` listener and clicking a known point: p1 is 1:1
      (screenshot (100,100) → client (100,100)), p4 is **0.66667** (screenshot (50,50) → client
      (33,33)), because 386 CSS px are captured at 579. A coordinate from `PB.coords()` must be
      divided by that factor before it is given to the extension, and the factor is a fact about
      the window, not about the board. Measure it per window; do not carry it between them.

      Original description: Click probes after a BOARD SWITCH. The boards move between grid containers, and chessgroundx
      memoises its hit-test bounds — so the calibration that `PB.probe()` established before the
      switch may be wrong after it. Probe both boards after switching, rather than trusting the
      stored offset. The failure mode this guards against is a real move sent to the wrong square,
      which is how the seeded-offset mistake was found in August.

- [x] 1.2 **`#offer-dialog` DOES NOT EXIST ON THIS PAGE, and cannot hold anything.** The question
      is answered by the element being gone rather than by watching it.

      A real offer was made and reached the server — `{'type': 'draw', 'gameId': 'LwNKl7cM'}` in
      the log. No `#offer-dialog` was created in any of the four windows, before or after. What
      happens instead is a look on a control: the RECIPIENT's button becomes
      `button#draw.draw-offered`, background `rgb(98, 153, 36)`, title "Offer draw" → "Accept
      draw", in the same box.

      **IT DISPLACES NOTHING — measured, not assumed.** A change-triggered recorder sampling every
      120ms captured exactly one row, the baseline: no box of the dialog, the bar, either preset
      panel or the gameover element moved by a pixel.

      `#offer-dialog` belongs to the SINGLE-BOARD round page (`client/round.ts:64` and seven sites
      in `client/roundCtrl.ts`). `client/two-board/round/round.ts:278` records the removal: "The
      draw/rematch prompt used to be here, as `.bug-offer-dialog`". So the task was written against
      an element this page had already given up.

      Original description: `#offer-dialog` holding a REAL draw offer. It has been seen empty and seen with test
      content; what it does with an actual outstanding offer — its size, where it sits, whether it
      displaces anything — has not been watched.

- [x] 1.3 WATCHED AS IT HAPPENED, in three modes at once, by a recorder that samples every 120ms
      and keeps only the rows where the geometry changed.

      **IT IS ONE STEP. No window recorded an intermediate state** — two rows each, baseline and
      settled — so at 120ms resolution the reflow is atomic and there is no half-drawn frame to
      catch. That is the answer to "the interesting moment is the reflow": there isn't one.

      What moved, per window (baseline → settled):

      | | p1 tall landscape | p3 short landscape | p4 portrait |
      |---|---|---|---|
      | preset panel 1 | 54h → **0** | 119h → **0** | 81h → **0** |
      | preset panel 2 | 54h → **0** | 119h → **0** | 41h → **0** |
      | gameover | 54h → **128** | 119h → **128** | 81h → **128** |
      | tab bar y | 568 → 576 | 507 → 515 | 315 → 328 |
      | tab bar height | 40 → **32** | 40 → **32** | 40 → **28** |
      | drop classes | unchanged | unchanged | unchanged |

      **THE TAB BAR DOES MOVE, and it also shrinks** — 8px down and 8px shorter in both landscape
      modes, 13px down and 12px shorter in portrait. The presets are not removed: both panels stay
      in the DOM at height 0.

      **THE GAMEOVER BLOCK IS 128px TALL IN EVERY MODE**, at three different widths (515, 371, 219),
      because its three buttons — REMATCH, NEW OPPONENT, ANALYSIS BOARD — stack vertically in all
      of them. In portrait that is 128px in a 219px slot beside the partner board.

      **AND THE ARRANGEMENT DOES NOT RE-CASCADE.** Content heights change by up to 119px and the
      drop classes are identical before and after in all three windows. Nothing overflowed as a
      result: portrait's `scrollWidth` stayed 386 against an `innerWidth` of 386, `scrollHeight`
      835 against 835, the app's bottom exactly at 835, and both boards unchanged at 384 and 165.

      Original description: The GAME-OVER TRANSITION watched as it happens, not inspected afterwards: the presets
      vanishing, the rematch and analysis buttons appearing, and whether the tab bar moves when they
      do. The interesting moment is the reflow, and it is over before a post-hoc probe can see it.

- [x] 1.4 **THE FURNITURE FOLLOWS THE SEAT AND TRAVELS WITH THE BOARD. Clocks and pockets scale;
      usernames do not.**

      p1 after the switch: board A, now 219px, sits in `.bug-partner-stack` carrying
      Test–QueenAiWok (the viewer, A-white) with the running 47:42 and Test–ShogiKnightQuee with
      60:00 — the right two players, correctly paired with their own clocks. Board B, now 439px,
      sits in `.bug-own-stack` with the other pair. Invariant held across the switch:
      `aw+ab = bw+bb = 6462`.

      **SCALING, measured at the two square units in one window:** clock font 26.12px at a 219px
      board against 33.75px at 439px; pocket height 28px against 56px. Both follow the board.

      **THE USERNAME DOES NOT.** `a.user-link` computes 16.35px beside a 165px board and 16.80px
      beside a 384px board in p4 — 2.7% for a board 2.33x larger. Beside the small board the name's
      own box is 188px wide against a 165px board, wider than the board it belongs to. Nothing
      overflows the viewport, and `partner-name-outside` is on the app, so this is likely the seat
      name placement doing its job rather than a fault — but it means "the furniture scales with
      the board" is true of clocks and pockets and false of names.

      **A NAMING OBSERVATION worth having before someone trusts the class:** after a switch,
      `.bug-own-stack` holds the board the viewer is NOT playing on. The classes are positional —
      which stack is drawn large — not possessive.

      Original description: BOARD SWITCH WITH THE FURNITURE SCALED, confirming the seat furniture follows the ROLE and
      not the board — the clocks, names and pockets should stay with the player they belong to when
      the boards trade places, at whatever square unit each board is using.

## 2. Verify

- [x] 2.1 Recorded above with the measurements. Two things came out of it that are not observations
      and need changes of their own, plus one harness note. **None was fixed here.**

      - **THE PLAYER WHO OFFERS A DRAW IS TOLD NOTHING.** `round.ts` says "An offer is now a look on
        the control that made it — the draw button turns green to be accepted". Measured, the green
        and the "Accept draw" title appear on the RECIPIENT's control; the offerer's button keeps
        `title="Offer draw"` and an empty class, so there is no indication an offer is outstanding
        and nothing to cancel it with. Either the comment describes an intent the code does not
        carry out, or the offerer's feedback was lost with `.bug-offer-dialog`. **Needs its own
        change**; it is a behaviour question, not a layout one.
      - **THE ARRANGEMENT DOES NOT RE-CASCADE ON GAME OVER.** Content heights move by up to 119px
        and the drop classes do not change in any of the three modes. Nothing was wrong on screen,
        so this is a question and not yet a defect: either the cascade ran and reached the same
        answer, or nothing re-triggered it. Worth settling in `idempotent-layout-pass`, which owns
        what a pass may read and when one runs.
      - **HARNESS NOTE.** A calibration click at a coordinate chosen to be "off the board" landed on
        a preset button and sent a message to the game chat — visible in the log as
        `BugRoundChatIn(... message='!bug!non' ...)`. Preset buttons are live targets during
        calibration. Click somewhere provably inert, or accept that the chat will carry a stray.
