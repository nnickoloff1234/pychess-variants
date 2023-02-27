# TODO: make videos page paginated


#  Deferred translations!
def _(message):
    return message


VIDEO_TAGS = {
    "Howto": _("Howto"),
    "Introduction": _("Introduction"),
    "Opening": _("Opening"),
    "Middlegame": _("Middlegame"),
    "Endgame": _("Endgame"),
    "Fundamentals": _("Fundamentals"),
    "Tactics": _("Tactics"),
    "Puzzle": _("Puzzle"),
    "Janggi": _("Janggi"),
    "Xiangqi": _("Xiangqi"),
    "Makruk": _("Makruk"),
    "Shogi": _("Shogi"),
    "S-Chess": _("S-Chess"),
    "Capablanca": _("Capablanca"),
    "Placement": _("Placement"),
    "Duck": _("Duck"),
    "Match": _("Match"),
    "Tournament": _("Tournament"),
    "Hu Ronghua": _("Hu Ronghua"),
    "Yoshiharu Habu": _("Yoshiharu Habu"),
}

VIDEO_TARGETS = {
    "beginner": _("beginner"),
    "intermediate": _("intermediate"),
    "advanced": _("advanced"),
}

del _

VIDEOS = [
    {
        "_id": "BqvYsPAufB8",
        "title": "DUCK CHESS",
        "author": "Eric Rosen",
        "tags": ["Duck", "Howto"],
        "target": "beginner",
        "duration": "19:01",
    },
    {
        "_id": "k20Civy_a3E",
        "title": "First duck chess arena on pychess [HIGHLIGHTS]",
        "author": "PyChess",
        "tags": ["Duck", "Tournament"],
        "target": "intermediate",
        "duration": "23:47",
    },
    {
        "_id": "Xeil4C9rU34",
        "title": "Speedrun vs NEW Duck Chess A.I.",
        "author": "Eric Rosen",
        "tags": ["Duck", "Tactics"],
        "target": "beginner",
        "duration": "33:00",
    },
    {
        "_id": "Qddn3o6yX_M",
        "title": "Chak (Mayan Chess) - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "14:27",
    },
    {
        "_id": "Vyc4Llxgke8",
        "title": "Introduction to the PyChess Website",
        "author": "PyChess",
        "tags": ["Introduction"],
        "target": "beginner",
        "duration": "20:48",
    },
    {
        "_id": "WmMw97hp8C0",
        "title": "Makpong, Ouk Chatrang (Cambodian Chess), and ASEAN Chess - How to play",
        "author": "PyChess",
        "tags": ["Howto", "Makruk"],
        "target": "beginner",
        "duration": "5:26",
    },
    {
        "_id": "LWl8nMYrONM",
        "title": "How to checkmate with 2 knights (in Hoppel-Poppel)",
        "author": "PyChess",
        "tags": ["Endgame", "Puzzle"],
        "target": "intermediate",
        "duration": "13:36",
    },
    {
        "_id": "wzxgy2qJMwM",
        "title": "The weirdest bug in the history of pychess (how to play placement chess)",
        "author": "PyChess",
        "tags": ["Placement", "Opening", "Puzzle"],
        "target": "intermediate",
        "duration": "14:20",
    },
    {
        "_id": "hLv7kJQWukg",
        "title": "King vs king endgame (in Synochess and Empire)",
        "author": "PyChess",
        "tags": ["Endgame", "Puzzle"],
        "target": "intermediate",
        "duration": "9:58",
    },
    {
        "_id": "uyNsTgo8ylI",
        "title": "Makruk (Thai Chess) - How to play",
        "author": "PyChess",
        "tags": ["Howto", "Makruk"],
        "target": "beginner",
        "duration": "6:19",
    },
    {
        "_id": "p1WEdE3TdM8",
        "title": "如果你一直想找個集分析、對奕、競技於一身的網站，那這隻影片將帶給你Pychess這個好地方。",
        "author": "PyChess",
        "tags": ["Introduction"],
        "target": "beginner",
        "duration": "30:05",
    },
    {
        "_id": "0HqKri2R5ls",
        "title": "Empire Chess - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "6:32",
    },
    {
        "_id": "Ap4mGkR8HDA",
        "title": "Orda Chess (and Mirror) - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "11:15",
    },
    {
        "_id": "5f9QKK7cm20",
        "title": "Tori Shogi - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "12:14",
    },
    {
        "_id": "YH63AlxpXkg",
        "title": "Shogi - How to play (using internationalized piece set)",
        "author": "PyChess",
        "tags": ["Howto", "Shogi"],
        "target": "beginner",
        "duration": "17:40",
    },
    {
        "_id": "KDkF2dEt41g",
        "title": "Janggi (Korean Chess) - How to play (using internationalized piece set)",
        "author": "PyChess",
        "tags": ["Howto", "Janggi"],
        "target": "beginner",
        "duration": "17:13",
    },
    {
        "_id": "e4jYQ0UMmGk",
        "title": "Hybrid Piece Basics",
        "author": "PyChess",
        "tags": ["Fundamentals", "Tactics"],
        "target": "beginner",
        "duration": "9:02",
    },
    {
        "_id": "WRk3ZbX2bpA",
        "title": "Shogun Chess - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "4:37",
    },
    {
        "_id": "E6AzOO4-340",
        "title": "S-Chess (Seiwaran Chess, SHARPER Chess) - How to play",
        "author": "PyChess",
        "tags": ["Howto", "S-Chess"],
        "target": "beginner",
        "duration": "3:02",
    },
    {
        "_id": "CRrncO-w524",
        "title": "Grand Chess - How to play",
        "author": "PyChess",
        "tags": ["Howto"],
        "target": "beginner",
        "duration": "2:06",
    },
    {
        "_id": "c8nZQiq6VgY",
        "title": "CAPABLANCA CHESS",
        "author": "ChessNetwork",
        "tags": ["Howto", "Capablanca"],
        "target": "intermediate",
        "duration": "16:23",
    },
    {
        "_id": "HNYWioiltH0",
        "title": "Capablanca Chess - How to Play",
        "author": "PyChess",
        "tags": ["Howto", "Capablanca"],
        "target": "beginner",
        "duration": "6:18",
    },
    {
        "_id": "boT1qyDA5RA",
        "title": "Xiangqi Basics",
        "author": "PyChess",
        "tags": ["Xiangqi", "Opening", "Endgame"],
        "target": "beginner",
        "duration": "16:53",
    },
    {
        "_id": "5EDG5RP8OZ8",
        "title": "Xiangqi (Chinese Chess) - How to play (Using Internationalized Piece Set)",
        "author": "PyChess",
        "tags": ["Xiangqi", "Howto"],
        "target": "beginner",
        "duration": "8:13",
    },
    {
        "_id": "ujWzsxm18aQ",
        "title": "Seirawan-Sharper Chess introduction with GM Yasser and JannLee",
        "author": "JannLee Crazyhouse",
        "tags": ["Howto", "S-Chess"],
        "target": "beginner",
        "duration": "2:27:11",
    },
    {
        "_id": "tSXZbbeR-kU",
        "title": "GM Yasser Seirawan Introduces S-Chess!",
        "author": "chessbrah",
        "tags": ["S-Chess", "Puzzle", "Endgame"],
        "target": "intermediate",
        "duration": "1:27:55",
    },
    {
        "_id": "-b91uceklhM",
        "title": "หมากรุกไทย: เว็บใหม่มาเเรง Pychess.org (มีเอไอให้เล่นฟรี)",
        "author": "หมากรุกไทย ฆราวาสผู้ใฝ่รู้",
        "tags": ["Introduction"],
        "target": "beginner",
        "duration": "15:10",
    },
    {
        "_id": "xw6NpYeuozQ",
        "title": "Crazyhouse 960 - opperwezen vs JannLee (Series 3)",
        "author": "JannLee Crazyhouse",
        "tags": ["Match"],
        "target": "advanced",
        "duration": "1:50:52",
    },
    {
        "_id": "WCJZj6szAJk",
        "title": "Xiangqi opening principles - and why they differ from chess",
        "author": "Xiangqi Chinese Chess",
        "tags": ["Xiangqi", "Fundamentals", "Opening"],
        "target": "beginner",
        "duration": "32:35",
    },
    {
        "_id": "-DHY3xhB0aE",
        "title": "European Grandmaster Joep Nabuurs' #1 Tip for Chess Players Trying to Improve at Xiangqi",
        "author": "Xiangqi Chinese Chess",
        "tags": ["Xiangqi"],
        "target": "intermediate",
        "duration": "12:47",
    },
    {
        "_id": "pX_ZDjeqlJs",
        "title": "Janggi - basic opening principles",
        "author": "Shogi TV",
        "tags": ["Janggi", "Opening"],
        "target": "beginner",
        "duration": "21:18",
    },
    {
        "_id": "-4ETYXWLEXs",
        "title": "Round1",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "39:50",
    },
    {
        "_id": "WALKTGnkrYM",
        "title": "Round2",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "32:13",
    },
    {
        "_id": "wWEvpvct8QQ",
        "title": "Round3",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "35:50",
    },
    {
        "_id": "INYX4zIoDOY",
        "title": "Round4",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "36:50",
    },
    {
        "_id": "iqHXpdsyVYM",
        "title": "Round5",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "1:12:16",
    },
    {
        "_id": "MEmptahUlgI",
        "title": "Round6",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "47:28",
    },
    {
        "_id": "lXRKxfXxsHk",
        "title": "Round7",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "41:02",
    },
    {
        "_id": "W9ccSduSw6Q",
        "title": "Final blitz decider and results",
        "author": "Janggi France - 제르제레미",
        "tags": ["Janggi", "Tournament"],
        "target": "beginner",
        "duration": "20:38",
    },
    {
        "_id": "QnkQW7ICj3Y",
        "title": "Shogi Exercise #1 - Pawn Tactics",
        "author": "HIDETCHI",
        "tags": ["Shogi", "Tactics"],
        "target": "beginner",
        "duration": "10:17",
    },
    {
        "_id": "PKRdiUIwVwg",
        "title": "Shogi Exercise #2 - Pawn Tactics",
        "author": "HIDETCHI",
        "tags": ["Shogi", "Tactics"],
        "target": "beginner",
        "duration": "10:17",
    },
    {
        "_id": "YH2RAJo6Z-4",
        "title": "Xiangqi Grand Master Profile Hu Ronghua with ENGLISH Subtitles",
        "author": "Snail's Wild World of Xiangqi Chinese Chess",
        "tags": ["Xiangqi", "Hu Ronghua"],
        "target": "beginner",
        "duration": "25:31",
    },
    {
        "_id": "-1jXt-QbuEA",
        "title": "A Concept in Xiangqi Opening",
        "author": "Singapore Xiangqi Academy",
        "tags": ["Xiangqi", "Opening"],
        "target": "beginner",
        "duration": "9:08",
    },
    {
        "_id": "IFKSuw2rthE",
        "title": "Janggi - Mate in 3 (or 2) Puzzles",
        "author": "Amphibian Hoplite",
        "tags": ["Janggi", "Puzzle"],
        "target": "beginner",
        "duration": "10:01",
    },
    {
        "_id": "btgiwpo9c4s",
        "title": "Opening 1 Be mindful of piece advantage and activity",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Opening"],
        "target": "beginner",
        "duration": "13:56",
    },
    {
        "_id": "qmeUX4_2oKo",
        "title": "Opening 2 4th File Rook Basics",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Opening"],
        "target": "beginner",
        "duration": "10:05",
    },
    {
        "_id": "KYTlNhk2KSk",
        "title": "Middlegame 1 Piece values and basic tactics",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Middlegame"],
        "target": "beginner",
        "duration": "13:08",
    },
    {
        "_id": "-ooJdh8orE0",
        "title": "Middlegame 2 Let's fight using material advantage. How to gain and not lose pieces.",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Middlegame"],
        "target": "beginner",
        "duration": "12:53",
    },
    {
        "_id": "7ngWaevzYxw",
        "title": "Endgame 1 Let's learn checkmate patterns",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Endgame"],
        "target": "beginner",
        "duration": "13:20",
    },
    {
        "_id": "0HFxYYAXVXY",
        "title": "Endgame 2 How to defend against a check",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Endgame"],
        "target": "beginner",
        "duration": "13:55",
    },
    {
        "_id": "mrUZ3Slwf9Y",
        "title": "Endgame 3 Mutual attack - fight for each move",
        "author": "JapanShogiAssociation",
        "tags": ["Shogi", "Endgame"],
        "target": "beginner",
        "duration": "17:59",
    },
    {
        "_id": "950nyyjOirU",
        "title": "25 Xiangqi Checkmate Strategies (Part 1) | Chinese Chess game tips for beginners",
        "author": "Xiangqi Chinese Chess",
        "tags": ["Xiangqi", "Tactics"],
        "target": "beginner",
        "duration": "10:50",
    },
    {
        "_id": "MyLXgkL4C5A",
        "title": "The Most Popular Openings in Xiangqi | An Intro to the Chinese Chess Opening",
        "author": "Xiangqi Chinese Chess",
        "tags": ["Xiangqi", "Opening"],
        "target": "beginner",
        "duration": "11:27",
    },
    {
        "_id": "yi6qNq5Uaww",
        "title": "1st Capablanca Chess Arena",
        "author": "ChessNetwork",
        "tags": ["Capablanca", "Tournament"],
        "target": "beginner",
        "duration": "57:52",
    },
    {
        "_id": "82U8LR6MSV0",
        "title": "Aesthetics of game : shogi, Japanese traditional culture",
        "author": "ANA Global Channel",
        "tags": ["Shogi", "Yoshiharu Habu"],
        "target": "beginner",
        "duration": "9:46",
    },
]
