"""The HTML report.

SCREENSHOTS ARE FILES, NOT DATA URIS. At this count they run to tens of megabytes; inlined, that is
a report no browser opens comfortably. The report travels as a directory.

FAILING ROWS COME FIRST. A survey nobody can triage is a survey nobody reads.
"""

import html
import json
from pathlib import Path

from .viewports import CASES


def _facts_table(facts: dict) -> str:
    if not facts or not facts.get("ok"):
        reason = facts.get("reason", "no facts captured") if facts else "no facts captured"
        return f'<p class="bad">{html.escape(str(reason))}</p>'

    pub = facts["published"]
    fired = facts["fired"]
    areas = facts["areas"]

    def row(k, v):
        return f"<tr><th>{html.escape(k)}</th><td>{html.escape(str(v))}</td></tr>"

    occupied = ", ".join(
        f"{name} {a['w']}x{a['h']}"
        + (
            f" [{', '.join(o['what'].split()[0] for o in a['occupants'])}]"
            if a["occupants"]
            else " EMPTY"
        )
        for name, a in areas.items()
        if a["w"] > 0 and a["h"] > 0
    )

    rows = [
        row("mode", facts["mode"] + ("" if facts["zoomAvailable"] else ", no zoom")),
        row("tools home", fired["toolsCascade"]),
        row("drop classes", ", ".join(facts["drops"]) or "none"),
        row("flags", ", ".join(facts["flags"]) or "none"),
        row("selected tab", (facts.get("selectedTab") or "").strip()),
        row("template rows", facts["template"]["rows"]),
        row("template columns", facts["template"]["columns"]),
        row("areas", occupied),
        row("own square", pub["ownSquare"]),
        row("squares a / b", f"{pub['squareA']} / {pub['squareB']}"),
        row(
            "preset button",
            f"{pub['presetButton']} (floor {pub['presetFloor']}, ceiling {pub['presetCeiling']})"
            f" — bound by {fired['presetSizeBoundBy']}",
        ),
        row("preset gap", f"{pub['presetGap']} (floor {pub['presetGapFloor']})"),
        row(
            "preset rows",
            f"{fired['presetRowLengths']} — {fired['presetArrangement']}, aligned {pub['presetAlign']}",
        ),
        row("chat budget", f"{pub['chatMinLines']} messages x {pub['chatMsgAdvance']}px"),
        row("partner board tab", fired["partnerBoardTab"]),
        row("boards resizable", fired["boardsResizable"]),
    ]
    return "<table class='facts'>" + "".join(rows) + "</table>"


def _row_html(r) -> str:
    facts = r.facts or {}
    failures = facts.get("failures", []) if facts.get("ok") else []
    if r.error:
        failures = [r.error, *failures]
    status = "bad" if failures else "good"
    shot = (
        f'<a href="shots/{r.shot}"><img src="shots/{r.shot}" alt="{html.escape(r.key)}"></a>'
        if r.shot
        else '<p class="bad">no screenshot</p>'
    )
    fail_html = (
        "<ul class='failures'>" + "".join(f"<li>{html.escape(f)}</li>" for f in failures) + "</ul>"
        if failures
        else "<p class='ok'>no checks failed</p>"
    )
    zoom = f"{r.zoom[0]}/{r.zoom[1]}"
    return f"""
<section class="row {status}" id="{html.escape(r.key)}">
  <h3>{html.escape(r.viewport.key)} · {html.escape(r.case.key)} · zoom {zoom}</h3>
  <p class="sub">{html.escape(r.viewport.stands_for)} — {html.escape(r.viewport.label)},
     aspect {r.viewport.aspect:.3f} · {html.escape(r.case.describes)}</p>
  <div class="body">
    <div class="shot">{shot}</div>
    <div class="meta">{fail_html}{_facts_table(facts)}</div>
  </div>
</section>"""


STYLE = """
:root { color-scheme: light dark; --bg:#fff; --fg:#111; --line:#d5d5d5; --bad:#b00020; --ok:#0a7d32; }
@media (prefers-color-scheme: dark) { :root { --bg:#15161a; --fg:#e8e8ea; --line:#33353c; --bad:#ff6b81; --ok:#5fd88a; } }
body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.45 system-ui, sans-serif; }
header, main { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
h1 { margin: 24px 0 4px; font-size: 22px; }
h2 { margin: 36px 0 8px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
h3 { margin: 0 0 2px; font-size: 15px; }
.sub { margin: 0 0 10px; opacity: .7; }
.row { border: 1px solid var(--line); border-left-width: 4px; border-radius: 6px; padding: 12px 14px; margin: 14px 0; }
.row.bad { border-left-color: var(--bad); }
.row.good { border-left-color: var(--ok); }
.body { display: flex; gap: 16px; flex-wrap: wrap; }
.shot { flex: 1 1 460px; min-width: 0; }
.shot img { max-width: 100%; border: 1px solid var(--line); border-radius: 4px; display:block; }
.meta { flex: 1 1 380px; min-width: 0; }
table.facts { border-collapse: collapse; width: 100%; font-size: 12px; }
table.facts th { text-align: left; font-weight: 600; opacity: .75; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap; }
table.facts td { padding: 2px 0; word-break: break-word; font-family: ui-monospace, monospace; }
.failures { margin: 0 0 10px; padding-left: 18px; color: var(--bad); }
.ok { margin: 0 0 10px; color: var(--ok); }
.summary { border:1px solid var(--line); border-radius:6px; padding:12px 14px; margin:16px 0; }
.summary ul { margin: 6px 0 0; padding-left: 18px; }
.summary a { color: var(--bad); }
"""


def write(rows, out_dir: Path, meta: dict) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)

    failing = [r for r in rows if r.error or (r.facts.get("failures") if r.facts else None)]
    index = "".join(
        f'<li><a href="#{html.escape(r.key)}">{html.escape(r.key)}</a> — '
        + html.escape("; ".join((r.facts.get("failures") or [])[:2]) or (r.error or ""))
        + "</li>"
        for r in failing
    )

    sections = []
    for case in CASES:
        in_case = [r for r in rows if r.case.key == case.key]
        if not in_case:
            continue
        in_case.sort(key=lambda r: (r.viewport.key, r.zoom))
        sections.append(
            f"<h2>{html.escape(case.key)} — {html.escape(case.describes)}</h2>"
            + "".join(_row_html(r) for r in in_case)
        )

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bughouse layout matrix</title><style>{STYLE}</style></head>
<body>
<header>
  <h1>Bughouse layout matrix</h1>
  <p class="sub">{html.escape(meta.get("when", ""))} · {len(rows)} rows ·
     {len(failing)} with a failing check · game {html.escape(meta.get("game", "?"))}</p>
  <div class="summary">
    <strong>{len(failing)} rows failed a check.</strong>
    <ul>{index or '<li class="ok">none</li>'}</ul>
  </div>
</header>
<main>{"".join(sections)}</main>
</body></html>"""

    path = out_dir / "index.html"
    path.write_text(doc)

    # The facts as data too, so a later change can diff two runs without re-running either.
    (out_dir / "facts.json").write_text(
        json.dumps(
            [
                {
                    "key": r.key,
                    "viewport": r.viewport.__dict__,
                    "case": r.case.__dict__,
                    "zoom": list(r.zoom),
                    "shot": r.shot,
                    "error": r.error,
                    "facts": r.facts,
                }
                for r in rows
            ],
            indent=1,
        )
    )
    return path
