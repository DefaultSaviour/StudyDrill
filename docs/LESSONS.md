# Lessons from SC-900 (what went wrong with AI-written questions, and why)

These come from five AI-written mock tests, the Microsoft practice assessment and about 300 drill questions used to pass SC-900.

## A. Problems with the questions AI wrote

| # | Problem we saw | What it caused | Rule now |
|---|---|---|---|
| A1 | The correct answer was the single longest option in 97 of 236 drill questions (41%). Chance is 25%. | You can score well by clicking the longest option without knowing anything. | Correct answer is never more than 1.25× the longest wrong option. Across the bank, "correct is longest" stays at or below 30%. The checker enforces both. |
| A2 | Joke distractors (for example "enforce physical device compliance" as an option for a sign-in product). Mock v4 scored 50/50 and meant nothing. | Trains **recognition** (knowing a name), not **discrimination** (telling it apart from its twin). | Every wrong option is a real, current product, feature, setting or command from the **same family** as the answer. |
| A3 | Wrong options from a different family (a network product as a distractor for an identity question). | Too easy to eliminate. | At least one wrong option must be the answer's **twin**: the thing people actually confuse it with. |
| A4 | Old product names (Azure AD B2C marked correct over Entra External ID, twice, across two mock versions). | The answer key was wrong and the learner was marked down for being right. | Banned-names list in `src/config.js`. Add every old name a mock uses. |
| A5 | Retired products kept appearing (Entra Permissions Management, retired Oct 2025), even after the prompt said not to. | Time spent learning things not on the exam. | Every question needs a `src` link to official docs. No source → not added. |
| A6 | Wrong or debatable answer keys (a privacy-principle question where two options fitted). | Learning the wrong thing, or losing confidence. | Exactly one option can be right. If two could be argued, rewrite the stem until the deciding words make only one fit. |
| A7 | "All of the above" / "none of the above". | Not how the real exam writes. | Banned. The checker rejects them. |
| A8 | A word in the stem matched only the answer ("Which feature **reviews code**?" → "Copilot code review"). | Word-matching, not knowledge. | Don't put the answer's key word in the stem unless a wrong option shares it too. The checker warns. |
| A9 | Explanations that only said "X is correct". | Reading the explanation did not stop the same mistake next time. | `w` must say why the answer is right **and** why the closest twin is wrong, as a rule that works on reworded questions ("deciding question"). |
| A10 | Generated questions repeated old ones with tiny wording changes. | Recall of a specific question, not understanding. | New questions must test the same fact from a different angle, not the same sentence reworded. |

## B. Problems with how the learner learned (so the drill is built around them)

| # | Finding | What the drill does about it |
|---|---|---|
| B1 | **Mocks measure; the drill teaches.** Same mock, 24 hours later, after reading every explanation: +1 mark. Six misses were exact repeats. Drill questions seen a 4th time: 94% correct. | Drill with spaced repetition. Mocks only as a check, and every mock miss becomes drill questions. |
| B2 | **Oscillation.** Missed NSG by picking Firewall; next time missed Firewall by picking NSG. Same with managed identity / service principal and sensitive info type / trainable classifier. | Every confusable pair becomes **two questions, each way round** (`twin` field). |
| B3 | **Guessed-right is not known.** About 8 of 43 "correct" answers on one mock were guesses. | After a right answer the drill asks "knew it or guessed?". Guesses count as weak. |
| B4 | **List questions** ("which three things make up X") were wrong almost every time. | Write "which is NOT one of" questions where the fake item is a real word borrowed from a neighbouring list. |
| B5 | **Misreads** (authentication vs authorisation; didn't read the whole question). | Keep the stems short and plain. Write NOT in capitals. |
| B6 | **Rushing.** 15–24 seconds per question → slips on questions that were already known. | Not a drill fix. Work out the exam's time per question and practise at that pace. |
| B7 | **Concepts that only ever appeared as distractors** were never actually taught (sensitive info types, JIT, Azure Arc). | Every important concept must be the **correct answer** of at least one question, not just a wrong option somewhere. |
| B8 | Short table cells hid meaning ("Data connectors — pull logs in" meant nothing). | Explanations are full, plain sentences that make sense on their own. |

## C. Exam-specific traps

Each exam has its own (renamed products, retired features, a study guide that changed recently). Keep them in `examples/<exam>/NOTES.md` or in the `bannedTerms` list in `src/config.js`.
