> **THIS IS A LEDGER, NOT A PLAN. IT IS NOT SCHEDULED AND NOBODY IS WORKING ON IT.**
>
> It exists so that small defects found while doing something else get written down instead of
> being carried in someone's head and lost. Adding an entry is meant to cost a minute.
>
> **Do not archive it to tidy up.** Archiving applies spec deltas to `openspec/specs/`, which would
> record these as decided behaviour when nothing has been built. It stays an active change on
> purpose: that is what keeps it in `openspec list` where the next person will see it.

## Why

Work on the bughouse round page keeps turning up defects that are real, small, and unrelated to
whatever is being worked on at the time. Two things then happen to them: they get mentioned once in
a conversation and forgotten, or they get folded into the change that happened to find them, where
they inflate its scope and blur what it was for.

The zoom-to-zero trap is the case that prompted this. It was found while verifying
`name-row-in-the-height-budget` by sweeping the resize handle through its range — nothing to do with
usernames, not caused by that change, and genuinely worth fixing. Recording it there would have been
wrong; dropping it would have been worse.

## What Changes

Nothing, yet. This change accumulates entries; each entry is fixed by being promoted out of here
into a change of its own, or by being picked up by whichever change already owns that area.

An entry is added when a defect is:

- **small** — a fix that does not need a design discussion, or a one-liner with a clear cause
- **out of scope** for whatever found it
- **real** — observed and measured, not suspected

Anything failing those is not a paper cut. A defect that needs a design belongs in its own proposal,
and a suspicion belongs in a conversation until it is a measurement.

## Capabilities

### New Capabilities

None. An entry states observed behaviour, not a requirement — the requirement gets written when the
entry is promoted into a real change, by whoever picks it up and decides what the behaviour should
be. A ledger that wrote requirements up front would be committing to fixes nobody has scheduled.

### Modified Capabilities

- `bughouse-round-layout`: one requirement, restated rather than changed. `A board offers a resize
  handle only where resizing works` already carries the scenario *"dragging it changes that board's
  size"*, and at zoom 0 it does not — so the zoom-to-zero entry is a violation of what is already
  required, and the delta says so for the collapsed case while leaving the fix open.

**This is the only delta the ledger will ever carry, and further entries add none.** The schema
requires at least one — a change without deltas fails validation and turns `openspec validate --all`
red for as long as the ledger exists — so the cost was paid once, with the least-committal
requirement available. See design decision 4. An entry that genuinely needs a requirement of its own
is, by that fact, not a paper cut.

## Impact

None while it sits here. Each entry names the code it touches so that whoever picks it up does not
have to rediscover it:

- **Zoom to zero** — `client/cgCtrl.ts` (the `cg-resize` handle and its drag handler),
  `client/boardSettings.ts` (`ZoomSettings`, whose range starts at 0). Overlaps
  `boards-resize-only-on-user-action`, which already owns the zoom path.
- **Stranded coordinates** — chessgroundx's coordinate rendering, or the CSS that would hide it.
