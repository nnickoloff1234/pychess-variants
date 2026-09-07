"""Server-side delays, injected in-process, so a race is staged rather than hoped for.

NOTHING IS ADDED TO PRODUCTION CODE FOR THIS. The bed runs the application in the same process, so
the function under test can be wrapped where the caller looks it up. BOTH DOORS INTO `play_move` MUST BE HELD, and finding that out cost a wrong result. `wsr.py` imports
it as `play_move_bug` for an ordinary move; `bug/wsr_bug.py` imports it as `play_move` for a move
RESENT in a reconnect payload. Holding only the first staged nothing: the reloaded page resent the
move the instant its socket opened, that second door applied it, and the snapshot the test wanted to
be stale arrived perfectly fresh. Which is itself worth knowing — on a reload the client's own resend
usually closes the window before a human could act in it.

`wsr.py` calls its reference INSIDE `async with game.move_lock`, so a hold placed there keeps the
lock: a second move arriving meanwhile queues behind the first instead of racing it.

HELD UNTIL RELEASED, NOT FOR A FIXED TIME. A timed sleep was tried first and lost the race — the
window has to survive a full page reload, and pychess takes longer to come back than any number
short enough to be a sane test timeout. A hold the test releases makes the ordering exact whatever
the machine is doing.
"""

import asyncio
import contextlib

import wsr
from bug import wsr_bug


class MoveHold:
    """The first move is held here until `release()`; every later move passes straight through."""

    def __init__(self) -> None:
        self.reached = asyncio.Event()  # the server has the move and is holding it
        self.gate = asyncio.Event()  # the test says: let it through
        self.applied: list[str] = []

    async def wait_until_holding(self, timeout: float = 20.0) -> bool:
        try:
            await asyncio.wait_for(self.reached.wait(), timeout)
            return True
        except TimeoutError:
            return False

    def release(self) -> None:
        self.gate.set()


@contextlib.asynccontextmanager
async def hold_first_move(safety_timeout: float = 45.0, skip: int = 0):
    """Hold one move inside the server's game lock until the test releases it.

    `skip` lets the first N moves through untouched, so a scenario can build a position — and a
    move list to scroll through — before the move it wants stuck. Without it the held move is the
    game's first, and a game whose first move never lands has an empty move list.
    """
    original = wsr.play_move_bug
    original_resend = wsr_bug.play_move
    hold = MoveHold()
    first = {"seen": False, "passed": 0}

    async def holding(app_state, user, game, move, clocks, clocks_b, board, **kwargs):
        if not first["seen"] and first["passed"] < skip:
            first["passed"] += 1
            return await original(app_state, user, game, move, clocks, clocks_b, board, **kwargs)
        if not first["seen"]:
            first["seen"] = True
            hold.reached.set()
            # The safety timeout matters: if a test forgets to release, the server must not wedge
            # and take every later scenario down with it.
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(hold.gate.wait(), safety_timeout)
        result = await original(app_state, user, game, move, clocks, clocks_b, board, **kwargs)
        hold.applied.append(move)
        return result

    async def holding_resend(app_state, user, game, move, clocks, clocks_b, board, **kwargs):
        # The resend door. Held on the same gate, so a page that resends the moment it reconnects
        # cannot resolve the very staleness the scenario is about.
        if not first["seen"]:
            first["seen"] = True
            hold.reached.set()
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(hold.gate.wait(), safety_timeout)
        result = await original_resend(
            app_state, user, game, move, clocks, clocks_b, board, **kwargs
        )
        hold.applied.append(move)
        return result

    wsr.play_move_bug = holding
    wsr_bug.play_move = holding_resend
    try:
        yield hold
    finally:
        wsr.play_move_bug = original
        wsr_bug.play_move = original_resend
        hold.release()


@contextlib.asynccontextmanager
async def drop_move_persistence(after_n: int = 0):
    """Let the first `after_n` plies persist, then stop persisting — the process dies mid-write.

    THIS IS THE ACCEPTED RISK OF `bughouse-persist-moves-as-played`, STAGED. That change applies a
    ply to the in-memory game and queues the database write, so there is a window in which the four
    clients have been told about a move the document does not contain. The queue drains in
    milliseconds, so the window cannot be hit by hand; dropping the write outright reproduces its
    consequence exactly, and deterministically.

    Patched on the CLASS rather than on a caller's reference, because `_queue_move_persist` is
    invoked as `self._queue_move_persist(...)` from inside `GameBug.play_move` — there is no module
    attribute to swap the way `hold_first_move` swaps `wsr.play_move_bug`.

    The ply is still applied, broadcast, and clocked. Only the write is lost, which is precisely
    what a process that dies between the two would leave behind.
    """
    from bug.game_bug import GameBug

    original = GameBug._queue_move_persist
    seen: list[str] = []
    dropped: list[str] = []

    def maybe_persist(self, board, move):
        seen.append(move)
        if len(seen) > after_n:
            dropped.append(move)
            return
        return original(self, board, move)

    GameBug._queue_move_persist = maybe_persist
    try:
        yield dropped
    finally:
        GameBug._queue_move_persist = original


async def restart_server(state, game_id: str) -> bool:
    """Simulate a restart, from the game's point of view: memory gone, document kept.

    A real restart ends the process. In-process the equivalent lever is to evict the game from
    `app_state.games`, because that is the ONLY thing a restart takes away that matters here —
    `load_game()` checks that cache first and otherwise rebuilds from the document, so the next
    socket to ask for this game gets one reconstructed by `load_game_bug_from_doc()`, exactly as it
    would after a deploy.

    The old object's clock tasks are cancelled rather than left running, since the process that
    owned them would have died with them.
    """
    game = state.games.pop(game_id, None)
    if game is None:
        return False
    with contextlib.suppress(Exception):
        await game.gameClocks.cancel_stopwatches()
    return True
