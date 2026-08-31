## 0. Status

Proposed 2026-08-23. **Implemented, verified live in all three layout modes on `JJgZzLhJ`, and
closed 2026-08-29.** Every task is done. The two questions the change carried to the end were
decided by Nikolay rather than built: a board being searched does not need to announce itself (3.8),
and the engine keeps running whichever tab is selected (4.3).

The engine was NOT broken — section 1 records the evidence, so that nobody reading this later starts
by repairing something that works.

## 1. What was measured first

- [x] 1.1 Both boards evaluate correctly today on `JJgZzLhJ`: board A eval **13.8** at depth
      **18/18**, board B eval **-9.0** at depth **15/18**, 3014 knodes/s. Both principal variations
      contain drops (`P@f7`, `B@g5`, `P@g2`), so Fairy-Stockfish has the bughouse variant loaded from
      `variants.ini` rather than falling back to chess.
- [x] 1.2 The two switches `#input` / `#inputPartner` are mutually exclusive by construction:
      `renderInput()` unticks the other and clears the panel. Confirmed live in both directions.
- [x] 1.3 **No `ucinewgame` and no `Clear Hash` anywhere in the codebase.** The transposition table
      already survives every `position` / `go`, which is what makes alternating worth doing.
- [x] 1.4 **Nothing sets `Hash`.** Two positions would share whatever the wasm build defaults to.
- [x] 1.5 **Nothing handles `bestmove`.** The loop tests `info`, `uciok`, `readyok`, the engine
      banner and an error prefix, so no search-finished signal exists.

## 2. One switch

- [x] 2.1 Replace the two checkboxes in `renderPanel()` with one, and delete `renderInput()`'s
      mutual-exclusion branch along with the `partnerCheckboxId` lookup by element id.
- [x] 2.2 Move `localAnalysis` from the board controller to the page — design decision 5. Leaving it
      per-board and setting both true would leave five `boardA.localAnalysis ? boardA : boardB`
      reads silently meaning "board A".
- [x] 2.3 Replace every `boardInAnalysis` derivation with the board the current slice belongs to.
      Sites: the info handler, `pvboxIni()`, the gauge update, and the two `boardName == 'a'`
      branches near the end of the file.

## 3. Alternating slices

- [x] 3.1 Handle `bestmove` in the message loop.
- [x] 3.2 Drive slices from it: `position fen <next board>` + `go movetime T`, alternating while the
      switch is on. Never `ucinewgame`, never `Clear Hash`.
- [x] 3.3 Set `Hash` explicitly, sized for two positions.
- [x] 3.4 **There is no T. The slice is one ply, not a stretch of time** — design decision 3,
      reversed with the measurement that reversed it. A board's target is its own achieved depth
      plus one, so no shared rung can advance past a board that never reached it, which is what the
      timer was quietly doing to board B.
- [x] 3.5 **Deepening confirmed, and it is now structural rather than hoped for.** Each visit asks
      for exactly one more ply than the board has, so a visit that ends is a ply gained by
      definition; a visit that ends short finishes the board. Measured at MultiPV 1 on `JJgZzLhJ`:
      strict A/B alternation from depth 12 to 18, both boards at 18/18, engine idle at 68s.
- [x] 3.6 **A board that reaches the ceiling stops being revisited, and when both have, the engine
      goes idle** until `Go deeper` raises the ceiling. `depthReached` per board, read only after
      `bestmove`; `onSearchEnd` schedules only boards below the ceiling. Verified: 0 UCI commands and
      0 info lines in 20s with both boards at 18/18, the switch still on.
- [x] 3.7 **The cap is gone entirely**, along with `ladderSliceCapMs` and `ladderDepthStep`. It
      existed to stop one board monopolising the engine; one ply is its own bound. Superseded by
      3.4 — it was briefly skipped-when-alone, which was a patch on the timer rather than a fix.
- [x] 3.8 **Accepted as it stands.** The top plies are slow — board B's ply 17 took 20.3s and ply
      18 took 26.8s at MultiPV 1, with board A's number holding throughout. That is the price of the
      positions rather than of the scheduler, the depth readout makes it legible, and Nikolay's call
      on 2026-08-29 was that a board being searched does not need to announce itself.

## 4. What the panel shows

- [x] 4.1 **Decided: both lists, one column per board.** The alternative — one list showing the
      board last evaluated — reintroduces exactly what this change set out to remove, only on a
      timer the reader does not control. The page already shows both boards' scores and both gauges;
      the PV list was the last element showing one. Columns are ordered by POSITION (own board left),
      never by identity, so a viewer seated on board B does not get the pairing backwards.
- [x] 4.2 **Per-board depth built, and it did not exist before.** design.md claimed the panel
      "already does" show depth per board; it did not — `#info` was a single element patched by
      whichever board reported last. Now `#info` / `#infoPartner`, one under each score, each holding
      its board's last reading while the engine is away on the other.
- [x] 4.3 **Decided: it keeps running**, whichever tab is selected. The gauges stay visible beside
      the boards even when the engine panel does not, so stopping would blank a reading the reader
      can still see — and 3.6 already stops the engine burning CPU once both boards top out, which
      was the cost that made this a question at all.
- [x] 4.4 **The board's identity letter, `A` or `B`, is shown under each gauge** — added because the
      two PV columns are ordered by position and nothing on the page stated identity. Landscape
      only; portrait is `portrait-gauges-and-board-letters`.
- [x] 4.5 **MultiPV exposed on this page.** It was read from `localStorage.multipv` — written by the
      single-board page's slider — with no control here, so the panel silently honoured a setting
      made elsewhere. Now a slider under the PV columns, 1-5, sharing the same key.

## 4b. Rendering a variation that depends on the partner

Not in the original plan. Found while checking 4.1 and fixed on 2026-08-29.

- [x] 4b.1 **Diagnosed.** Fairy-Stockfish searches drops of pieces a side does not hold yet, because
      in bughouse they arrive from the partner's board. `ffish` judges legality against the pocket
      the FEN records and refuses, and `variationSan` is ALL-OR-NOTHING. Demonstrated on board A,
      pocket `[Bp]`: `P@f7 B@h5 Q@e5 e1d1` converts to `""` because after the first two drops both
      pockets are empty and Black has no queen — while its first two plies convert perfectly well.
- [x] 4b.2 **The panel discarded the whole line** — no `else` branch, so the row kept its
      placeholder or, worse, a stale variation from an earlier depth that read as current. It hit
      the main line too, not only the secondaries.
- [x] 4b.3 **Fixed by lending.** The line is walked a ply at a time and a piece the mover does not
      hold is added to the FEN's bracket for the length of the conversion, on the throwaway board
      used for notation. Verified: the line above now renders in full as
      `5...P@f7 6. B@h5 Q@e5+ 7. Kd1`.
- [x] 4b.4 **Lent pieces are marked red**, the piece letter only — `Q`, not `@e5` — so a reader can
      see which part of a line is a promise about the partner rather than a fact about this board.
      `B@h5` in the same line is NOT marked, correctly: White really does hold that bishop.
- [x] 4b.5 **A blank PV row is not always this bug, and was misread as it once.** Board A of
      `JJgZzLhJ` is in check with exactly ONE legal move (`P@f7`, confirmed by `legalMoves()`), so
      the engine emits only `multipv 1` there however high MultiPV is set — measured across a search
      as `board A: multipv 1 x39, nothing else` against `board B: multipv 1-5 x40 each`. Those `-`
      rows are honest.
- [x] 4b.6 **Accepted: the red mark is usually off-screen in the tools column.** Each line clips with an
      ellipsis after two or three plies and a borrowed drop is normally deeper — measured with a
      flagged `N` ending at x=1928 in a column whose right edge is 1266. The marking is correct;
      it is visible in wide layouts and on hover. Making it visible at a glance would mean marking
      the ROW rather than the piece, which is a different decision and not this change's.

## 5. Close out

- [x] 5.1 **All three layout modes verified.** Landscape-short (p1, 1276x551), portrait
      (p4, 386x835) and desktop landscape (p2 at 90% zoom, 1418x611 — the harness tiles are 568 CSS
      px tall, below the mode's 600px floor, so a zoom step is how it is reached). Desktop landscape
      carries both gauges (14x350 each, one per board), both letters, both PV columns, both depth
      readouts and the MultiPV slider, with no horizontal overflow; both gauges move independently
      and each depth holds while the engine is on the other board.

      Note the acceptance criterion changed with 3.6: a topped-out board's number SHOULD freeze, and
      its Go-deeper button stands in place of its speed reading. What must not happen is a board
      freezing below the ceiling.
- [x] 5.2 Frontend gates: `yarn typecheck` clean, `yarn test` 48 suites / 262 tests. No server change
      and no Python gates.
- [x] 5.3 **A second wasm instance is not needed for the reason this task named.** Slice-switching
      is not jumpy: each board holds its own last reading, so a handover changes nothing on screen
      for the board being left. The cost that DID show up is different in kind — a single ply near
      the ceiling takes 20-27s — and a second instance would not shorten it, it would only let the
      other board keep moving meanwhile. That is 3.8's question, and design decision 2 still stands
      as written.
