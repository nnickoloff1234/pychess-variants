## Why

**Scope note (2026-08-15): this change grew, deliberately.** It began as "move the presets
out of the shared chat view" and became "take bughouse out of the shared chat view", which
is the same removal carried to its end. Three couplings were found, not one, and they are
listed under What Changes. The title still names the presets because they were the largest
and the reason the others came to light.

The bughouse chat presets — the grid of "need a knight", "don't trade", "my bad" buttons — are rendered from inside the **shared** chat view. `client/chat.ts` serves the single-board pages and the two-board pages alike, and it reaches into bughouse to do it:

```ts
import { onchatclick, renderBugChatPresets } from '@/two-board/round/chat';
…
bughouse && !ctrl.spectator ? renderBugChatPresets(ctrl.variant, sendMessage) : null,
```

A shared module importing a page-specific one, and branching on `ctrl instanceof RoundControllerBughouse` to decide whether to render it. The presets are visually a separate block already — a button grid between the message list and the input — and nothing about them belongs to chat except that they send a message.

The tab widget now supports a tab made of several independently placed parts, and the round page's layouts want the presets somewhere other than stacked with the message list. That is impossible while the presets are a child of the chat view's vnode.

## What Changes

- **The presets become their own widget**, `client/two-board/round/chatPresets.ts`, following the same view-plus-controller shape as `MovelistView`, `GameInfoView` and `RoundSeatView`. It renders its buttons at construction from the variant alone, which is all their labels, classes and titles depend on.
- **Two-step initialisation.** The buttons need to send a message, and the only thing that can send one is the round controller, which does not exist when the page's view is built. The widget is therefore constructed and rendered first, and given its sender afterwards in a second step, once the controller exists.
- **The shared chat view stops rendering them.** `client/chat.ts` loses its import of `renderBugChatPresets` and the branch that called it. What remains bughouse-specific there is untouched.
- **The Chat tab becomes two parts**: the chat view, and the presets. Both are mounted in `round.ts`, adjacent for now, so nothing moves on screen yet — but either can now be placed independently, which is the point.
- **The presets get a size floor.** Today a button is `width: 60%; padding-top: 60%` of its grid cell with no minimum, so it shrinks without limit: measured **45.92px** on the desktop and **13.23px** in portrait, against a WCAG 2.2 minimum target of 24px. The floor is expressed in terms of the player's own board square rather than a hardcoded pixel count, so it scales with everything else on the page.
- **The chat area and the presets become flex siblings** where they are mounted together: chat takes what it can, the presets take the height their buttons need and no more.
- **The `bughouse` flag disappears from `chatView`.** Its two remaining uses go: `blur`, whose entire body was a `console.log` behind a commented-out `focus()`, is deleted; and the room header becomes an option, `chatView(ctrl, chatType, { chatHeader })`, defaulting to true so the six other callers are untouched. Bughouse passes false and gets **no header element** rather than the empty one it used to draw, which returns 14px to the message list in landscape and 12.15px in portrait.
- **`chatMessage()` loses its `ply` and `RoundControllerBughouse` parameters, which were dead.** They existed so a message could be titled with the SAN of the move it was said at and click through to that ply — but every caller that passed them also passed `user: ''`, which takes a branch that reads none of the three, and the decoration lived in a branch no caller ever reached with a controller. The live implementation is `chatMessageBug()` in the bughouse module, which builds its own SAN element and handlers. Removing them also removes the `undefined` padding those call sites carried to step over a `time` they had no value for.
- **`client/chat.ts` ends up importing nothing from `two-board/`.**

## Capabilities

### New Capabilities

- `bughouse-chat-presets`: the presets as an independent widget — what it renders, when it renders, how it is given the ability to send, what a click does before it has been given that ability, and the size floor its buttons hold.

### Modified Capabilities

- `round-page-tools-tabs`: the Chat tab becomes two parts rather than one. Its requirement that "each panel receives one existing element, unchanged" is stated per panel, and chat now contributes two panels — the chat container and the presets — each still holding one element that is relocated rather than rebuilt.

## Impact

- `client/chat.ts` — the shared view loses the presets branch and the cross-layer import. The `RoundControllerBughouse` check it uses for other decisions stays.
- `client/two-board/round/chat.ts` — `renderBugChatPresets` moves out; the rest of the file is unaffected.
- `client/two-board/round/chatPresets.ts` — new.
- `client/two-board/round/round.ts` — constructs the widget, declares the Chat tab with two parts, mounts both.
- `client/two-board/round/roundCtrl.ts` — performs the second initialisation step once it can send.
- `static/bughouse.css` — `div#chatpresets` and its button rules. The `order: 3` the presets currently carry only means something inside the chat view's flex box, so the arrangement has to be re-established where they now sit.
- No server, API, persistence or i18n surface. The button titles keep their existing translations.
- Single-board pages that use `chat.ts` render exactly as before: the branch that is removed never fired for them.
