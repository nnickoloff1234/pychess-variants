# Admin and moderation pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

**The result is almost entirely positive, and it produced the most actionable architectural finding in
the whole change** — one that supersedes advice given earlier in this change.

**The irony worth stating first:** the section used by a handful of moderators is **the best-built part
of the site**, better than the pages every player uses every day.

---

## AD1. THE ADMIN DIALOGS ARE THE ONLY CORRECT MODALS ON THE SITE — because they use the platform

`templates/admin_users.html:191`, `admin_system_messages.html:66`, `admin_operations.html:220`:

```html
<dialog id="admin-action-dialog" class="admin-action-dialog">
```

opened with `dialog.showModal()` (`admin_users.html:236`, `admin_operations.html:297`,
`client/adminSystemMessages.ts:81`).

**`<dialog>` + `showModal()` gives all of this from the browser, with no code:**

- `role="dialog"` and `aria-modal="true"`, implicitly
- **focus moved into the dialog**
- **focus trapped** inside it
- **Escape closes it**
- **the rest of the page made inert** — unreachable by Tab *and* by the screen reader

**And the split across the codebase is perfectly clean:**

| | Uses | Result |
|---|---|---|
| **Server templates** — `admin_users`, `admin_system_messages`, `admin_operations`, `authors`, `studies` | **native `<dialog>` + `showModal()`** (6 dialogs, 15 calls) | **correct, for free** |
| **Snabbdom client** — `lobby.ts`, `tournamentRR.ts`, `forum.ts`, `roundCtrl.ts`, `round.ts` | hand-rolled `<div>` modals | **broken, each differently** |

So the dividing line is **not** author skill — it is **template versus Snabbdom**. The templates reach
for the platform element; the client code builds a modal out of `<div>`s because Snabbdom makes that
the path of least resistance.

### THIS SUPERSEDES EARLIER ADVICE IN THIS CHANGE

`lobby-and-tournament-sweep.md`, `inbox-and-forum-sweep.md` FR1 and `settings-sweep.md` SB2 each
recommended copying `client/study/addToStudy.ts`, which registers a `document` keydown and handles
Escape by hand. **That is correct but it is the hard way.**

**The better fix is `h('dialog', …)` plus `showModal()` in an insert hook** — Snabbdom renders a
`<dialog>` like any other element, and the browser then supplies focus trapping, Escape, `aria-modal`
and page inertness. **One pattern, already proven in this repository, fixes all four broken dialogs**
and deletes code rather than adding it.

That makes the four-instance dialog problem (lobby, tournament, forum, settings) a **single change with
a known-good local precedent**, not four hand-rolled fixes.

## AD2. Everything else about admin is right

- **`<main>` on all 10 page templates.** `admin_nav.html` is a `<nav>` partial and correctly has
  neither.
- **47 real `<button>` elements across the 11 templates, and ZERO inline `onclick`, ZERO clickable
  `<div>`s or `<span>`s.** The only section swept where the classifier found nothing.
- **Zero icon-only buttons without a name.** Every button carries text —
  `<button type="button" data-admin-action="unpatron" …>Remove patron</button>`.
- **Destructive actions carry a confirmation**, declared in data attributes
  (`data-confirm-title="Remove patron wings?"`, `data-confirm-text="…"`) and shown in the native
  `<dialog>` of AD1.
- **Only 1 unlabelled form control across all 11 templates** — `admin_teams.html:48`, an input with a
  `placeholder` and no label. 20 of 21 controls are properly labelled, by `for` or by wrapping.
- **`reports.html` has a real `<table>` with `<thead>` and 5 `<th>`** — properly structured, unlike the
  profile's games table (`profile-and-study-sweep.md` PF1).
- **`<h1>` on 8 of the 10 pages.**
- `client/adminSystemMessages.ts` has zero clickables on non-interactive elements.

## AD3. Three of the site's SEVEN live regions are here — and the politeness is chosen correctly

```html
admin_operations.html:13        <p class="admin-ops-feedback"    role="status" aria-live="polite">
admin_system_messages.html:10   <p class="admin-ops-feedback"    role="status" aria-live="polite">
admin_users.html:22             <p class="admin-action-feedback"  role="alert"  aria-live="assertive">
```

**`polite` for operation feedback, `assertive` for the result of a moderation action on a user.** That
distinction is deliberate and right — a shadowban taking effect should interrupt; a background
operation's progress should not.

**The comparison is the point.** The game pages, lobby, tournaments and inbox have **zero** live
regions between them (`round-and-analysis-sweep.md` RA8, `lobby-and-tournament-sweep.md` LB2/TN2/TN3,
`inbox-and-forum-sweep.md` IB1). **Three of the seven that exist on the whole site are on pages a
handful of moderators use.**

---

## The two defects, both already recorded elsewhere

- **`mod_public_chat.html` and `reports.html` have no `<h1>`** — they start at `<h2>` (four times, and
  twice, respectively). Already `headings-and-landmarks-sweep.md` H6.
- **`admin_nav.html:1` — `<nav aria-label="Administration">`, untranslated.** Already
  `settings-sweep.md` SB3's cluster. Lower stakes here than in the site header, since a moderator is
  more likely to read English, but it is the same one-line fix.
- `admin_teams.html:48` — the one placeholder-only input, already `alt-and-labels-sweep.md` L4.

**No new defects were found on these pages.**

---

## Priority — stated honestly

These pages are used by a small number of trusted accounts. **If none of our moderators uses a screen
reader, the direct value of fixing anything here is near zero** — and there is nothing left to fix
anyway.

**Their value to this change is entirely as evidence:**

1. **AD1 gives us the dialog fix** — and it is better than what three earlier sweeps recommended.
2. **AD3 proves the live-region pattern is already understood in this codebase**, with correct
   politeness choices. Candidate D is not new ground; it is applying a pattern that exists here to the
   pages that need it.
3. **AD2 shows the house standard is high when someone applies it.** The gap between admin and the
   lobby is not knowledge, it is that nobody applied the standard on the client-rendered pages.

| | What | Where it helps |
|---|---|---|
| **AD1** | **Native `<dialog>` + `showModal()` is the fix for all four broken modals** | **supersedes the `addToStudy.ts` advice in 3 sweeps** |
| AD3 | Live regions with correct politeness already exist | candidate D has local precedent |
| AD2 | 47 named buttons, 0 clickable divs, 20/21 labels, `<main>` everywhere | the house standard |
| — | 2 missing `<h1>`, 1 untranslated `aria-label`, 1 placeholder-only input | already recorded |
