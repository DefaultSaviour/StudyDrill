# Add questions

1. Read `CLAUDE.md`, `docs/LESSONS.md` and `docs/QUESTION_RULES.md`.
2. Work out what to add. If the person named a topic, add that topic only: do not race ahead of what they are studying. If they did not, default to 10 questions in the domain with the highest weight and the fewest questions (`npm run check` prints the counts).
3. If the domains are "built as we go" (see `CLAUDE.md`) and the topic does not fit any domain, add a new domain at the next free number in `src/config.js` and tell the person.
4. Read `src/bank.js`. List questions that already cover the topic so you do not repeat them. Find the next free id number in the domain.
5. For each fact, open the source (an allowed site, or a file in `notes/`) and read it. Write down the link or path for `src`.
6. Choose the format (only formats switched on in `features`):
   - Fact, rule, concept, "which one" → static multiple choice. For each confusable pair, write two questions, each way round, linked with `twin`.
   - Calculation, values that should change, recall of a word or command → dynamic question with typed answers.
   - Reading or drawing a graph → dynamic question with `visual` or `kind: "plot"`.
7. Multiple choice: all four options from the same family and about the same length; the correct option is never the longest.
8. Dynamic: every changing value comes from `M` (see the value types table). Never invent numbers.
9. Add the questions to `src/bank.js`, grouped by domain.
10. Run `npm run check`. Fix every ERROR. Read every WARNING and fix it, or say why it is fine. A rule pack error means the question contains an impossible value: fix the question.
11. Run `npm test`. 0 failures.
12. If you notice a kind of mistake the checker did not catch, propose a new rule for `src/subject-rules.js` (with good and bad examples).
13. Update `CLAUDE.md`. Commit, if the folder is a git repository.
14. Tell the person: how many you added, their ids, which are dynamic, the twin pairs, and the last lines of `npm run check`.
