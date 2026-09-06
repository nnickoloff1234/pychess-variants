"""Run the reconnect scenario bed and print the checklist.

    env PYTHONPATH=server:tests uv run python -m reconnect_matrix
    env PYTHONPATH=server:tests uv run python -m reconnect_matrix --only N4,Q7

ONE GAME PER SCENARIO. Unlike the layout matrix, these scenarios change the game — they move, they
resign, they abandon — so each gets a fresh one. That is the cost of testing state transitions.
"""

import argparse
import asyncio
import json
import time
from pathlib import Path

import test_logger
from aiohttp.test_utils import TestServer
from glicko2.glicko2 import new_default_perf_map
from layout_matrix import driver as live
from mongomock_motor import AsyncMongoMockClient
from playwright.async_api import async_playwright
from pychess_global_app_state_utils import get_app_state
from user import User
from variants import VARIANTS

from server import make_app

from . import driver
from .scenarios import SCENARIOS

# A FRESH PAIR OF IDENTITIES PER SCENARIO. Reusing one pair leaves the previous game unfinished, and
# the lobby then greets the next scenario with a confirm dialog that intercepts the create button —
# the setup fails and the failure looks like the scenario's. Cheap to avoid, expensive to diagnose.
CAMERA = "ReconCam"
PARTNER = "ReconPar"


def server_record(state, game_id: str) -> tuple[list[str], dict]:
    """What the SERVER holds for this game, which is the oracle every check is measured against.

    Available because this bed runs the application in-process. A bed that had to ask the client
    what the client had received could never separate "the move survived" from "the client thinks it
    did".
    """
    game = state.games.get(game_id)
    if game is None:
        return [], {}
    moves, per_board = [], {}
    for step in getattr(game, "steps", []):
        move = step.get("move")
        if move is None:
            continue
        moves.append(move)
        board = step.get("boardName")
        if board is not None:
            per_board[board] = move
    return moves, per_board


async def run_one(browser, base_url, scenario, names, state) -> driver.Result:
    cam = par = None
    try:
        cam = await live._page_for_user(browser, base_url, names[0], before_load=driver.install_spy)
        par = await live._page_for_user(browser, base_url, names[1], before_load=driver.install_spy)
        url = await live.start_game(cam, par)
        game_id = url.rstrip("/").split("/")[-1]
        await driver.install_pb(cam)
        await driver.install_pb(par)

        ctx = {"game_id": game_id, "seating": await driver._seating(cam)}
        before = await driver.probe(cam, game_id)

        await driver.stage(scenario.stage, cam, par, game_id, ctx)

        after = await driver.probe(cam, game_id)
        moves, per_board = server_record(state, game_id)
        ctx["server_moves"] = moves
        ctx["server_last_on_our_board"] = per_board.get(
            "a" if ctx["our_board"] == "#mainboard" else "b"
        )
        ctx["playable"] = await driver.can_select(cam, "#mainboard", "d2")
        ctx["partner_clocks"] = await par.evaluate("() => window.PB ? PB.clocks() : null")

        checks = {}
        for name in scenario.expect:
            ok, detail = driver.CHECKS[name](before, after, ctx)
            checks[name] = {"ok": ok, "detail": detail}

        verdict = [c["ok"] for c in checks.values() if c["ok"] is not None]
        status = "PASS" if verdict and all(verdict) else ("FAIL" if verdict else "NO-CHECKS")
        return driver.Result(
            scenario,
            status,
            checks,
            {"before": before, "after": after, "ctx_playable": ctx["playable"]},
        )
    except Exception as err:  # noqa: BLE001 - one bad scenario must not hide the rest
        return driver.Result(scenario, "ERROR", {}, {}, f"{type(err).__name__}: {err}")
    finally:
        for page in (cam, par):
            if page is not None:
                try:
                    await page.context.set_offline(False)
                    await page.context.close()
                except Exception as err:  # noqa: BLE001 - teardown must not mask a result
                    print(f"       (teardown: {type(err).__name__})", flush=True)


async def run(only, out_path: Path | None):
    test_logger.init_test_logger()
    app = make_app(db_client=AsyncMongoMockClient(tz_aware=True), simple_cookie_storage=True)
    server = TestServer(app, host="127.0.0.1")
    await server.start_server()
    base_url = f"http://{server.host}:{server.port}"
    state = get_app_state(app)

    def identities(scenario_id: str) -> tuple[str, str]:
        pair = (f"{CAMERA}{scenario_id}", f"{PARTNER}{scenario_id}")
        for name in pair:
            if name not in state.users:
                state.users[name] = User(state, username=name, perfs=new_default_perf_map(VARIANTS))
        return pair

    wanted = [s for s in SCENARIOS if not only or s.id in only]
    results = []
    started = time.perf_counter()

    async with async_playwright() as pw:
        browser = await live._launch(pw)
        try:
            for scenario in wanted:
                if scenario.blocked:
                    results.append(driver.Result(scenario, "BLOCKED", note=scenario.blocked))
                    print(f"  BLOCKED {scenario.id}  {scenario.title}", flush=True)
                    continue
                print(f"  running {scenario.id}  {scenario.title} ...", flush=True)
                result = await run_one(browser, base_url, scenario, identities(scenario.id), state)
                results.append(result)
                print(f"  {result.status:<9} {scenario.id}", flush=True)
        finally:
            await browser.close()
            await server.close()

    print(
        f"\n{'=' * 78}\nRECONNECT SCENARIO CHECKLIST     {round(time.perf_counter() - started)}s\n{'=' * 78}"
    )
    for r in results:
        mark = {
            "PASS": "ok  ",
            "FAIL": "FAIL",
            "BLOCKED": "--  ",
            "ERROR": "ERR ",
            "NO-CHECKS": "?   ",
        }[r.status]
        print(f"{mark} {r.scenario.id:<4} {r.scenario.title[:58]:<58} {r.scenario.history}")
        if r.note:
            print(f"       {r.note}")
        for name, c in r.checks.items():
            state_str = {True: "ok", False: "FAILED", None: "skipped"}[c["ok"]]
            print(f"       {name:<16} {state_str:<8} {c['detail'][:90]}")
    counts = {}
    for r in results:
        counts[r.status] = counts.get(r.status, 0) + 1
    print("\n" + "  ".join(f"{k}={v}" for k, v in sorted(counts.items())))

    if out_path is not None:
        out_path.write_text(
            json.dumps(
                [
                    {
                        "id": r.scenario.id,
                        "title": r.scenario.title,
                        "history": r.scenario.history,
                        "status": r.status,
                        "note": r.note,
                        "checks": r.checks,
                        "facts": r.facts,
                    }
                    for r in results
                ],
                indent=1,
                default=str,
            )
        )
        print(f"\nfacts: {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="", help="comma-separated scenario ids")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    asyncio.run(run(only, args.out))


if __name__ == "__main__":
    main()
