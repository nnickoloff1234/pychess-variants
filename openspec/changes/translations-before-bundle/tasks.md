## 1. Investigate

- [ ] 1.1 Answer the open questions in the proposal (cache busting, language dir names, no-mount
      pages, failure fallback, Jest).
- [ ] 1.2 List every module-level `_()` in `client/` (grep, then read: `const x = _(` at top level,
      tables in `variants.ts`, the `i18n.ts` lists) — each is either a live English-only bug or a
      marker-only list.

## 2. Implement

- [ ] 2.1 `po2json.sh` writes `client.js` per language.
- [ ] 2.2 `base.html` loads it before `{% block js %}`.
- [ ] 2.3 `i18n.ts` loads `window.PYCHESS_I18N` and sets the locale on creation; English fallback.
- [ ] 2.4 `main.ts`: drop `loadTranslations()`, call `start()` directly; restore normal order for
      `initTopNavDisclosures()`.
- [ ] 2.5 Remove `N_()`; piece tables use `_()`; `pieceName()` stops translating.
- [ ] 2.6 Delete the marker-only lists whose strings are now marked where used.

## 3. Verify

- [ ] 3.1 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`; Python gates if `server/`
      changed.
- [ ] 3.2 Hungarian session: Settings shows "Játék kategóriák"; a board summary names shogi pieces
      in a language that translates them; English and a language with no catalogue still work.
- [ ] 3.3 Network: no `client.json` fetch at start; the catalogue script is cached on the second page.
