## Context

`client/chat.ts` is the chat view for every page, single-board and two-board alike. It renders the presets by importing them from a bughouse module and branching on the controller's type:

```ts
import { onchatclick, renderBugChatPresets } from '@/two-board/round/chat';
…
bughouse && !ctrl.spectator ? renderBugChatPresets(ctrl.variant, sendMessage) : null,
```

The presets sit between `ol#{chatType}-messages` and `input#chat-entry`, and are reordered visually by CSS `order` — measured live: chatroom 0, messages 1, **presets 3**, input 2, with the whole box `flex-direction: column-reverse` in portrait.

The reason they are inside is `sendMessage`, a closure in `chatView` that calls `selfReport(message)` and then `ctrl.doSend({ type: chatType, message, room })`. The presets need that function and nothing else from chat.

Current button sizing has no floor at all:

```css
div#chatpresets button.bugchat { width: 60%; padding-top: 60%; }
```

Both percentages resolve against the grid cell, so a button is whatever the column width makes it. Measured on the live page:

| | button | player's board square | ratio |
|---|---|---|---|
| desktop (p1, 1914x827) | **45.92px** | 59 | 0.78 |
| portrait (p4, 386x835) | **13.23px** | 48 | **0.28** |

13.23px is unusable — WCAG 2.2 puts the minimum target at 24px.

## Goals / Non-Goals

**Goals:**

- The presets are an independent widget; the shared chat view knows nothing about them.
- They render without a controller, and gain the ability to send in a second step.
- The Chat tab becomes two parts, so the layouts can place them separately later.
- A preset button cannot shrink below a usable size, expressed relative to the board rather than in fixed pixels.

**Non-Goals:**

- Moving the presets anywhere on screen. They are mounted adjacent to the chat view, so this change is visually neutral apart from the button floor. Where each part actually goes in each of the three modes is the layout change that follows.
- Changing what the buttons say, send, or look like beyond their minimum size.
- Touching the single-board chat, or the parts of `chat.ts` that are bughouse-aware for other reasons — `ctrl instanceof RoundControllerBughouse` still decides the chatroom header and the blur behaviour.

## Decisions

### 1. A widget in the house shape, rendered at construction

`ChatPresetsView` in `client/two-board/round/chatPresets.ts`, exposing one composed view like `MovelistView` and `RoundSeatView` do. Everything it renders comes from the variant — the pocket roles decide the "need"/"don't give" pairs, the tells are fixed — so there is nothing to wait for and it builds its buttons in the constructor.

### 2. The sender arrives second, and clicks before it are discarded

The buttons must send, and only the controller can. The controller is built in the round app's `insert` hook, after the view it is inserted into has been constructed — so the widget cannot have a sender at construction, and this is a genuine ordering constraint rather than an accident to design around.

So: construct, render, mount; then hand the widget its sender when the controller exists. Between the patch and that call, a click does nothing. That window is a few milliseconds inside the same task in which the page becomes visible, so queueing a click for later delivery would be machinery for a case that cannot occur — but silently discarding it is a decision, not an oversight, and is stated as such.

*Alternative considered: give the widget the controller rather than a function.* Rejected — the widget needs exactly one capability, and taking the whole controller would let it grow others.

### 3. Sending reuses chat's own path, rather than rebuilding the envelope

`chatView`'s `sendMessage` calls `selfReport(message)` and then `ctrl.doSend({ type: chatType, message, room: spectator ? 'spectator' : 'player' })`. A preset that assembled that object itself would be a second definition of what a chat message is, and `selfReport` is easy to forget. The function the widget is given SHALL be the same one chat uses, so a preset is indistinguishable from typing.

That means the sender has to be reachable from outside `chatView`. Making it so is part of this change; the simplest form is for chat to expose the sender it already builds rather than for the round page to reconstruct it.

### 4. The button floor is a fraction of the player's own board square

Nikolay's terms: at least 60% of what a button is now before it becomes unusable, and tied to the board rather than to pixels. 60% of the desktop's 45.92px is **27.55px**, which also clears WCAG 2.2's 24px minimum — two independent routes to about the same number, which is a good sign.

Expressed against the player's own board square, 27.55px is 0.57 of the portrait square (48) and 0.47 of the desktop square (59). A single fraction of the own square — around 0.55 — reproduces the floor in both modes without a per-mode constant.

**The obstacle: "the player's own board square" is not currently expressible in CSS.** `--cg-width-a` and `--cg-width-b` are both available on the app, but they are board *identity*; which one is the player's own depends on the switch, exactly as it did for the pockets. The role classes added by `markRoles` are on the boards and strips, not on an ancestor of the presets, so they cannot select it either. Options, to settle during implementation:

- publish an own-square custom property alongside the existing units, which is where the portrait change already puts this kind of value;
- have `markRoles` set the property on a common ancestor rather than a class on the boards;
- or fall back to a fixed floor in `rem` and record that the board-relative form was wanted but not reachable.

### 5. Reflow rather than shrink

Once a button has a floor, a narrow column cannot fit five per row. The grid takes more rows instead — which it already does by mode today, `repeat(var(--rolesCount), auto)` against `repeat(calc(var(--rolesCount) * 2), auto)` in portrait. Making the column count follow the available width rather than the mode is the natural consequence of having a floor, and removes two of the three mode-specific rules.

## Risks / Trade-offs

- **The presets stop participating in the chat view's flex box**, where they carry `order: 3` against the input's `order: 2` and a `column-reverse` in portrait. Their position is currently the product of those interacting; mounted as a sibling, it has to be re-established. → The most likely source of a visual regression, and the reason to capture the current arrangement per mode before starting.
- **A floor changes the layout in portrait**, where buttons are 13.23px today. Twenty buttons at 27.5px need far more room than twenty at 13.23px, so the presets block grows and something else in that column gives. → This is the change doing what it was asked to do, but the effect on the portrait tools column should be looked at rather than assumed.
- **Exposing chat's sender widens `chat.ts`'s surface** to serve a caller that is not chat. → Preferable to a second definition of a chat message, but it is a shared file and the addition should be as narrow as possible.
- **The widget is inert between mount and wiring.** If the second step is ever forgotten, the buttons render and do nothing, silently. → The same silent-failure shape the tab widget's unmounted-part risk has; worth a deliberate check rather than a guard.
- **Reflowing by width may fight the three-mode rules** that currently set the column count per mode. → Removing them is the intent; confirm each mode still reads well rather than assuming width alone is sufficient.

## Migration Plan

1. Extract the widget with its buttons, still rendered from the same code, and have `round.ts` construct and mount it where the chat view already puts it — but still inside the chat view, so nothing moves.
2. Remove the presets branch and the import from `chat.ts`, exposing the sender, and wire the widget in the controller. At this point the presets are independent and should look unchanged.
3. Make the Chat tab two parts and mount the presets as the second, adjacent to the first.
4. Add the button floor and the reflow.

Steps 1–3 are visually neutral and independently checkable; step 4 is the only one that intends to change what is on screen. Reverting is reverting the diff.

## Open Questions

- **Where does the own-board square come from?** Decision 4's obstacle. It is the same role-versus-identity problem the pockets had, and the answer probably belongs with the published units rather than in this change — but this change is what needs it first.
- **Should the presets be available to spectators?** Today `!ctrl.spectator` suppresses them, which is right — a spectator has no partner to tell. Preserved as-is, but it is now a decision the widget's owner makes rather than a condition inside the shared view.
- **Does the floor belong to the button or to the grid cell?** Flooring the button leaves the cell free to be larger; flooring the cell keeps the grid regular. Only matters once reflow is in.
