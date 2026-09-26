## Context

Three structures cross-cut the same set of elements on a two-board page, and confusing them is what
produced every fault this change addresses:

```
TABS                                   DROP QUEUE
what the reader switches between       what the arrangement may move, in order

Chat ──┬── chat                         1. tools bar / tablist   ← furniture, in no tab
       ├── presets-1  ───────┐          2. presets-2 OR controls ← two parts, one slot
       └── presets-2  ───────┼───────▶  3. presets-1 OR gameover ← one part + furniture
Moves ─┬── record (never moves)         (record and info never move: useless in a band
       └── controls ─────────┘           a few squares tall, so they hold the slot that
Info ───── info                          never drops)
Partner board (detached) ── stack

                     GROUPS
       a box making several parts ONE grid item,
       because a named area is one rectangle
```

A part belongs to a tab AND to a slot, and the two groupings do not nest: `presets-2` (Chat tab) and
`round-controls-panel` (Moves tab) are **one slot** because the strip shows one tab at a time. Some
slot occupants are not parts at all — the tools bar holds the tablist, `bug-gameover` must show under
every tab.

Today each of those three facts is stated more than once, in more than one language, coupled by
matching strings:

| Fact | Where it is stated today |
|---|---|
| this part exists | `round.ts` / `analysis.ts` declaration |
| this part is mounted | `round.ts` by hand-written index; `analysis.ts` derived |
| these parts are one slot | 5 CSS rules + `ROUND_DROPPABLE` (one case); 4 + `ROUND_DROPPABLE` (another) |
| this slot may drop, and in what order | `ROUND_DROPPABLE` / the analysis inline list |
| what this part needs to be usable | CSS, `--bug-part-min-w` / `--bug-part-min-h` |
| where this part goes in arrangement X | 31 conditional CSS rules |

The last two rows are correct as they stand and this change does not touch them. A part's minimum is
a fact about its content and belongs beside the rules that produce it; the arrangement rules are
genuine per-home geometry.

## Goals / Non-Goals

**Goals:**

- A part cannot be declared without being mounted.
- One name per concept across the two pages: the group, the seat slot, the app element.
- Each of the three cross-cutting facts stated once.
- Deliberate differences between the pages written down as deliberate.

**Non-Goals:**

- **The 31 conditional slot rules.** The survey settled that the area is a queue position, not a part
  property — see the spec requirement recording it. Collapsing them is not available and attempting it
  is the mistake this change exists to prevent.
- **A part's declared minimum moving out of CSS.** Decided in the previous change and still right.
- **Zone A's definition and what may live there** — `what-zone-a-is-for`.
- **The JS-reads-the-CSS-back loop** — `idempotent-layout-pass`.
- **The `zoneB2` collision on the analysis page** — recorded in the proposal, needs a matrix row that
  does not exist yet, and bundling a correctness hunt into a structural change would make both harder
  to review.

## Decisions

### Decision 1: the round page adopts the analysis page's mounting, not the reverse

`analysis.ts` already maps over `TabPanelDef[]` and wraps a multi-part tab in a group; `round.ts`
writes `roundTabs.panel(2, 1)` by hand. The analysis page reached its version by hitting the same
failure from the other direction — mounting `panel(1, 0)` on a build that declares one tab — so the
pattern is not new work, it is work already done once.

**Alternative rejected:** keep hand mounting on the round page and add a check that every declared
part is mounted. That detects the fault instead of removing it, and the round page's own comment
already shows a reader can lose a whole afternoon to a silent absence.

**What has to be solved for it:** the round page's mounting is genuinely not uniform — chat
free-standing, presets 1 and 2 inside a group, `bug-gameover` and the tools bar interleaved as
furniture. A plain `map` does not reproduce that DOM, so the declaration must be able to say "these
parts are one group" and "this element sits here but belongs to no tab". That is the shape question
this change has to answer, and it is why the mounting half is not a one-line change.

### Decision 2: the queue order is the declaration order, if the survey holds

Both pages already comment that their part order IS the drop queue — the analysis page most
explicitly: *"this order is the DROP QUEUE's, not a matter of reading pleasure."* If that is
load-bearing rather than coincidental, the droppable list needs no separate ordering and can be
derived from the declarations. **This is verified first (task 1.1), because everything downstream is
cheaper if it holds and the change is larger if it does not.** If the two must ever differ, the
declaration carries an explicit queue field and the derivation still works, at the cost of one more
declared fact.

### Decision 3: one group name, with box-or-contents per arrangement

`.bug-presets-group` and `.bug-tool-group` are one mechanism with opposite defaults, one per page.
The unified element states box-or-contents **per arrangement** — which is what both already do, in
their own rules — so neither page's default becomes the other's problem. `shared.css` already
describes the pair as opposite defaults, which is the evidence that the difference is historical
rather than designed.

**Alternative rejected:** keep two names and document the contrast. That is what the code does now,
and the contrast note is three sentences long because the duplication needs explaining.

### Decision 4: slot membership is declared with the part, not with the slot

The view says which slot a part occupies; the stylesheet keeps one rule per arrangement, and it no
longer needs to name the members. `ROUND_DROPPABLE` and the analysis inline list are derived.

Counted: this removes 21 of 57 part-level `grid-area` assignments (57 → 36 buckets), turns the
6-place and 5-place restatements into one each, and makes the renamed-`panelClass` failure
unreachable. It does **not** reduce the conditional rule count, and the change should not claim it
does.

### Decision 5: one accessor for the app, and page identity through it

`'.round-app.bug, .analysis-app.bug'` currently appears four times in three modules — twice as a
constant named `APP` and twice inline, once in the very file that defines the constant. Page identity
is asked a third way in `squareUnit.ts`. One accessor, and `trackToolsPlacement`'s `container`
parameter goes: its default already matches the analysis app, and the analysis page is its only
caller, passing what the default would have found.

### Decision 6: the two pages' flip handling stays different, and says so

Round MOVES seat blocks; analysis RE-RENDERS them. This is not debt: a round clock is a live object
whose local reading is the authority for that seat's time, so re-rendering would destroy the
measurement. A change about unifying vocabularies is exactly the change in which someone would
"unify" this too, so the spec states it and the code says why.

## Risks / Trade-offs

- **[A vocabulary rename touches the matrix baseline]** → the previous change's method applies: rename
  in the baseline in place, same run, and require 0 geometry changes per commit. Names first, behaviour
  after, never in one commit.
- **[Deriving the droppable list could hide the queue]** → the order becomes implicit in the
  declarations. Mitigated by Decision 2's verification step and by keeping the queue's order stated in
  a comment where the parts are declared, which is where a reader looking for it will be.
- **[The declaration gains fields and becomes a second layout language]** → the limit is that it
  carries only what is already stated twice: the slot, the group, and whether it is furniture. Nothing
  that CSS decides moves into it, and a part's minimums stay where they are.
- **[The round page's non-uniform mounting resists a uniform map]** → this is the real risk, and it is
  the reason Decision 1 names it as the shape question rather than an implementation detail. If the
  declaration cannot express the arrangement cleanly, the honest outcome is to stop at "every declared
  part is mounted" and leave the grouping in the view.

## Open Questions

- Does any arrangement need a part's queue position to differ from its declaration order? (Decision 2,
  and task 1.1 answers it.)
- Is furniture best declared as parts of a detached tab — which is exactly what the partner board
  already is — or as a separate short list beside the derived one?
- What is the group's name? Neither `presets-group` nor `tool-group` is true on both pages.
- Does the unified seat-slot vocabulary keep the round page's `${position}${board}` or the analysis
  page's `top/bottom(.bug)`? The round form composes into ids cheaply; the analysis form reads better
  at a call site. The ids are load-bearing for flip and switch, which argues for the round form.
