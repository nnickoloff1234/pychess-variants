## 1. Capture the reference first

Both consumers must render identically afterwards, so record what they render now.

- [x] 1.1 On the round page, record the tools area's markup: the tablist and panel ids, each panel's class, and which element is inside each panel
- [x] 1.2 On the analysis page with a game, record the same, including the `fenpgn-panel` class and the move-times chart panel
- [x] 1.3 On the analysis page with no game (`isAnalysisBoard`), record that no tablist is present and the default panel is visible
- [x] 1.4 Record the switching behaviour on both pages: which panel is visible before and after clicking each tab
- [x] 1.5 Record the panel area's measured role in the tools column: its height against the column and the tablist bar, each panel's height and scroll behaviour, and what happens to the column when the window is narrowed — this is what the re-homed rules must reproduce

## 2. Rework the widget's types and construction

- [x] 2.1 Replace `TabPanelDef.content` with `parts: TabPartDef[]`, where `TabPartDef` is `{ panelClass?, content }`, and move `panelClass` from the tab to the part
- [x] 2.2 Build a panel vnode per (tab, part), retained so `select()` can address it, with ids `<id>-panel-<tab>-<part>`
- [x] 2.3 Drop the panel-area container entirely — no `<id>-tabpanels` element, no grouping of panels by tab or by part index; each part's panel is mounted on its own
- [x] 2.4 Give each tab an `aria-controls` listing every panel id it controls, space-separated, and each panel an `aria-labelledby` naming its tab
- [x] 2.5 Carry the initial visible display on the index-0 tab's panels only, as now, relying on the stylesheet default for the rest

## 3. Rework selection and the exposed surface

- [x] 3.1 Change `select()` to set `aria-selected` on the tabs and display on every retained panel, visible only where the panel's tab is the selected one — still element-state toggling, no selector, id lookup or traversal
- [x] 3.2 Replace `tabPanels(): VNode` with `panel(tabIndex, partIndex): VNode`, returning that part's retained panel vnode and the same object on every access
- [x] 3.3 Update the module's header comment: it currently states that the widget builds exactly two mountable vnodes and owns no container around them — the first half is no longer true and the second is now stronger

## 4. Update the consumers

- [x] 4.1 Analysis page: declare one part per tab, move `fenpgn-panel` onto that tab's part, and mount each tab's single part where the panel area used to be
- [x] 4.2 Round page: the same, one part per tab, each mounted in the tools area
- [x] 4.3 Confirm no other module imports the tabs module or names `tabPanels`
- [x] 4.4 Re-home `#round-tabs-tabpanels > [role='tabpanel']` — `flex: 1 1 auto`, `min-width: 0`, `min-height: 0`, `overflow: hidden auto` — onto the panels themselves, reached through the page's own container or through `panelClass`; the two-axis overflow is deliberate and must stay
- [x] 4.5 Give the "claim the height the tablist leaves and pass it to the open panel" role to the element the page mounts the parts into, replacing `#round-tabs-tabpanels`'s `flex: 1 1 auto; display: flex; flex-flow: column` and its zero minimums
- [x] 4.6 Delete the two `#round-tabs-tabpanels` rules once their behaviour lives elsewhere, and update the block comment above them, which describes the widget as contributing that element

## 5. Verify

- [x] 5.1 Round page renders identically against the 1.1 reference — same panels, same contents, same classes
- [x] 5.2 Analysis page with a game renders identically against 1.2, `fenpgn-panel` still applied and styled
- [x] 5.3 Analysis page with no game still shows no tablist and a visible default panel, per 1.3
- [x] 5.4 Switching works on both pages, matching 1.4
- [x] 5.5 The movelist still grows, game info still renders and chat messages still arrive inside their panels — the owners are still patching mounted elements, not detached ones
- [x] 5.5a The tools column still yields to nothing when the window narrows, against the 1.5 reference — the zero-minimum chain is what keeps both boards on screen and it now runs through different elements
- [ ] 5.5b Each panel still scrolls internally rather than growing, and the Info panel still does NOT grow a horizontal scrollbar — the two-axis overflow survived the move
- [x] 5.5c The open panel still takes the height the tablist bar leaves, against the 1.5 reference
- [x] 5.6 A tab with two parts, mounted in two different containers, shows and hides both together — exercised directly, since neither consumer uses it yet
- [x] 5.7 Tabs of differing part counts (3, 1, 2) each yield exactly that many mount points, with nothing created or reserved for parts that were not declared
- [x] 5.7a Two tabs' parts of the same index, mounted in different places, both switch correctly — the property the rejected slot design would have forbidden
- [ ] 5.7b A declared part that the caller never mounts: confirm what actually happens, since this is the defect the per-part design newly makes possible
- [x] 5.8 Two widgets on one page still generate non-colliding ids
- [x] 5.9 `aria-controls` lists every panel of a tab, and each panel points back at that tab
- [x] 5.10 `yarn typecheck` and `yarn test`

## 6. Decide

- [ ] 6.1 Whether a part should declare its own display value rather than inheriting the hardcoded `flex`
- [ ] 6.2 Whether the panel `tabindex` carried over from the current code is right, now that there is one per part
- [ ] 6.3 Whether the widget should expose each tab's part count, so a caller can assert it mounted them all — now that a forgotten part fails silently
- [ ] 6.4 Whether the round page should use the indexed accessor or keep its own references from construction; both work and the choice can wait until it actually places several parts

## Progress — implemented 2026-08-15, verified live on game `ZSmwOLN2`

Reference captured first (1.1-1.5) from the running harness, before any edit.

**The widget.** `TabPanelDef` is now `{ label, parts }` with `TabPartDef` `{ panelClass?, content }`;
panels are retained as `[tab][part]`; `tabPanels()` is gone and `panel(tabIndex, partIndex)`
returns one part's panel; `select()` iterates both dimensions; `aria-controls` is an
id-reference list. The panel-area container is not built at all.

**The CSS was re-homed, and this was the real risk.** `#round-tabs-tabpanels` and its
`> [role='tabpanel']` child rule are replaced by `.bug-round-tools > [role='tabpanel']`.
The column was already `display: flex; flex-flow: column`, so the panels became its direct
flex items and the open one claims the leftover height itself — no element needed to
stand between them.

Round page, after, against the 1.1/1.5 reference:

| | before | after |
|---|---|---|
| column / bar / open panel | 630.25 / 118.66 / 511.59 | **630.25 / 118.66 / 511.59** |
| panel flex, minimums, overflow | `1 1 auto`, `0`, `hidden auto` | **identical** |
| panel children | chat, movelist-block, game-info | **identical** |
| ids | `round-tabs-panel-<n>` | `round-tabs-panel-<n>-0` |

**5.5a — the property most at risk, and it holds.** Squeezing the wrapper in short
landscape: column 386.33 -> 110.33 at 1000px -> **0** at 800px, with board A staying at
x=0, w=437.33 throughout. The zero-minimum chain survives running through different
elements, so the column still yields to nothing rather than pushing a board off screen.

**Analysis page** matches its reference in both modes: with a game, tablist plus two tabs
switching correctly; without, no tablist and the default panel visible. `chart-container`
and `fenpgn-panel` still applied, now carried by the part.

**5.6 / 5.7 / 5.7a / 5.9 — the multi-part path was exercised for real**, since neither
consumer uses it. A second part was temporarily added to the Info tab and mounted in
`aside.sidebar-first` while the first stayed in `.bug-round-tools` — different subtrees
whose nearest common ancestor is `main`. Selecting Info showed **both**; selecting Chat
hid **both**; `aria-controls` read `round-tabs-panel-2-0 round-tabs-panel-2-1`; part counts
were 1, 1, 2 with nothing padded. The probe was then reverted and the clean state
re-verified: aside empty, three panels, geometry back on the reference numbers, and chat
and movelist still updating inside their panels.

`yarn typecheck` clean, 41 suites / 226 tests pass.

**Left open:** 5.5b (a panel scrolling internally under content taller than the column —
the Info panel did not overflow at the tested width, so the two-axis overflow rule is
carried over but unexercised), 5.7b (a declared part that is never mounted), and the three
decisions in section 6.

## Disposition at archive — 2026-08-15

Archived at 32/38. The goal is met: a tab can be several dom-trees, mounted anywhere,
shown and hidden together, and that was demonstrated across two genuinely different
subtrees rather than argued for. Both consumers render against their captured references,
`yarn typecheck` is clean and 41 suites / 226 tests pass.

**Deferred, with reasons.**

- **5.5b — internal panel scrolling unexercised.** The `overflow: hidden auto` rule moved
  across intact and is confirmed applied, but no panel's content exceeded the column at the
  widths tested, so the scrolling itself never happened. The rule's two-axis form matters —
  `overflow-y` alone would compute `overflow-x` to `auto` and the Info panel's ~170px
  min-content game-info would grow a horizontal scrollbar — so this is worth exercising the
  next time the round page's tools are touched.
- **5.7b — a declared but never mounted part.** Design predicts it simply never appears and
  its tab looks half-rendered on selection. Unconfirmed, and it is the one new defect this
  change makes possible, so the prediction is recorded rather than verified.
- **6.1 — per-part display value.** The visible display is still a hardcoded `flex`. Becomes
  live the moment a tab is actually split: chat's presets want to sit fixed while the
  message area flexes and scrolls, and one value cannot serve both.
- **6.2 — panel `tabindex`.** Carried over unchanged from the previous code, which set
  `tabindex` from the tab index. It is odd for a tabpanel and now repeats across a tab's
  parts. Deliberately not altered in a refactor that promised no behavioural change.
- **6.3 — exposing part counts** so a caller can assert it mounted them all. Now has a real
  motivation rather than a hypothetical one, given 5.7b's silent failure mode.
- **6.4 — indexed accessor versus retained references.** Both consumers use the accessor;
  the round page will decide for itself when it places several parts.

**The change this unblocks, and where to start it:** partitioning existing tabs, chat first.
Design's Non-Goals records the finding that makes it non-trivial — chat's tab content is a
single placeholder filled after insertion by `patch(document.getElementById('bugroundchat'),
chatView(ctrl, 'bugroundchat'))`, with the presets and the message area both produced inside
the shared `chatView()`. Splitting them is a change about chat in shared code, not about
tabs.
