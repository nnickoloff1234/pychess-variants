## Context

Three pieces of code combine into the defect.

**The socket resolves the game once.** `round_socket_handler` (`server/wsr.py:159`) does
`game = await load_game(app_state, gameId)` before the message loop and closes over that reference
for the connection's life.

**The scheduled eviction does not ask whether anyone is there.**

```python
async def remove_from_cache(self, game):
    await asyncio.sleep(LOCALHOST_CACHE_KEEP_TIME if URI == LOCALHOST else GAME_KEEP_TIME)
    await self._evict_game_from_cache(game)
```

Beside it sits `maybe_remove_finished_game_from_cache_now`, which refuses while
`player.is_user_active_in_game(game.id)` for any player or spectator. The rule already exists; the
scheduled path simply does not use it.

**Loading is check-then-await-then-cache.** `load_game_bug` tests `game_id in app_state.games`,
awaits the database, and only then assigns `app_state.games[game_id] = game`. Two connects arriving
together can both miss.

The rematch handler itself is fine. `handle_rematch_bughouse` accumulates usernames in
`game.rematch_offers` and creates the seek when every other player is present in it. It was
verified working: once all four sockets shared one instance, the same four clicks produced game
`gE6yCalr`.

## Goals / Non-Goals

**Goals:**

- One instance per game while anyone is connected.
- A finished game that still has an audience is not evicted.
- Concurrent connects do not produce two instances.
- Rematch converges regardless of who reloaded when.

**Non-Goals:**

- Changing what a rematch does once agreement is reached. The seek creation and the join are
  correct.
- The redirect origin. `model.home` comes from `URI`, which defaults to `http://127.0.0.1:8080`
  while the harness browses `localhost:8080`; that is configuration, not code, and in production
  the two match.
- Reworking the cache's lifetime policy in general. The keep time is not the problem; evicting
  while someone is watching is.

## Decisions

### 1. Fix the eviction first, and treat it as the primary fix

Adding the active check to the scheduled eviction is small, local, and removes the cause: with no
eviction under an audience, no second instance is ever parsed, and every socket keeps a reference
that is still the cached one.

It also matches an intent already expressed in the codebase, so it is a case of applying an
existing rule consistently rather than inventing policy.

The deferral must be re-armed rather than dropped — a game whose players later leave still has to
be released, or the cache grows without bound. `TOURNAMENT_ACTIVE_RECHECK_INTERVAL` shows the shape
the tournament path already uses for this.

### 2. Resolving per message is the deeper fix, and is worth weighing separately

Even with eviction fixed, a socket holding a reference across an eviction remains possible in
principle: eviction can still happen if the check races with the last player leaving and returning.
Resolving the game per message — or holding the id and looking it up — makes the class of bug
impossible rather than unlikely.

It is a wider change: `round_socket_handler` and everything it calls take `game` as a parameter, so
the reference is threaded through many call sites. Doing it in the same change as the eviction fix
risks obscuring which change fixed what.

*Recommendation:* fix the eviction, verify the rematch, and decide the per-message resolution on
its own evidence afterwards.

### 3. The load race wants the standard guard

Either an `asyncio.Lock` per game id around the load, or a re-check after the await before
assigning — the second is cheaper and enough, since the loser of the race can discard its parse and
return the cached instance. What must not happen is two callers each keeping their own object.

## Risks / Trade-offs

- **Not evicting under an audience means a game can be held indefinitely** by a player who leaves a
  tab open on a finished game. That is already true of the immediate path, and the re-check is what
  bounds it — but it is a real change in the cache's worst case.
- **The bug is not bughouse-specific.** `server/utils.py` has the same load shape for ordinary
  games, and `handle_rematch` in `wsr.py` accumulates offers on the game object the same way. A fix
  applied only to the bughouse path would leave two-player rematches exposed to the same split; it
  is simply rarer with two participants.
- **Reproducing it takes patience.** The window only opens after a finished game has been evicted,
  which is minutes of waiting, and then only for clients that connect on different sides of that
  moment. A test will have to force the eviction rather than wait for it.

## Migration Plan

1. Add the active check, with a re-check, to the scheduled eviction. Python gates.
2. Reproduce the original conditions deliberately: finish a game, force eviction, reload one
   window, and confirm all four clients still resolve to one instance.
3. Then the rematch itself, all four windows, expecting a new game.
4. Consider the per-message resolution and the load race as follow-ups, on their own evidence.

## Open Questions

- Should the fix be applied to the shared paths (`server/utils.py`, `handle_rematch`) in the same
  change, or bughouse first and the rest once the shape is proven?
- Is holding a finished game while a tab is left open acceptable, or does it need an upper bound
  beyond "until the audience leaves"?
- Can the eviction be made safe for holders — releasing the cache entry while leaving connected
  sockets working against the instance they have — instead of being deferred?
