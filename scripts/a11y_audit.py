"""Audit one accessibility-tree capture for the defects that matter to a screen reader.

Companion to a11y_capture.py (which produces the trees) and a11y_diff.py (which
compares two of them). This one answers "what is wrong with this page as it
stands", which is what you want before changing anything.

What it reports, in rough order of how badly it hurts:

  unnamed        interactive nodes announced as a bare "button" / "link"
  title-only     named solely by a `title` attribute -- a last-resort fallback
                 that is invisible to touch and suppressed by some setups
  icon glyphs    Private Use Area codepoints sitting inside an accessible name,
                 i.e. an icon font the screen reader will try to pronounce
  headings       the outline, plus missing h1 and skipped levels
  landmarks      banner / navigation / main / contentinfo / search
  live regions   what will actually announce on its own

Example
-------
    uv run python scripts/a11y_audit.py /tmp/ax/pychess
    uv run python scripts/a11y_audit.py /tmp/ax/pychess --page index --verbose
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

INTERACTIVE = {
    "button",
    "link",
    "textbox",
    "checkbox",
    "radio",
    "combobox",
    "listbox",
    "slider",
    "switch",
    "tab",
    "menuitem",
    "searchbox",
    "spinbutton",
}

LANDMARKS = {
    "banner",
    "navigation",
    "main",
    "contentinfo",
    "complementary",
    "search",
    "form",
    "region",
}

# Private Use Area -- where icon fonts live.
PUA = re.compile(r"[-]")


def parents(exposed: list[dict]) -> list[dict | None]:
    """Nearest enclosing exposed node, derived from the depth column."""
    out: list[dict | None] = []
    stack: list[dict] = []
    for node in exposed:
        while stack and stack[-1]["depth"] >= node["depth"]:
            stack.pop()
        out.append(stack[-1] if stack else None)
        stack.append(node)
    return out


def describe(node: dict, parent: dict | None) -> str:
    where = ""
    if parent:
        pname = PUA.sub("", parent["name"]).strip()
        where = f"  (inside {parent['role']}" + (f' "{pname[:30]}"' if pname else "") + ")"
    return f"{node['role']}{where}"


def title_only(node: dict) -> bool:
    live = [s for s in node["nameSources"] if not s["superseded"]]
    return bool(live) and all(s["attribute"] == "title" for s in live)


def audit(path: Path, verbose: bool) -> dict:
    detail = json.loads(path.read_text())
    exposed = detail["exposed"]
    pars = parents(exposed)

    interactive = [(n, p) for n, p in zip(exposed, pars) if n["role"] in INTERACTIVE]
    unnamed = [(n, p) for n, p in interactive if not n["name"].strip()]
    titled = [(n, p) for n, p in interactive if n["name"].strip() and title_only(n)]
    glyphs = [(n, p) for n, p in zip(exposed, pars) if PUA.search(n["name"] or "")]
    headings = [n for n in exposed if n["role"] == "heading"]
    landmarks = [n for n in exposed if n["role"] in LANDMARKS]
    live = [n for n in exposed if n["properties"].get("live") not in (None, "off")]
    images = [
        (n, p)
        for n, p in zip(exposed, pars)
        if n["role"] in ("image", "img") and not n["name"].strip()
    ]

    print(f"\n{'=' * 70}\n{path.stem}   {detail['url']}")
    print(
        f"  exposed {detail['exposedCount']} of {detail['totalNodes']}   ignored {detail['ignoredReasons']}"
    )
    print(
        f"  interactive {len(interactive)} | UNNAMED {len(unnamed)} | title-only {len(titled)}"
        f" | icon-glyph names {len(glyphs)} | headings {len(headings)}"
        f" | landmarks {len(landmarks)} | live {len(live)} | unnamed images {len(images)}"
    )

    if unnamed:
        print(f"  -- UNNAMED interactive ({len(unnamed)}) --")
        for node, parent in unnamed if verbose else unnamed[:12]:
            print(f"     {describe(node, parent)}")
        if not verbose and len(unnamed) > 12:
            print(f"     ... and {len(unnamed) - 12} more (--verbose)")

    if titled:
        print(f"  -- named by TITLE only ({len(titled)}) --")
        for node, parent in titled[:8]:
            print(f'     {node["role"]} "{node["name"][:40]}"')

    if glyphs:
        print(f"  -- icon glyph inside the NAME ({len(glyphs)}) --")
        for node, _ in glyphs[:8]:
            shown = node["name"].replace("\n", " ")[:44]
            codes = " ".join(f"U+{ord(c):04X}" for c in PUA.findall(node["name"])[:3])
            print(f'     {node["role"]:10s} "{shown}"   {codes}')

    levels = [h["properties"].get("level") for h in headings]
    if headings:
        print(f"  -- heading outline ({len(headings)}) --")
        if 1 not in levels:
            print("     !! no level-1 heading")
        shown = headings if verbose else headings[:14]
        for h in shown:
            lvl = h["properties"].get("level") or "?"
            print(f"     h{lvl} {PUA.sub('', h['name'])[:56]}")
        if not verbose and len(headings) > 14:
            print(f"     ... and {len(headings) - 14} more (--verbose)")
    else:
        print("  -- NO HEADINGS AT ALL --")

    print(f"  -- landmarks -- {', '.join(sorted({n['role'] for n in landmarks})) or 'none'}")
    if live:
        print("  -- live regions --")
        for n in live:
            print(
                f"     {n['role']:10s} live={n['properties'].get('live')} "
                f'atomic={n["properties"].get("atomic")} "{n["name"][:30]}"'
            )

    return {
        "page": path.stem,
        "unnamed": len(unnamed),
        "title_only": len(titled),
        "glyphs": len(glyphs),
        "headings": len(headings),
        "live": len(live),
        "interactive": len(interactive),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("capture", type=Path, help="a label directory from a11y_capture.py")
    parser.add_argument("--page", help="only this page slug")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    files = sorted(args.capture.glob("*.json"))
    if args.page:
        files = [f for f in files if f.stem == args.page]

    rows = [audit(f, args.verbose) for f in files]

    print(f"\n{'=' * 70}\nSUMMARY  {args.capture}")
    head = f"  {'page':24s} {'inter':>6s} {'unnamed':>8s} {'title':>6s} {'glyph':>6s} {'head':>5s} {'live':>5s}"
    print(head)
    for r in rows:
        print(
            f"  {r['page'][:24]:24s} {r['interactive']:6d} {r['unnamed']:8d} "
            f"{r['title_only']:6d} {r['glyphs']:6d} {r['headings']:5d} {r['live']:5d}"
        )
    totals = {
        k: sum(r[k] for r in rows)
        for k in ("interactive", "unnamed", "title_only", "glyphs", "headings", "live")
    }
    print(
        f"  {'TOTAL':24s} {totals['interactive']:6d} {totals['unnamed']:8d} "
        f"{totals['title_only']:6d} {totals['glyphs']:6d} {totals['headings']:5d} {totals['live']:5d}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
