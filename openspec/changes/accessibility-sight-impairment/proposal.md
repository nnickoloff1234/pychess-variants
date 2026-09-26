## Why

A blind user has written to us about playing on pychess. That is the whole reason this exists now
rather than later: there is a named person with a concrete account of what does not work, which is
worth more than any audit.

**The measured state of the site, 2026-09-26.** It is not zero, and it is not where it needs to be:

- **The chrome has ARIA.** 37 `aria-label`s in templates and 61 in client code, plus `aria-selected`
  on tabs, `aria-controls`, `aria-expanded`, `role="dialog"`, `role="tab"`, `role="listbox"`. Menus,
  modals and the tab bars were built with some care.
- **The game has none.** All seven `aria-live` regions are in admin pages, study and `myVariants` —
  **not one is on a board, a clock or a move list.** So an opponent's move is never announced.
- **There is no non-visual path at all.** Zero occurrences of `blindMode`, `screenReader`,
  `keyboardMove` or anything like them, anywhere in `client/`, `server/` or `templates/`. There is
  no way to read the position as text and no way to enter a move without pointing at a square.
- **The move list is `<move>`**, a custom element with no role, not focusable, not a list. A screen
  reader reads it as an undifferentiated run of text.

So the shape of the problem is unusually clear: **the periphery is navigable and the game is
opaque.** A blind user can reach a board they then cannot read or play.

## Findings so far — the four that matter

Recorded here because they change the cost of everything below. Full detail in `user-report.md`,
`lichess-reference.md` and `candidates.md`.

**1. There is no way to enter a move at all.** Our user: *"on veb site there isn't even editor to
enter the move using NVDA for windows or Talkback/jieshuo screen reader."* Confirmed in code. The
site is not awkward for them; it is unplayable.

**2. Our board is ABSENT from the accessibility tree, not merely hard to read.** In chessgroundx,
`createEl('piece', pieceName)` puts the piece name in a **CSS class, not text**, and the square is a
**CSS transform** — a pixel offset. The only text the package emits anywhere is the a-h/1-8 edge
labels. Zero `aria-*`, zero `role`, zero text on any piece or square. So a screen reader finds a few
coordinate labels and **a pile of empty divs**.

**3. The visual transformation in lichess's blind mode is NOT the accessibility feature.** Its CSS
largely *removes* styling, which is why the page appears stacked with menus expanded. That appearance
is a side effect. **A screen reader reads the HTML, not the picture** — the only way CSS matters is
`display: none`, which hides content from it entirely. **We copy none of their CSS**, so there is no
per-page CSS tuning cost.

**4. An accessible board is far cheaper than it looks, and our variants do not make it harder.**
Lichess's board is one `<button>` per square whose **text content is its label** — `"A8 black rook"`,
`"B8 +"` for an empty dark square, `"E8 -"` for an empty light one. **No images** (the classes only
let CSS optionally paint a piece for sighted testers), no table, no `role`, no `tabindex` management.
Board size is already per-variant data in `client/variants.ts` (7x7 to 10x10), so emitting
`height x width` buttons is a loop. **A 9x9 shogi board is exactly as readable as 8x8 when it is
text** — which is why nobody has an accessible server for the variants that are our whole reason to
exist, and why our user wrote their own program.

## What Changes

**Nothing is specified yet, and that is deliberate.** Nikolay: *"this domain is very unclear to me
and i do not know what different accessibility improvements exist for various levels of sight
impairment, so we focus just on some"*, and *"the goal now is to bring maximum impact with minimum
changes and not deliver a full solution like lichess has developed"*.

The change therefore runs in this order, and the shortlist is written only at the end of it:

1. **Read the user's own words.** Their messages are the primary input — which assistive tools they
   use, and which needs they emphasise. Everything after this is ranked against what they said.
2. **Learn the domain enough to rank** — see the design's taxonomy. Sight impairment is not one
   thing, and the cheapest wins for low vision are not the ones that matter to a blind player.
3. **Study lichess as the reference implementation**, which has solved this and whose approach we
   intend to copy rather than invent. Not to reproduce its scope — to take its answers.
4. **Then pick a shortlist**, by impact per unit of change, and build only that.

The gate at step 4 is explicit: **anything that cannot be justified as high impact for small,
contained change is deferred to a successor**, not smuggled in.

**Steps 1 to 3 are done. Step 4 is NOT.** `candidates.md` holds seven costed options (A to G) and two
possible groupings — Nikolay, 2026-09-26: *"we havent reached conclusion what to do yet, just good to
have all this written down as options and findings."*

The tension the gate has to resolve is already visible: **our user's stated FLOOR is move entry, and
their stated FIRST WANT is arrow navigation of the board.** Those are different candidates, and the
cheap grouping satisfies the floor without the want.

**One rule did emerge**, and it bounds how much of the site is affected:

> A separate non-visual rendering is needed exactly where information exists as pixels rather than
> text.

That is board pages only. The lobby, tournaments, profiles and forum are ordinary documents needing
ordinary semantics, always on, benefiting everyone.

## Capabilities

To be decided once the shortlist exists. Likely a new `accessibility` capability covering what the
site guarantees to a non-visual user. Naming requirements before knowing which ones we can keep
would put promises in the living spec that the code does not meet.

## Impact

Unknown until the shortlist exists. **Notably NOT in the list: chessgroundx, and any stylesheet.**
Candidates B to E are markup in pages we already render; candidate F adds elements beside the board
rather than changing it. The likely surfaces:

- `client/movelist.ts` — the `<move>` element and how a ply is reached.
- `client/roundCtrl.ts`, `client/two-board/round/` — move announcements, clock, game state.
- `client/analysis*.ts` — the same questions on a page people study with.
- `client/variants.ts` — `dimensions` is already there and needed as-is; `pieceNames` exists with
  gettext wiring but covers only pocket roles of four variants. Spoken names for all 33
  `pieceFamily` values would be roughly 200-350 translatable strings — **an enhancement, not a
  prerequisite**, since the role letter is a valid fallback and is what lichess's own "Letter" piece
  style does.
- **NOT chessgroundx.** Its board needs no change; the non-visual rendering sits beside it.
- `templates/` — page structure, headings, landmarks, skip links.
- A user preference, wherever preferences live, if a mode is needed rather than always-on markup.
  Evidence that a mode is not the only shape: lichess's normal page carries
  `"pref": { …, "keyboardMove": false, … }`, so **a keyboard-move box is an ordinary preference
  available to every sighted player**, off by default. One input serving both audiences is a
  candidate shape, undecided.

**Related, and already recorded:** the tolerated WCAG 2.5.8 target-size deviation on the portrait
preset buttons, written into the living spec by `portrait-preset-panel-and-flow`. That decision was
made on the understanding that non-compliance is tracked and reviewed later; this change is not
that review, but it is where such items should start collecting.

## What this change is NOT

- **Not lichess's full solution.** They have years of work here. We are copying selected answers.
- **Not a WCAG compliance programme.** Conformance is a useful checklist and a bad priority order —
  it would rank a contrast ratio equal with a board a blind person cannot read.
- **Not an audit deliverable.** No report at the end; working code for a small number of things.
- **Not the accessibility of the two-board bughouse layout specifically.** That layout is mid-flight
  in several other changes. If a fix applies to it cheaply, good; it is not the target.
