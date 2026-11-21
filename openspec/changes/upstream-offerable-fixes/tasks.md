## 1. Dockerfile

- [x] 1.1 `markdown.js` in the frontend stage's `COPY` (fork master `4c0419d6f`, 2026-11-16).
- [ ] 1.2 Offer it to gbtami as a one-commit PR.

## 2. Daily puzzle loop

- [ ] 2.1 Bound the `while puzzleId == "0"` loop in `server/puzzle.py`; decide what the page shows
      when no daily puzzle can be picked.
- [ ] 2.2 Python gates (ruff format, ruff check, pyrefly, unittest, test_simul); reproduce with the
      one-puzzle local database on a new UTC day, confirm the server stays idle.
- [ ] 2.3 Offer it to gbtami as its own PR.
