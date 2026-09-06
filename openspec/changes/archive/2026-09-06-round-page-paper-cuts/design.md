## Context

Three changes in this area are active at once, and defects surface in whichever one happens to be
running at the time rather than in the one that owns the code. `name-row-in-the-height-budget` found
a zoom bug while measuring usernames. The alternative to a ledger is what has been happening: the
finding goes into the nearest change's notes, where it is either implemented as scope creep or lost
when that change is archived.

`rematch-survives-cache-eviction` already established the pattern this borrows — a change kept
deliberately unarchived so it stays visible — and the note on it warning against archiving to tidy
up applies here for the same reason.

## Goals / Non-Goals

**Goals:**

- Adding an entry costs about a minute, so it actually happens mid-task.
- An entry carries enough evidence that nobody has to reproduce it from scratch.
- Entries stay visible until something is done about them.

**Non-Goals:**

- Scheduling. Nothing here is planned work, and the ledger implies no commitment to fix anything.
- Deciding the fix. An entry records what happens, not what should happen instead.
- A bug tracker. If this grows past a screen, that is a signal to promote entries, not to build
  process around it.

## Decisions

### 1. The entry format is fixed, and short

Each entry is one unchecked task with four things under it:

- **What happens** — the observation, with the numbers that were actually measured
- **Why**, if known — one line; omitted rather than guessed at
- **Where** — the file, and the change that owns that area if there is one
- **Found** — the date and what was being done at the time

Unchecked because none of it is done. The checkbox is what makes an entry disappear when it is
promoted, and what makes `openspec list` show the ledger as outstanding work.

### 2. Evidence goes in, not a description

"The handle stops working at zoom 0" is a sentence someone has to go and verify. `elementFromPoint`
at the handle's own centre returning `.round-app` while `getBoundingClientRect` still reports 22x22
is the finding, and it names the cause on sight.

The rule: write down what a measurement returned, not what it means.

### 3. Entries leave by being promoted, not by being fixed here

Nobody implements out of this file. An entry that is worth doing becomes its own proposal, or gets
picked up by the change that owns that area — `boards-resize-only-on-user-action` for the zoom path,
for instance. When it leaves, the entry is deleted rather than checked off, with a line saying where
it went, so the ledger stays a list of things still outstanding.

### 4. One spec delta, paid once, and no more

The first draft of this decision said the ledger would carry no spec deltas at all, on the grounds
that an entry is an observation and turning it into a requirement decides a fix nobody has
scheduled. That reasoning still holds. It is not available: `spec-driven` is the only schema this
repo has, and it fails validation with `Change must have at least one delta` — which turns
`openspec validate --all` red for as long as the ledger exists. A permanently failing check is worse
than the problem it reports: it trains people to ignore the output, and it invites someone to "fix"
it by deleting the ledger.

So the change carries exactly one delta, chosen to commit to as little as possible. The zoom-to-zero
entry is not a new requirement at all — `A board offers a resize handle only where resizing works`
already has the scenario *"dragging it changes that board's size"*, and at zoom 0 it does not. The
delta restates that obligation for the collapsed case and explicitly leaves the fix open.

**Further entries add no deltas.** The schema needs one, not one per entry, so the cost was paid
once and adding an entry stays a line in `tasks.md` — which is the property the ledger exists for.
An entry that genuinely needs a requirement of its own is, by that fact, not a paper cut, and
belongs in its own proposal.

The change still never completes: its tasks are never all checked. That is the intended steady
state, not an unfinished one.

## Risks / Trade-offs

- **A ledger nobody reads is a list of excuses.** Mitigated only by it staying in `openspec list`
  and being short. If it grows past a screen the answer is to promote entries, not to file more.
- **The bar will drift.** "Small, out of scope, real" is a judgement, and the temptation is to file
  anything rather than deal with it. A defect that would take a design discussion is not a paper
  cut, and filing it here buries it.
- **Entries rot.** They name files and line numbers that move. Each entry carries its date and what
  was being done, so a stale one can be re-verified or dropped rather than trusted.
