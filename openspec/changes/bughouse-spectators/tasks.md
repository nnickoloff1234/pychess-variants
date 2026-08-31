## 0. Status

**Postponed, opened 2026-08-29.** Nothing is broken: the element is empty, `display: none`, and its
row measures 0. Written down so the next person to meet `uleft` in a template knows it is a
placeholder for a feature that was never wired.

## 1. What was measured

- [x] 1.1 Analysis page: `<under-left id="spectators"></under-left>` — zero children,
      `display: none`, 0x0, and the page constructs no websocket.
- [x] 1.2 Two-board round page: the socket HAS `case 'spectators':` and its body is commented out —
      `// this.onMsgSpectators(msg);` — under a note saying the block was copied from `gameCtrl.ts`.
- [x] 1.3 Single-board pages render it correctly: `gameCtrl.onMsgSpectators` patches `#spectators`,
      and `site.css`'s `under-left` places it as a centred wrapping row in the `uleft` area.

## 2. Decide

- [ ] 2.1 Was the handler commented out deliberately? Check the history before uncommenting.
- [ ] 2.2 Does the analysis page want spectators at all? Same question as the presence dots — see
      `analysis-page-presence-websocket`.

## 3. Do

- [ ] 3.1 Round page: call `onMsgSpectators` from the two-board socket.
- [ ] 3.2 Analysis page: either wire it (with the socket, in the other change) or remove the element
      and its `uleft` area from every template in every mode.
- [ ] 3.3 If `uleft` is removed, edit every drop arrangement together — a missed template places an
      item in an implicit row.

## 4. Verify

- [ ] 4.1 A watched game shows its spectators on the two-board round page as it does on the
      single-board one.
- [ ] 4.2 Frontend gates.
