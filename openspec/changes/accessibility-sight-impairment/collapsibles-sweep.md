# Collapsible sweep — aria-expanded and keyboard reachability

Asked for 2026-09-26 after `candidates.md` H found three collapsibles correct and noted the rest
unaudited. Method: every `aria-expanded` write in `client/`, every `aria-expanded` in `templates/`,
every open/close class toggle, then the hiding mechanism of each panel in `static/site.css`.

**Result: 5 correct, 4 defects, 1 minor.** Two defects are not missing attributes — they are controls
a keyboard user cannot operate at all.

**The hiding mechanism decides everything**, and this sweep turned on knowing which is which:

| Mechanism | In the accessibility tree? | Focusable? |
|---|---|---|
| `display: none` | no | no |
| `visibility: hidden` | **no** | no |
| `overflow: hidden` clipping | **yes** | **yes** |
| `opacity: 0`, off-screen | yes | yes |

`visibility: hidden` hiding content as completely as `display: none` is the fact that makes F1 a real
bug rather than a cosmetic one.

---

## CORRECT — leave alone

1. **Login dropdown** — `templates/template.html:89` has `aria-haspopup="true"`
   `aria-expanded="false"`, panel is `role="menu"` with `role="menuitem"` children, and
   `client/main.ts` maintains the attribute at lines 448, 460, 473, 487.
2. **Profile action overflow** — `client/profileActionOverflow.ts:16`, `templates/profile.html:118`.
3. **Tournament form** — `client/tournamentForm.ts:163`, `templates/arena-new.html:213`.
4. **Simul form** — `client/simul/simulForm.ts`, `templates/simul_new.html:64`.
5. **Study view** — several, `client/study/studyView.ts`.

---

## F1. The main nav's submenus are hover-only — WORST

**`static/site.css:939-940` and `:996`, inside `@media (min-width: 800px)`:**

```css
.drp { visibility: hidden; … }                    /* line 939 */
.topnav section:hover .drp { visibility: visible; }  /* line 996 */
```

No `:focus-within`. No button. No `aria-haspopup`, no `aria-expanded`. The container is a bare
`<section>` holding a top-level `<a>` and a `<div class="drp">` of links
(`templates/template.html:83-90` and the sections after it).

**So on every desktop viewport, every secondary navigation link — Create a game, Tournaments,
Simultaneous exhibitions, and the rest — is absent from the accessibility tree and unreachable by
keyboard.** The top-level link (Play, Learn, …) is reachable and its `href` works; nothing inside is.

- **WCAG 2.1.1 Keyboard — Level A.** Not AA, not AAA. Level A.
- **Affects every keyboard-only user**, not only screen-reader users.
- Below 800px the `visibility: hidden` does not apply, so the links are in normal flow — but reaching
  them needs the hamburger, which is F2.

**Fix shape:** add `:focus-within` beside the `:hover` rule, so tabbing into the section reveals it.
That is one selector and it makes the menu keyboard-operable. Making it a proper button-driven
disclosure with `aria-expanded` is the fuller answer and a larger change.

## F2. The hamburger is a `<div>`, not a button

**`templates/template.html:6`:**

```html
<div class="hamburger hamburger--vortex">
  <div class="hamburger-box"><div class="hamburger-inner"></div></div>
</div>
```

Click handler at `client/main.ts:345`. **No `tabindex`, no `role`, no accessible name, no
`aria-expanded`, no `aria-controls`.**

**A keyboard or screen-reader user cannot open the mobile navigation at all.** There is nothing to
focus and nothing to announce.

- **WCAG 2.1.1 Keyboard — Level A**, and **4.1.2 Name, Role, Value — Level A.**

**Fix shape:** make it a `<button>` with an accessible name, `aria-expanded` maintained by the
existing handler, and `aria-controls` pointing at `.topnav`. The visual `hamburger--vortex` markup can
stay inside the button.

## F3. Three header panels have no `aria-expanded`

`templates/template.html:141, 147, 157` — `#btn-challenge`, `#btn-notify`, `#btn-settings`.

These are **real `<button>`s with `aria-label`**, and their panels are correctly hidden with
`display: none` (`static/site.css:1046-1047`), so the closed state is properly absent. The defect is
the announcement:

- No `aria-expanded`, so the button never says "collapsed" or "expanded".
- No `aria-controls`, so nothing links the button to `#challenge-app` / `#notify-app` / `#settings`.

**Consequence:** a screen-reader user activates "Settings" and hears nothing change. The panel opened
somewhere they have no pointer to, and they have to hunt for it. Open/close logic is in
`client/settingsView.ts:47-57`, `client/notifyView.ts:320`, `client/challengeView.ts:277` — each
already touches the button, so the attribute goes on the line that is already there.

- **WCAG 4.1.2 Name, Role, Value — Level A.**

## F4. The analysis and puzzle settings menu has no `aria-expanded`

`client/movelist.ts:311` renders `h('button#bars', …)` with `title: _('Menu')` — a real button.
`AnalysisController.toggleSettings()` (`client/analysis/analysisCtrl.ts:663-676`) swaps
`display: flex`/`none` between `.analysis-tools` and `.analysis-settings` and toggles `.active` on
`#bars`, **never touching `aria-expanded`.** `client/puzzleCtrl.ts:446` uses the same element.

Same shape as F3, same fix, same line already being written.

- **WCAG 4.1.2 — Level A.**

## F5. The search icon is a non-focusable `<div>` — MINOR, and instructive

`templates/template.html:74` is `<div class="search-icon"></div>` with `onclick` at
`client/main.ts:359`. Not focusable, no role, no name.

**But the feature is still reachable, and the reason is the point of this sweep.** `.search-bar`
collapses with `width: 50px` + **`overflow: hidden`** (`static/site.css:3737-3745`) — clipping, not
`display: none` and not `visibility: hidden`. **Clipped content stays focusable and stays in the
accessibility tree**, and the input carries `aria-label="Search users"`. So a keyboard user can Tab
straight to it; the browser scrolls it into view and `.active` is only cosmetic.

So the icon is a redundant mouse-only control rather than the sole way in. Low priority — worth
making a button for consistency, not urgent.

---

## Why these are worth doing whatever the gate decides

**F1 and F2 are Level A keyboard failures that affect every keyboard-only user**, sighted or not.
They are not blind-mode features and they do not wait on the gate in task 3.4. They belong to
candidate G — ordinary semantics, always on, benefiting everyone — and F1 in particular is one CSS
selector away from being fixed.

F3 and F4 are four lines total, each on a line the code already writes.

**None of this touches the board, a stylesheet's layout, or chessgroundx.**
