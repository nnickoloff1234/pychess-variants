# Game `JJgZzLhJ` — the complete clock record

Extracted 2026-08-23 from the MongoDB document, which is the RECORD. `openspec/changes/
bughouse-clock-record-investigation/JJgZzLhJ.mongo.json` beside this file is the full document as
it stood, so both tables can be regenerated and checked even if the database is lost.

- **Variant** bughouse, **time control** 60+0 (`b: 60`, `i: 0`), **result** `1-0`, **status** 2.
- **Played** 2026-08-22 17:27:48 UTC. 32 plies across the two boards.
- **Ended by resignation**: BiskniAmazon + JanggiElephantC resigned, so AlfilBers + SilverAiWok won.

## The four seats

| seat | username | board / colour | team | mongo array |
|:-:|:--|:--|:-:|:--|
| wA | `Test-AlfilBers` | A white | 1 | `cw` |
| bA | `Test-BiskniAmazon` | A black | 2 | `cb` |
| wB | `Test-JanggiElephantC` | B white | 2 | `cwB` |
| bB | `Test-SilverAiWok` | B black | 1 | `cbB` |

Note the dash in these names is an EN DASH (U+2013). Team 1 is `wA + bB`, team 2 is `bA + wB` —
partners are on different boards and hold opposite colours.

## Table 1 — raw, exactly as recorded in MongoDB

Milliseconds, straight out of the `cw` / `cb` / `cwB` / `cbB` arrays at index = ply. `mover` is the
seat that made the move on that ply. Index 0 is the starting position, before any move.
| ply | bd | move | mover | cw = wA | cb = bA | cwB = wB | cbB = bB |
|--:|:-:|:--|:-:|--:|--:|--:|--:|
| 0 | - | (start) | - | 3600000 | 3600000 | 3600000 | 3600000 |
| 1 | b | e4 | wB | 3599063 | 3600000 | 3555963 | 3600000 |
| 2 | a | e4 | wA | 3134626 | 3600000 | 3555963 | 3600000 |
| 3 | a | f5 | bA | 3134626 | 3600000 | 3555963 | 3600000 |
| 4 | a | exf5 | wA | 3132748 | 3600000 | 3555963 | 3600000 |
| 5 | b | P@d5 | bB | 3132748 | 3600000 | 3555963 | 3168256 |
| 6 | b | Nf3 | wB | 3132748 | 3600000 | 3550947 | 3168256 |
| 7 | a | Nc6 | bA | 3132748 | 3579701 | 3550947 | 3168256 |
| 8 | b | b6 | bB | 3132748 | 3579701 | 3550947 | 3156952 |
| 9 | b | Bc4 | wB | 3132748 | 3579701 | 3550947 | 3156952 |
| 10 | a | Qh5+ | wA | 3121795 | 3579701 | 3550947 | 3156952 |
| 11 | a | g6 | bA | 3121795 | 3575824 | 3550947 | 3156952 |
| 12 | a | fxg6 | wA | 3116893 | 3575824 | 3550947 | 3156952 |
| 13 | a | hxg6 | bA | 3116893 | 3572845 | 3550947 | 3156952 |
| 14 | a | Qxg6+ | wA | 3114729 | 3572845 | 3550947 | 3156952 |
| 15 | b | dxc4 | bB | 3114729 | 3572845 | 3550947 | 3118698 |
| 16 | b | d3 | wB | 3114729 | 3572845 | 3545284 | 3118698 |
| 17 | b | e6 | bB | 3114729 | 3572845 | 3545284 | 3083609 |
| 18 | b | Nfd2 | wB | 3114729 | 3572845 | 3545284 | 3083609 |
| 19 | b | Qg5 | bB | 3114729 | 3572845 | 3545284 | 3069842 |
| 20 | b | g4 | wB | 3114729 | 3572845 | 3545284 | 3069842 |
| 21 | b | Qf6 | bB | 3114729 | 3572845 | 3545284 | 3065055 |
| 22 | b | f3 | wB | 3114729 | 3572845 | 3542013 | 3065055 |
| 23 | b | Qg5 | bB | 3114729 | 3572845 | 3542013 | 3059658 |
| 24 | b | Nxc4 | wB | 3114729 | 3572845 | 3499995 | 3059658 |
| 25 | b | Bc5 | bB | 3114729 | 3572845 | 3499995 | 3017509 |
| 26 | b | d4 | wB | 3114729 | 3572845 | 3499995 | 3017509 |
| 27 | b | Na6 | bB | 3114729 | 3572845 | 3499995 | 2979484 |
| 28 | b | Ne5 | wB | 3114729 | 3572845 | 3499995 | 2979484 |
| 29 | b | Nb8 | bB | 3114729 | 3572845 | 3499995 | 2977927 |
| 30 | b | Nd3 | wB | 3114729 | 3572845 | 3493642 | 2977927 |
| 31 | b | Na6 | bB | 3114729 | 3572845 | 3493642 | 2977927 |
| 32 | b | Nf4 | wB | 3114729 | 3572845 | 3481883 | 2977927 |


## Table 2 — the same values as a human reads them, with the four difference indicators

Clock column format is the one the page draws: `MM:SS`, or `H:MM:SS` at an hour or more, or
`MM:SS.t` under a minute. The four indicator columns are what each seat's own indicator shows —
`own clock - opponent's partner's clock`, the same colour on the other board, rounded to seconds
and carrying its sign. So `wA ind` pairs with `wB ind` (mirror images), and `bA ind` with `bB ind`.


| ply | bd | move | wA AlfilBers | bA BiskniAmazon | wB JanggiElephantC | bB SilverAiWok | wA ind | bA ind | wB ind | bB ind |
|--:|:-:|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| 0 | - | (start) | 1:00:00 | 1:00:00 | 1:00:00 | 1:00:00 | 0 | 0 | 0 | 0 |
| 1 | b | e4 | 59:59 | 1:00:00 | 59:15 | 1:00:00 | +43 | 0 | -43 | 0 |
| 2 | a | e4 | 52:14 | 1:00:00 | 59:15 | 1:00:00 | -421 | 0 | +421 | 0 |
| 3 | a | f5 | 52:14 | 1:00:00 | 59:15 | 1:00:00 | -421 | 0 | +421 | 0 |
| 4 | a | exf5 | 52:12 | 1:00:00 | 59:15 | 1:00:00 | -423 | 0 | +423 | 0 |
| 5 | b | P@d5 | 52:12 | 1:00:00 | 59:15 | 52:48 | -423 | +432 | +423 | -432 |
| 6 | b | Nf3 | 52:12 | 1:00:00 | 59:10 | 52:48 | -418 | +432 | +418 | -432 |
| 7 | a | Nc6 | 52:12 | 59:39 | 59:10 | 52:48 | -418 | +411 | +418 | -411 |
| 8 | b | b6 | 52:12 | 59:39 | 59:10 | 52:36 | -418 | +423 | +418 | -423 |
| 9 | b | Bc4 | 52:12 | 59:39 | 59:10 | 52:36 | -418 | +423 | +418 | -423 |
| 10 | a | Qh5+ | 52:01 | 59:39 | 59:10 | 52:36 | -429 | +423 | +429 | -423 |
| 11 | a | g6 | 52:01 | 59:35 | 59:10 | 52:36 | -429 | +419 | +429 | -419 |
| 12 | a | fxg6 | 51:56 | 59:35 | 59:10 | 52:36 | -434 | +419 | +434 | -419 |
| 13 | a | hxg6 | 51:56 | 59:32 | 59:10 | 52:36 | -434 | +416 | +434 | -416 |
| 14 | a | Qxg6+ | 51:54 | 59:32 | 59:10 | 52:36 | -436 | +416 | +436 | -416 |
| 15 | b | dxc4 | 51:54 | 59:32 | 59:10 | 51:58 | -436 | +454 | +436 | -454 |
| 16 | b | d3 | 51:54 | 59:32 | 59:05 | 51:58 | -431 | +454 | +431 | -454 |
| 17 | b | e6 | 51:54 | 59:32 | 59:05 | 51:23 | -431 | +489 | +431 | -489 |
| 18 | b | Nfd2 | 51:54 | 59:32 | 59:05 | 51:23 | -431 | +489 | +431 | -489 |
| 19 | b | Qg5 | 51:54 | 59:32 | 59:05 | 51:09 | -431 | +503 | +431 | -503 |
| 20 | b | g4 | 51:54 | 59:32 | 59:05 | 51:09 | -431 | +503 | +431 | -503 |
| 21 | b | Qf6 | 51:54 | 59:32 | 59:05 | 51:05 | -431 | +508 | +431 | -508 |
| 22 | b | f3 | 51:54 | 59:32 | 59:02 | 51:05 | -427 | +508 | +427 | -508 |
| 23 | b | Qg5 | 51:54 | 59:32 | 59:02 | 50:59 | -427 | +513 | +427 | -513 |
| 24 | b | Nxc4 | 51:54 | 59:32 | 58:19 | 50:59 | -385 | +513 | +385 | -513 |
| 25 | b | Bc5 | 51:54 | 59:32 | 58:19 | 50:17 | -385 | +555 | +385 | -555 |
| 26 | b | d4 | 51:54 | 59:32 | 58:19 | 50:17 | -385 | +555 | +385 | -555 |
| 27 | b | Na6 | 51:54 | 59:32 | 58:19 | 49:39 | -385 | +593 | +385 | -593 |
| 28 | b | Ne5 | 51:54 | 59:32 | 58:19 | 49:39 | -385 | +593 | +385 | -593 |
| 29 | b | Nb8 | 51:54 | 59:32 | 58:19 | 49:37 | -385 | +595 | +385 | -595 |
| 30 | b | Nd3 | 51:54 | 59:32 | 58:13 | 49:37 | -379 | +595 | +379 | -595 |
| 31 | b | Na6 | 51:54 | 59:32 | 58:13 | 49:37 | -379 | +595 | +379 | -595 |
| 32 | b | Nf4 | 51:54 | 59:32 | 58:01 | 49:37 | -367 | +595 | +367 | -595 |

---

# Game `sLF5O6kj` — the same two tables, re-derived after the fixes (task 7.1)

`JJgZzLhJ` above was measured through the **shifted read**, so its page-derived column describes a
bug that no longer exists. This section is the re-derivation the close-out asked for: a fresh game,
read through the fixed path, with the three findings checked one by one.

Ten plies, four separate players, ended by resignation. Seats: `wA` Test–LanceImmobilePi,
`bA` Test–KnightFers, `wB` Test–KnibisClobber, `bB` Test–KingCentaur.

## Table 1 — raw, exactly as recorded in MongoDB

```
m   len=10   o [1,0,0,0,0,1,1,0,0,1]        (1 = board B)
ts  len=11   monotonic, each entry within 50ms of the click that caused it
cw  len=11   [3600000, 3538354, 3091357, 3091357, 3046954 x3, 2751899 x3]
cb  len=11   [3600000, 3600000, 3600000, 3562451, 3562451, 3511985 x3, 3478595, 3478595]
cwB len=11   [3600000, 3538354 x6, 3332860 x4]
cbB len=11   [3600000, 3600000, 3599958, 3599957, 3599958, 3599957, 2988769 x4, 2879553]
```

All four arrays are `plies + 1`. `cbB`'s early entries are the known non-owned copies — the mover's
view of a seat it does not own — which is why nothing reads them any more (see finding 4).

## Table 2 — as a human reads them, with the four difference indicators

Each seat's value at each ply, reconstructed from the movers' authoritative entries alone
(`analysisClock.reconstructMainlineClocks`), and the four indicators computed from those.

| ply | board | mover | wA | bA | wB | bB | dwA | dbA | dwB | dbB |
|--:|:--|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| 1 | b | w | 58:58 | 1:00:00 | 58:58 | 1:00:00 | +0 | +0 | +0 | +0 |
| 2 | a | w | 51:31 | 1:00:00 | 58:58 | 52:33 | −447 | +447 | +447 | −447 |
| 3 | a | b | 51:31 | 59:22 | 58:58 | 51:55 | −447 | +447 | +447 | −447 |
| 4 | a | w | 50:46 | 59:22 | 58:58 | 51:11 | −491 | +491 | +491 | −491 |
| 5 | a | b | 50:46 | 58:31 | 58:58 | 50:20 | −491 | +491 | +491 | −491 |
| 6 | b | b | 50:15 | 58:31 | 58:58 | 49:48 | −523 | +523 | +523 | −523 |
| 7 | b | w | 46:49 | 58:31 | 55:32 | 49:48 | −523 | +523 | +523 | −523 |
| 8 | a | w | 45:51 | 58:31 | 55:32 | 48:51 | −581 | +581 | +581 | −581 |
| 9 | a | b | 45:51 | 57:58 | 55:32 | 48:17 | −581 | +581 | +581 | −581 |
| 10 | b | b | 45:33 | 57:58 | 55:32 | 47:59 | −599 | +599 | +599 | −599 |

## The three findings, checked

**Finding 1 — no offset between the series.** All four arrays are `plies + 1` long, and the analysis
page agrees with this table index for index: at ply 2 it renders wA 51:31 / bA 1:00:00 / wB 58:58 /
bB 52:33, and at ply 6 wA 50:15 / bA 58:31 / wB 58:58 / bB 49:48. Before the fix the same page showed
the values from two plies earlier, and bB read 59:59 where it now reads 52:33.

**Finding 2 — no unexplained zeros.** Think times derived per seat, from each seat's own moves only:

| seat | own-move think times (s) |
|:--|:--|
| wA | 508.64, 44.40, 295.06 |
| bA | 37.55, 50.47, 33.39 |
| wB | 61.65, 205.49 |
| bB | 611.23, 109.22 |

**Zero count: 0 of 10.** The zeros in the original report were the copied-forward entries of seats
that had not moved, which the per-seat derivation never counts.

**Finding 3 — all four indicators agree.** Exactly one magnitude per ply, teammates equal and the two
teams' values exact negations, at every ply: teammates-equal ✓, teams-negate ✓, magnitudes
`{0, 447, 491, 523, 581, 599}` — one per ply, never three or four at once.
