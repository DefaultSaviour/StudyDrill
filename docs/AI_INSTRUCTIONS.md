# StudyDrill — instructions for any AI assistant

This file is for Claude (Claude Code, claude.ai), Antigravity (Gemini), Cursor (Composer) or any other AI working in this repo.
Small pointer files load it automatically: `CLAUDE.md`, `.agents/rules/studydrill.md` and `.cursor/rules/studydrill.mdc`.

## What this repo is

A blank, reusable study drill for any subject: a certification exam, a school course, or a topic. It uses spaced repetition: missed and guessed questions come back more often.
- Questions can be multiple choice, typed answers, dynamic (new values every attempt) or graph-based. Each subject switches on only what it needs (`features` in `src/config.js`).
- One copy of the drill = one subject. For a new subject, make a new copy (download the zip again, or on GitHub use **Use this template** or a fork) and run the setup.
- The drill may be the whole project, or a folder inside a bigger project (for example `study-drill/`). If it is a folder inside a project: run every `npm` command inside that folder, and read this file and `docs/workflows/` yourself, because the pointer files and slash commands only load when the drill folder is opened as the project.
- The person may have downloaded a zip and may not know git or the command line. Do the technical steps for them and explain in plain words.
- The person studying may be a beginner. Explain what you did in plain English, short sentences, British spelling. No jargon without a one-line explanation.

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/config.js` | Subject name, domains, features, rule packs, allowed sources, banned old names | Yes, at setup. Add banned names and domains any time. |
| `src/bank.js` | The questions | Yes. This is the main file you change. |
| `src/subject-rules.js` | Checks for impossible values specific to this subject | Yes, at setup or when you spot a new kind of mistake. Every rule needs good and bad examples. |
| `src/value-types.js` | Valid random values: IP addresses, subnets, ports, MAC, times, dates | Add a new type (with a test) when a subject needs one. Never weaken an existing one. |
| `src/math-engine.js` | Maths value types, answer checking (algebra, fractions, equations), graph checking | Only for engine bugs or new maths features, with tests. |
| `src/rule-packs.js` | Built-in checks: IPv4, CIDR, subnet masks, ports, MAC, money, percentages, dates, times | Add packs with examples; never weaken one. |
| `src/visuals.js`, `vendor/katex/` | Graph drawing and maths rendering | Only for engine bugs or features. |
| `src/logic.js`, `src/app.js`, `index.html` | The drill page and spaced repetition | NO, unless the person asks for an engine change. |
| `scripts/check-bank.js` | The question checker | NO. Never weaken it to make a question pass. |
| `tests/` | Tests (`npm test`) | Add tests when you change the engine, value types or rules. |
| `docs/QUESTION_RULES.md` | Rules every question must follow | Read before writing questions. |
| `docs/LESSONS.md` | Why the rules exist (lessons from SC-900) | Read once. |
| `docs/workflows/` | Step-by-step guides for each task | Follow them exactly. |
| `examples/` | Finished examples: `gh300` (multiple choice), `networking` (dynamic IPs), `maths-n5` (maths) | Use as models. |
| `docs/mock-reviews/`, `mocks/` | Mock tests and their reviews | Add files here. |
| `CLAUDE.md` | Project tracker: subject, Next Up, Completed | Read at the start, update at the end of every task. |

## Tasks

| The person says | Follow |
|---|---|
| "Set this up for X" / first use | `docs/workflows/setup.md` |
| "Add questions on X" | `docs/workflows/add-questions.md` |
| "Make me a mock" | `docs/workflows/make-mock.md` |
| "Here are my mock misses" | `docs/workflows/mock-review.md` |

## Hard rules

1. After ANY change to `src/` or `scripts/`, run `npm run check` and `npm test`. Both must pass. If they fail, fix the questions and run them again. Do not say you are finished until both pass. Paste the last lines of `npm run check` in your reply.
2. Never change the checker, a rule pack, a value type or a test to make a question pass. Fix the question.
3. Never change or reuse a question `id`. Never renumber a domain that has questions. Progress is stored against them. To retire a question, ask first.
4. Never change `storageKey` in `src/config.js` after questions have been answered.
5. Never invent a fact. Every question needs a `src` (an allowed site, or a file in an allowed folder) that you have opened and read, and that states the fact.
6. Never invent random values in a dynamic question. Use the value types in `M`. If one is missing, add it with a test first.
7. Do not create `AGENTS.md` or `GEMINI.md` at the repo root. The tracker is `CLAUDE.md`.
8. Do not put personal details (names, scores, dates of exams, health, money) in any file. This repo may be public.
9. When the task is done, if the folder is a git repository, commit with a clear message. If it is not (a downloaded zip), do not run git commands; just say what changed. Push only if the person asks.
10. If `node` or `npm` is missing, stop and tell the person to install Node.js (the LTS version) from https://nodejs.org/ and then reopen the AI tool. Do not skip the checks.
