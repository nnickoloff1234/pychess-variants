"""The horizontal-overflow rows of a matrix run, and nothing else.

    env PYTHONPATH=server:tests uv run python -m layout_matrix.overflow_report <run-dir>

Reads the `facts.json` a run wrote and emits `overflow.html` beside it: every row whose page is
wider than the viewport it was given, each with its numbers and its own screenshot, and no other
kind of failure. One question at a time — which of these overflows can actually be SEEN.

The screenshots are shown at one CSS pixel to one CSS pixel, so a 390px phone is 390px wide on the
page: a row scaled to fit a column reads as "looks fine" no matter what it is.
"""

import json
import re
import sys
from pathlib import Path

HORIZONTAL = re.compile(r"page overflows horizontally by (\d+)px")

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Horizontal overflow — bughouse layout matrix</title>
<style>
  :root {{ --bg:#14161a; --panel:#1c1f26; --line:#2e333c; --ink:#e8e8ea; --dim:#9aa0aa;
           --hot:#e05252; --warm:#e0a052; --cool:#6b7280; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
          font:14px/1.55 system-ui, -apple-system, sans-serif; }}
  header {{ padding:26px 30px 10px; border-bottom:1px solid var(--line); }}
  h1 {{ margin:0 0 8px; font-size:21px; font-weight:600; }}
  p.lede {{ margin:0; color:var(--dim); max-width:100ch; }}
  table.summary {{ border-collapse:collapse; margin:18px 0 4px; font-size:13px; }}
  table.summary th {{ text-align:left; color:var(--dim); font-weight:500; padding:3px 14px 3px 0;
                      border-bottom:1px solid var(--line); }}
  table.summary td {{ padding:3px 14px 3px 0; border-bottom:1px solid #23262d;
                      font-variant-numeric:tabular-nums; }}
  table.summary a {{ color:var(--ink); text-decoration:none; }}
  table.summary a:hover {{ text-decoration:underline; }}
  main {{ padding:10px 30px 60px; }}
  section {{ margin:28px 0 0; }}
  h2 {{ font-size:17px; margin:0 0 2px; }}
  h2 .px {{ color:var(--dim); font-weight:400; font-size:14px; }}
  .rows {{ display:flex; flex-wrap:wrap; gap:26px; margin-top:14px; }}
  figure {{ margin:0; max-width:100%; }}
  figcaption {{ font-size:13px; color:var(--dim); margin:0 0 7px; }}
  figcaption b {{ color:var(--ink); font-weight:600; }}
  .bar {{ display:inline-block; padding:1px 7px; border-radius:4px; font-size:11.5px;
          font-weight:600; margin-left:8px; color:#14161a; }}
  .hot {{ background:var(--hot); }} .warm {{ background:var(--warm); }} .cool {{ background:var(--cool); color:#e8e8ea; }}
  .frame {{ position:relative; display:inline-block; border:1px solid var(--line); background:#000;
            max-width:100%; }}
  .frame img {{ display:block; max-width:100%; height:auto; }}
  .note {{ color:var(--dim); font-size:12.5px; margin:7px 0 0; max-width:72ch; }}
  code {{ background:#0f1115; padding:1px 5px; border-radius:3px; font-size:12.5px; }}
</style>
</head>
<body>
<header>
  <h1>Horizontal overflow — {n} rows of {total}</h1>
  <p class="lede">
    Every row of the run whose content is wider than the viewport it was given. Nothing else from
    the run is here: no vertical overflow, no overlaps, no empty zones. Screenshots are 1 CSS pixel
    to 1 CSS pixel: each frame is exactly as wide as the device, and shows what that device shows.
    Where the browser zoomed the page out to make it fit, the frame says so — that shrinking IS the
    symptom, and it is what a phone or tablet does with a page too wide for it.
    Run {when}, game {game}.
  </p>
  {summary}
</header>
<main>
{sections}
</main>
</body>
</html>
"""


def _severity(px: int) -> str:
    return "hot" if px >= 100 else "warm" if px >= 20 else "cool"


def build(run_dir: Path) -> Path:
    rows = json.loads((run_dir / "facts.json").read_text())
    meta_path = run_dir / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    hits = []
    for row in rows:
        facts = row.get("facts") or {}
        for failure in facts.get("failures") or []:
            match = HORIZONTAL.match(failure)
            if match:
                hits.append((row, int(match.group(1))))
                break

    # Widest overflow first, and the viewports in that order too: the rows most likely to show
    # something are the ones worth opening first.
    by_viewport: dict[str, list] = {}
    for row, px in hits:
        by_viewport.setdefault(row["viewport"]["key"], []).append((row, px))
    order = sorted(by_viewport, key=lambda k: -max(px for _, px in by_viewport[k]))

    summary = [
        (
            "<table class='summary'><tr><th>row</th><th>device</th><th>viewport</th>"
            "<th>content</th><th>over by</th><th>mode</th><th>browser zoom</th></tr>"
        )
    ]
    sections = []
    for key in order:
        group = sorted(by_viewport[key], key=lambda t: -t[1])
        viewport = group[0][0]["viewport"]
        worst = group[0][1]
        sections.append(
            f"<section><h2>{viewport['key']} — {viewport['stands_for']} "
            f"<span class='px'>{viewport['width']}×{viewport['height']} @{viewport['dpr']:g}, "
            f"{viewport['kind']}</span></h2>"
        )
        sections.append(f"<p class='note'>Worst here: {worst}px past the right edge.</p>")
        sections.append("<div class='rows'>")
        for row, px in group:
            facts = row["facts"]
            fit = facts.get("fit") or {}
            layout = fit.get("layout") or [facts["viewport"]["w"], facts["viewport"]["h"]]
            content = fit.get("content") or ["?", "?"]
            visual = fit.get("visual") or layout
            zoom_note = ""
            if visual[0] > layout[0] + 1:
                pct = round(100 * layout[0] / visual[0])
                zoom_note = (
                    f"<p class='note'>The browser zoomed the page out to {pct}% to make it "
                    f"fit the device, so everything is drawn smaller than it should be.</p>"
                )
            case = row["case"]
            sections.append(
                f"<figure id='{row['key']}'>"
                f"<figcaption><b>{row['key']}</b> — {case['describes']}, zoom "
                f"{row['zoom'][0]}/{row['zoom'][1]}"
                f"<span class='bar {_severity(px)}'>+{px}px</span></figcaption>"
                f"<div class='frame' style='width:{layout[0]}px'>"
                f"<img src='shots/{row['shot']}' width='{layout[0]}' alt='{row['key']}'>"
                f"</div>"
                f"<p class='note'>viewport {layout[0]}×{layout[1]} · content "
                f"{content[0]}×{content[1]} · {facts.get('mode', '?')}</p>{zoom_note}</figure>"
            )
            summary.append(
                f"<tr><td><a href='#{row['key']}'>{row['key']}</a></td>"
                f"<td>{viewport['width']}×{viewport['height']}@{viewport['dpr']:g}</td>"
                f"<td>{layout[0]}×{layout[1]}</td><td>{content[0]}×{content[1]}</td>"
                f"<td>{px}</td><td>{facts.get('mode', '?')}</td>"
                f"<td>{'zoomed out' if zoom_note else '—'}</td></tr>"
            )
        sections.append("</div></section>")
    summary.append("</table>")

    out = run_dir / "overflow.html"
    out.write_text(
        PAGE.format(
            n=len(hits),
            total=len(rows),
            when=meta.get("when", "?"),
            game=meta.get("game", "?"),
            summary="".join(summary),
            sections="\n".join(sections),
        )
    )
    return out


if __name__ == "__main__":
    path = build(Path(sys.argv[1]))
    print(f"report: {path}")
