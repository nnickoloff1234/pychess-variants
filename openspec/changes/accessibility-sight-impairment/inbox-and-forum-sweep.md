# Inbox and forum pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

**Both pages come back well built** — markedly better than the lobby and tournament pages. Each has
exactly one real gap, and the inbox's is the sharpest example of a missing live region found anywhere,
because the mechanism that should trigger it already exists.

---

## IB1. A PRIVATE MESSAGE ARRIVES AND NOTHING IS SAID

`client/inbox.ts:424`:

```ts
evtSource = new EventSource('/inbox/subscribe');
```

A real server-sent-events stream, whose payload (`:426`) is `{ unread: number, thread?: string }`. So
**messages genuinely arrive live**: the unread count updates, the thread list reorders, a conversation
gains a message — all without the user doing anything.

**And `client/inbox.ts` contains 0 `aria-live`, 0 `role="status"`, 0 `role="log"`.**

So a blind user sitting on the inbox is never told a message arrived. They would have to re-read the
page periodically to discover it. **This is the textbook case for a live region, and the hard part —
knowing when something changed — is already built and working.** The remaining work is the attribute
and a short string.

- **WCAG 4.1.3 Status Messages — Level AA.**
- Shape: `role="status"` on the unread indicator, and `aria-live="polite"` on the conversation view
  (assertive would interrupt; a message is not an emergency). Follow the politeness split in
  `lichess-reference.md` 9.3.

## IB2. POSITIVES — the inbox is one of the two best-built pages swept

- **Threads are real buttons.** `inbox.ts:453-457`:
  `` h(`button.inbox-thread…`, { props: { type: 'button' }, on: { click: () => openThread(...) } }) ``.
  **This is exactly what the lobby's seek rows get wrong** (`lobby-and-tournament-sweep.md` LB1) — same
  problem, solved properly, in the same codebase.
- **Every icon-only action is named.** `:581-595` — `title: _('Challenge')`, `_('Block')`/`_('Unblock')`,
  `_('Delete')`, `_('Report to moderators')`. Four icon controls, four names.
- **Zero non-interactive clickables** in the whole file — everything that acts is a `<button>` or an
  `<a>`.
- `<h2>` headings for Inbox, the conversation, and the empty state.

One refinement rather than a defect: these use `title` where the forum uses `aria-label`. Both give an
accessible name for an element with no text, but **`aria-label` is the more reliable of the two** across
screen readers, and `title` also produces a mouse tooltip that may not be wanted. The forum's choice is
the better one; worth aligning on it.

---

## FR1. The forum's modals are visual only — no dialog semantics, no Escape

`client/forum.ts:1511-1519` builds `div.forum-relocate-modal` with a `div.forum-modal-backdrop` that
dismisses on click, and `:1556-1566` provides a **real `<button.cancel props: { type: 'button' }>`** —
so unlike the lobby and tournament dialogs, **there is a keyboard-reachable way out.** That part is
right.

What is missing:

- **`role="dialog"` count: 0. `aria-modal` count: 0.** A screen reader is never told a dialog opened.
- **`Escape` count: 0, `keydown` count: 0.** No Escape dismissal.
- Nothing moves focus into the modal, and nothing hides the page behind it — so a screen-reader user
  can Tab straight out of the modal into content that is visually covered.

So the failure is subtler than the lobby's: the user is not trapped, they are **not told they are in a
modal at all**, and they can wander out of it without realising.

**Compare `client/study/addToStudy.ts`**, which registers a real `document` keydown, closes on Escape,
and treats the backdrop click as an extra path — see `profile-and-study-sweep.md` ST1. **That is the
in-house pattern; the forum is two thirds of the way to it.**

## FR2. Nothing on the forum is announced

`client/forum.ts`: **0 `aria-live`.** Lower priority than IB1 because the forum does not push updates —
there is no `EventSource`, so new posts appear on navigation rather than arriving. Worth one attribute
if a reply is posted without a page change.

## FR3. POSITIVES — and the forum has the best ARIA of any page swept

- **Post actions carry `aria-label`**: `:1360` Edit, `:1374` Relocate, `:1396` Delete, `:1410` Quote.
- **Decorative icons are correctly hidden**: `:1191` and `:1268` use `attrs: { 'aria-hidden': 'true' }`
  on `span.icon-bubbles4` and `span.team-icon`. **This is the most sophisticated touch found in any
  sweep** — marking a decorative icon hidden, rather than leaving a screen reader to announce an empty
  element, is a detail most codebases miss entirely.
- **3 `<thead>` and 8 `<th>`** — tables are properly structured, unlike the profile's
  (`profile-and-study-sweep.md` PF1).
- **9 headings.**
- **Zero genuine non-interactive clickables.** Six were flagged and all six are the known false
  positive: `<span>`/`<div>` wrappers around real buttons (`:505` a captcha message,
  `.edit-buttons`, `.form-actions`), plus the two backdrops, which are a legitimate extra dismissal
  path.
- The emoji reaction images carry `alt: r.key` (`:1169`) — already noted in
  `alt-and-labels-sweep.md`.

## FR4. Carried from the labels sweep

The forum's compose fields remain in `alt-and-labels-sweep.md` L5's unresolved set:
`forum.ts:1104` (input), `:1460` (textarea), `:1688` `textarea#forum-reply-text`, `:1763`
`input#forum-topic-title`, `:1774` `textarea#forum-topic-text`; and `inbox.ts:536` (input), `:629`
`textarea.inbox-convo-post-text`. **Whether each is wrapped in a label needs the rendered DOM** — the
same limitation recorded there.

---

## What this sweep settles about the site as a whole

Seven pages swept now, and the split is consistent enough to act on:

| Well built | Poorly built |
|---|---|
| **study** (`aria-live`, `keydown`, `Escape`, 24 `:focus-visible`) | **lobby** (no keyboard action, no live region, `<span>` close, 0 keydown) |
| **inbox** (real buttons, all icons named, 0 bad clickables) | **tournament** (same three) |
| **forum** (`aria-label`, `aria-hidden`, `<thead>`, real Cancel) | **game / analysis pages** (no headings, no live regions, no text board) |
| **profile action overflow** (`aria-expanded` + `keydown` + `Escape`) | **site header** (hamburger a `<div>`, nav submenus hover-only) |

**Two gaps are near-universal rather than page-specific**, and they are the two worth generalising:

1. **Live regions exist almost nowhere.** Only `study/` has them. Everything that updates by itself —
   a PM arriving (IB1), a seek appearing, a tournament clock ticking, an opponent moving — is silent.
   **This is candidate D, and it is now the finding with the most sites behind it.**
2. **Modals lack dialog semantics.** The lobby and tournament versions cannot be escaped at all; the
   forum's can, but announces nothing. **`study/addToStudy.ts` is the house pattern** and none of the
   other three follows it.

| | What | WCAG | Size |
|---|---|---|---|
| **IB1** | **PM arrives silently, though `EventSource` already fires** | 4.1.3 AA | one attribute + a string |
| FR1 | Forum modals lack `role="dialog"`, `aria-modal`, `Escape` | 4.1.2 A / 2.1.1 A | copy `addToStudy.ts` |
| FR2 | Forum announces nothing | 4.1.3 AA | one attribute |
| IB2 | `title` where `aria-label` is more reliable | — | alignment, not a defect |

**None of this touches the board, layout CSS or chessgroundx.** Candidate G, except IB1/FR2 which are
candidate D applied off the game page.
