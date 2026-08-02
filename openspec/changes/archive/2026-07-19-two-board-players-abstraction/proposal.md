# Introduce a per-player abstraction for the four bughouse players

## Why

Player identity in the bughouse client is smeared across parallel scalar fields and repeated lookup patterns. `PlayersState` alone carries 12 scalars (`wplayer`/`bplayer`/`wtitle`/`btitle`/`wrating`/`brating` × two boards), plus derived `myColor`/`partnerColor` maps, screen-position arrays (`colors`/`players` × 2), and `teamFirst`/`teamSecond` tuples typed as `[[string, string, string], ...]` where consumers must know that index `[0]` is the username. `AnalysisControllerBughouse` duplicates the exact `teamFirst`/`teamSecond` construction from `playerInfoData`, and `movelist.ts` bridges the two controllers with the unsound `teamsOf()` cast. Every "who is the current player / their partner / their opponent / the opponent's partner" question is answered ad hoc with color/board arithmetic at ~20 call sites in `roundCtrl.ts`, `playersState.ts`, and `analysisCtrl.ts` (flag callbacks, orientation, movable gating, chat filtering, presence patching, clock-difference pairing, notify).

## What Changes

- Add a player abstraction in a new `client/two-board/common/players.ts`:
  - `TwoBoardPlayer` — one object per seat holding all player-specific info: `username`, `title`, `rating`, `color` (white/black), `boardName` (a/b).
  - `TwoBoardPlayers` — owns the list of exactly 4 `TwoBoardPlayer` objects (wA, bA, wB, bB) built from `PyChessModel`, plus accessor methods for every use case found in the code:
    - positional: `byBoardAndColor(board, color)`
    - viewer-relative: `me(board)`, `myColor(board)`, `isSpectator()`, `myTeam(): Team` (the old `whichTeamAmI()` label is retired — it's just `myTeam().teamNumber`)
    - relation-based, from any player: `partnerOf(p)` (other board, other color), `opponentOf(p)` (same board, other color), `opponentsPartnerOf(p)` (other board, same color — the clock-difference counterpart)
    - team-based: `teams: [Team, Team]` — a `Team` abstraction replacing the `teamFirst`/`teamSecond` string tuples: each `Team` holds its 2 `TwoBoardPlayer`s, a `teamNumber` string label ('1'/'2'), and a `name()` method returning the usernames joined with '+' (adoption of `name()` at the render sites is deferred: they keep their current concatenation with a TODO for now)
- `TwoBoardController` (base) constructs and exposes `players: TwoBoardPlayers` (pure data, no DOM), so both round and analysis share one instance.
- Refactor `PlayersState` to build on it — and rename it to `SeatsState` (file `playersState.ts` → `seatsState.ts`) to reflect its new role: delete the 12 scalar fields and the `myColor`/`partnerColor`/`teamFirst`/`teamSecond` members, deriving everything (screen positions, clock mapping, rendering inputs) from `TwoBoardPlayers`. `SeatsState` keeps only the round-only concerns, organized as 4 `RoundSeat` objects — a class constructed per seat with its DOM element ids, owning that player's clock, clock-difference indicator, rendered player bar (retained vnode) and last server clock time. `SeatsState` keeps NO parallel per-board arrays (`clocks`/`clocksB`, `clocktimes`/`clocktimesB`, `differences`/`differencesB`, `colors`/`colorsB`, `players`/`playersB` are all gone); its surface is `seats` plus `seatOf`/`seatAt`/`seatsOn`/`getClock`/`setConnecting`/`setPresence`/`updateClocks`, so round code goes from any relation accessor straight to that player's seat.
- `AnalysisControllerBughouse` drops its duplicated `teamFirst`/`teamSecond` (and its barely-used `wplayer`/`bplayer` fields if nothing needs them) in favor of the base's `players`.
- `movelist.ts` reads teams from the base's `players` — deleting the `teamsOf()` `instanceof`+cast bridge (this resolves one of the deferred review findings as a side effect); its team-name concatenations stay as-is with TODOs pointing at `Team.name()`.
- Migrate identity-related call sites in `roundCtrl.ts` (spectator/flag/orientation/movable/premove/myMove checks, chat team filter, presence handlers, notify opponent lookup) to the expressive accessors. Clock logic itself stays in `SeatsState`.
- **Behavior-preserving**: no user-visible behavior change; known quirks (e.g. `notifyMsg`'s opponent lookup assuming board A) are preserved as-is and documented as follow-ups, not fixed here. Accepted micro-divergences: (1) player bars render each seat's own title/rating instead of a username-keyed map lookup — differs only when the same username occupies two seats with different per-board ratings; (2) `sendMove` pauses/starts clocks by seat color instead of the legacy orientation-index arithmetic, which the code itself flagged as wrong for flipped boards — correct now even after flipping.
- Add jest unit tests for `TwoBoardPlayers` (pure logic, no DOM — first directly unit-testable piece of bughouse player logic).

## Capabilities

### New Capabilities

(none — this extends the existing capability)

### Modified Capabilities

- `bughouse-client-controllers`: adds a requirement for the single player-info abstraction; updates the base-class requirement (base also owns `players`) and the consumers requirement (teams accessed via the base, no `instanceof`/cast bridge).

## Impact

- **Code**: new `client/two-board/common/players.ts` + tests; refactors in `playersState.ts` (renamed to `seatsState.ts`), `round/roundCtrl.ts`, `analysis/analysisCtrl.ts`, `common/movelist.ts`, `twoBoardCtrl.ts`. `common/gameInfo.ts`'s `playerInfoData` remains the model-field parser (used by the new class); `client/chat.ts` unaffected (only an `instanceof` check).
- **Server/API**: none.
- **Verification**: `yarn typecheck`, jest (incl. new unit tests), lint/format, `yarn dev` build, and the round+analysis Playwright parity probes (byte-identical DOM expected).
