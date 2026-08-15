import { h, VNode } from 'snabbdom';

// Reusable ARIA tablist/tabpanel widget for two-board pages.
//
// The widget builds two mountable vnodes and nothing else: the **tablist** and
// the **panel area** holding the tab contents. It deliberately does NOT build a
// container around them. A page that wants both inside one element renders that
// element itself, which is what lets a page put the switcher somewhere other
// than directly above its content — a different grid area, a rail down the side,
// wherever the layout wants it.
//
// That freedom is real because switching never touches the DOM: `select()`
// addresses the tab and panel vnodes this object retains, through their `.elm`.
// There is no proximity requirement between the two parts, and no selector, id
// lookup or traversal anywhere in this module. Ids exist on the elements only
// because `aria-controls` and `aria-labelledby` are id references and have no
// vnode equivalent; no behaviour here reads them.
//
// Callers never name a tab or a panel. The constructor id is a prefix:
// `<id>-tablist` and `<id>-tabpanels` for the two mounted elements, and
// `<id>-tab-<i>` / `<id>-panel-<i>` for their contents, so two widgets on one
// page cannot collide.
//
// This exposes two views where the house convention is one composed view per
// widget (RoundSeatView.view(), MovelistView.placeholder(), …). That convention
// is about leaves which always sit together; here the two parts are meant to sit
// apart, so separate views are the requirement rather than a departure from it.
//
// Selection is NOT a re-render. Re-patching would be the more idiomatic snabbdom
// approach, but panels hold content this module does not own — the round page's
// movelist and game-info views retain and patch their own vnodes, and its chat
// renders into its container after insertion. Diffing those subtrees can replace
// the very elements those owners hold, leaving them patching detached nodes, so
// their content would silently stop updating. Toggling element state leaves
// every panel's subtree untouched.
//
// The consequence is that the selected tab lives in the DOM rather than in a
// model: anything that re-patches a mounted part resets it to index 0. No
// two-board page does that — each owner patches inside a panel.

export interface TabPanelDef {
    label: string;
    panelClass?: string; // extra class on the panel's wrapper div, e.g. 'chart-container'
    content: VNode[];
}

export class TabbedPanels {
    // retained so select() can address the elements once the page's patch has
    // populated each vnode's .elm
    private readonly panelVnodes: VNode[];
    private readonly tabVnodes: VNode[];
    private readonly tabPanelsVnode: VNode;
    private readonly tabListVnode: VNode;

    constructor(id: string, panels: TabPanelDef[], ariaLabel: string) {
        const tabId = (i: number) => `${id}-tab-${i}`;
        const panelId = (i: number) => `${id}-panel-${i}`;

        this.panelVnodes = panels.map((panel, i) =>
            h(
                panel.panelClass ? `div.${panel.panelClass}` : 'div',
                {
                    attrs: { id: panelId(i), role: 'tabpanel', tabindex: String(i), 'aria-labelledby': tabId(i) },
                    // index 0 is the default; every other panel relies on the page
                    // stylesheet's `display: none` for [role=tabpanel]
                    style: i === 0 ? { display: 'flex' } : {},
                },
                panel.content,
            ),
        );

        this.tabVnodes = panels.map((panel, i) =>
            h(
                'span',
                {
                    attrs: {
                        role: 'tab',
                        'aria-selected': i === 0 ? 'true' : 'false',
                        'aria-controls': panelId(i),
                        id: tabId(i),
                        tabindex: String(i),
                    },
                    on: { click: () => this.select(i) },
                },
                panel.label,
            ),
        );

        this.tabPanelsVnode = h('div', { attrs: { id: `${id}-tabpanels` } }, this.panelVnodes);
        this.tabListVnode = h(
            'div',
            { attrs: { id: `${id}-tablist`, role: 'tablist', 'aria-label': ariaLabel } },
            this.tabVnodes,
        );
    }

    // The two mountable parts. Both return the vnode built in the constructor and
    // never build a new one: select() operates on the vnodes this object holds, so
    // handing out a fresh vnode would leave switching acting on an element that
    // was never mounted — and only sometimes, depending on how often the caller
    // asked. A page that wants no switcher simply does not mount tabList().
    tabPanels(): VNode {
        return this.tabPanelsVnode;
    }

    tabList(): VNode {
        return this.tabListVnode;
    }

    // Runs only after the page's patch, so every .elm exists.
    private select(index: number): void {
        this.tabVnodes.forEach((tab, i) =>
            (tab.elm as HTMLElement).setAttribute('aria-selected', i === index ? 'true' : 'false'),
        );
        this.panelVnodes.forEach(
            (panel, i) => ((panel.elm as HTMLElement).style.display = i === index ? 'flex' : 'none'),
        );
    }
}
