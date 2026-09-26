# Lobby and tournament pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md` — static
source reading, the app never run.

These are the highest-traffic pages after the game itself, and the lobby is where every visitor lands.

**One finding here is the most consequential in any sweep so far**, because it blocks the site's
primary action on its front page.

---

## LB1. YOU CANNOT ACCEPT A GAME FROM THE LOBBY BY KEYBOARD

`client/lobby.ts:1333-1337`:

```ts
const row = h(
    'tr',
    {
        class: { 'catalogued-seek-main': catalogued },
        on: { click: () => this.onClickSeek(seek) },
    },
```

A `<tr>` with a click handler. **No `role`, no `tabindex`, no keyboard handler** — and
`onClickSeek` (`:1379`) is the only way in. The same shape repeats at `:1353` for the
catalogued-variant row.

**And there are ZERO `keydown`, `keyup`, `keypress`, `Enter` or `Escape` handlers in the entire
file.** Not one.

So a keyboard-only or screen-reader user can reach the lobby, read the whole seek list (LB4 below —
it is properly structured), and then **cannot act on any row of it.** Joining a game is the primary
action of the site, and the lobby is the page everyone lands on.

- **WCAG 2.1.1 Keyboard — Level A.**
- **Fix shape:** the row needs to be operable — either a real `<button>` or link inside the row, or
  the row given `tabindex="0"` plus `role="button"` and a keydown for Enter/Space. A link in the
  first cell is the simplest and also gives the row a name.

## LB2. The seek table is never announced when it changes

No `aria-live`, no `role="status"`, no `role="log"` anywhere in `client/lobby.ts`.

Seeks appear and vanish continuously as players create and cancel them. A screen-reader user reads a
list that is **silently changing underneath them**, and may try to accept a seek that no longer
exists. This is precisely the case `aria-live` exists for.

`role="log"` on the seek table with a `polite` politeness is the shape lichess uses for its move list
— see `lichess-reference.md` 9.3, and note their deliberate choice of politeness per region.

## LB3. The seek dialog cannot be closed by keyboard

`client/lobby.ts:684`:

```ts
h('span.close', {
    on: { click: this.closeSeekDialog },
    attrs: { 'data-icon': 'j' },
    props: { title: _('Cancel') },
}),
```

A `<span>` — not focusable, no role. And with no `Escape` handler in the file (LB1), there is **no
keyboard path out of the dialog at all** once it is open. Worse than an unreachable control: a
keyboard user who opens it is stuck in it.

## LB4. POSITIVE — the seek table itself is properly structured

`client/lobby.ts:1997-2004` renders a real `<thead>` with six `<th>`: a santa column, **Player,
Rating, Time, Variant, Mode**. So a screen reader can navigate it by row and column with its own
table keys, and every column announces its meaning.

**The information is fully reachable. Only the action is not.** That is a much better starting point
than it sounds — LB1 is a small fix on top of a table that is already right.

## LB5. POSITIVE, and a correction to my own suspicion

`client/lobby.ts:943` looked like a `<div#create-button>` with a click handler. It is a **wrapper
around a real `<button props: { type: 'button' }>`**. Creating a game is keyboard-operable.

---

## TN1. Tournament standings rows are click-only

`client/tournament.ts:469`:

```ts
return h('tr', { on: { click: () => this.onClickPlayer(player.name) } }, rowCells);
```

Same class as LB1, lower stakes — this is navigation to a player, not the core action.
`client/tournamentRR.ts:1507` has a clickable `<td.manage-actions>` with the same problem.

**`client/tournament.ts` also has zero `keydown`/`keyup` handlers.**

## TN2. The tournament countdown clock has no live region

`client/tournamentClock.ts` — **0 `aria-live`, 0 `role="status"`.**

The clock counts down to the start and then through the tournament. A screen-reader user is never
told how long until it begins, or that it has begun, unless they navigate back to the clock and
re-read it. Same gap as the game clock, and the same one-attribute fix.

## TN3. Nothing on a tournament page is announced at all

`client/tournament.ts` and `client/tournamentRR.ts`: **0 `aria-live` between them.** Standings
reorder live as games finish, pairings appear, rounds advance — all silent.

## TN4. `<span.close>` dialog closes, again

`client/tournament.ts:642` and `client/tournamentRR.ts:1373` repeat LB3's pattern exactly. With no
`Escape` handler in `tournament.ts`, its dialog has the same trap.

## TN5. 29 `<th>` but no `<thead>` in `tournament.ts`

`client/tournament.ts` has 29 `<th>` and **0 `<thead>`**; `client/tournamentRR.ts` uses `<thead>`
(3 of them). `<th>` in a first row is generally treated as a column header anyway, so this is
inconsistency rather than a failure — but the two files disagree and one of them is right.

## TN6. Two odd controls in `tournamentRR.ts`

- **`:1517` — an `<h2>` with a click handler.** A heading used as a control announces as a heading,
  so a screen-reader user has no reason to try activating it.
- **`:1547` — an `<option>` with a click handler.** Option activation belongs to the `<select>`'s
  `change` event; a click handler on an option is unreliable across browsers and invisible to
  keyboard selection.

## TN7. POSITIVE

- **Join and Withdraw are real buttons.** `client/tournament.ts:272-279` builds
  `h('button#action', { on: { click: () => this.withdraw() } }, _('WITHDRAW'))`. The bare
  `h('div#action')` is only the empty placeholder before the button is built.
- `client/tournamentRR.ts` holds **the only keyboard handling in either file** — 1 `keydown` and the
  correct roving `tabindex` at `:1013`, already noted in `focus-and-tabindex-sweep.md` as the
  precedent for fixing T1 and T3.

---

## THE PATTERN — three fixes, not thirty sites

Both pages fail and succeed in exactly the same places, which makes this tractable:

| | Status |
|---|---|
| Primary actions (Create, Join, Withdraw) | **real `<button>`s** ✓ |
| Tables (`<th>`, column names) | **properly structured** ✓ |
| **Table ROWS used as controls** | **keyboard-dead** ✗ |
| **Dialog close controls** | **`<span>`, and no `Escape` anywhere** ✗ |
| **Anything that updates** | **never announced** ✗ |

So the worklist is three patterns:

1. **A row that acts needs an operable control** — LB1 (critical), TN1, `tournamentRR.ts:1507`.
2. **A dialog needs a focusable close and an `Escape`** — LB3, TN4. Currently a keyboard user who
   opens either dialog cannot get out.
3. **Anything that changes on its own needs a live region** — LB2, TN2, TN3, and the game page's
   missing announcements already recorded in `candidates.md` D.

**Pattern 3 is the same fix as candidate D**, so whatever is decided for the game page's move
announcements applies here directly — which is an argument for deciding D on its own merits rather
than only for the board.

| | What | WCAG | Size |
|---|---|---|---|
| **LB1** | **Cannot accept a lobby seek by keyboard** | 2.1.1 **A** | one control per row |
| LB2 | Seek list changes silently | 4.1.3 AA | one attribute |
| LB3 | Seek dialog has no keyboard exit | 2.1.1 **A** | focusable close + Escape |
| TN1 | Standings rows click-only | 2.1.1 **A** | as LB1 |
| TN2 | Tournament clock silent | 4.1.3 AA | one attribute |
| TN3 | Standings/pairings changes silent | 4.1.3 AA | one attribute |
| TN4 | Tournament dialog has no keyboard exit | 2.1.1 **A** | as LB3 |
| TN5 | `<th>` without `<thead>` | — | consistency |
| TN6 | Clickable `<h2>` and `<option>` | 4.1.2 **A** | two sites |

**None of this touches the board, layout CSS or chessgroundx**, and all of it helps sighted
keyboard-only users. Candidate G.
