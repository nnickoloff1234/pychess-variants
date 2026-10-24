## 0. Status

**2026-10-24: PR #2377 is merged upstream (2026-10-18, `e4547c09e`).** What is left is board
interaction — E, F and what waits on them (4EF, 3.4h, 4RA3.2, 4FR6, 4Z.2) — as one new PR under
this change, then the spec delta (3.5) and the archive.

**Superseded — PR scope decided 2026-10-11 (Nikolay): PR #2377 ships everything done so far; E and F (and what
waits on them: 3.4h, 4FR6, 4RA3.2, 4Z.2) go to a separate PR under this same change** — no archive,
no split of the spec. Before wrapping #2377: verify the finished items (5.1-5.3, by Orca's log and
Chrome's accessibility tree; hearing the speech is not required), then Nikolay reviews the PR.

**Superseded — the status from 2026-10-10:** the gate at 3.4 is decided: the shortlist is C, D, E, F and G.** Shipped: 4G (the
header and site chrome, PR #2377), 4CD (the board summary and the piece-name adapter, same PR),
4H2 (`<html lang>`), 4RA1 (draw, takeback and rematch offers answerable by keyboard, and announced),
4RA2 (move-list button names) and 4RA3.1 (clocks in the summary). Next: the move input (E), then
arrow navigation on the board (F, after 3.4h). B (headings) waits on 3.4d; A is the help link
of 3.4g. The spec delta (3.5) is still unwritten.

**Superseded — the status from 2026-09-27 to 2026-10-10:** only candidate G was being built, with the
gate open.

**Superseded, kept for the record — the original planning-phase freeze (2026-09-27).** Nikolay:
*"we will not fix anything today, we are just writing down our findings and making a plan ... we are
still at planning phase."* That held until he said *"lets start with the main menu in the header
aaaaaaand make it accessible as we discussed"*. Every defect recorded in `collapsibles-sweep.md` and
`focus-and-tabindex-sweep.md` that is **not** in 4G remains a worklist item for when the change is
applied, not something to touch now.

**Order discipline, added 2026-09-28 after it was broken.** A defect found while measuring gets
written down here and done in sequence — it does not get fixed on the spot. 4G.6 exists because that
rule was broken and the fix reverted.

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

- [x] 2.1 **DONE 2026-09-27/28.** Orca installed and driven, with speech and a braille monitor
      (`orca --replace -e braille-monitor -d speech --debug-file=...`); transcripts read back from the
      log via the `SPEECH OUTPUT:` and `BRAILLE LINE:` markers. What it heard is in
      `tree-capture-sweep.md` section O — it is what downgraded R4 (Orca drops the PUA glyph
      silently) and what confirmed R3 by ear ("l", "n", "o", "m" for the move buttons). Nikolay now
      runs it himself to verify changes, so **every later claim is checkable by both of us**.
- [x] 2.2 **Walked 2026-10-11 (with 5.2), see 5.2.** Walk the target page as a non-visual user would: land on it, find the board, find whose
      turn it is, find the clock, find the last move, make a move. Record where it fails and at
      which step it becomes impossible.
- [x] 2.3 **CONFIRMED by the tree captures (3b.2):** the board contributed zero nodes and there were
      zero live regions on all eight pages captured. Since fixed by 4CD and 4RA1.2.
      Confirm or correct the survey in the proposal: no `aria-live` on any game page, `<move>`
      with no role or focus, no keyboard move entry, no non-visual mode anywhere.
- [x] 2.4 **DONE in the sweeps:** every sweep in 2.4c–2.4p records its POSITIVES, and AD1/ST1/IB2/FR3
      name the in-house patterns to copy. Note what already works. The chrome has real ARIA — 37 labels in templates, 61 in client,
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
- [x] 2.4c **SWEPT — `collapsibles-sweep.md`. 5 correct, 4 defects, 1 minor**, and two defects are
      worse than a missing attribute:

      **F1. The main nav's submenus are hover-only.** `site.css:939` `.drp { visibility: hidden }`
      revealed only by `:996` `.topnav section:hover .drp`, inside `@media (min-width: 800px)`. No
      `:focus-within`, no button, no ARIA. Since `visibility: hidden` removes content from the
      accessibility tree, **every secondary nav link is absent to a screen reader and unreachable by
      keyboard on desktop.** WCAG 2.1.1 Keyboard, **Level A**. Fix is one `:focus-within` selector.

      **F2. The hamburger is a `<div>`.** `template.html:6`, handler `main.ts:345`. No tabindex,
      role, name or `aria-expanded`, so **the mobile nav cannot be opened by keyboard at all.**
      WCAG 2.1.1 and 4.1.2, both Level A.

      **F3.** `#btn-challenge`, `#btn-notify`, `#btn-settings` (`template.html:141,147,157`) are real
      buttons with panels correctly `display:none`, but carry no `aria-expanded` and no
      `aria-controls` — activating them announces nothing. WCAG 4.1.2.

      **F4.** `button#bars` (`movelist.ts:311`), toggled by `analysisCtrl.ts:663` and
      `puzzleCtrl.ts:446`; swaps display, never updates `aria-expanded`. Same shape as F3.

      **F5, minor.** The search icon is a non-focusable `<div>`, but `.search-bar` collapses with
      `overflow: hidden`, which **keeps the input focusable and in the accessibility tree**, and it
      has `aria-label`. Reachable anyway.
- [x] 2.4e **Focus order, tabindex and focus visibility SWEPT — `focus-and-tabindex-sweep.md`.**
      Six findings, all small, none touching the board or layout:

      **T1. The lobby tablist has no keyboard entry point.** All four tabs hardcoded `tabindex: '-1'`
      (`lobby.ts:2082, 2089, 2103, 2123`); `lobby.ts:275` fixes `aria-selected` at runtime but never
      `tabindex`, and `changeTabs` does not either. **Tab never lands on a lobby tab.** WCAG 2.1.1,
      Level A. The correct roving pattern already exists at `tournamentRR.ts:1013`.

      **T2. No tablist on the site has arrow-key navigation.** `setAriaTabClick` (`view.ts:202`) binds
      `click` only; `changeTabs` listens for no keys. `role="tab"` advertises Left/Right arrows, so
      this promises an interaction the page does not honour. **One keydown handler in that one shared
      helper repairs every tablist at once — the best value on the list.**

      **T3. The two-board tabs emit POSITIVE tabindex.** `two-board/common/tabs.ts:116` and `:143`
      use `tabindex: String(t)`, producing `0,1,2,3` on four tabs and four panels — which hoists them
      ahead of every naturally focusable element in the document. Clearly a slip: `aria-selected` in
      the same attribute object is computed correctly.

      **T4-T6. `outline: none` with no replacement** — `.btn-controls button:focus`
      (`site.css:2302`, the round page's **Draw and Resign**), `button.icon:focus` (`:2393`),
      `.search-bar .input input` (`:3800`). WCAG 2.4.7, Level AA. `:focus-visible` is the right
      replacement, and `study.css` already models it (24 uses against `site.css`'s 4).
- [x] 2.4f **METHOD RECORDED, with its limits.** Every sweep in this change is **static source
      reading — the app has never been run.** No browser, no rendered DOM, no screen reader. "X is
      missing" is reliable; "the user therefore experiences Y" is inference. **The biggest gap:
      `#settings`, `#notify-app`, `#challenge-app` and both two-board pages are built by Snabbdom at
      runtime, so nobody has seen the DOM they produce.** Tasks 2.1 and 2.2 are what validate all of
      it. See `focus-and-tabindex-sweep.md`'s opening table.
- [x] 2.4g **Alt text and form labels SWEPT — `alt-and-labels-sweep.md`.** Better than expected on
      images, two clear label defects, one pattern-level gap:

      **Alt text is in good shape: 4 misses in the whole codebase** (`profile.html:31` trophy,
      `about.ts:26`, `layer2fairy.ts:15`, `layer2army.ts:16`), all decorative, all `alt=""`. **1775 of
      1776** template images already have `alt`, `authors.html` uses a per-author `portrait_alt`
      field, and `layer1.ts` marks all eighteen decorative pieces `alt=""`. **Zero icon-only
      `<button>`s lack an accessible name** — the failure mode that usually dominates such an audit is
      absent here.

      **L1. `arena-new.html:292` has `for="form3-byo"` — an id that exists nowhere** (grep-confirmed);
      the select is `form3-byoyomiPeriod`. Orphaned label, unnamed select, and it looks correct.

      **L2. `memory.html:74-77` uses `label="zen"`, which is not an HTML attribute on `<input>`** (it
      is valid only on `<option>`/`<optgroup>`). Four radio buttons with **no accessible name at all**.

      **L5. Four unnamed range sliders** — `lobby.ts:859, 879, 1740, 1748`. "Rating range" is a bare
      string inside a `div`, not a `<label>`, so two pairs of sliders share a heading with no
      association: a screen reader says "slider" twice, unnamed.

      **METHOD WARNING recorded in the file.** A line-based grep first reported "18 of 23 client
      images have no alt"; a multi-line-aware parse gives **3**. Wrapping `<label>`s are the same trap
      in reverse, so the client count (44 flagged, ~1 in 3 a false positive on calibration) needs
      runtime confirmation from task 2.2.
- [x] 2.4h **Headings and landmarks SWEPT — `headings-and-landmarks-sweep.md`.** Landmarks are good;
      headings are the gap, and one finding is the best line-for-value item in any sweep:

      **H1. The game, analysis, puzzle and study pages have ZERO headings.** `templates/analysis.html`
      has none and serves all three of analysis (`views/analysis.py:16`), puzzle (`views/puzzle.py:17`)
      and study (`views/study.py:992`); `roundCtrl.ts`, `round.ts`, `analysis/index.ts`,
      `analysisCtrl.ts`, `movelist.ts` emit none; **the whole `client/two-board/` tree emits none.**
      So `H` does nothing and there is no `h1` for the `1` key. This upgrades `candidates.md` B from
      "almost no headings" to none, and is why B is cheap — nothing to reconcile.

      **FIXED 2026-10-10 — 4H2.** **H2. `<html>` has no `lang` — `base.html:2`.** WCAG 3.1.1, Level A, and **acute for pychess**:
      the UI is translated through `lang/` gettext, and a screen reader picks its pronunciation from
      `lang`, so a Bulgarian page read by an English synthesiser is unusable rather than merely
      degraded. **The value is already to hand** — `base.html:71` emits `data-lang="{{ lang }}"` on
      `<body>` — so it is `<html lang="{{ lang }}">`, one line. `api.html:2` already does it.

      **H3.** No skip link anywhere. WCAG 2.4.1, Level A — partly mitigated for screen-reader users by
      `<main>`, not at all for sighted keyboard users.

      **H4.** 10 templates with multiple `h1`, of which 8 are `docs/terminology.*` translations at 6
      each, compiled from one markdown source by `yarn md`. Breaks the "press 1 for the content"
      convention lichess's tutorial teaches.

      **H5.** 5 heading-level skips; `patron.html` goes h1 to h6. **H6.** 4 full pages with no `h1`
      (`closed.html`, `reports.html`, `mod_public_chat.html`, `cwda_diagrams.html`) — partials
      correctly excluded.

      **LANDMARKS ARE GOOD: `<main>` in 57 templates, `<aside>` 29, `<nav>` 9, `<header>` 9, and no
      redundant `role=` duplication anywhere.** `<footer>` is unused, so there is no `contentinfo`.
      One line worth copying from lichess: `<h2>Navigation</h2>` in the site header, so the nav can be
      skipped.
- [x] 2.4i **Docs and rules pages SWEPT — `docs-pages-sweep.md`. The headline is POSITIVE.**

      **D1. The docs are the most accessible part of the site, and that is why our user uses them.**
      They are written **prose-first with illustrative diagrams**: every movement diagram is followed
      by a paragraph stating the rule in words — verified in `capablanca.md:21-23`, `shogi.md:66-68`
      and `xiangqi.md:56-58`, where the horse's blocking rule is explained better in prose than the
      diagram shows. **All 1734 images have alt text**, across 475 distinct real labels. So a blind
      reader gets the actual rules of every variant we document. **Protect this; do not let it
      regress.**

      **D2. `<html lang>` is the sharpest finding, and the docs are why.**
      `server/views/variants.py:99-109` and `faq.py:16` select the docs file **by locale** — 323 pages
      across 8 languages — and then serve it in a page that never declares its language. A Spanish
      rules page read by an English synthesiser. One line (`base.html:2`), Level A, value already in
      `data-lang`. **The most valuable single line in any sweep in this change.**

      **D3.** Movement-diagram alts are inconsistent — `xiangqi.md` says "Horse movement",
      `shogi.md` says "HorseDiagram", which reads as one run-together word. Markdown edit.
      **D4.** Board-setup diagrams have no prose equivalent, so a blind reader learning shogi never
      gets the starting array; a FEN in a code block would fix it, one line per variant.
      **D5.** `showdown` emits `<th id="">` 431 times across 115 tables — invalid HTML, **harmless to
      screen readers** since the tables are real `<thead>`/`<th>`. Fix in `md2html.js`, one place, all
      323 pages. Unchecked: whether any of the 16 table files needs `scope`.
      **D6.** The heading defects from H4/H5 are markdown-source defects; `docs/terminology.*` is
      **one source in eight translations**, so one fix covers eight built files.
- [x] 2.4j **Lobby and tournament pages SWEPT — `lobby-and-tournament-sweep.md`. Contains the most
      consequential finding so far.**

      **LB1. YOU CANNOT ACCEPT A GAME FROM THE LOBBY BY KEYBOARD.** `lobby.ts:1333-1337` — the seek
      row is `h('tr', { on: { click: () => this.onClickSeek(seek) } })` with no role, no tabindex and
      no keyboard handler, and **there are zero keydown/keyup/keypress handlers in the entire file.**
      A keyboard or screen-reader user can read the whole seek list and then act on none of it. This
      is the site's primary action on the page everyone lands on. WCAG 2.1.1, **Level A**.

      **CORRECTED 2026-10-10: LB3 was wrong.** The lobby's dialog has been a native `<dialog>` opened
      with `showModal()` since March 2025 (`lobby.ts:681`), so Escape closes it; the source sweep
      missed it. TN4 (tournament, round-robin) stands: no `<dialog>`, no Escape.

      **LB3 / TN4. Neither the lobby nor the tournament dialog can be closed by keyboard.** Close is
      a `<span.close>` (`lobby.ts:684`, `tournament.ts:642`, `tournamentRR.ts:1373`) and no `Escape`
      handler exists in either file — so a keyboard user who opens a dialog is **trapped in it**.

      **LB2 / TN2 / TN3. Nothing that changes is announced.** *(2026-10-11: LB2 moved to its own
      change `lobby-seek-announcements`; TN2 and TN3 dropped.)* Zero `aria-live` in `lobby.ts`,
      `tournament.ts`, `tournamentRR.ts` or `tournamentClock.ts`. Seeks appear and vanish silently;
      the tournament countdown is never spoken; standings reorder in silence.

      **TN1.** Standings rows are click-only (`tournament.ts:469`), as is
      `tournamentRR.ts:1507`. **TN6.** An `<h2>` (`:1517`) and an `<option>` (`:1547`) are used as
      click controls.

      **POSITIVES, including a correction to my own suspicion:** the seek table is properly built with
      a real `<thead>` and six `<th>` (Player, Rating, Time, Variant, Mode), so **the information is
      fully reachable and only the action is not**; Create a game (`lobby.ts:943`) and
      Join/Withdraw (`tournament.ts:272-279`) **are real `<button>`s**.

      **THE PATTERN — three fixes, not thirty sites:** a row that acts needs an operable control; a
      dialog needs a focusable close and an `Escape`; anything that changes needs a live region. **The
      third is candidate D**, so deciding D serves these pages too, not just the board.
- [x] 2.4k **Profile and study pages SWEPT — `profile-and-study-sweep.md`. Mixed, and the good half
      is the more useful.**

      **PF2. The rating chart is invisible, and the fix is ONE IMPORT.** `stats.ts` renders Highcharts
      into an empty div with **0 `aria-`/`role:`/`alt:` in the file**. But
      `node_modules/highcharts/modules/accessibility.js` **ships with the `highcharts@^13.0.2` we
      already depend on and is imported nowhere (0 hits)** — so
      `import 'highcharts/modules/accessibility';` buys a screen-reader description, keyboard
      navigation of data points and a text summary of every series, none of it written by us.
      **After `<html lang>`, the cheapest high-value item in any sweep.**

      **PF1.** `profile.ts` renders `h('table#games')` with **0 `<thead>` and 0 `<th>`**, and
      `gameSearch.ts:141` reuses the same `renderGames` — so both tables announce unlabelled cells.
      The lobby's six-`<th>` seek table is the pattern to copy.

      **ST2. `<move>` IS SHARED BY FOUR PAGES.** `study/studySync.ts:3` imports `updateMovelist` from
      `../movelist`, so round, analysis, puzzle and study all use one move list. **Whatever is decided
      for `<move>` lands on all four at once — the largest single piece of leverage found anywhere.**

      **ST1. STUDY IS THE BEST-BUILT PART OF THE CLIENT, and the in-house model to copy** — not
      lichess. `study.css` has **24 `:focus-visible`** against `site.css`'s 4; `studyView.ts` has 4
      `keydown`, an `Escape`, `aria-live` and `tabindex`; and **`addToStudy.ts` gets right exactly what
      the lobby and tournament dialogs get wrong** — a real `document` keydown closing on Escape
      (`:23, 37-39`) with the backdrop click as an *extra* path, not the only one. Copying a pattern
      that already exists here is cheaper to review than importing lichess's.

      **METHOD CORRECTION, affecting how earlier sweeps read:** my clickable-element classifier
      attributes a handler to the nearest *preceding* `h('…')`, so a `<span>` label before a real
      `<button>` reports as a defect. **Three false positives in this sweep alone.** The
      lobby/tournament hits were each opened by hand and two were withdrawn for this reason, but no hit
      should be quoted without eyeballing the source.
- [x] 2.4l **Inbox and forum SWEPT — `inbox-and-forum-sweep.md`. Both come back WELL BUILT.**

      **IB1. A private message arrives and nothing is said.** `inbox.ts:424` opens
      `new EventSource('/inbox/subscribe')` and `:426` receives `{unread, thread?}` — so messages
      genuinely arrive live and the unread count updates. **And the file has 0 `aria-live`, 0
      `role="status"`, 0 `role="log"`.** The hard part — knowing when something changed — is already
      built and working; only the attribute is missing. **The sharpest missing-live-region case found
      anywhere.** WCAG 4.1.3 AA.

      **IB2. The inbox is one of the two best-built pages swept.** Threads are real
      `h('button.inbox-thread', { props: { type: 'button' } })` — **exactly what the lobby's seek rows
      get wrong, solved properly in the same codebase.** All four icon-only actions carry `title`
      (Challenge, Block, Delete, Report), and there are **zero non-interactive clickables** in the file.

      **FR1. The forum's modals are visual only.** They DO have a real Cancel `<button>` (`:1556`), so
      unlike the lobby's and tournament's there is a keyboard way out — but **0 `role="dialog"`, 0
      `aria-modal`, 0 `Escape`, 0 `keydown`**, so a screen reader is never told a dialog opened and the
      user can Tab out of it into covered content. `study/addToStudy.ts` is the house pattern.

      **FR3. The forum has the best ARIA of any page swept**: `aria-label` on all four post actions
      (`:1360, 1374, 1396, 1410`), **`aria-hidden="true"` on decorative icons** (`:1191, 1268`) — the
      most sophisticated touch found anywhere — 3 `<thead>`, 8 `<th>`, 9 headings, and all six flagged
      clickables were the known wrapper false positive.

      **AND THE SITE-WIDE PATTERN IS NOW CLEAR.** Well built: study, inbox, forum, profile overflow.
      Poorly built: lobby, tournament, the game/analysis pages, the site header. **Two gaps are
      near-universal rather than page-specific — live regions exist almost nowhere but `study/`, and
      modals lack dialog semantics everywhere. The first IS candidate D, now the finding with the most
      sites behind it.**
- [x] 2.4m **Round and analysis pages SWEPT — `round-and-analysis-sweep.md`. Contains the most severe
      finding in the change.**

      **FIXED 2026-10-10 — 4RA1 (buttons) and 4RA1.2 (the offer is announced).**
      **RA1. YOU CANNOT ACCEPT OR DECLINE A DRAW, TAKEBACK OR REMATCH BY KEYBOARD.** `roundCtrl.ts`
      builds **nine accept/reject controls as bare `<div>`s** across **five offer types** — takeback
      (752, 758, 774), **draw (829, 833)**, correspondence move confirmation (852, 856), **rematch
      (1030, 1034)** — each with no role, no tabindex and no name, in a file with 0 `keydown`.
      **And the offer text IS readable**: `h('div.text', _('Your opponent proposes a takeback'))` sits
      between the two controls, so a blind player is **told about the offer and cannot answer it**,
      mid-game, under a clock. WCAG 2.1.1 **Level A**. The correct pattern is eleven lines away —
      `:497` `h('button#resign', { props: { title: _('Resign') } })`.

      **FIXED 2026-10-10 — 4RA2.** **RA2.** `movelist.ts` has 7 buttons and **4 are unnamed** — `icon-fast-backward` (:253),
      `icon-step-backward` (:267), `icon-step-forward` (:282), `icon-fast-forward` (:284) — while
      `refresh`, `exchange` and `bars` in the same file are named. A screen reader announces "button"
      four times for the primary way to review a game.

      **FIXED 2026-10-10 — 4RA3.1.** **RA3.** `clock.ts:240-254` emits real text (better than the board) but has **0 `aria-label`, 0
      `role="timer"`, 0 `aria-live`** — so neither clock says whose it is, time is never announced, and
      it reads as three fragments, "5", ":", "23". Our user asked for exactly this.

      **RA4.** `chat.ts:119` is `h('ol#…-messages', [h('div#messages')])` with the `<li>` messages
      patched into the inner `<div>` — **`<ol>` may only contain `<li>`**, so it is not a list and list
      navigation fails. **RA5.** `chat.ts:131` `'aria-label': 'Chat input'` is **hardcoded English**
      while lines 105-112 all use `_()` — the field's only name, untranslated. **RA6.** Chat has 0
      `aria-live`, so an opponent's message is never announced.

      **RA8. ZERO `aria-live` and ZERO headings across all eleven round/analysis/two-board files.**
      Full inventory in the document. This is the complete evidence behind H1 and candidate D.

      **POSITIVES:** the game controls ARE real named buttons (`:497` Resign, `:621` Abort) — **so the
      pattern RA1 and RA2 need already exists in the same file**; `analysis/index.ts` is properly built
      (9 `role:`, 14 `aria-`, one tab at `'0'`); `gameCtrl.ts` and `analysisCtrl.ts` do have `keydown`
      and `Escape` handlers.
- [x] 2.4n **Settings and board-settings SWEPT — `settings-sweep.md`. Largest control count in the
      change, and one of the cheapest fixes.**

      **SB1. 323 theme and piece radios have NO accessible name — and the names are already in the
      data.** `boardSettings.ts` pairs every radio with `h('label…', { attrs: { for: … } }, '')` — an
      **empty string as content** — and the file has 0 `aria-`. Counted from `variants.ts`: **114 board
      themes + 209 piece sets = 323 radios** announcing only "radio button, not checked".
      **But `pieceCSS: ['classic', 'arrow', 'disguised']` is already human-readable and `boardCSS`
      carries the theme name in its filename — so passing the existing string as the label's text names
      all 323 in ONE LINE per loop.** WCAG 4.1.2 Level A.

      **SB3. UNTRANSLATED `aria-label`s are a site-wide cluster.** 5 in `client/` against 30 translated
      (`chat.ts:131` 'Chat input', `challengeView.ts:298`, `settingsView.ts:34` 'Settings',
      `lobby.ts:2132` 'Seek Tabs', `analysis/index.ts:195` 'Analysis Tabs'), plus 10+ in templates —
      **five of them in the site header, so on EVERY page** (`template.html:76, 135, 141, 147, 157`).
      **An `aria-label` REPLACES the announced name**, so these are exactly the controls a blind
      non-English user hears in a foreign language — and combined with the missing `<html lang>` (H2/D2)
      the synthesiser is not even set to pronounce English. **The two compound, and together they are
      ~15 `_()` calls plus one attribute.** WCAG 3.1.2 AA.

      **SB2.** The settings panel has 0 `role="dialog"`, 0 `aria-modal`, 0 `Escape`, 0 `keydown`, and
      F3's missing `aria-expanded` on its button — **the fourth sighting of this dialog shape**, which
      now argues for fixing the pattern once rather than per page. `study/addToStudy.ts` is the model.

      **POSITIVES, including a correction:** the privacy/push checkboxes ARE properly labelled with
      `<label for>` + `_()` (`:149-173`) — **they appeared in the label sweep's first, broken output and
      the corrected run resolved them; they are not defects.** `settingsView.ts:71` uses
      `role: 'separator'`, and `switch.css:50` styles `input:focus + .sw-slider`, the right technique
      for a visually hidden input.
- [x] 2.4o **Admin and moderation SWEPT — `admin-and-moderation-sweep.md`. Almost entirely positive,
      and it produced the most actionable architectural finding in the change.**

      **AD1. THE ADMIN DIALOGS ARE THE ONLY CORRECT MODALS ON THE SITE, because they use the platform.**
      `admin_users.html:191`, `admin_system_messages.html:66`, `admin_operations.html:220` use a native
      **`<dialog>` opened with `showModal()`** — which supplies `role="dialog"`, `aria-modal`, focus
      moved in, **focus trapped**, **Escape**, and the rest of the page made inert, **all from the
      browser with no code.**

      **And the split is perfectly clean: server templates use `<dialog>` (6 elements, 15 `showModal()`
      calls, also in `authors.html` and `studies.html`) and ALL of them are correct; the Snabbdom client
      hand-rolls `<div>` modals (`lobby.ts`, `tournamentRR.ts`, `forum.ts`, `roundCtrl.ts`, `round.ts`)
      and ALL of them are broken, each differently.** The dividing line is template versus Snabbdom, not
      author skill.

      **THIS SUPERSEDES ADVICE GIVEN IN THREE EARLIER SWEEPS.** LB3/TN4, FR1 and SB2 each recommended
      copying `study/addToStudy.ts`, which hand-rolls a `document` keydown and Escape. **The better fix
      is `h('dialog', …)` + `showModal()` in an insert hook** — Snabbdom renders `<dialog>` like any
      element and the browser does the rest. **One pattern, already proven in this repo, fixes all four
      broken dialogs and DELETES code rather than adding it.**

      **AD3. Three of the site's SEVEN live regions are here, with correct politeness** —
      `role="status" aria-live="polite"` for operation feedback, `role="alert" aria-live="assertive"` for
      a moderation action's result. **So candidate D is not new ground: the pattern is already
      understood in this codebase, just absent from every page players use.**

      **AD2. Everything else is right:** `<main>` on all 10 pages, **47 real `<button>`s with ZERO
      inline `onclick` and ZERO clickable divs** (the only section where the classifier found nothing),
      zero unnamed icon buttons, confirmations on destructive actions, **20 of 21 form controls
      labelled**, and `reports.html` has a proper `<thead>`/`<th>` table.

      **NO NEW DEFECTS.** The three here — 2 missing `<h1>` (H6), 1 untranslated `aria-label` (SB3), 1
      placeholder-only input (L4) — were all already recorded. **Priority stated honestly: if no
      moderator uses a screen reader the direct value is near zero, and there is nothing left to fix.
      Their value to this change is entirely as evidence of the house standard.**
- [x] 2.4d **CLOSED 2026-10-24: every item is done, decided or moved; FR6 lives in 4FR6.** Re-checked against the code 2026-10-10. Done: F1, F3 (4G), H2 (4H2), RA1-RA3 (4RA1-3).
      Also done: RA4-RA6 (4RA4-6), H1 for game pages (4H1), LB1 (4LB1), T1 and T3 (4T1-3), F2 and F4 (4F2-4), T4-T6 (4T4-6), SB1-SB3 (4SB), TN1 and TN4 (4TN), L1 L2 L5 PE2 (4L), PE3 (4PE3), PE1 (4PE1), L3 L4 A1 (4Q), FR4 + duels (4FR4), H3 (4Z.0), RA7 (4RA7), H4 (4H4), H5 and H6 (4H5), D3 (4D3), D6 (with 4H4/4H5), FR1 + round-robin modal + FR5 (4FR). Open and scheduled with E: FR6 (4FR6). Known limitations by decision: PF2, IB1 (section 6). T2 withdrawn by decision. Not a defect: LB3, TN5, TN6 (false positive), ST3 (false positive; H4 shrank to the docs). Closed with no change: ST2 (arrows + the summary's Last move). Moved to its own change: LB2 (`lobby-seek-announcements`). Dropped by decision: PF1, F5, TN2, TN3, FR2 (2026-10-11: on demand is enough; the countdown already has audio). Rejected as out of scope: D4 (2026-10-11: rules content, not technical accessibility), D5 (2026-10-11: invalid `<th>` ids, harmless to screen readers). Everything else listed here is still open.
      **F1, F2, T1-T6, A1, L1-L5, H1-H6, D2-D6, LB1-TN6, PF1-ST3, IB1-FR4, RA1-RA8 and SB1-SB3 do
      not wait on the gate** — except RA8, which IS the gate (candidates B and D). **And per AD1 the
      dialog fixes are ONE change using `<dialog>`, not four; per PE3 the clickable-element fixes are
      ONE RULE applied ~40 times, not forty decisions.**
- [x] 2.4p **Puzzle and editor SWEPT — `puzzle-editor-sweep.md`. Produced the unifying diagnosis for
      the whole client, and the most complete single-feature failure.**

      **PE1. The puzzle never tells a blind user whether they were right.** `puzzleCtrl.ts` patches
      `_('Best move!')`, `_('Try something else.')` — present, correct, translated — and the file has
      **0 `aria-live`, 0 `role="status"`**, so the feedback is replaced **silently**. **The most
      complete failure of any feature**: the position is unreadable (chessgroundx emits no text), the
      response is silent, and puzzles render through `analysis.html` which has zero headings. **A puzzle
      IS a dialogue and the response is the silent half.** One attribute. WCAG 4.1.3 AA.

      **PE2. The editor HAS the right interface for a blind user and it is the one control with no
      name.** `editorCtrl.ts:93` `h('input#fen', …)` with `input` and `paste` handlers lets any position
      be typed or pasted — better than dragging pieces. **No `for: 'fen'`, no `for="fen"`, no
      `aria-label` anywhere.** Same gap at `lobby.ts:704`. (Castling checkboxes ARE labelled, `:122`.)

      **PE3. ALL 21 hrefless anchors — and this is the unifying diagnosis.** Every `h('a')` in
      `client/` with a click handler was checked: **21 of 21 have no `href`**, so none is focusable, none
      has a link role, none responds to Enter. **9 of them are `editor/editorCtrl.ts:153-179` — the
      editor's entire control strip, so the board editor is completely keyboard-dead** — plus 5 analysis
      actions, 3 puzzle including **"Continue training"** (so a keyboard user cannot start the next
      puzzle), 3 two-board, 1 zen.

      **AND IT COMPLETES THE DIAGNOSIS.** Every client-side defect in this change is one mistake:
      hrefless `<a>` ×21, `<div>` offer dialogs ×9, `<tr>` seek and standings rows, `<div>` hamburger and
      search icon, `<span>` dialog closes ×3, clickable `<h2>`/`<option>`/`<td>` ×3 — **~40 controls,
      one rule: if it responds to a click it is a `<button>` or an `<a href>`.** Same root cause as AD1:
      **the server templates use the platform (47 real buttons, 0 clickable divs) and Snabbdom code
      builds its own, because `h('div', { on: { click } })` is as easy as `h('button', …)`.** They are Level A keyboard failures affecting every
      keyboard-only user, sighted or not — not blind-mode features. F1 is one selector; F2 is a `div`
      becoming a `button` with the handler it already has. F3 and F4 are four lines, each on a line
      the code already writes. T1 and T3 are one ternary each with precedent in the codebase, T2 is
      one keydown handler that fixes every tablist, and T4-T6 are one CSS rule each.

      **Deferred by Nikolay on 2026-09-27 to keep the change in planning.** Decide at the gate
      whether they ship as candidate G work ahead of, or alongside, whatever else is chosen.
- [x] 2.5 **REJECTED 2026-10-11 (Nikolay): no Android device to test with.** **Test the Android path too**, since 1.3 made it a named target: TalkBack, and Jieshuo if
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
- [x] 3.3c **DECIDED 2026-10-10: inside the normal page, no separate bundle.** The board summary
      (4CD) is rendered by the ordinary round, analysis and puzzle views and hidden with `.sr-only`.
      **Decide OUR structural answer — and the live DOM narrowed the choice.** `lichess-
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
- [x] 3.4 **DECIDED 2026-10-10 by Nikolay: C, D, E and F, plus G already shipped.** C and D are built
      (4CD), E then F are next; F takes the F(vi) delivery of 3.4g, with 3.4h's conditions still to
      settle. B waits on its scope (3.4d). **Original text:** Choose from `candidates.md`. Everything not chosen goes to a
      named successor with the reason. **Short is the goal, not coverage.**

      **The tension to resolve**: the user's stated FLOOR is move entry (candidate E) and their
      stated FIRST WANT is arrow navigation (candidate F). Grouping 1 (A+B+C+D+E) satisfies the floor
      without the want; grouping 2 adds the board.
- [x] 3.4b **ANSWERED 2026-09-27: NO MODE EXCEPT FOR THE BOARD** — corrected the same day; read 3.4e.
      Originally recorded as "no mode at all": Design Decision 7. Nikolay reasoned it out from the
      sweeps and it holds further than stated — **not one candidate needs a mode.** Headings, `aria-*`
      and live regions are always-on and invisible to sighted users; **the position as text is
      always-on VISUALLY HIDDEN** (`.sr-only` clip, zero visual change); **the command input is a
      PREFERENCE**, as lichess proves with `"keyboardMove": false` in its normal page's prefs; and
      **the board works always-on behind a roving tabindex**, making it ONE tab stop rather than 64.

      **The DOM-weight counter-argument was measured and is weak**: worst case 100 squares (10x10
      Grand/Shako) or 128 for two-board bughouse, and a move changes 2-4 squares, so a keyed Snabbdom
      diff touches almost nothing.

      **What survives is discoverability — and a toggle is the wrong answer to it.** A button that
      changes nothing is dishonest. **Candidate A becomes a visually hidden LINK to a keyboard-help
      page, first in `<body>`** — the half of lichess's affordance that carries the value.

      **Why lichess needs a mode and we do not:** their `nvui` is a separate JS bundle served *instead
      of* the normal one, so a switch between two front ends needs a switch. Ours is the same page with
      correct markup. **The mode is an artifact of their architecture, not a requirement of
      accessibility.**

      Two consequences recorded: the board becomes **one tab stop for sighted keyboard users too** (an
      improvement — today it is zero and the page tabs past it), and the position will exist **twice**
      in the accessibility tree, as prose and as a grid, which is **verbose but not wrong and is exactly
      what lichess does.**
- [x] 3.4e **CORRECTION, and Nikolay was right the first time.** 3.4b's "no mode at all" **fails for
      candidate F.** A roving tabindex fixes the *number* of tab stops and says nothing about
      **visibility** — the two were conflated. A grid always in the DOM is either **visible** (64 lines
      of text beside a graphical board, clutter nobody asked for) or **hidden** (and a sighted keyboard
      user's focus lands on something invisible — WCAG 2.4.7).

      **Nikolay's proposal removes the problem rather than working around it: the switch chooses the
      board.** Blind mode on renders the button grid **instead of** chessgroundx; off renders
      chessgroundx only. No hidden focusable element, no duplicate board, no clutter — and the grid is
      **visible when active**, so a sighted developer can enable it and see it, which answers Decision
      4's objection that a blind-only mode is one nobody notices breaking. It is also why lichess's
      blind board draws pieces.

      **Revised shape:** headings, live regions, the prose position and all of candidate G are
      **always-on**; **the board is mode-gated**; the command input is a **preference** for everyone,
      forced on with the mode. **The mode's only job is the board** — far smaller than lichess's, which
      swaps a whole front end.

      **Candidate A is reinstated as a toggle** (it now has a real job), with the help link beside it.
      **Two things to settle:** it should probably not be called "blind mode", since it also serves
      sighted keyboard players; and the prose position stays always-on, as lichess keeps both.

      **Five delivery options for F recorded in `candidates.md`** — A hidden/zero tab stops, B
      hidden/revealed-on-focus, C always visible, D preference-gated, **E the mode chooses**. A-D are all
      workarounds for a problem E does not have.
- [x] 3.4g **F's DELIVERY ANSWERED — square elements on the REAL board, and it needs NO chessgroundx
      fork.** Nikolay proposed putting the keyboard layer onto chessgroundx's own board rather than a
      parallel grid. **Assessed against the source: it works, and more cheaply than he proposed.**

      **The decisive fact:** `chessgroundx/src/render.ts:214-215` defines `isPieceNode`/`isSquareNode` as
      **pure tagName checks**, and the render walk is `if (isPieceNode) … else if (isSquareNode) …`. **An
      element of any other tag name is skipped — never matched, never collected, never removed.** So our
      own per-square elements can live inside `cg-board` untouched. And `key2pos`, `posToTranslate` and
      `translate` are already exported, with `api.state` exposing `boardState.pieces`, `orientation` and
      `dimensions`.

      **Shape:** one `<button>` per square in `cg-board`, positioned with chessgroundx's own
      `translate(posToTranslate(key2pos(key), asWhite))`, **`pointer-events: none`** so mouse and touch
      behaviour is unchanged, `aria-label` from board state plus `variants.ts` piece names, roving
      `tabindex` (one tab stop), `:focus-visible` outline, Space/arrows driving the existing
      `api.selectSquare()`.

      **Why it beats A-E: no mode, no hidden focusable element, no parallel board, no fork — and sighted
      keyboard players get the same feature, so it cannot rot unnoticed** (Decision 4 satisfied exactly).
      Highlights come free: `computeSquareClasses` already knows last-move, check, selected and
      destination squares.

      **SIX HAZARDS RECORDED, three real:** `drag.ts:169` compares `originTarget !== e.target` on
      touchend, so **`pointer-events: none` is not optional**; `renderResized` re-translates only
      PIECE/SQUARE so our elements need the existing `notifyChessgroundResize` path; and **orientation is
      the sharp edge** — a wrong `asWhite` is invisible to a sighted developer and tells a blind player a
      piece is somewhere it is not, so it needs a test. Plus: version drift (the tagName skip is an
      implementation detail, not a contract — assert it in a test and consider upstreaming an extension
      point later), pockets are rendered separately by `pocketRow.ts`, and bughouse means two grids.

      **This restores "no mode" on sound reasoning.** The earlier no-mode conclusion was wrong because it
      ignored visibility; this one holds because **there is only one board and it is already visible.**
      Candidate A returns to a visually hidden help **link**; E stays a preference; C stays always-on and
      visually hidden, because hearing twelve lines beats walking 64 squares.
- [x] 3.4h **SETTLED 2026-10-25 (Nikolay) — full answer in `candidates.md`, "F(vi) REVISED".**
      Re-read against chessgroundx 11.0.0 first: a flip runs `redrawAll()`, which empties the whole
      `.cg-wrap` (`wrap.ts:162`), so buttons inside `cg-board` would vanish on every `f`; and
      chessgroundx now draws the pockets itself, also wiped on redraw. **So the layer is ours,
      laid over the board as a sibling of `.cg-wrap`, never inside chessgroundx's DOM.**
      **Q1:** a mouse can never focus the board (`pointer-events: none`, and chessgroundx calls
      `preventDefault()` on every mouse press, `drag.ts:42`), so mouse users keep today's arrows;
      once Tab puts focus on the board, our `keydown` handles its keys and stops their propagation,
      so Mousetrap on `document` never sees them. `:focus-visible` is not needed.
      **Q1(d): lichess's plain board** — `<button>`s, no role, the user enters focus mode by hand as
      on lichess; one improvement, a roving tabindex (one tab stop, lichess has 64). Label: square
      first, then the piece (`pieceName()`); an empty square is just its name (4F.2). Arrows
      follow the orientation; at the edge focus stays and a bump sound plays, nothing spoken. The
      table layout is not built (redundant with the square names and board keys; a later setting if
      asked). **Q2:** our user's model, see `candidates.md`; entering a pocket lands on its first
      role, and a zero-count role is a stop. (Revised by 4F.6 to follow the screen: Right enters
      your own pocket, Left/Right step the roles.) **Q3:** one layer per board, so bughouse gets it, one
      tab stop per board; verified on single-board pages only. **Q4:** unchanged in spirit — the
      code comment says temporary, proper home chessgroundx; the first test becomes "labels match
      chessground's state after a move and after a flip" (nothing has to survive `render()`).
      The original conditions, kept for the record:

      **F(vi) HAS FOUR CONDITIONS — settle them before committing.** `candidates.md`, "open
      questions". Raised by Nikolay 2026-09-27 and recorded as conditions on the option, not
      afterthoughts.

      **Q1. Arrows must not stop scrolling the move list — and the rule is about HOW focus arrived.**
      Tab-focus on the board → arrows navigate it; **mouse-click focus → arrows must keep scrolling the
      move list exactly as today, or it is a regression.** Investigated: arrows are Mousetrap bindings
      (`gameCtrl.ts:238-239`, `analysis/analysisTreeCtrl.ts:77-94`), and **Mousetrap ignores `input`,
      `select`, `textarea` and `contenteditable` but NOT `<button>`** — so a focused square would trigger
      both handlers and the list would scroll while the cursor moved. **Candidate mechanism:
      `square.matches(':focus-visible')` as the gate — true for Tab focus, false for mouse focus, so the
      same mechanism that draws the focus ring decides whether to capture the arrows.** Needs real
      testing in Firefox and Chrome; the blunter fallback is overriding `Mousetrap.stopCallback`. **Same
      family as `pocketHotkeys.ts`'s global `1`-`9` bindings (task 1.6) — decide both together.**

      **Q1 addendum, 2026-10-10 (Nikolay's question: does the board need a heading, and can we tell
      how focus arrived?).** (a) **Heading: yes, with F** — lichess's blind mode has `h2 Board`
      right before its board; we have the string. Not before F, since the board is empty to a
      reader today. (b) **A heading jump moves the reader's virtual cursor, not focus**, so it
      triggers nothing; the user then Tabs onto the board (one tab stop). (c) **Detectable:** Tab and
      reader-driven focus give `:focus-visible`; a mouse click does not; a browse-mode Enter/Space
      arrives as a click with `event.detail === 0`. TalkBack's double-tap: unverified. (d) **The
      deciding question is the board's role:** plain buttons leave NVDA in browse mode (arrows
      swallowed until NVDA+Space, lichess's way), while `role="application"` or a grid makes NVDA
      switch to focus mode on Tab by itself. Leaning towards the automatic switch; test in Orca and
      NVDA first.

      **Q2. Pockets — research lichess's crazyhouse FIRST.** Not yet done; the tutorial section we read
      says nothing about pockets. Note we already have our user's own model, more specific than lichess's
      docs, and that `pocketRow.ts` renders pockets **outside `cg-board`**, so F(vi)'s grid does not cover
      them.

      **Q3. Bughouse — noted, explicitly not a priority** (the user never mentions it). With a roving
      tabindex per board, simul mode is **four tab stops**, not 128; a "go to other board" key would cut
      it further. No lichess precedent — they have no bughouse.

      **Q4. THE DECORATION IS DEBT WITH A KNOWN DESTINATION, and two things follow as conditions:**
      **(a) a unit test asserting our elements SURVIVE a `render()` call is mandatory** — it is the only
      thing between us and a silent failure on a chessgroundx upgrade, and a silent failure here tells a
      blind player a piece is somewhere it is not; **(b) it ships documented as TEMPORARY, with
      chessground named as its proper home** — per-square labels and keyboard navigation are board logic
      and belong inside the component, not bolted on by a consumer guessing at internals. Ship on top
      first (cheap, no coordination), then propose upstream to `gbtami/chessgroundx`. **Postponing the
      upstreaming is fine; leaving it undocumented is not** — the code carries a comment saying so.
- [x] 3.4f **SUPERSEDED by 3.4g** (closed 2026-10-10; kept for the record) — options A-E and naming the switch. Kept because A-E record what was
      weighed, and because 3.4g's hazard 4 may eventually argue for the fork after all. E is the one that dissolves the
      problem; B was recommended among A-D before E existed. Nikolay is not convinced any of A-D is good,
      which is the reason E was proposed.
- [x] 3.4d **DECIDED AND DONE 2026-10-11 (4PH), page by page with a preview each:** puzzle, lobby,
      players, editor, stats, games; profile already had its `h1`; round and analysis were done in
      4H1. **CANDIDATE B IS WIDER THAN WRITTEN — decide its scope.** Asked 2026-09-27: which pages
      besides the game page need headings? Measured by headings emitted per **client module**, since the
      busy pages are Snabbdom-rendered: **seven modules emit ZERO** — `roundCtrl.ts`,
      `analysis/index.ts`, `puzzleCtrl.ts`, `editor/editorCtrl.ts`, `profile.ts`, `stats.ts`,
      `games.ts`. Against `forum.ts` 9, `tournamentRR.ts` 7, `tournament.ts` 4, `inbox.ts` 3.

      **And the lobby is the worst case on the page everyone lands on:** `lobby.ts` emits 2 headings and
      **neither is a page section** — both are inside the create-game dialog (`:640` its title, `:915`
      an `h4` with no `h3`, which joins H5's level-skip list). So `#leaders`, `#winners`, `#spotlights`,
      `#streams`, `#variants-catalog`, `#corr`, the seek table and the blog strip are all unheaded. A
      screen-reader user presses `H` and gets nothing.

      **So B's scope is seven modules, not two, and the lobby deserves to be first on traffic alone.**
      Full addendum in `headings-and-landmarks-sweep.md`.
- [~] 3.4c **PARTLY ANSWERED 2026-10-10 — `pieceName()` (4CD.6, moved into `variants.ts` by
      4CD.6b).** Family tables now name every sibling of a named variant; the variants listed in
      4CD.6b still read their letter until their names are filled in.
      **Decide where the piece-naming table sits in the order.** 33 `pieceFamily` values,
      roughly 200-350 translatable strings, and the role letter is a valid fallback meanwhile. It
      gates nothing, but it is the difference between *"A8 black r"* and *"A8 black rook"*.
- [ ] 3.5 **At the end of the change, covering everything shipped, as a new `accessibility`
      capability (2026-10-24).** Write the spec delta for the shortlist only, and only then. The capability is unnamed
      until this point on purpose — see the proposal.

## 3b. BEFORE IMPLEMENTATION — three things that could still alter the plan

Raised by Nikolay 2026-09-27: *"before we go to implementing it, i will ask you some more things ...
lets write them down like something that could potentially alter our plans and we should do it first
before proceeding to implementation."* **These gate section 4. None is optional.**

- [x] 3b.1 **CLOSED 2026-10-24: what remained no longer matters (our draw offer is built, 4RA1).** **PARTLY DONE 2026-09-28 — folded into `lichess-reference.md` §§10–17.** Swept the live
      site in Chrome over CDP, first in normal mode and then the same pages in blind mode, and the
      findings are recorded: landmarks are identical in both modes (§11), blind mode is **+7 headings**
      and zero ARIA change, it **converts** six nav links to `h3` rather than adding them (§14), and it
      **requires a logged-in account** — the cookie alone does not work anonymously.

      **CORRECTED 2026-10-10: the live game WAS captured later, in `lichess-reference.md` §15** — two
      crazyhouse games, the command input's markup (§15.1), what is announced (§15.2), pockets
      (§15.3) and the `table` layout (§15.4). **Still missing (§17): a pending draw offer**, which needs
      a human opponent. The paragraph below is the original, superseded wording.

      **WHAT IS STILL MISSING, and it is the part the task was written for:** no **live game** was ever
      captured. The crazyhouse game never started, so every state that only exists while a game is
      playable is still unobserved — **the command input field's markup above all**, plus before the
      first move, after each side's move, a draw offer pending, game over, **pockets** (Q2), and the
      `table` board layout we have still never seen. Also unobserved: lichess's own `nvui` board in
      blind mode during play.

      Original brief, kept because it lists exactly what remains:

      **SEE THE REAL LICHESS PAGES, thoroughly — look for ideas we are missing.** Everything we
      have about lichess came from its tutorial's prose, its served HTML, and **one** rendered DOM of a
      *finished* game (`lichess-reference.md` §9). We have never seen a **live** game, and the command
      input field's markup has therefore never been observed — it only exists while a game is playable.

      **Method, and it answers Nikolay's question about whether he has to drive:** **he plays, I read.**
      Chrome's DevTools Protocol exposes `Accessibility.getFullAXTree`, which is **the accessibility tree
      itself — literally what a screen reader is handed** — as JSON. So the artifact to capture is the
      AX tree, not a screenshot and not the DOM. **I do not need to move the mouse**; he interacts and
      I dump the tree at each interesting state.

      States worth capturing: a live game before the first move · after his move · after the
      opponent's · a draw offer pending · game over · the analysis board · a crazyhouse game **with
      pockets** (Q2) · the board in `table` layout, which we have never seen (we only ever saw `plain`).

      **Chrome vs Firefox:** Chrome, for the CDP access. He is logged in on Firefox, so either he signs
      in on Chrome or we re-do the `POST /run/toggle-blind-mode` trick there — it worked over curl and
      will work in a browser session.
- [x] 3b.2 **CLOSED 2026-10-24: the live game and two-board pages were covered by 5.2 and 5.5.** **PARTLY DONE 2026-09-27 — see `tree-capture-sweep.md`.** Done better than asked: not the
      rendered DOM but **Chrome's computed accessibility tree** via CDP `Accessibility.getFullAXTree`,
      captured for 8 pages with `scripts/a11y_capture.py` / `a11y_audit.py` / `a11y_diff.py`.
      **Three answers change the picture:** (1) **15 navigation destinations are reachable from
      nowhere on the lobby** — Forum, Teams, Tournaments, Studies, Import game and 10 more;
      (2) the board contributes **zero** nodes — no square, no pocket, no move — so the board page is
      a variant dropdown and some download links; (3) six board buttons are named **"p" "l" "n" "o"
      "m" "s"** because `content: attr(data-icon)` leaks the raw letter into the name.
      **Zero live regions on all 8 pages.**
      STILL OPEN inside 3b.2: the logged-in UI (server ran without `-a`), and a live game / two-board
      page, so the positive-`tabindex` prediction T3 remains unverified.

- [x] 3b.2-orig **CLOSED with 3b.2.** **PARTLY DONE — superset of 3b.2 above; read that entry first.** Added 2026-09-28:
      `#settings` has now been captured **open** (Settings → Board Settings), which is what found the
      unnamed combobox now tracked as 4G.6 — a defect invisible in every closed-panel capture. Seven
      pages were also re-captured for the landmark inventory in 4G.5.

      **STILL MISSING:** `#notify-app` and `#challenge-app` in their opened state, the inbox and
      profile pages, both **two-board** pages, and a **live game** — so the positive-`tabindex`
      prediction (T3) remains unverified. Those need `server.py -a`.

      Original brief:

      **SWEEP PYCHESS'S REAL RENDERED DOM, not its source.** All twelve sweeps read source only,
      and `coverage-and-change-types.md` already names this as the largest gap: `#settings`,
      `#notify-app`, `#challenge-app` and both two-board pages are built by Snabbdom, so **nobody has
      seen the DOM they produce.**

      **What specifically to re-check against reality:**
      - The **client label count** — 44 flagged, roughly 1 in 3 a false positive on calibration
        (`alt-and-labels-sweep.md` L5). The rendered tree settles it exactly.
      - The **clickable-element classifier's** hits — it over-reports (three false positives in
        `profile-and-study-sweep.md` alone), and the AX tree shows what actually has a role.
      - **Whether `<move>` appears in the AX tree at all**, and as what.
      - **Whether chessgroundx contributes anything** — predicted: a few `<coord>` labels and nothing
        else. The AX tree either confirms that or overturns the change's central claim.
      - The **two-board pages**, where the positive-`tabindex` defect (T3) predicts tabs hoisted ahead
        of the document — visible directly in the tree's focus order.

      Same method as 3b.1, so the two can share a session.
- [x] 3b.3 **DECIDED 2026-10-11 (Nikolay): Orca's log plus Chrome's accessibility tree and real keys;
      hearing the speech is not required.** Orca 46.1 runs with speech disabled
      (`orca --replace -e braille-monitor -d speech --debug-file=…`); it presents only the X-focused
      window, so the evidence is the AT-SPI events it logs plus an AT-SPI dump of the page (the
      tree Orca reads), never a focus switch to the harness workspace. **ESTABLISH WHAT WE CAN ACTUALLY TEST WITH.** The tool Nikolay could not remember is
      **NVDA** — our user's primary, named in all three of their messages (`user-report.md` §2), with
      **JAWS** on Windows and **TalkBack** and **Jieshuo** on Android.

      **What is already on this machine, checked:** **Orca 46.1 is installed** (`/usr/bin/orca`), with
      `spd-say` (speech-dispatcher) and `libatspi` — so the accessibility bus a screen reader reads from
      is present and working. Orca is one of the four readers lichess's own tutorial supports.

      **Be honest about what Orca is worth: a PROXY, not the target.** It will catch structural failures
      — a missing label, no headings, an unreachable control — which is most of our worklist. It will
      **not** validate the thing our user actually described: **NVDA's browse/focus mode toggle**
      (`NVDA+space`), whose conventions Orca does not share. That is the mechanism F(vi)'s Q1 turns on.

      **So there are three separate jobs, and they need different tools:**

      | Job | Tool | Who |
      |---|---|---|
      | Read what the screen reader is handed | **CDP `Accessibility.getFullAXTree`** — text, authoritative | **me** |
      | Hear whether it is actually usable | **Orca**, already installed | **Nikolay** — real impressions |
      | Validate NVDA's focus-mode behaviour | **NVDA on Windows** — VM or a Windows machine | **open question: do we have one?** |
      | Validate Android | TalkBack / Jieshuo on a device | **open — and our user named both** |

      **Also to look into:** `accerciser` (the AT-SPI tree inspector, installable) for reading the tree
      outside a browser; and whether a browser extension helps — noting that the useful ones are
      *inspectors and auditors* (Chrome's Accessibility pane, axe DevTools, Accessibility Insights), not
      screen readers, since real screen readers are OS-level. **A checker finds violations; only a screen
      reader tells you whether the thing is usable.** We need both.

      **The last resort is the best one**, and it is already in the plan: **task 5.4 — offer it back to
      the user who wrote in.** They use NVDA, TalkBack and Jieshuo daily, and they are the only real
      acceptance test.

## 4. Build the shortlist

- [x] 4.1 **Filled from 3.4:** 4G, 4CD, 4H2, 4RA1, 4RA2 and 4RA3.1 done; E and F next, their task
      lists written when each starts.

### 4H2 and 4RA1 — the two small fixes before E. Ordered by Nikolay 2026-10-10.

- [x] 4RA2 **DONE 2026-10-10.** The move-list controls. The sweep said four of seven were unnamed; the
      tree said all six present were misnamed, as "p" "l" "n" "o" "m" "s" (R3): the icon font's
      glyph is content, and content beats `title` in the name computation. Fix in
      `movelist.ts`: the icons are `aria-hidden`, so the title names the button, and the four
      navigation buttons get titles from existing strings (First move, Previous move, Next move,
      Last move). Tree after: "Flip board", those four, "Switch boards" (alice), "Menu".

- [x] 4H2 **DONE 2026-10-10.** `templates/base.html`: `<html lang="{{ lang|replace('_', '-') }}">` —
      the locale codes use `_` (`zh_CN`, `gl_ES`), the attribute wants BCP 47's `-`. Verified by
      switching the session language: `en`, `de`, `zh-CN`, `gl-ES` served.
- [x] 4RA1 **DONE 2026-10-10.** The nine accept/decline controls in `roundCtrl.ts` (takeback offered
      and sent, draw, correspondence confirm, rematch) are `<button>`s from one `offerButton()`
      helper, named with existing strings (Accept, Decline, Cancel, Confirm) as both `aria-label` and
      tooltip. `round.css` resets the button look; the dialog measured identical to the old divs
      (same widths, heights, 46.8px row). Verified live with real keys: Enter declined a draw, Space
      accepted a takeback, Enter accepted a rematch. Correspondence confirm not exercised.
- [x] 4RA1.1 **FIXED 2026-10-10 (Nikolay: "make those fixes too").** After a takeback back to ply 0,
      both boards and summaries returned to the start but the move list kept showing `1. e4 e5`:
      `onMsgBoard` rebuilt the list only for `steps.length > 1`, and a takeback to the start sends
      one step. Now a takeback always rebuilds it. Verified live: white taking back at ply 2 empties
      both lists, a one-move takeback leaves `1. e4`, and play continues normally afterwards.
- [x] 4RA1.2 **FIXED 2026-10-10.** An arriving offer was not announced: `#offer-dialog` was no live
      region. All eight patches now go through one `offerDialog()` helper carrying
      `aria-live="polite"`, applied from the controller's first patch at page load, so the region
      exists before any offer arrives. Polite, so it waits for a move announcement to finish. The
      reader hears the buttons' names with the text ("Decline, Your opponent offers a draw,
      Accept"). Verified the attribute survives every offer and clear; **not yet heard in Orca.**

### 4G. Candidate G, started 2026-09-27 — the header, and site chrome. DOES NOT WAIT ON THE GATE.

Ordinary semantics, always on, benefiting every keyboard user. `collapsibles-sweep.md` F1/F1a/F2/F3.

**COMPLETE 2026-09-28.** Shipped: 4G.1 `:focus-within`, 4G.2 the six disclosure buttons, 4G.3 the
header panels, 4G.5 the `navigation "Site"` landmark, 4G.6 the Board Settings select's name — plus
`main` on the three client-rendered board views and names on the lobby's and players' `complementary`
landmarks. Closed without change: 4G.7 (ambiguity acceptable), 4G.8 and 4G.9 (parked, not an issue).
Deleted: 4G.4 (sighted-keyboard, out of scope). **Nothing in 4G waited on the gate at 3.4, and
nothing in it touched the board, chessgroundx or layout CSS.**

- [x] 4G.1 **`:focus-within` beside `:hover`** on `.topnav section .drp` (`static/site.css:1010`).
      Shipped in `4e7e6f04d`. Measured on the lobby: **8 of 31 focusable → 31 of 31.** WCAG 2.1.1
      Level A closed for keyboard. A tree capture straight after confirms it does NOT reach browse
      mode — `notRendered` still 550, submenu links still absent with nothing focused — because a
      screen reader in browse mode focuses nothing.

- [x] 4G.2 **DONE 0a724de98.** The six section titles become toggling disclosure buttons. DECIDED by Nikolay
      2026-09-27, choosing one control over the W3C APG's split pattern (link + sibling button),
      which was rejected for six extra tab stops on every page plus a visible caret.

      **Why a button at all, and why the click is lost.** A mouse user has two gestures — hover
      opens, click navigates. A browse-mode screen-reader user has ONE: activation. So a single
      control's activation is either navigate or toggle, and `aria-expanded` on a control that
      navigates is a lie. The destination survives: every section's URL is already its submenu's
      first item (`Play`→`/?any` is also "Create a game", `Learn`→`/variants` is also "Variants",
      `Watch`→`/tv`, `Community`→`/players`, `Tools`→`/editor/{v}`, `Puzzles`→`/puzzle/{v}`).
      It also **fixes touch**, where there is no hover and these menus are unreachable entirely.

      **4G.1 IS SUPERSEDED AND MUST BE REMOVED BY THIS TASK.** Focus-open plus activate-toggle
      fight: Tab opens, Enter immediately closes, and `aria-expanded` diverges from what is shown.
      `.open` becomes the single source of truth for the announced state. `:hover` stays for mice,
      and it is accepted that a hovered menu shows while its button still says `aria-expanded=false`
      — nobody hovering is listening to a screen reader, and driving ARIA from hover would announce
      menus to people who never asked.

      Reuse, do not invent: **`initLoginDropdown()` `client/main.ts:429-490`** already does all of
      it — `.open` class plus `aria-expanded` on click `:446`, outside-click `:458`, Escape `:471`
      with focus return `:472`. And the header **already contains a `<button class="nav-link">`**,
      the login button (`templates/template.html:90`), neutralised by `div button.login-btn`
      (`static/site.css:4494-4504`) — there is no global button reset, so copy that block.

      Seven element-keyed CSS rules stop matching once the title is a button and must be migrated:
      `site.css:810, 817, 850, 868, 894, 905, 920`. Note `:768 .nav-link:link, .nav-link:visited`
      sets the colour through link pseudo-classes a button never matches.

      **REJECTED ALTERNATIVE, built and measured 2026-09-27 — keep every submenu permanently in
      the tree.** Swap `.drp`'s `visibility: hidden` for `opacity: 0; pointer-events: none` and the
      links never leave the accessibility tree; no button, no lost click, no JS. It works
      mechanically — lobby exposed 296→372, interactive 47→70, all 23 links focusable, and ZERO
      focusable while invisible because `:focus-within` reveals the section as focus lands. It was
      still rejected, by Nikolay and on the evidence:

      - **It flattens structure.** 23 extra links on every page with no boundaries and no state,
        read as one run — including an audible stutter where a section title and its only item share
        a label (Puzzles, `template.html:24` and `:26`). A disclosure keeps the nav at 8 and lets the
        reader open what they want. Structure is better information than raw availability.
      - **It rests on a side effect rather than a contract.** `opacity: 0` staying exposed is engine
        behaviour; `aria-expanded` is a documented promise every reader implements.
      - **An untested flaw:** the closed menu requires `pointer-events: none`, and it was never
        verified that TalkBack's double-tap or NVDA's Enter survives that — on exactly the devices
        that motivate this work.
      - It would also force 4G.5 (the `nav` landmark) to become mandatory, since 23 unskippable
        links would sit before the main content of every page.

      **DESIGN, after review:**

      - **Rendered in Jinja, not client-side.** `start()` in `client/main.ts` runs only after an
        awaited `fetch` of `client.json`, so a client-built nav appears a round trip after paint and
        changes roles under a reader that has already built its buffer. `client/headerPanel.ts`'s
        docblock states the house rule: header controls ship in the initial HTML. `{% trans %}`
        labels move verbatim, so no new msgids. (The snabbdom hydration hazard that affects 4G.3
        does not apply — the nav is not snabbdom-rendered.)
      - **`aria-expanded` IS the state — no companion class.** CSS reads the attribute directly, so
        announced and displayed state cannot drift:
        `.topnav section > .nav-section[aria-expanded='true'] + .drp { visibility: visible; }`
      - **`:hover` stays** as a stateless preview. A hovered menu shows while the button still reads
        `aria-expanded="false"`; accepted, because nothing hovering is running a screen reader and
        the *latched* state — the only one a keyboard or AT interaction can produce — is always
        truthful. Add `mouseleave` → close so a clicked-open menu does not latch for mouse users.
      - **Nine CSS selectors break** when the title stops being an anchor: `site.css:768-771` (add
        `button.nav-link`; `:link`/`:visited` never match a button, so the six would render in the
        UA colour), `:810-816`, `:817-819`, `:850-856`, `:868-869`, `:920-922`, `:931-933`,
        `:988-990`, `:1010-1011`. Plus a reset block modelled on `div button.login-btn`
        (`site.css:4494-4504`) — there is no global button reset.
      - **TWO `:focus-within` selectors to delete**, `:869` and `:1011`, not one.
      - **`static/study.css:1231` is a second, independent copy** of the drawer CSS and needs the
        same rename, or the titles reappear in the study drawer at 800-979px.
      - **New `client/topNav.ts`**, modelled on `initLoginDropdown` (`client/main.ts:429-490`) but
        one delegated listener instead of four copies: click toggles this section and closes the
        others, outside click closes all, Escape closes and returns focus to the button, `mouseleave`
        closes. Wire it in `client/main.ts` **outside `start()`**.
      - Watch: `div.topnav section:hover` (`site.css:935`) is tag-qualified and dies silently if
        4G.5 later changes `.topnav` to `<nav>`; `type="button"` on all six, since the header
        contains a `<form class="search-bar">`; `aria-controls` is largely ignored by NVDA, so add it
        as correctness but expect the win from `aria-expanded` alone.

- [x] 4G.3 **DONE 3b4fcfd84.** The three header panels announce their state (F3) — the inconsistency Nikolay raised:
      the nav drops open on focus while `#btn-settings` says only "push button". `aria-expanded` +
      `aria-controls` on `#btn-challenge` / `#btn-notify` / `#btn-settings`.

      The `shown` class is already the "is open" marker and is set at **seven sites across four
      files** — `settingsView.ts:48,53`, `notifyView.ts:320,341`, `challengeView.ts:277,306` and
      **`gameCategoryIntro.ts:26-36`, a fourth open path that bypasses `showMainSettings()`** and
      would silently go stale. One shared helper, seven call sites routed through it.

      **As built:** `setHeaderPanelExpanded()` in `headerPanel.ts` sets the class and the attribute
      together, and `gameCategoryIntro` calls `showMainSettings()` rather than re-implementing it —
      the duplication is deleted, not patched. The attribute is written in BOTH the Jinja template
      and the snabbdom `attrs` map, because `updateAttrs` strips any attribute missing from the new
      vnode, so a template-only one dies at hydration (verified surviving). Writing it imperatively
      afterwards is safe because the buttons are rendered once and never re-patched — each
      `redraw()` patches only the inner panel and updates `aria-label` by hand for that reason.
      Orca: *"Settings collapsed push button"* → Enter → *"expanded"*.

- [x] 4G.5 **DONE.** `templates/template.html:11` `<div class="topnav">` →
      `<nav class="topnav" aria-label="{% trans %}Site{% endtrans %}">` (and its close at :71), plus
      `static/site.css:948` `div.topnav section:hover` → `.topnav section:hover` — the `div`
      qualifier would have stopped matching and the hover background would have died silently. It was
      the ONLY `div`-qualified topnav selector; every other rule in `site.css`, `study.css` and
      `two-boards/override-commons.css`, and both client selectors (`topNav.ts:19`,
      `main.ts:343`), were already unqualified. Nothing in `tests/` referenced it.

      **Measured after the change** — `navigation "Site"` now on every page type:

      ```
      /                     banner, navigation"Site", form, main, complementary"What's up", complementary"New game"
      /players              banner, navigation"Site", form, main, complementary"Players online", complementary"Leaderboards"
      /variants             banner, navigation"Site", form, main, complementary
      /analysis/crazyhouse  banner, navigation"Site", form, main, complementary
      /editor/crazyhouse    banner, navigation"Site", form, main, complementary
      /puzzle/crazyhouse    banner, navigation"Site", form, main, complementary
      /faq                  banner, navigation"Site", form, main, complementary
      ```

      **Regression checks, all measured, none inferred:** `.topnav` resolves to `NAV`; section hover
      background still changes (`rgba(0,0,0,0)` → `rgb(60,57,52)`); submenu still goes
      `hidden` → `visible` on hover; the inset box-shadow is intact; and the 4G.2 disclosure still
      sets `aria-expanded=true` and reveals on click. 1312 Python tests OK, 40 simul tests pass.

      **2026-10-10, label REMOVED, and the side-panel names reworded to existing msgids.** "Site"
      had no translation anywhere, and 4G.9 found only one navigation landmark per page, so
      plain "navigation" is unambiguous. Panel names: players `Online` and `Leaderboard`, lobby
      `Create a game`; lobby `What's up` kept as the one tolerated new string (no existing
      alternative). The paragraph below is the original reasoning.

      **Named, where lichess does not.** Theirs is `<nav id="topnav">` with no label. Ours gets
      `aria-label="Site"` because some of our pages carry a second `<nav>` (`following.html:38` and
      friends are labelled "Pagination"; `team-menu.html:1` and `variants.html:137` are NOT), and an
      unlabelled pair reads as "navigation, navigation" — exactly the defect lichess has on
      `/analysis` and `/variant/crazyhouse`. The name omits the word "navigation" because the role
      already supplies it. Labelling those two remaining `<nav>`s is a small follow-up.

- [x] 4G.6 **DONE 2026-09-28.** The Board Settings variant select had NO accessible name. `client/settingsView.ts:248`
      is the only `<label>` in the entire client written `props: { for: ... }`; all ~30 others use
      `attrs:`. Snabbdom's `props` module assigns `elm[key] = value`, and a label's reflecting DOM
      property is **`htmlFor`, not `for`** — so that line sets a junk own-property and no `for`
      attribute is ever emitted. Measured on the live label:

      ```
      { text: 'Variant', hasForAttr: false, forAttr: null, htmlFor: '',
        expando: 'settings-variant', control: null }
      ```

      `label.control === null`: associated with nothing, so a 59-option combobox is exposed unnamed.
      WCAG 4.1.2. The fix is `props:` → `attrs:`, one word.

      **Applied after being reverted once, deliberately.** Found 2026-09-28 while measuring for a
      question about landmarks, implemented on the spot in `40edb4fde`, and reverted by Nikolay: a
      defect found while measuring gets written down here and done in sequence, not fixed mid-task.
      It was then decided in on its own turn, which is the whole point of the rule.

      **Severity, stated honestly, because it was oversold first time:** minor. The visible word
      "Variant" precedes the control, so a browse-mode or swipe user reading linearly gets the context
      anyway. It bites when tabbing straight to it in focus mode (the announcement is the name alone)
      and when listing form controls, where it appears unnamed among named ones. Re-measured after the
      fix: `control: 'settings-variant'`, and the tree shows `combobox "Variant"`. Gates: lint,
      typecheck, md, test (94 suites / 775 tests).

      **It also exposes a hole in our method:** the Settings panel was CLOSED for every capture in this
      change, and this defect is only visible open. Every panel we have measured closed looked clean.
      See the same point in `tree-capture-sweep.md` under "What this sweep does not cover".

- [x] 4G.7 **CLOSED 2026-09-28 as acceptable — no change made.** 4G.6 leaves two comboboxes both
      named `"Variant"`: `#variant` in the aside picks the variant to **analyse**, `#settings-variant`
      picks whose **piece style you are editing**. Measured together with the Settings panel open:
      `comboboxes exposed = 2; named exactly 'Variant' = 2`.

      **Nikolay's decision, and the reasoning:** use the name we already have a translation for. The
      second control sits inside collapsible elements (Settings → Board Settings), so a user reaches
      it through that structure and can tell the two apart by where they are — by the surrounding
      context in browse mode, or by what they passed through when tabbing. A distinction sighted users
      get from position does not justify a new translatable string.

      **This also supersedes 5b.3**, which asked for a name. There is no name to pick.

- [x] 4G.8 **PARKED 2026-09-28 by Nikolay — not an issue. No change.** No page has a `<footer>`;
      the lobby is the only page with footer content — ten links (Discord, Github, YouTube, FAQ, Stats,
      About, Friendly sites, Contact, Terms, Privacy) at `client/lobby.ts:2293-2302`, inside
      `div.lobby-links-block` → `div.tv` → `main`, so in no landmark. It would be one landmark on one
      page, it sits inside `main` where `contentinfo` is discouraged, and `div.tv` also holds the
      patron link, the TV game and blog posts, so only the inner block would qualify. lichess ships no
      `contentinfo` either. Not reopened without a reason.

- [x] 4G.9 **PARKED 2026-09-28 by Nikolay — not an issue. No change.** The premise did not hold:
      `/variants`, `/teams`, `/`, `/players` and `/faq` each expose **exactly one** navigation
      landmark, `'Site'`. `variants.html:137` is pagination behind
      `{% if community_variants.pages > 1 %}` and never renders on our data; `team-menu.html:1` did not
      appear on `/teams` anonymously and is presumably login-gated, the same `-a` gap that hides
      `#notify-app` and `#challenge-app`. Two unlabelled navigation landmarks never co-occur on any
      page measured, so there is nothing to disambiguate.

**Verification for all of 4G** — gates (`yarn typecheck` only after deleting `tsconfig.tsbuildinfo`;
an incremental run reported green over a syntax error on 2026-09-27), then: capture the tree closed
and expect six `button` nodes with `expanded=false`; click one over CDP, re-capture, and
`scripts/a11y_diff.py` the pair — only that section's submenu should move from absent to exposed;
walk it by keyboard; confirm hover is visually unchanged; and **Orca is the acceptance test** —
expect "Play collapsed button", then Enter, then "expanded".

**Risk pinned:** `tests/test_following_page.py:69` asserts the exact string
`<a class="nav-link" href="/@/owner/following">Friends</a>`. That is a submenu link, so converting
titles is safe — but do not touch `.drp` children.

### 4CD. Candidates C and D — the board summary. Chosen by Nikolay 2026-10-10.

Lichess's nvui text blocks, always on and visually hidden instead of mode-gated. One widget,
`client/accessibility/boardSummary.ts` (`BoardSummaryView`), owned by every `GameController`, so
single-board pages get one and each two-board board gets its own.

- [x] 4CD.1 **Built.** Sections, all text: *Pieces* (per colour, one line per role, squares in file
      order), *Pockets* (counts; only for pocket variants), *Last move* (SAN, `aria-live`,
      "Initial position" before any), *Status* (`role="status"`, `result()`'s sentence; only when
      there is a game). `.sr-only` in `site.css` hides it.
- [x] 4CD.2 **Per page, as lichess does:** round `assertive`, analysis `polite`, declared by the page's
      placeholder. Two-board: ids `board-summary-a/-b`, an `h2` "Board A"/"Board B" over each, and
      the status only on the viewer's own board (A for spectators), so a result is spoken once.
- [x] 4CD.3 **Hooks.** Single board: `GameController` constructor (first paint — lichess's deep-link
      bug, 15.6), `goPly`, the end of round `onMsgBoard` (the live path sets the board itself), the
      analysis tree path and local non-tree moves. Two board: `renderState()`, last move looked up
      per board from `steps` up to the move-list cursor, or from the tree's active line on analysis.
- [x] 4CD.4 **Verified live 2026-10-10** in the harness by dumping the summary over CDP: crazyhouse
      analysis (moves, capture to pocket, history), crazyhouse round between two windows (opponent
      move on both sides, drop `P@e6`, resignation), finished bughouse round (history on both
      boards), bughouse analysis (moves on both boards, variation-free history), and a live
      four-player bughouse game through to a two-player resignation. **Not yet heard in Orca.**
- [x] 4CD.5 **Follow-ups done 2026-10-10.** Colour headings say their section ("Pieces: White"),
      so they make sense out of order in a headings list. Pieces squares follow the variant's
      notation for shogi (`76`, files from the right) and janggi (`83`, rank from the top, 10th is
      0), checked against Fairy-Stockfish on 180 moves; xiangqi stays algebraic, since WXF names no
      squares. Puzzle pages carry the summary too (`polite`; not checked on a real puzzle, the local
      db has none). The 1px hidden box was measured to change no page's scroll size; a 0x0 box gives
      an identical Chrome tree, but 1px stays as the standard practice (TalkBack untested).
- [x] 4CD.6 **Piece names through one adapter, `client/pieceNames.ts`.** `pieceName(variant, role,
      color)` tries the variant's `pieceNamesByColor`, then its `pieceNames`, then a family table
      (chess for standard/capa/seirawan/shogun/orda, xiangqi for xiangqi/janggi), else the letter.
      Table entries are written with `_()` (the usual marker) and `pieceName()` translates them
      again when shown, which is what makes them translated: the tables are built before the
      translations load. This also fixes the old `pocket.pieceNames`, translated only at load.
      (A no-op `N_()` marker was used first and dropped at Nikolay's review, 2026-10-11: one
      convention, `_()`, everywhere; the real fix is `translations-before-bundle`.) Bughouse's and supply's
      tables became redundant, makbug's moved; community variants keep their authors' names.
      Filled from the rules pages: shogi, shogun, seirawan, capablanca, capahouse, grand, orda
      (crazyhouse is covered by the chess table). Consumers: the summary and the bughouse chat
      presets. **No other built-in variant has player-facing names anywhere machine-readable** —
      `variants.ini` and the server's `PIECE_OPTION_NAMES` hold engine movement types — so the rest
      read their letter until someone fills them in.
- [x] 4CD.6b **Folded into `variants.ts` at Nikolay's review, 2026-10-18** — `pieceNames.ts` won
      nothing. Shared tables (`CHESS_NAMES`, `CAPA_NAMES`, `GRAND_NAMES`, `SEIRAWAN_NAMES`,
      `MAKRUK_NAMES`, `XIANGQI_NAMES`, `SHOGI_NAMES`, `SHOGUN_NAMES`, `ORDA_NAMES`) sit on the
      `PIECE_FAMILIES` entries; `variant()` merges the family's names under the variant's own, so a
      variant names only what differs (grand and grandhouse point at `GRAND_NAMES`; shoshogi adds
      its drunken elephant and crown prince; orda keeps `pieceNamesByColor` for the khan).
      `FAMILY_TABLES` is gone and `pieceName()` lives in `variants.ts`. Siblings that had read
      letters are now named: shouse, grandhouse, embassy(house), gothic, gothhouse, minishogi,
      gorogoro(plus), shoshogi, makruk, makrukhouse, makpong, cambodian, plus dragon, shako and
      asean (all from their rules pages; embassy has none and takes capa's, as its tooltip says
      "like Capablanca"). **Still letters**, each needing its own names from its rules page:
      shatranj, hoppelpoppel, sittuyin, manchu's banner, makruk's promoted `m~`, kyoto, dobutsu,
      tori, yokai, cannonshogi, xiangfu, borderlands, cwda, khans, synochess, shinobi(plus),
      empire, ordamirror, chak, chennis, spartan, mansindam, ataxx.

### 4RA4-6. Chat — decided by Nikolay 2026-10-10: like lichess, everywhere.

Lichess (`ui/lib/src/chat/discussion.ts`) has one chat component for games, tournaments, studies
and teams: `<ol role="log" aria-live="polite" aria-atomic="false">` with one `<li>` per line, so
every chat is a list announced politely; presets are ordinary text lines; `c` focuses the input.

- [x] 4RA4-6.1 **DONE 2026-10-10**, in the one shared `chat.ts`, so round, analysis, bughouse,
      tournament, round-robin and simul chats all change together:
      - **RA4** the list: the inner `div#messages` is `role="none"`, so the `<li>`s are the `<ol>`'s
        items (tree: `list > listitem`). The three full-chat rebuilds keep the role.
      - **RA6** announcement: `aria-live="polite" aria-relevant="additions"` on the `<ol>`. Kept as
        a list rather than lichess's `role="log"`, which would drop list navigation.
      - **RA5** the input is named `_('Chat')` (existing string; it read the hardcoded English
        "Chat input").
      - **History is not news:** our chat refills by appending on every load and reconnect, which a
        live list would read out in full. The four refills (round, tournament, simul, the bughouse
        history rebuild) add their lines with `chatMessage(…, history = true)` (`chatMessageBug`
        likewise), which sets the list `aria-live="off"` before adding the line; any other message
        sets it back to `polite` first. **Changed 2026-10-11 at Nikolay's review:** it was a
        `replayingChat()` with a one-second timer, which also swallowed a real message arriving
        just after a reconnect and needed its own mock in `aliceBoardSwitch.test.ts`. Measured with AT-SPI events (Orca decides politeness from the event
        source's `container-live`, read when it handles the event): a reload's whole refill arrives
        `off`, the next typed message `polite`. Rejected on the way, both measured: `aria-live="off"`
        on each history item (Chrome also reports the insertion from the list, which is `polite`)
        and replacing the list element (a fresh `polite` list is announced like the old one).
        Not measurable here: Windows screen readers, where Chrome itself decides.
      - **Bughouse presets** were an empty CSS icon to a reader; they now carry `role="img"` and the
        label of the preset button ("Need queen", "Don't give knight", "Sit/stall"), from one
        `presetLabel()` that the buttons also use. When a partner's preset arrives, its recorded
        voice clip and the screen reader both say it — accepted by Nikolay.
      Verified live: a typed message reaches the other player as a `listitem` in a `list`
      `live=polite`; three presets arrive named; the tree names the input "Chat". **Not yet heard.**

### 4H1. Headings on game pages — the minimal set, chosen by Nikolay 2026-10-10.

Lichess's normal game page has no headings at all (§12.1); its blind mode is organised by them
(§15.1). The board summary already supplies the state headings, so only the jump targets it lacks
were added — visually hidden (`srHeading()` / `pageHeading()` in `view.ts`), no new strings:

- [x] 4H1.1 **DONE 2026-10-10.** An `h1` on every round and analysis page, single and two-board,
      reading the server's tab title ("Crazyhouse • Alice vs Bob", "Analysis" on a bare board).
      Single-board round: `h2` Moves, Actions, Chat. Single-board analysis: Moves, and Chat when the
      page has one. Two-board round: Actions; its Moves and Chat are already named tabs. Verified by
      tree capture on four page types; scroll size unchanged with and without them, portrait
      included. **Not done: headings on the lobby and other pages (3.4d).**

### 4LB1. Accepting a seek by keyboard — done 2026-10-10.

- [x] 4LB1.1 Lichess gets this wrong too (`<tr role="button">` with no `tabindex`, §11.3), so the
      standard pattern instead: the row's first cell, the colour icon, is a `<button>` inside the
      table, so the table keeps its headers. It has no handler of its own — Enter/Space click it and
      the click reaches the row's existing one, so mouse and keyboard share one path. Named from
      existing strings: "Join: Alice, 5+3, Crazyhouse", or "Cancel: 5+3, Crazyhouse" on your own
      seek. `site.css` resets the button look and highlights the row while its button has keyboard
      focus. Verified: cell width, row height and icon position identical to the old markup; a real
      Tab lands on it, Enter joined a game, Space cancelled an own seek. Bughouse seek rows already
      had real Join buttons per seat.

### 4T1-3. Tab lists: buttons, like lichess — decided by Nikolay 2026-10-10.

**Arrow keys were built first and withdrawn.** They needed a key handler, and it broke an existing
behaviour: clicking a tab focuses it, after which Left/Right switched tabs instead of stepping
through the moves. No screen reader announces the arrow convention, and in browse mode users reach a
tab with the reading cursor and press Enter anyway. Lichess's tabs are plain
`<button role="tab">` — every tab a Tab stop, Enter/Space native.

- [x] 4T1-3.1 **DONE 2026-10-10.** The lobby, analysis and two-board tabs are
      `<button role="tab" class="site-tab">`, with no `tabindex` and no key handling: T1 (lobby tabs
      unreachable) and T3 (two-board tabs and panels with positive `tabindex`, hoisted ahead of the
      page) are both gone. `site.css` styles `button.site-tab` beside every `span[role=tab]` rule,
      plus a reset; swapped in place against the old span, every tab measured identical (position,
      size, font, colours, underline) on the lobby, analysis, bughouse round and bughouse analysis,
      landscape and portrait. Also fixed: the analysis "Move times" tab was hard-coded
      `aria-selected=true` while another tab opened; the initial tab is marked `data-initial`, no
      longer by `tabindex`. Verified with real keys: Tab reaches each tab, Enter and Space select,
      Left on a focused tab still steps the moves, a first Tab on a bughouse page reaches the header.

### 4F2-4. The two menu buttons that hid their state — done 2026-10-10.

- [x] 4F2-4.1 **F2:** the mobile menu's hamburger was a `<div>`, unreachable by keyboard. It is the
      `<button>` the "hamburgers" stylesheet was written for (its inner divs are spans, as a button
      may not contain divs), named "Menu" and carrying `aria-expanded` / `aria-controls="site-nav"`,
      kept in step by its click handler. "Menu" is new to the server catalog (the client has it).
      Verified on the 386px portrait window: the first Tab lands on it, Enter opens (25 links),
      Space closes; geometry identical to the old div. **F4:** the analysis/puzzle "Menu" button
      (`#bars`) now carries `aria-expanded`, set by `toggleSettings()` and at render; verified
      false → true → false with Enter.
- [x] 4F2-4.2 **FIXED 2026-10-10.** On mobile the CLOSED menu's links were only moved off-screen
      (`transform`), so Tab walked through 25 invisible links and the page's content began at Tab
      stop 31. `site.css` (below 800px only) gives closed links `visibility: hidden` and transitions
      visibility with the slide, so they still animate out. Measured on the 386px window: closed 0
      reachable, content at stop 6; open 25; mid-close still visible. Desktop unchanged (8 items).
      **Test-bed note:** the harness windows sit on a hidden workspace, where Chrome does not advance
      transitions, so a visibility transition there never finishes until the animations are
      finished by hand (`document.getAnimations().forEach(a => a.finish())`).

### 4T4-6. Focus rings removed for everyone — done 2026-10-10.

- [x] 4T4-6.1 `site.css` removed the browser's focus ring outright in places, so a sighted keyboard
      user could not see where focus was — on Draw/Resign above all. Each removal now applies only to
      mouse focus (`:focus:not(:focus-visible)`), the pattern `study.css` already uses: mouse users
      see what they saw, keyboard users get the browser's ring. **T4** `.btn-controls button` (game
      controls and move-list buttons), **T5** `button.icon`, plus two found while looking: `.slider`
      and the textarea in a tab panel (a text field counts as keyboard-focused even when clicked, so
      it now shows the ring either way — the browser default). **Not changed, already visible:**
      the header search (T6) expands on focus since 4G, and the username field recolours its border.
      Verified: "First move" by Tab shows the ring (screenshot), by mouse click none; the time slider
      the same. Not exercised individually: `button.icon` (same rule shape as T4), the textarea.

### 4SB. Settings — done 2026-10-10.

- [x] 4SB1 **323 unnamed board-theme and piece-set radios.** Each label is a picture with empty
      text. The radios now carry the style's raw identifier as `aria-label`: the board file
      ("8x8brown.svg") or the piece CSS name ("cburnett"); the letters and invisible sets, which
      have neither, stay unnamed. **Changed 2026-10-11 at Nikolay's review:** a `styleName()`
      heuristic that made "brown" / "US Open Board" out of those was dropped as hackish. A
      readable, translatable name would need real metadata per style; future option, not planned.
- [x] 4SB3 **Untranslated `aria-label`s**, which replace the announced name: the header's Search
      (also its visible placeholder), Settings, Administration, Challenges: N, Notifications: N;
      the analysis tab list (now "Analysis"); the lobby tab list (label dropped, optional, no
      translation existed); the authors, friendly-sites, admin and Betza-legend pages. Reused
      existing strings where they existed; new: Challenges and Notifications (server), Notifications
      and Settings (client), Administration and the four page labels. Verified in a Turkish
      session ("Ara", "Ayarlar"); German has those msgids untranslated today.
- [x] 4SB2 **Escape for the header panels, by unifying the header dropdowns.** Three copies of the
      same dismissal — the nav menus (`topNav.ts`), the login chooser and the Settings,
      Notifications and Challenges panels (`main.ts`) — are one now: `registerHeaderDropdown()` in
      `headerPanel.ts`, a single click-outside and a single Escape listener (Escape closes and
      returns focus to the button). Each control keeps its own opening. The panels gained Escape,
      which they never had. Verified with real keys on Settings, Notifications and Play; opening one
      closes another; a click outside closes all. **Not verified live: the login chooser**, which
      the harness never shows (`server.py -a` makes every visitor a logged-in test user).

### 4TN. Tournament pages — done 2026-10-10.

What is there: arena/Swiss pages have no modal — the "dialog" is the player panel a standings row
opens; round-robin has one true modal, game scheduling; the live games (`div.duels`) are real links
already, so keyboard-reachable (each holds the players' profile links inside it — nested links,
invalid but harmless to keys).

- [x] 4TN.1 **TN1, standings rows:** the rank cell holds a `<button>` named after the player; its
      click reaches the row's existing handler (the LB1 pattern). No `aria-expanded`: the table is
      not redrawn when the panel toggles, so it would go stale.
- [x] 4TN.2 **The player panel's game rows:** the same pattern, named "Open game: <opponent>".
- [x] 4TN.3 **TN4, the closes:** the three `<span class="close">` — arena player panel, round-robin
      scheduling modal, the lobby's create-game dialog — are buttons named "Close"/"Cancel" (the
      icon font's "j" would otherwise be the name). Their red highlight is now keyboard-focus only
      (`:focus-visible`): the native dialog focuses its first control on opening, which turned the
      lobby's close red for mouse users.
- [x] 4TN.4 **The top game** was a `<div>` with a click handler; it is a real link now (no script),
      named "Open game: <black> – <white>".
- [x] 4TN.5 **Found here: the pager's buttons** (First/Prev/Next/Last/Scroll to your player) carried
      their titles on the icon, the RA2 defect again; the title is on the button, the icon hidden.
- Verified on a live arena (`UCa8BBRV`, three windows, one game paired): Tab → a player's button →
  Enter opens the panel → Enter on Close closes it; every converted element measured identical to
  its old form in place (rows, cells, close, top game incl. pocket padding).
- [x] 4TN.6 **Opening a player's panel is now announced** (2026-10-11): `#stats` is
      `aria-live="polite"`, so Enter on a row reads "1. <player> Performance … Games played …"
      without moving focus. A static attribute, no logic.

### 4L. Labels — done 2026-10-10.

- [x] 4L.1 **L1:** `arena-new.html`'s "Byoyomi periods" label pointed at an id that does not exist;
      it names its select now (`label.control` resolves). **L2:** the memory game's four
      background radios used `label=`, which is no attribute on `<input>`; they carry `aria-label`s
      (zen, kinkaku, oak, zen2 — style names). **L5:** the lobby's four rating-range sliders (seek
      dialog and auto-pairing) are named "Rating range −" / "Rating range +", matching the
      "-1000 / +1000" beside them, from the existing "Rating range". **PE2:** the editor's FEN field
      had no name, and the lobby's FEN field only its placeholder; both are named "FEN" (the
      notation's own name, not translated). Verified in the browser on all four pages.

### 4PE3. Links that were not links — done 2026-10-10.

An `<a>` without `href` is not focusable, has no link role and ignores Enter. **Buttons were
measured first and rejected:** swapped in place on the editor and analysis pages they changed
height, padding, background, border, radius, font and alignment; `href="#"` changed nothing.
Nikolay chose `href="#"`, with `event.preventDefault()` in each handler so the `#` is never
followed — the forum's "cancel edit" link already does exactly this.

- [x] 4PE3.1 **19 of the 21 converted:** the editor's whole control strip (9), analysis Download
      PGN / Copy UCI / PNG image / Delete game (4), the two "Go deeper" engine links (also given an
      `aria-label`: icon-only, so the glyph would name them), puzzle Hint / View the solution /
      Continue training (3), and the zen-mode exit (1). Verified with real keys: Tab reaches Flip,
      Enter flips (the king moves) without changing the address or scroll; Clear and Analysis board
      act; with zen mode on, the first Tab lands on the exit and Enter leaves zen mode — before,
      a keyboard user could not get out of it from the page.

### 4PE1. Puzzle feedback, spoken — done 2026-10-10.

- [x] 4PE1.1 The puzzle's feedback ("Best move!", "Try something else.") was replaced silently. It now
      also goes to the board summary's **Status** line (polite, as lichess's puzzle status is), so it
      is announced: the start ("Your turn. Find the best move for White."), each wrong move
      ("Ra3? That's not the move! Try something else."), each right one ("Best move! Keep
      going..."), the end ("Success!" / "Puzzle complete!"). Not an attribute on `.feedback`:
      completion replaces that element, and text inside a freshly inserted element is usually not
      announced. Two gaps found while testing, fixed: puzzle moves bypassed the summary, so the
      computer's reply was never reported (`makeMove` updates it now: "Kg8"); and a puzzle solved
      after a wrong move shows no text, so its status falls back to "Puzzle complete!". Verified on
      a test puzzle inserted into the local database (1. Ra7 Kg8 2. Rb8#), removed afterwards.
- [x] 4PE1.2 **Done in 4Q.2.** **Found:** the vote buttons after a puzzle (`div.vote` thumbs up/down, "Vote to load
      the next one!") are clickable `<div>`s — not reachable by keyboard. "Continue training"
      (4PE3) is the keyboard way on meanwhile.

### 4Q. Quick fixes — done 2026-10-10.

- [x] 4Q.1 **L3:** the tournament form's read-only "Start date" / "End date" labels name their fields
      (`for` + `id`). **L4:** three team-page fields named only by a placeholder carry it as an
      `aria-label` too (admin moderation note, declined-requests search, add a leader).
- [x] 4Q.2 **Puzzle votes** (found in PE1): the 👍/👎 `<div>`s are `<a href="#">` with
      `preventDefault()`, named "👍" / "👎" — a screen reader reads the emoji's name in the
      reader's own language, so no new strings. Measured identical to the old divs; a vote by
      keyboard (Tab, Enter) is recorded (test puzzle, `u: 1`) and loads the next puzzle.
- [x] 4Q.3 **PF2 — built, measured, then REMOVED by Nikolay; now a known limitation.** Highcharts'
      accessibility module gave the statistics chart a hidden description and keyboard navigation,
      pixel-identical on screen, but cost ~40 KB gzipped (139 KB minified) in the one bundle every
      page loads, for one chart, with an untranslated English description. Not worth it. See 6.
- [x] 4Q.4 **IB1 — dropped by Nikolay; a known limitation.** A live region on the conversation would
      read the whole history on every message (it reloads through "Loading..."); the alternative,
      an announcer built from the sender and the message, was ~15 lines of new behaviour. See 6.
- [x] 4Q.5 **A1 (2026-10-11):** the About logo and the lobby's fairy and army illustrations are
      decoration under their own headings, so `alt=""` (without it readers announce the file name).
      The profile trophy image is the trophy's only content, so its `alt` is the same text as its
      `title` ("Crazyhouse Top 10!") — no new string. Verified: the three in the live DOM, images
      unchanged; the trophy by rendering the template block (no local profile has a trophy).

### 4FR. Native dialogs: forum, round-robin, alerts — done 2026-10-10.

- [x] 4FR.1 **FR1:** the forum's relocate and delete modals are `<dialog>`s opened with
      `showModal()`: focus moves in (Cancel), Tab stays inside, Escape closes, the page behind is
      inert. One shared `modalDialogHooks` (`client/document.ts`) opens it on insert and calls
      `close()` on destroy, so the browser returns focus to the button that opened it.
- [x] 4FR.2 **The round-robin arrangement modal** (was 4TN.6's Escape item): the same conversion;
      its outside-click close is kept.
- [x] 4FR.3 **Found while testing FR1 — FR5: the forum post's buttons (Edit, Delete, Quote, ...)
      could not be reached by Tab.** They were `visibility: hidden` until hover, and hidden elements
      are skipped. Now `opacity: 0` until the post is hovered **or holds focus** — identical for mouse.
- [x] 4FR.4 **Found while converting the round-robin modal: `alertDialog` would have opened behind it**
      (a plain `<div>`, inert under a modal). Converted to a native dialog exactly as upstream did
      `confirmDialog` (7c6b214e6). Looks the same; OK takes focus, Enter/Escape close, focus returns.
      `pasteImport.test.ts` stubs `showModal`/`close` (jsdom has neither), as `confirmDialog.test.ts` does.
- Verified: forum delete modal by real keys on a live post (Tab → Delete → Enter → Escape, focus
  back on Delete; then deleted the post by keyboard); replica measured identical as `<div>` and
  `<dialog>`. Round-robin: `test_gui.py::test_round_robin_full_browser_flow` passes (opens the
  modal, picks a date in its inline calendar, clicks its buttons). Alert: invalid PGN on `/paste`.
- [x] 4FR.5 **Dropped 2026-10-11 (Nikolay): moderator-only pages are not verified.** The relocate modal (moderators only; same hooks as delete).

### 4FR4. Forum and inbox fields; tournament top games — done 2026-10-11.

- [x] 4FR4.1 **FR4, checked in Chrome's accessibility tree** (the sweep could not tell from source):
      the new-topic Subject and Message were already named. **Two real defects:** the post-edit box
      had no name at all (now `aria-label` "Message"), and **the reply box had none either** — its
      "Message" label was `display: none`, which removes it from the name too; it is `.sr-only` now
      (the CSS rule deleted), measured at the identical spot. Three placeholder-only fields (forum
      search, inbox "Type username…", the inbox message box) carry the placeholder as `aria-label`
      too, as L4 did; the inbox one's state-dependent text moved into one `composePlaceholder`.
- [x] 4FR4.2 **Tournament "Top games" (`div.duels`).** Each live game is a link around two lines
      laid out as a 2x2 grid: line one is white's name + **black's** rating and rank, line two
      white's rating + black's name, so it reads right on screen but a screen reader heard each
      rating next to the wrong player. The link is now named "Open game: <white> – <black>", like
      the top board (4TN.4). **Left:** the player names inside it are links too — nested links,
      invalid HTML but harmless to keys (3 Tab stops per game); un-nesting changes how it looks
      and clicks. **Not exercised live:** no running games in the local arena.

### 4RA7. Engine lines by keyboard — done 2026-10-11.

- [x] 4RA7.1 **RA7:** each engine line (`<pv-san>`, on the analysis and two-board analysis pages) was
      clickable but had no role, no Tab stop and no Enter. Now `role="button"` + `tabindex="0"` +
      Enter/Space, through one helper `pvLine()` in `client/view.ts`. Not a `<button>`: the line
      ends in a CSS ellipsis, which a button would clip. One Tab stop per line (1-5), not per move.
      Its name is the line itself, "1. e4 c5 2. Nf3 …", so the move it plays is heard first.
- [x] 4RA7.2 **Focus stays on the line after playing.** Every new position cleared the lines to a
      "-" placeholder and destroyed the focused element; the placeholder (`pvLinePending()`) is now
      the same `pv-san` element, so Enter, Enter, Enter walks the engine's line while the board
      summary announces each move. Measured: the "-" sits at the identical spot.
- Verified live on `/analysis/chess`: Chrome's accessible name, Enter/Space by real keys, focus kept
  over three moves, Tab to the next line; a mouse click still plays and shows no focus ring.
  **Two-board analysis verified live 2026-10-11** on `/analysis/bughouse`: each board's lines are
  buttons named by the line; Enter, Enter, Enter played e4, e6, Nc3 on board A with focus kept on
  `#pv-a-1` and board A's Last move reading each; Tab went to the next line; a click still plays
  (d5) and shows no focus ring.

### 4H4. One `h1` on the docs pages — Nikolay 2026-10-11

- [x] 4H4.1 **H4:** the `terminology` page (7 markdown sources: English + es, fr, hu, pt, zh_CN,
      zh_TW) and `battleofideologies` made every section an `h1`. Every heading after the title
      moves down one level; text untouched, so no translator is needed. `battleofideologies`' army
      lists stay `###` (now one level under their section, closing its H5 skip), and its
      `## |All movement are shown from white side|` is a plain sentence. Visible by design: the
      sections render at `h2` size, like every other rules page. Built HTML: one `h1` per page.
      Verified live on `/variants/terminology`; `battleofideologies` is not catalogued locally, so
      only its built HTML was checked.

### 4H5. Heading levels and missing titles — Nikolay 2026-10-11

Previewed page by page and approved before the change. Rule: the hierarchy follows the content,
and CSS keeps every converted element looking exactly as before.

- [x] 4H5.1 **H5, level skips:**
      - `patron.html`: the `h6` under the title was a tagline, now `p.banner-sub`; the three
        questions `h3` → `h2` (siblings under the title). `patron.css` keeps both sizes.
      - `features.html`: "All registered accounts" was an `h3` inside a column header; it is a
        column label, already announced by its `<th>`, so it is a `div.col-title` styled as before.
        "Website" stays the only heading.
      - `dragon.md` + `zh_CN/dragon.md`: `###` → `##` (visible: one size up, as with H4).
      - `lobby.ts`: the create-game dialog's "A.I. Level" `h4` → `h3` under the dialog's `h2`;
        `lobby.css` keeps its h4 look.
- [x] 4H5.2 **H6, no `h1`:** `closed.html` username `h3` → `h1` (`site.css` keeps the size);
      `reports.html` and `mod_public_chat.html` get an `.sr-only` `h1` named as in the admin menu
      ("Reports", "Public chats"; English like the rest of the admin area; the other five admin
      pages already have a visible one). `cwda_diagrams.html`: not a defect (a fragment under an
      `h2`).
- [x] 4H5.3 **Verified:** outlines read live on `/patron`, `/features`, `/variants/dragon`; patron
      and features measured against the old tags swapped back in the same page — identical
      positions and sizes; the lobby heading's computed font, weight and margins identical.
      **Not exercised live:** `closed.html` (needs a closed account). The two admin pages: dropped
      from verification 2026-10-11 (Nikolay: admin pages not important). Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test` (830).

### 4D3. Image labels in the rules pages — Nikolay 2026-10-11

Previewed and approved, including the empty alt after a challenge: `alt=""` is the alt rule's own
value for an image whose information the adjacent text already gives (W3C images tutorial), not a
removed alt; the icon's alt only repeated the name and described nothing.

- [x] 4D3.1 **Title icons, 296 files.** `# ![Name](icon) Name` → `# ![](icon) Name`, only for an
      image at the start of a heading line. Measured before: the `h1` of `/variants/crazyhouse960`
      was named "Crazyhouse960 Crazyhouse 960"; after: "Crazyhouse 960". The generated `h1` ids
      change with it (they embed the heading text); nothing links to them.
- [x] 4D3.2 **154 diagram labels** made readable, in the "Horse movement" form xiangqi already uses;
      translations keep English labels, as they already did. Shogi/minishogi `KingDiagram` …
      `HorseDiagram` → "King movement" … "Horse movement" ("Lancee" typo fixed), `Black/WhiteKings`;
      makruk/cambodian `ProPawn` → "Promoted pawn"; chak's endgame positions (`KvsKO` → "King versus
      king and offering", …); synochess `QueenslayerGoneWrong*`, es `MataDamas`; torishogi quails;
      cannonshogi and shoshogi `image` → named from each file; battleofideologies `King1/2`;
      melonvariant `stratpos` → "Starting position", `machine`; racingkings' setup diagram →
      "Starting position".
- [x] 4D3.3 **Verified** in Chrome's accessibility tree on crazyhouse960, shogi, chak and
      cannonshogi. `yarn md` clean.

### 4PH. Page headings beyond the game pages (3.4d) — Nikolay 2026-10-11

Rule agreed: weigh each heading against the landmarks already there. A heading at the start of
`main` mostly duplicates the `main` landmark; it is still added because users press `1` for the
page title by habit. Headings inside `main`, at sections no landmark marks, are the real gain.

- [x] 4PH.1 **Puzzle:** hidden `h1` "Puzzle" via the shared `pageHeading()` (the tab title), first
      in `main` as on analysis. Measured: every `main` child's box identical before and after.
- [x] 4PH.2 **Lobby**, walked through three use cases (followed players' activity, starting a game,
      reading the open challenges). Before: no `h1`, only the catalogue's six orphan `h3`s; the
      timeline's `aria-label` sat on a plain `div`, where readers ignore it. Now, in reading order:
      `h1` Lobby (hidden, start of `main`) › `h2` What's up › `h3` Timeline › `h2` Challenges (before
      the seek tabs; Nikolay chose it over "Waiting for players", though the header's Challenges
      panel shares the name) › `h2` Variants › the six `h3`s › `h2` Create a game › `h2`
      Leaderboard, Tournament winners, Puzzle of the day. The last three are the visible titles with
      `role="heading" aria-level="2"` (a real `h2` is invalid inside the puzzle's `<span>` and would
      need CSS pinning); the rest are `srHeading()` (now also `h3`). Headings are added for the two
      named side panels too, because most users navigate by headings, not landmarks. Existing
      strings only. Measured: 28 lobby boxes identical before and after. Seek changes are still
      silent (LB2, `lobby-seek-announcements`).
- [x] 4PH.3 **Players** (`templates/players.html`). Before: no headings; reaching one variant's top
      players meant reading through every card before it (64 cards, up to 10 players each live).
      Now: `h1` Players (hidden) › `h2` Online, `h2` Leaderboard (hidden, top of each named panel) ›
      `h3` per card: `role="heading" aria-level="3"` on the inner `div.variant`, so the name is the
      variant alone (the outer title bar would add the icon glyph). Nothing added inside a card,
      whose rows stripe by `:nth-child`. Existing server strings. Measured: identical before and
      after the rebuild, and with the additions removed again in the same page; 67 headings.
- [x] 4PH.4 **Editor:** hidden `h1` "Editor" via `pageHeading()`, the `1` habit only. No heading over
      the controls (no visible title; the FEN field, the page's only text field, is one `E` away and
      is how a blind user sets up a position today) or the board (with F). **Correction to the
      3.4d walk-through:** the editor's and the puzzle's variant picker is one `<select>`, not ~80
      links, as first reported from a text dump.
- [x] 4PH.5 **New, found on the editor and fixed (Nikolay 2026-10-11, `aria-label`):** the
      side-to-move `<select>` had no name (now "Color", the closest existing string); the two
      queenside castling boxes were both "O-O-O" (now "White O-O-O" / "Black O-O-O", built like the
      visible white labels). Measured: 30 editor boxes identical before and after; names read from
      Chrome's accessibility tree.
- [x] 4PH.6 **Stats.** **New finding, fixed:** the page had no `main` landmark (`client/main.ts`
      mounted it as a bare `div#stats` in the body); it is `main#stats` now, the CSS targets `#stats`.
      Plus a hidden `h1` "Stats" via `pageHeading()`. Measured: the 7 stats boxes and their display,
      margin and padding identical. The chart itself stays unreadable: PF2, a known limitation
      (4Q.3: Highcharts' accessibility module costs ~40 KB gzipped on every page, English only).
- [x] 4PH.7 **Games (`/games`). New finding, the larger one: the live-game cards could not be opened
      by keyboard** — each `<minigame>` had only a mouse click handler (no link, no `tabindex`), so the
      page's one purpose was mouse-only. Now `role="link"`, `tabindex="0"`, Enter calls the same
      navigation, and the name is "Open game: white – black, VARIANT, 5+0" (existing "Open game";
      the variant's display name is upper-case, as in the seek labels). Kept `<minigame>`: an `<a>`
      wrapper would break `games.css`'s `minigame > div`. **Also new:** the game grid sat in an
      unnamed `<aside>` beside another unnamed one ("complementary, complementary"); the grid's is a
      `<div>` now and the variant list's is named "Variants". Hidden `h1` "Games" (server string).
      Verified with a live random-mover game: 25 boxes identical before/after and in an in-page
      A/B; the card is a named link in the accessibility tree; a trusted Enter on it opened the game.

### 4RA3. The clocks — decided by Nikolay 2026-10-10: on request, as lichess does.

Lichess never announces a clock by itself: blind mode lists both under headings with
`role="timer"` (read when reached, never spoken as it changes), and the `c` command reads both out
once. No timed, per-turn or low-time announcements. A low-time warning was offered and declined
("maybe never").

- [x] 4RA3.1 **DONE 2026-10-10.** A "Time" section in the board summary: one `role="timer"` line per
      colour, in words ("White: 2 minutes 57 seconds"), at the precision the clock shows (days and
      hours, hours and minutes, minutes and seconds). `Clock.onRender()` reports every repaint,
      ticking or not, and the summary redraws only when the spoken text changes. Single board:
      `clock0` is the top clock, so its colour comes from the orientation; a flip swaps the times
      and the colours stay right. Two board: each seat's clock feeds its own board's summary.
      The visible clock is `aria-hidden`, since it read as "05", ":", "23" with no owner. New
      strings: the `%1 minute` and `%1 second` plurals (`%1 hour`/`%1 day` already existed).
      Verified live: a 3-minute crazyhouse game, both windows ticking and agreeing, colours
      correct after a flip; a finished bughouse game shows four clocks. Not exercised: byoyomi
      (the periods are not spoken), correspondence, a live two-board game.
- [ ] 4RA3.2 **With E, the `c` command** reads both clocks out once through a live region. Prepared:
      `spokenTime()` (exported from `boardSummary.ts`) and the summary's per-colour clock state
      are what it will read; nothing else is needed from the clock side.

- [ ] 4FR6 **With E and F: the forum captcha** (FR6, `inbox-and-forum-sweep.md`). A blind user
      cannot post today. Decided by Nikolay 2026-10-10: the board summary under a heading naming it
      the post's captcha (the existing "%1 to checkmate in one move" can head it — no new string),
      plus F's keyboard navigation and Enter/Space moves on the captcha's chessground. **A typed
      move field: decided once F works** (none, or added, or both). Note: the summary's "Last
      move: Initial position" section means nothing here. Lichess's alternative — skip the
      captcha in blind mode — needs a blind-mode preference pychess does not have; future option.
      **The result line must be a live region** ("Checkmate." / "Not a checkmate. Try again." is
      only visual today) — moved here from FR2 (Nikolay 2026-10-11).

### 4EF. Board interaction — E and F, the next PR. Opened 2026-10-24.

Task lists for E (the move input) and F (the board, F(vi) per 3.4g and 3.4h) are written when each
starts. Already known to belong here:

- [ ] 4EF.1 **OPEN — Nikolay cannot decide yet (2026-10-24):** whether the move input is a
      preference (3.4g: off by default, lichess's `keyboardMove`), or simply always on; and if a
      preference, where it lives. Blocks E.
- [ ] 4EF.2 **How moves are spoken** (design, open questions): the summary reads SAN ("Nf3");
      lichess says "knight takes e 5" and "pawn is dropped on e 6". Decide with E, which also echoes
      moves.
- [x] 4EF.3 **`pocketHotkeys.ts` (1.6) — ANSWERED by 3.4h, 2026-10-25: left as it is.** Its global
      `1`-`9`, `0`, `-`, `=` stay for mouse users; screen-reader users reach the pockets through
      the board (Q2).
- [ ] 4EF.4 **The user's wants with no task yet** (`user-report.md` §4): #3 which pieces attack a
      square (F's `x`), #5 the board from black's side (F's `f`), #6 short help for the active
      variant, #8 possible moves (F's `m`). Say which are in the first pass.
- [ ] 4EF.5 **Unit tests: an exception to "no new unit tests", granted by Nikolay 2026-10-24** —
      for the two 3.4g and Q4 call for: our square elements survive chessgroundx's `render()`, and
      orientation (a wrong `asWhite` puts a piece somewhere it is not). **Revised by 3.4h,
      2026-10-25:** the first becomes "the layer's labels match chessground's state after a move
      and after a flip".
- [ ] 4EF.6 **The promotion and gating choosers, by keyboard (Nikolay 2026-10-25: in F).**
      `client/input/promotion.ts` and `gating.ts` draw `<square>`s with only a click handler, so
      a keyboard promotion, or a seirawan/shouse back-rank move, opens a chooser nobody can use.
- [ ] 4EF.7 **Sounds:** the bump (`outOfBound`), `select` and `error`, from pychess's own
      `client/sound.ts` where one fits, else lichess's (Nikolay 2026-10-25: take theirs) — check
      lila's `COPYING.md` for each file's licence and record the attribution.

### 4F. Candidate F — the board layer. Task list written 2026-10-25.

The design is `candidates.md`, "F(vi) REVISED"; 3.4h holds the decisions.

**Implementation shape, decided by Nikolay 2026-10-25.** All the logic in one file,
`client/accessibility/chessgroundKeyboard.ts`, class **`ChessgroundKeyboard`** (the name says its
proper home is chessground, Q4; the pychess-only parts — `pieceName()`, the variant square names,
`l`/`t` reading the summary — stay visible as such). Existing files change only to plug it in.
**No placeholders:** the page view constructs it (`new ChessgroundKeyboard(variant, boardName)`),
puts `boardView()` beside `div.cg-wrap` and `pocketView('top' | 'bottom')` beside `#pocket0` /
`#pocket1` (retained vnodes through `insert` hooks, no ids), and passes it through `runGround()` into
the controller's constructor, which calls `attach(chessground, boardSummary)` — so the first paint
(4CD.3) labels the board too — and `update()` wherever the summary updates and on a flip. Three
views, not one composed view: the pockets sit apart from the board, with clocks and players between.
`f` is not handled; it bubbles to the existing Mousetrap flip. 4F.11's first pass is confirmed.

- [x] 4F.1 **DONE 2026-10-25, round page only (the other pages are 4F.12).** `ChessgroundKeyboard`
      in `client/accessibility/chessgroundKeyboard.ts`, constructed in `round.ts` and passed
      `runGround → RoundController → GameController` (optional there until 4F.12), which attaches
      it and calls `update()` from `updateBoardSummary()` and `toggleOrientation()`. `.cg-keyboard`
      in `site.css`: placed exactly like `cg-container` (`top: 0; right: 0`, sized by the
      `--cg-width`/`--cg-height` variables chessgroundx publishes, suffixed per board — the wrap is a
      few px wider than the board, so `inset: 0` would not do), a grid of `width x height`
      buttons, `pointer-events: none`, `z-index: 20`. Verified live in a crazyhouse game: every
      sampled square's button has its piece's exact box, white (a8 first) and black (h1 first),
      before and after a flip; the point under the mouse is still `cg-board`; e2-e4 by real clicks
      played and focus stayed on `body`. The buttons are unnamed and unreachable until 4F.2/4F.3.
      Original task: A sibling of `div.cg-wrap` inside the board's `selection`, covering the same
      box: a CSS grid of `width x height` `<button>`s in percentages, `pointer-events: none`,
      visually transparent. Row and column order from the orientation. The code comment: temporary,
      its proper home is chessgroundx, to be proposed upstream (Q4).
- [x] 4F.2 **DONE 2026-10-25.** `aria-label` = square in the variant's notation, then the variant's
      colour name and `pieceName()`: "e4 White pawn". **An empty square says only its name
      (Nikolay 2026-10-25), on every board:** lichess's `+`/`-` (dark/light) was dropped, since many
      of our boards (shogi, xiangqi, janggi, ataxx, makruk, sittuyin) have no square colours and
      the parity rule would be false there. `squareName()` and a new `colorName()` are exported from
      `boardSummary.ts`, so both widgets say the same words. Verified live: crazyhouse both sides
      (after 1. e4 e5: "e4 White pawn", "e5 Black pawn", empty "e2"/"e7"), and shogi both sides
      ("91 White lance" top-left for sente, "19 Black lance" for gote, "28 Black rook", "55").
      Original task: Square first, in the variant's notation (as the summary: shogi `76`, janggi
      `83`), then colour and `pieceName()`, or `+`/`-` for an empty dark/light square. Rebuilt at
      the summary's update points (4CD.3) and on a flip.
- [x] 4F.3 **DONE 2026-10-25.** One button `tabindex="0"` (the cursor), the rest `-1`. The cursor
      starts on the king of the side at the bottom (`variant.kingRoles`), else that side's
      bottom-left square, and **follows the orientation until the board is first focused**: a
      round page turns the board to the player's colour only after `GameController`'s first
      paint, so a cursor fixed at first paint put black's on "e1 White king". After a `focusin`
      it stays where the player left it. The listener sits in the rendered view, so `update()`
      patches never drop it. Verified with real keys (new `--cdp <n> key …` in the harness,
      trusted `Input.dispatchKeyEvent`): from the top of a live crazyhouse page the 21st Tab
      lands on "e1 White king" (after the header, players, chat input and Chat), the next Tab
      leaves for "Give 15 seconds", Shift+Tab returns to e1 with `:focus-visible`; black starts on
      "e8 Black king"; with focus on the board, Ng1-f3 by mouse kept focus and the cursor on e1.
      Original task: Roving tabindex: one button `0`, the rest `-1`; the cursor starts on
      the player's king square (or the first square of the player's back rank) and is remembered.
- [x] 4F.4 **DONE 2026-10-25 (the bump sound waits for 4F.8).** A `keydown` on the layer
      (unmodified arrows only) moves the cursor, re-renders the tabindex and focuses the new
      square; `preventDefault()` + `stopPropagation()`, so Mousetrap's move-list arrows never see
      them; every other key passes through. Verified with real keys in a live crazyhouse game:
      white e1 → Up e2, e3 → Left d3 → Down d2, d1, d1 (edge) → Right e1, f1, g1, h1, h1 (edge);
      black e8 → Up e7, e6 → Left f6 → Down f7, f8, f8 → Right e8, d8, c8, b8 — the move list
      stayed on Nf3 throughout; Tab off the board, and Left/Right stepped the list again
      (e5, e4, e5, Nf3); Shift+Tab returned to h1. Original task: Follow the orientation (Up = away
      from the player); past the edge focus stays and the bump sound plays. Handled keys stop
      propagating, so Mousetrap never sees them; every other key passes through unchanged.
- [x] 4F.5 **DONE 2026-10-25 (the `select` sound waits for 4F.8).** The square button's `click`
      calls `selectSquare()`: a click is what Enter and Space produce on a button, and what NVDA
      sends when it activates a button from browse mode (no key reaches the page then); the mouse
      cannot produce it, the layer lets the pointer through. Enter and Space stop propagating,
      since Mousetrap binds Enter on document (`skipGating`). **The first keyboard-only moves,**
      live: black Nb8-c6 (arrows + Space), white Bf1-c4 (arrows + Enter), then a premove Nb1-c3 by
      keyboard, played the moment black answered Nf6 by mouse; a non-destination Enter (b1 then
      b3) dropped the selection, as a click does. Original task: Space and Enter call
      `selectSquare()`: select (with the `select` sound), move, or replace the selection, as a
      click does — premoves included.
- [x] 4F.6 **DONE 2026-10-25, round page (sounds wait for 4F.8).** `pocketView('top' | 'bottom')`
      beside `#pocket0`/`#pocket1`: `div.cg-keyboard-pocket`, a grid laid out by `pocketShape()`,
      now exported from `pocketRow.ts` so the overlay and the drawn row share one rule (one row,
      or two for 8+ roles). The cursor is a square or a pocket role (`"white:n"`); `focusout` to
      outside the layers puts the tab stop back on the square the pocket was entered from. New
      msgid `%1 pocket`. Verified live in crazyhouse, black's side, all by real keys: the pocket
      buttons sit exactly on chessgroundx's pocket squares (both windows, both pockets); black
      Nf6xe4 by keyboard; from h3 Left entered "Black pocket: pawn, 1", Down/Up stepped the
      roles (both ends stop), Left (outward) stayed, Right returned to h3; Space selected the pawn,
      arrows to d6, Space dropped `P@d6`; from a6 Right entered white's pocket, Space there did
      nothing; Tab from the pocket left the tab stop on a6, Shift+Tab came back to a6.
      **REVISED the same day after Nikolay tried it (Q2's model did not match the screen):** both
      pockets are drawn right of the board, yours at the bottom, so Right reaching the opponent's
      pocket and roles stepped with Up/Down (while drawn side by side) both felt wrong. Now
      **only Right past the right edge enters a pocket — the colour chessgroundx lets you move
      (`movable.color`), so always your own on a round page, even flipped; when both colours move
      (analysis, editor) or none (a spectator), by half: lower half the bottom pocket, upper half
      the top.** In a pocket Left/Right step the roles as drawn (every role a stop), Left past the
      first returns to the square you came from, Right past the last and Up/Down stay. The left
      edge is just an edge. Verified live: white h1 → Right "White pocket: pawn, 1", knight 1,
      bishop 0, rook 0, queen 0, queen (stays), Up stays, Left back to h1; black a7 → Right
      "Black pocket: pawn, 0", knight 0. The by-half rule waits for 4F.12 (analysis).
      Original task: **Pockets (Q2).** One step past the a-file edge is white's pocket, past the last file
      black's; enter at the first role, leave back to the square you came from; Up/Down through the
      roles in drawn order, zero counts included; "White pocket: knight, 2"; Space selects your own
      non-empty role with `selectPocket()` (`error` otherwise, and always in gating variants), then
      Space on a square drops. Board plus both pockets is one roving group.
- [ ] 4F.7 **The promotion and gating choosers (4EF.6)** reachable and operable by keyboard, and
      their choices named.
- [ ] 4F.8 **Sounds (4EF.7):** bump, `select`, `error`.
- [ ] 4F.9 **The focus ring:** styled to read on light and dark squares, checked on a light and a
      dark board theme; keyboard only (`:focus-visible`), so mouse users see nothing new.
- [ ] 4F.10 **An `h2` "Board" heading** before the layer (3.4h Q1 addendum (a); the string exists).
- [ ] 4F.11 **Board keys, first pass — CONFIRMED by Nikolay 2026-10-25.** lichess's: `l` last move,
      `t` clocks (with 4RA3.2), `f` flip, `k q r b n p` (and the variant's letters) jump to the next
      piece of that type, `1`-`9` ranks / `Shift` files, `m` legal moves of the selected piece. Later:
      `x` the attack rays, variant help.
- [ ] 4F.12 **Pages:** round, analysis and puzzle (single board), and each board on the two-board
      pages (Q3: built, not verified). Alice: the main board only, like the summary.
- [ ] 4F.13 **The two tests (4EF.5):** the labels match chessground's state after a move and after a
      flip; orientation.
- [ ] 4F.14 **Verify** as 5.2 did (Orca's log, the AX tree, real keys): a crazyhouse game played by
      keyboard only — moves, a capture, a drop, a promotion; a flip mid-game; a 10x10 and a 9x9
      variant; mouse play unchanged; arrows on the move list unchanged when the board is not
      focused. Plus the layout matrix, row set against the base.

### 4Z. LAST — the guide for blind users. Added by Nikolay 2026-10-10.

Written once the features exist, because it documents them — but **it is a deliverable of this
change, not an afterthought**: a keyboard interface nobody can discover is not usable
(`lichess-reference.md` §7).

- [x] 4Z.1 **(Done in 4Z.0.)** **An entry point that is the first thing on every page, found the standard way:** a link
      first in `<body>`, visually hidden until focused (the skip-link pattern, WCAG 2.4.1), so the
      first Tab or the first line a screen reader reads offers it. This is candidate A in its 3.4g
      form; lichess puts its blind-mode toggle and tutorial link in exactly that position.
- [x] 4Z.0 **DONE 2026-10-11 (also closes H3 and 4Z.1).** Built as decided below; the skip target
      is one empty `div#main-content` in `base.html` between the header and content blocks, so every
      page has it without per-template ids. Verified with real keys on lobby, analysis, forum,
      players and the guide: first Tab = skip link (visible box over the logo), Enter then Tab lands
      on the page's first control; header and content measured unmoved; Chrome reads "list, 2
      items". On round-robin pages the `#main-content` hash matches no arrangement (harmless).
      New msgids: the two link texts and the guide's paragraphs (piece/section names reused).
      **Decided by Nikolay 2026-10-11 — start now, with H3, with a preliminary guide.**
      A two-item `<ul>` first in the page, hidden until focused, no JS: "Skip to main content"
      (WCAG G1 order: skip first) then "Accessibility guide". The guide is an ordinary PAGE, like
      lichess's `/page/blind-mode-tutorial` (Back escapes it, no popup): `/page/accessibility`,
      built exactly like `/page/forum-etiquette` (`server/views/forum_etiquette.py`, Jinja template
      with one `{% trans %}` per paragraph; route in `server/routes.py`). Findings so far: the list
      goes at the start of `{% block header %}` in `templates/template.html` (embed pages have no
      header, so none); skip target `#main-wrap` exists on 60/73 templates and most client views
      (`client/main.ts`), but NOT on: `allplayers`, `patron`, `features`, profile (`div#profile`),
      calendar, stats, games/search views — give those an id or retarget. New msgids needed
      ("Skip to main content", "Accessibility guide") — check `.po` first. Preliminary content:
      game-page headings, the board summary, arrow-key move stepping, engine-line buttons, offers.
      Python gates apply (new view).
- [ ] 4Z.2 **The guide page itself:** how a game page is laid out (headings, the board summary, what
      is announced and when), the move input and every command (`c` clocks, `l` last move, …), the
      board's keys once F exists, pockets and drops, and how the screen-reader modes interact with
      them (NVDA browse/focus, TalkBack). Written in the existing docs pipeline so it can be
      translated like the rules pages.

## 5. Verify

- [x] 5.1 **CLOSED 2026-10-24 (Nikolay): 3b.3 made Orca's log plus the accessibility tree the method, and 5.2 is that check; E and F are verified the same way.** Every shortlist item heard working with the stack named in 1.3, not merely inspected in
      the DOM or checked by a linter.
- [x] 5.2 **DONE 2026-10-11, a live crazyhouse game between two windows, 60+0.** Over AT-SPI:
      the `h1` names the game; Chat, Moves, Actions and the summary's Pieces, Pockets, Last move,
      Time, Status are headings; the game is joined from the lobby by Enter on "Join: …, 60+0,
      CRAZYHOUSE". Orca's log: the opponent's moves arrive as text inserted into the assertive
      Last move ("e4", "e5"); the clocks change every second as non-live timers (not spoken, by
      design); a draw offer inserts "Your opponent offers a draw" plus Accept / Decline into the
      polite offer region, and Enter on Decline answers it; a chat message is a new item in the
      polite chat list; resignation inserts "Black resigned • White won" into the assertive status.
      Draw's confirmation dialog opens with focus on "Offer draw". **Still impossible: making a
      move** (E and F, the next PR). **New defects found on the way: 5.5.**
- [x] 5.3 **DONE 2026-10-11.** Gates green after every change. Layout matrix (286 rows) on fork master
      `3ba097823` against the same commit with the PR's diff reversed: 2 failing rows in both, 0
      broken, 0 fixed; `P5-C3` differs only in naming the element under an identical 40x3px overlap
      (`site-tab`, the two-board tabs' new `<button>`, instead of `SPAN`). Players' striped rows
      measured with seeded scores, identical with and without the additions.

- [x] 5.5 **New defects found by verification, 2026-10-11** (an AX sweep for controls named by one
      character or nothing, on 16 pages). **V1–V7 FIXED the same day as proposed**, attributes only,
      existing strings; checked in Chrome's AX tree: Abort / Draw / Resign / Give 15 seconds;
      crosstable links "Open game: 1–0"; the engine switch "Computer analysis" on two-board
      analysis (in `renderInput()`, which re-patches the input); `#fullfen`
      "FEN" / "BFEN"; two-board arrows First / Previous / Next / Last move. V7 checked in code only.
      The sweep is now clean except the recorded items below.
      **V4 on analysis and puzzle: REVERTED and accepted as a known defect, Nikolay 2026-10-11.**
      That switch is the only `toggleSwitch()` caller with no visible text, and an `ariaLabel`
      parameter on the shared helper for a single caller was judged not worth it. Future option: give
      the switch a visible label, as the other switches have.
      - **V1. Round: Abort reads "j", Resign "d", Draw "½".** The icon `<i>` inside each button beats
        its correct `title` (the 4RA2 mechanism; these three were never covered).
      - **V2. "Give 15 seconds" reads "W"**: the glyph is the button's own `::before`.
      - **V3. The crosstable's result links read "1" / "0"** (two per earlier game, each a link to it).
      - **V4. The engine on/off switch has no name** (analysis, puzzle, two-board analysis): a
        checkbox in an empty `<label>`, drawn as a toggle.
      - **V5. Analysis: the read-only FEN field `#fullfen` has no name.**
      - **V6. Two-board analysis move-list buttons read "p", ">", "l", "n", "o", "m"**: 4RA2 fixed
        only the single-board list; here the four arrows also lack titles.
      - **V7. Two-board round controls** put the icon glyph before the visible label (read from
        code, `two-board/round/roundControls.ts`; a live bughouse game was not run).
      - **Recorded, no change proposed:** puzzle votes named by emoji ("👍", read "thumbs up
        sign"); chessgroundx's two empty overlay SVGs read as unnamed images (a chessgroundx
        change); the lobby's online-players link is empty only while its counter is unset locally.
      - **Not a defect, but H6 was moot there:** `templates/closed.html` is rendered by nothing.

## 5b. Not code — for Nikolay to answer

- [x] 5b.1-2 and 5.4 **CLOSED 2026-10-24 (Nikolay).** Replying to the user who wrote in (their
      .NET project, the Discord voice rooms) and offering the change back to them were dropped from
      the list on 2026-10-11 with no reason recorded; Nikolay confirmed the closure.

- [x] 5b.3 **ANSWERED 2026-09-28 — no new name.** Keep `_('Variant')`, the string we already have
      translated, on both comboboxes. Nikolay: the second one is inside collapsible elements, so
      context before and after in browse mode, or the path taken when tabbing, tells them apart. See
      4G.7.

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
- **KNOWN LIMITATION — the statistics chart (PF2) is not readable by screen readers.** Highcharts'
  accessibility module fixes it but costs ~40 KB gzipped on every page for one chart, with an
  English-only description. Decided against 2026-10-10.
- **KNOWN LIMITATION — an arriving private message is not announced (IB1).** The inbox updates
  live and visually; a screen-reader user notices only by reading the thread list. Decided against
  2026-10-10.


### Decided, not done — moved from section 4 on 2026-10-24

Open checkboxes that were really decisions (kept, won't fix, or future). Text unchanged.

- 4CD.7 Open: an empty pocket is a bare heading (kept, Nikolay 2026-10-10). Alice reads the
      active board only (kept). Squares stay algebraic for xiangqi-family variants.

- 4T1-3.2 **Not changed:** the round-robin tabs (`<span role="tab">`, own roving tabindex) and
      the two study tab lists (`<button>`s, own roving and arrow handling). **One day: a single tab
      widget used everywhere** (Nikolay) — the shared `view.ts` helpers, `two-board/common/tabs.ts`,
      round-robin and study are four implementations today.

- 4SB2.1 **Future: the HTML `popover` attribute.** With `<div popover>` and
      `<button popovertarget>`, the browser itself toggles, dismisses on Escape and outside click,
      returns focus and reports the expanded state — replacing the dismissal and most of the
      toggling above with no script. Shipped in Chrome 114 (May 2023), Safari 17 (Sep 2023),
      Firefox 125 (Apr 2024); "widely available" by the web-platform convention around Oct 2026.
      Kept as JavaScript by Nikolay's decision for now; reconsider once it is mature. Would need
      CSS to undo the top-layer centring and place each panel under its button.

- 4TN.6b **WON'T FIX (Nikolay 2026-10-11):** focus stays on the row when the panel opens and
      falls to `<body>` on Close; the panel sits after the standings (6-20 Tabs away). Nothing is
      blocked. Fixing it would be ~3 lines of focus code plus a `data-player` on the row buttons.
      `aria-expanded` was rejected for the same reason: the rows are not re-rendered on toggle, so
      keeping it true would need code too. (The round-robin modal's Escape is done, 4FR.2.)

- 4PE3.2 **Left as they are:** the two two-board analysis "Copy" links, whose handlers only log
      "not implemented" — reachable dead controls would help nobody; they stay unreachable until
      they do something. **Not exercised live:** the puzzle links (no puzzles in the local
      database) and "Go deeper" (shown only at maximum engine depth). Screen readers announce these
      as links, not buttons — slightly imprecise for actions, and accepted.
