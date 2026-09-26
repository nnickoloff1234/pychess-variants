## Why

Four UI facts have never been observed, and each needs the same thing: a bughouse game that starts,
is played, and ends while the four pages stay open. Every attempt has been lost to a resign taken
early, an abandon timeout, a container rebuild, or the page work the game was staged for.

They were parked inside `rematch-survives-cache-eviction` because that change also needed a
long-lived finished game. That change is done and archived; these are not, and an archived change is
a record of what was done. So they move here rather than go with it — the same reason
`reconnect-follow-ups` existed.

**NONE OF THEM IS A REPORTED DEFECT.** They are things nobody has looked at, in an area where looking
has repeatedly found something: the boards move between grid containers, chessgroundx memoises
hit-test bounds, and the game-over transition rearranges the whole tools column at the moment the
reader is least able to re-check it.

## What Changes

Nothing, until each is looked at. Then one of two outcomes per item, both of which are progress:

- it behaves, and the observation is recorded so the next person does not re-stage the game; or
- it does not, and the finding gets a change of its own with the measurement attached.

## Capabilities

None. Observation of existing behaviour — whatever is found will name its own capability.

## Impact

- No code, unless a finding calls for it.
- The four-window harness, and a game with enough time on the clock to be played to a real ending.
  60+0 is the standing choice for exactly this.

## Not in this change

- Anything that can be answered by reading the code or by the scenario beds. These four cannot: they
  are about what the browser does with pixels and hit-tests while state changes underneath it.
