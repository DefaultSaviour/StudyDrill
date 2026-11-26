# StudyDrill — tracker

Read @docs/AI_INSTRUCTIONS.md first. It applies to every AI (Claude, Antigravity, Cursor).
This file is the tracker: read it at the start of a task, update it at the end.

## Exam
Not set up yet. Run the new-exam steps: `docs/workflows/new-exam.md`.

## Exam traps
(Filled in at setup.)

## Next Up / In-Progress
1. Set up an exam (`docs/workflows/new-exam.md`).

## Completed Features
- Drill engine: Mixed / Weak spots / New modes, knew-vs-guessed, trouble list with attempt dots, per-domain progress, export/import progress backup.
- Blank-state screen when no exam or no questions are set up.
- Question checker `scripts/check-bank.js` enforcing the SC-900 lessons (length bias, banned old names, official sources, twins, all-of-the-above, short explanations) and a filled-in config.
- Tests: `npm test`.
- One instructions file (`docs/AI_INSTRUCTIONS.md`) loaded by pointers for Claude (`CLAUDE.md`, `.claude/commands/`), Antigravity (`.agents/rules/`, `.agents/workflows/`) and Cursor (`.cursor/rules/`).
- Task guides in `docs/workflows/`: new-exam, add-questions, make-mock, mock-review.
- Example: `examples/gh300/` (config + 10 questions with sources).

## Do not undo
- Option order is shuffled by the page; the bank can store the answer at any index.
- Question ids and `storageKey` are permanent once used (progress is stored against them).
