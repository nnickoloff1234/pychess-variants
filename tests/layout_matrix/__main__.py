"""Entry point: start a server, play one game, walk the matrix, write the report.

    env PYTHONPATH=server:tests uv run python -m layout_matrix --out /tmp/layout-matrix

Self-contained on purpose — its own aiohttp app on a mongomock database, with two cookie-seeded
users — so that two runs are comparable. It does NOT drive the four-window docker harness: that one
is for working on a problem you already know about.
"""

import argparse
import asyncio
import time
from datetime import UTC, datetime
from pathlib import Path

import test_logger
from aiohttp.test_utils import TestServer
from glicko2.glicko2 import new_default_perf_map
from mongomock_motor import AsyncMongoMockClient
from playwright.async_api import async_playwright
from pychess_global_app_state_utils import get_app_state
from user import User
from variants import VARIANTS

from server import make_app

from . import driver, report
from .viewports import CASES, VIEWPORTS, assert_spans_thresholds

CAMERA = "MatrixCamera"
PARTNER = "MatrixPartner"


async def run(out_dir: Path, viewports, cases) -> Path:
    assert_spans_thresholds()
    shots = out_dir / "shots"
    shots.mkdir(parents=True, exist_ok=True)

    test_logger.init_test_logger()
    app = make_app(db_client=AsyncMongoMockClient(tz_aware=True), simple_cookie_storage=True)
    server = TestServer(app, host="127.0.0.1")
    await server.start_server()
    base_url = f"http://{server.host}:{server.port}"
    app_state = get_app_state(app)
    for name in (CAMERA, PARTNER):
        app_state.users[name] = User(app_state, username=name, perfs=new_default_perf_map(VARIANTS))

    rows: list[driver.Row] = []
    started = time.perf_counter()

    def note(row: driver.Row) -> None:
        rows_done = len(rows)
        flag = "!" if row.error or (row.facts.get("failures") if row.facts else None) else " "
        print(f"  {flag} {rows_done:>3}/{total} {row.key}", flush=True)

    total = sum(
        len([z for z in ([(100, 100), (100, 50), (50, 50)] if v.zooms else [(100, 100)])])
        for v in viewports
        for _ in cases
    )

    async with async_playwright() as playwright:
        browser = await driver._launch(playwright)
        try:
            camera = await driver._page_for_user(browser, base_url, CAMERA)
            partner = await driver._page_for_user(browser, base_url, PARTNER)

            print("starting the game ...", flush=True)
            url = await driver.start_game(camera, partner)
            game_id = url.rstrip("/").split("/")[-1]
            print(f"  game {game_id}", flush=True)
            await driver.opening_moves(camera, partner)

            cdp = await camera.context.new_cdp_session(camera)

            live = [c for c in cases if c.state == "live"]
            over = [c for c in cases if c.state == "over"]
            analysis = [c for c in cases if c.state == "analysis"]

            for case in live:
                print(f"{case.key}: {case.describes}", flush=True)
                rows += await driver.walk(camera, cdp, case, shots, viewports, note)

            if over or analysis:
                print("resigning ...", flush=True)
                await driver.resign(camera, partner)
            for case in over:
                print(f"{case.key}: {case.describes}", flush=True)
                rows += await driver.walk(camera, cdp, case, shots, viewports, note)

            if analysis:
                await camera.goto(f"{base_url}/{game_id}?ply=10", wait_until="domcontentloaded")
                await camera.wait_for_selector(
                    "#mainboard cg-board", state="visible", timeout=30000
                )
            for case in analysis:
                print(f"{case.key}: {case.describes}", flush=True)
                rows += await driver.walk(camera, cdp, case, shots, viewports, note)
        finally:
            await browser.close()
            await server.close()

    meta = {
        "when": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "game": game_id,
        "seconds": round(time.perf_counter() - started, 1),
    }
    path = report.write(rows, out_dir, meta)
    failing = sum(1 for r in rows if r.error or (r.facts.get("failures") if r.facts else None))
    print(f"\n{len(rows)} rows, {failing} with a failing check, {meta['seconds']}s")
    print(f"report: {path}")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Bughouse layout matrix report")
    parser.add_argument("--out", type=Path, default=Path("/tmp/layout-matrix"))
    parser.add_argument(
        "--viewports", default="", help="comma-separated viewport keys; default is all 30"
    )
    parser.add_argument(
        "--cases", default="", help="comma-separated case keys; default is all four"
    )
    args = parser.parse_args()

    viewports = VIEWPORTS
    if args.viewports:
        wanted = {k.strip() for k in args.viewports.split(",")}
        viewports = [v for v in VIEWPORTS if v.key in wanted]
    cases = CASES
    if args.cases:
        wanted = {k.strip() for k in args.cases.split(",")}
        cases = [c for c in CASES if c.key in wanted]

    asyncio.run(run(args.out, viewports, cases))


if __name__ == "__main__":
    main()
