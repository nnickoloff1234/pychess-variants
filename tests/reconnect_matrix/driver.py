"""Stages each scenario against a live game and probes what the client believes afterwards.

Reuses the game setup from `layout_matrix.driver` — the simul seek that seats four players from two
browser contexts — and `~/dev/ai-scripts/pychess-board.js` for the probes, so this bed and the manual
four-window playbook report in the same terms.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from layout_matrix import driver as live
from playwright.async_api import Error as PlaywrightError

from .scenarios import Scenario

PB_SOURCE = Path.home() / "dev" / "ai-scripts" / "pychess-board.js"
RECONNECT_WAIT_MS = 12000
SETTLE_MS = 900


@dataclass
class Result:
    scenario: Scenario
    status: str  # PASS | FAIL | BLOCKED | ERROR
    checks: dict = field(default_factory=dict)
    facts: dict = field(default_factory=dict)
    note: str = ""


# Installed BEFORE any page script, so every socket the app opens is captured. Waiting on a CSS
# class instead was the bed's own first bug: the class tracks the app's reconnect BANNER, the app's
# reconnect timer is 4s, and a scenario that goes offline for one second probes before the socket has
# come back — reporting the client's state mid-outage as if it were the recovered state.
SOCKET_SPY = """
(() => {
    const Native = window.WebSocket;
    window.__sockets = [];
    window.WebSocket = function (...args) {
        const ws = new Native(...args);
        window.__sockets.push(ws);
        // Every inbound message, so a scenario can say WHAT arrived rather than infer it from
        // what changed. Kept tiny: type, ply, and how many steps a board message carried.
        window.__msgs = window.__msgs || [];
        ws.addEventListener('message', e => {
            if (e.data === '/n') return;
            try {
                const m = JSON.parse(e.data);
                window.__msgs.push({t: m.type, ply: m.ply, steps: (m.steps || []).length});
            } catch (err) { /* not json */ }
        });
        return ws;
    };
    window.WebSocket.prototype = Native.prototype;
    Object.assign(window.WebSocket, Native);
})();
"""


async def install_spy(context) -> None:
    await context.add_init_script(SOCKET_SPY)


async def install_pb(page) -> None:
    """`window.PB` — the same helpers the manual playbook uses."""
    await page.evaluate(PB_SOURCE.read_text())


async def go_offline(page) -> None:
    """A real break: block the network AND close the socket.

    `set_offline(True)` alone does NOT do this. It stops new requests, but an established WebSocket
    survives it — measured: after a full offline/online cycle the page still held one socket in
    readyState 1 and had received no messages, because it had never lost the one it had. Every
    scenario staged that way was testing a client that never disconnected.

    Closing the socket is what the app's reconnect path actually responds to; staying offline is what
    stops it succeeding until we allow it.
    """
    await page.context.set_offline(True)
    await page.evaluate(
        "() => (window.__sockets || []).forEach(s => { if (s.readyState === 1) s.close(); })"
    )
    await page.wait_for_timeout(300)


async def go_online(page) -> None:
    await page.context.set_offline(False)


async def probe(page, game_id: str) -> dict:
    # The movelist lives in a tab panel that is not selected by default, and an unselected panel is
    # not a rendered one. Select it, or every ply count reads zero.
    tab = page.locator('[role="tab"]', has_text="Moves").first
    if await tab.count() > 0:
        try:
            await tab.click(timeout=2000)
            await page.wait_for_timeout(250)
        except PlaywrightError:
            pass
    return await page.evaluate(
        """(gameId) => {
        const cacheRaw = localStorage.getItem('bug-pending-moves:' + gameId);
        const app = document.querySelector('.round-app.bug');
        // The move cells, wherever the page keeps them. `.movelist` alone was empty: the round
        // page nests the list inside `.movelist-block`, and the cells are the non-counter children.
        const movelist = document.querySelector('.movelist-block .movelist, .movelist');
        const moves = movelist
            ? [...movelist.querySelectorAll('*')]
                  .filter(c => !c.className.toString().includes('counter') && c.children.length === 0)
                  .map(c => c.textContent.trim()).filter(Boolean)
            : [];
        return {
            cache: cacheRaw ? JSON.parse(cacheRaw) : null,
            movelistFound: movelist !== null,
            msgsAfterBreak: (window.__msgs || []).map(m => m.t + (m.steps ? ':' + m.steps : '')),
            moves,
            plyCount: moves.length,
            lastA: (window.PB ? PB.lastMove('#mainboard') : []),
            lastB: (window.PB ? PB.lastMove('#bugboard') : []),
            clocks: (window.PB ? PB.clocks() : null),
            invariant: (window.PB ? PB.invariant() : null),
            gameOver: app ? app.classList.contains('game-over') : null,
            result: (document.querySelector('.result') || {}).textContent || null,
        };
    }""",
        game_id,
    )


async def can_select(page, board_sel: str, square: str) -> bool:
    """Whether our board invites a move — the ahead-of-server gate, tested by using it."""
    at = await page.evaluate(live.SQUARE_XY, [board_sel, square])
    if at is None:
        return False
    await page.mouse.click(at["x"], at["y"])
    await page.wait_for_timeout(200)
    selected = await page.evaluate(f"() => window.PB ? PB.selected('{board_sel}') : null")
    dests = await page.evaluate(f"() => window.PB ? PB.dests('{board_sel}') : []")
    if selected:  # put the board back as we found it
        await page.mouse.click(at["x"], at["y"])
        await page.wait_for_timeout(150)
    return bool(selected) and len(dests) > 0


async def wait_for_socket(page, timeout_ms: int = RECONNECT_WAIT_MS) -> bool:
    """Wait for a websocket that is actually OPEN, then for the traffic that follows it.

    The app reconnects on a 4s timer, so a scenario that is offline for one second is still
    disconnected when it returns. `__sockets` is every socket the page has constructed; a live one is
    the only honest signal that the return has happened.
    """
    try:
        # THE GAME'S socket, by url. The page may hold others, and "some socket is open" was
        # satisfied by one that had never gone away.
        await page.wait_for_function(
            "() => (window.__sockets || []).some(s => s.url.includes('/wsr/') && s.readyState === 1)",
            timeout=timeout_ms,
        )
    except PlaywrightError:
        return False
    # The board message follows the open, and the reconcile follows the board message.
    await page.wait_for_timeout(SETTLE_MS)
    return True


# ---- the checks ------------------------------------------------------------------------------


def _check_cache_empty(before, after, ctx):
    return after["cache"] is None, f"cache={json.dumps(after['cache'])}"


def _check_our_move_played(before, after, ctx):
    """Did the SERVER record it?

    Asked of the server, not of the client's DOM. The two-board round page has no `.movelist`
    element at all — scraping it returned nothing and made this check vacuous — and in any case the
    server is the right oracle: what is being tested is whether our move survived the break, and only
    the server can say. The client's agreement with it is `_check_client_matches_server`.
    """
    uci = ctx.get("our_move")
    if uci is None:
        return None, "no move was committed in this scenario"
    record = ctx.get("server_moves", [])
    return uci in record, f"our move {uci}; server record {record}"


def _check_invariant(before, after, ctx):
    inv = after.get("invariant")
    if inv is None:
        return None, "PB.invariant() unavailable"
    return bool(inv.get("ok")), json.dumps(inv)[:200]


def _check_playable(before, after, ctx):
    return ctx.get("playable"), f"selection {'succeeded' if ctx.get('playable') else 'refused'}"


def _check_locked(before, after, ctx):
    return ctx.get(
        "playable"
    ) is False, f"selection {'refused' if ctx.get('playable') is False else 'allowed'}"


def _check_opp_move_seen(before, after, ctx):
    """Their move reached the server, and our board shows a position at or after it.

    NOT "it is our board's last move". A premove of ours fires the instant their move lands, so in
    the premove scenarios their move is correctly one behind ours — asserting it was last made the
    bed fail N6 for being right.
    """
    uci = ctx.get("opp_move")
    if uci is None:
        return None, "no opponent move in this scenario"
    record = ctx.get("server_moves", [])
    if uci not in record:
        return False, f"the server never recorded {uci}: {record}"
    last = after["lastA"] if ctx["our_board"] == "#mainboard" else after["lastB"]
    theirs_is_last = bool(last) and uci[:2] in last and uci[2:4] in last
    later = ctx.get("server_last_on_our_board")
    ours_on_top = bool(last) and later is not None and later[:2] in last and later[2:4] in last
    return (theirs_is_last or ours_on_top), (
        f"their {uci} is in the record; our board shows {last}; server's last there is {later}"
    )


def _check_ply_advanced(before, after, ctx):
    return after["plyCount"] >= before["plyCount"], f"{before['plyCount']} -> {after['plyCount']}"


def _check_game_over(before, after, ctx):
    return bool(after["gameOver"]), f"game-over={after['gameOver']} result={after['result']}"


def _check_clocks_agree(before, after, ctx):
    other = (ctx.get("partner_clocks") or {}).get("seats")
    ours = (after.get("clocks") or {}).get("seats")
    if other is None or ours is None:
        return None, "no cross-window reading taken"
    # ONLY STOPPED CLOCKS ARE COMPARABLE ACROSS WINDOWS. A running one differs by the gap between the
    # two readings, which is not a fault. This is the second oracle from the stress-test playbook —
    # the one that catches an error shifting BOTH boards alike, which `PB.invariant()` cannot see.
    diffs = {
        k: round(abs(ours[k]["secs"] - other[k]["secs"]))
        for k in ("aw", "ab", "bw", "bb")
        if k in ours and k in other and not ours[k]["run"] and not other[k]["run"]
    }
    if not diffs:
        return None, "no stopped clock to compare"
    worst = max(diffs.values())
    return worst <= 2, f"stopped-clock differences {diffs}"


def _check_client_matches_server(before, after, ctx):
    """The client's board shows the server's last move for that board. The whole point, in one line."""
    server_last = ctx.get("server_last_on_our_board")
    last = after["lastA"] if ctx["our_board"] == "#mainboard" else after["lastB"]
    if server_last is None:
        return None, "the server has no move on our board yet"
    ok = bool(last) and server_last[:2] in last and server_last[2:4] in last
    return ok, f"server's last {server_last}, client shows {last}"


CHECKS = {
    "client_matches_server": _check_client_matches_server,
    "cache_empty": _check_cache_empty,
    "our_move_played": _check_our_move_played,
    "invariant": _check_invariant,
    "playable": _check_playable,
    "locked": _check_locked,
    "opp_move_seen": _check_opp_move_seen,
    "ply_advanced": _check_ply_advanced,
    "game_over": _check_game_over,
    "clocks_agree": _check_clocks_agree,
}


# ---- staging -----------------------------------------------------------------------------------
#
# TWO CONTEXTS SEAT FOUR PLAYERS, and that bounds what the gap can contain. The camera holds both
# seats of team 1 (board A white, board B black) and the partner both of team 2. So while the camera
# is offline the partner can make at most ONE move on each board — its own — and then must wait for
# the camera it cannot play. That is enough for every N and Q scenario staged here, and it is NOT
# enough for a capture on the other board (N3) or for a ply jump of more than two. Those need four
# contexts, one per seat, and are declared blocked rather than staged wrongly.


async def _seating(cam) -> dict:
    """Which colour the camera holds where, read rather than assumed."""
    return await cam.evaluate(
        """() => {
        const seats = PB.seats().map(s => ({board: s.boardName, colour: s.colour, player: s.player}));
        const me = PB.myName();
        const mine = seats.filter(s => s.player === me);
        return {me, mine, all: seats};
    }"""
    )


async def _our_move_on_a(cam, ctx, uci):
    ok = await live.play(cam, "#mainboard", uci)
    if ok:
        ctx["our_move"] = uci
        ctx["our_board"] = "#mainboard"
    return ok


async def _opp_move_on_a(par, ctx, uci):
    ok = await live.play(par, "#mainboard", uci)
    if ok:
        ctx["opp_move"] = uci
    return ok


async def _write_cache(page, game_id, board, move, ply):
    """Put an entry back into the resend cache by construction.

    STAGED, NOT RACED. Q2 and Q7 are "the server has the move and our cache still holds it", which in
    the wild happens when a confirmation is lost in flight. Reproducing that by killing a socket
    inside the confirmation window is a race measured in tens of milliseconds; writing the entry the
    client itself would have written puts the client in exactly the state under test, deterministically.
    """
    await page.evaluate(
        """([gameId, board, move, ply]) => {
            const key = 'bug-pending-moves:' + gameId;
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            stored[board] = {type: 'move', gameId, move, clocks: [-1, -1], clocksB: [-1, -1], ply, board};
            localStorage.setItem(key, JSON.stringify(stored));
        }""",
        [game_id, board, move, ply],
    )


async def stage(name, cam, par, game_id, ctx):
    """Each recipe leaves the camera reconnected and the scenario's history behind it."""
    ctx.setdefault("our_board", "#mainboard")

    if name == "offline_then_online":
        await go_offline(cam)
        await cam.wait_for_timeout(1500)
        await go_online(cam)

    elif name == "offline_other_board_moves_online":
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await live.play(par, "#bugboard", "e2e4")  # the partner is white on board B
        await go_online(cam)

    elif name == "offline_opp_moves_online":
        await _our_move_on_a(cam, ctx, "e2e4")  # hand the turn to the opponent first
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await _opp_move_on_a(par, ctx, "e7e5")
        ctx.pop("our_move", None)  # N-series: nothing of ours is in flight
        await go_online(cam)

    elif name == "offline_opp_and_other_online":
        await _our_move_on_a(cam, ctx, "e2e4")
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await _opp_move_on_a(par, ctx, "e7e5")
        await live.play(par, "#bugboard", "e2e4")
        ctx.pop("our_move", None)
        await go_online(cam)

    elif name == "offline_premove_opp_moves_online":
        await _our_move_on_a(cam, ctx, "e2e4")
        await go_offline(cam)
        await cam.wait_for_timeout(500)
        await live.play(cam, "#mainboard", "g1f3")  # not our turn: arms a premove
        await _opp_move_on_a(par, ctx, "e7e5")
        ctx.pop("our_move", None)
        await go_online(cam)

    elif name == "reload_after_opp_moves":
        await _our_move_on_a(cam, ctx, "e2e4")
        await _opp_move_on_a(par, ctx, "e7e5")
        ctx.pop("our_move", None)
        await cam.reload(wait_until="domcontentloaded")
        await cam.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
        await install_pb(cam)

    elif name == "offline_move_online":
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await _our_move_on_a(cam, ctx, "e2e4")
        await go_online(cam)

    elif name == "offline_move_other_board_online":
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await _our_move_on_a(cam, ctx, "e2e4")
        await live.play(par, "#bugboard", "e2e4")
        await go_online(cam)

    elif name == "move_lands_then_break":
        await _our_move_on_a(cam, ctx, "e2e4")  # online: the server has it and the cache cleared
        await cam.wait_for_timeout(600)
        await _write_cache(cam, game_id, "a", "e2e4", 1)  # as if the confirmation never arrived
        await go_offline(cam)
        await cam.wait_for_timeout(1200)
        await go_online(cam)

    elif name == "move_lands_opp_replies_then_online":
        await _our_move_on_a(cam, ctx, "e2e4")
        await cam.wait_for_timeout(600)
        await _write_cache(cam, game_id, "a", "e2e4", 1)
        await go_offline(cam)
        await cam.wait_for_timeout(600)
        await _opp_move_on_a(par, ctx, "e7e5")
        await go_online(cam)

    elif name == "move_lands_then_reload":
        await _our_move_on_a(cam, ctx, "e2e4")
        await cam.wait_for_timeout(600)
        await _write_cache(cam, game_id, "a", "e2e4", 1)
        await cam.reload(wait_until="domcontentloaded")
        await cam.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
        await install_pb(cam)

    elif name == "offline_move_then_reload":
        await go_offline(cam)
        await cam.wait_for_timeout(800)
        await _our_move_on_a(cam, ctx, "e2e4")
        await go_online(cam)
        await cam.reload(wait_until="domcontentloaded")  # beat the ~4s reconnect timer
        await cam.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
        await install_pb(cam)

    elif name == "offline_move_premove_online":
        await go_offline(cam)
        await cam.wait_for_timeout(600)
        await _our_move_on_a(cam, ctx, "e2e4")
        await live.play(cam, "#mainboard", "g1f3")  # queued behind it: a premove
        await go_online(cam)

    elif name == "both_offline_we_return_first":
        await go_offline(cam)
        await go_offline(par)
        await cam.wait_for_timeout(600)
        await _our_move_on_a(cam, ctx, "e2e4")
        await go_online(cam)
        await wait_for_socket(cam)
        await go_online(par)

    elif name == "offline_game_ends_online":
        await go_offline(cam)
        await cam.wait_for_timeout(600)
        for _ in range(3):  # a team resign needs both seats, and the partner holds both
            button = par.locator("button", has_text="Resign").first
            if await button.count() == 0:
                break
            try:
                await button.click(timeout=2000)
            except PlaywrightError:
                pass
            await par.wait_for_timeout(700)
        await go_online(cam)

    elif name == "offline_past_abandon":
        await go_offline(cam)
        await cam.wait_for_timeout(66000)  # ABANDON_TIMEOUT 30s, doubled for base >= 3
        await go_online(cam)

    else:
        raise KeyError(f"no staging recipe named {name}")

    await wait_for_socket(cam)
    return ctx
