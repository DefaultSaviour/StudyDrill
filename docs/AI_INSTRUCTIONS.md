# StudyDrill — instructions for any AI assistant

This file is for Claude (Claude Code, claude.ai), Antigravity (Gemini), Cursor (Composer) or any other AI working in this repo.
Small pointer files load it automatically: `CLAUDE.md`, `.agents/rules/studydrill.md` and `.cursor/rules/studydrill.mdc`.

## What this repo is

A blank, reusable multiple-choice study drill for any certification exam. It uses spaced repetition: missed and guessed questions come back more often.
- One copy of the repo = one exam. To study a new exam, make a new copy (on GitHub: **Use this template**) and run the new-exam steps.
- The person studying is a junior developer. Explain what you did in plain English, short sentences, British spelling. No jargon without a one-line explanation.

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/config.js` | Exam name, domains and weights, allowed source sites, banned old names | Yes, at setup. Add banned names any time. |
| `src/bank.js` | The questions | Yes. This is the main file you change. |
| `src/logic.js`, `src/app.js`, `index.html` | The drill engine. It works. | NO, unless the person asks for an engine change. |
| `scripts/check-bank.js` | The question checker | NO. Never weaken it to make a question pass. |
| `tests/` | Tests (`npm test`) | Only when changing the engine or checker. |
| `docs/QUESTION_RULES.md` | Rules every question must follow | Read before writing questions. |
| `docs/LESSONS.md` | Why the rules exist (lessons from SC-900) | Read once. |
| `docs/workflows/` | Step-by-step guides for each task | Follow them exactly. |
| `examples/gh300/` | A finished example (GH-300 config + 10 questions) | Use as a format reference. |
| `docs/mock-reviews/`, `mocks/` | Mock tests and their reviews | Add files here. |
| `CLAUDE.md` | Project tracker: Next Up and Completed | Read at the start, update at the end of every task. |

## Tasks

| The person says | Follow |
|---|---|
| "Set this up for exam X" | `docs/workflows/new-exam.md` |
| "Add questions on X" | `docs/workflows/add-questions.md` |
| "Make me a mock" | `docs/workflows/make-mock.md` |
| "Here are my mock misses" | `docs/workflows/mock-review.md` |

## Hard rules

1. After ANY change to `src/bank.js` or `src/config.js`, run `npm run check` and `npm test`. Both must pass. If they fail, fix the questions and run them again. Do not say you are finished until both pass. Paste the last lines of `npm run check` in your reply.
2. Never change the checker or the tests to make a question pass. Fix the question.
3. Never change or reuse a question `id`. Progress is stored against it. To retire a question, ask first.
4. Never change `storageKey` in `src/config.js` after questions have been answered. Progress is stored under it.
5. Never invent a fact. Every question needs a `src` link to an official page (see `allowedSources`) that you have opened and read, and that states the fact.
6. Do not create `AGENTS.md` or `GEMINI.md` at the repo root. The tracker is `CLAUDE.md`.
7. When the task is done, commit with a clear message. Push only if the person asks.
