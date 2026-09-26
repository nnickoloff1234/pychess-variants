# Alt text, form labels and accessible names — sweep

Asked for 2026-09-27. **Findings only; nothing to be fixed until the gate.** Method and its limits are
in `focus-and-tabindex-sweep.md`: static source reading, the app never run.

**A method note specific to this sweep.** A line-based `grep` gives badly wrong answers here, because
`alt` and `aria-label` routinely sit on a later line than the tag or the `h(...)` call. A first pass
reported *"18 of 23 client images have no alt"*; a multi-line-aware parse gives **3 of 23**. Every
number below comes from the parsed version. Wrapping `<label>` elements are the same trap in the
other direction — see the calibration note under L5.

---

## Alt text — GOOD. Four misses in the whole codebase.

| Surface | Total | Missing `alt` |
|---|---|---|
| `<img>` in templates | **1776** | **1** |
| `h('img')` in client | 23 | 3 |

**All four are decorative, so the fix is `alt=""` in each case** — and that is not a cosmetic
distinction. **An `<img>` with no `alt` at all is announced by its filename**, so a screen reader
reads out a URL; `alt=""` marks it decorative and skips it silently. Missing is worse than empty.

- **`templates/profile.html:31`** — `<img src="{{ cup[kind][0] }}"></img>`, a trophy image. The
  parent `<span class="trophy perf …">` carries a `title` with the trophy's name, but a `title` on a
  parent is not an accessible name for the image. Either `alt=""` (the span describes it) or move the
  name into the alt.
- **`client/about.ts:26`** — the favicon on the About page.
- **`client/lobby/layer2fairy.ts:15`** — `4FairyPieces.svg`.
- **`client/lobby/layer2army.ts:16`** — `4ArmyKings.svg`.

**Worth noting as already right:** `templates/authors.html:24, 48` use a dedicated
`author.portrait_alt` field — real alt text per author, not a generic string. And
`client/lobby/layer1.ts` gives `alt: ''` to all eighteen decorative sliding pieces. Whoever did that
understood the distinction above.

## Icon-only buttons — CLEAN

**Zero** `<button>` elements in `templates/` lack an accessible name. Every one has `aria-label`,
`title`, or text content. This is the failure mode that usually dominates an audit like this, and it
is absent.

## Inline SVG — small surface, low priority

4 `<svg>` in templates, 2 in client. Only one of the template files carries `role="img"`,
`aria-label`, `aria-hidden` or a `<title>`. Small enough to fix in one pass whenever it is convenient;
not worth its own decision.

---

## Form labels — two clear defects, one pattern-level gap

Templates: **134 labelable controls**, 13 unresolved, of which **2 are intentional** and **1 is a
false positive**, leaving 10.

### L1. An orphaned `for` — `templates/arena-new.html:292`

```html
<label class="form-label" for="form3-byo">Byoyomi periods</label>
<select id="form3-byoyomiPeriod" name="byoyomiPeriod" class="form-control">
```

**`form3-byo` does not exist anywhere in `templates/` or `client/`** — confirmed by grep. The label
points at nothing and the select has no accessible name. A typo that only a checker finds, because it
looks correct and reads correctly on screen.

### L2. `label=` is not an HTML attribute — `templates/memory.html:74-77`

```html
<input label="zen" type="radio" id="zen" name="game-bg" checked>
<input label="kinkaku" type="radio" id="kinkaku" name="game-bg">
<input label="oak" type="radio" id="oak" name="game-bg">
<input label="zen2" type="radio" id="zen2" name="game-bg">
```

There is no `label` attribute on `<input>` — it is valid only on `<option>` and `<optgroup>`. **All
four radio buttons have no accessible name at all**; a screen reader announces "radio button, not
checked" four times with no way to tell which background each selects. Someone reasonably assumed
`label=` would work.

### L3. Labels with no `for`, on disabled inputs — `arena-new.html:528, 533`

`<label class="form-label">Start date</label>` followed by, not wrapping, a `disabled` input. Not
focusable, so the impact is small, but the association is still absent.

### L4. Placeholder as the only name — 3 controls

`templates/admin_teams.html:48`, `templates/team-declined-requests.html:11`,
`templates/team-leaders.html:12` — search and filter inputs with a `placeholder` and nothing else.
Screen readers do announce a placeholder, but it is not a label: it disappears the moment the user
types, so the field loses its name exactly when they need to check what they are filling in. Mostly
admin and team-management pages.

### L5. Client-side controls — a real gap, but the NUMBER needs runtime confirmation

**78 form controls rendered from `client/*.ts`; 44 have no label this sweep could resolve.**

**Calibrated on three samples, and about one in three is a false positive:**

- `client/study/addToStudy.ts:95, 101` — **false positive.** Correctly wrapped:
  `h('label', [h('span', _('Study name')), h('input…')])`. Snabbdom wrapping labels are nested
  arrays rather than text, and this sweep cannot follow them reliably.
- `client/usernameDialog.ts:138` — **weak, real.** `placeholder: _('Username')` only, with an `<h2>`
  and `<p>` above it but no label.
- **`client/lobby.ts:859` and `:879` — GENUINE, and the best example.**

  ```ts
  h('div#rating-range-setting', [
      _('Rating range'),                     // a bare string, NOT a <label>
      h('div.rating-range', [
          h('input#rating-min.slider', { … }),
  ```

  The visible heading is a bare string inside a `div`. **Two range sliders share it with no
  programmatic association**, so a screen reader announces "slider" twice, unnamed, and the user
  cannot tell minimum from maximum. `client/lobby.ts:1740` and `:1748` repeat the shape for the
  auto-pairing range — **four unnamed sliders.**

**So: somewhere around 25-30 real, concentrated in `lobby.ts`, `myVariants.ts`, `forum.ts`, `inbox.ts`
and `study/`.** An exact list needs either a Snabbdom-aware parser or the rendered DOM, which is task
2.2's job. The rating sliders are confirmed and are the ones worth naming now.

**The shape of the gap is worth more than the count**: labels in client code are applied by
`h('label', { attrs: { for: … } })` (41 of 71 `h('label')` calls) or by wrapping, and both are used —
so there is no single convention to check against, which is why controls slip through.

---

## Summary

| | What | Where | Size |
|---|---|---|---|
| A1 | 4 images with no `alt` (all decorative) | `profile.html:31`, `about.ts:26`, `layer2fairy.ts:15`, `layer2army.ts:16` | 4 × `alt=""` |
| L1 | `for="form3-byo"` points at a non-existent id | `arena-new.html:292` | one word |
| L2 | `label=` is not an HTML attribute — 4 radios unnamed | `memory.html:74-77` | 4 lines |
| L3 | `<label>` with no `for` on disabled inputs | `arena-new.html:528, 533` | 2 lines |
| L4 | Placeholder as the only accessible name | 3 admin/team inputs | 3 `aria-label`s |
| L5 | ~25-30 client controls unlabelled; **4 rating sliders confirmed** | `lobby.ts:859, 879, 1740, 1748` and others | per control |
| S1 | Inline SVG mostly unlabelled | 6 nodes total | one pass |

**Clean, and worth recording as such:** 1775 of 1776 template images have `alt`; every template
`<button>` has an accessible name; `authors.html` has per-author alt text; `layer1.ts` marks all
eighteen decorative pieces `alt=""`.

**None of this touches the board, layout CSS or chessgroundx**, and every item helps sighted users of
voice control and speech input too, so like the other sweeps it belongs to candidate G.
