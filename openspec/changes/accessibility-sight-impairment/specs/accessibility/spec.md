## ADDED Requirements

### Requirement: Every page can be navigated without sight

Every page SHALL offer, as its first two Tab stops, a "Skip to main content" link and a link to the
accessibility guide. Every page SHALL have a navigation landmark for the site menu and a main
landmark. The page's `<html lang>` SHALL name the interface language.

The site menu's sections SHALL be disclosure buttons that announce whether they are open; Enter SHALL
open a section and Escape SHALL close it. Header panels and the mobile menu SHALL do the same, and a
closed menu SHALL NOT leave invisible links in the Tab order.

A keyboard user SHALL see where focus is: a focus ring MAY be suppressed for mouse focus only, never
for keyboard focus.

#### Scenario: The first Tab
- **WHEN** a keyboard user presses Tab once on any page
- **THEN** focus reaches "Skip to main content", and the next Tab the accessibility guide link

#### Scenario: A menu section by keyboard
- **WHEN** a menu section button has focus and the user presses Enter, then Escape
- **THEN** the section opens and is announced as expanded, then closes and is announced as collapsed

### Requirement: Controls are real, named controls

Anything that acts on click SHALL be a button or a link reachable by keyboard, including lobby seek
rows, tournament standings and top games, live game cards, puzzle votes and tab lists (buttons with
`role="tab"`). Every control and form field SHALL have an accessible name, translated like the rest
of the interface. Decorative images SHALL carry empty alternative text, and diagrams in the rules
pages SHALL be labelled with what they show. The forum's and the round-robin's modals and the alert
dialogs SHALL be native dialogs that Escape closes.

#### Scenario: Accepting a seek
- **WHEN** a keyboard user tabs to a seek row in the lobby and presses Enter
- **THEN** a button named after the seek ("Join: <player>, <time control>, <variant>") accepts it

### Requirement: Game pages are organised by headings

Every round and analysis page, single-board and two-board, SHALL have a level 1 heading naming the
game. The single-board round SHALL have level 2 headings for the moves, the game actions and the
chat; analysis SHALL have one for the moves, and for the chat where there is one. The puzzle,
editor, lobby and players pages SHALL also have a level 1 heading.

#### Scenario: Jumping to the moves
- **WHEN** a screen reader user lists the headings of a round page
- **THEN** the game's name is the level 1 heading, and Moves, Actions and Chat are level 2 headings

### Requirement: The board has a text summary

Every game, analysis, puzzle and study page SHALL carry a visually hidden text summary of each board,
under a level 2 heading "Board: Summary" that the page gives it. The summary SHALL be a list, with no
headings of its own: the pieces of each side (a nested list, one line per kind of piece with its
squares, in the variant's own square names), the pockets in drop variants, the last move, the clocks
in words, and the status. The last move and the status SHALL be announced when they change:
assertively in the user's own games, politely on analysis and puzzle pages. The clocks SHALL NOT be
announced as they tick. On two-board pages each board SHALL have its own summary, headed "Board A:
Summary" and "Board B: Summary". The forum captcha's summary sits under the captcha's own heading.

#### Scenario: The opponent moves
- **WHEN** the opponent plays a move in the user's own game
- **THEN** the summary's last move changes and the screen reader announces it at once

### Requirement: Events in a game are announced

Draw, takeback and rematch offers SHALL be announced when they arrive and SHALL be answerable with
keyboard-reachable Accept and Decline buttons. Puzzle feedback SHALL be announced. New chat messages
SHALL be announced politely, and chat history loaded on a page load or reconnect SHALL NOT be. On the
analysis board each engine line SHALL be a button: Enter plays its first move, and pressing Enter
again follows the line, with focus staying on it.

#### Scenario: A reconnect does not replay the chat
- **WHEN** the page reconnects and refills the chat with its history
- **THEN** the history is not announced, and the next new message is

### Requirement: The board can be played from the keyboard

Every board SHALL be one Tab stop under a level 2 heading "Board", starting on the user's king and
returning to the square last left. While it has focus:

- the arrow keys SHALL move one square, up always away from the user, reading each square with its
  piece, with a short sound at the edge;
- Enter or Space SHALL pick up one of the user's pieces, and on another square play the move;
- the number keys SHALL jump to a rank (0 for the tenth) and Shift with a number to a file; a piece
  letter SHALL jump to the next piece of that kind, Shift going back;
- M SHALL read the legal moves of the piece on the square, L the last move and T both clocks;
- promotion and gating choices SHALL be reachable with the arrow keys, Enter choosing and Escape
  taking the move back;
- in drop variants, Right at the board's right edge SHALL enter the pocket, from which a piece can be
  picked and dropped.

The page's own keys (F flip, ? help) SHALL keep working on the board. On two-board pages each board
SHALL be its own Tab stop, named for its board. The mouse SHALL work as before.

#### Scenario: A move by keyboard
- **WHEN** the board has focus, the user moves to e2, presses Enter, moves to e4 and presses Enter
- **THEN** each square is read as it is reached, the pawn is picked up with a sound, and the move is
  played and announced as the last move

### Requirement: The forum captcha can be solved without sight

The forum's checkmate-in-one captcha SHALL be described by the board summary under a heading naming
the side to move, SHALL be playable with the keyboard board, and its result SHALL be announced.

#### Scenario: A wrong answer
- **WHEN** a keyboard user plays a move that does not checkmate
- **THEN** "Not a checkmate. Try again." is announced, also when it is the same answer again

### Requirement: Moves can be typed

A board setting "Input moves with the keyboard", off by default, SHALL add a text field named "Your
move" to the round page of a player, and to analysis, puzzle, study and both two-board pages; on
two-board pages one field per board the user plays, named for its board. The field SHALL be visible in
each page's main desktop layout and present for screen readers only on phones and on two-board pages.
M SHALL focus the field (and in an empty field the next one) when no board square has focus, and
Escape SHALL leave it.

The field SHALL accept a move as the move list writes it in the variant's own notation, with the
capture mark optional and 0-0 for O-O, or as two squares with an optional promotion suffix. A move
SHALL be played as soon as the text can mean only that move; Enter SHALL play the text when a longer
move also begins with it. Text that cannot become a move or a command SHALL be marked invalid, with a
sound. A move typed on the opponent's turn SHALL be played when the turn comes, if it is legal then.
Typed moves SHALL be played the way a click plays them.

The field SHALL accept the commands the page can perform: on a round page "clock", "who", "draw" and
"resign" while playing (typed draw and resign asking no further confirmation of their own), and "zerk"
in an arena; in a finished puzzle "next", "upv" and "downv"; everywhere "help" or "?", and "/" to
focus the chat. A command's answer SHALL be announced through a live region in the field.

#### Scenario: A drop typed in crazyhouse
- **WHEN** the user types P@e4 on their turn with a pawn in hand
- **THEN** the pawn is dropped on e4 and the move is announced as the last move

#### Scenario: A shogi promotion declined
- **WHEN** the user types the two squares of a move that may promote and presses Enter
- **THEN** the move is played without promotion

#### Scenario: Clocks on request
- **WHEN** the user types "clock" during a game
- **THEN** both clocks are announced in words

### Requirement: Each page lists its keyboard shortcuts

The question mark SHALL open a dialog listing the page's keyboard shortcuts, and when the move input
is on, the typing keys and the commands the page offers. The question mark in a move field and outside
it SHALL open the same dialog. Escape SHALL close it and return focus to where it was.

#### Scenario: Help from the move field on a two-board page
- **WHEN** the user types ? in a board's move field on a bughouse page
- **THEN** the page's one help dialog opens, listing "Flip boards", the typing keys and that page's
  commands, and Escape returns focus to the field

### Requirement: An accessibility guide describes what works

The site SHALL have an accessibility guide page, linked from every page's first Tab stops, describing
the page structure, the board summary, playing on the board, typing moves, moving through a game and
how offers, engine lines and chat behave, including the screen reader's focus mode the board needs.

#### Scenario: Finding the guide
- **WHEN** a user follows the second link of the first Tab stops
- **THEN** the accessibility guide opens
