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
            "allowance a / b",
            f"{pub.get('allowanceA')} / {pub.get('allowanceB')} — what 100% means for each column",
        ),
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


def _row_html(r, was_failing=frozenset()) -> str:
    facts = r.facts or {}
    failures = facts.get("failures", []) if facts.get("ok") else []
    if r.error:
        failures = [r.error, *failures]
    status = "bad" if failures else "good"
    # FIXED means: it failed in the baseline and passes now. NEW means the opposite — a row the
    # change broke, which is the other half of reviewing a fix.
    was = ""
    if r.key in was_failing and not failures:
        was = " fixed"
    elif r.key not in was_failing and failures:
        was = " regressed"
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
    # THE ZOOM ASKED FOR AND THE ZOOM DRAWN. `clampZoom()` raises anything under the column's
    # `minZoomPercent()`, so a row can be headed 100/50 while the board is drawn at 79% and nothing
    # could have made it smaller. A heading that says only what was asked for is a heading that lies.
    drawn = (facts.get("zoomDrawn") or [None, None]) if facts.get("ok") else [None, None]
    asked = "/".join("min" if z == 0 else str(z) for z in r.zoom)
    zoom = asked
    if all(d is not None for d in drawn):
        surprised = any(z != 0 and abs(d - z) > 2 for d, z in zip(drawn, r.zoom))
        if 0 in r.zoom or surprised:
            note = (
                "the floor the app allows"
                if 0 in r.zoom and not surprised
                else "NOT the zoom asked for"
            )
            zoom += f" <span class='floored'>drawn {drawn[0]}/{drawn[1]} — {note}</span>"
    return f"""
<section class="row {status}{was}" id="{html.escape(r.key)}">
  <h3>{html.escape(r.viewport.key)} · {html.escape(r.case.key)} · zoom {zoom}</h3>
  <p class="sub">{html.escape(r.viewport.stands_for)} — {html.escape(r.viewport.label)},
     aspect {r.viewport.aspect:.3f} · {html.escape(r.case.describes)}</p>
  <div class="body">
    <div class="shot">{shot}</div>
    <div class="meta">{fail_html}{_facts_table(facts)}</div>
  </div>
  <div class="note-box">
    <textarea data-key="{html.escape(r.key)}" rows="2" placeholder="note for this row…"></textarea>
    <label class="accept"><input type="checkbox" data-accept="{html.escape(r.key)}"> accepted — stop showing this one</label>
  </div>
</section>"""


STYLE = """
:root { color-scheme: light dark; --bg:#fff; --fg:#111; --line:#d5d5d5; --bad:#b00020; --ok:#0a7d32; --noted:#b06f00; --noted-bg:#fff8ec; }
@media (prefers-color-scheme: dark) { :root { --bg:#15161a; --fg:#e8e8ea; --line:#33353c; --bad:#ff6b81; --ok:#5fd88a; --noted:#e0a052; --noted-bg:#241f17; } }
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
/* A GREY MAT, because the screenshots are of a dark app on a dark page: against either background
   the image's own edges are invisible, and where the page ends is exactly what these rows are for. */
.shot { flex: 1 1 460px; min-width: 0; background: #8c8c8c; padding: 6px; border-radius: 6px; align-self: flex-start; }
.shot img { max-width: 100%; border: 1px solid #5f5f5f; display:block; }
.meta { flex: 1 1 380px; min-width: 0; }
table.facts { border-collapse: collapse; width: 100%; font-size: 12px; }
table.facts th { text-align: left; font-weight: 600; opacity: .75; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap; }
table.facts td { padding: 2px 0; word-break: break-word; font-family: ui-monospace, monospace; }
.failures { margin: 0 0 10px; padding-left: 18px; color: var(--bad); }
.ok { margin: 0 0 10px; color: var(--ok); }
.note-box { margin: 10px 0 0; }
.note-box textarea { width:100%; box-sizing:border-box; font:inherit; font-size:12.5px; color:inherit;
  background:transparent; border:1px dashed var(--line); border-radius:4px; padding:6px 8px;
  min-height:2.6em; resize:vertical; }
.note-box textarea:focus { border-style:solid; outline:none; }
.note-box textarea:not(:placeholder-shown) { border-style:solid; border-color:var(--noted); background:var(--noted-bg); }
.note-box .who { font-size:11.5px; opacity:.6; margin:2px 0 0; }
.row.noted { border-left-color: var(--noted); }
.row.fixed { border-left-color: var(--ok); }
.row.fixed h3::before { content: 'FIXED since the baseline — confirm  '; color: var(--ok); font-weight: 700; font-size: 12px; }
.row.regressed h3::before { content: 'NEW since the baseline  '; color: var(--bad); font-weight: 700; font-size: 12px; }
.row.accepted { opacity: .72; }
.floored { color: var(--noted); font-weight: 600; font-size: 12.5px; margin-left: 6px; }
.row.accepted h3::after { content: ' ✓ accepted'; color: var(--ok); font-weight: 600; font-size: 12.5px; }
.note-box .accept { display:inline-flex; gap:6px; align-items:center; margin-top:6px; font-size:12.5px; opacity:.75; cursor:pointer; }
.filter { display:flex; gap:6px; align-items:center; margin:12px 0 0; flex-wrap:wrap; }
.filter button { font:inherit; color:inherit; background:transparent; border:1px solid var(--line);
                 border-radius:999px; padding:3px 12px; cursor:pointer; }
.filter button[aria-pressed="true"] { background:var(--fg); color:var(--bg); border-color:var(--fg); }
.filter .note { opacity:.6; font-size:12.5px; margin-left:4px; }
.summary { border:1px solid var(--line); border-radius:6px; padding:12px 14px; margin:16px 0; }
.summary ul { margin: 6px 0 0; padding-left: 18px; }
.summary a { color: var(--bad); }
"""


# THE ROWS ARE ALREADY MARKED by `_row_html` as `.bad` or `.good`, so filtering is only a matter of
# hiding the rest — and of hiding a case heading once nothing is left under it.
SCRIPT = """
<script>
/* NOTES LIVE IN TWO PLACES, ON PURPOSE.
   `SEED` is what the generator embedded from `notes.json` beside the report — the durable copy,
   which survives a re-run and can be read back by anything. `localStorage` holds only what has been
   typed since, so a note written here is never lost to a regeneration, and "Copy" hands the merged
   set back as JSON to be written into `notes.json` again. No server, no database, no autosave to
   disk — a file:// page cannot write one, and asking for one would be a bigger machine than this. */
(() => {
  /* A seeded entry is either the note's text, or `{note, accepted}` when the row has been accepted.
     Both shapes are read; the plain string is kept for the common case so the file stays readable. */
  const RAW = window.__NOTES_SEED__ || {};
  const SEED = {}, SEED_OK = {};
  for (const [k, v] of Object.entries(RAW)) {
    if (v && typeof v === 'object') { SEED[k] = v.note || ''; SEED_OK[k] = !!v.accepted; }
    else { SEED[k] = v || ''; SEED_OK[k] = false; }
  }
  const STORE = 'matrix-notes:' + (document.body.dataset.run || 'run');
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
  const save = o => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch {} };
  const STORE_OK = STORE + ':accepted';
  const loadOk = () => { try { return JSON.parse(localStorage.getItem(STORE_OK) || '{}'); } catch { return {}; } };
  const saveOk = o => { try { localStorage.setItem(STORE_OK, JSON.stringify(o)); } catch {} };
  let mine = load(), mineOk = loadOk();
  const effective = key => (key in mine ? mine[key] : (SEED[key] || ''));
  const accepted = key => (key in mineOk ? mineOk[key] : !!SEED_OK[key]);
  const merged = () => {
    const out = {};
    for (const key of new Set([...Object.keys(SEED), ...Object.keys(mine), ...Object.keys(mineOk)])) {
      const text = effective(key).trim();
      const ok = accepted(key);
      if (ok) out[key] = text ? {note: text, accepted: true} : {accepted: true};
      else if (text) out[key] = text;
    }
    return out;
  };

  const grow = ta => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  const boxes = [...document.querySelectorAll('.note-box textarea')];
  for (const ta of boxes) {
    ta.value = effective(ta.dataset.key);
    grow(ta);
    ta.closest('.row').classList.toggle('noted', !!ta.value.trim());
    ta.addEventListener('input', () => {
      mine[ta.dataset.key] = ta.value;
      save(mine);
      grow(ta);
      ta.closest('.row').classList.toggle('noted', !!ta.value.trim());
      count();
    });
  }

  const checks = [...document.querySelectorAll('.note-box input[data-accept]')];
  for (const cb of checks) {
    cb.checked = accepted(cb.dataset.accept);
    cb.closest('.row').classList.toggle('accepted', cb.checked);
    cb.addEventListener('change', () => {
      mineOk[cb.dataset.accept] = cb.checked;
      saveOk(mineOk);
      cb.closest('.row').classList.toggle('accepted', cb.checked);
      count();
      /* THE WORKING LIST SHRINKS AS IT IS WORKED THROUGH. Accepting used to only mark the row and
         leave it in place until the next view change, so that a note could still be typed into it —
         but then the list never got shorter, which is the only feedback a reviewer has for progress.
         It hides at once instead. An accepted row is still reachable through its own view or with
         `include accepted` ticked, and a note written there saves exactly the same way. */
      apply(currentMode);
    });
  }

  const counter = document.querySelector('.filter .noted-count');
  const count = () => {
    if (!counter) return;
    const ok = checks.filter(c => c.checked).length;
    const noted = checks.filter(c => (effective(c.dataset.accept) || '').trim() && !c.checked).length;
    counter.textContent = `${noted} noted · ${ok} accepted`;
  };
  count();

  /* ---- the filter, over the classes the rows carry ---- */
  const buttons = [...document.querySelectorAll('.filter button[data-mode]')];
  /* ACCEPTED MEANS SETTLED, so it leaves every working view — including "All", which is the set
     still to be looked at. Its own view is the way back in, to un-accept one. */
  /* ACCEPTED ROWS LEAVE THE WORKING VIEWS, but "Clean" then answered a question nobody asked:
     85 rows had no finding and 76 of them were accepted, so the button offering "Clean" showed 9.
     The counts are therefore computed from what the view WOULD show, and the toggle puts the
     accepted ones back when the point is to re-read them rather than to work through what is left. */
  const withAccepted = document.querySelector('.filter .with-accepted input');
  const hidden = el => el.classList.contains('accepted') && !withAccepted.checked;
  const shown = {
    /* FIXED AND REGRESSED IGNORE "accepted": a row accepted while it was broken is exactly the row
       whose fix wants confirming, and hiding it would hide the review the change was made for. */
    fixed: el => el.classList.contains('fixed'),
    regressed: el => el.classList.contains('regressed'),
    all: el => !hidden(el),
    bad: el => el.classList.contains('bad') && !hidden(el),
    good: el => el.classList.contains('good') && !hidden(el),
    noted: el => el.classList.contains('noted') && !hidden(el),
    accepted: el => el.classList.contains('accepted'),
  };
  const allRows = [...document.querySelectorAll('main > section.row')];
  const CLASS_OF = { all: () => true, bad: el => el.classList.contains('bad'),
                     good: el => el.classList.contains('good'), noted: el => el.classList.contains('noted'),
                     fixed: el => el.classList.contains('fixed'),
                     regressed: el => el.classList.contains('regressed') };
  const relabel = () => {
    for (const b of buttons) {
      const mode = b.dataset.mode;
      const n = allRows.filter(shown[mode]).length;
      let extra = '';
      if (!['accepted', 'fixed', 'regressed'].includes(mode) && !withAccepted.checked) {
        const held = allRows.filter(el => el.classList.contains('accepted') && CLASS_OF[mode](el)).length;
        if (held) extra = ` (+${held} accepted)`;
      }
      b.textContent = `${b.dataset.label} ${n}${extra}`;
    }
  };
  let currentMode = 'all';
  function apply(mode) {
    currentMode = mode;
    let heading = null, headingHasRows = false;
    const flush = () => { if (heading) heading.hidden = !headingHasRows; };
    for (const el of document.querySelector('main').children) {
      if (el.tagName === 'H2') { flush(); heading = el; headingHasRows = false; continue; }
      if (!el.classList.contains('row')) continue;
      const show = shown[mode](el) && matches(el);
      el.hidden = !show;
      if (show) headingHasRows = true;
    }
    flush();
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    relabel();
    for (const ta of boxes) if (!ta.closest('.row').hidden) grow(ta);
    try { localStorage.setItem('matrix-filter', mode); } catch {}
  }
  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.mode)));

  /* FINDING ONE FINDING. A check that fires on 58 rows is unreviewable if the only way to reach
     them is to scroll past the other 206, so the text of a row's failures is searchable. */
  const find = document.querySelector('.filter .find');
  const matches = el => {
    const needle = find.value.trim().toLowerCase();
    if (!needle) return true;
    return (el.querySelector('.failures')?.textContent || '').toLowerCase().includes(needle);
  };
  find.addEventListener('input', () => { apply(currentMode); });
  withAccepted.addEventListener('change', () => apply(currentMode));
  addEventListener('hashchange', () => {
    const target = location.hash && document.querySelector(location.hash);
    if (target && target.hidden) { apply('all'); target.scrollIntoView(); }
  });

  /* ---- handing the notes back ---- */
  const json = () => JSON.stringify(merged(), null, 1);
  document.querySelector('.filter .copy').addEventListener('click', async e => {
    const text = json();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    e.target.textContent = 'copied ' + Object.keys(merged()).length;
    setTimeout(() => { e.target.textContent = 'Copy notes'; }, 1500);
  });
  document.querySelector('.filter .download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json()], {type: 'application/json'}));
    a.download = 'notes.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.querySelector('.filter .revert').addEventListener('click', () => {
    if (!confirm('Discard notes and acceptances made here, back to notes.json?')) return;
    mine = {}; save(mine);
    mineOk = {}; saveOk(mineOk);
    for (const cb of checks) {
      cb.checked = accepted(cb.dataset.accept);
      cb.closest('.row').classList.toggle('accepted', cb.checked);
    }
    for (const ta of boxes) {
      ta.value = effective(ta.dataset.key);
      grow(ta);
      ta.closest('.row').classList.toggle('noted', !!ta.value.trim());
    }
    count();
  });

  let saved = 'all';
  try { saved = localStorage.getItem('matrix-filter') || 'all'; } catch {}
  apply(shown[saved] ? saved : 'all');
})();
</script>
"""


def write(rows, out_dir: Path, meta: dict, notes_file: Path | None = None) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)

    # THE DURABLE COPY OF THE NOTES, embedded so a regenerated report still carries them. What the
    # page keeps in `localStorage` is only what has been typed since this file was last written.
    # The run's own file wins if there is one; otherwise the module's, so notes written once follow
    # every later run instead of being left behind in the directory they were typed against.
    candidates = [notes_file, out_dir / "notes.json", Path(__file__).parent / "notes.json"]
    notes_path = next((c for c in candidates if c and c.exists()), None)
    notes = json.loads(notes_path.read_text()) if notes_path else {}

    # WHAT THE LAST RUN FOUND, so a fix can be reviewed rather than believed. A row that failed in
    # the baseline and passes now is the thing worth looking at after a change, and it is invisible
    # in a report that only says what is wrong today. Written by hand (`cp facts.json baseline.json`)
    # at the moment a fix starts, so the comparison is against the state the fix set out to change.
    base_path = next(
        (
            c
            for c in [out_dir / "baseline.json", Path(__file__).parent / "baseline.json"]
            if c.exists()
        ),
        None,
    )
    was_failing = set()
    if base_path:
        for raw in json.loads(base_path.read_text()):
            if raw.get("error") or ((raw.get("facts") or {}).get("failures")):
                was_failing.add(raw["key"])

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
            + "".join(_row_html(r, was_failing) for r in in_case)
        )

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bughouse layout matrix</title><style>{STYLE}</style></head>
<body data-run="{html.escape(meta.get("when", "run"))}">
<script>window.__NOTES_SEED__ = {json.dumps(notes)};</script>
<header>
  <h1>Bughouse layout matrix</h1>
  <p class="sub">{html.escape(meta.get("when", ""))} · {len(rows)} rows ·
     {len(failing)} with a failing check · game {html.escape(meta.get("game", "?"))}</p>
  <div class="filter" role="group" aria-label="Filter rows">
    <button type="button" data-mode="all" data-label="All" aria-pressed="true">All</button>
    <button type="button" data-mode="bad" data-label="Failing" aria-pressed="false">Failing</button>
    <button type="button" data-mode="good" data-label="Clean" aria-pressed="false">Clean</button>
    <button type="button" data-mode="noted" data-label="Noted" aria-pressed="false">Noted</button>
    <button type="button" data-mode="accepted" data-label="Accepted" aria-pressed="false">Accepted</button>
    <button type="button" data-mode="fixed" data-label="Fixed" aria-pressed="false">Fixed</button>
    <button type="button" data-mode="regressed" data-label="Regressed" aria-pressed="false">Regressed</button>
    <label class="with-accepted"><input type="checkbox"> include accepted</label>
    <input class="find" type="search" placeholder="find in failures… e.g. tools bar wrapped" size="34">
    <span class="note-sep">·</span>
    <button type="button" class="copy">Copy notes</button>
    <button type="button" class="download">Download notes.json</button>
    <button type="button" class="revert">Revert my edits</button>
    <span class="note noted-count"></span>
  </div>
  <div class="summary">
    <strong>{len(failing)} rows failed a check.</strong>
    <ul>{index or '<li class="ok">none</li>'}</ul>
  </div>
</header>
<main>{"".join(sections)}</main>
{SCRIPT}
</body></html>"""

    path = out_dir / "index.html"
    path.write_text(doc)

    # Beside the facts, so a report built from them afterwards can say which run it is reading.
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=1))

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
