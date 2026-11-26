# StudyDrill

A blank, reusable multiple-choice drill for any certification exam. You get the questions you miss more often until you know them. An AI assistant (Claude, Antigravity or Cursor) writes the questions, and a checker script rejects badly written ones.

## Start a new exam

1. On GitHub, click **Use this template → Create a new repository**. Name it after the exam, for example `AZ900-Drill`. (One copy per exam, so progress never mixes.)
2. Clone it and open the folder in your AI tool.
3. Ask it to set up the exam:

| Tool | Type |
|---|---|
| Claude Code | `/new-exam AZ-900` |
| Antigravity | `/new-exam` then the exam code |
| Cursor | "Set up this drill for AZ-900 using docs/workflows/new-exam.md" |

4. Then add questions: `/add-questions 10 on <topic>`.

Want to see a finished one first? Copy `examples/gh300/config.js` and `examples/gh300/bank.js` into `src/`.

## Use the drill

Double-click `index.html`. Nothing to install.

- Keys: **1–4** answer, **K** knew it, **G** guessed, **N** next.
- **Weak spots** = questions you missed or guessed. **New** = ones you haven't seen.
- Progress is saved in that browser. **Export progress** makes a backup file; **Import progress** loads it on another computer.

## AI commands

| Command | What it does |
|---|---|
| `/new-exam` | Fills in `src/config.js` from the official study guide |
| `/add-questions` | Writes questions, checks them, fixes them until they pass |
| `/make-mock` | Writes a mock test and gives it to you one question at a time |
| `/mock-review` | Turns your mock misses into drill questions |

The instructions for every AI tool are in one place: `docs/AI_INSTRUCTIONS.md`.

## Checks (needs Node.js 18 or newer, no `npm install`)

```
npm run check   # checks every question against the rules
npm test        # tests the drill and the checker
```

If the AI says it's finished but didn't show **PASS**, tell it to run `npm run check`.

## Why the rules exist

`docs/LESSONS.md` — what went wrong with AI-written questions on SC-900.

## Branches

- `main` — this blank, reusable drill.
- `sc-900` — the original SC-900 drill with all its questions, kept as it was used for the exam.
