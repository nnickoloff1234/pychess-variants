## 0. Status

**Opened 2026-09-26 as a DISCUSSION, not a plan.** Nikolay: *"it is something we should first
discuss and see how easy it is to achieve in this particular case first, then we will think about
this approach in general about all our widgets, parts, and other components."*

Section 1 is that discussion, on one component. **Nothing below section 1 is to be started until it
has an answer**, and one legitimate answer is that the idea does not earn its cost — in which case
the portrait gauge is fixed in `squareUnit.ts` and this change is archived having said why.

## 1. Try it on stacks, and decide whether it holds

- [ ] 1.1 **What does a stack actually own?** List it before designing anything: its square, its
      files, whether it carries a gauge and what that costs (`GAUGE_SQUARES = 0.31`), its strips,
      its pockets, whether its username takes a line of its own. Some of these already live in
      `seatNamePlacement` and `squareUnit`; the list is the point, not the moving.
- [ ] 1.2 **Which of those does something OUTSIDE the stack currently compute?** `stackSquares()`
      and `stacksIncludeGauge()` in `squareUnit.ts` are the known two. Find the rest before
      deciding the shape — a Stack that owns half the answers is worse than one that owns none,
      because a reader cannot tell which half.
- [ ] 1.3 **`stacksIncludeGauge()` asks the DOM which PAGE it is on.** That is the tell: a stack
      cannot say whether it has a gauge, so the question is asked of the document instead. Decide
      whether a Stack is TOLD what it contains (constructed with its parts) or DISCOVERS it (reads
      its own children) — and note that the same question is `further-round-analysis-unification`
      1.3 about parts, so the two answers should agree.
- [ ] 1.4 **Where does the answer come out?** Two candidates, and they are not equivalent: the
      arrangement CALLS the stack and uses the number, or the stack PUBLISHES a custom property and
      CSS consumes it. The second is how most of this layout already works. The first is testable
      without a browser.
- [ ] 1.5 **Then judge it.** Does a Stack make the portrait omission impossible, or only unlikely?
      If the answer is "unlikely", say so — the existing helper was already well named, documented
      and measured, and it was still bypassed. Anything that only makes a mistake less likely is
      not worth a new abstraction; see [[no-abstraction-without-a-consumer]].

## 2. If it holds — build it for stacks only

- [ ] 2.1 A Stack that answers its own width in squares, with the gauge folded in.
- [ ] 2.2 `squareUnit.ts`'s five `stackSquares()` call sites go through it, and the portrait divisor
      becomes one of them rather than the exception.
- [ ] 2.3 Delete what the stylesheet was doing to compensate: `portrait.css`'s one-column stack and
      the board-label suppression, which exist only because the arithmetic was wrong.
- [ ] 2.4 Verify with the layout matrix, diffed by ROW SET. Expect portrait rows to move — the own
      board goes 384 to about 369.7 — and account for every one.

## 3. Only then — is it general?

- [ ] 3.1 Ask the same question of one more component before claiming a pattern. The seat strip is
      the best second case: `seatNamePlacement` already asks the grid a question a strip could
      answer about itself, and `rowsSpanned()` is the precedent that replaced two different box
      measurements with one.
- [ ] 3.2 If two hold, write the rule down as a requirement. If the second does not, record why —
      a pattern that fits one component is a fact about that component.

## 4. Not in this change

- **The portrait gauge decision itself** — `portrait-gauges-and-board-letters`, decided Option A on
  2026-09-26. If this discussion stalls, that change fixes the divisor directly and this one
  records that it did.
- **Parts and their declarations** — `further-round-analysis-unification`. Same story, different
  scale; the two should not invent different answers to "told or discovered".
- **The arrangement cascade, the homes, the drop logic.** Not in scope at any point.
