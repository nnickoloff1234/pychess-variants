## 1. Investigate

- [ ] 1.1 Find why `onMsgGetSeeks` empties the tables with `innerHTML = ''` (git blame / history).
- [ ] 1.2 Confirm in Chrome's accessibility tree that a `<tbody>` inserted already populated with
      `aria-live` produces no announcement on lobby load.

## 2. Implement

- [ ] 2.1 Keep both seek tables' vnodes; patch against them instead of rebuilding.
- [ ] 2.2 `key: seek.id` on every seek row (regular, bughouse, unknown, catalogued name row).
- [ ] 2.3 `aria-live="polite"` + `aria-relevant="additions"` on each seek `<tbody>` (or `role="log"`).

## 3. Verify

- [ ] 3.1 Measured: no visual change; rows still click, join and cancel as before.
- [ ] 3.2 A seek created in another window is announced once; a cancelled one is silent; landing in
      the lobby and changing the category filter read nothing; a re-sort is silent.
- [ ] 3.3 Heard with Orca.
- [ ] 3.4 Gates: `yarn lint`, `yarn typecheck`, `yarn md`, `yarn test`.
