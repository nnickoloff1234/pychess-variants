"""Sweep the browser's acceptances into `notes.json`, so an export skipped is not an export lost.

THE REPORT KEEPS TWO COPIES ON PURPOSE. `notes.json` is the durable one, embedded into every
generated report as its seed; `localStorage` holds only what has been ticked or typed since that
file was written. The bridge between them is the report's "Download notes.json" button, and it is
easy to forget — at which point the next run seeds from the file and a review pass appears to have
vanished.

It cannot survive a run on its own, twice over. Firefox gives every `file://` document its own
storage, so a report at a new path starts empty; and the store's key carries the run's generation
timestamp, so even at a stable path a regenerated report would start empty. The second is
deliberate — the file is the source of truth and the browser copy a delta — but together they mean
the delta has to be collected before it is orphaned.

So this reads the profile, read-only, and merges what it finds. It is a safety net under the
button, not a replacement for it: Firefox flushes `localStorage` to disk on its own schedule, so a
tick made seconds ago may not be here yet. What it does catch is every pass from every earlier run,
each in its own store, which is what would otherwise be lost for good.

Values are snappy-compressed inside `ls/data.sqlite`, hence the small decoder: the alternative is a
dependency for sixty lines of format.
"""

import json
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

STORE_PREFIX = "matrix-notes"
PROFILE_GLOB = ".mozilla/firefox/*/storage/default/file*+index.html/ls/data.sqlite"


def _unsnappy(raw: bytes) -> bytes:
    """Snappy's raw format: a varint length, then literals and back-references."""
    i = length = shift = 0
    while True:
        byte = raw[i]
        i += 1
        length |= (byte & 0x7F) << shift
        shift += 7
        if not byte & 0x80:
            break

    out = bytearray()
    while i < len(raw) and len(out) < length:
        tag = raw[i]
        i += 1
        kind = tag & 0x03
        if kind == 0:
            size = tag >> 2
            if size < 60:
                size += 1
            else:
                extra = size - 59
                size = int.from_bytes(raw[i : i + extra], "little") + 1
                i += extra
            out += raw[i : i + size]
            i += size
            continue
        if kind == 1:
            size = 4 + ((tag >> 2) & 0x07)
            offset = ((tag >> 5) << 8) | raw[i]
            i += 1
        elif kind == 2:
            size = (tag >> 2) + 1
            offset = int.from_bytes(raw[i : i + 2], "little")
            i += 2
        else:
            size = (tag >> 2) + 1
            offset = int.from_bytes(raw[i : i + 4], "little")
            i += 4
        start = len(out) - offset
        for step in range(size):
            out.append(out[start + step])
    return bytes(out)


def sweep(home: Path | None = None) -> tuple[set[str], dict[str, str]]:
    """Every acceptance and note the profile holds, across every run's store."""
    accepted: set[str] = set()
    notes: dict[str, str] = {}
    for store in sorted((home or Path.home()).glob(PROFILE_GLOB)):
        # Copied because Firefox may hold the original open, and read-only besides.
        with tempfile.NamedTemporaryFile(suffix=".sqlite") as copy:
            try:
                shutil.copy(store, copy.name)
                rows = (
                    sqlite3.connect(f"file:{copy.name}?mode=ro", uri=True)
                    .execute("select key, value from data")
                    .fetchall()
                )
            except (OSError, sqlite3.Error):
                continue
        for key, value in rows:
            if not str(key).startswith(STORE_PREFIX):
                continue
            raw = value if isinstance(value, bytes) else str(value).encode()
            try:
                found = json.loads(_unsnappy(raw).decode("utf-8", "replace"))
            except (ValueError, IndexError):
                continue
            if not isinstance(found, dict):
                continue
            if str(key).endswith(":accepted"):
                accepted |= {k for k, v in found.items() if v is True}
            else:
                notes.update({k: v for k, v in found.items() if isinstance(v, str) and v.strip()})
    return accepted, notes


def merge_into(notes_file: Path, home: Path | None = None) -> tuple[int, int]:
    """Fold the sweep into `notes.json`. Returns what it ADDED, not what it found."""
    accepted, notes = sweep(home)
    if not accepted and not notes:
        return 0, 0

    current = json.loads(notes_file.read_text()) if notes_file.exists() else {}
    text_of = lambda v: v.get("note") if isinstance(v, dict) else v
    ok_of = lambda v: bool(isinstance(v, dict) and v.get("accepted"))

    new_notes = sum(1 for k, v in notes.items() if not (text_of(current.get(k)) or "").strip())
    new_ok = sum(1 for k in accepted if not ok_of(current.get(k)))

    for key, text in notes.items():
        if not (text_of(current.get(key)) or "").strip():
            existing = current.get(key)
            current[key] = {"note": text, "accepted": True} if ok_of(existing) else text
    for key in accepted:
        text = (text_of(current.get(key)) or "").strip()
        current[key] = {"note": text, "accepted": True} if text else {"accepted": True}

    notes_file.write_text(json.dumps(current, indent=1, sort_keys=True) + "\n")
    return new_ok, new_notes


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "notes.json"
    ok, noted = merge_into(target)
    print(f"swept into {target}: {ok} new acceptances, {noted} new notes")
