## Why

Moved out of `accessibility-sight-impairment` by Nikolay on 2026-10-11, where it was finding **LB2**
(`lobby-and-tournament-sweep.md`). Its siblings TN2, TN3 and FR2 were dropped there because their
information can be read on demand; LB2 was kept as worth doing, then judged *"a fairly big and
invasive change"* that should not be rushed inside the first accessibility PR.

**The problem.** Seeks appear and vanish continuously as players create and cancel them, and
`client/lobby.ts` has no `aria-live`, `role="status"` or `role="log"`. A screen-reader user reads a
list that is **silently changing underneath them**, never hears that a new game is on offer, and may
try to join a seek that no longer exists. WCAG 4.1.3 (AA).

**Why it is not one attribute.** `onMsgGetSeeks` (`client/lobby.ts`, ~line 1884) receives the whole
list on every change, empties both tables (`innerHTML = ''`) and rebuilds every row from scratch —
the live table and the correspondence table alike. To a screen reader every update looks like *all*
seeks appearing at once, so a live region on today's table would read the entire list after every
change: far worse than the silence.

**Nikolay's constraint:** no announcement logic. The announcement should come from the markup
itself — ideally the new seek "announcing itself" when it appears.

## What Changes

1. **Patch instead of rebuild.** Keep the previous vnode of each seek table and patch against it,
   instead of `innerHTML = ''` + a fresh render (two call sites: live and correspondence).
2. **Key the rows** by `seek.id` — regular rows (`seekViewRegular`), bughouse rows
   (`seekViewBughouse` in `client/two-board/lobby.ts`), unknown-variant rows, and the extra
   name row of catalogued variants (e.g. `seek.id + '-name'`). Snabbdom then inserts only rows that
   are really new and removes only rows that are really gone.
3. **A polite live region on the `<tbody>`**: `aria-live="polite"` + `aria-relevant="additions"`.
   Only new rows are read, when the reader is idle; removed seeks are silent. Static attributes, no
   logic, no new strings. A new row reads as its contents, roughly "Join: Alice, 5+3, Crazyhouse,
   button, Alice 1500 5+3 Crazyhouse Casual" (the Join button's name comes from LB1, already
   shipped).

No visual change. Steps 1–2 are also simply the efficient way to redraw the table.

### Alternatives considered

- **`role="alert"` on the new row** — the literal form of "the element announces itself when it
  appears": an inserted alert is spoken by every major screen reader. Rejected as the default: it is
  assertive (interrupts whatever the user is reading every time anyone posts a seek), on a `<tr>` it
  replaces the row's table role, and it still needs steps 1–2 or every row re-alerts on every update.
  An `.sr-only` span with `role="alert"` inside the row would keep the row's role, but needs a new
  string ("New seek: …").
- **`role="log"` on the table** — the shape lichess uses for its move list (see
  `accessibility-sight-impairment/lichess-reference.md` 9.3, and its deliberate per-region choice of
  politeness). Equivalent to step 3 (log implies polite + additions); either is fine.

## Open questions — measure, don't assume

- **Landing in the lobby must not read the whole list.** The `<tbody>` is created together with its
  first rows, and a live region inserted already populated is normally not announced — so only seeks
  arriving later should be spoken. Verify in Chrome's accessibility events and by ear (Orca).
- **Why was `innerHTML = ''` there?** Find out before removing it (stale children from the
  template, a past patching bug?).
- **Re-sorting:** `renderSeeks` sorts bots last; check a keyed move of an existing row is not
  announced as an addition.
- **Own seek:** creating a seek will announce it back to its author — probably welcome as
  confirmation; confirm.
- **Category filter / variant visibility changes** re-render the list: check they do not read the
  whole table.

## Impact

- `client/lobby.ts` (`onMsgGetSeeks`, `renderSeeks`, `seekViewRegular`, `seekViewUnknown`),
  `client/two-board/lobby.ts` (`seekViewBughouse`).
- No server change, no CSS change, no new translatable strings.
- Depends on nothing; best done after `accessibility-sight-impairment` lands so its Join buttons
  (LB1) give the announced row a good name.
