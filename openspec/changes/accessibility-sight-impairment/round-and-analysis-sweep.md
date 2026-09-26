# Round and analysis pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

**These are the pages our user cannot play on.** Earlier sweeps touched them in passing; this is the
systematic pass, and it contains **the most severe finding in the whole change** — worse than the
lobby's, because it happens mid-game under a clock.

---

## RA1. YOU CANNOT ACCEPT OR DECLINE A DRAW, TAKEBACK OR REMATCH BY KEYBOARD

`client/roundCtrl.ts` builds every offer dialog from bare `<div>`s:

```ts
h('div#offer-dialog', [
    h('div.dcontrols', [
        h('div', { class: { reject: true }, on: { click: () => this.rejectTakeback() } },
          h('i.icon.icon-abort.reject')),
        h('div.text', _('Your opponent proposes a takeback')),
        h('div', { class: { accept: true }, on: { click: () => this.acceptTakeback() } },
          h('i.icon.icon-check')),
```

**Nine such controls, across five offer types:**

| Offer | Lines |
|---|---|
| Takeback | 752, 758, 774 |
| **Draw** | 829, 833 |
| Correspondence move confirmation | 852, 856 |
| **Rematch** | 1030, 1034 |

Every one is a `<div>` with a click handler: **no `role`, no `tabindex`, no accessible name** — the
only content is an `<i>` icon — **and `roundCtrl.ts` contains 0 `keydown`, 0 `aria-*` and 0
`aria-live`.**

**The cruelty of it is that the message IS readable.** `h('div.text', _('Your opponent proposes a
takeback'))` sits between the two controls, so a screen-reader user is **told about the offer and then
cannot respond to it.** Not a silent failure — an announced one with no way out. And a draw offer
expires while they hunt.

- **WCAG 2.1.1 Keyboard — Level A**, plus 4.1.2 (no name, no role).
- **Fix shape:** two real `<button>`s with `aria-label`, in the shape `roundCtrl.ts:497` already uses
  for Resign. The pattern is eleven lines away in the same file.

## RA2. The move-navigation buttons have no names

`client/movelist.ts` renders **7 buttons, of which 4 are unnamed** — and the split is within one file:

| Line | Icon | Named? |
|---|---|---|
| 250 | `icon-refresh` | **named** |
| 253 | `icon-fast-backward` | **UNNAMED** |
| 267 | `icon-step-backward` | **UNNAMED** |
| 282 | `icon-step-forward` | **UNNAMED** |
| 284 | `icon-fast-forward` | **UNNAMED** |
| 288 | `icon-exchange` (flip) | **named** |
| 311 | `icon-bars` (menu) | **named** |

They are real `<button>`s, so they are focusable — a screen-reader user Tabs onto **"button", "button",
"button", "button"** and cannot tell which goes to the start, back one, forward one, or to the end.
These are the primary way to review a game.

`title` or `aria-label` on four lines. **Inconsistency within a single file makes this a slip rather
than a decision** — three of its siblings are named.

- **WCAG 4.1.2 Name, Role, Value — Level A.**

## RA3. The clock is readable, but unnamed and silent

`client/clock.ts:240-254`:

```ts
h('div.clock-time.min', printed.minutes),
h('div.clock-sep', { class: { low: millis < 500 } }, ':'),
h('div.clock-time.sec', printed.seconds),
```

**Better than the board**: this is real text, so a screen reader *can* read it if the user navigates
there. But `clock.ts` has **0 `aria-label`, 0 `role="timer"`, 0 `aria-live`**, which costs three
things:

1. **Neither clock says whose it is.** Two clocks, identical markup, no names.
2. **Time is never announced.** A user must keep navigating back to re-read it.
3. **It reads as three separate runs** — "5", ":", "23" — not "5 minutes 23 seconds".

**Our user asked for exactly this:** *"what time remains for players"*. Lichess answers it with the
`c` command in the input field and the `t` key on the board, plus a Clocks heading — see
`lichess-reference.md` §3-5.

## RA4. The chat's `<ol>` is malformed, so it is not a list

`client/chat.ts:119`:

```ts
h(`ol#${chatType}-messages`, [h('div#messages')]),
```

and the messages are patched into that inner `<div>` as `<li>` (`:177`, `:182`, `:200`).

**HTML permits only `<li>` and script-supporting elements as children of `<ol>`.** With a `<div>` in
between, the `<li>`s are not items of that list — so a screen reader does not announce "list with N
items", list navigation (`I` in NVDA) fails, and each message loses its position in the sequence.

The fix is structural, not additive: patch the `<li>`s into the `<ol>` directly, or make the wrapper
`<li>`. Either way it is the `<div>` that is wrong, not anything missing.

## RA5. The chat's one accessible name is the one string that is not translated

`client/chat.ts:131`:

```ts
'aria-label': 'Chat input',
```

Hardcoded English — while lines 105, 106, 107 and 112 of the same file all use `_()`. So on a
translated page every visible string is localised and the single screen-reader-only string is not.
**A non-English blind user hears "Chat input" in English**, which is also the only clue they get about
that field.

`_('Chat input')` and a `lang/` entry. One word of change, and it matters more here than a visible
string would, because it is the field's only name.

## RA6. The chat never announces an incoming message

`client/chat.ts`: **0 `aria-live`.** On a round page the chat is how your opponent talks to you —
"good luck", "sorry, lag", a draw discussion. A blind player is never told a message arrived.

Same shape as `inbox-and-forum-sweep.md` IB1, and the same one-attribute fix.

## RA7. Two custom elements used as controls

- **`client/analysis/analysisCtrl.ts:1284` — `<pv-san>` with a click handler.** These are the engine's
  principal-variation moves; clicking one navigates to it. A custom element: no role, not focusable,
  no name.
- **`<move>` in `client/movelist.ts`** — already recorded, and per `profile-and-study-sweep.md` ST2 it
  is **shared by the round page, the analysis page, puzzles and studies**, so one fix covers four.

## RA8. ZERO live regions and ZERO headings — the full inventory

Eleven files checked. **`aria-live`: 0 in every one. Headings: 0 in every one.**

`roundCtrl.ts` · `round.ts` · `gameCtrl.ts` · `movelist.ts` · `chat.ts` · `clock.ts` ·
`analysis/analysisCtrl.ts` · `analysis/index.ts` · `two-board/round/roundCtrl.ts` ·
`two-board/round/roundControls.ts` · `two-board/analysis/analysis.ts`

This is the complete evidence behind `headings-and-landmarks-sweep.md` H1 and behind candidate D. **On
the page a game is played, nothing is announced and nothing can be navigated to.**

---

## POSITIVES

- **The game controls are real, named buttons.** `roundCtrl.ts:497`
  `h('button#resign', { props: { title: _('Resign') } }, [icon])`; `:621` `button#abort` with
  `title: _('Abort')`. **So the pattern RA1 and RA2 need already exists in the same file** — which is
  the best possible position to be in.
- **`client/analysis/index.ts` is properly built**: 9 `role:`, 14 `aria-`, 11 `tabindex`, with one tab
  at `'0'` as an entry point (`focus-and-tabindex-sweep.md` T1 notes this as the good example). The
  positive-tabindex defect T3 is in the **two-board** tabs, not this one.
- **Some keyboard handling exists**: `gameCtrl.ts` has 4 `keydown` and an `Escape`;
  `analysis/analysisCtrl.ts` has 5 and an `Escape`.
- **`clock.ts` emits real text**, unlike chessgroundx. It needs naming, not inventing.

---

## Summary

| | What | WCAG | Size |
|---|---|---|---|
| **RA1** | **Cannot accept/decline draw, takeback, rematch, corr move — 9 `<div>`s, 5 offer types** | 2.1.1 **A** + 4.1.2 | 9 `<div>`→`<button>`, pattern 11 lines away |
| **RA2** | **4 move-navigation buttons have no name** | 4.1.2 **A** | 4 `aria-label`s |
| RA3 | Clock unnamed, silent, reads as 3 fragments | 4.1.2 A / 4.1.3 AA | labels + one live region |
| RA4 | Chat `<ol>` contains a `<div>`, so it is not a list | 1.3.1 **A** | structural, one nesting fix |
| RA5 | `'Chat input'` hardcoded in English | 3.1.2 A | `_()` + a `lang/` entry |
| RA6 | Chat never announces a message | 4.1.3 AA | one attribute |
| RA7 | `<pv-san>` and `<move>` are custom elements used as controls | 4.1.2 A | `<move>` covers 4 pages |
| RA8 | 0 live regions, 0 headings across 11 files | 1.3.1 A | **this is candidates B and D** |

**RA1 is the finding to lead with.** It is Level A, it is nine `<div>`s, the correct pattern is eleven
lines away in the same file, and its consequence is that a blind player is *told* their opponent
offered a draw and cannot answer.

**RA2, RA3, RA5 and RA6 are ten lines between them** and are not blocked on any decision in the gate —
they are naming and attributes on controls that already exist. **RA4 is a nesting fix. RA8 is the gate
itself** (candidates B and D).

**None of this requires touching chessgroundx or a stylesheet.**
