# Fork-only material — never send this upstream

This branch (`master`, tracking `fork`) is where development happens. `gbtami/pychess-variants`
master is where finished work goes, as a PR or a cherry-picked commit. Some of what lives here exists
only to make test beds and measurements possible, and it **must not reach upstream**: it is
accommodation for tooling gbtami does not have, so upstream it is dead weight at best and a
maintenance burden at worst.

Keeping it here is fine. Letting it cross is not. This file is the list, and the list is checkable.

## How to find all of it

```bash
git grep -n 'FORK-ONLY'                                   # fragments inside shared files
git diff --diff-filter=A --name-only origin/master master # every path we have and upstream lacks
```

The second command regenerates the whole-file section below; run it after any upstream merge, because
the answer changes as work lands upstream.

## Whole files and directories — easy to spot, easy to forget

| path | what it is |
|---|---|
| `openspec/` | the specs, changes and archive. Already excluded in the main checkout's `.git/info/exclude`. |
| `tests/reconnect_matrix/` | the reconnect scenario bed |
| `tests/layout_matrix/` | the layout matrix bed |
| `docker-compose.h2.yaml`, `docker/Caddyfile` | the opt-in HTTP/2 front for local dev |
| `FORK-ONLY.md` | this file |

## Fragments inside files that DO go upstream — the dangerous class

These are the ones that slip through, because the file around them is wanted upstream and the diff
looks ordinary. Each site is marked `FORK-ONLY` in a comment so the grep above finds it.

### `server/pychess_global_app_state.py` — `_is_mongomock()` and the guard that calls it

`_upsert_static_docs()` skips its bulk write when the collection is a mongomock, not only when
`is_test_run()` sniffs a test runner in `sys.argv`. Upstream has the `is_test_run()` half and not this
one. Without it, any app driven against a mock database by something that is not pytest — which is
both scenario beds — dies on startup: pymongo passes `sort=` on every bulk update and mongomock 4.3,
its newest release, rejects the argument.

**This is the example to learn from, and the wrong shape.** The accommodation is in the PRODUCT for
the benefit of the TEST, so it has to be stripped by hand forever. The same result was available from
the bed side — patch `_upsert_static_docs`, or mongomock's builder, in the bed's own entry point, the
way `delays.py` already patches `wsr.play_move_bug`. Prefer that next time.

### Nothing else, as of 2026-09-12 — and one entry was retired the same day

`client/two-board/socket/reconnectController.ts` used to carry two comments crediting the scenario
bed by name (`Q11, Q1, N9`) where upstream's copy says "driving real browsers". They were deleted
rather than tracked: they conflicted in that day's upstream merge and would have conflicted at every
future one, while the provenance they carried is already in the bed's own `scenarios.py` and in
`openspec/changes/archive/2026-09-07-reconnect-sync-controller/`. **That is the preferred ending for
an entry in this section** — not a permanent exception, but something removed once its cost is
visible. `_is_mongomock` stays only because deleting it would break both beds.

Comments are the easy case; keep them free of the beds, the harness, `PB.*` and openspec names, and
this section stays short.

## Before a PR or a cherry-pick to upstream

1. `git grep -n 'FORK-ONLY'` — every hit is either a line to drop or a hunk to leave behind.
2. Check the whole-file list above; none of those paths belongs in the PR.
3. `git diff --stat origin/master -- <the files you are sending>` and read it. A hunk you did not
   write in this change is a hunk to question.
4. Comments that name the beds, the harness, `PB.*` helpers, or openspec changes read as noise to
   anyone without them. Rewrite them to state the fact rather than its source.

## The rule for new work

**Do not add product code for a test bed's benefit if the bed can do it itself.** A bed may patch the
app at its own entry point, monkeypatch a server function, or drive the app differently — all of that
lives in the bed and travels nowhere. Reach for a change in `server/` or `client/` only when the bed
genuinely cannot, and when you do, mark it `FORK-ONLY` and add it here in the same commit.
