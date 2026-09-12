## Why

Materializing a guest identity is five steps — rate-limit the new anonymous identity, construct the
`User` from the session's preferences, register it in `app_state.users`, write its test-user document,
stamp the session and mark the request as carrying a new one — and the server did all five in **three
separate copies**: `views/__init__.py` for a page render, `websocket_utils.py` for a socket opening,
`puzzle.py` for the puzzle page.

THREE CALLERS ARE NOT THE PROBLEM AND CANNOT BE REMOVED. A guest is minted lazily, at whichever entry
point the browser reaches first, and there is no earlier common point: anonymous page rendering is
deliberately stateless, and minting an identity for every request that never needs one is exactly
what that statelessness avoids. Three COPIES of the rule are the problem.

**THEY DRIFTED ONCE ALREADY, AND THE SPEC HAS THE REQUIREMENT THEY BROKE.**
`test-user-identities` requires that a test user "SHALL be written to `db.user` … so that its identity
outlives the process that minted it". When test users gained `persist_test_identity()`, two copies
learned to call it and the puzzle page did not — so a browser whose first landing was `/puzzle` got
the one identity that still evaporated on restart. The requirement was met at two entry points out of
three, which is the failure mode duplication produces: not a wrong rule, a rule applied unevenly.

WHY IT IS BEING PROPOSED NOW, AFTER BEING WRITTEN. The work exists on `bughouse-two-board-upstream`
and never reached the fork. With everything now living in the fork, code that sits only on a branch
nobody works in is code that will be rewritten by someone who does not know it is there.

## What Changes

- One `mint_guest_user(app_state, request, session, *, arriving_at)` in `server/user.py`, holding the
  five steps in their existing order.
- The three entry points call it. `arriving_at` names the entry point for the log line, which is the
  only thing that genuinely differed between the copies (`"page"`, `"websocket"`, `"puzzle"`).
- **The deferred import stays deferred where it must be.** `user` imports `websocket_utils`, so the
  socket path imports the function inside the function — and that import cycle is *why* the copies
  existed rather than being shared in the first place. It is now written down at the site.
- No behaviour change is intended: same order, same rate limiting, same session stamping, and the
  same log line but for the entry-point word.

## Capabilities

### Modified Capabilities

- `test-user-identities`: where the minting rule lives. The capability's behaviour does not change —
  it is the guarantee that an entry point cannot satisfy part of the rule and miss the rest, which is
  what already happened once to `/puzzle`.

## Impact

- `server/user.py` — the function.
- `server/views/__init__.py`, `server/websocket_utils.py`, `server/puzzle.py` — each loses its copy.
- **NOT `server/pychess_global_app_state.py`, deliberately.** The same upstream commit also deletes
  `_is_mongomock()`, the guard that lets an app driven against a mock database start at all — it is
  what makes the layout and reconnect scenario beds runnable, and it exists only in the fork.
  Porting that file would have taken the deletion with it.
- Python gates apply. No client change, no protocol change, nothing stored differently.
