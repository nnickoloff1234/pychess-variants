# Design — adopt-two-board-players-in-analysis

## Context

The `two-board-players-abstraction` change (archived) made `TwoBoardPlayers` the single source of player identity, constructed once in the `TwoBoardController` base and shared by round and analysis. The round side adopted it fully (`SeatsState`, flag callbacks, movable gating). The analysis side did not: `AnalysisControllerBughouse.getPgn()` still reads `model['wplayer']`/`wplayerB`/… directly (and duplicates the whole 11-tag PGN header block in its tree and legacy branches), `movetimeChart.ts` re-derives the team of a move with hand-rolled color/board arithmetic, `common/movelist.ts` concatenates team usernames at three sites (the TODO recorded on `Team.name()`), and `common/gameInfo.ts` hand-pairs the two team rows from raw model keys. Separately, the `SeatsState` constructor computes which color sits at the top of each board for the current viewer — logic that only depends on data already inside `TwoBoardPlayers` — while the analysis page hardcodes spectator orientation (`boardB` set to `'black'`, `boardA` left at the default `'white'`).

## Goals / Non-Goals

**Goals:**

- Analysis-side consumers answer every player-identity/team question through `TwoBoardPlayers`/`Team`; no raw model player keys and no re-derived team arithmetic remain in `client/two-board/`.
- Close the `Team.name()` TODO by making it serve both raw-username and display-name call sites.
- Move the viewer-relative top-color computation into `TwoBoardPlayers` and reuse it from both `SeatsState` and the analysis page, giving participants viewer-oriented analysis boards.
- Extend the existing jest unit tests for the new accessors (pure logic, no DOM).

**Non-Goals:**

- No change to round-page behavior, wire formats, server code, or i18n.
- No player bars/seat UI on the analysis page (a possible follow-up once orientation is seat-aware).
- No move of recorded clock times into `SeatsState`/`RoundSeat`: `RoundSeat` owns *live* `Clock` machinery (tick/flag/pause, round-page DOM ids) and a *constant* screen position, while analysis renders *recorded* per-step times into fixed template divs with position recomputed from `flipped()` on each render. The two position semantics are deliberately different; sharing the class would blur that. Analysis gets a pure accessor instead (decision 7).
- No fix for the known TDZ import-cycle hazard or other deferred review findings beyond the dead `embed` field, which sits in a file this change edits anyway.

## Decisions

1. **`Team.name(format?)` with a formatter parameter, not a separate `displayName()` method.** Of the three movelist sites, two want `displayUsername(...)` and one wants raw usernames. A `format: (username: string) => string = u => u` parameter serves both without importing `@/user` into `players.ts`, keeping the container free of presentation dependencies (a property the original change deliberately established).

2. **`teamOf(player)` by identity lookup.** `this.teams.find(t => t.players.includes(player))!` — safe because every `TwoBoardPlayer` instance is created and owned by the container; no structural comparison needed. `movetimeChart.ts` then computes the mover as `players.byBoardAndColor(step.boardName, moverColor)` and reads `teamOf(...).teamNumber`, deleting the inlined pairing rule. The four team-series entries get their `name` from `Team.name()`; the legend is disabled, so this is informational only (tooltips/exports), not a visual change.

3. **`initialTopColor(board)` lives on `TwoBoardPlayers`, defined by seat precedence.** (1) Viewer's own seat on the board → its opposite color on top; (2) else viewer's seat on the other board → the partner's opposite color on top (= the viewer's color on the other board); (3) else the canonical spectator orientations (black on top of A, white on top of B). This matches the legacy `SeatsState`/round-page placements for every valid team seating; for conflicted seatings (one username on both teams, i.e. self-play test games) the legacy code had two disagreeing disjunctions (black-biased seat bars vs white-biased round orientation) — the precedence definition supersedes both, letting the viewer's own seat on each board decide. The round page's own orientation disjunction in `roundCtrl.ts` still exists separately (pre-existing); unifying it onto `initialTopColor` is a candidate follow-up, not part of this change. `SeatsState` keeps the seat-position (0/1) mapping and the DOM concerns but sources the top color from the container — the constants stay constants for the lifetime of the page, exactly as documented today.

4. **Analysis orientation derives from `initialTopColor`.** `orientation(board) = opposite(initialTopColor(board))`. For spectators and for the plain analysis board (`gameId === ''`, viewer not among the players → spectator path) this yields white/black exactly as hardcoded today, so the only behavior change is the intended one: a participant sees the boards as they played them. `flipBoards`/`switchBoards` continue to operate relative to whatever the initial orientation is.

5. **One PGN-tag helper.** `getPgn()`'s two branches share a private helper that builds the header from `players.byBoardAndColor(board, color).username` and takes the move text; the duplicated block is deleted. Output must be byte-identical to today (the container reads the same model keys via `playerInfoData`).

6. **`gameInfoBug` renders rows via container lookups, preserving exact DOM order.** `playerInfo` takes a `TwoBoardPlayer` (plus model for `level`). Rows are built as `byBoardAndColor('a','white') + byBoardAndColor('b','black')` and `byBoardAndColor('b','white') + byBoardAndColor('a','black')` — semantically `teams[0]`/`teams[1]`, but by-seat lookup keeps the current icon/order markup trivially identical (note `teams[1].players` is ordered `[bA, wB]` while the row renders wB first). The container is constructed locally from `(model, model.username)` since the view builds before the controller exists — cheap and consistent by construction. Implementation note: this made `gameInfo.ts` import from `players.ts` while `players.ts` imported `playerInfoData` from `gameInfo.ts`, a two-module cycle; resolved by moving `playerInfoData` (a pure model reader) into `players.ts`, keeping the dependency one-way (`gameInfo → players`).

7. **`clockTimeAt(step, player)` as a free function exported from `players.ts`, not a `TwoBoardPlayers` method.** It needs no container state — just the step and the player's `boardName`/`color` — so a free function keeps the container's surface minimal: `player.boardName === 'a' ? step.clocks : step.clocksB`, indexed by the player's color. Both hand-indexing sites adopt it: `analysisClock.ts`'s `renderClocks` builds each board's `[white, black]` pair via the accessor, and `movetimeChart.ts` reads the mover's time as `clockTimeAt(step, mover)` — the same `mover` it already resolves for `teamOf` (decision 2) — including the ply-0 initialization of its last-time bookkeeping. Recorded times stay on `Step` (they are per-ply data); only the *lookup* is centralized.

8. **Delete the dead `embed` field** in `analysisCtrl.ts` (deferred review finding; its value flipped meaning after the super() reorder and nothing reads it — `checkStatus` reads `this.model['embed']`, not the field).

9. **Seat-centric restructure (user-directed, supersedes the naming in decisions 1–8).** `boardName`/`color` moved off the player object: `Seat` (in `players.ts`) holds the coordinates plus a `player: TwoBoardPlayer` carrying pure identity (`username`, `title`, `rating`); the container is renamed `TwoBoardSeats` and the controllers hold it as `seats` — all player access goes through the seats. Four per-seat player instances are kept (no dedupe for now). `RoundSeat` extends the shared `Seat` with the round-only presentation (clock, difference, player bar, position) — the shared `Seat` is the vehicle that lets the analysis side hold seats too, since `RoundSeat` itself is round-only. Relations (`partnerOf`/`opponentOf`/`opponentsPartnerOf`) and `teamOf` are seat-in/seat-out, coordinate-resolved (so any `Seat`-shaped input, including a `RoundSeat`, works); per-player questions identify the seat(s) first, then use seat logic. `Team` holds its two `Seat`s; `clockTimeAt(step, seat)`. Invariant relied on throughout: one person is never on both teams — simul means one person occupying both seats of the same team.

## Risks / Trade-offs

- [Orientation change may surprise participants or Playwright assertions] → It's the explicit purpose of the change; spec carves it out of the parity requirement. Check `tests/test_gui.py`/`test_e2e.py` for orientation-sensitive bughouse assertions and adjust; manual smoke as participant and as spectator.
- [PGN/team-name output regressions would be silent] → Jest tests pin `Team.name()`/`name(displayUsername)` output and `teamOf`/`initialTopColor` semantics; PGN helper is a pure refactor verified by comparing output for a sample game before/after.
- [`gameInfoBug` markup drift] → By-seat lookup (decision 6) keeps the vnode tree structurally identical; verify with a DOM snapshot or manual diff of rendered HTML.
- [`teams[1]` ordering trap] → Called out in decision 6; unit test asserts row-order helper output, not just team membership.

## Open Questions

- None blocking. Follow-up candidate (out of scope): analysis-page player bars built on a clock-less seat abstraction shared with `RoundSeat`.
