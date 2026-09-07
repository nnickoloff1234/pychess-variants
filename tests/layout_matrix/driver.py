"""Walks the matrix and captures a row per combination.

ONE GAME SERVES THE WHOLE RUN. Bughouse needs four seats, so a game costs a seek, four joins and a
redirect; a game per combination would multiply that across 264 rows and put a flaky seat join on
every one of them instead of on one. The cases are therefore ordered around a single game: every
during-game case at every viewport, then the resignation, then the after-game case, then analysis.

THE PARTNER CONTEXT IS NEVER TOUCHED once the game starts. A disconnected client ends a bughouse
game after about a minute and this walk takes several, so only the camera is resized or navigated.
"""

import json
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path

from playwright.async_api import Error as PlaywrightError

from .viewports import BASE_ZOOM, VIEWPORTS, ZOOMS, Case, Viewport

PROBE = (Path(__file__).parent / "probe.js").read_text()

# Time control index 30 on the slider is 60 minutes: nothing flags mid-run.
MINUTES_INDEX = 30
SETTLE_MAX_FRAMES = 60


def _stale_fields(before: dict, after: dict) -> dict:
    """What the nudge changed: the decisions, not the pixels."""
    if not (before.get("ok") and after.get("ok")):
        return {}
    fields = {
        "home": (before["home"], after["home"]),
        "drops": (",".join(before["drops"]), ",".join(after["drops"])),
        "preset button": (before["published"]["presetButton"], after["published"]["presetButton"]),
        "preset gap": (before["published"]["presetGap"], after["published"]["presetGap"]),
    }
    return {k: v for k, v in fields.items() if v[0] != v[1]}


@dataclass
class Row:
    viewport: Viewport
    case: Case
    zoom: tuple[int, int]
    shot: str | None = None
    facts: dict = field(default_factory=dict)
    error: str | None = None

    @property
    def key(self) -> str:
        return f"{self.viewport.key}-{self.case.key}-{self.zoom[0]}x{self.zoom[1]}"


async def _launch(playwright):
    try:
        return await playwright.chromium.launch(headless=True)
    except PlaywrightError as err:
        if "Executable doesn't exist" not in str(err):
            raise
        system_chromium = shutil.which("chromium-browser") or shutil.which("chromium")
        if not system_chromium:
            raise
        return await playwright.chromium.launch(headless=True, executable_path=system_chromium)


async def _page_for_user(browser, base_url: str, username: str, before_load=None):
    context = await browser.new_context()
    if before_load is not None:
        await before_load(context)
    await context.add_init_script("localStorage.seek_variant = 'bughouse';")
    session_data = {"session": {"user_name": username}, "created": int(time.time())}
    await context.add_cookies(
        [{"name": "AIOHTTP_SESSION", "value": json.dumps(session_data), "url": base_url}]
    )
    page = await context.new_page()
    await page.goto(base_url + "/")
    await page.wait_for_selector(".lobby-button", state="visible")
    keep_all = page.get_by_text("Keep all variants")
    if await keep_all.count() > 0:
        await keep_all.click()
    return page


async def start_game(camera, partner) -> str:
    """The simul seek from `tests/test_bughouse_lobby_flow.py`: four seats from two contexts."""
    await camera.wait_for_timeout(1000)  # let the lobby websockets settle
    await camera.locator(".lobby-button").first.click()
    await camera.wait_for_selector("#variant", state="visible")
    await camera.evaluate(
        """(idx) => {
            const min = document.getElementById('min');
            if (min) { min.value = String(idx); min.dispatchEvent(new Event('input', {bubbles:true})); }
        }""",
        MINUTES_INDEX,
    )
    await camera.locator("#color-button-group button.icon-white").click()

    # the camera sits the second seat of its own team, so it holds BOTH of team 1's seats
    await camera.wait_for_selector(".bug-join-button", state="visible")
    await camera.locator(".bug-join-button").first.click()

    await partner.wait_for_function(
        "() => document.querySelectorAll('.bug-join-button').length === 2"
    )
    await partner.locator(".bug-join-button").nth(0).click()
    await partner.wait_for_function(
        "() => document.querySelectorAll('.bug-join-button').length === 1"
    )
    await partner.locator(".bug-join-button").first.click()

    for page in (camera, partner):
        await page.wait_for_url(
            lambda u: str(u).rstrip("/").split("/")[-1].isalnum(), timeout=30000
        )
        await page.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
    return camera.url


async def start_game_three(us, mate, opp) -> str:
    """Four seats from THREE contexts: us, our TEAMMATE, and the opponent pair in one window.

    The two-context seating puts a whole team in one browser, so disconnecting "us" also
    disconnects our teammate — and a teammate is the only player who can put a piece in our pocket.
    Splitting the team across two windows is what makes that testable; the opposing pair can stay
    doubled up in one window because nothing asks them to act while we are away.

    Seats are claimed by clicking the join buttons in order, and the FIRST one offered after the
    seek is created is the creator's own partner seat — which is exactly the one the two-context
    version has the creator take for itself. Here the teammate takes it instead.
    """
    await us.wait_for_timeout(1000)
    await us.locator(".lobby-button").first.click()
    await us.wait_for_selector("#variant", state="visible")
    await us.evaluate(
        """(idx) => {
            const min = document.getElementById('min');
            if (min) { min.value = String(idx); min.dispatchEvent(new Event('input', {bubbles:true})); }
        }""",
        MINUTES_INDEX,
    )
    await us.locator("#color-button-group button.icon-white").click()

    await mate.wait_for_function("() => document.querySelectorAll('.bug-join-button').length === 3")
    await mate.locator(".bug-join-button").first.click()

    await opp.wait_for_function("() => document.querySelectorAll('.bug-join-button').length === 2")
    await opp.locator(".bug-join-button").nth(0).click()
    await opp.wait_for_function("() => document.querySelectorAll('.bug-join-button').length === 1")
    await opp.locator(".bug-join-button").first.click()

    for page in (us, mate, opp):
        await page.wait_for_url(
            lambda u: str(u).rstrip("/").split("/")[-1].isalnum(), timeout=30000
        )
        await page.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)
    return us.url


SQUARE_XY = """
([sel, square]) => {
    const wrap = document.querySelector(sel + ' .cg-wrap');
    const board = document.querySelector(sel + ' cg-board');
    if (!board) return null;
    const r = board.getBoundingClientRect();
    const s = r.width / 8;
    const black = wrap.classList.contains('orientation-black');
    const f = square.charCodeAt(0) - 97;
    const k = parseInt(square[1], 10) - 1;
    const col = black ? 7 - f : f;
    const row = black ? k : 7 - k;
    return { x: r.x + (col + 0.5) * s, y: r.y + (row + 0.5) * s };
}
"""


async def play(page, board_sel: str, uci: str) -> bool:
    """One move by clicking two squares. Real mouse events: chessground ignores synthetic ones."""
    for square in (uci[:2], uci[2:4]):
        at = await page.evaluate(SQUARE_XY, [board_sel, square])
        if at is None:
            return False
        await page.mouse.click(at["x"], at["y"])
        await page.wait_for_timeout(120)
    await page.wait_for_timeout(250)
    return True


async def opening_moves(camera, partner) -> None:
    """Enough for a movelist and a non-empty pocket, on both boards.

    Whichever context holds the seat on move plays it; the pair is tried in both, because which
    team got which colour depends on the seek and is not worth asserting here.
    """
    for board in ("#mainboard", "#bugboard"):
        for uci in ("e2e4", "e7e5", "g1f3", "g8f6", "f3e5"):
            for page in (camera, partner):
                if await play(page, board, uci):
                    break


async def resign(camera, partner) -> None:
    """Bughouse resigns by TEAM, so the offer may need a second click to confirm."""
    for page in (camera, camera, partner):
        button = page.locator("button", has_text="Resign").first
        if await button.count() == 0:
            continue
        try:
            await button.click(timeout=2000)
        except PlaywrightError:
            pass
        try:
            await camera.wait_for_selector(".round-app.bug.game-over", timeout=5000)
            return
        except PlaywrightError:
            continue


async def set_zoom(page, zoom: tuple[int, int]) -> None:
    """Zoom is a persisted NumberSettings, so it is seeded and the page reloaded.

    Grouped by zoom in the walk below, which is why a reload here costs three per phase rather than
    one per row. The board family is read off the page rather than assumed: the key is
    `<family>-zoom-<column>`.
    """
    await page.evaluate(
        """([left, right]) => {
            const sel = document.querySelector('selection#mainboard');
            const family = sel ? sel.classList[0] : 'standard8x8';
            localStorage[family + '-zoom-a'] = String(left);
            localStorage[family + '-zoom-b'] = String(right);
        }""",
        list(zoom),
    )
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_selector("#mainboard cg-board", state="visible", timeout=30000)


async def select_tab(page, label: str) -> None:
    tab = page.locator('[role="tab"]', has_text=label).first
    if await tab.count() > 0:
        try:
            await tab.click(timeout=2000)
        except PlaywrightError:
            pass


NUDGE = """
async () => {
    const app = document.querySelector('.round-app.bug, .analysis-app.bug');
    if (app === null) return;
    // A resize of an OBSERVED element, which is the only thing the placement code listens to.
    // One pixel, put back immediately: enough to make every observer fire, too little to change
    // any decision that is not already wrong.
    app.style.paddingBottom = '1px';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    app.style.paddingBottom = '';
}
"""


async def apply_viewport(page, cdp, viewport: Viewport) -> None:
    """CDP rather than `set_viewport_size`, because the DEVICE PIXEL RATIO is what a new context
    would otherwise be needed for — and a new context is a new user, which is a new seat."""
    await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": viewport.width,
            "height": viewport.height,
            "deviceScaleFactor": viewport.dpr,
            "mobile": viewport.kind != "desktop",
        },
    )
    await settle(page)


SETTLE_SIGNATURE = """
async (max) => {
    const app = document.querySelector('.round-app.bug, .analysis-app.bug');
    if (app === null) return 'no-app';
    const length = prop => {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute;visibility:hidden;height:0;width:var(' + prop + ')';
        app.appendChild(d);
        const w = d.getBoundingClientRect().width;
        d.remove();
        return Math.round(w * 100);
    };
    const sample = () =>
        [...app.classList].sort().join(' ') + '|' +
        getComputedStyle(app).gridTemplateRows + '|' +
        [length('--bug-preset-btn'), length('--bug-preset-gap'), length('--bug-own-sq')].join(',');
    let previous = null;
    let stable = 0;
    for (let i = 0; i < max; i++) {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const now = sample();
        stable = now === previous ? stable + 1 : 0;
        previous = now;
        if (stable >= 2) return { settled: true, frames: i + 1 };
    }
    return { settled: false, frames: max };
}
"""


async def settle(page) -> dict:
    """Wait for the layout to stop moving, rather than for a fixed number of frames.

    A VIEWPORT CHANGE IS NOT ONE PASS. It reaches the layout through several generations of
    observer: the body resize publishes the squares and the home, the home changes a class, the
    class moves the parts, moving the parts publishes the button size, and that publishes the gap.
    Six frames caught some of that and not all of it — measured, the same viewport at the same zoom
    reported a 41.86px button in one run and 61px in another, differing only in which viewport came
    before it. A survey whose facts depend on the order it walked is not a survey.

    Settled means the arrangement and the published sizes have been identical for three consecutive
    frame pairs. Reported, not assumed: an unsettled row says so in its facts.
    """
    return await page.evaluate(SETTLE_SIGNATURE, SETTLE_MAX_FRAMES)


async def capture(page, cdp, row: Row, shots_dir: Path) -> Row:
    try:
        await apply_viewport(page, cdp, row.viewport)
        await select_tab(page, row.case.tab)
        settled = await settle(page)

        # THE STATE AFTER A VIEWPORT CHANGE IS NOT ALWAYS THE STATE THE VIEWPORT IMPLIES.
        # Measured: the same viewport, case and zoom published a 41.86px preset button in one run
        # and 61px in another, differing only in which viewport was visited before it — and the page
        # reported itself SETTLED in both. It had simply not recomputed, so it was stable at
        # whatever the previous viewport left behind.
        # So the row is probed twice: once as the walk arrives, and again after an observed element
        # is nudged. The SECOND is recorded, because it is the state the viewport actually implies
        # and it is the same whichever viewport came before. A difference between the two is not
        # noise to be smoothed away — it is a finding, and it is reported as one.
        before = await page.evaluate(PROBE)
        await page.evaluate(NUDGE)
        await settle(page)
        row.facts = await page.evaluate(PROBE)

        if isinstance(settled, dict):
            row.facts["settled"] = settled
            if not settled.get("settled"):
                row.facts.setdefault("failures", []).append(
                    f"layout never settled: still moving after {settled['frames']} frames"
                )
        stale = _stale_fields(before, row.facts)
        if stale:
            row.facts["staleUntilNudged"] = stale
            row.facts.setdefault("failures", []).append(
                "arrangement was stale after the viewport change and only recomputed when nudged: "
                + ", ".join(f"{k} {v[0]} -> {v[1]}" for k, v in stale.items())
            )
        name = f"{row.key}.png"
        await page.screenshot(path=str(shots_dir / name))
        row.shot = name
    # DELIBERATELY BLIND. The matrix is a survey: one combination that throws — a viewport the
    # browser refuses, a selector that is not on this page, a probe that trips over a state nobody
    # anticipated — must not hide the twenty rows after it. The error is recorded ON the row, so it
    # is reported rather than swallowed.
    except Exception as err:  # noqa: BLE001
        row.error = f"{type(err).__name__}: {err}"
    return row


async def walk(page, cdp, case: Case, shots_dir: Path, viewports=None, on_row=None) -> list[Row]:
    """One case across every viewport, grouped by zoom so a reload is paid three times, not 30."""
    rows: list[Row] = []
    for zoom in ZOOMS:
        targets = [v for v in (viewports or VIEWPORTS) if v.zooms or zoom == BASE_ZOOM]
        if not targets:
            continue
        await set_zoom(page, zoom)
        await select_tab(page, case.tab)
        for viewport in targets:
            row = await capture(page, cdp, Row(viewport, case, zoom), shots_dir)
            rows.append(row)
            if on_row is not None:
                on_row(row)
    return rows
