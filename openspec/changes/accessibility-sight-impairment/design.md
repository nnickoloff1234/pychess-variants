## Context

Written partly as a primer, because Nikolay has said the domain is unclear to him and the ranking
decisions in this change cannot be made without it. **Everything in the taxonomy below is general
domain knowledge, not a claim about our user** — their own messages are the authority on what they
need, and where the two disagree, they win.

**THEIR MESSAGES ARRIVED 2026-09-26 and are in `user-report.md`.** Read that first; it corrects
this document in four places, and its section 3 supplies the mechanism this design was missing.

### Sight impairment is at least four different problems

| Group | What they use | What breaks for them |
|---|---|---|
| **Blind** | A screen reader, sometimes with a refreshable braille display. No mouse. | Anything visual-only: a board of coloured squares, a move shown only by a piece moving, a clock that just changes. |
| **Low vision** | Screen magnification (200–1000%), OS large text, high contrast modes, browser zoom. Often still uses a mouse. | Small targets, low contrast, layouts that break when zoomed, anything that needs seeing two distant things at once. |
| **Colour vision deficiency** | Nothing assistive. Just different perception. | Meaning carried by colour alone — a red/green dot, a highlight distinguishable only by hue. |
| **Photosensitivity / fatigue** | Dark mode, reduced motion. | Animation, flashing, glare. |

**These want different things, and the cheap wins do not overlap.** Bigger tap targets and better
contrast are genuinely valuable and cost little — and do nothing whatever for a blind player. The
proposal's "maximum impact" therefore has to be read as *impact for whom*, and the user's messages
are what settles that.

### What a screen reader actually is, in the terms that matter here

A screen reader reads the **accessibility tree** — a parallel structure the browser builds from the
DOM, driven by element semantics, ARIA attributes and text content. It is not reading the screen.
Consequences that decide most of our design questions:

- A `<div>` styled to look like a button is a `<div>`. `<move>` is an unknown element with no role.
- A braille display reads the same tree, so getting the tree right serves both at once.
- The user navigates by **structure** — headings, landmarks, lists, tables, form fields — and by
  **element type** ("next button", "next table"). A page with no headings is a wall.
- Content that changes without user action is announced only from an **`aria-live` region**. An
  opponent's move is exactly this case, and we have no live region on any game page.
- **BROWSE MODE vs FOCUS MODE — the mechanism this design originally missed, supplied by the user.**
  In browse mode the screen reader intercepts the arrow keys to move through the document, so the
  page never sees them; in focus mode keystrokes pass through. NVDA toggles with NVDA+space,
  TalkBack with a double cmd press. **Therefore arrow-key board navigation cannot be a global key
  binding** — it needs a focusable element whose role makes the screen reader switch modes. This is
  the single most load-bearing fact in this document and it came from `user-report.md` section 3.
- Common combinations: **NVDA + Firefox** (free, the most common on Windows), **JAWS** (paid,
  Windows, strong in workplaces), **VoiceOver** (macOS/iOS, built in), **TalkBack** (Android),
  **Orca** (Linux). They differ in real ways, so "works with a screen reader" needs a named one.

### What a chess site specifically has to answer

Generic web accessibility does not cover the game. Four questions are chess-shaped:

1. **What is the position?** Reading 64 squares aloud is unusable as the default; real solutions
   offer the board as a navigable table, plus queries ("what is on e4", "where are my knights").
2. **How do I move?** Without a mouse: typed algebraic input, or keyboard navigation of the board.
3. **What just happened?** The opponent's move, check, capture, promotion, game end, draw offer —
   announced when they occur, not discoverable by re-reading.
4. **How much time is left?** A clock is pure visual change. On demand, and at thresholds.

**A fifth, for a VARIANT server, which the user raised and generic advice never would:** *"short
help for active chess variant"*. They already read our rules pages before going elsewhere to play,
so this is a need we are unusually well placed to meet.

**A sixth: pockets.** Four of the variants they name have them, and they specified the model from
years of their own use — white's pocket off the left edge of the a-file, black's off the right edge
of the last file (h, i or j by variant width), vertical arrows stepping through the roles, all in
the same navigable space as the board. Not a separate widget.

**And for bughouse, a seventh** — the partner board, four clocks, cross-board transfers. **The user
never mentions bughouse across three messages while naming eight other variants**, so this change
does not solve it, on their scoping rather than our convenience.

### The reference: lichess

Explicitly the model — Nikolay: *"we will copy from them a lot how things are done"*. What is worth
verifying when we look, rather than assuming:

- A **non-visual user interface** built as a separate module layered over the normal page, rather
  than as ARIA sprinkled on the visual one. If true, that is the single most important structural
  decision to copy or reject, because it determines whether accessibility work fights the layout
  work this project is already deep in.
- **Keyboard move entry**, available as a preference to sighted users too — which is why it stays
  maintained rather than rotting as a special mode.
- A **text representation of the board** and per-piece queries.
- **Move announcements** and how they phrase them — notation read aloud is its own problem (`Nf3`
  is not "N f three").
- Where the **preference** lives and whether the mode is opt-in or detected.

To confirm by reading their pages, not by recalling them.

## Goals / Non-Goals

**Goals**
- Make the game playable, not merely reachable, for the user who wrote to us.
- Choose a small number of changes with the best impact-per-change ratio, and say why the others
  were not chosen.
- Copy lichess's answers where they fit, rather than inventing.
- Leave the domain notes above behind, so the next person does not start from zero.

**Non-Goals**
- Full non-visual play, including bughouse. A later change.
- WCAG conformance as a target.
- Reworking chessgroundx.
- Low-vision work beyond what falls out for free — unless the user's messages say otherwise.

## Decisions

### Decision 1: the user's messages outrank this document

Everything above is general knowledge. The person who wrote to us has specific tools and specific
frustrations, and a plausible general priority that they did not raise is a worse bet than an
unglamorous one they did. **Their messages are read before the shortlist is written**, and the
shortlist records which item came from them.

### Decision 2: name the assistive stack we test against — ANSWERED 2026-09-26

"Accessible" is untestable. The default reasoning held: **NVDA on Windows is primary**, named in
all three of the user's messages, with JAWS behind it via their WinBoard 4.5 benchmark.

**What the default missed is Android.** They name **TalkBack** and **Jieshuo** explicitly, twice,
as first-class targets. Mobile screen-reader support was on nobody's list here and is on theirs.
Jieshuo is the one we know least about — verify its focus-mode behaviour rather than assuming it
matches TalkBack.

### Decision 3: prefer real semantics to added ARIA

A `<button>` beats a `<div role="button">`, an `<ol>` beats a list of `<move>`, a `<table>` beats a
grid of divs with labels. Native semantics bring keyboard behaviour and focus handling for free,
which is most of the work, and they cannot drift out of sync with themselves.

**ARIA where semantics cannot reach**: live regions, relationships between separated elements, and
labels for things with no visible text. This matters for the "minimum change" goal — replacing an
element is often a smaller diff than the ARIA needed to fake it.

### Decision 4: an always-on improvement beats a mode, where it is possible

A mode that only blind users enable is a mode nobody else notices breaking. Where a fix costs
sighted users nothing — a landmark, a heading, a real button, a label — it ships unconditionally.
A mode is for things that genuinely change the interface, and the design should keep that list
short. Note that keyboard move entry is a feature sighted players also want, which is the ideal
case: one implementation, two audiences, continuously exercised.

### Decision 5: the shortlist is written after step 3, and is short

Impact per unit of change, with the gate stated in the proposal. **Nothing is committed here.**

**This design's original guess was half wrong, and the correction is worth keeping.** It expected
"announce the opponent's move" and "read the position" to top the list. The user's own floor is
**move entry** and **a navigable board**: *"there isn't even editor to enter the move."* You cannot
play a game you cannot move in, and announcements are on their list but below those. A shortlist
built on the guess would have improved a game they still could not play.

### Decision 6: the user named the minimum themselves — 2026-09-26

> *"At the Lichess it's perfect realisation, but in the case it's too hard to make such
> accessibility ... as alternative i propose you to make a table or another element, when the blind
> user can operate all the board."*

A focusable table is both **what they asked for as an acceptable fallback** and **what the
focus-mode mechanism requires** — a real widget with a role the screen reader recognises. Those two
arriving at the same answer from different directions is the strongest signal in this change.

So if lichess turns out to have built more than that, we may still take only this much, with the
user's agreement already on record rather than assumed.

## Risks / Trade-offs

- **[Building what we imagine a blind user needs]** → Decision 1, and the user's messages first.
- **[A special mode that rots]** → Decision 4, and prefer features sighted users also use.
- **[Accessibility work colliding with the in-flight layout changes]** → real; several changes are
  mid-flight on the two-board layout. Prefer markup and semantics over layout; keep bughouse out of
  scope; if lichess's answer is a separate overlay module, that avoids the collision entirely.
- **[Doing a broad shallow pass]** → the failure mode of accessibility work generally: many small
  improvements, still unplayable. The gate is impact, not count.
- **[Claiming accessibility we have not tested]** → Decision 2. Test with a named screen reader, or
  say plainly that it is untested.
- **[Doing nothing]** → the status quo, which is that a person told us they cannot play.

## Open Questions

- ~~Which assistive tools does the user actually use?~~ **ANSWERED: NVDA primary, JAWS, and Android
  — TalkBack and Jieshuo.** Decision 2.
- ~~What do they emphasise most?~~ **ANSWERED: move entry and board navigation first.** Decision 5.
- ~~Is the single-board round page the target, or the bughouse two-board one?~~ **ANSWERED:
  single-board, with pockets. Bughouse is never mentioned.**
- **NEW: does Jieshuo behave like TalkBack for focus mode?** Named by the user; least known to us.
- **NEW: what do we do about `client/pocketHotkeys.ts`?** It binds 1-9, 0, -, = globally through
  Mousetrap, which browse mode swallows. A keyboard feature that is unreachable to screen-reader
  users is either the first thing to fix or evidence that the focusable-widget approach has to
  absorb it.
- **Is there an existing user preference mechanism to hang a mode on**, if a mode is needed?
- **How should notation be spoken?** `Nf3` read literally is wrong in every screen reader. Whether
  we expand it, and into what, is a real decision with i18n consequences — `lang/` is gettext.
