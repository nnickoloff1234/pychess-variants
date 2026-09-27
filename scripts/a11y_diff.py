"""Diff two accessibility-tree captures produced by a11y_capture.py.

Three comparisons this is meant for:

  * pychess before a change vs after   -- proves an improvement, catches regressions
  * pychess vs lichess                 -- are we behind on the equivalent page?
  * lichess normal vs lichess blind    -- exactly what a mode buys, node by node

Because the two sides are often different sites, the report leads with the
counts that survive that -- exposed nodes, unnamed interactive nodes, heading
outline -- and only then shows the line diff, which is most useful when both
sides are the same page.

Example
-------
    uv run python scripts/a11y_diff.py /tmp/ax/lichess-normal /tmp/ax/lichess-blind
"""

from __future__ import annotations

import argparse
import difflib
import json
from pathlib import Path

# Roles a user is meant to operate. An unnamed one is announced as bare
# "button" / "link" and is the single most common real defect.
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

HEADING_ROLES = {"heading"}


def load(side: Path) -> dict[str, dict]:
    return {p.stem: json.loads(p.read_text()) for p in sorted(side.glob("*.json"))}


def stats(detail: dict) -> dict:
    exposed = detail["exposed"]
    interactive = [n for n in exposed if n["role"] in INTERACTIVE]
    unnamed = [n for n in interactive if not n["name"].strip()]
    headings = [n for n in exposed if n["role"] in HEADING_ROLES]
    titled_only = [
        n
        for n in interactive
        if n["name"].strip()
        and any(
            s["type"] == "attribute" and s["attribute"] == "title" and not s["superseded"]
            for s in n["nameSources"]
        )
    ]
    live = [n for n in exposed if n["properties"].get("live") not in (None, "off")]
    return {
        "exposed": len(exposed),
        "interactive": len(interactive),
        "unnamed": len(unnamed),
        "named_by_title_only": len(titled_only),
        "headings": len(headings),
        "live_regions": len(live),
        "_unnamed_nodes": unnamed,
        "_headings": headings,
    }


def row(label: str, a, b) -> str:
    mark = "" if a == b else "   <-- differs"
    return f"  {label:22s} {a!s:>7s}  {b!s:>7s}{mark}"


def report(name: str, a: dict, b: dict, show_diff: bool, context: int) -> None:
    sa, sb = stats(a), stats(b)
    print(f"\n=== {name}")
    print(f"  {'':22s} {'A':>7s}  {'B':>7s}")
    for key in (
        "exposed",
        "interactive",
        "unnamed",
        "named_by_title_only",
        "headings",
        "live_regions",
    ):
        print(row(key, sa[key], sb[key]))

    for side, st in (("A", sa), ("B", sb)):
        if st["_unnamed_nodes"]:
            roles = sorted({n["role"] for n in st["_unnamed_nodes"]})
            print(f"  unnamed in {side}: {', '.join(roles)}")

    ha = [h["name"] for h in sa["_headings"]]
    hb = [h["name"] for h in sb["_headings"]]
    if ha != hb:
        only_b = [h for h in hb if h not in ha]
        only_a = [h for h in ha if h not in hb]
        if only_b:
            print(f"  headings only in B: {only_b}")
        if only_a:
            print(f"  headings only in A: {only_a}")

    if show_diff:
        la = (Path(a["_side"]) / f"{a['_stem']}.txt").read_text().splitlines()
        lb = (Path(b["_side"]) / f"{b['_stem']}.txt").read_text().splitlines()
        delta = list(difflib.unified_diff(la, lb, fromfile="A", tofile="B", n=context, lineterm=""))
        if delta:
            print("  --- outline diff ---")
            for line in delta:
                print("  " + line)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("side_a", type=Path)
    parser.add_argument("side_b", type=Path)
    parser.add_argument("--diff", action="store_true", help="also show the outline diff")
    parser.add_argument("--context", type=int, default=2)
    parser.add_argument("--only", help="restrict to one page slug")
    args = parser.parse_args(argv)

    a_all, b_all = load(args.side_a), load(args.side_b)
    shared = sorted(set(a_all) & set(b_all))
    if args.only:
        shared = [s for s in shared if s == args.only]

    for stem in sorted(set(a_all) ^ set(b_all)):
        print(f"(only on one side, skipped: {stem})")

    for stem in shared:
        a, b = a_all[stem], b_all[stem]
        a["_side"], a["_stem"] = str(args.side_a), stem
        b["_side"], b["_stem"] = str(args.side_b), stem
        report(stem, a, b, args.diff, args.context)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
