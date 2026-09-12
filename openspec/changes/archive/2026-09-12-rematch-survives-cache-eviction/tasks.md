# Tasks

## 0. Status

**DONE 2026-09-12**, shelved since 2026-08-16. Smaller than it was written, because two of its three
parts had been closed by other work in the meantime — the shelf note said to force the failure first,
and reading the current code first is what shrank it.

The defect was verified before and after, on the harness, with the log as the oracle:

```
BEFORE (container built without the fix)
  11:52:29  {'type': 'flag'}                     the game ends on time
  11:52:29  four distinct websockets each ask for the board  (...781584, ...904464,
                                                              ...431184, ...439504)
  11:57:29  Removed lCClCH9c OK                  evicted 300s later, all four still attached

AFTER (container rebuilt from this branch)
  15:09:24  draw agreed on OgbplYPO, all four attached
  15:15:09  +345s, past the 300s keep time:  Removed OgbplYPO OK  -> 0 occurrences
  15:16:39  the four leave for the rematch:  Removed OgbplYPO OK  <- released at once
  15:16:40  new game aCXzknj6, all four connected
```

## 1. Do not evict a finished game while anyone is watching it

- [x] 1.1 The active-player and active-spectator test now lives in `PychessGlobalAppState.game_is_held()`,
      and BOTH eviction paths ask it. Extracted rather than copied on purpose: the immediate path
      already refused to evict under an audience and the scheduled path did not, and that difference
      is the whole defect. A copy could drift again; one function cannot.

- [x] 1.2 Re-armed rather than abandoned. `remove_from_cache` sleeps out the keep time and then loops
      on `game.id in self.games and self.game_is_held(game)`, re-asking on an interval. The `game.id
      in self.games` half matters as much as the predicate: without it a deferred task could outlive
      the entry it was armed for and sit holding a reference to it.

- [x] 1.3 `GAME_ACTIVE_RECHECK_INTERVAL = 60`, beside `TOURNAMENT_ACTIVE_RECHECK_INTERVAL`, which is
      the shape this borrows.

- [x] 1.4 An empty room still releases the game, twice observed. `Removed lCClCH9c OK` at 15:07:42
      once the windows had gone to the lobby, and `Removed OgbplYPO OK` at 15:16:39 the instant the
      four left for the rematch.

      AND THE PROMPT RELEASE IS NOT THIS LOOP — worth recording so nobody credits the wrong code.
      `user.py:440` and `wsr.py:356` call the immediate guarded path when a socket goes, so an
      audience leaving cleanly releases the game at once. The loop is the backstop for the case that
      path does not cover: the scheduled deadline arriving while someone is still attached.

## 2. One instance when two clients arrive at once

- [x] 2.1 ALREADY CLOSED, UPSTREAM, and not by us. `load_game_from_doc` shares one construction task
      per game id through `app_state.game_load_tasks` and `asyncio.shield`, then publishes with
      `app_state.games.setdefault` — "a game can never acquire two independent in-process move
      locks", as its own docstring puts it. Bughouse rides that path: `_load_game_from_doc` delegates
      a bughouse document to `load_game_bug_from_doc` INSIDE the shared task. It arrived in the
      66-commit upstream merge earlier today.

- [x] 2.2 The loser of the race returns the cached instance — `setdefault` is what makes that true,
      and every caller uses its return value rather than its own parse.

- [x] 2.3 THE ONE UNGUARDED ENTRY POINT WAS DEAD CODE, AND IS GONE. `load_game_bug()` in
      `bug/utils_bug.py` did its own `find_one` and parse with no task and no lock — and had **no
      callers anywhere in the repo**. Removed rather than guarded: a fixed copy of a function nobody
      calls is a trap with a better disguise.

      WHAT WAS MEASURED, AND WHAT IT DOES AND DOES NOT SHOW. Four concurrent `GET /OgbplYPO` against
      the evicted finished game produced TWO parses, not one — which looks like the race and is not.
      `round_view.py:28` loads with `cache_finished=False`: a page render of a finished game
      deliberately does not pin it in the cache, so consecutive renders parse by design and discard.
      What the number does show is the shared task collapsing overlapping loads — four requests, two
      parses, the pairs that overlapped merged.

      NOT STAGED: four genuinely simultaneous SOCKET connects. The browser tooling drives one window
      at a time, so four sequential navigations would prove convergence rather than the race, and the
      race is the part upstream's task already guarantees.

## 3. Verify against the original conditions

- [x] 3.1 The "before" did not have to be forced — it was already in the running container's log from
      earlier the same day, dated and unambiguous (see §0). One eviction line in six hours, 300s
      after a flag, with four sockets on the game in the same second as the flag.

- [x] 3.2 / 3.3 Overtaken by the fix rather than performed. Reloading one window to make it parse a
      second instance requires the eviction to have happened; with the entry held there is nothing to
      re-parse, which is the point. The `load_game_bug parse START` line stayed absent for the held
      game throughout the 345s wait.

- [x] 3.4 REMATCH in all four windows created game `aCXzknj6`, and all four connected to it. This is
      the user-visible complaint the change exists for, and it is the one thing that could not be
      made to happen when the instances were split.

- [x] 3.5 Reverse order (three offers, a reload, then the fourth) NOT STAGED, and no longer a distinct
      case: a reload re-resolves through the cache, and the entry cannot be gone while anyone is
      attached. The ordering only mattered because eviction could happen underneath it.

- [x] 3.6 The offers still read as before. p1's draw control had already turned into "Accept draw"
      when p4 offered, and each rematch press was accepted with the others visible, the fourth
      creating the game.

## 4. Decide the scope beyond bughouse

- [x] 4.1 IT IS NOT BUGHOUSE-SPECIFIC, AND THE FIX IS NOT EITHER. `wsr.py:865` does
      `game.rematch_offers.add(user.username)` and `:835`/`:889` test the opponent's presence in that
      set — the same accumulate-on-the-object shape as bughouse. Both halves of the cause are shared:
      `round_socket_handler` resolves the game once per socket for every variant, and
      `remove_from_cache` is the one scheduler for every game. The eviction guard therefore covers
      ordinary games as well, which answers this change's open question with "it already does".

- [x] 4.2 Said explicitly here rather than left implied. A two-player rematch was exposed to exactly
      the same split; it simply needed two clients to land on opposite sides of one eviction instead
      of four, and is correspondingly rarer.

## 5. Gates

- [x] 5.1 `ruff format` — 823 files unchanged.
- [x] 5.2 `ruff check` — all checks passed.
- [x] 5.3 `pyrefly check` — 0 errors, 26 suppressed. (The task said `pyright`; the project moved to
      pyrefly in `a3431aac6`.)
- [x] 5.4 `unittest discover -s tests` — Ran 1253 tests, OK (skipped=1). Plus CI's separate
      `pytest tests/test_simul.py` — 40 passed.
- [x] 5.5 No client file touched by this change, so the frontend gates were not required. Run anyway
      earlier in the session and green.
- [x] 5.6 Rebuilt and recreated the server container **from this branch** — which is new: the harness
      image had always been built from the other checkout, and a server change cannot be verified
      through a `static/` mount. `PYCHESS_REPO` already exists for this; the compose project name has
      to be pinned so the same mongo volume is reused.

## 6. Decisions recorded before archiving

- [x] 6.1 PER-MESSAGE RESOLUTION IS LEFT AS A FOLLOW-UP, as the design recommended. With the entry
      held under an audience the practical path to a split is closed; what remains is theoretical —
      an eviction racing the last player leaving and returning. Making the class impossible means
      threading the game id rather than the object through `round_socket_handler` and everything it
      calls, and doing it here would have obscured which change fixed the rematch.

- [x] 6.2 NO UPPER BOUND BEYOND THE AUDIENCE. A tab left open on a finished game holds one cache
      entry, and that is accepted: it is bounded by the tab, the immediate path releases it the moment
      the socket closes, and `is_user_active_in_game` is checked against a socket set the server
      itself prunes on close. The known weakness is that the predicate tests membership rather than
      liveness — its own `todo` says so — so a socket that dies without its close handler running
      would hold the entry until aiohttp's receive timeout reaps it. Self-healing, and not worth a
      liveness check here.

- [x] 6.3 EVICTION IS NOT MADE SAFE FOR HOLDERS. Releasing the cache entry while leaving attached
      sockets working against the instance they hold is the per-message question in another guise —
      it only works if nothing else can resolve the same game to a different object. Deferring is the
      cheaper half of the same guarantee.

## 7. Moved out, not done

The four live-game UI observations that were parked here have nothing to do with the cache, and are
carried forward rather than archived with a change that did not do them — see
`live-game-ui-observations`.
