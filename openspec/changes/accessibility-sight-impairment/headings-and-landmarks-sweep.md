# Heading structure and landmarks — sweep

Asked for 2026-09-27. **Findings only.** Method and limits in `focus-and-tabindex-sweep.md`: static
source reading, the app never run. Template inheritance means a heading could come from a parent, so
each finding below names the file that actually renders it.

---

## H1. THE GAME, ANALYSIS, PUZZLE AND STUDY PAGES HAVE **ZERO** HEADINGS

Not "few". None.

- **`templates/analysis.html` contains no `<h1>`-`<h6>` at all** — and it serves three page types:
  `server/views/analysis.py:16`, `server/views/puzzle.py:17`, `server/views/study.py:992`.
- **No client file that renders those pages emits a heading.** `client/roundCtrl.ts`,
  `client/round.ts`, `client/analysis/index.ts`, `client/analysis/analysisCtrl.ts`,
  `client/movelist.ts` — zero `h('h1')` through `h('h6')` in any of them.
- **The entire `client/two-board/` tree emits zero headings.**

**So on the page where a blind player would actually play:**

| Facility | State |
|---|---|
| `H` — jump to next heading | **does nothing** |
| `1` — jump to the top of the content | **no h1 to jump to** |
| Text of the position | **absent** (`candidates.md`, chessgroundx finding) |
| Announcement of the opponent's move | **absent** (no `aria-live` on any game page) |

This upgrades `candidates.md` B from *"our round page has almost no headings"* to **none at all**, and
it is why candidate B is cheap: there is nothing to reconcile, only headings to add.

For contrast, lichess's blind-mode game page carries ten: Game info, Move list, Pieces, Game status,
Last move, Input form, Clocks, Actions, Board, Advanced settings.

## H2. `<html>` HAS NO `lang` — and the value is already to hand

**`templates/base.html:2` is `<html>`**, bare.

- **WCAG 3.1.1 Language of Page — Level A.**
- **This matters more for pychess than for most sites.** The UI is translated through `lang/` gettext
  into many languages. A screen reader picks its speech synthesiser and pronunciation rules from
  `lang`; with none, it uses the user's default. A Bulgarian or Russian page read by an English
  synthesiser is close to unintelligible — not degraded, unusable.
- **The fix is already half-done.** `templates/base.html:71` emits `data-lang="{{ lang }}"` on
  `<body>` for the client. **The value is known server-side and simply is not on the element the
  browser and screen reader read.** So `<html lang="{{ lang }}">`, one line.
- `templates/api.html:2` has `lang="en"` — one page already does it, so the pattern exists.

Worth checking alongside: `client/two-board/` and lichess both use `lang="en"` on individual spans for
untranslated strings. Where our pages mix languages, `lang` on the subtree is the follow-up, not the
first step.

## H3. No skip link anywhere

No "skip to content" link in `templates/`, `client/` or any stylesheet.

- **WCAG 2.4.1 Bypass Blocks — Level A.**
- **Partly mitigated for screen-reader users** by the landmarks below: they can jump to `<main>`
  directly.
- **Not mitigated at all for sighted keyboard users**, who must Tab through the header every time.
  Though note it interacts with `collapsibles-sweep.md` F1: because the nav submenus are keyboard
  unreachable, the header's actual tab order is currently *shorter* than it looks — so fixing F1 makes
  a skip link more valuable, not less.

## H4. Ten templates with multiple `<h1>` — eight are one markdown source

| File | `h1` count |
|---|---|
| `templates/docs/terminology.html` + `.es` `.fr` `.hu` `.pt` `.zh_CN` `.zh_TW` | **6 each** |
| `templates/docs/battleofideologies.html` | 6 |
| `templates/studies.html` | 2 |
| `templates/variants.html` | 2 |

Multiple `<h1>` is legal HTML5, so this is not a conformance failure. **The practical harm is the
convention screen-reader users actually rely on** — lichess's own tutorial says *"When you are at the
top of the page, pressing the number 1 in Browse Mode will take you straight there."* With six `h1`s,
pressing `1` cycles through six places and none of them is "the content".

**The `docs/` files are compiled from markdown by `yarn md`**, so the eight terminology variants are
one source document in eight translations — **one fix covers all eight.** `studies.html` and
`variants.html` are hand-written.

## H5. Five heading-level skips

- `templates/patron.html` — **h1 to h6**, the worst
- `templates/features.html` — h1 to h3
- `templates/docs/battleofideologies.html`, `docs/dragon.html`, `docs/dragon.zh_CN.html` — h1 to h3

A skip leaves a screen-reader user unable to tell whether an `h3` is nested under a missing `h2` or is
a sibling. The `docs/` ones are markdown-sourced, as above. `patron.html`'s h6 is almost certainly a
heading chosen for its small text size rather than its level — the classic cause.

## H6. Four full pages with no `<h1>`

Verified by `extends` so partials are excluded:

- `templates/closed.html`, `templates/reports.html`, `templates/mod_public_chat.html` — all extend
  `base.html`, so they are real pages. `mod_public_chat.html` starts at `h2` four times;
  `reports.html` at `h2`; `closed.html` at `h3`.
- `templates/cwda_diagrams.html` starts at `h3`.

**Legitimately excluded:** `templates/catalogued/betza_diagrams.html` and
`templates/catalogued/rule_summary.html` do not extend anything — they are included fragments, and a
fragment correctly has no `h1`. 15 templates have no heading at all, and these are of that kind.

---

## LANDMARKS — GOOD, and worth saying so

| Element | Files using it | Redundant `role=` |
|---|---|---|
| `<main>` | **57** | 0 |
| `<aside>` | 29 | 0 |
| `<nav>` | 9 | 0 |
| `<header>` | 9 | 0 |
| `<footer>` | **0** | 0 |

**Two things done right.** `<main>` is present on 57 templates, which is what makes H3's absence
survivable for screen-reader users. And **nobody added `role="main"` beside `<main>`** — native
elements carry their role already, and duplicating it is a common, harmless-looking mistake that is
absent here.

**`<footer>` is used nowhere**, so there is no `contentinfo` landmark. Minor, and possibly correct if
there is no footer content; worth one look rather than a decision.

**One idea worth copying from lichess:** they emit `<h2>Navigation</h2>` inside the site header on
every page, so a screen-reader user can jump *to* the nav and, more importantly, past it. That is a
heading, not a landmark, and it costs one line in `template.html`.

---

## Summary

| | What | WCAG | Size |
|---|---|---|---|
| **H1** | **Game/analysis/puzzle/study pages have zero headings** | 1.3.1 **A** | this is candidate B |
| **H2** | **`<html>` has no `lang`; value already in `data-lang`** | 3.1.1 **A** | **one line** |
| H3 | No skip link | 2.4.1 **A** | one link + CSS |
| H4 | 10 templates with multiple `h1` (8 = one markdown source) | — (breaks the `1` convention) | 3 sources |
| H5 | 5 heading-level skips, incl. `patron.html` h1→h6 | 1.3.1 **A** | per file |
| H6 | 4 full pages with no `h1` | 1.3.1 **A** | 4 lines |
| — | Landmarks | **already good** | nothing |

**H2 is the single best line-for-value item found in any sweep so far**: one attribute, Level A, and it
decides whether a translated page is pronounced at all. H1 is the largest and is already candidate B.

**None of this touches the board, layout CSS or chessgroundx.**

---

# ADDENDUM 2026-09-27 — WHICH PAGES NEED **MORE** HEADINGS

Nikolay asked whether pages other than the game page would benefit from new headings. The original
sweep asked only whether headings were **broken** (missing `h1`, duplicated `h1`, level skips). It never
asked whether a page has **enough** signposts to navigate by — which is a different question, and the
answer widens candidate B.

**Measuring the templates is the wrong instrument**, because most user-visible content on the busy pages
is rendered by Snabbdom, not by the template. The right measure is headings emitted by each **client
page module**:

| Module | Headings | Page |
|---|---|---|
| `forum.ts` | **9** | forum |
| `tournamentRR.ts` | **7** | round-robin tournament |
| `tournament.ts` | **4** | arena tournament |
| `inbox.ts` | **3** | inbox |
| `myVariants.ts` | **3** | my variants |
| `study/studyView.ts` | 1 | study |
| **`lobby.ts`** | **2 — and neither is a page section (see below)** | **lobby** |
| **`profile.ts`** | **0** | profile |
| **`stats.ts`** | **0** | rating chart |
| **`games.ts`** | **0** | game lists, `games.html` + `game_search.html` |
| **`puzzleCtrl.ts`** | **0** | puzzles |
| **`editor/editorCtrl.ts`** | **0** | board editor |
| **`roundCtrl.ts`** | **0** | round page |
| **`analysis/index.ts`** | **0** | analysis page |

**Seven modules emit zero headings**, covering the round page, the analysis page, puzzles, the board
editor, the profile, the rating chart and every game list. **Candidate B as written covers only the
first two.**

## The lobby is the worst case, and it is the page everyone lands on

`lobby.ts` emits exactly two headings and **neither is a section of the page:**

- `:640` — `h('h2', header)` inside `div#header-block`, the **create-game dialog's** title.
- `:915` — `h('h4', _('A.I. Level'))`, also inside that dialog — **and an `h4` with no `h3` above it**,
  a level skip of the same kind as H5.

**So the lobby page itself has no headings at all.** Its major sections, each a `div#` with no heading:

`#leaders` · `#winners` · `#spotlights` · `#streams` · `#variants-catalog` · `#corr` · the seek table ·
the blog-post strip (`:2226`) · the auto-pairing block

A screen-reader user arriving at pychess presses `H`, gets nothing, and must read the entire page
linearly to find the seek list — which, per `lobby-and-tournament-sweep.md` LB1, they then cannot act
on anyway.

## What this changes

**Candidate B should be widened from "headings on the game page" to "headings on the pages that have
none".** It stays gate work — it adds markup rather than correcting it — but its scope is seven modules,
not two, and **the lobby deserves to be first** on traffic alone.

Rough shape per page, to be decided with the gate rather than here:

| Page | Sections wanting a heading |
|---|---|
| **lobby** | Seek list · Correspondence games · Tournaments · Leaderboard · Winners · Streams · Variants · Blog |
| round / analysis | the ten lichess uses (`lichess-reference.md` §3) |
| puzzle | Puzzle · Feedback · Actions — and its feedback region is also PE1's live region |
| profile | Ratings · Games · Trophies · Tournaments |
| board editor | Position · FEN · Castling · Actions |
| game lists | one per result group |

**Nothing else in the heading findings changes**: H4 (multiple `h1`), H5 (level skips) and H6 (missing
`h1`) stand as recorded, and the `h4` at `lobby.ts:915` joins H5's list.
