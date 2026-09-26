## Why

Portrait was walked resolution by resolution in a live game — six phones and six tablets — and the
notes filled a section of `what-zone-a-is-for` that had nothing to do with zone A. **Most of what
those notes asked for has since been built**, by `unify-two-board-app-grid` rather than by anyone
acting on the notes. What is left is one question asked at several sizes, and it is not the question
the notes were written around.

**WHAT THE NOTES ASKED FOR, AND WHERE IT WENT.** The recurring item across five resolutions was
Nikolay's: the second preset set should become ONE full-width row of ten under both the partner
board and the tools column, instead of stacking two rows of five in the narrow track, with the
freed height going to the chat. The note said this needed "a NEW area spanning both tracks", because
portrait's areas were `chat / p1 / p2 / tablist` and every one was scoped to a single track.

That area exists. Portrait adopted the `zoneTools1..4` vocabulary and gained three drop templates
where a slot spans both tracks (`'zoneTools3 zoneTools3'`). Measured on the matrix at 2026-09-26:

| viewport | preset sets | inner widths | drops |
|---|---|---|---|
| P1, P2 | `[5, 10]` | 221/389, 224/392 | tools4, tools3 |
| P3, P4, P6 | `[10, 10]` | 360, 411, 429 | tools4, tools3, tools2 |
| P5 (iPhone SE) | `[5, 5]` | 240, 240 | **none** |

So the full-width row of ten is drawn on five of the six phone and tablet viewports, and the tab
strip takes a full-width row too. The one exception is the SE, which the notes themselves called
"the one place the row is NOT free".

## What Changes

Nothing yet. What remains is **one question**, asked sharply at three sizes, plus a tablet idea that
needs restating now that portrait's mechanism is known:

**WHERE DOES PORTRAIT'S VERTICAL SLACK GO?** Today the answer is "the chat takes it", and that is
not a decision anyone made — it is what happens when the boards are sized from WIDTH and every part
above the chat takes its content height. The three sizes that make it visible:

- **800x1280 — the chat gets 459px and is nearly empty.** Boards 512²/251², sized by width, so the
  extra height has nowhere else to go. The note says plainly: a rule is needed.
- **375x667 (iPhone SE) — the chat gets 44px**, a line and a bit, and the notes record that it is
  NOT CLEAR HOW TO ADDRESS. The same mechanism at the other end: nothing else yields, so the chat
  absorbs the shortfall too. This is the only viewport where no part drops at all.
- **1024x1366 — "plenty of unused space", and the MODE ITSELF MAY BE WRONG.** Own board 651²,
  partner 331², chat 372, and a 331x400 empty band — larger than most phones' entire tools column.
  At this size the question is not how to arrange portrait but whether a 1024-wide viewport should
  be in portrait's arrangement at all.

And one idea to restate rather than carry: the notes proposed moving the presets **into zone A** on
tablets, by the mechanism the analysis page used. Portrait has no zone A and does not need one — its
slot widens in place. So the idea survives as "should a preset panel leave the tools track on a
tablet", with a different mechanism and a different cost.

## Capabilities

### Modified Capabilities

- `bughouse-round-layout` — gains a rule for where portrait's spare height goes, if one is decided.
  It currently has none, which is why the chat gets all of it.

## Impact

- `static/two-boards/layout/portrait.css` — the templates and what they give the chat.
- `client/two-board/squareUnit.ts` — only if the portrait threshold moves (the 1024 question).
- `client/two-board/common/toolsPlacement.ts` — only if a part's minimum has to be declared
  differently to make the chat yield.
- Verified through `tests/layout_matrix`'s 24 portrait rows — see `layout-matrix-bed`.

## What this change is NOT

- **Not the preset panel's surface.** Done and archived in `portrait-preset-panel-and-flow`.
- **Not zone A.** Portrait has none. `zone-a-semantics` owns that question for the two landscape
  modes.
- **Not the boards' size.** Portrait sizes them from width and does not honour zoom, by design
  (`squareUnit.ts`'s `zoomReachesBoards()`). A change that made portrait zoom would be a different
  proposal with a much larger blast radius.
