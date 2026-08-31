## Context

Measured on 2026-08-23, live, against game `JJgZzLhJ`.

### What exists

`client/two-board/analysis/engine.ts` holds one Fairy-Stockfish wasm instance behind `window.fsf`
and drives it over UCI:

- `engineGo(cc)` sends `setoption name UCI_Variant value bughouse`, `Use NNUE value false`,
  `Threads value <hardwareConcurrency - 1>`, `MultiPV`, then `position fen <cc.fullfen>` and
  `go depth 99` (or `go movetime 90000 depth N` when the depth cap is not maximal).
- `engineStop()` sends `stop` then `isready`.
- Two checkboxes, `#input` and `#inputPartner`, each flipping that board controller's
  `localAnalysis`. `renderInput()` makes them exclusive: switching one on switches the other off and
  clears the panel.
- The info handler picks its subject with `boardA.localAnalysis ? boardA : boardB` — an idiom that
  only has an answer while at most one is true.

### Three facts that decide the design

1. **No `ucinewgame` and no `Clear Hash` appear anywhere in the codebase.** So the transposition
   table already survives every `position` / `go`. This is the fact the whole proposal rests on.
2. **Nothing sets `Hash`.** Two positions will share whatever the wasm build defaults to.
3. **Nothing handles `bestmove`.** The message loop tests for `info`, `uciok`, `readyok`, the engine
   banner and an error prefix. `go depth 99` therefore runs until something sends `stop`, and there
   is no event marking the end of a search.

## Goals / Non-Goals

**Goals:**

- One switch, both boards evaluated, both gauges live.
- Each board's evaluation deepens over time rather than being recomputed from scratch on every turn.
- No regression for a reader who only cares about one board — the numbers must not get worse.

**Non-Goals:**

- A second engine instance. See decision 2.
- Server-side or cloud analysis. This is the local wasm engine only.
- Changing what the engine is asked — the variant, NNUE, MultiPV and thread count are as they are.
- Making bughouse evaluation *correct*. Fairy-Stockfish scores each board as an isolated
  crazyhouse-like position; it cannot see the partner board's tempo or what is about to be handed
  over. That is a known limit of evaluating bughouse per board and this change does not address it.

## Decisions

### Decision 1: Three options were considered and two of them are the same implementation

**Option 2 — two searches in parallel on one instance. Impossible, not merely hard.** UCI runs one
search per engine: a single root position, a single search stack, a single TT. A second `position` /
`go` arriving mid-search is not queued as a parallel job, it is undefined. `setoption name Threads`
does not help — those threads are Lazy SMP *within one search*, sharing that search's tree, not a
pool that could take a second job.

**Option 3 — alternate, resuming each position where it was left.** The literal form is impossible:
`go` always restarts iterative deepening at depth 1; there is no "continue from depth 18". But the
effect largely happens anyway, because the TT persists (fact 1). Coming back to board A, the old
subtree is still hashed, re-reaching the previous depth is mostly TT hits, and the search then goes
beyond it. Deepening across visits is real; it is just carried by the hash table rather than by
saved search state.

**Option 1 — sequential slices.** `position fen A` + `go movetime T`, then B, alternating.

**So options 1 and 3 are one implementation.** Alternating slices without clearing the hash IS the
incremental-deepening scheme. There is one design here with one parameter — the slice length — not
three designs to choose between.

### Decision 2: One instance, not two

A second wasm instance would give true parallel evaluation, and it is the only thing that would. It
is rejected for now on cost: a second worker, a second module instantiation, a second TT, and a
second copy of the engine's memory, on a page that already carries two chessgrounds and a chart. The
alternating scheme gives both boards a live number using what is already loaded.

Worth revisiting if slice-switching proves visibly jumpy in use. The proposal is reversible: nothing
about one switch driving both boards assumes one engine.

### Decision 3: Slice by time, not by depth — **REVERSED 2026-08-29**

The original reasoning: `go depth N` on two positions of unequal complexity spends wildly unequal
wall-clock time on them, so one gauge would sit stale while the other churned. `go movetime T` gives
each board the same share of the engine regardless.

**It was built that way and measured, and the timer was the worse half of the design.** Two things
it got wrong on `JJgZzLhJ`:

- **The rung rose whether or not a board reached it.** The target advanced on every wrap, so board
  B — which reached only depth 10-12 in 4000ms — was asked for depths it had never achieved,
  for ever. It looked like a ladder and was a treadmill.
- **The asymmetry it was meant to hide is real and belongs to the positions.** A timer does not
  remove the fact that board B's ply 17 costs 20 seconds; it just stops the reader from seeing
  which board is behind, because both numbers move and neither is trustworthy.

**A slice is now exactly one ply**, and the target is PER BOARD — its own achieved depth plus one,
so there is no shared rung to get out of step with. No `movetime` at all. Measured at MultiPV 1,
both boards climbed 12 → 18 in strict alternation and the engine idled at 68s:

| ply | board A | board B |
|--:|--:|--:|
| 12 | 1029ms | 797ms |
| 15 | 616ms | 1721ms |
| 16 | 1269ms | 4234ms |
| 17 | 5039ms | 20256ms |
| 18 | 2792ms | 26777ms |

The cost of a ply roughly quadruples near the top, and board B's last two plies do freeze board A's
number for 20 and 27 seconds. That is the honest price of the positions, it is visible because the
depth is now shown per board, and it is bounded by the ceiling — which is what Decision 6 rests on.

### Decision 4: `Hash` becomes explicit, and larger

Two positions sharing one table each get roughly half of it, and the default is small. Raising it is
what keeps decision 1's TT benefit real rather than notional. One value, set once, sized for two
positions rather than one — a wasm page is not free, so this is a real trade and should be stated as
a number in the spec rather than left to the build's default.

### Decision 5: `localAnalysis` stops being per-board

It is currently a property of each board controller, which is exactly what the two exclusive
switches drive. With one switch it is a property of the page: the engine is on, and it serves both.
Leaving it per-board and setting both to true would leave five `boardA.localAnalysis ? boardA :
boardB` reads that silently mean "board A" once both are true.

### Decision 6: A board that reaches the ceiling is finished

Revisiting a board already searched to the ceiling returns the same answer out of the hash, so it
spends the engine on a number nobody is waiting for and makes that board's readout flicker between
its speed and the Go-deeper button. A finished board is not scheduled again; when both are finished
the engine idles until `Go deeper` raises the ceiling and restarts the ladder.

"Finished" also covers a slice that ends BELOW the depth it asked for. Without a timer that can only
mean the engine had nothing more to give — a forced mate, or no legal move — so there is no point
asking again.

## Risks / Trade-offs

- **[Each board's number is stale for the half of the time the engine is on the other one]** → It is
  what one engine and two positions costs. Show the depth per board so a stale number is visibly
  stale rather than quietly wrong. **Correction, 2026-08-29:** this said the panel "already does"
  and it did not — `#info` was ONE element patched by whichever board reported last, so the depth
  and the speed flipped between boards every slice. Split into `#info` / `#infoPartner` when the
  mitigation was actually built.
- **[Switching halves the effective hash per position]** → Decision 4. Measure before and after: the
  depth reached per slice at a fixed T is the number that says whether it is enough.
- **[Someone adds `ucinewgame` later and silently removes the deepening]** → Stated as a requirement
  in the spec rather than left as a property of the code that happens to hold.
- **[A reader who only watches one board loses depth to the other]** → Real, and the honest cost of
  one switch. Mitigation if it bites: keep alternating only while both gauges are visible.
- **[Slice churn makes the PV list flicker between two games' moves]** → The PV panel shows one
  board's line. It needs to say which, or show two; unresolved, and called out below.

## Open Questions

Answered 2026-08-29:

- ~~What does the PV panel show when both boards are live?~~ **Both lists, one column per board,
  ordered by position.** See tasks 4.1.
- A question that was not asked and had to be: **what happens when a board reaches the ceiling?**
  It stops being revisited, and when both have, the engine goes idle until `Go deeper`. That in turn
  forced a second answer — the slice cap is skipped while a board searches alone, because otherwise
  a board that always hits the cap can never top out and the idle state is unreachable. Tasks 3.6
  and 3.7.

Still open:

- What is the slice length, in the end? `ladderSliceCapMs` is 4000, chosen rather than measured.
  Task 3.4 holds what IS measured about it.
- Does `Threads` want reducing? Lazy SMP on a short slice may be worth less than on a long search,
  and the threads are shared with the page's own work.
- Should the engine keep running while the Move times or FEN & PGN tab is selected, given the gauges
  stay visible beside the boards but the panel does not? Cheaper than it was, now that a topped-out
  engine idles by itself.
- Should `Go deeper` be a toggle rather than a one-way door? It sets the ceiling to 99 for the
  session and the button then never renders again, so there is no way back to 18 without a reload —
  and at 99 the idle behaviour above effectively never triggers.
