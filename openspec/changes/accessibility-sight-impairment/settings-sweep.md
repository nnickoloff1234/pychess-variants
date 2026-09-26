# Settings and board-settings — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

One finding here has the largest control count in the change (323) and one of the cheapest fixes, and
one generalises into a site-wide cluster that has nothing to do with settings.

---

## SB1. 323 THEME AND PIECE RADIOS HAVE NO NAME — and the names are already in the data

`client/boardSettings.ts` builds every picker the same way:

```ts
h('input#board' + i, { props: { type: 'radio', name: 'board', value: i } }),
h('label.board…', { attrs: { for: 'board' + i } }, ''),      // ← '' : no text at all
```

and for pieces at `:612` and `:623`:

```ts
pieces.push(h('label.piece.piece98', { attrs: { for: 'piece' + i } }, ''));
```

**The label is correctly associated and provides no name.** The visual is a CSS background image on
`.board` / `.piece98` / `.piece99`. And `boardSettings.ts` contains **0 `aria-`**, so there is no
fallback.

**Scale, counted from `client/variants.ts`:**

| | Families | Options |
|---|---|---|
| Board themes (`boardCSS`) | 23 | **114** |
| Piece sets (`pieceCSS`) | 41 | **209** |
| | | **323 radios with no accessible name** |

A screen-reader user opens board settings and hears *"radio button, not checked"* 323 times.

**But the fix is ONE LINE IN EACH OF TWO LOOPS, because the names already exist as data:**

- `pieceCSS: ['classic', 'arrow', 'disguised', …]` — **already human-readable.** Pass the string as the
  label's text or `aria-label` and all 209 are named, for free.
- `boardCSS: ['8x8brown.svg', '8x8blue.svg', '8x8green.svg', …]` — filenames, but the meaningful part
  is right there. A proper display name per theme would be better; the raw string is already
  immeasurably better than nothing.

So the alarming number is not the cost. **323 controls, two lines** — and a follow-up decision about
whether board themes deserve nicer names than their filenames.

- **WCAG 4.1.2 Name, Role, Value — Level A.**

## SB2. The settings panel has no dialog semantics and no keyboard dismissal

`client/settingsView.ts:16-20` renders `div#settings-panel` containing `div#settings`, opened by
`#btn-settings` (`:34`) and hidden with `display: none` (`static/site.css:1046-1047`).

- **`role="dialog"`: 0. `aria-modal`: 0.** A screen reader is never told a panel opened.
- **`Escape`: 0. `keydown`: 0.** No keyboard dismissal.
- And per `collapsibles-sweep.md` **F3 the button carries no `aria-expanded`**, so activating it
  announces nothing either.

So it is the third instance of the same shape — after the lobby/tournament dialogs
(`lobby-and-tournament-sweep.md` LB3/TN4) and the forum's (`inbox-and-forum-sweep.md` FR1). **The
house pattern that gets it right is `client/study/addToStudy.ts`**, which registers a real `document`
keydown and closes on Escape.

## SB3. UNTRANSLATED `aria-label`s — a site-wide cluster, and the settings button is one of them

`settingsView.ts:34` is `attrs: { 'aria-label': 'Settings' }` — raw English. That turned out not to be
local:

**In `client/` — 5 untranslated against 30 translated:**

| Where | Value |
|---|---|
| `chat.ts:131` | `'Chat input'` |
| `challengeView.ts:298` | `'Challenges: 0'` |
| `settingsView.ts:34` | `'Settings'` |
| `lobby.ts:2132` | `'Seek Tabs'` |
| `analysis/index.ts:195` | `'Analysis Tabs'` |

**In `templates/` — at least 10, and five are in the site header, so they are on EVERY page:**
`template.html:76` "Search users", `:135` "Administration", `:141` "Challenges: 0", `:147`
"Notifications: 0", `:157` "Settings". Plus `authors.html:14, 58`, `friendly_sites.html:18`,
`admin_nav.html:1`, `cwda_diagrams.html:19`.

**Why this is worse than an untranslated visible string.** An `aria-label` **replaces** the name a
screen reader announces — it is not a supplement. So these are precisely the controls a blind
non-English user hears in a foreign language, and five of them are in the header of every page. A blind
Bulgarian user meets five English words before reaching any content, on every page — **and with
`<html lang>` missing (`headings-and-landmarks-sweep.md` H2, `docs-pages-sweep.md` D2) the synthesiser
is not even configured to pronounce English.**

The two findings compound, and both are trivial: **~15 `_()` / `{% trans %}` calls, plus one
`lang` attribute.**

- **WCAG 3.1.2 Language of Parts — Level AA** (and 3.1.1 for the `lang` half).

---

## POSITIVES

- **The privacy and push checkboxes are properly labelled.** `settingsView.ts:149-173` pairs each with
  `h('label', { attrs: { for: … } }, _('Only friends can message me'))`,
  `_('Correspondence move push notifications')` and its sibling — `for`, matching `id`, and gettext.

  **Correction to something said earlier in this change:** these three appeared in the *first, broken*
  output of the label sweep (the run that also claimed 18 of 23 images lacked `alt`). The corrected run
  resolved them properly and they are not in `alt-and-labels-sweep.md` L5's list. They are fine.
- **`settingsView.ts:71` uses `attrs: { role: 'separator' }`** on the menu divider — a genuinely
  sophisticated touch, in the same class as the forum's `aria-hidden` on decorative icons.
- **`static/switch.css:50` — `input:focus + .sw-slider`.** The toggle gets a focus style through the
  adjacent-sibling selector, which is the correct technique when the real `<input>` is visually hidden
  behind a styled slider. (No `:focus-visible`, so it also shows on mouse click — minor.)

---

## Summary

| | What | WCAG | Size |
|---|---|---|---|
| **SB1** | **323 theme/piece radios unnamed; names already in `variants.ts`** | 4.1.2 **A** | **two lines** |
| SB2 | Settings panel: no `role="dialog"`, no `aria-modal`, no `Escape`, no `aria-expanded` | 4.1.2 A / 2.1.1 A | copy `addToStudy.ts` |
| **SB3** | **~15 untranslated `aria-label`s, 5 of them on every page** | 3.1.2 AA | **~15 `_()` calls** |

**SB1 and SB3 together are about twenty lines and fix 338 controls.** SB2 is the fourth sighting of the
same dialog pattern, which by now argues for fixing the pattern once rather than per page.

**Nothing here touches the board, layout CSS or chessgroundx.** Candidate G.
