# Coverage, questions asked, and what kind of change each fix is

Written 2026-09-27 in answer to four questions: did we sweep everything, what did we sweep *for*, is
the picture complete, and how much of the work is DOM versus CSS.

---

## 1. WHAT WAS SWEPT FOR — six questions, not one

| Question | How it was asked | Coverage |
|---|---|---|
| **Can a screen reader read it?** | `alt` on every `<img>`; accessible name on every button, form control and icon | **every template + every client file** |
| **Can it be navigated?** | `<h1>`-`<h6>` structure, level skips, multiple `h1`, landmarks (`main`/`nav`/`header`/`aside`/`footer`), skip link, `<html lang>` | **every template** |
| **Can it be operated by keyboard?** | every click handler classified by element type; `tabindex` values; roving-tabindex correctness; arrow-key handlers on tablists; `Escape` on dialogs | **every client file** |
| **Is state communicated?** | `aria-expanded` on every collapsible; `aria-live` / `role="status"` / `role="log"` on everything that changes by itself; `role="dialog"` / `aria-modal` on modals | **every client file + every template** |
| **Can focus be seen?** | `:focus` vs `:focus-visible` vs `outline: none` per stylesheet | **all 16 stylesheets** |
| **Is the accessible text translated?** | `aria-label` values wrapped in `_()` / `{% trans %}` | **every template + every client file** |

**The first, second, fourth and sixth were asked site-wide** — so all 71 templates and all 323 docs
pages were checked for alt, labels, headings, landmarks, `lang` and untranslated `aria-label`,
regardless of whether that page has its own sweep document.

**The third and fifth were asked of `client/` and the stylesheets as a whole**, so no client file was
skipped either.

## 2. WHAT WAS **NOT** INDIVIDUALLY SWEPT — 44 templates

Twelve sweep documents name specific pages. **44 of 71 templates were never examined for their own
interaction behaviour** — their dialogs, their clickable elements, their live regions.

**Checked now, and the result is why it did not matter:**

| Group | Files | `<h1>` | `<main>` | `<thead>`/`<th>` | inline `onclick` | `<img>` no `alt` | `aria-live` |
|---|---|---|---|---|---|---|---|
| **teams** | 12 | 10 | 10 | 1/4 | **0** | **0** | 0 |
| **account** | 6 | 6 | 6 | — | **0** | **0** | 0 |
| players / following | 4 | 2 | 4 | 1/2 | **0** | **0** | 0 |
| ublog / blogs | 5 | 5 | 5 | — | **0** | **0** | 0 |
| tournaments / simuls | 3 | 3 | 4 | 6/17 | **0** | **0** | 0 |
| games / game_search | 2 | 1 | 2 | **0/14** | **0** | **0** | 0 |
| misc (index, FAQ, 404, legal, embed, video, winners, shields) | 9 | 4 | 6 | — | **0** | **0** | 0 |

**Zero inline `onclick` in the entire `templates/` tree** (the one grep hit is a JS comment in
`FAQ.html:32`). **Zero images without `alt`.** `<main>` and `<h1>` nearly everywhere.

**And the reason is structural: `ls client/ | grep -iE "team|account"` returns nothing.** Teams,
account management, players, ublog and the static pages are **pure server-rendered templates with no
Snabbdom module at all.** They inherit the templates' good habits — real `<button>`s, `<label for>`,
`<main>`, `<h1>` — and none of the client's problems.

**One new item found here:** `game_search.html` has **14 `<th>` and 0 `<thead>`** — the same
inconsistency as `tournament.ts` (TN5). `games.html` has neither because its table is client-rendered
through `renderGames`, which is PF1's headerless table.

## 3. IS THE PICTURE COMPLETE? — yes for these six questions, with three stated gaps

**Complete:** every page and every client file has been checked for the six questions above, and the
defects cluster cleanly enough to have produced two generalisations (AD1, PE3) rather than a list.

**The quality divide maps exactly onto rendering technology**, which is the strongest evidence that the
picture is coherent rather than partial:

| | Real buttons | Clickable divs | Dialogs | Live regions |
|---|---|---|---|---|
| **Server templates** (teams, account, admin, ublog, players, docs, static) | **yes, ~100** | **0** | **native `<dialog>`, correct** | 3, correct politeness |
| **Snabbdom client** (lobby, round, analysis, puzzle, editor, tournament, forum, inbox, settings) | some | **~40** | **4 hand-rolled, all broken** | 2, both in `study/` |

**Three gaps that remain, stated plainly:**

1. **Nothing has been verified with a screen reader.** Every finding is static source reading; the app
   was never run. "X is missing" is reliable; "the user therefore experiences Y" is inference. **Tasks
   2.1 and 2.2 are what close this**, and they are undone.
2. **No runtime DOM was inspected for the client pages.** `#settings`, `#notify-app`, `#challenge-app`
   and both two-board pages are built by Snabbdom; the TypeScript was read, the output was not. The
   client label count (44 flagged, ~1 in 3 a false positive on calibration) is the number most affected.
3. **Android was never tested.** Our user named TalkBack and Jieshuo (`user-report.md` §2) and neither
   has been touched. Focus-mode behaviour on Jieshuo in particular is unknown.

---

## 4. WHAT KIND OF CHANGE IS EACH FIX

### CSS ONLY — about 5 rules, and one of them is a Level A keyboard fix

| | Where | Effect |
|---|---|---|
| **F1** | `site.css:996` — add `:focus-within` beside `.topnav section:hover .drp` | **makes all secondary navigation keyboard-reachable. WCAG 2.1.1 Level A, in one selector.** |
| T4 | `site.css:2302` `.btn-controls button:focus` | Draw/Resign focus becomes visible |
| T5 | `site.css:2393` `button.icon:focus` | icon buttons' focus visible |
| T6 | `site.css:3800` `.search-bar .input input` | search focus visible |
| minor | `switch.css:50` `:focus` → `:focus-visible` | ring stops showing on mouse click |

**That is the whole CSS surface.** `study.css` (24 `:focus-visible`) is the in-house model for T4-T6.

### ONE-LINE, NO DOM — two items with the best ratio in the change

- **`import 'highcharts/modules/accessibility';`** — the module already ships with our
  `highcharts@^13.0.2` and is imported nowhere. Buys a description, keyboard navigation of data points
  and a text summary for the whole rating chart (PF2).
- **`<html lang="{{ lang }}">`** in `base.html:2` — the value is already emitted as `data-lang` on
  `<body>`. Decides whether seven of our eight documentation languages are pronounced at all (H2/D2).

### DOM — ELEMENT TYPE CHANGES — the bulk of the work, ~40 controls, ONE RULE

**Not new markup: replacing the wrong element with the right one.**

| From | To | Count | Where |
|---|---|---|---|
| hrefless `<a>` | `<button>` | **21** | editor's whole control strip (9), analysis (5), puzzle (3), two-board (3), zen (1) |
| `<div>` | `<button>` | **9** | draw / takeback / rematch / corr-move offer dialogs (RA1) |
| `<tr>` | row with an operable control | 2 patterns | lobby seeks (LB1), tournament standings (TN1) |
| `<div>` | `<button>` | 2 | hamburger (F2), search icon (F5) |
| `<span>` | `<button>` | 3 | dialog closes — and superseded by `<dialog>` below |
| `<h2>`, `<option>`, `<td>` | `<button>` | 3 | `tournamentRR.ts` |
| 4 hand-rolled `<div>` modals | **native `<dialog>` + `showModal()`** | 4 | lobby, tournament, forum, settings — **AD1: this DELETES code** |
| `<ol>` > `<div>` > `<li>` | `<ol>` > `<li>` | 1 | chat's malformed list (RA4) |
| `<move>`, `<pv-san>` | focusable elements | 2 | **`<move>` is shared by round, analysis, puzzle AND study** |
| no `<thead>` | `<thead>` + `<th>` | 3 | profile games, game search, `tournament.ts` |

**The rule: if it responds to a click, it is a `<button>` or an `<a href>`.** ~40 sites, one rule — and
the server templates are the in-house proof it is already understood (47 real buttons, 0 clickable divs
across 11 admin templates).

### DOM — ATTRIBUTES ONLY — ~25 sites, no structural change

| | Count | Where |
|---|---|---|
| **`aria-live` / `role="status"`** | **~8** | inbox PM (IB1), puzzle feedback (PE1), clock (RA3), chat (RA6), seek list (LB2), tournament clock + standings (TN2/TN3), forum (FR2) |
| `aria-expanded` | 4 | `btn-settings`, `btn-notify`, `btn-challenge`, `button#bars` |
| `aria-label` | ~10 | 4 movelist nav buttons (RA2), `#fen` ×2 (PE2), clock ×2 (RA3) |
| `_()` on existing `aria-label` | **~15** | 5 client + 10 template, **5 of them in the site header on every page** (SB3) |
| label text from existing data | **2 lines → 323 controls** | `boardCSS[i]` / `pieceCSS[i]` as the label's text (SB1) |
| `for` / label fixes | ~10 | orphaned `for="form3-byo"` (L1), `memory.html`'s fake `label=` ×4 (L2), 3 placeholder-only (L4) |
| `alt=""` | 4 | one trophy, three decorative illustrations (A1) |
| `<h1>` / heading levels | ~10 | 4 missing `h1` (H6), 5 level skips (H5), multiple `h1` in 3 markdown sources (H4) |

### TABINDEX — three changes, one of which fixes every tablist

- **T2** — one `keydown` handler in `client/view.ts:202`'s `setAriaTabClick`, giving arrow-key navigation
  to **every tablist on the site at once.** Best value on the list.
- T1 — lobby: one ternary, `t === selected ? '0' : '-1'`. Precedent: `tournamentRR.ts:1013`.
- T3 — two-board: `tabindex: String(t)` → the same ternary. Currently emits positive values that hoist
  tabs ahead of the whole document.

### NEW DOM CONTENT — this is the gate, not the worklist

Candidates B, C, D, E and F in `candidates.md` — headings on the game pages, the position as text, live
regions, the command input, the board as buttons. **These are the only items that add content rather
than correct it**, and they are what task 3.4 decides.

---

## The shape of the answer

| Change type | Sites | Blocked on the gate? |
|---|---|---|
| **CSS only** | **~5 rules** | no |
| **One-line, no DOM** | **2** | no |
| **DOM: wrong element → right element** | **~40** | no — one rule |
| **DOM: attributes only** | **~25** | no |
| **Tabindex** | **3** | no |
| **New DOM content** | candidates B-F | **YES — this is the gate** |

**So almost none of it is CSS, and almost all of the non-gate work is corrective rather than additive**:
replacing wrong elements and adding attributes to markup that already exists. The genuinely new markup
is confined to the five gate candidates.

**And two findings collapse most of the volume**: AD1 turns four broken dialogs into one `<dialog>`
change that deletes code, and PE3 turns ~40 dead controls into one rule with local precedent.
