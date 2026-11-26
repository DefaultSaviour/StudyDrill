---
trigger: always_on
---

# StudyDrill

Read and follow @docs/AI_INSTRUCTIONS.md before doing anything in this repo.
Before writing or changing any question, read @docs/QUESTION_RULES.md.

The rules that matter most:
- After any change to `src/bank.js` or `src/config.js`, run `npm run check` and `npm test`. Do not say you are finished until both pass. Show the last lines of `npm run check`.
- Never weaken `scripts/check-bank.js` or the tests. Fix the question instead.
- Never change a question `id` or the `storageKey`.
- Never invent a fact. Every question links to an official page you have read.
- The correct option must never be the longest or the most detailed. Wrong options must be real, from the same family, and include the answer's twin.
