# Tasks

## 1. Decide

- [ ] 1.1 Pick one of the three ways out of direction one — clip, part-count `T`, or the per-part
      cascade inside zone A. Design recommends the cascade, with part-count `T` as the stopgap.
- [ ] 1.2 Answer whether zone A is preferred to zone B in general, or only for parts that gain
      nothing from zone B's extra width. The analysis page's move tree is the case to argue from:
      611px wide in zone B against 199px in zone A.
- [ ] 1.3 Decide where a collapsed zone A's height goes — to the boards, or to zone B.
- [ ] 1.4 Settle whether this is really a partner-board-size decision, since the band exists only
      because the partner's board is deliberately smaller.

## 2. Implement

- [ ] 2.1 Whatever 1.1 selects, keeping `toolsHome()` a pure function of the viewport — a part
      count may be an input, a measured height may not.
- [ ] 2.2 Collapse the zone A row where nothing is placed in it, on both pages.
- [ ] 2.3 Check the beside and below homes are untouched: this is a zone A change only.

## 3. Verify

- [ ] 3.1 Round page, short landscape, 682x503 — the 44px overflow is gone and every part in zone A
      is drawn at or above its minimum.
- [ ] 3.2 Analysis page, 629x830 — no empty 199x240 band beside the partner board.
- [ ] 3.3 Both pages at both directions' viewports, since the round page reaches one defect and the
      analysis page the other.
- [ ] 3.4 Sweep the zoom across the range on the round page and confirm no arrangement oscillates —
      a fit test is a new input to a decision that changes what it measures, which is the shape this
      capability forbids.
- [ ] 3.5 Frontend gates: `yarn typecheck`, `yarn test`.

## 4. Record

- [ ] 4.1 Fold the decision into `bughouse-round-layout`, replacing the acceptance criteria in this
      change's delta with the rule actually chosen.
