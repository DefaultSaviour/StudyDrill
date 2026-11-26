# Set up the drill for a new exam

1. Ask for the exam code (for example AZ-900, GH-300) if it was not given.
2. Check `src/bank.js` is empty. If it already has questions, STOP and ask: this copy is already used for another exam. A new exam needs a new copy of the repo.
3. Find the OFFICIAL study guide (for Microsoft and GitHub exams: learn.microsoft.com/credentials/certifications/resources/study-guides/<exam code>). Open it and read the "skills measured" list and the date it was last updated.
4. Fill in `src/config.js`:
   - `exam`: the exam code.
   - `title`: "<exam code> drill".
   - `storageKey`: the exam code in lower case without the dash, plus "-drill-v1" (for example "az900-drill-v1").
   - `domains`: one entry per domain, numbered from 1, with the name (short) and the weight range exactly as the study guide gives it. Watch for duplicated lines on the study guide page; count the real domains in the detailed list.
   - `allowedSources`: the official docs sites for this subject (for example https://learn.microsoft.com/, https://docs.github.com/).
   - `bannedTerms`: old product names that were renamed or retired, each with a one-line reason. Check each one against official docs before adding it.
   - `commonWords`: 3–10 product words that appear in nearly every question (for example "azure", "microsoft").
   Use `examples/gh300/config.js` as the model.
5. Write exam traps (recent study-guide changes, renamed or retired products, a duplicated domain on the study guide page) in an "## Exam traps" section of `CLAUDE.md`.
6. Run `npm run check`. It should say the bank has 0 questions and PASS.
7. Run `npm test`. 0 failures.
8. Update `CLAUDE.md`: exam name, study guide link and date, domains, Next Up = "add questions, heaviest domain first".
9. Tell the person what you set up, in a short table: domain, name, weight.
