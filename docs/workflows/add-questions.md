# Add questions

1. Read `CLAUDE.md`, `docs/LESSONS.md` and `docs/QUESTION_RULES.md`.
2. If the person did not say which domain or topic, or how many: default to 10 questions in the domain with the highest weight and the fewest questions (`npm run check` prints the counts).
3. Read `src/bank.js`. List questions that already cover the topic so you do not repeat them. Find the next free id number in the domain.
4. For each fact, open the official page and read it. Write down the URL for `src`.
5. For each concept, name its twin (the thing it is confused with). Write the pair as two questions, one each way round, linked with `twin`.
6. Make all four options the same family and about the same length. The correct option must not be the longest.
7. Add the questions to `src/bank.js`, grouped by domain.
8. Run `npm run check`. Fix every ERROR. Read every WARNING and fix it, or say why it is fine.
9. Run `npm test`. 0 failures.
10. Update `CLAUDE.md`. Commit.
11. Tell the person: how many you added, their ids, the twin pairs, and the last lines of `npm run check`.
