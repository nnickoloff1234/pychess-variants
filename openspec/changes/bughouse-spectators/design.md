## Context

`under-left#spectators` exists in three places and works in one of them.

| page | element present | message arrives | rendered |
|:--|:--|:--|:--|
| single-board round / puzzle | yes | yes | **yes** — `gameCtrl.onMsgSpectators` patches `#spectators` |
| two-board round | yes | **yes** | no — the handler is commented out |
| two-board analysis | yes | no — the page has no websocket | no |

The single-board path is two pieces: `onMsgSpectators` patches the element with
`renderSpectators(msg.spectators)`, and `site.css`'s `under-left` lays the result out as a centred
wrapping row in the `uleft` grid area. Both pieces already apply to the two-board pages; only the
call is missing.

## Goals / Non-Goals

**Goals:**

- The two-board round page shows spectators exactly as the single-board pages do.
- The two-board layouts stop reserving an area for an element that can never be filled, or the
  element is filled.

**Non-Goals:**

- Giving the analysis page a websocket. That is `analysis-page-presence-websocket`, and it is the
  same missing connection behind the dead presence dots and the empty chat tab.
- Redesigning where spectators appear. The single-board placement is the reference.

## Decisions

### Decision 1: it is not a one-line fix, and that is what frees the naming

This said "uncommenting `this.onMsgSpectators(msg)` is the whole round-page change". It is not.
`onMsgSpectators` is `private` on `GameController`, and the two-board controllers do not extend
that class — `RoundControllerBughouse extends TwoBoardController`. There is no inherited method
behind the comment, so the round page needs a small implementation of its own: a widget that owns
its node and patches it, following `AnalysisClockView`, plus `renderSpectators`'s parsing lifted
out of `gameCtrl` where two consumers justify it.

The consequence is the good part. Nothing about the single-board page's markup has to be kept, so
the element is named for what it is rather than for where it used to sit.

### Decision 2: an empty element still costs a template row

`uleft` is a named row in every landscape and portrait template on both pages. It measures 0 while
empty, so it costs nothing visually — but it is a row every future template has to carry, and one
more name for a reader to account for. If the analysis page is never going to fill it, the row and
the element should go from that page rather than being copied forward.

### Decision 3: the element goes in the Info tab, not in an area

`spectators#spectators`, a child of the Info tab's panel, on both pages. A tab panel lays out its
own children, so no template names the element and nothing can auto-place it — which is what every
previous arrangement got wrong in a different way: a row on the round page's shell, a row in two of
the analysis page's templates, a `display: none` in the modes that could not afford the row, and
implicit columns whose gaps took 30px off the tools in the one mode that had neither.

`under-left` was a position in the single-board page's shell, not a description of anything here.
The analysis page keeps the placeholder even though it can never fill it: it costs nothing now, and
both pages agreeing on where the feature appears is worth more than one fewer element.

## Risks / Trade-offs

- **[Uncommenting a handler that was disabled for a reason]** → The comment says the block was
  copied from `gameCtrl.ts`, not that it was disabled deliberately. Worth a look at the history
  before assuming it is safe; a spectator list arriving mid-game touches nothing else on the page.
- **[Removing `uleft` from the analysis templates changes the row count]** → Every drop arrangement
  in those templates has to be edited together, and a missed one places an item in an implicit row.

## Open Questions

- ~~Was the handler commented out to fix something, or left over from the copy?~~ Moot: there was
  never a handler to call. Whatever the comment meant, the work is the same.
- ~~Does the analysis page want spectators at all?~~ It cannot have them without a socket, and it
  keeps the placeholder regardless — see Decision 3. Whether it gains a socket stays with
  `analysis-page-presence-websocket`.
- What should a spectator list look like inside a tab panel? The single-board page's centred
  wrapping row was styled for a full-width strip under the board. Unanswered until 3.1 renders
  something.
