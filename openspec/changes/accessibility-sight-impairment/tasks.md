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
- [x] 2.4b **The "stacked layout with menus expanded" question is ANSWERED: do not copy it.**
      `candidates.md` H. The DOM is identical in both lichess modes, so it is purely CSS; copying it
      would mean writing `body.blind-mode` overrides per component to undo our own styling, to buy
      nothing — and always-expanded menus are arguably worse, since a screen reader user would hear
      ~35 nav links before reaching the game on every page.

      **And the legitimate concern underneath is already satisfied.** `.login-dropdown-menu` hides
      with `visibility: hidden` (which does remove it from the accessibility tree) but pairs it with
      `aria-haspopup`, `aria-expanded`, `role="menu"`/`role="menuitem"`, and `main.ts` really does
      toggle `aria-expanded` (lines 448, 460, 473, 487). Same in `profileActionOverflow.ts:16` and
      `tournamentForm.ts:163`. That is the correct pattern; revealing everything is not.
- [ ] 2.4c **Audit the collapsibles we have NOT checked.** Three are confirmed correct; every other
      menu, modal, accordion and overflow on the site is unverified. This is the useful version of
      2.4b's question and belongs with candidate G.
- [ ] 2.5 **Test the Android path too**, since 1.3 made it a named target: TalkBack, and Jieshuo if
      it can be obtained. Mobile was not in anyone's plan and is in the user's.

## 3. The reference, then the shortlist

- [x] 3.1 **DONE, by curl — no browser needed.** `lichess-reference.md`. Blind mode is a
      **server-side session flag**: `POST /run/toggle-blind-mode` with `enable=1` and an
      `Origin: https://lichess.org` header (403 without it), cookie jar kept, and every page then
      comes back in its blind-mode form. Their own 770-line tutorial at `/page/blind-mode-tutorial`
      documents the entire interface and is the best source on the subject that exists.
- [x] 3.2 **ALL FIVE ANSWERED** — `lichess-reference.md` sections 1-6. Separate module
      (`analyse.nvui.js` served *instead of* `analyse.user.js`, own CSS, own i18n); keyboard move
      entry is its own separately-translated module; the position is available **as prose under a
      heading**, not only as a grid; announcement style is a five-way user setting, not a decision
      they made for the user; and the preference is a session flag with its toggle as the **first
      element in `<body>` on every page**.
- [x] 3.3 **ANSWERED BY THE EVIDENCE: a separate module.** Lichess serves a different JS bundle,
      different CSS and different translations. **This removes the design's named risk of colliding
      with the in-flight layout work**, and it means chessgroundx need not be touched at all.

      **AND THE BIGGER FINDING: the non-visual page is a DOCUMENT, not a board.** Headings for game
      info, move list, the position in prose, status, last move, input form, clocks, real action
      buttons — then the board. Everything above the board is plain semantic HTML. A blind player
      reads the entire game state without the board at all. `lichess-reference.md` section 3.
- [ ] 3.3c **Decide OUR structural answer — and the live DOM narrowed the choice.** `lichess-
      reference.md` 9.1: lichess does NOT serve a separate page. The nvui content is one
      `<div class="nvui">` inside the ordinary `<main class="round">`, header and nav untouched, with
      `<body class="blind-mode">` as the only other marker. So a non-visual block rendered inside our
      existing round page is what they actually do, and the separate bundle is a delivery choice
      rather than a structural one. Decide whether we need the bundle split at all.
- [x] 3.3d **MEASURED THE REAL COST OF AN ACCESSIBLE BOARD, and it is far lower than assumed.**
      `lichess-reference.md` 9.2: in `plain` layout the board is **64 `<button>` elements whose text
      content is their label** — `"A8 black rook"`, `"B8 +"` for an empty dark square, `"E8 -"` for an
      empty light one. No table, no `role`, no `aria-label`, no `tabindex` management. Buttons are
      focusable and take Space/Enter for free.

      This retires the fear that an accessible board needs chessgroundx changed or an ARIA grid built.
- [x] 3.3e **FOUR live regions with deliberately different politeness** (`lichess-reference.md` 9.3),
      not one announcement channel: status and last-move and errors assertive, board prompts polite,
      and **the move list at `aria-live="off"` with `role="log"` on purpose** — announcing every move
      would re-read the list, so the one-sentence last-move region does that job instead. All
      `aria-atomic="true"`. Copy the politeness split, not just the idea of a live region.
- [x] 3.3b **WEIGHED, and they agree more than expected.** They pre-authorised the
      smaller scope: *"as alternative i propose you to make a table or another element, when the
      blind user can operate all the board."* A focusable table is both what they asked for and
      what the focus-mode mechanism needs. If lichess's answer is more than that, we may still take
      only this much — with their agreement already on record.
- [x] 3.4a **The candidates are costed — `candidates.md`.** Seven options A to G, each with what it
      buys, what it costs and what is still unknown, plus two possible groupings. **Explicitly not a
      decision**: Nikolay, 2026-09-26, *"we havent reached conclusion what to do yet, just good to
      have all this written down as options and findings."*
- [ ] 3.4 **THE GATE — STILL OPEN. Choose from `candidates.md`.** Everything not chosen goes to a
      named successor with the reason. **Short is the goal, not coverage.**

      **The tension to resolve**: the user's stated FLOOR is move entry (candidate E) and their
      stated FIRST WANT is arrow navigation (candidate F). Grouping 1 (A+B+C+D+E) satisfies the floor
      without the want; grouping 2 adds the board.
- [ ] 3.4b **Decide whether a MODE is wanted at all**, or whether the markup is always on. Design
      Decision 4 prefers always-on; candidate A's toggle assumes a mode. Evidence that both can be
      true at once: lichess ships keyboard move entry as an ordinary preference for sighted players
      (`"keyboardMove": false` in the normal page's prefs) *and* forces it on in blind mode.
- [ ] 3.4c **Decide where the piece-naming table sits in the order.** 33 `pieceFamily` values,
      roughly 200-350 translatable strings, and the role letter is a valid fallback meanwhile. It
      gates nothing, but it is the difference between *"A8 black r"* and *"A8 black rook"*.
- [ ] 3.5 Write the spec delta for the shortlist only, and only then. The capability is unnamed
      until this point on purpose — see the proposal.

## 4. Build the shortlist

- [ ] 4.1 To be filled from 3.4, which is still open. Left empty deliberately — the candidates and
      their costs are in `candidates.md`; turning one into tasks is what the gate authorises.

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
