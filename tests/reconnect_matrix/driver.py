"""Stages each scenario against a live game and probes what the client believes afterwards.

Reuses the game setup from `layout_matrix.driver` — the simul seek that seats four players from two
browser contexts — and `~/dev/ai-scripts/pychess-board.js` for the probes, so this bed and the manual
four-window playbook report in the same terms.


THE VOCABULARY, because two words here mean something other than what they look like
------------------------------------------------------------------------------------
`cam` and `par` are Playwright PAGES, one per browser context, each a separately logged-in user.

`cam` is THE CAMERA: the window the scenario is about. It is the one that goes offline, reloads,
queues a move and is probed afterwards — every check reads `probe(cam, ...)`. "What does this
window believe after the break" is the question the whole bed asks, and the camera is that window.
Nothing about it is a Playwright concept; it is a role.

`par` IS NOT THE CAMERA'S BUGHOUSE PARTNER. It holds team 2 — the OPPOSING pair — while the camera
holds team 1. The name is the opposite of what it does, and the code says so itself: the helper
that drives it is `_opp_move_on_a(par, ...)`, the OPPONENT's move. Read `par` as "the other
browser", never as "our teammate".

    Board A                Board B
    A-white  ..partner..  B-black      <- cam  (team 1, both seats)
    A-black  ..partner..  B-white      <- par  (team 2, both seats)

Partnerships run diagonally, so the camera's real partner is its OWN second seat, not the other
browser — which means switching the camera off removes a whole TEAM, one player from each board.

A THIRD WINDOW when a scenario needs our teammate to keep playing while we are away (N3, via
`params={"windows": 3}`): the camera keeps board A white, a `mate` page takes board B black, and
the opposing pair stay doubled up in the `par` window because nothing asks them to act during the
break. Everything else runs on two.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from layout_matrix import driver as live
from playwright.async_api import Error as PlaywrightError

from . import delays
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
    // Branch 1.1.4 is REPORTED rather than prevented, so the report is the observable and the bed
    // has to be able to see it. Captured here rather than through Playwright's console event so it
    // is readable from the same probe as everything else.
    window.__warnings = [];
    const nativeWarn = console.warn.bind(console);
    console.warn = (...args) => {
        try { window.__warnings.push(args.map(String).join(' ')); } catch (e) { /* ignore */ }
        return nativeWarn(...args);
    };

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
            warnings: (window.__warnings || []).filter(w => w.includes('[reconnect]')),
            // The pockets, which is the ONLY thing a cross-board capture changes on our side: our
            // position and our turn are untouched. The outer `.pocket` is a cg-wrap around the
            // real one, so it is filtered out; `data-nb` is the count of that role in hand.
            pockets: [...document.querySelectorAll('.pocket')]
                .filter(p => !p.classList.contains('cg-wrap'))
                .map(p => ({
                    cls: p.className,
                    held: [...p.querySelectorAll('piece')]
                        .map(x => ({role: x.className, nb: Number(x.getAttribute('data-nb') || 0)}))
                        .filter(x => x.nb > 0),
                })),
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


# THE SQUARES THAT ACTUALLY HOLD A PIECE, which is the only honest way to ask what a board is
# SHOWING. `PB.lastMove()` reads the highlight, and a highlight is a separate thing that can be
# absent while the position is perfectly right — twice in one day a missing highlight was read as a
# missing move, once for a restored game and once here.
OCCUPIED = r"""
(sel) => {
    const wrap = document.querySelector(sel + ' .cg-wrap');
    const board = document.querySelector(sel + ' cg-board');
    if (!board || !wrap) return null;
    const black = wrap.classList.contains('orientation-black');
    const s = board.getBoundingClientRect().width / 8;
    return [...board.querySelectorAll('piece')].map(p => {
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(p.style.transform || '');
        if (!m) return null;
        const c = Math.round(+m[1] / s), r = Math.round(+m[2] / s);
        return 'abcdefgh'[black ? 7 - c : c] + (black ? r + 1 : 8 - r);
    }).filter(Boolean).sort();
}
"""


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


def _check_no_invalid_move(before, after, ctx):
    """The game must not have been ended against us by a move we were invited to make.

    INVALIDMOVE is the most expensive outcome in the catalogue: `play_move()` catches the engine's
    refusal, sets the status and awards the result to the other team.
    """
    if not after.get("gameOver"):
        return True, "the game is still running"
    return False, f"the game ENDED: result={after.get('result')}"


def _check_one_move_lost_at_most(before, after, ctx):
    """The first move must not have been erased by the second.

    `recordPendingMove` writes `stored[board] = ...` unconditionally, so a second move on the same
    board overwrites the first one's entry. If the first never reached the server, that entry was the
    only record of it anywhere.
    """
    first = ctx.get("first_move")
    second = ctx.get("second_move")
    if second is None:
        return None, "no second move was made, so nothing could be overwritten"
    record = ctx.get("server_moves", [])
    lost = first not in record and not any(
        (c or {}).get("move") == first for c in [(after.get("cache") or {}).get("a")]
    )
    return (
        not lost,
        f"first={first} second={second}; server has {record}; cache={after.get('cache')}",
    )


def _check_playable_gate_held(before, after, ctx):
    """Was the board offered to us while a move of ours was outstanding?

    This is the finding itself, asserted directly rather than through its consequences.
    """
    offered = ctx.get("playable_on_stale_snapshot")
    if offered is None:
        return None, "the scenario did not reach the point of asking"
    return not offered, (
        f"board was {'OFFERED' if offered else 'held shut'} while holding a queued move; "
        f"it was showing {ctx.get('stale_last_move')}"
    )


def _check_no_silent_rollback(before, after, ctx):
    """SILENT is the word being tested, not ROLLED BACK.

    A rollback cannot be undone from the client: the move is gone, the server has no record of it,
    and the position that arrived is the only truth left. Branch 1.1.4 therefore ACCEPTS it and
    reports it, and leaves the board playable so the reader can play the lost move again — see the
    tree in `reconnectController.ts`. So the failure this guards against is a client that takes an
    older position and says nothing.

    Three outcomes: the position never went back (fine); it went back and was reported (fine, and
    the expected result of T5); it went back in silence (the defect).

    NOT MEASURED BY PLY COUNT. The first version compared `plyCount` before and after, and that
    comes from scraping the movelist, which reads 0 in both probes on this page — so it compared 0
    to 0 and passed while printing the rollback it exists to catch on the same line.
    """
    was = ctx.get("last_before_restart")
    uci = ctx.get("last_uci_before_restart")
    if not was:
        return None, "the scenario recorded no pre-restart position"

    now = after["lastA"]
    reported = [w for w in after.get("warnings", []) if "1.1.4" in w]

    if now == was:
        return True, f"still showing {was} after the restart"

    record = ctx.get("server_moves", [])
    if uci and uci in record:
        return True, f"moved on from {was} to {now}, and {uci} is still in the record {record}"

    if reported:
        return True, (
            f"rolled back from {was} to {now} and SAID SO (branch 1.1.4): {reported[0][:110]}"
        )
    return False, (
        f"SILENT ROLLBACK: was showing {was} ({uci}), now shows {now}; "
        f"the server's record is {record} and nothing was reported"
    )


def _check_both_queued_moves_played(before, after, ctx):
    """Both halves of a simul player's outstanding pair reached the server.

    The interesting failure is not "neither arrived" but "one did": the cache is keyed by board, so
    two entries must survive together and both be replayed. A single-board bug would show here as
    exactly one of them in the record.
    """
    queued = ctx.get("queued_moves") or []
    if len(queued) < 2:
        return False, f"only {len(queued)} of the two boards accepted a move offline: {queued}"
    record = ctx.get("server_moves", [])
    missing = [m for m in queued if m not in record]
    return not missing, f"queued {queued}; server record {record}; missing {missing or 'nothing'}"


def _check_play_continues_after_rollback(before, after, ctx):
    """A move played AFTER a rollback still reaches the reader's board."""
    if not ctx.get("played_after_rollback"):
        return None, "the follow-up move could not be played"
    seen = ctx.get("seen_after_rollback") or []
    return bool(seen), (
        f"rolled back to {ctx.get('rolled_back_to')!r}; the move played afterwards shows as "
        f"{seen or 'NOTHING — the client ignored it'}"
    )


def _check_rollback_damage_is_bounded(before, after, ctx):
    """HOW FAR the damage reaches: does the SECOND move after a rollback arrive?

    Separate from the first, because "one move is swallowed and then it resyncs" and "every later
    move is ignored" are different defects with different severities, and the first move alone
    cannot tell them apart.
    """
    if not ctx.get("played_second"):
        return None, "the second follow-up move could not be played"
    return bool(ctx.get("seen_second_on_a")), (
        f"second move shows as {ctx.get('seen_second_on_a') or 'NOTHING'}"
    )


def _check_swallowed_move_is_recovered(before, after, ctx):
    """Does the swallowed move's POSITION come back, even though it was never rendered as a move?

    Asked of the pieces, not of the highlight. Board B's e2e4 puts a pawn on e4 and empties e2; if
    the board still shows a pawn on e2 the move genuinely never reached it.
    """
    first, second = ctx.get("b_after_first"), ctx.get("b_after_second")
    if first is None or second is None:
        return None, "board B could not be read"

    def state(sq):
        return {"after the swallowed move": "e4" in sq and "e2" not in sq}

    ok = "e4" in second and "e2" not in second
    return ok, (
        f"board B right after it: {'correct' if 'e4' in first and 'e2' not in first else 'STALE'}; "
        f"after the next move on the other board: {'correct' if ok else 'STILL STALE'} "
        f"(e2 {'occupied' if 'e2' in second else 'empty'}, e4 {'occupied' if 'e4' in second else 'empty'})"
    )


def _check_spectator_not_yanked(before, after, ctx):
    """A spectator scrolled back must keep the position they chose, exactly as a player does.

    Read from the PIECES: the scrolled-back position has the knight on g1, the latest has it on f3.
    """
    if ctx.get("watcher_is_spectator") is not True:
        return False, f"the third window is not a spectator: {ctx.get('watcher_is_spectator')!r}"
    if not ctx.get("moved_while_watching"):
        return None, "no move could be played while the spectator was scrolled back"
    back, now = ctx.get("watcher_scrolled_back"), ctx.get("watcher_after_move")
    if not back or not now:
        return None, "the spectator's board could not be read"
    return "g1" in now and "f3" not in now, (
        f"spectator scrolled back to a board with {'g1' if 'g1' in back else '?'}; "
        f"after the move it shows {'f3 — YANKED FORWARD' if 'f3' in now else 'g1, held'}"
    )


def _check_reader_not_yanked(before, after, ctx):
    """A move arriving while the reader is scrolled back must not repaint their board.

    The scrolled-back position still has the knight on g1; the newest has it on f3.
    """
    back, now = ctx.get("scrolled_back_to"), ctx.get("board_after_opp_moved")
    if not back or not now:
        return None, "the board could not be read"
    return "g1" in now and "f3" not in now, (
        f"while scrolled back the board showed {'g1' if 'g1' in back else '?'}; "
        f"after the move arrived it shows {'f3 — YANKED FORWARD' if 'f3' in now else 'g1, held'}"
    )


def _check_no_false_gap_warning(before, after, ctx):
    """A reader looking backwards is not a hole in what we know.

    Branch 2.1.3 reports that a move is missing between what we show and what arrived. It decides
    that by comparing the message against `this.ply` — which `goPly()` moves whenever the reader
    scrolls — so scrolling back looks exactly like losing a move.
    """
    if not ctx.get("opp_moved_while_back"):
        return None, "the opponent could not move while the reader was scrolled back"
    gaps = [w for w in (ctx.get("warnings_while_back") or []) if "2.1.3" in w]
    return not gaps, (f"warnings while the reader was scrolled back: {gaps or 'none'}")


def _check_gate_holds(before, after, ctx):
    """The board that branch 1.2.3 shut is STILL shut after the reader reads the move list."""
    if not ctx.get("server_held_the_move"):
        return None, "the server never held the move, so the board was never shut"
    if not ctx.get("shut_after_snapshot"):
        return None, f"the snapshot did not shut the board; scrolled={ctx.get('scrolled')}"
    return ctx.get("shut_after_scroll") is True, (
        f"shut after the snapshot, and after reading the move list: "
        f"{ctx.get('shut_after_scroll')} ({ctx.get('scrolled')})"
    )


def _check_server_pocket_fed(before, after, ctx):
    """The SERVER put the captured piece into our pocket on board A.

    Board A's fen carries both pockets in brackets — uppercase for white, lowercase for black. We
    are white on board A, so an uppercase P is our pawn in hand. Checked server-side first, because
    if this is wrong the client has nothing to render and the client check would be blaming the
    wrong half.
    """
    if not ctx.get("capture_played"):
        return False, "the capture could not be played on the other board"
    fen = ctx.get("server_fen_a", "")
    pocket = fen[fen.find("[") + 1 : fen.find("]")] if "[" in fen else ""
    return "P" in pocket, f"board A pocket is {pocket!r} (uppercase = ours); fen {fen[:60]}"


def _check_pocket_gained(before, after, ctx):
    """OUR window shows the piece after reconnecting, having been offline when it arrived."""

    def held(probe):
        return [f"{h['role']}x{h['nb']}" for p in (probe.get("pockets") or []) for h in p["held"]]

    was, now = held(before), held(after)
    return len(now) > len(was), f"pockets before {was or 'empty'} -> after {now or 'empty'}"


def _check_server_kept_the_game(before, after, ctx):
    """The restart rebuilt a game with its moves, rather than an empty one at ply 0."""
    if not ctx.get("restarted"):
        return None, "no restart was staged"
    record = ctx.get("server_moves", [])
    return bool(record), f"server holds {len(record)} moves after the restart: {record}"


def _check_record_written(before, after, ctx):
    """The DOCUMENT holds the ending, not merely the in-memory game.

    Asked of the database on purpose. `save_game()` is guarded by `self.saved`, so a game that
    believes it has already been written ends perfectly well in memory and leaves the document
    saying the game is still in progress — indistinguishable from working, from the client's side.
    """
    result = ctx.get("doc_result")
    if result is None:
        return None, "the scenario did not end the game"
    return result != "d", (
        f"doc r={result!r} s={ctx.get('doc_status')!r} | mem r={ctx.get('mem_result')!r} "
        f"saved={ctx.get('mem_saved')!r} rated={ctx.get('mem_rated')!r}"
    )


CHECKS = {
    "no_false_gap_warning": _check_no_false_gap_warning,
    "reader_not_yanked": _check_reader_not_yanked,
    "spectator_not_yanked": _check_spectator_not_yanked,
    "play_continues_after_rollback": _check_play_continues_after_rollback,
    "rollback_damage_is_bounded": _check_rollback_damage_is_bounded,
    "swallowed_move_is_recovered": _check_swallowed_move_is_recovered,
    "gate_holds": _check_gate_holds,
    "server_pocket_fed": _check_server_pocket_fed,
    "pocket_gained": _check_pocket_gained,
    "both_queued_moves_played": _check_both_queued_moves_played,
    "record_written": _check_record_written,
    "no_silent_rollback": _check_no_silent_rollback,
    "server_kept_the_game": _check_server_kept_the_game,
    "no_invalid_move": _check_no_invalid_move,
    "one_move_lost_at_most": _check_one_move_lost_at_most,
    "playable_gate_held": _check_playable_gate_held,
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
# the camera it cannot play. That is enough for every N and Q scenario staged on two windows.
#
# It is NOT enough when the thing under test has to happen while we are away and only OUR TEAMMATE
# can do it — a capture that feeds our pocket, N3. Splitting the team across two windows fixes that
# (`start_game_three`); a fourth window is not needed, because the opposing pair never has to act
# during the break. An unbounded ply jump on the other board still wants a fourth.


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


async def _restart_and_reconnect(cam, par, ctx, game_id):
    """Evict the game, then drop BOTH clients' sockets, which is what a restart really does.

    Dropping only the camera's socket left the partner's websocket handler holding a reference to
    the OLD `GameBug` object — the one the eviction removed from the cache but could not remove
    from a running coroutine. The partner then went on playing and resigning against a game the
    rest of the world had replaced, and T7 passed against the very bug it was written to catch.

    This is the one place the in-process simulation differs from a real restart, where the process
    dies and takes every such reference with it. Dropping both sockets closes the gap: each side
    re-resolves the game through `load_game()` and gets the rebuilt object.
    """
    ctx["restarted"] = await delays.restart_server(ctx["state"], game_id)
    await go_offline(cam)
    await go_offline(par)
    await cam.wait_for_timeout(800)
    await go_online(cam)
    await go_online(par)
    await wait_for_socket(cam)
    await wait_for_socket(par)


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

    elif name == "move_in_flight_reload_move_again":
        """The race the ahead-of-server gate exists to prevent, staged through the one door that
        does not have that gate: a reload.

        1. Move M1. It reaches the server, which is held for `DELAY` seconds inside the game lock.
        2. Reload while it is still being applied. The page's in-memory record of M1 dies; the
           durable one survives.
        3. The snapshot that greets the new page therefore PREDATES M1 — the server has not applied
           it yet — and the board comes back playable, because the gate reads the record that died.
        4. Play M2 against that stale position. `recordPendingMove` overwrites M1's cache entry.
        5. The lock releases, M1 is applied, and M2 is evaluated against a position the server has
           already left.
        """
        hold = ctx["hold"]
        await _our_move_on_a(cam, ctx, "e2e4")
        ctx["first_move"] = "e2e4"
        # The server now HAS the move and is holding the game lock. Everything below happens inside
        # that window, which is the whole point: a fixed sleep lost this race to the page load.
        ctx["server_held_the_move"] = await hold.wait_until_holding()
        await cam.reload(wait_until="domcontentloaded")
        await cam.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
        await install_pb(cam)
        await wait_for_socket(cam)

        # What the new page believes, BEFORE we touch it: this is the hole, measured.
        ctx["stale_last_move"] = await cam.evaluate("() => PB.lastMove('#mainboard')")
        ctx["playable_on_stale_snapshot"] = await can_select(cam, "#mainboard", "d2")

        if ctx["playable_on_stale_snapshot"]:
            await _our_move_on_a(
                cam, ctx, "d2d4"
            )  # M2, legal only in the position we can still see
            ctx["second_move"] = "d2d4"
        hold.release()  # M1 lands; M2 is then judged against a position the server has left
        await cam.wait_for_timeout(4000)

    elif name == "server_restart":
        """The whole game goes through a restart: memory dropped, document kept.

        Two plies on our board and one on the other, so the restore has to get the interleaving and
        both boards' clocks right, not just a move count.
        """
        await _our_move_on_a(cam, ctx, "e2e4")
        await _opp_move_on_a(par, ctx, "e7e5")
        await live.play(par, "#bugboard", "e2e4")
        await cam.wait_for_timeout(800)
        ctx.pop("our_move", None)  # nothing of ours is in flight; the server has it all

        pre = await probe(cam, game_id)
        ctx["ply_before_restart"] = pre["plyCount"]
        ctx["last_before_restart"] = pre["lastA"]
        ctx["last_uci_before_restart"] = "e7e5"  # the last move made on our board
        await _restart_and_reconnect(cam, par, ctx, game_id)

    elif name == "server_restart_loses_last_ply":
        """THE ACCEPTED RISK, MADE OBSERVABLE. The last ply is applied and broadcast but never
        written, then the server restarts, so its rebuilt game is one ply BEHIND the clients.

        This is the one shape the reconnect tree has no branch for. Every branch under `1` assumes
        the arriving position is at least as advanced as ours, because a server only ever moves
        forward. Here it moves backwards, and nothing in the client is looking for that.
        """
        await _our_move_on_a(cam, ctx, "e2e4")  # persisted
        await _opp_move_on_a(par, ctx, "e7e5")  # persisted
        await cam.wait_for_timeout(600)
        await _our_move_on_a(cam, ctx, "g1f3")  # applied, broadcast, NOT persisted
        await cam.wait_for_timeout(1200)
        ctx.pop("our_move", None)  # it was confirmed to us; nothing is waiting in the cache

        before_restart = await probe(cam, game_id)
        ctx["ply_before_restart"] = before_restart["plyCount"]
        ctx["last_before_restart"] = before_restart["lastA"]
        ctx["last_uci_before_restart"] = "g1f3"  # applied and broadcast, never written
        ctx["dropped"] = list(ctx.get("dropped_writes", []))
        await _restart_and_reconnect(cam, par, ctx, game_id)

    elif name == "restart_rollback_then_play_on":
        """AFTER A ROLLBACK, DOES THE NEXT MOVE STILL ARRIVE?

        T5 establishes that a lost ply is reported. This asks what happens NEXT, which T5 never
        does because it stops at the rollback.

        The suspicion is bookkeeping: `latestPly` is false for a rolled-back snapshot (its ply is
        LOWER than ours), so `this.ply` is not advanced — while the position IS applied, because
        that path runs on `full` regardless. `this.ply` then describes a game the reader is no
        longer being shown, and the next move is judged against it.
        """
        await _our_move_on_a(cam, ctx, "e2e4")  # persisted
        await _opp_move_on_a(par, ctx, "e7e5")  # persisted
        await cam.wait_for_timeout(600)
        await _our_move_on_a(cam, ctx, "g1f3")  # applied and broadcast, never written
        await cam.wait_for_timeout(1200)
        ctx.pop("our_move", None)

        await _restart_and_reconnect(cam, par, ctx, game_id)
        ctx["rolled_back_to"] = await cam.evaluate("() => PB.lastMove('#mainboard').join('')")

        # The game goes on. Board B has never moved, so its white — the partner — can play.
        ctx["played_after_rollback"] = await live.play(par, "#bugboard", "e2e4")
        await cam.wait_for_timeout(2500)
        ctx["seen_after_rollback"] = await cam.evaluate("() => PB.lastMove('#bugboard')")
        ctx["b_after_first"] = await cam.evaluate(OCCUPIED, "#bugboard")

        # AND THEN A SECOND ONE, because how far the damage reaches is the question the first move
        # alone cannot answer. `this.ply` is stale by exactly the number of plies the rollback lost
        # — one here — so the reasoning says one move is swallowed and the next resyncs. Reasoning
        # is what this bed exists to replace: the camera plays on its own board, which is legal
        # because the rolled-back position left it to move there.
        ctx["played_second"] = await live.play(cam, "#mainboard", "g1f3")
        await cam.wait_for_timeout(2500)
        ctx["seen_second_on_a"] = await cam.evaluate("() => PB.lastMove('#mainboard')")
        ctx["seen_first_on_b_after"] = await cam.evaluate("() => PB.lastMove('#bugboard')")
        ctx["b_after_second"] = await cam.evaluate(OCCUPIED, "#bugboard")

    elif name == "restart_then_finish":
        """A game that came back from a restart must still be able to write its own ending.

        `load_game_bug_from_doc()` sets `game.saved` from the move list, and `save_game()` opens
        with `if self.saved: return`. Before per-ply persistence a restored in-progress game had an
        empty `m`, so this never fired; with moves in the document it fires for every restored game,
        and the ending — result, ratings, final clock arrays — would be silently dropped.
        """
        await _our_move_on_a(cam, ctx, "e2e4")
        await _opp_move_on_a(par, ctx, "e7e5")
        await cam.wait_for_timeout(800)
        ctx.pop("our_move", None)
        await _restart_and_reconnect(cam, par, ctx, game_id)

        # End it, then ask the DOCUMENT — not the in-memory game — whether the ending was written.
        for _ in range(3):
            button = par.locator("button", has_text="Resign").first
            if await button.count() == 0:
                break
            try:
                await button.click(timeout=2000)
            except PlaywrightError:
                pass
            await par.wait_for_timeout(700)
        await cam.wait_for_timeout(1500)
        doc = await ctx["state"].db.game.find_one({"_id": game_id})
        ctx["doc_result"] = (doc or {}).get("r")
        ctx["doc_status"] = (doc or {}).get("s")
        # Whether the game ended AT ALL, so a failure to resign is not read as a failure to persist.
        live_game = ctx["state"].games.get(game_id)
        ctx["mem_result"] = getattr(live_game, "result", None)
        ctx["mem_status"] = getattr(live_game, "status", None)
        ctx["mem_saved"] = getattr(live_game, "saved", None)
        ctx["mem_rated"] = getattr(live_game, "rated", None)

    elif name == "resend_across_restart":
        """A queued move meets a server that has forgotten it already played it.

        `lastmovePerBoardAndUser` is the map `play_move()` consults to ignore a move a user has
        already made — it lives only in memory, and a restart empties it. So a move resent in a
        `movesQueued` payload after a restart no longer takes the quiet "already played" shortcut
        (branch 1.2.3.2); it reaches the engine, which refuses it because the position already
        contains it, and the server resyncs that client instead (branch 1.2.3.4).

        The same journey therefore changes branch purely because the server restarted. It is only
        harmless because a refused move no longer ends the game — before that change this path
        would have awarded the game against the player who reconnected.
        """
        await _our_move_on_a(cam, ctx, "e2e4")  # persisted and confirmed
        await cam.wait_for_timeout(800)
        await _write_cache(cam, game_id, "a", "e2e4", 1)  # as if the confirmation never arrived

        pre = await probe(cam, game_id)
        ctx["last_before_restart"] = pre["lastA"]
        ctx["last_uci_before_restart"] = "e2e4"
        # the client resends e2e4 into a server that has no memory of having played it
        await _restart_and_reconnect(cam, par, ctx, game_id)

    elif name == "offline_other_board_capture_online":
        """A capture on the OTHER board puts a piece in OUR pocket while we are disconnected.

        The one scenario that changes our side of the game without touching our position or our
        turn, and the only one that needs three windows: the piece can only come from our TEAMMATE,
        who in the two-window seating shares a browser with us and goes offline when we do.

        Board B is set up BEFORE the break, because our teammate plays black there and needs a
        white pawn to take. The opponent's two moves both happen while we are still connected, so
        it is passive for the whole of the offline window — the only part that matters.
        """
        mate = ctx["mate"]
        await live.play(par, "#bugboard", "e2e4")  # opponent, board B white
        await cam.wait_for_timeout(500)
        await live.play(mate, "#bugboard", "d7d5")  # our teammate, board B black
        await cam.wait_for_timeout(500)
        await live.play(par, "#bugboard", "a2a3")  # a waiting move, so black is on move again
        await cam.wait_for_timeout(800)

        await go_offline(cam)
        await cam.wait_for_timeout(600)
        # The capture, made by the only player who can feed our hand.
        ctx["capture_played"] = await live.play(mate, "#bugboard", "d5e4")
        await cam.wait_for_timeout(800)
        await go_online(cam)

        game = ctx["state"].games.get(game_id)
        ctx["server_fen_a"] = getattr(game.boards["a"], "fen", "") if game else ""

    elif name == "spectator_scrolls_back_then_a_move_arrives":
        """THE SAME QUESTION AS R2, ASKED OF A SPECTATOR.

        A spectator holds no seat — `isSpectator()` is simply "no seat on either board" — so the
        round page routes every board message through `updateBoardsAndClocksSpectors`, which has its
        own render gate: a bare `latestPly`. The player path was given a second condition on
        2026-09-07 (`decision.applyPosition && readerAtEnd`) and the spectator path was not, so a
        spectator who scrolls back through the move list should still be dragged forward when a move
        arrives — the half of the R2 regression that was left live.

        THE BED HAD NEVER OPENED A SPECTATOR WINDOW, which is why nothing caught it. This is that
        window.
        """
        watcher = ctx["watcher"]
        await _our_move_on_a(cam, ctx, "e2e4")
        await _opp_move_on_a(par, ctx, "e7e5")
        await cam.wait_for_timeout(500)
        await _our_move_on_a(cam, ctx, "g1f3")
        await cam.wait_for_timeout(1200)
        ctx.pop("our_move", None)

        # A SPECTATOR HOLDS NO SEAT — `mySeats()` returns the seats matching this window's own
        # username, so an empty array is the definition the client itself uses
        # (`isSpectator()` = no seat on either board). Reported rather than assumed, because a
        # window that failed to load as a spectator would make every check below vacuous.
        ctx["watcher_is_spectator"] = await watcher.evaluate(
            """() => {
                if (!document.querySelector('.round-app.bug')) return 'not the round page';
                if (!window.PB) return 'no PB';
                return PB.mySeats().length === 0 ? true : 'seated: ' + JSON.stringify(PB.mySeats());
            }"""
        )

        # The spectator steps back through the game.
        await watcher.evaluate(
            "() => { const a = document.activeElement; if (a && a.blur) a.blur(); }"
        )
        await watcher.keyboard.press("ArrowLeft")
        await watcher.wait_for_timeout(600)
        ctx["watcher_scrolled_back"] = await watcher.evaluate(OCCUPIED, "#mainboard")

        # A player moves while they are looking backwards.
        ctx["moved_while_watching"] = await _opp_move_on_a(par, ctx, "b8c6")
        await watcher.wait_for_timeout(2500)
        ctx["watcher_after_move"] = await watcher.evaluate(OCCUPIED, "#mainboard")

    elif name == "scroll_back_then_opponent_moves":
        """THE READER LOOKS BACK, AND A MOVE ARRIVES WHILE THEY ARE LOOKING.

        `this.ply` is the reader's CURSOR — `goPly()` writes it, and `goPly()` is what an arrow key
        or a click in the move list runs. But `place` classifies arriving messages against it, so
        scrolling back makes the next move look further ahead than it is.

        Not applying it is right: a reader examining an earlier ply should not be yanked forward,
        and that was always the behaviour. Saying "a move is missing between us and it" is not —
        nothing is missing. That warning is branch 2.1.3, added the same day, and this is the case
        it cannot tell apart from a real gap.
        """
        await _our_move_on_a(cam, ctx, "e2e4")
        await _opp_move_on_a(par, ctx, "e7e5")
        await cam.wait_for_timeout(500)
        await _our_move_on_a(cam, ctx, "g1f3")
        await cam.wait_for_timeout(800)
        ctx.pop("our_move", None)

        # The reader steps back through the game. Mousetrap ignores keys typed into an input, so
        # focus is moved off the chat box first.
        await cam.evaluate("() => { const a = document.activeElement; if (a && a.blur) a.blur(); }")
        await cam.keyboard.press("ArrowLeft")
        await cam.wait_for_timeout(500)
        ctx["scrolled_back_to"] = await cam.evaluate(OCCUPIED, "#mainboard")

        # Now somebody moves while they are still looking backwards.
        ctx["opp_moved_while_back"] = await _opp_move_on_a(par, ctx, "b8c6")
        await cam.wait_for_timeout(2000)
        ctx["warnings_while_back"] = await cam.evaluate(
            "() => (window.__warnings || []).filter(w => w.includes('[reconnect]'))"
        )
        # AND WAS THE READER YANKED FORWARD? Read from the PIECES: the scrolled-back position has
        # a knight still on g1; the latest has it on f3. A reader examining an earlier ply must
        # keep seeing it — that was always the behaviour and the old comment says so in as many
        # words ("potentially ruining his experience").
        ctx["board_after_opp_moved"] = await cam.evaluate(OCCUPIED, "#mainboard")

    elif name == "gate_survives_movelist_scroll":
        """THE GATE, AND WHETHER READING THE MOVE LIST DEFEATS IT.

        Branch 1.2.3 shuts a board by emptying its destination map, so nothing can be moved into a
        position that predates our own outstanding move. That is an OVERWRITE applied once, after
        the snapshot; `dests` is otherwise derived from the engine's legal moves alone. `goPly()`
        recomputes it — at `roundCtrl.ts:1197` — every time the reader lands back on the last ply.

        So this asks the cheapest possible question: does a player glancing at the move list while
        waiting for their move to be confirmed get their board back? No server message is involved.
        """
        hold = ctx["hold"]
        await _our_move_on_a(cam, ctx, "e2e4")  # lands: the hold skips it
        await _opp_move_on_a(par, ctx, "e7e5")  # lands
        await cam.wait_for_timeout(600)
        await _our_move_on_a(cam, ctx, "g1f3")  # HELD by the server, so never confirmed
        ctx["server_held_the_move"] = await hold.wait_until_holding()

        # A snapshot that predates the held move: branch 1.2.3, and the board should be shut.
        await go_offline(cam)
        await cam.wait_for_timeout(600)
        await go_online(cam)
        await wait_for_socket(cam)
        ctx["shut_after_snapshot"] = not await can_select(cam, "#mainboard", "d2")

        # THE READER LOOKS BACK THROUGH THE GAME AND RETURNS TO THE LATEST MOVE — the arrow keys,
        # which is `selectMove` -> `goPly` -> `setDests()` at roundCtrl.ts:1197. Driven by keyboard
        # rather than by clicking the move list, because this page renders no movelist element at
        # all (`movelistFound` is False in every probe the bed has ever taken) — the keys reach the
        # same code and need no DOM. Mousetrap ignores keys typed into an input, so focus is moved
        # off the chat box first.
        await cam.evaluate("() => { const a = document.activeElement; if (a && a.blur) a.blur(); }")
        await cam.keyboard.press("ArrowLeft")
        await cam.wait_for_timeout(400)
        await cam.keyboard.press("ArrowRight")
        await cam.wait_for_timeout(600)
        ctx["scrolled"] = await cam.evaluate(
            "() => (window.PB ? PB.lastMove('#mainboard') : []).join('')"
        )
        ctx["shut_after_scroll"] = not await can_select(cam, "#mainboard", "d2")

        hold.release()
        await cam.wait_for_timeout(3000)

    elif name == "simul_two_queued":
        """A move outstanding on EACH board at once, which only a simul seating can produce.

        The camera holds both seats of team 1 — board A white and board B black — so it is already
        the simul player this scenario needs; the entry that declared this blocked said the bed
        "seats one user per team", which describes a bed we do not have. Board A is the camera's
        move from the first second; board B becomes its move as soon as the partner, who is white
        there, has played. Offline after that, both boards invite a move and both go into the cache,
        which is the only way `pendingMoves` ever holds two entries at once.
        """
        await live.play(par, "#bugboard", "e2e4")  # hands board B's turn to the camera
        await cam.wait_for_timeout(800)
        await go_offline(cam)
        await cam.wait_for_timeout(600)
        queued = []
        if await live.play(cam, "#mainboard", "e2e4"):
            queued.append("e2e4")
        if await live.play(cam, "#bugboard", "e7e5"):
            queued.append("e7e5")
        ctx["queued_moves"] = queued
        await go_online(cam)

    elif name == "offline_past_abandon":
        await go_offline(cam)
        await cam.wait_for_timeout(66000)  # ABANDON_TIMEOUT 30s, doubled for base >= 3
        await go_online(cam)

    else:
        raise KeyError(f"no staging recipe named {name}")

    await wait_for_socket(cam)
    return ctx
