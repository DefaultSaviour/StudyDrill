# Review a mock test

Every miss and every guess from a mock becomes drill questions.

1. Ask the person to paste their misses and guesses: the question, what they picked, the correct answer, and miss or guess. Do NOT explain anything while they are still taking a mock. Reply only "Noted" until they say they are finished.
2. Check each answer key against official docs. AI-written mocks are sometimes WRONG (old product names, retired features). If a key is wrong, say so clearly and do not count it against the person.
3. Sort each item:
   - knowledge gap (did not know the fact),
   - twin confusion (picked the thing it is confused with),
   - misread (the question had the deciding words and they were missed). Misreads need slowing down, not new questions.
4. Search `src/bank.js` for questions that already cover each item. If one exists, the problem is repetition, not a missing question: say "use Weak spots mode" and do not add a duplicate.
5. For each real gap or twin confusion not covered, follow `add-questions.md`: two questions, each way round, linked with `twin`.
6. If the mock used an old or retired name, add it to `bannedTerms` in `src/config.js` with a one-line reason.
7. Write `docs/mock-reviews/<YYYY-MM-DD>-<mock name>.md`: score; a table of misses (question, answer, what was picked, type); wrong answer keys; new question ids; one "deciding question" rule per miss.
8. Run `npm run check` and `npm test`. Both must pass.
9. Update `CLAUDE.md`. Commit.
