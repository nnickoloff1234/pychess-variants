"""Capture Chrome's accessibility tree for a list of pages.

This is the artifact a screen reader actually consumes: the browser's computed
accessibility tree, not the DOM. Nodes absent from it do not exist for a blind
user, whatever the HTML says.

Two modes:

  --cdp URL     attach to an already-running Chrome that was started with
                --remote-debugging-port. Use this when the pages need a logged-in
                session (lichess blind mode is stored against the account, so an
                anonymous capture can only ever see normal mode).

  --launch      start a private Chromium via Playwright. Enough for pychess,
                because `server.py -a` makes anonymous users behave as logged-in
                test users, and for any public page in its signed-out form.

For each page two files are written:

  <out>/<label>/<slug>.json   the exposed nodes, with name.sources and the
                              ignoredReasons of everything dropped
  <out>/<label>/<slug>.txt    an indented role/name outline, digit-normalised,
                              meant to be diffed by a11y_diff.py

Examples
--------
    # logged-in lichess, normal mode
    uv run python scripts/a11y_capture.py --cdp http://127.0.0.1:9222 \
        --out /tmp/ax --label lichess-normal \
        https://lichess.org/ https://lichess.org/training

    # same session, after flipping the hidden blind-mode toggle
    uv run python scripts/a11y_capture.py --cdp http://127.0.0.1:9222 \
        --out /tmp/ax --label lichess-blind --toggle-blind-mode https://lichess.org/ ...
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

# States worth carrying into the outline. Anything volatile (focused, busy) is
# left out so that two captures of the same page diff cleanly.
KEPT_PROPERTIES = (
    "expanded",
    "checked",
    "selected",
    "pressed",
    "disabled",
    "required",
    "invalid",
    "level",
    "live",
    "atomic",
    "relevant",
    "current",
    "modal",
    "multiselectable",
    "readonly",
    "setsize",
    "posinset",
)

DIGITS = re.compile(r"\d+")


def slugify(url: str) -> str:
    parsed = urlparse(url)
    path = (parsed.path or "/").strip("/")
    return re.sub(r"[^A-Za-z0-9._-]+", "_", path) or "index"


def _value(node: dict, key: str) -> str:
    holder = node.get(key)
    if isinstance(holder, dict):
        return holder.get("value") or ""
    return ""


def name_sources(node: dict) -> list[dict]:
    """Which mechanism produced the accessible name.

    This is the field that settles label audits: it distinguishes a name from
    aria-label, from a wrapping <label>, from the element's own contents, and
    from a `title` fallback -- which greps and DOM heuristics routinely confuse.
    """
    sources = (node.get("name") or {}).get("sources") or []
    out = []
    for source in sources:
        value = (source.get("value") or {}).get("value")
        if value in (None, ""):
            continue
        out.append(
            {
                "type": source.get("type"),
                "attribute": source.get("attribute"),
                "value": value,
                "superseded": bool(source.get("superseded")),
            }
        )
    return out


def properties(node: dict) -> dict:
    out = {}
    for prop in node.get("properties") or []:
        key = prop.get("name")
        if key in KEPT_PROPERTIES:
            out[key] = (prop.get("value") or {}).get("value")
    return out


def build_outline(nodes: list[dict]) -> tuple[list[str], dict]:
    """Walk the tree in document order, emitting only exposed nodes."""
    by_id = {n["nodeId"]: n for n in nodes}
    child_ids = {n["nodeId"]: n.get("childIds") or [] for n in nodes}
    referenced = {c for ids in child_ids.values() for c in ids}
    roots = [n["nodeId"] for n in nodes if n["nodeId"] not in referenced]

    lines: list[str] = []
    exposed: list[dict] = []

    def walk(node_id: str, depth: int) -> None:
        node = by_id.get(node_id)
        if node is None:
            return
        ignored = bool(node.get("ignored"))
        # An ignored node is not shown, but its children may still be exposed
        # (this is how role="presentation" and generic wrappers behave).
        next_depth = depth
        if not ignored:
            role = _value(node, "role")
            name = _value(node, "name")
            props = properties(node)
            flat = " ".join(f"{k}={v}" for k, v in sorted(props.items()))
            text = f"{'  ' * depth}{role}"
            if name:
                text += f' "{DIGITS.sub("#", name)}"'
            if flat:
                text += f"  [{DIGITS.sub('#', flat)}]"
            lines.append(text)
            exposed.append(
                {
                    "role": role,
                    "name": name,
                    "depth": depth,
                    "properties": props,
                    "nameSources": name_sources(node),
                }
            )
            next_depth = depth + 1
        for child in child_ids.get(node_id, []):
            walk(child, next_depth)

    for root in roots:
        walk(root, 0)
    return lines, {"exposed": exposed}


def summarise_ignored(nodes: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for node in nodes:
        if not node.get("ignored"):
            continue
        for reason in node.get("ignoredReasons") or []:
            key = reason.get("name") or "?"
            counts[key] = counts.get(key, 0) + 1
    return counts


async def capture(page, cdp, url: str, settle_ms: int) -> tuple[list[str], dict]:
    await page.goto(url, wait_until="domcontentloaded")
    # A live socket -- the lobby, a game in progress -- never goes idle, so the
    # timeout is the expected outcome there and the settle below is what covers it.
    with contextlib.suppress(PlaywrightTimeoutError):
        await page.wait_for_load_state("networkidle", timeout=8000)
    await page.wait_for_timeout(settle_ms)

    # NO CACHE, EVER. pychess serves its bundle and stylesheets unversioned and without
    # Cache-Control, so a capture taken after a rebuild will happily measure the PREVIOUS build and
    # report "no change". That produced three false negatives on 2026-09-27 before it was noticed.
    await cdp.send("Network.enable")
    await cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
    await cdp.send("Accessibility.enable")

    # WAIT FOR THE TREE TO STOP MOVING, rather than trusting a fixed settle. A page still building
    # itself yields a tree that is WRONG rather than empty -- the analysis page took ~5s to attach
    # its `main`, and at 2.5s the capture reported the landmark simply missing, which reads exactly
    # like a change that did not work. Sample until two consecutive reads agree.
    nodes = (await cdp.send("Accessibility.getFullAXTree"))["nodes"]
    for _ in range(12):
        await page.wait_for_timeout(750)
        again = (await cdp.send("Accessibility.getFullAXTree"))["nodes"]
        if len(again) == len(nodes):
            nodes = again
            break
        nodes = again
    lines, detail = build_outline(nodes)
    detail["url"] = url
    detail["title"] = await page.title()
    detail["totalNodes"] = len(nodes)
    detail["exposedCount"] = len(detail["exposed"])
    detail["ignoredReasons"] = summarise_ignored(nodes)
    return lines, detail


async def toggle_blind_mode(page) -> bool:
    """Submit lichess's hidden blind-mode form. Requires a logged-in session."""
    await page.goto("https://lichess.org/", wait_until="domcontentloaded")
    # The button is visually hidden off-viewport on purpose, so Playwright's
    # actionability check refuses a normal click. Submit the form directly.
    clicked = await page.evaluate(
        "() => { const b = document.querySelector('#blind-mode button');"
        " if (!b) return false; b.click(); return true; }"
    )
    if not clicked:
        return False
    await page.wait_for_timeout(3000)
    return "blind-mode" in (await page.locator("body").get_attribute("class") or "")


async def run(args: argparse.Namespace) -> int:
    out_dir = Path(args.out) / args.label
    out_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        if args.cdp:
            browser = await pw.chromium.connect_over_cdp(args.cdp)
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else await context.new_page()
            owns_browser = False
        else:
            browser = await pw.chromium.launch()
            context = await browser.new_context()
            page = await context.new_page()
            owns_browser = True

        if args.toggle_blind_mode:
            enabled = await toggle_blind_mode(page)
            print(f"blind mode enabled: {enabled}")
            if not enabled:
                print(
                    "  refused -- the flag lives on the account, so this needs a "
                    "logged-in session (see lichess-reference.md section 14)",
                    file=sys.stderr,
                )

        cdp = await context.new_cdp_session(page)
        for url in args.urls:
            try:
                lines, detail = await capture(page, cdp, url, args.settle_ms)
            except Exception as exc:  # noqa: BLE001 -- one bad page must not lose the batch
                print(
                    f"{url}\n  FAILED: {type(exc).__name__}: {exc}".split("\nCall log")[0],
                    file=sys.stderr,
                )
                continue
            slug = slugify(url)
            (out_dir / f"{slug}.txt").write_text("\n".join(lines) + "\n")
            (out_dir / f"{slug}.json").write_text(json.dumps(detail, indent=1))
            print(
                f"{url}\n  exposed={detail['exposedCount']:5d} "
                f"of {detail['totalNodes']:5d}  ignored={detail['ignoredReasons']}"
            )

        await cdp.detach()
        if owns_browser:
            await browser.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("urls", nargs="+")
    parser.add_argument("--out", required=True, help="output directory")
    parser.add_argument("--label", required=True, help="subdirectory for this run")
    parser.add_argument("--cdp", help="attach to a Chrome already on this CDP endpoint")
    parser.add_argument("--launch", action="store_true", help="launch a private Chromium instead")
    parser.add_argument("--toggle-blind-mode", action="store_true")
    parser.add_argument("--settle-ms", type=int, default=2500)
    args = parser.parse_args(argv)
    if not args.cdp and not args.launch:
        parser.error("pass --cdp URL or --launch")
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
