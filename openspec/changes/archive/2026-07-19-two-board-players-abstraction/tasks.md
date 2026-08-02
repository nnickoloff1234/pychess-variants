# Tasks: two-board-players-abstraction

## 1. The abstraction

- [x] 1.1 Create `client/two-board/common/players.ts`: `TwoBoardPlayer` (username, title, rating, color, boardName) and `TwoBoardPlayers` built from `PyChessModel` + viewer username via `playerInfoData`, seats ordered wA, bA, wB, bB
- [x] 1.2 Implement `Team` (2 players, `teamNumber: '1' | '2'`, `name()` = usernames joined with '+') and accessors: `byBoardAndColor`, `me(board)`, `myColor(board)`, `isSpectator()`, `myTeam(): Team`, `partnerOf`, `opponentOf`, `opponentsPartnerOf`, `teams: [Team, Team]` (no `whichTeamAmI()` — `myTeam().teamNumber` covers it, spectator-is-team-2 quirk preserved)
- [x] 1.3 Add `tests/twoBoardPlayers.test.ts`: seat construction from model fields, relation accessors (partner/opponent/opponent's partner), `Team` composition (wA+bB vs bA+wB) incl. `teamNumber` and `name()`, viewer-relative accessors for player/spectator/simul (same username on both boards), and username equivalence with legacy `playerInfoData`-built `teamFirst`/`teamSecond` tuples

## 2. Wire into the base class

- [x] 2.1 `twoBoardCtrl.ts`: construct `this.players` in the base constructor (before boards; pure data); confirm no new import cycle (players.ts imports no controller modules)

## 3. Refactor PlayersState into SeatsState (round presentation state)

- [x] 3.1 Replace the 12 identity scalars and `myColor`/`partnerColor`/`teamFirst`/`teamSecond` members with reads from the shared `players` instance; screen positions derived per seat (0 top / 1 bottom) from the legacy top-color formulas — no parallel arrays remain
- [x] 3.2 Introduce `RoundSeat` class (player, position, clock, difference, vplayer, clocktime — DOM ids as constructor params, all initialization inside) with `seatOf`/`seatAt`/`seatsOn` lookups; rebuild `getClock`, `updateClocks`, tick/difference pairing (`seatOf(players.opponentsPartnerOf(p))`), `setConnecting` and `setPresence` on seats; delete all parallel per-board properties and `whichTeamAmI`
- [x] 3.3 Rename the class to `SeatsState` and `git mv playersState.ts seatsState.ts`; rename roundCtrl's `playersState` member to `seatsState` and update all references/imports

## 4. Migrate call sites

- [x] 4.1 `roundCtrl.ts`: spectator check, flag callbacks, orientation, movable/premove/myMove gating, `goPly` movable restore → `this.players` accessors (clock reads stay on the renamed `seatsState`)
- [x] 4.2 `roundCtrl.ts`: chat team filter → `players.myTeam()` member usernames; `gameEndSoundBughouse(msg.result, whichTeamAmI())` → `gameEndSoundBughouse(msg.result, players.myTeam().teamNumber)`; keep `notifyMsg`'s existing (board-A-assuming) lookup behavior-identical, with a comment marking the quirk
- [x] 4.3 `roundCtrl.ts`: presence handlers call `seatsState.setPresence`; flag registration/game-end pause/sendMove clock ops seat-based; console-log-only `colors` params removed from the two update methods
- [x] 4.4 `analysisCtrl.ts`: drop `teamFirst`/`teamSecond` (use base `players`); remove `wplayer`/`bplayer` fields if grep confirms nothing reads them
- [x] 4.5 `movelist.ts`: replace `teamsOf()` bridge (function, `instanceof`, cast) with `ctrl.players.teams` reads at the three call sites; keep the existing username-concatenation rendering, adding `// todo: consider Team.name()` markers (adoption deferred)

## 5. Verify (zero behavior change)

- [x] 5.1 `yarn typecheck`, `npx oxlint --deny-warnings`, `npx oxfmt --check`, jest (including new unit tests) all green
- [x] 5.2 `yarn dev` build clean; round + analysis Playwright parity probes byte-identical to pre-change dump; scroll probe still healthy
- [x] 5.3 Module-cycle audit unchanged (no new edges into controller modules from `players.ts`)
