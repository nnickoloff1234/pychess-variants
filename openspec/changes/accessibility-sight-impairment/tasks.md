## 0. Status

**Opened 2026-09-26. UNBLOCKED the same day** — the user's three messages are in `user-report.md`,
quoted verbatim with the extraction. That file is the authority for this change and it overturned
four things the design had assumed; see its section 9.

**The gate is at 3.4**: a shortlist chosen on impact per unit of change, with everything else
deferred to a named successor rather than quietly carried. Nikolay: *"maximum impact with minimum
changes ... later we might think of a full solution, but for now we start with smaller steps."*

## 1. Learn, before deciding anything

- [x] 1.1 **DONE — `user-report.md`.** Three messages, quoted verbatim. Blind since birth, not a
      programmer, and the author of their own .NET variant-chess program built on **Fairy-Stockfish,
      the same engine pychess uses**, covering eight variants pychess already has.
- [x] 1.2 **DONE — and the floor is lower than expected.** *"on veb site there isn't even editor
      to enter the move using NVDA for windows or Talkback/jieshuo screen reader."* There is no move
      entry at all, confirmed in code. The site is not awkward for them, it is unplayable. Their
      full list of wants is `user-report.md` section 4, in their own ordering.
- [x] 1.3 **ANSWERED: NVDA on Windows is primary.** Named in all three messages; JAWS appears via
      their WinBoard 4.5 benchmark. **And Android is a named target we had not anticipated** —
      TalkBack and Jieshuo, both explicitly. Verify Jieshuo's focus-mode behaviour rather than
      assuming it matches TalkBack.
- [x] 1.4 **ANSWERED: the single-board round page, with POCKETS.** They name crazyhouse, shogi,
      shogun, seirawan, Capablanca, capahouse, grand and orda. **Bughouse is never mentioned once.**
      So section 6's deferral of bughouse is the user's own scoping, not our convenience — and
      pockets, which were on nobody's list, are in scope with a spatial model they specified
      exactly (`user-report.md` section 4).
- [x] 1.5 **Largely answered BY the user, better than reading would have.** The browse-mode /
      focus-mode distinction (`user-report.md` section 3) is the insight the design lacked and the
      one that decides the architecture: arrow-key board navigation cannot be a global key binding,
      because browse mode swallows the arrows before the page sees them. It needs a focusable
      widget the screen reader switches modes for.
- [x] 1.6 **A LIVE BUG FOUND BY APPLYING THAT INSIGHT.** `client/pocketHotkeys.ts` binds number keys
      1-9, 0, -, = through Mousetrap to select pocket pieces — global document bindings. Under a
      screen reader in browse mode, `1` means "jump to next heading", so **the pocket hotkeys are
      unreachable for exactly the users who most need keyboard input.** The feature exists and does
      not work for them.

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
- [ ] 2.5 **Test the Android path too**, since 1.3 made it a named target: TalkBack, and Jieshuo if
      it can be obtained. Mobile was not in anyone's plan and is in the user's.

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
- [ ] 3.3b **Weigh the user's own fallback against lichess's shape.** They pre-authorised the
      smaller scope: *"as alternative i propose you to make a table or another element, when the
      blind user can operate all the board."* A focusable table is both what they asked for and
      what the focus-mode mechanism needs. If lichess's answer is more than that, we may still take
      only this much — with their agreement already on record.
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

## 5b. Not code — for Nikolay to answer

- [ ] 5b.1 **They asked for a reply and deserve one.** *"Please, give me an answer on both
      proposals."* Two offers: their .NET project, and playing in the pychess Discord voice rooms.
- [ ] 5b.2 **The project offer is best taken as an interaction specification, not as source.**
      pychess is AGPL-3.0, so porting C# of unknown licence raises a question that using it as a
      design reference does not — and they suggest that use themselves: *"sooner like an example of
      keyboard navigation design."* `user-report.md` sections 3 and 4 are already most of it.

## 6. Explicitly deferred

Named here so they are visible rather than forgotten, and so 3.4 has somewhere to put things.

- **Bughouse — CONFIRMED OUT by the user**, who never mentions it across three messages while
  naming eight other variants. Two boards, four clocks and cross-board pockets are not the first
  step, and now that is their scoping rather than ours.
- **WCAG conformance as a programme.** Including the tolerated 2.5.8 target-size deviation on the
  portrait preset buttons, already recorded in the living spec by `portrait-preset-panel-and-flow`.
  This change is not that review, but it is where such items should start collecting.
- **Low-vision work** — magnification, contrast, high-contrast mode — unless 1.1 raises it.
- **Colour vision deficiency**, same condition.
- **chessgroundx's board DOM**, unless 3.3 concludes it is unavoidable.
