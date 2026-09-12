# Tasks

## 0. Status

**Carried out of `rematch-survives-cache-eviction` on 2026-09-12, unstarted.** That change needed a
long-lived finished game and so did these, which is the only reason they lived there. Nothing here is
a reported defect; each is a fact nobody has checked.

Requires the harness and a game played to a real ending, 60+0 so the clock is not what ends it.

## 1. The observations

- [ ] 1.1 Click probes after a BOARD SWITCH. The boards move between grid containers, and chessgroundx
      memoises its hit-test bounds — so the calibration that `PB.probe()` established before the
      switch may be wrong after it. Probe both boards after switching, rather than trusting the
      stored offset. The failure mode this guards against is a real move sent to the wrong square,
      which is how the seeded-offset mistake was found in August.

- [ ] 1.2 `#offer-dialog` holding a REAL draw offer. It has been seen empty and seen with test
      content; what it does with an actual outstanding offer — its size, where it sits, whether it
      displaces anything — has not been watched.

- [ ] 1.3 The GAME-OVER TRANSITION watched as it happens, not inspected afterwards: the presets
      vanishing, the rematch and analysis buttons appearing, and whether the tab bar moves when they
      do. The interesting moment is the reflow, and it is over before a post-hoc probe can see it.

- [ ] 1.4 BOARD SWITCH WITH THE FURNITURE SCALED, confirming the seat furniture follows the ROLE and
      not the board — the clocks, names and pockets should stay with the player they belong to when
      the boards trade places, at whatever square unit each board is using.

## 2. Verify

- [ ] 2.1 Whatever is found, record it here with the measurement — and if it is a defect, give it its
      own change rather than fixing it inside this one. This change is a looking exercise; a finding
      deserves a proposal that can be read on its own.
