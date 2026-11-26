# Make a mock test

Mocks measure. The drill teaches. A mock checks readiness; its misses go back into the drill.

1. Read `docs/LESSONS.md` and `docs/QUESTION_RULES.md`. A mock follows ALL the same question rules.
2. Write 50 NEW questions (or the number the person asks for), spread across domains by the weights in `src/config.js`. Do not copy drill questions.
3. Save them in `mocks/mock-<NN>.js` as `const BANK = [...]` plus `if (typeof module !== "undefined") module.exports = { BANK };`. Use ids numbered from 900 up (for example `d2-901`) so they never clash with the drill.
4. Check them:
   `node -e "const {checkBank}=require('./scripts/check-bank.js');const {CONFIG}=require('./src/config.js');const {BANK}=require('./mocks/mock-<NN>.js');const r=checkBank(BANK,CONFIG);console.log(r.errors.join('\n')||'PASS');console.log(r.warnings.join('\n'))"`
   Fix every error.
5. Give the mock one question at a time. Give NO feedback, hints or answers until all questions are answered. While the person answers, reply only "Noted".
6. At the end: the score, then the list of misses and guesses. Offer the mock review.
