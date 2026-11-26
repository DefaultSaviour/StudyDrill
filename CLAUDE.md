# StudyDrill — tracker

Read @docs/AI_INSTRUCTIONS.md first. It applies to every AI (Claude, Antigravity, Cursor).
This file is the tracker: read it at the start of a task, update it at the end.

## Subject
Not set up yet. Run the setup: `docs/workflows/setup.md` (`/setup`).

## Exam traps
(Filled in at setup.)

## Next Up / In-Progress
1. Run the setup (`docs/workflows/setup.md`).

## Completed Features
- Drill page: Mixed / Weak spots / New modes, knew-vs-guessed, trouble list with attempt dots, per-domain progress, export/import progress backup, blank-state screen.
- Question formats, each behind a switch in `features`: static multiple choice; typed answers (exact text, numbers, fractions, algebra, equations, roots, coordinates, inequalities, multi-part); dynamic values (`generate(rng, M)`); graphs and plotting (SVG) with offline maths rendering (KaTeX 0.16.11).
- Value types with tests: maths (integers, decimals, money, percentages, angles, triangle angles, fractions) and general (IPv4 private/public, CIDR, subnet masks, network/broadcast/hosts, ports, MAC, 24-hour times, dates).
- Rule packs that scan all question text, including every generated instance: broken-output (always on), ipv4, ipv4-public-private, cidr, subnet-mask, port, mac, money, percentage, time24, date. Subject rules in `src/subject-rules.js`, each tested against its own good and bad examples.
- Question checker: SC-900 lessons (length bias, banned names, sources, twins, explanations), feature switches, 100-seed generator runs with self-tests, sources may be repo files (`notes/…`) that must exist.
- Guided setup (`/setup`): subject, domains (given / found / built as we go), features, sources, rule packs and subject rules.
- AI pointers: Claude (`CLAUDE.md`, `.claude/commands/`), Antigravity (`.agents/`), Cursor (`.cursor/rules/`).
- Examples: `examples/gh300`, `examples/networking`, `examples/maths-n5`, each with a `drill.html` you can open directly (built by `npm run examples`, kept in sync by a test). The empty drill links to them.
- README written for non-technical people first (download, unzip, open; make your own with an AI assistant; problems table), developer details below.

## Do not undo
- Option order is shuffled by the page; the bank can store the answer at any index.
- Question ids, domain numbers and `storageKey` are permanent once used (progress is stored against them).
