# Focus order, tabindex and focus visibility — sweep

Asked for 2026-09-27. **Findings only. Nothing here is to be fixed until the gate in task 3.4**;
these are recorded so the eventual change has its worklist ready.

## HOW THIS SWEEP WAS DONE — and its limits

**Static reading of source only. The app was never run.** Everything below comes from `grep`/`sed`
over `templates/`, `client/*.ts` and `static/*.css`. No browser, no rendered DOM, no screen reader,
no accessibility-tree inspection.

The one piece of real rendered DOM used anywhere in this change is **lichess's**, which Nikolay
captured from Firefox by hand — not ours.

| Claim type | Confidence | Why |
|---|---|---|
| Template markup (`<div class="hamburger">`) | **high** | literal source |
| CSS rules (`.drp { visibility: hidden }`) | **high** | literal source |
| Attributes written in TS (`tabindex: String(t)`) | **high** | literal source |
| "attribute X is never set" | **good, not certain** | a grep can miss a dynamic key or a library |
| **Computed accessibility tree** | **NOT KNOWN** | requires a running browser |
| **Actual focus order** | **NOT KNOWN** | DOM order + tabindex + runtime `display`; only observable at runtime |
| **What a screen reader announces** | **NOT KNOWN** | requires NVDA/TalkBack |

**The largest gap.** `#settings`, `#notify-app`, `#challenge-app` and both two-board pages are built
by Snabbdom at runtime. I read the TypeScript that generates them, which is sound for *what attributes
are set*, but no one has looked at the DOM those produce. **Tasks 2.1 and 2.2 — install a screen
reader and walk the page — are what validate every claim in this file**, and they have not been done.

So: treat "X is missing" as reliable, and "the user therefore experiences Y" as a strong inference
awaiting a real screen reader.

---

## T1. The lobby tablist has no keyboard entry point

`client/lobby.ts:2082, 2089, 2103, 2123` — **all four tabs are hardcoded `tabindex: '-1'`.**

At runtime `lobby.ts:275` does `initialEl.setAttribute('aria-selected', 'true')` — so the *selected*
state is corrected. **`tabindex` never is**, not there and not in `changeTabs`.

`tabindex="-1"` means programmatic focus only. With no tab at `0`, **Tab never lands on a lobby tab**,
so a keyboard user cannot switch between Lobby, Correspondence and games-in-play at all.

- **WCAG 2.1.1 Keyboard — Level A.** Affects every keyboard-only user.
- **Fix:** the roving pattern — exactly one tab at `0`, the rest `-1`, moved on selection. **The
  codebase already does this correctly** at `client/tournamentRR.ts:1013`
  (`tabindex: this.viewMode === mode ? '0' : '-1'`), so it is copying local precedent, not inventing.
- `client/analysis/index.ts:115-116` also gets this right — one tab receives `'0'`.

## T2. No tablist on the site has arrow-key navigation

`client/view.ts:202` `setAriaTabClick()` binds **`click` only**. `changeTabs()` (`view.ts:210-226`)
manages `aria-selected` and panel `display` and **never touches `tabindex` or listens for keys**.

A `role="tablist"` advertises a contract: Left/Right arrows move between tabs. Declaring
`role="tab"` while handling only clicks **promises an interaction the page does not honour** — which
is worse than plain buttons, because the screen reader tells the user those keys will work.

Affects the lobby, analysis, crosstable and two-board tablists.

## T3. The two-board tabs emit POSITIVE tabindex values

`client/two-board/common/tabs.ts:116` (panels) and `:143` (tabs) — **`tabindex: String(t)`**, where
`t` is the tab's index. So the round and analysis bughouse pages emit `tabindex="0"`, `"1"`, `"2"`,
`"3"` on four tabs *and* four panels.

**Any positive tabindex hoists the element to the front of the entire document's tab order**, ahead
of every naturally focusable element, ordered by value rather than by position. So Tab on a bughouse
page visits tab1, tab2, tab3, then the panels, and only then the rest of the page.

Two things make this clearly a slip rather than a decision:

- `aria-selected` in **the same attribute object** is computed properly (`t === first ? 'true' :
  'false'`), so the roving pattern was understood; tabindex just did not receive the same treatment.
- The correct pattern already exists two files away (`tournamentRR.ts:1013`).

**Fix:** `t === first ? '0' : '-1'` on the tabs; panels want `-1` (they are focus targets for
programmatic focus, not tab stops).

## T4-T6. Focus indicators removed with no replacement — WCAG 2.4.7, Level AA

`outline: none` with nothing substituted means a keyboard user cannot see where they are.

- **T4. `static/site.css:2302-2303` — `.btn-controls button:focus { outline: none }`.** These are
  the **round page's game controls — Draw, Resign, and `#gear`.** Tabbing to Resign shows nothing.
  The adjacent `.selected` rule sets a background, but that is selection state, not focus.
- **T5. `static/site.css:2393-2394` — `button.icon:focus { outline: none }`.** Icon buttons
  site-wide.
- **T6. `static/site.css:3800` — `.search-bar .input input { outline: none }`**, alongside
  `border: none`. Reachable by Tab (it is clipped by `overflow: hidden`, not hidden — see
  `collapsibles-sweep.md` F5) but invisible when reached.

`::-moz-focus-inner { border: 0 }` beside T4 and T5 is legitimate Firefox normalisation, not part of
the problem. `site.css:3312` is a switch track; worth checking the switch's own focus state but the
outline there is likely harmless.

**Fix shape:** replace each with a visible `:focus-visible` indicator. `:focus-visible` is the right
selector — it shows the ring for keyboard focus and not for mouse clicks, which is why these outlines
were suppressed in the first place.

## The stylesheet split, which tells us where to look

| | `:focus` | `:focus-visible` | `outline: none` |
|---|---|---|---|
| `study.css` | 34 | **24** | 2 |
| `site.css` | 16 | 4 | **6** |
| `authors`, `friendly-sites`, `variants`, `study-playback`, `embed` | few | **all of them** | 0 |
| `team`, `forum`, `tournament`, `faq`, `switch` | 1-5 | **0** | 0-1 |

**A clear generational pattern.** Newer and dedicated stylesheets use `:focus-visible` properly;
`site.css` — the oldest and the one every page loads — has the fewest and all six suppressions.
`study.css` is the model to follow, and it is ours.

---

## Good practice found, worth not breaking

- **`templates/arena-new.html:216` and `templates/simul_new.html:67`** —
  `tabindex="-1" aria-hidden="true"` on the native `<select>` that a custom variant picker replaces.
  **This is exactly the correct way** to retire a replaced native control: out of the tab order and
  out of the accessibility tree, while still submitting with the form.
- **`client/tournamentForm.ts:214`, `client/simul/simulForm.ts:178`** — `row.tabIndex = -1` on option
  rows, which is right for an `aria-activedescendant` listbox (8 `aria-activedescendant` occurrences
  exist in the codebase).
- **`client/round.ts:42`** — `role="button" tabindex="0"` on a non-button, correctly paired.
- **`client/tournamentRR.ts:1013`** — a correct roving tabindex, and the precedent for T1 and T3.
- **`client/analysis/analysisCtrl.ts:339`** — queries `.analysis-tabs [tabindex="0"]`, i.e. written
  expecting exactly one tab stop. The intent was right there.

---

## Summary for the worklist

| | What | WCAG | Size |
|---|---|---|---|
| T1 | Lobby tablist unreachable by keyboard | 2.1.1 **A** | one ternary, precedent exists |
| T2 | No tablist has arrow-key navigation | — (broken ARIA contract) | one keydown handler in `view.ts`, fixes all tablists |
| T3 | Two-board tabs emit positive tabindex | — (hijacks page tab order) | one ternary |
| T4 | Draw/Resign focus invisible | 2.4.7 **AA** | one rule |
| T5 | Icon buttons focus invisible | 2.4.7 **AA** | one rule |
| T6 | Search input focus invisible | 2.4.7 **AA** | one rule |

**T2 is the best value.** One keydown handler in the single shared helper `view.ts:202` repairs every
tablist on the site at once.

**None of this touches the board, layout CSS or chessgroundx**, and all of it helps sighted
keyboard-only users too — so like `collapsibles-sweep.md` F1/F2 it belongs to candidate G and does
not depend on the gate's verdict.
