# Adopt TwoBoardPlayers/Team abstractions across the bughouse analysis side

## Why

The `two-board-players-abstraction` change established `TwoBoardPlayers`/`Team` as the single source of player identity for the two-board controllers, but the analysis side never adopted it: `AnalysisControllerBughouse` still reads raw model keys (`wplayer`, `wplayerB`, …) for PGN tags, `movetimeChart.ts` re-implements the team pairing rule by hand, three movelist sites concatenate team usernames themselves (the recorded TODO in `Team.name()`), and `gameInfoBug` hand-pairs the team rows. Meanwhile the seat-position math in `SeatsState` (which color sits at the top of each board for this viewer) is not round-specific and, once moved to `TwoBoardPlayers`, lets the analysis page orient boards from the viewer's perspective instead of always hardcoding spectator view.

## What Changes

- `Team.name()` gains an optional username formatter parameter (default: identity), so display-name call sites can pass `displayUsername`; the three movelist team-name concatenation sites adopt it and the TODO is removed.
- `TwoBoardPlayers` gains `teamOf(player): Team`; `movetimeChart.ts` derives its team series from it instead of hand-rolled color/board arithmetic, and names the (hidden-legend) team series from `Team.name()`.
- `TwoBoardPlayers` gains `initialTopColor(board): cg.Color`, extracted from the `SeatsState` constructor; `SeatsState` consumes it.
- A pure recorded-clock-time accessor `clockTimeAt(step, player)` is exported alongside the container; `analysisClock.ts` and `movetimeChart.ts` use it instead of hand-indexing `step.clocks`/`step.clocksB` by WHITE/BLACK + board. Explicitly out of scope: moving recorded times into `SeatsState`/`RoundSeat` — live-clock machinery stays round-only.
- `AnalysisControllerBughouse.getPgn()` reads player names via `players.byBoardAndColor(...)` instead of raw model keys, and the duplicated 11-tag PGN header block collapses into one shared helper.
- `gameInfoBug` builds a `TwoBoardPlayers` from the model and renders its two player rows from `players.teams` (preserving the current per-row display order), with `playerInfo` taking a `TwoBoardPlayer`.
- The analysis page sets initial board orientations from `players.initialTopColor(...)` — a deliberate, user-visible improvement: a player opening the analysis of their own game sees the boards oriented as they played them; spectators and plain analysis boards keep the current white/black default.
- Cleanup while touching `analysisCtrl.ts`: delete the dead `embed` field (known deferred review finding).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `bughouse-client-controllers`:
  - The "Single player-info abstraction" requirement extends to the new accessors (`Team.name(formatter)`, `teamOf`, `initialTopColor`) and to the remaining analysis-side consumers (PGN tags, movetime chart, game info, movelist team names), which MUST answer player-identity/team questions through the abstraction.
  - The "Behavior parity" requirement gains an explicit carve-out: initial analysis-board orientation for a participant of the analyzed game changes intentionally (viewer-oriented); everything else remains parity.

## Impact

- `client/two-board/common/players.ts` — new `teamOf`, `initialTopColor`, formatter param on `Team.name()`; jest unit tests extended.
- `client/two-board/seatsState.ts` — top-color computation replaced by `players.initialTopColor`.
- `client/two-board/analysis/analysisCtrl.ts` — PGN tag helper, orientation from players, `embed` field removed.
- `client/two-board/analysis/movetimeChart.ts` — team derivation via `teamOf`; recorded-time reads via `clockTimeAt`.
- `client/two-board/analysis/analysisClock.ts` — recorded-time reads via `clockTimeAt`.
- `client/two-board/common/movelist.ts` — three team-name sites use `Team.name(...)`; TODO removed.
- `client/two-board/common/gameInfo.ts` — team-row rendering from `players.teams`.
- No server, i18n, or wire-format changes. No breaking changes.
