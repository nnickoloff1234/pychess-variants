# Profile and study pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

**Mixed result, and the good half is more useful than the bad half:** the profile has two real gaps,
one of which is a one-line fix; **study is the best-built part of the client and is the in-house model
to copy.**

---

## PF1. The profile games table has no column headers

`client/profile.ts` renders `h('table#games')` (at `:77`, `:265`, `:285`) filled with
`h('tr', [ … h('td') … ])` — and **`<thead>` count: 0, `<th>` count: 0.**

So a screen reader announces "table, N rows, 5 columns" and then unlabelled cells: a date, two names,
a result, a variant, with nothing saying which is which.

**And `client/gameSearch.ts:141` reuses the same `renderGames`**, so the advanced-search results table
has the identical gap.

**Contrast with the lobby**, whose seek table has a proper `<thead>` and six `<th>` (Player, Rating,
Time, Variant, Mode) — see `lobby-and-tournament-sweep.md` LB4. **The two tables were built by
different hands, and one of them is right.** The lobby's is the pattern to copy.

## PF2. THE RATING CHART IS INVISIBLE — and the fix is ONE IMPORT LINE

`client/stats.ts` renders the rating history with Highcharts into an empty `h('div#stats-chart')`
(`:75`), and the file contains **0 `aria-`, 0 `role:`, 0 `alt:`**. Highcharts draws SVG; with no
accessibility layer that SVG is an unlabelled blob, so a blind user gets nothing at all from the
rating history.

**The fix is already installed and unused.** `highcharts@^13.0.2` is a dependency we already ship, and
it bundles its own accessibility module:

```
node_modules/highcharts/modules/accessibility.js     ← present on disk
grep -rn 'modules/accessibility' client/             ← 0 hits
```

One line:

```ts
import 'highcharts/modules/accessibility';
```

That gives a screen-reader description of the chart, **keyboard navigation of the data points**, and a
text summary of each series — all from Highcharts, none of it written by us.

**After `<html lang>`, this is the cheapest high-value item found in any sweep.** The module is on
disk, already paid for, and switched off.

Also on this chart: its two controls, `h('input#linear')` and `h('input#humans')` (`stats.ts:76, 78`),
are unlabelled checkboxes — already in `alt-and-labels-sweep.md` L5.

## PF3. `templates/profile.html` has an `<h1>` and an `<h3>` and no `<h2>`

One of each, no intermediate level. Minor, and it did not trip the document-order skip check in
`headings-and-landmarks-sweep.md` H5 because of the order they appear in.

## PF4. POSITIVES

- `<main>` plus two `<aside>` landmarks, and **exactly one `<h1>`.**
- **`client/profileActionOverflow.ts` is one of only two files in `client/` with BOTH a `keydown` and
  an `Escape` handler**, alongside maintaining `aria-expanded` (`:16`). Its overflow menu is correctly
  built — already noted in `collapsibles-sweep.md`.
- `client/profile.ts:286` looked like a clickable `<div#profile-games-gate>`; it **wraps a real
  `<button attrs: { type: 'button' }>`**. False positive.

---

## ST1. STUDY IS THE BEST-BUILT PART OF THE CLIENT — and it is the model to copy

Measurably, not impressionistically:

| | Evidence |
|---|---|
| Focus styling | **`study.css` has 24 `:focus-visible`** rules — against `site.css`'s 4 (and `site.css` has 6 `outline: none`) |
| Live regions | `studyView.ts` and `studyGamebookPlayback.ts` each carry `aria-live` — **2 of the very few in `client/`** |
| Keyboard | `studyView.ts` has **4 `keydown`** handlers and an `Escape`; `studyGamebookPlayback.ts` has 2 and a `role="button"` |
| Focus targets | `studyView.ts` uses `tabindex` in 4 places |
| `aria-expanded` | maintained in several places in `studyView.ts` |

**And its dialog gets right exactly what the lobby and tournament dialogs get wrong.**
`client/study/addToStudy.ts` registers a real `document` keydown handler (`:23`, removed at `:37-39`)
and closes on Escape, **with the backdrop click at `:72` as an additional path rather than the only
one.** Compare `lobby-and-tournament-sweep.md` LB3/TN4, where a `<span>` is the only way out and there
is no `Escape` at all.

`studyView.ts:1541` shows the standard applied: a `<span>` label beside
`h('button', { attrs: { type: 'button', title: _('Save and close'), 'aria-label': _('Save and close') } })`.

**So the in-house model for dialogs, focus visibility and live regions is `study/`, not lichess.**
That matters for the eventual change: copying a pattern that already exists in this codebase is
cheaper to review and cannot drift from house style.

## ST2. The study move tree shares the `<move>` problem — so one fix covers four pages

`client/study/studySync.ts:3` imports `updateMovelist` from `../movelist`, and `client/movelist.ts`
renders 6 `h('move', …)` — the custom `<move>` element with **no role, not focusable, not a list**,
first recorded in the proposal's survey.

**So the round page, the analysis page, puzzles and studies all share one move-list implementation.**
Whatever is decided for `<move>` — a real `<ol>`/`<li>`, or focusable buttons per ply — lands on all
four at once. That is the largest single piece of leverage found in any sweep.

## ST3. Smaller

- `templates/studies.html` has **2 `<h1>`** — already `headings-and-landmarks-sweep.md` H4.
- `studyTree.ts`, `commentEditor.ts`, `studyChapterForm.ts`, `chapterNavigation.ts` show zero
  aria/role/keydown — but **`studyTree.ts` renders nothing at all** (no `h('` calls; it is pure tree
  logic), so only the view files are in scope.

---

## A METHOD CORRECTION — the clickable-element classifier over-reports

Recorded because it affects how the earlier sweeps should be read.

My detector attributes a click handler to the **nearest preceding `h('…')`**. That misfires whenever a
`<span>` or `<div>` label precedes a real `<button>` inside the same array — and it produced **three
false positives in this sweep alone**: `profile.ts:286`, `studyView.ts:1541` and `:1723`,
`addToStudy.ts:111`.

The lobby and tournament findings were each opened and verified by hand, so those stand (and two were
*withdrawn* for exactly this reason — `div#create-button` and `div#action`). **But the heuristic
over-reports, and no hit should be quoted without eyeballing the source.**

---

## Summary

| | What | WCAG | Size |
|---|---|---|---|
| **PF2** | **Rating chart has no accessibility layer; the module is installed and unused** | 1.1.1 **A** | **one import line** |
| PF1 | Profile + game-search tables have no `<th>` | 1.3.1 **A** | copy the lobby's `<thead>` |
| PF3 | `profile.html` skips `<h2>` | 1.3.1 A | one line |
| **ST2** | **`<move>` is shared by round, analysis, puzzle and study** | 1.3.1 A | **one fix, four pages** |
| ST3 | 2 `<h1>` in `studies.html` | — | one line |
| **ST1** | **Study is the house model for dialogs, focus and live regions** | — | **nothing; copy it** |

**None of this touches the board, layout CSS or chessgroundx.** Candidate G.
