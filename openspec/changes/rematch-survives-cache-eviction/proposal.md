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

## Why

Clicking REMATCH in all four bughouse windows does not start a new game. All four clicks reach the
server, all four are accepted, every player sees all four offers appear in the chat — and nothing
happens.

Reproduced on game `hCbqFLim`, four clicks over 64 seconds:

```
14:28:24  rematch request by  Test–ElephantRook
14:28:44  rematch request by  Test–JanggiElephantA
14:29:06  rematch request by  Test–KnibisImmobileP
14:29:28  rematch request by  Test–CommonerFersAlf
```

No error, no traceback, and every one of them took the "offer" branch of
`handle_rematch_bughouse` — so the test that asks whether everyone else has already offered was
never true, even on the fourth click.

**The four players were not looking at the same game object.** `round_socket_handler` resolves the
game once, when the socket opens (`server/wsr.py:159`), and holds that reference for the life of
the connection. A finished game is evicted from `app_state.games` after a keep time. When a client
connects afterwards, `load_game_bug` finds nothing cached and **parses a second `GameBug` from the
database**. Sockets opened before the eviction and sockets opened after it then hold different
objects — each with its own `rematch_offers` set, which is where the agreement is supposed to
accumulate.

The timeline for `hCbqFLim` shows exactly this:

| time | event |
|---|---|
| 12:51 | game created; all four sockets hold object **A** |
| 12:56 | resign; game finished |
| ~13:01 | evicted from the cache |
| 14:24 | one window reloaded → `load_game_bug parse START` → object **B**, cached |
| 14:28–14:29 | one player offers on **B**, three offer on **A**; neither set ever reaches four |

The offers *appear* to propagate because the broadcast goes through the shared `User` objects, not
through the game — so the symptom is a room where everyone can see everyone agreeing and nothing
comes of it.

**Confirmed by removing the split:** reloading all four windows so they shared one instance, then
making the same four clicks, created game `gE6yCalr` immediately. The rematch logic is correct; the
identity of the game it operates on is not.

Bughouse feels this far more than ordinary chess, which needs two players to agree rather than
four, and so has fewer chances to be split.

## What Changes

- **A game has one instance for as long as anyone is connected to it.** Whatever the mechanism —
  not evicting a finished game while players or spectators are attached, resolving the game per
  message rather than once per socket, or both — two live sockets on one game SHALL NOT be able to
  hold different objects.

- **A finished game is not evicted while it still has an audience.** The scheduled eviction
  (`remove_from_cache`) sleeps for the keep time and then evicts unconditionally. The codebase
  already has the check this is missing: `maybe_remove_finished_game_from_cache_now` refuses to
  evict while any player or spectator is active in the game. The scheduled path does not ask.

- **Concurrent connects resolve to one instance.** `load_game_bug` tests `game_id in
  app_state.games`, then awaits a database read, then caches — two connects arriving together can
  both miss and both parse. Observed while reproducing: four simultaneous reloads produced **two**
  parses.

## Capabilities

### New Capabilities

- `game-instance-identity`: that a game in play or on screen is one object, and what follows for
  state that accumulates across players — rematch offers being the case that exposed it.

### Modified Capabilities

None. No existing spec covers the server's game cache.

## Impact

- `server/wsr.py` — `round_socket_handler` resolving the game once per connection.
- `server/pychess_global_app_state.py` — `remove_from_cache` and its unconditional eviction, beside
  the guarded `maybe_remove_finished_game_from_cache_now` that shows the intended rule.
- `server/bug/utils_bug.py` — `load_game_bug` / `load_game_bug_from_doc`, the check-then-await-then-
  cache sequence.
- `server/utils.py` has the same shape for non-bughouse games; whatever is done here should be
  weighed against it, since the defect is not bughouse-specific even though bughouse is where it
  shows.
- Python changes mean the Python gates apply: `ruff format`, `ruff check`, `pyright`, and the
  `unittest` suite — the first server-side change in this run of work.

## Note: what masked the fix during reproduction

Once the rematch did fire, every window navigated to `http://127.0.0.1:8080/<newGameId>` and landed
on the lobby as a **new anonymous user**. That is not a product bug: the client redirects to
`model.home`, which is `URI` from `server/settings.py`, defaulting to `LOCALHOST =
http://127.0.0.1:8080`, while the harness browses `http://localhost:8080`. Different origin,
different cookie jar, new identity. In production `URI` is the real host and matches. Worth
recording because it made a working rematch look like a failure.
