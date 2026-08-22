> **SHELVED — 2026-08-16.** Not started; no code written. Parked deliberately, to be picked up
> when the focus is on backend work rather than the round page's layout.
>
> **Do not archive it to get it out of the way.** Archiving applies the spec deltas to
> `openspec/specs/`, which would record this behaviour as existing when nothing has been built. It
> stays an active change on purpose: that is what keeps it visible in `openspec list`.
>
> **State of the evidence, so none of it has to be re-derived:** the cause is identified and the
> diagnosis is written up in full below, but the reproduction is **one failing run and one passing
> run**, not a repeated result. The failing run left four rematch offers registered and no game; the
> passing run, after reloading all four windows so they shared one game instance, created game
> `gE6yCalr` immediately. What makes the diagnosis solid is not the count but that the mechanism was
> read from the code first and then matched the log timeline exactly — see the table in the Why.
>
> **First thing to do on picking it up:** force the failure deliberately rather than waiting for it
> (tasks 3.1–3.3). Everything before that is reading, and it is already done.
>
> **Costs to plan for:** this is server-side, so the Python gates apply and `docker compose build
> server` recreates the container, wiping every in-memory `Test-xxxx` user and killing any live
> game. Batch the edits and rebuild once, with no game running.

# Tasks

The first server-side change in this run of work, so the Python gates apply throughout:
`uv run ruff format .`, `uv run ruff check .`, `uv run pyright`, and the unittest suite.

Note that a `docker compose build server` recreates the container and **wipes every in-memory
`Test-xxxx` user, killing any live game** — server code is not mounted the way `static/` is. Batch
the server edits and rebuild once, when no game is live.

## 1. Do not evict a finished game while anyone is watching it

- [ ] 1.1 Apply the same active-player and active-spectator test the immediate path already uses in `maybe_remove_finished_game_from_cache_now` to the scheduled `remove_from_cache`
- [ ] 1.2 Re-arm rather than abandon: a game deferred because someone is watching must be reconsidered later, or it is never released
- [ ] 1.3 Follow the shape the tournament path already uses for this — `TOURNAMENT_ACTIVE_RECHECK_INTERVAL` exists for the same problem
- [ ] 1.4 Confirm an empty room still releases the game, so the cache is still bounded

## 2. One instance when two clients arrive at once

- [ ] 2.1 Close the check-then-await-then-cache window in `load_game_bug` / `load_game_bug_from_doc` — re-check after the database read before assigning, or lock per game id
- [ ] 2.2 The loser of the race discards its parse and returns the cached instance; two callers must not each keep their own object
- [ ] 2.3 Confirm with simultaneous connects that only one parse is logged — four simultaneous reloads produced two parses while reproducing

## 3. Verify against the original conditions

Reproducing needs the split deliberately created, not waited for.

- [ ] 3.1 Start a game, finish it, and force the eviction rather than waiting out the keep time
- [ ] 3.2 Reload one window only, so it would previously have loaded a second instance
- [ ] 3.3 Confirm all four clients resolve to one instance — no `load_game_bug parse START` for the reload while others are attached
- [ ] 3.4 Click REMATCH in all four windows and confirm a new game is created
- [ ] 3.5 Confirm the reverse order too: three offers, then a reload, then the fourth offer
- [ ] 3.6 Confirm the offers each player sees still appear as they do now

## 4. Decide the scope beyond bughouse

- [ ] 4.1 `server/utils.py` has the same load shape for ordinary games and `handle_rematch` accumulates offers the same way — decide whether they are fixed here or follow
- [ ] 4.2 If they follow, say so explicitly rather than leaving two-player rematches quietly exposed to the same split

## 5. Gates

- [ ] 5.1 `uv run ruff format .`
- [ ] 5.2 `uv run ruff check .`
- [ ] 5.3 `uv run pyright`
- [ ] 5.4 `env PYTHONPATH=server uv run python -m unittest discover -s tests`
- [ ] 5.5 `yarn typecheck` and `yarn test` if any client file is touched
- [ ] 5.6 `docker compose build server && docker compose up -d server`, with no live game

## 6. Decisions to record before archiving

- [ ] 6.1 Whether the per-message game resolution is done here or left as a follow-up with its own evidence
- [ ] 6.2 Whether holding a finished game while a tab is left open needs an upper bound
- [ ] 6.3 Whether eviction can be made safe for holders instead of deferred

## 7. Still carried — a live game that survives long enough

Four changes running now. Each needs a game that starts, is played, and ends while the pages stay
open, and each attempt so far has been lost to a resign, an abandon, or the page work itself.

- [ ] 7.1 Click probes after a board switch — the boards move between containers and chessgroundx memoises hit-test bounds
- [ ] 7.2 `#offer-dialog` holding a real draw offer
- [ ] 7.3 The game-over transition watched as it happens: presets vanishing, buttons appearing, whether the tab bar moves
- [ ] 7.4 Board switch with the furniture scaled, confirming it follows the role and not the board
