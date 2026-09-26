## 0. Status

**Opened 2026-09-26. BLOCKED ON INPUT at 1.1** — a blind user's own messages, which Nikolay is
pasting. Nothing below section 1 is ranked until those are read, and the ranking is the point.

**The gate is at 3.4**: a shortlist chosen on impact per unit of change, with everything else
deferred to a named successor rather than quietly carried. Nikolay: *"maximum impact with minimum
changes ... later we might think of a full solution, but for now we start with smaller steps."*

## 1. Learn, before deciding anything

- [ ] 1.1 **THE USER'S MESSAGES. Blocking.** Read them for two things specifically: **which
      assistive tools** they use (screen reader and version, browser, OS, braille display), and
      **which needs they emphasise** in their own ordering. Record both verbatim in this change —
      paraphrase loses the emphasis, and the emphasis is the data.
- [ ] 1.2 Extract from them a list of concrete failures, each tied to a page and an action. "The
      site is hard to use" is not actionable; "I cannot tell when my opponent has moved" is.
- [ ] 1.3 **Answer design Decision 2 from 1.1**: name the assistive stack this change is tested
      against. Default NVDA + Firefox if the messages do not say.
- [ ] 1.4 Answer the design's open question of **which page is the target** — the single-board
      round page or the bughouse two-board one. Different codepaths, different impact. The site's
      normal game is single-board; this project's recent work is not.
- [ ] 1.5 General reading on the topic, enough to rank rather than to become expert. The design's
      taxonomy is the starting point and should be corrected where it is wrong.

## 2. Establish the baseline, with the named tool

- [ ] 2.1 Install and drive the stack chosen in 1.3. **An improvement not heard is not verified**,
      and this is the step that makes every later claim checkable.
- [ ] 2.2 Walk the target page as a non-visual user would: land on it, find the board, find whose
      turn it is, find the clock, find the last move, make a move. Record where it fails and at
      which step it becomes impossible.
- [ ] 2.3 Confirm or correct the survey in the proposal: no `aria-live` on any game page, `<move>`
      with no role or focus, no keyboard move entry, no non-visual mode anywhere.
- [ ] 2.4 Note what already works. The chrome has real ARIA — 37 labels in templates, 61 in client,
      `aria-selected` tabs, `role="dialog"` modals. **Do not rebuild what works**; that is where
      the "minimum change" budget gets wasted.

## 3. The reference, then the shortlist

- [ ] 3.1 **Browse lichess.** Method undecided and cheapest-first: `wget` the HTML and read it, or
      Nikolay saves pages from Firefox where he is logged in, or Chrome automation as a last resort
      because it is token-expensive. The pages that matter are a live game, an analysis board, and
      the accessibility preferences.
- [ ] 3.2 Answer the design's five lichess questions from what is actually there, not from memory:
      is it a separate non-visual module or ARIA on the visual page; is there keyboard move entry
      and is it available to everyone; is there a text board; how are moves announced and phrased;
      where does the preference live.
- [ ] 3.3 **Decide the structural question: overlay module or annotate-in-place** (design's most
      consequential copy-or-reject). It determines whether this work collides with the layout
      changes in flight, so it is decided before anything is written.
- [ ] 3.4 **THE GATE — write the shortlist.** Each item: what it does, for whom, the size of the
      change, and whether it came from the user's messages. Everything not on it goes to a named
      successor change with the reason. **Short is the goal, not coverage.**
- [ ] 3.5 Write the spec delta for the shortlist only, and only then. The capability is unnamed
      until this point on purpose — see the proposal.

## 4. Build the shortlist

- [ ] 4.1 To be filled from 3.4. Left empty deliberately: an implementation plan written before the
      user's messages have been read would be the exact mistake design Decision 1 exists to prevent.

## 5. Verify

- [ ] 5.1 Every shortlist item heard working with the stack named in 1.3, not merely inspected in
      the DOM or checked by a linter.
- [ ] 5.2 Re-run 2.2's walk end to end and record where it now succeeds or still fails. **Say
      plainly what is still impossible** — a partial fix described as a fix is worse than none,
      because it stops anyone looking again.
- [ ] 5.3 Nothing regresses for sighted users: `yarn lint`, `yarn typecheck`, `yarn md`,
      `yarn test`, plus a layout matrix run diffed by ROW SET if any markup that the stylesheets
      select on has changed.
- [ ] 5.4 Offer it back to the user who wrote in, if Nikolay is willing to ask. They are the only
      real acceptance test.

## 6. Explicitly deferred

Named here so they are visible rather than forgotten, and so 3.4 has somewhere to put things.

- **Full non-visual play, bughouse included.** Two boards, four clocks and pockets are harder than
  standard chess and are not the first step.
- **WCAG conformance as a programme.** Including the tolerated 2.5.8 target-size deviation on the
  portrait preset buttons, already recorded in the living spec by `portrait-preset-panel-and-flow`.
  This change is not that review, but it is where such items should start collecting.
- **Low-vision work** — magnification, contrast, high-contrast mode — unless 1.1 raises it.
- **Colour vision deficiency**, same condition.
- **chessgroundx's board DOM**, unless 3.3 concludes it is unavoidable.
