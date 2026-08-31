## Context

The round page was rebuilt around three ideas, and the analysis page has none of them:

1. **A board is sized from a published square unit**, not from a viewport fraction. `squareUnit.ts`
   computes the largest square for which ten of them fit the available height, quantised to whole
   device pixels per square so chessgroundx's own flooring is a no-op on it. The grid track is then
   `unit * 8` with nothing multiplied in afterwards.
2. **A board and its furniture are one grouped item**, not several grid items placed by named areas.
   `.bug-own-stack` is strip/board/strip in block flow; `.bug-right-column` holds the partner's stack
   and the tools together, which is what lets a grid track be "board plus tools".
3. **Which board is "mine" is a role, not an identity.** `markRoles()` marks `.own-board` /
   `.partner-board`, and everything that must follow the viewer keys off those rather than off
   `#mainboard`/`#bugboard`.

The analysis page is the pre-rework shape: a flat seven-column grid, boards at the outer edges,
`30vw * zoom` sizing, and no layout at all below 800px.

**What it already has** and does not need building:

- `TwoBoardController.seats` — the analysis controller inherits it, so `seats.me('a')`,
  `seats.isSpectator()` and `seats.myTeam()` all answer today.
- `TabbedPanels` — already used for `under-board`'s *Move times* / *FEN & PGN*.

**What differs and will bite.** On the round page a board's companions are seat strips, siblings of
the board inside the stack. On the analysis page the clocks are placed INSIDE
`selection#mainboard` by `clockView.topPlaceholder()` / `bottomPlaceholder()`. So the analysis
"stack" is one element containing clock/board/clock, where the round stack is three siblings. The
ten-row arithmetic assumes the latter.

## Goals / Non-Goals

**Goals:**

- Both boards adjacent, tools beside them, in landscape.
- A portrait layout, which this page has never had.
- The main board nearest the reader: bottom in portrait, left in landscape.
- Each gauge attached to the board it reports on.
- One tools panel, tabbed, holding Moves / Info / Chat.
- Board sizing shared with the round page rather than duplicated.

**Non-Goals:**

- The eval chart and the FEN & PGN panel. They stay in `under-board`, untouched.
- Deciding chat's permanent home. This change only makes it visible.
- The engine's behaviour, the analysis tree, or anything about how moves are computed.
- The single-board analysis page. Every rule here is scoped to `.analysis-app.bug`.

## Decisions

### 1. The tools panel is one tabbed column, and the engine belongs to Moves

Three tabs — **Moves**, **Info**, **Chat** — in a single column to the right of the boards.

The engine is not a tab of its own. Its switches, its name panel, its PV lines and `#misc-info` all
go INSIDE the Moves tab, above or around the movelist, because they are one activity: reading the
game. Splitting the evaluation from the move it evaluates would mean choosing which half to look at.

Chat is in a tab for a different reason, and the reason should not be lost: `#roundchat` is in the
DOM and renders nowhere visible on the page today. A tab makes it observable so it can be judged. It
is not a statement that chat belongs here.

### 2. Each gauge sits to the right of its own board

Landscape order becomes **board A · gauge A · board B · gauge B · tools**.

The alternative — both gauges in the seam between the boards, back to back — keeps each gauge
adjacent to its board too, but it widens exactly the seam the round page works to keep tight, and it
puts two unrelated vertical bars side by side where a reader expects one boundary.

The cost of the chosen arrangement is that gauge A sits between the two boards, so the boards are not
literally touching. That is accepted: a gauge is a thin bar, and it belongs to the board on its left.

### 3. The role is POSITIONAL; deciding which board takes the main position is SEAT-BASED

Corrected during implementation. The first draft of this decision said `markRoles()` "already computes
exactly this" and should simply move to shared code. It does not, and it cannot.

`markRoles()` answers a positional question:

```ts
function isOwnSide(el: HTMLElement): boolean {
    return !el.parentElement?.classList.contains('bug-partner-stack');
}
```

— own means "not inside the partner stack". That is correct for the round page precisely BECAUSE
`switchBoards()` physically moves board elements between the two stacks, so the viewer's board is in
the left column by construction and the role follows the DOM. It says nothing about who played where.

So the work splits in two, and only one half is shared:

- **`ownBoardName(seats)`** — new, shared: returns `'a'` or `'b'`, the board the viewer holds a seat
  on, falling back to `'a'` for anyone seatless. This is the seat-based question, and it is what the
  ANALYSIS view asks when it decides which board to build into the main position. The round page does
  not need it: its switch already does the placing.
- **`markBoardRoles()`** — extracted from `markRoles()`, shared: marks `#mainboard`/`#bugboard` with
  `.own-board` / `.partner-board` from DOM position. Unchanged behaviour, just lifted so both pages
  mark the same way once their boards are placed.

`markRoles(views)` stays in `round/roundControls.ts` and calls `markBoardRoles()` plus its own seat-strip
marking, which analysis has no equivalent of — the analysis page has no seat strips, only absolutely
positioned clock overlays.

The reason for keeping the marking positional on both pages rather than making it seat-based
everywhere: the round page's layout deliberately ties `--bug-tall-sq-a` to the LEFT COLUMN, not to a
board, and the switch re-marks. Making the mark seat-based would make it survive a switch, which is
the opposite of what that page wants.

*Alternative considered: pass a boolean into the view and let CSS order the two stacks.* Rejected —
the answer is needed by more than the ordering (sizing, coordinate room, which gauge is which), and a
class the whole page can read is what the round page already proved out.

### 4. Sizing is the round page's unit, reused — and the stack shape is the open risk

`squareUnit.ts` publishes `--bug-tall-sq-a` / `-b` for the round page's tall-landscape mode, computed
over ten rows: pocket row, eight board rows, pocket row.

The analysis page's vertical composition is NOT obviously ten rows. Its clocks live inside the board
element rather than in strips beside it, and a clock is not a pocket. So one of two things is true,
and implementation must establish which before writing a track:

- the analysis stack reduces to the same ten rows, and the unit is reused unchanged; or
- it composes differently, and `squareUnit.ts` gains a second published unit for it — *not* a second
  copy of the arithmetic.

What must NOT happen is a track that multiplies a published unit by anything. That is the defect the
round page documents at length: a unit is a whole number of device pixels per square, and multiplying
it by a zoom fraction un-quantises it, after which chessgroundx floors the product again and keeps
the difference — up to a whole square's worth, measured at 6.39px on one track.

### 5. The grid is replaced, not adjusted

The seven-column template goes. Its columns encode the old arrangement — pockets between boards, a
`0.8em` spacer column named `d` — and there is no sequence of edits from it to "boards adjacent" that
passes through a working layout.

Portrait is written fresh, because there is nothing to amend: no `.analysis-app.bug` rule exists
below 800px.

## Risks / Trade-offs

**The analysis stack may not be ten rows.** → Decision 4. This is the single largest unknown and it
gates the sizing work. It is checked first, on the live page, before any track is written.

**`markRoles()` moving is a shared-code change on a page that is not the subject.** → It is a move,
not a rewrite, and the round page's behaviour is covered by existing requirements and by a live
harness. The alternative is a second implementation of a rule that has already produced one bug.

**Chat may render badly, or hugely, once visible.** → That is the point of showing it. It has been
invisible, so nothing is known about how it behaves in a panel. If it turns out to be unusable it can
be hidden again in one line, having taught us something.

**The gauges are eval bars whose height tracks the board.** → With the boards resized by the square
unit, anything that sized a gauge from the old `30vw` track needs rechecking. The gauge is not in the
scope of this change's design, only of its verification.

**Two pages will share `markRoles()` and the square unit.** → That is the intent, but it means a
future change to either can now break the other. The requirements this change adds are written
against both pages for that reason.

## Open Questions

1. ~~Does the analysis stack reduce to the round page's ten rows?~~ **ANSWERED: yes.** Measured on
   `JJgZzLhJ?ply=0` — the clocks are `position: absolute` and add 0 height, so the stack is pocket
   (53.59) + board (425.3 = 8 x 53.166) + pocket (53.59) = 532.50 against ten squares at 531.66. The
   0.42px each pocket runs over a square is the leftover quantisation removes. `squareUnit.ts` is
   reused unchanged.
2. **What happens to `under-board` once the tools column exists?** It still holds the chart and
   FEN & PGN, deliberately out of scope — but a full-width strip under a page whose tools are now on
   the right may look stranded. Noted, not decided.
3. **Does the analysis page want the round page's coordinate treatment** — labels inside the squares
   when there is no room outside? It is the same board at the same sizes, so probably yes, but it is
   not required by anything here.
