## Why

Two upstream defects were found on 2026-11-15/16 while verifying `accessibility-sight-impairment`.
Neither belongs to that change, and both are small enough to offer gbtami as standalone PRs. This
change exists so they are not forgotten while the accessibility work is finished.

## What Changes

### 1. `docker compose build server` fails: `markdown.js` is not copied

Since the blog Markdown commits (`aad0c6693`...`9b1114bd5`) `client/ublogMarkdownV2.ts` imports
`../markdown`, but `docker/server.Dockerfile`'s frontend stage never copies `markdown.js`, so the
image build fails to resolve it. Fixed on fork master in `4c0419d6f` (one line: `markdown.js` added to the first `COPY`).
To do: offer it upstream as its own PR.

### 2. The daily puzzle loop never ends when no suitable puzzle is left

`server/puzzle.py`, the daily-puzzle selection:

```python
puzzleId = "0"
while puzzleId == "0":
    ...
    puzzle = await next_puzzle(request, user)
    if puzzle.get("e") != "#1":
        puzzleId = puzzle["_id"]
```

`next_puzzle()` returns an empty puzzle with `_id` `"0"` when nothing unused matches, and a mate in
one is skipped, so with too few puzzles the loop spins forever: about 3000 `puzzle` aggregations a
second, the server at 100% CPU, every page waiting on it. Measured locally (one puzzle, already used
as a daily puzzle): the first lobby load of each new UTC day after a server start triggers it.
Production has thousands of puzzles, so it is unlikely there, but nothing bounds it.
Workaround in use: insert `{_id: "<YYYY-MM-DD>:all", puzzleId: "kbpz1"}` into `dailypuzzle` and
restart the server.
To do: a bounded loop (a fixed number of tries, then no daily puzzle for that key, or the last
puzzle found), offered upstream as its own PR, with the Python gates.

## Impact

`docker/server.Dockerfile` (done on fork master), `server/puzzle.py`. No client change.
