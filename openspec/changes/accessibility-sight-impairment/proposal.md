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

## Capabilities

To be decided once the shortlist exists. Likely a new `accessibility` capability covering what the
site guarantees to a non-visual user. Naming requirements before knowing which ones we can keep
would put promises in the living spec that the code does not meet.

## Impact

Unknown until the shortlist exists. The likely surfaces, from the survey above:

- `client/movelist.ts` — the `<move>` element and how a ply is reached.
- `client/roundCtrl.ts`, `client/two-board/round/` — move announcements, clock, game state.
- `client/analysis*.ts` — the same questions on a page people study with.
- chessgroundx's board DOM — the hard one, since it is a fork we control but also a dependency
  shared with the single-board pages.
- `templates/` — page structure, headings, landmarks, skip links.
- A user preference, wherever preferences live, if a mode is needed rather than always-on markup.

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
