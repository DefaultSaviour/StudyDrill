# StudyDrill

A blank, reusable study drill for any subject: an IT certification, a school course like National 5 Maths, networking, a language. You get the questions you miss more often until you know them. An AI assistant (Claude, Antigravity or Cursor) writes the questions, and a checker rejects badly written ones.

## What it can do

- **Multiple choice**, with checks that stop AI tells: the right answer is never the longest, every wrong option is a real thing, no "all of the above".
- **Typed answers**: text, numbers, fractions, algebra (`2(x+3)` = `2x+6`), equations, coordinates.
- **Dynamic questions**: new numbers or values every attempt, always valid (a "private IP" is always really private, money always has 2 decimal places).
- **Graphs**: questions with a chart, or where you plot the answer.
- **Checks for impossible values**: 333.444.55.666, port 70000, £14.999, 31 April — and rules for your own subject.

Each subject switches on only what it needs.

## Start a new subject

1. On GitHub, click **Use this template → Create a new repository**. One copy per subject, so progress never mixes.
2. Clone it and open the folder in your AI tool.
3. Run the setup. The AI asks you a few questions: what you're studying, how to organise the topics (you give them, it finds them, or it builds them as you go), which question types fit, and which checks to use.

| Tool | Type |
|---|---|
| Claude Code | `/setup` |
| Antigravity | `/setup` |
| Cursor | "Set up this drill using docs/workflows/setup.md" |

4. Then add questions: `/add-questions 10 on <topic>`.

Want to see finished ones first? Copy the `config.js` and `bank.js` from any folder in `examples/` into `src/`:
- `examples/gh300` — GitHub Copilot exam, multiple choice
- `examples/networking` — IPv4 addressing with new addresses every attempt
- `examples/maths-n5` — National 5 Maths with typed answers and graph plotting

## Use the drill

Double-click `index.html`. Nothing to install, works offline.

- Keys: **1–4** answer, **K** knew it, **G** guessed, **N** next.
- **Weak spots** = questions you missed or guessed. **New** = ones you haven't seen.
- Progress is saved in that browser. **Export progress** makes a backup file; **Import progress** loads it elsewhere.

## AI commands

| Command | What it does |
|---|---|
| `/setup` | Asks about your subject and fills in the settings |
| `/add-questions` | Writes questions, checks them, fixes them until they pass |
| `/make-mock` | Writes a mock test and gives it to you one question at a time |
| `/mock-review` | Turns your mock misses into drill questions |

All the instructions for every AI tool are in one place: `docs/AI_INSTRUCTIONS.md`.

## Checks (needs Node.js 18 or newer, no `npm install`)

```
npm run check   # checks every question against the rules
npm test        # tests the drill, checker, value types and rules
```

If the AI says it's finished but didn't show **PASS**, tell it to run `npm run check`.

## Branches

- `main` — this blank, reusable drill.
- `sc-900` — the original SC-900 drill with all its questions.
- `maths-n5` — National 5 Maths in use.

## Credits

Maths rendering uses [KaTeX](https://katex.org/) (MIT licence), included in `vendor/katex/`.
`docs/LESSONS.md` explains why the question rules exist.
