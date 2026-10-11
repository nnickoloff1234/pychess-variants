## Why

Raised by Nikolay on 2026-10-11 while reviewing PR #2377 (`accessibility-sight-impairment`), on its
`N_()` marker in `client/i18n.ts`: *"isn't this the proper fix though — to always load translations
first before anything else that might depend on them?"* It is.

**The constraint today.** The client is one IIFE bundle (`esbuild.mjs:12`, `format: 'iife'`). When
it runs, every module's top-level code runs at once. Only afterwards does `client/main.ts`
(`loadTranslations()`, ~line 507) `fetch` `/static/lang/<lang>/LC_MESSAGES/client.json` and
`i18n.loadJSON()` it, and `start()` waits for that. An IIFE cannot top-level `await`, so **no
module-level code can ever see the translations**: any `_()` evaluated while the bundle loads
returns the English msgid, and that English is kept for the life of the page.

**A live bug from it, measured 2026-10-11:** `client/i18n.ts:68`
`export const translatedGameCategory = _('Game Category');`. In a Hungarian session the Settings
panel shows its neighbours translated ("Hang", "Háttér", "Tábla beállítások") but **"Game Category"
in English**, although `lang/hu/LC_MESSAGES/client.po` has `msgstr "Játék kategóriák"`.

**The workarounds the constraint has produced:**

- upstream's marker-only lists in `client/i18n.ts` (`translatedColorNames`, `translatedPieceNames`,
  `translatedVariantDisplayNames`, `translatedCustomStartPositions`, `translatedTooltips`, …), headed
  *"Do not use / These lists are only here to mark these texts translatable"*: arrays of `_()` calls
  whose values nobody reads, only so `pybabel extract` finds the strings;
- PR #2377's piece-name tables (`client/pieceNames.ts`, `client/variants.ts`) and bughouse chat
  presets (`two-board/round/chatPresets.ts`): entries written with `_()`, which returns English at
  load, then translated again with `_(name)` at display time (`pieceName()`, `presetLabel()`). An
  `N_()` marker was tried for this and dropped in review;
- upstream `variants.ts` pocket tables written `'p-piece': _('pawn')` at module level, which are
  therefore always English (replaced by `pieceName()` in PR #2377);
- the comment in `main.ts` explaining why the header menus are wired *before* the translation
  fetch: `start()` only runs a round trip after first paint.

**The language never changes without a reload** (the picker POSTs to `/translation/select`), so
"translated once when the page starts" is correct for the whole life of a page.

## What Changes

Load the language's catalogue with a classic `<script>` before the bundle; the browser runs scripts
in order, so it is there before any module code runs.

1. **`lang/po2json.sh`** also writes `static/lang/<lang>/LC_MESSAGES/client.js`:
   `window.PYCHESS_I18N = <the same JSON>;` (German `client.json` is ~30 KB). Keep `client.json`
   if anything else reads it; otherwise replace it.
2. **`templates/base.html`**: `<script src="{{ static(...client.js) }}">` for the session language
   just before `{% block js %}` (line ~167) — one place, ahead of every page's bundle tag. English
   (no catalogue) emits nothing, or an empty catalogue.
3. **`client/i18n.ts`**: load `window.PYCHESS_I18N` into the `gettext()` instance and set the
   locale when the module is created. `i18n.ts` is imported by nearly every module, so it is
   evaluated first.
4. **`client/main.ts`**: remove `loadTranslations()` and its `fetch`; call `start()` directly. The
   early `initTopNavDisclosures()` special case and its comment can go back to normal order.
5. **Cleanup the constraint made necessary:**
   - `pieceName()` and `presetLabel()` return the table entry without their second `_()`;
   - `translatedGameCategory` becomes correct with no change (verify in Hungarian);
   - the marker-only lists in `i18n.ts`: delete each one whose strings are now written with `_()`
     where they are used; keep any that still mark strings built from runtime data (e.g. a
     variant name looked up by key) — check each list's actual consumers before deleting.

## Open questions — measure, don't assume

- **Cache busting.** `static()` versions URLs? The catalogue must refresh when translations update,
  like the bundle does.
- **Pages with no `#pychess-variants` element** and the error path: today a failed fetch falls back
  to English (`i18n.setLocale('')`); a missing script must fall back the same way.
- **Language codes**: `data-lang` / `{{ lang }}` vs. the `static/lang/<dir>` names (`zh_CN`,
  `gl_ES`, …) — use whatever `loadTranslations()` uses today.
- **First paint**: one blocking ~30 KB script (cached after the first page) replaces a fetch that
  already delayed `start()`; confirm nothing renders later than today.
- **Tests**: Jest never loads `client.json`; check nothing there relies on the fetch.

## Impact

- `lang/po2json.sh`, `templates/base.html`, `client/i18n.ts`, `client/main.ts`,
  `client/pieceNames.ts`, `client/variants.ts`; possibly `server/` if the template needs a helper
  for the catalogue URL.
- No new strings. Fixes "Game Category" in every language that translates it.
- Upstream decision: it changes how every page starts.
