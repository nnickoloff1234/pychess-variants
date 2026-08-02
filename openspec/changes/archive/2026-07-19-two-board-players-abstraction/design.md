# Design: TwoBoardPlayers abstraction

## Context

Catalog of player-identity access patterns found in the code (the use cases the abstraction must cover):

- `playersState.ts`: 12 parallel scalars from the model; `myColor`/`partnerColor` maps built by comparing `username` against each seat; screen-position arrays `colors`/`colorsB` (top/bottom per board) and `players`/`playersB` (usernames by screen position); local `ratings`/`titles` maps rebuilt for rendering; `teamFirst`/`teamSecond` via `playerInfoData`; `whichTeamAmI()`; clock-difference pairing = "same color, other board" (i.e. the opponent's partner).
- `roundCtrl.ts`: spectator check (`myColor` undefined on both boards); flag callbacks and premove/`myMove` gating (`myColor.get(board) === turnColor/moveColor`); board orientation (`myColor`/`partnerColor` per board); movable color; chat filter (`whichTeamAmI()` → team tuple → usernames `[0][0]`/`[1][0]`); presence handlers (`msg.username === players[0]…playersB[1]` → patch `#player{0,1}{a,b}`); `notifyMsg` opponent lookup (`username === wplayer ? bplayer : wplayer` — quirk: assumes viewer plays board A).
- `analysisCtrl.ts`: duplicates `teamFirst`/`teamSecond` construction verbatim; `wplayer`/`bplayer` fields assigned but PGN headers read `this.model[...]` directly (fields likely removable).
- `movelist.ts`: `teamsOf(ctrl)` — `instanceof RoundControllerBughouse ? ctrl.playersState : ctrl as AnalysisControllerBughouse` — reads only `teamFirst`/`teamSecond`; 3 call sites, usernames via `[i][0]`.
- Bughouse relations, for reference (player p on board X with color C): **partner** = other board, other color (same team); **opponent** = same board, other color; **opponent's partner** = other board, same color. Teams: team 1 = wA+bB, team 2 = bA+wB. A viewer may occupy seats on both boards (simul-style), which is why viewer-relative accessors are per-board.

## Goals / Non-Goals

**Goals:**
- One `TwoBoardPlayer` object per seat; one `TwoBoardPlayers` container with accessors covering every pattern above; round-only clock/rendering state attached per seat via `RoundSeat` wrappers in `SeatsState`.
- Constructed from `PyChessModel` + viewer username only — pure data, no DOM, no controller reference — so the base `TwoBoardController` owns it and analysis reuses it.
- `PlayersState` sheds all identity state and is renamed `SeatsState` (`playersState.ts` → `seatsState.ts` via `git mv`), keeping clocks/differences/rendering; `movelist.ts` loses the `teamsOf` cast.
- Unit tests for the pure logic.

**Non-Goals:**
- No behavior fixes: `notifyMsg`'s board-A assumption, chat-filter edge cases, and all rendering stay bit-identical; quirks are documented as follow-ups.
- No changes to clock logic, sockets, server, or `gameInfo.ts` rendering helpers.
- Not touching the other deferred review findings except `teamsOf` (which this design eliminates naturally).

## Decisions

1. **Plain class, model-driven construction.** `TwoBoardPlayers` builds its 4 `TwoBoardPlayer`s via `playerInfoData(model, color, board)` (the existing parser in `common/gameInfo.ts`), ordered wA, bA, wB, bB. `players.ts` imports only `gameInfo.ts` (parser), `types.ts`, and chessgroundx types — no controller imports, so no new cycle risk; the runtime cycle situation is unchanged.

2. **Viewer-aware container.** The viewer's username is a constructor argument; viewer-relative accessors (`me(board)`, `myColor(board)`, `isSpectator()`, `myTeam(): Team`) live on the container; `whichTeamAmI()` is retired — its two call sites use `myTeam()` (`teamNumber` for the sound API, member usernames for the chat filter), preserving the spectator-is-team-2 quirk inside `myTeam()`'s selection. Relation accessors (`partnerOf`, `opponentOf`, `opponentsPartnerOf`) are pure board/color arithmetic on any `TwoBoardPlayer`, so non-viewer-relative use cases (clock-difference pairing) use the same vocabulary.

3. **Base class owns the instance.** `TwoBoardController`'s constructor creates `this.players = new TwoBoardPlayers(model, this.username)` (before board construction; it has no DOM dependencies). Round's `SeatsState` receives/uses the same instance — no double construction, one source of truth.

4. **`PlayersState` becomes `SeatsState`: round-only presentation state built from `RoundSeat` wrappers.** Renamed because after the refactor the class no longer holds player identity — it holds the seats' round-page trappings. Deleted: the 12 scalars, `myColor`, `partnerColor`, `teamFirst`, `teamSecond`. New shape: `RoundSeat` is a class constructed per seat with its DOM element ids (`clock{pos}{board}`, `difference{pos}{board}`, `player{pos}{board}`), initializing and owning that seat's Clock, ClockDifference, rendered player bar (retained vnode, from the seat's own title/rating — dissolving the username-keyed ratings/titles maps) and `clocktime` (last server-recorded value, replacing the per-board `clocktimes` pairs). Seats know their screen `position` (0 top / 1 bottom), derived from the legacy top-color formulas, which replaces the `colors`/`players` arrays; presence icons are patched via `setPresence(username, online)` iterating seats; `seatOf(player)`, `seatAt(board, color)`, `seatsOn(board)` and `getClock(board, color)` are trivial lookups; clock-difference pairing reads as `seatOf(players.opponentsPartnerOf(p)).clock`; `updateClocks` and roundCtrl's clock operations (flag registration, game-end pause, sendMove pause/start) are seat-based; the console-log-only `colors` parameters of roundCtrl's two update methods are removed. `updateClocks`/`setConnecting` keep their signatures. External callers that read identity from the old `playersState` member (roundCtrl's ~20 sites, chat filter) migrate to `this.players.*`; callers that read clocks use the renamed `this.seatsState`. `whichTeamAmI` is retired in favor of `myTeam()` (roundCtrl's two call sites migrate to it).

5. **Teams as a `Team` abstraction.** `class Team` (in `players.ts`) holds `players: [TwoBoardPlayer, TwoBoardPlayer]`, `teamNumber: string` ('1' or '2'), and `name(): string` returning `players[0].username + '+' + players[1].username`; `teamNumber` is typed as the literal union `'1' | '2'` so it satisfies `gameEndSoundBughouse`'s parameter directly. `players.teams: [Team, Team]` replaces the string tuples (team 1 = wA+bB, team 2 = bA+wB); `myTeam()` returns the viewer's `Team`. `movelist.ts`'s three `teams.teamFirst[0][0]`-style reads become `ctrl.players.teams[i].players[j].username`; the render-site concatenations (including the `displayUsername` variants) are NOT switched to `name()` yet — each gets a `// todo: consider Team.name()` marker, deferred deliberately because two of the three sites run usernames through `displayUsername` first and unifying that is a rendering decision for a later change. `teamsOf`, its `instanceof`, and the `as AnalysisControllerBughouse` cast are deleted. `analysisCtrl` drops its `teamFirst`/`teamSecond` fields; if `wplayer`/`bplayer` prove unread (PGN uses `this.model` directly), they go too.

6. **Migration is mechanical per call site, not a rewrite.** Each identity read maps 1:1: `myColor.get(b)` → `players.myColor(b)`; `myColor.get(a)===undefined && …` → `players.isSpectator()`; presence checks `msg.username === players[0]` → `seatsState.setPresence(msg.username, online)`, which patches each matching seat's position-indexed DOM id.

## Risks / Trade-offs

- [Subtle behavior drift in derived values (colors/players arrays, whichTeamAmI) during the rewrite] → keep the derivation formulas verbatim, expressed over `TwoBoardPlayer` fields; the round+analysis parity probes must come back byte-identical, and new unit tests pin the accessor semantics (including the simul case where one username holds seats on both boards).
- [`teamsOf` deletion changes movelist rendering inputs] → `teams[i][j].username` must equal the old `team*[j][0]` — unit-test the equivalence directly against `playerInfoData` outputs.
- [Import-cycle regression] → `players.ts` imports no controller modules; `twoBoardCtrl.ts` gains only the `players.ts` edge (`twoBoardCtrl → players → gameInfo` — acyclic); verify with the module audit used in the previous changes.
- [Churn in roundCtrl masking an accidental logic flip (e.g. `partnerColor` vs `myColor` swap in orientation code)] → migrate call sites one concern at a time with the diff reviewed against the catalog above; parity probes gate the result.

## Migration Plan

Single PR/commit. Order: `players.ts` + unit tests → base class wiring → `SeatsState` rename + internals → roundCtrl call sites → analysisCtrl + movelist → gates (typecheck, jest, lint/format, build, parity probes). Rollback = revert.

## Open Questions

- None blocking. Follow-up recorded, not done here: fix `notifyMsg`'s board-A opponent assumption using `opponentOf(me)`. (`updateDifference` simplification via `seatOf(opponentsPartnerOf(p))` is now in scope through the `RoundSeat` wrapper.)
