## 0. Status

**PLANNING ONLY — 2026-09-27.** Nikolay: *"we will not fix anything today, we are just writing down
our findings and making a plan ... we are still at planning phase."* Every defect recorded in
`collapsibles-sweep.md` and `focus-and-tabindex-sweep.md` is a **worklist item for when the change is
applied**, not something to touch now. Section 4 stays empty until the gate at 3.4.

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

      **H2. `<html>` has no `lang` — `base.html:2`.** WCAG 3.1.1, Level A, and **acute for pychess**:
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

      **LB3 / TN4. Neither the lobby nor the tournament dialog can be closed by keyboard.** Close is
      a `<span.close>` (`lobby.ts:684`, `tournament.ts:642`, `tournamentRR.ts:1373`) and no `Escape`
      handler exists in either file — so a keyboard user who opens a dialog is **trapped in it**.

      **LB2 / TN2 / TN3. Nothing that changes is announced.** Zero `aria-live` in `lobby.ts`,
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

      **RA1. YOU CANNOT ACCEPT OR DECLINE A DRAW, TAKEBACK OR REMATCH BY KEYBOARD.** `roundCtrl.ts`
      builds **nine accept/reject controls as bare `<div>`s** across **five offer types** — takeback
      (752, 758, 774), **draw (829, 833)**, correspondence move confirmation (852, 856), **rematch
      (1030, 1034)** — each with no role, no tabindex and no name, in a file with 0 `keydown`.
      **And the offer text IS readable**: `h('div.text', _('Your opponent proposes a takeback'))` sits
      between the two controls, so a blind player is **told about the offer and cannot answer it**,
      mid-game, under a clock. WCAG 2.1.1 **Level A**. The correct pattern is eleven lines away —
      `:497` `h('button#resign', { props: { title: _('Resign') } })`.

      **RA2.** `movelist.ts` has 7 buttons and **4 are unnamed** — `icon-fast-backward` (:253),
      `icon-step-backward` (:267), `icon-step-forward` (:282), `icon-fast-forward` (:284) — while
      `refresh`, `exchange` and `bars` in the same file are named. A screen reader announces "button"
      four times for the primary way to review a game.

      **RA3.** `clock.ts:240-254` emits real text (better than the board) but has **0 `aria-label`, 0
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
- [ ] 2.4d **F1, F2, T1-T6, A1, L1-L5, H1-H6, D2-D6, LB1-TN6, PF1-ST3, IB1-FR4, RA1-RA8 and SB1-SB3 do
      not wait on the gate** — except RA8, which IS the gate (candidates B and D). **And per AD1 the
      dialog fixes are ONE change using `<dialog>`, not four.** They are Level A keyboard failures affecting every
      keyboard-only user, sighted or not — not blind-mode features. F1 is one selector; F2 is a `div`
      becoming a `button` with the handler it already has. F3 and F4 are four lines, each on a line
      the code already writes. T1 and T3 are one ternary each with precedent in the codebase, T2 is
      one keydown handler that fixes every tablist, and T4-T6 are one CSS rule each.

      **Deferred by Nikolay on 2026-09-27 to keep the change in planning.** Decide at the gate
      whether they ship as candidate G work ahead of, or alongside, whatever else is chosen.
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
