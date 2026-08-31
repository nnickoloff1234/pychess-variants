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

### Decision 1: the round page is a one-line fix, the analysis page is a question

Uncommenting `this.onMsgSpectators(msg)` in the two-board socket is the whole round-page change —
the element, the styling and the renderer all exist. The analysis page cannot be fixed the same way
because it has nothing to receive the message with.

### Decision 2: an empty element still costs a template row

`uleft` is a named row in every landscape and portrait template on both pages. It measures 0 while
empty, so it costs nothing visually — but it is a row every future template has to carry, and one
more name for a reader to account for. If the analysis page is never going to fill it, the row and
the element should go from that page rather than being copied forward.

## Risks / Trade-offs

- **[Uncommenting a handler that was disabled for a reason]** → The comment says the block was
  copied from `gameCtrl.ts`, not that it was disabled deliberately. Worth a look at the history
  before assuming it is safe; a spectator list arriving mid-game touches nothing else on the page.
- **[Removing `uleft` from the analysis templates changes the row count]** → Every drop arrangement
  in those templates has to be edited together, and a missed one places an item in an implicit row.

## Open Questions

- Was the handler commented out to fix something, or left over from the copy?
- Does the analysis page want spectators at all? A finished game has none; a game in progress being
  watched does, and that is the same question `analysis-page-presence-websocket` asks about the dots.
