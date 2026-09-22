## 0. Status

**Opened 2026-08-29 as postponed. Half done 2026-09-20**: the placeholder has a real home and the
`uleft` area is gone from every template on both pages. The handler is still not wired — that is
section 3.1, deliberately left for later.

## 1. What was measured

- [x] 1.1 Analysis page: `<under-left id="spectators"></under-left>` — zero children,
      `display: none`, 0x0, and the page constructs no websocket.
- [x] 1.2 Two-board round page: the socket HAS `case 'spectators':` and its body is commented out —
      `// this.onMsgSpectators(msg);` — under a note saying the block was copied from `gameCtrl.ts`.
- [x] 1.3 Single-board pages render it correctly: `gameCtrl.onMsgSpectators` patches `#spectators`,
      and `site.css`'s `under-left` places it as a centred wrapping row in the `uleft` area.
- [x] 1.4 **There is nothing to uncomment into.** `onMsgSpectators` is `private` on
      `GameController`, and the two-board controllers do not extend that class —
      `RoundControllerBughouse extends TwoBoardController` (`twoBoardCtrl.ts:19`), which is its own
      abstract class. The method was never inherited, so 3.1 is a fresh implementation in the
      two-board layer, not a one-line uncomment. It is also free to name its own element.
- [x] 1.5 **The server does send it for bughouse games.** `wsr.py:345`, `:459` and `:1205` call
      `round_broadcast(game, game.spectator_list, full=True)`, and `bug/game_bug.py:800` builds the
      message. The data arrives at the round page and is dropped on the floor.
- [x] 1.6 What the empty element cost, before it was moved: a `uleft` row in tall landscape and in
      portrait on the analysis page, a row of `main.round.bug` on the round page, and a
      `display: none` in each mode that could not afford the row. On the analysis page, where it
      was a child of the app, a template that stopped naming `uleft` auto-placed it past the last
      explicit column and minted implicit ones — measured at 997x750: five columns where three
      were declared, four `column-gap`s at 15px instead of two, and the extra 30px off the only
      track that yields, leaving the tools 6.55px against the 34.3px they are promised.

## 2. Decide

- [x] 2.1 Was the handler commented out deliberately? Moot — see 1.4. There is no inherited handler
      to call, so whether the comment was deliberate does not change what has to be written.
- [x] 2.2 Does the analysis page want spectators at all? It cannot have them: it opens no websocket
      (`analysisSeatView.ts:98` says so in as many words). It keeps the placeholder for parity, in
      the same tab as the round page's, costing no template anything. If it ever gains a socket —
      `analysis-page-presence-websocket` — the element is already where it belongs.
- [x] 2.3 Where does the element live? **Inside the Info tab's panel**, on both pages, as
      `spectators#spectators`. Not a grid area anywhere: a tab panel lays out its own children, so
      no template names it and nothing can auto-place it. `under-left` was a position in the
      single-board page's shell and meant nothing here.

## 3. Do

- [x] 3.1 **Done 2026-09-22.** `SpectatorsView` (`client/two-board/common/spectatorsView.ts`) owns
      the node and patches it, as `AnalysisClockView` does; `socket/sockets.ts` calls
      `ctrl.onMsgSpectators` and `roundCtrl` hands the payload on. The parsing left `gameCtrl` for
      `client/spectators.ts` and both families read it there — the two consumers the task asked for.
      It gained two things the task did not ask for, both recorded in the proposal: the count on the
      Info tab, and the panel arrangement that made the list readable.

- [x] 3.5 **A DEPARTURE WAS NEVER ANNOUNCED, AND NOT ONLY FOR BUGHOUSE.** Found while verifying 4.1
      and fixed in `server/wsr.py`. `finally_logic` awaited `round_broadcast(game,
      game.spectator_list, full=True)` inside the handler task of the connection that had just
      closed, and aiohttp CANCELS that task on disconnect: the server dropped the spectator from
      `game.spectators` correctly and then died before writing a frame. Measured with two watchers
      opening and closing a game: the set went `{One, Two}` -> `{Two}` -> `{}`, `round_broadcast`
      was entered each time with three then two live sockets, every call ended in `CancelledError`,
      and CDP recorded no frame at any page. Joins worked throughout because they are broadcast
      from a live handler. The fix hands it to `user.create_background_task`, which is not a child
      of the dying task. **This is the shared disconnect path for every game type** — the
      single-board pages have never announced a departure either — so it is a candidate to go
      upstream on its own rather than staying in the fork.
- [x] 3.2 Analysis page: placeholder kept, in the Info tab, per 2.2. `under-left#spectators` is
      gone from `analysis.ts` and from `round.ts`.
- [x] 3.3 `uleft` removed from every template together: the analysis page's portrait row
      (`layout/portrait.css`) and tall-landscape row (`layout/landscape.css`), the placement rule
      `.analysis-app.bug > under-left` (`layout/shared.css`), the round page's shell row
      `'uleft uboard'` (`page-shell.css` — `uboard` went with it, nothing has ever filled it), and
      the two `display: none` rules that hid it (`components/stacks.css`).
- [x] 3.4 **Decided: left in place, deliberately.** The two bare `under-left` rules in
      `components/stacks.css` match nothing on either two-board page, and their only remaining
      effect is on the SINGLE-board pages, which they were never written for. Removing them is a
      change to those pages and wants testing there — the same bargain every entry in
      `override-commons.css` records. Noted rather than done, so the next reader finds a decision
      instead of a loose end.

## 4. Verify

- [x] 4.1 **A watched game shows its spectators, and stops showing them.** Verified twice.

      Headless, with two real watchers opening and closing the game — every step driven by the
      server's own messages, nothing injected:

      | watchers | list | Info tab |
      |---|---|---|
      | 0 | `Spectators:` | `Info` |
      | 1 | `Spectators: WatcherOne` | `Info (1)` |
      | 2 | `Spectators: WatcherOne, WatcherTwo` | `Info (2)` |
      | one leaves | `Spectators: WatcherTwo` | `Info (1)` |
      | both leave | `Spectators:` | `Info` |

      Then in the four-window harness on the live docker server, confirmed by Nikolay.

      The panel's geometry at p1's 1914x825: `.info-panel` is `column nowrap`, the game info at
      y=60 and the list at y=265.3, both 382.8px — the panel's full width — and a team row breaks
      into two lines of one member each, neither truncated.

- [x] 4.4 Gates for a change that touches the server as well as the client: `ruff format` (1137
      files unchanged), `ruff check`, `pyrefly` (0 errors), `pytest tests/test_simul.py` (40
      passed), `unittest discover` (1282 tests, OK); lint, typecheck, md and jest on the frontend.
      Layout matrix 286 rows against the run before: 0 broken, 0 changed.
- [x] 4.2 Frontend gates: lint, typecheck, md, jest — all pass.
- [x] 4.3 Layout matrix survey, 264 rows against the 2026-09-20 baseline: 85 failing before and
      after, 0 went clean, 0 newly failing. The only geometry that moved is the `uleft` area
      disappearing from the six analysis portrait rows, which is the change. One row,
      `D1-C1-minxmin`, reports its existing stale-arrangement failure with 17.33 and 17.22 swapped
      between `presetGap` and `presetGapAfforded` — the same two numbers either way, geometry
      identical, which is that check's known timing race and not this change.
