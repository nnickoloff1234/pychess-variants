"""Rebuild a run's HTML from the `facts.json` it already wrote.

    env PYTHONPATH=server:tests uv run python -m layout_matrix.rebuild <run-dir>

The walk costs three minutes and a live game; the page is just a rendering of the facts. Anything
about the report itself — a style, the notes, a new filter — is iterated here, against a run that
already happened, so no change to the presentation costs a re-measurement.
"""

import json
import sys
from pathlib import Path
from types import SimpleNamespace

from . import report
from .viewports import Case, Viewport


def rows_from(facts_path: Path) -> list:
    """The facts back as row-shaped objects. `report` only ever reads attributes off them."""
    rows = []
    for raw in json.loads(facts_path.read_text()):
        rows.append(
            SimpleNamespace(
                key=raw["key"],
                viewport=Viewport(**raw["viewport"]),
                case=Case(**raw["case"]),
                zoom=tuple(raw["zoom"]),
                shot=raw["shot"],
                error=raw["error"],
                facts=raw["facts"] or {},
            )
        )
    return rows


def rebuild(run_dir: Path) -> Path:
    meta_path = run_dir / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    return report.write(rows_from(run_dir / "facts.json"), run_dir, meta)


if __name__ == "__main__":
    print("report:", rebuild(Path(sys.argv[1])))
