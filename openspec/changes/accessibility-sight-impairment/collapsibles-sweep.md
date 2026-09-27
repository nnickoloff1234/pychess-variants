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
- Below 800px the `visibility: hidden` does not apply. **CORRECTED — this bullet used to say the
  links are "in normal flow but reaching them needs the hamburger". That understates it, and in the
  keyboard sense it is backwards** (see F1a.3).

**Fix shape:** add `:focus-within` beside the `:hover` rule, so tabbing into the section reveals it.
That is one selector and it makes the menu keyboard-operable. Making it a proper button-driven
disclosure with `aria-expanded` is the fuller answer and a larger change.

---

## F1a. F1 MEASURED IN A RUNNING BROWSER — 2026-09-27

**The first runtime evidence anywhere in this change.** Everything else in the twelve sweeps is a
source read; this was measured against the dev server on `127.0.0.1:8080` by calling `.focus()` on
every `.topnav a` and checking `document.activeElement`.

### F1a.1 The numbers, and they are worse than F1 implies

| | pychess (measured) | lichess (measured, same method) |
|---|---|---|
| top-nav links in the DOM | 30 | 37 |
| **focusable** | **8** | **6** |
| unreachable | **22** | 31 |

The 8 are the home link, the six section titles, and Donate. **22 of 30 navigation links cannot be
reached by keyboard on any desktop viewport** — Tournaments, Simuls, Variants, Authors, Memory, Tv,
Current games, Video library, Players, Friends, Teams, Forum, Blog, Editor, Analysis, Import game,
Advanced search, Studies, My variants and the rest. Confirmed `.drp` computed `visibility: hidden`.

**lichess has the identical defect** (`lichess-reference.md` §11.1). This is not us being behind;
it is a pattern both sites share. What lichess *does* about it is §14: **its blind mode's only
substantive non-board change is revealing this menu, taking its nav from 6 focusable links to 31.**

### F1a.2 `:focus-within` fixes keyboard, NOT browse mode — and that qualifies the F1 fix

`:focus-within` fires only when something is *focused*. In NVDA/JAWS **browse mode** the user arrows
through a virtual buffer without focusing anything, so the rule never fires, and `visibility: hidden`
keeps those 22 links out of the buffer entirely. **A browse-mode user still hears 8 links after the
one-selector fix.**

This is exactly the browse/focus-mode split our user described (`user-report.md`), showing up in the
navigation rather than on the board. There is **no pure-CSS fix for it**: to be discoverable in
browse mode the collapsed state has to be *announced* as collapsed, which needs a real control with
`aria-expanded`. And the obvious dodge — keep the submenu in the accessibility tree while hiding it
visually — is not available, because anything in the tree is also focusable, which is F1a.3.

So: **`:focus-within` is still worth shipping** (one selector, no visual change, closes a Level A
keyboard hole), but it must not be recorded as *the* fix for F1. The disclosure is.

**And the disclosure is smaller than F1 suggests, because we already ship one.** The login menu is
`<button class="login-btn" aria-haspopup="true" aria-expanded="false">` + `role="menu"`/`menuitem`
(`templates/template.html:88-95`) with `aria-expanded` genuinely maintained in
`client/main.ts:441-480`. `aria-expanded` is also used in `profileActionOverflow.ts:16`,
`tournamentForm.ts:161`, `simulForm.ts:76` and `studyView.ts:366`. Giving the top nav the same
treatment makes it consistent with a menu we already have working — it is not new machinery.

### F1a.3 Below 800px the failure INVERTS: off-screen but still tabbable

`site.css:823` hides the drawer with **`transform: translateX(-100%)`** on `.topnav` and on
`.topnav a`, plus `section > a { display: none }`. `transform` does **not** remove an element from
the tab order or the accessibility tree.

Verified directly: a `.drp a` pushed to `translateX(-9999px)` (bounding rect fully off-screen,
`right < 0`) still reported **`focusable: true`**, `offsetParent` non-null, computed
`visibility: visible`.

**So below 800px the nav links are in the tab order while the drawer looks closed** — a sighted
keyboard user tabs through ~24 invisible links. That is the mirror image of the desktop bug, and it
means F2 (the hamburger) is not what stands between a keyboard user and those links; it is what
stands between them and *seeing* them.

> **Evidence level.** F1a.1 and F1a.3's mechanism were measured live. The <800px layout itself was
> reproduced by injecting that media block's rules, **not** observed at a real narrow viewport — i3
> is a tiling WM and refuses the window resize. Worth one end-to-end check in the harness before this
> is treated as settled.

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
