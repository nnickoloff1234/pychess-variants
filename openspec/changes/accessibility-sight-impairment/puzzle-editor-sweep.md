# Puzzle and editor pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

**This sweep produced the unifying diagnosis for nearly every client-side defect in the change** (PE3),
and the most complete single-feature failure (PE1).

---

## PE1. THE PUZZLE NEVER TELLS A BLIND USER WHETHER THEY WERE RIGHT

`client/puzzleCtrl.ts` patches its feedback on every move:

```ts
h('div.icon', '✓'),
h('div.instruction', [h('strong', _('Best move!')), h('em', _('Keep going...'))]),
```
```ts
h('em', _('Try something else.')),
```

The text is present, correct and **translated**. And **`puzzleCtrl.ts` has 0 `aria-live` and 0
`role="status"`** — the `.feedback` container at `:422` carries neither.

So the feedback is **replaced silently.** A blind user plays a move and is never told whether it was
the best move, a mistake, or the solution. To find out they would have to navigate back to the
feedback region and re-read it — **after every single move.**

**This is the most complete failure of any feature swept**, because a puzzle *is* a dialogue:

| | |
|---|---|
| Read the position | **impossible** — chessgroundx emits no text (`candidates.md`) |
| Hear the response | **impossible** — no live region |
| Know the page structure | **impossible** — puzzles render through `templates/analysis.html`, which has **zero headings** (`views/puzzle.py:17`, `headings-and-landmarks-sweep.md` H1) |

The whole point of a puzzle is the response, and the response is the part that is silent. **One
attribute on `div.feedback` fixes the third-worst of these**, and it is the same one-line fix as
IB1, RA6, LB2 and TN2.

- **WCAG 4.1.3 Status Messages — Level AA.**

## PE2. The editor HAS a text path — and it is the one control with no name

`client/editor/editorCtrl.ts:93`:

```ts
h('input#fen', {
    props: { name: 'fen', value: model['fen'] },
    on: { input: () => this.onChangeFen(), paste: e => this.onPasteFen(e) },
}),
```

**This is genuinely the right interface for a blind user.** A board editor is inherently visual, but
typing or pasting a FEN sets up any position without touching a board — arguably better than dragging
pieces. It exists, it works, it handles paste.

**And it has no accessible name.** `grep` for `for: 'fen'`, `for="fen"` or an `aria-label` mentioning
FEN returns **nothing**. So a blind user reaches an unnamed text box with no indication that it accepts
a FEN — **the single most useful control on the page for them, and the only one without a name.**

`client/lobby.ts:704` renders the same `h('input#fen', …)` for the custom-position seek, so the gap is
in two places.

**Positive:** the castling checkboxes *are* labelled — `editorCtrl.ts:122`
`h('label.OO', { attrs: { for: 'wOO' } }, _('White') + ' O-O')`, and so on for the other three.

## PE3. ALL 21 HREFLESS ANCHORS — the unifying diagnosis

Every `<a>` in `client/` that carries a click handler was checked:

```
h('a') calls WITH a click handler:                              21
of those, with NO href (not focusable, no link role):           21
```

**Twenty-one of twenty-one.** An `<a>` without `href` is **not focusable**, has **no link role** in the
accessibility tree, and **does not respond to Enter.** All 21 are mouse-only controls that look like
links.

| File | Count | What they are |
|---|---|---|
| **`editor/editorCtrl.ts:153-179`** | **9** | **the editor's entire control strip** |
| `analysis/analysisCtrl.ts:890, 900, 910, 960, 1317` | 5 | analysis actions |
| `puzzleCtrl.ts:116, 121, 435` | 3 | incl. **"Continue training"** — so after solving a puzzle a keyboard user cannot start the next one |
| `two-board/analysis/pgn.ts:105, 115`, `engine.ts:760` | 3 | bughouse analysis |
| `zen.ts:42` | 1 | zen mode |

**So the board editor is entirely keyboard-dead**: nine controls, none reachable — and its one working
text path is the unnamed `#fen` of PE2.

### And this completes the diagnosis of the whole client

Every client-side defect in this change is the same mistake:

| Element used as a control | Where | Count |
|---|---|---|
| **hrefless `<a>`** | editor, analysis, puzzle, two-board, zen | **21** |
| `<div>` | **offer dialogs** — draw, takeback, rematch (`round-and-analysis-sweep.md` RA1) | 9 |
| `<tr>` | **lobby seeks** (LB1), tournament standings (TN1) | 2 patterns, every row |
| `<div>` | hamburger (F2), search icon (F5) | 2 |
| `<span>` | dialog closes — lobby, tournament, tournamentRR (LB3/TN4) | 3 |
| `<h2>`, `<option>`, `<td>` | `tournamentRR.ts:1517, 1547, 1507` | 3 |
| | | **~40 controls** |

**One diagnosis: the client reaches for a non-semantic element whenever it wants something clickable,
because Snabbdom makes `h('div', { on: { click } })` as easy as `h('button', …)`.** The server
templates do not have this problem — `admin-and-moderation-sheep` AD2 found **47 real buttons and zero
clickable divs** across 11 admin templates.

**It is the same root cause as AD1's dialog split**: templates use the platform, Snabbdom code builds
its own. So the accessibility work on the client is, to a first approximation, **one rule applied ~40
times: if it responds to a click, it is a `<button>` or an `<a href>`.** Not forty separate decisions.

---

## Summary

| | What | WCAG | Size |
|---|---|---|---|
| **PE1** | **Puzzle feedback never announced — the response IS the feature** | 4.1.3 AA | **one attribute** |
| PE2 | The editor's FEN field — its only non-visual path — has no name | 4.1.2 **A** | one `aria-label`, ×2 sites |
| **PE3** | **21 of 21 hrefless `<a>` are mouse-only; 9 are the editor's whole control strip** | 2.1.1 **A** | `<a>` → `<button>` |
| — | Puzzles inherit zero headings from `analysis.html` | 1.3.1 A | already H1 |

**PE3 is the finding to carry into the gate**, because it reframes the client work: **~40 controls, one
rule**, with the server templates as the in-house proof that the rule is already understood here.

**None of this touches the board, layout CSS or chessgroundx.**
