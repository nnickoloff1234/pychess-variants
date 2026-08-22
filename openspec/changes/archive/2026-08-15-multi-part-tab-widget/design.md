## Context

`client/two-board/common/tabs.ts` is 119 lines and already makes one deliberate separation: the tablist and the panel area are two independently mountable vnodes, with no container around them, so a page can put the switcher in a different grid area from the content. Switching never touches the DOM by selector — `select()` addresses the vnodes the object retains, through their `.elm`.

What it does not allow is a *tab* being in more than one place. Every panel is a child of a single `tabPanelsVnode`:

```ts
this.panelVnodes = panels.map((panel, i) => h(…, panel.content));
this.tabPanelsVnode = h('div', { attrs: { id: `${id}-tabpanels` } }, this.panelVnodes);
```

The round page's chat tab is really two pieces — preset buttons, and the chat text area with its input — that the portrait and landscape layouts want in different places. Today they can only be stacked inside one panel.

Two properties of the current module are load-bearing and must survive:

- **Selection is not a re-render.** Panels hold content this module does not own: the movelist and game-info views retain and patch their own vnodes, and chat renders into its container after insertion. Diffing those subtrees could replace the very elements those owners hold, leaving them patching detached nodes and silently ceasing to update. Toggling element state leaves every subtree untouched.
- **No DOM lookup.** No `querySelector`, no id lookup, no traversal. Ids exist only because `aria-controls` and `aria-labelledby` are id references.

## Goals / Non-Goals

**Goals:**

- A tab may consist of several dom-trees, shown and hidden together, mounted wherever the page wants.
- The widget returns the mount points positionally, in declaration order, so the caller can place them without the widget describing them.
- Both existing consumers keep rendering and behaving exactly as they do now.
- The two load-bearing properties above are preserved unchanged.

**Non-Goals:**

- Rearranging the round page's tools across the three screen-size modes. That is what this unblocks, and it is a separate change against `round-page-tools-tabs`.
- **Partitioning any existing tab into parts.** Deliberately deferred to its own proposal, and chat — the motivating case — turns out not to be a cheap add-on. Its tab content is a single empty placeholder, `h('div#bugroundchat')`, filled after insertion by `patch(document.getElementById('bugroundchat'), chatView(ctrl, 'bugroundchat'))`. The presets (`#chatpresets`) and the message list with its input are both produced *inside* `chatView()`, which other pages share. Splitting them therefore means either changing `chatView()` to render into two roots — touching every page that uses it — or forking chat rendering for the round page, plus changing `renderRoundChat()` from one id-keyed patch target to two. That is a change about chat, in shared code, with its own regression surface; folding it in here would also make it impossible to attribute a failure between it and the CSS re-homing below.
- Any change to how chat, the movelist or game-info render, patch or update themselves.
- A compatibility shim for the old single-content shape. Both consumers are in this repo and are updated here.
- Moving the selected tab out of the DOM into a model. It stays where it is; the trade is unchanged.

## Decisions

### 1. Every part is an independent mount point; the widget aggregates nothing

`panel(tabIndex, partIndex): VNode` returns the parent vnode of exactly one part. Three tabs of two parts each yield **six** mount points, and the caller places all six. There is no container per tab and none per part index — the widget's entire markup contribution becomes the tablist plus one panel element per part.

*Alternative considered and rejected: one aggregating area per part index* — area *k* holding the part-*k* panel of every tab, so the caller mounts a fixed small number of containers. It looks economical, and it is the shape I first proposed, but it quietly reintroduces exactly the constraint this change exists to remove. It assumes every tab wants its part *k* in the same place as every other tab's part *k*, which is the same "one common parent" assumption moved down a level. Nikolay's call, and it is the right one: mount points are independent across tabs, full stop.

The cost is real and accepted — a three-part tab plus a one-part tab plus a two-part tab is six placements in the page's view code rather than a handful of containers. That verbosity is the price of each part being genuinely free.

### 2. Part counts are per tab and unrelated

One tab may declare three parts, the next one, the next two. Nothing in the widget derives a maximum, pads a short tab, or reserves anything for a part a tab does not have: a part that was never declared has no panel and no mount point, and there is nothing to be empty.

This is a direct consequence of decision 1. Under the rejected slot design there had to be a slot count, short tabs contributed nothing to the higher slots, and a page that sized a slot would show a gap when a short tab was selected. None of that exists now — there is no slot to be empty, and the question of what a fixed-size area does when the selected tab has nothing for it does not arise.

### 3. `aria-controls` becomes a list

The attribute is defined as an ID-reference *list*, so a tab controlling several panels is expressible without inventing anything: `aria-controls="round-tabs-panel-0-0 round-tabs-panel-0-1"`. Each panel keeps `aria-labelledby` pointing back at the single tab. This is the reason to prefer several panels over one panel with several children — the relationship stays describable.

### 4. Ids gain a part index, and the panel-area id disappears

`<id>-panel-<tab>-<part>`, with the tab id unchanged at `<id>-tab-<index>`. There is no longer an `<id>-tabpanels` element to name, because there is no longer a container. Generated, never accepted from the caller, still prefixed by the widget id so two widgets on a page cannot collide.

### 4b. Addressing parts positionally, and the alternative of keeping references

The caller declared the tabs in order and each tab's parts in order, so `(tabIndex, partIndex)` names a part in the same terms the caller used to build it — no naming scheme, no lookup key, nothing for the widget to describe.

A caller may equally hold on to the vnodes it passed in and mount those, never calling the accessor. Both work and neither is privileged. Nikolay's read is that the indexed form is less code but more obscure to read, and that either is acceptable for now; the consumers here are single-part so the distinction barely shows, and it is worth revisiting when the round page actually places several parts.

Note the accessor returns the *panel* the widget wrapped around the caller's content, not the content itself — that wrapper is what carries the ARIA attributes and the visibility that switching toggles, so it is the thing that must be mounted.

### 4c. The panel area's CSS is re-homed, not deleted

Removing the container is not free. `static/bughouse.css` styles it, and the rules do real work:

```css
#round-tabs-tabpanels        { flex: 1 1 auto; display: flex; flex-flow: column;
                               min-width: 0; min-height: 0; }
#round-tabs-tabpanels > [role='tabpanel']
                             { flex: 1 1 auto; min-width: 0; min-height: 0;
                               overflow: hidden auto; }
```

Three behaviours live there. The container is the flex item that claims the height the tablist bar leaves and passes it to the open panel. The zero minimums defeat flexbox's automatic minimum size, which would otherwise hold the widget, its panels and its labels open — and this column being able to yield to nothing is what keeps both boards on screen at narrow widths. And `overflow: hidden auto` makes a panel scroll internally instead of growing, stated on both axes deliberately, because `overflow-y` alone computes `overflow-x` to `auto` and the Info panel's game-info is wider than the column at roughly 170px of min-content.

The child selector cannot survive as written; its parent will not exist. The panel properties move onto the panels themselves — reachable through the page's own container, or through `panelClass` now that a part can carry one — and the "claim the leftover height" role passes to whatever element the page mounts the part into.

`site.css`'s `div[role=tabpanel] { display: none; … }` is untouched and still supplies the default-hidden state the widget depends on.

**The general shape of this: sizing responsibility moves from the widget to the page.** One container used to say "whichever panel is open fills this space". Now each mount point says what its part does where it landed. That is the intent rather than a regression — a part in the tools column and a part beside the partner board want different things — but it is work the page takes on, and the round page's later layout change inherits it.

### 5. `select()` iterates parts as well as tabs

The retained structure becomes a panel vnode per (tab, part). Selection sets `aria-selected` on the tabs as now, and sets display on every retained panel — visible if its tab is the selected one, hidden otherwise. Still element-state toggling, still no lookup.

### 6. `panelClass` moves from the tab to the part

Each part is a distinct element in a distinct place, so each needs its own styling hook. The analysis page's `fenpgn-panel` becomes a property of that tab's single part rather than of the tab.

## Risks / Trade-offs

- **The default-visible display value is `flex`, hardcoded.** It already is today, and multiplying panels multiplies the assumption: a part whose layout wants `block` or `grid` cannot say so. → Out of scope to fix here, but worth noticing while the code is open; if a part needs a different display the honest fix is for the part to declare it rather than for the widget to guess.
- **A part can be forgotten.** With every part its own mount point, a caller that declares a part and never mounts it gets content that simply never appears — and switching to that tab will look half-broken rather than failing loudly. The old design could not have this bug, because mounting the area brought every panel with it. → The likeliest new defect this change introduces. Worth a deliberate check per part when the round page starts using several, and an argument for the caller keeping its own references, where an unused variable is at least visible.
- **A page could mount a panel more than once**, and the second mount would win the `.elm`, leaving switching acting on one of them. → Same hazard the current design already has; the stable-getter rule makes it detectable but does not prevent it. Not introducing a guard for a mistake no consumer makes.
- **Six placements where there were two.** Decision 1's accepted cost: the page's view code grows with the number of parts. → Judged worth it for parts being genuinely independent; revisit only if a page's view becomes hard to follow.
- **Breaking both consumers at once.** The change is mechanical but touches two pages that render differently. → Both are exercised in the harness; the analysis page has a no-game mode that must be checked separately from the with-game mode.
- **`tabindex` on panels is carried over as-is.** The current code sets `tabindex: String(i)` on panels, which is odd for a tabpanel and duplicates across parts once there are several. → Preserve the existing behaviour rather than quietly changing focus order in a refactor; record it as a question.

## Migration Plan

Pure client-side, no data or persistence. The order that keeps each step observable:

1. Change the types and the constructor to build the (tab, part) panel structure and the per-part areas.
2. Change `select()` to iterate it.
3. Replace `tabPanels()` with the indexed accessor and drop the panel-area container.
4. Update the analysis page, which has the simpler consumption and a no-game mode worth checking early.
5. Update the round page.

Reverting is reverting the diff; there is no state to migrate. Each consumer can be checked independently against its own before-state.

## Open Questions

- **Should a part be able to declare its own display value** instead of inheriting the hardcoded `flex`? Raised by decision 1's multiplication of panels; not needed by either consumer today.
- **Is the panel `tabindex` right?** It predates this change and is preserved unchanged, but a panel per part makes the duplication more visible.
- **Should the widget expose each tab's part count**, so a caller can assert it mounted them all? Deliberately omitted — the caller declared the parts and therefore already knows — but given that a forgotten part now fails silently (see Risks), a way to check would have a real consumer rather than a hypothetical one.
- **Indexed accessor or retained references?** Both are supported and neither is privileged; the indexed form is less code and reads more obscurely. Left open deliberately until the round page places several parts and the difference actually shows.
