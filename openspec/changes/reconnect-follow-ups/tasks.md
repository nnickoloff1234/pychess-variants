# Tasks

Carried out of `2026-09-07-reconnect-sync-controller`, which was archived with these open. The task
numbers there are given so the original wording can be found.

## 1. The clock rules (was 3.4)

- [ ] 1.1 Decide whether the controller is given the fact it lacks — is this seat's clock still
      running — or whether the whole clock decision moves out to the caller. Either settles it; what
      cannot stand is the current split, which works only because each side happens to see the half
      it needs.
- [ ] 1.2 Express branch 1's rule as a decision too: a whole position replaces all four clocks. It is
      applied by the caller today and stated nowhere.
- [ ] 1.3 The tree header already describes the rules in prose. Whatever is built, the prose and the
      code SHALL agree, and the prose is the one that must not be quietly outgrown.

## 2. The flicker (was 6.4)

- [ ] 2.1 Decide first: is the repaint right? Holding the pending move optimistically would avoid the
      flicker and strand the client somewhere the server has never been if the move is refused. This
      is a product decision.
- [ ] 2.2 Whichever way it goes, cover the intermediate frame with a scenario. It is fiddly —
      probably a MutationObserver, or a probe timed between the snapshot and the confirmation — which
      is why it was recorded rather than done.
- [ ] 2.3 Note while doing it that `bughouse-restored-game-loose-ends` has a neighbouring symptom: a
      restored game renders with no last-move highlight. Both are about what a repaint carries.

## 3. Premoves (was 6.2 and 6.5)

- [ ] 3.1 Decide whether an armed premove survives a full board message, with the two readings in
      `2026-09-07-reconnect-sync-controller` task 6.5 as the starting point.
- [ ] 3.2 A scenario that can tell the readings apart. N6 arms a premove across a reconnect but the
      position does not change, so it cannot.
- [ ] 3.3 The two premove quirks in the `round-clocks-are-client-authoritative` note belong here too.
- [ ] 3.4 One more, found 2026-09-07 and not yet placed: `releasePremove` still fires while the
      reader has scrolled away, so a premove can be dispatched against boards showing history.

## 4. Verification debt (was 5.1)

- [ ] 4.1 S1, S2, S4, S5, S8, S9 and S11 of the clock stress suite were not re-run on 2026-09-06 —
      only S3, S6b, S7 and S10 were. Re-run them, or retire each with a reason. They were clean or
      fixed in the 2026-08-30 pass and nothing since obviously touches them, which is an argument for
      retiring rather than for assuming.

## 5. Not in this change

- [ ] 5.1 The three stale clock values in a move message — that is
      `bughouse-shrink-ply-clock-record`, which exists and describes exactly it.
