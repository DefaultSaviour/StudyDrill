# Rules for writing drill questions

Follow EVERY rule. The checker (`npm run check`) tests rules marked [CHECKED]. You must check the others yourself before you finish.

## Format [CHECKED]

```js
{id:"d2-07",p:2,t:"Short topic",
 q:"The question?",
 o:["Correct option","Wrong option","Wrong option","Wrong option"],
 a:0,
 w:"Why the answer is right. Why the closest wrong option is wrong.",
 src:"https://learn.microsoft.com/...",
 twin:"d2-08"},
```

- `id` = `d` + domain number + `-` + two digits. Use the next free number in that domain. [CHECKED]
- `p` = domain number. Domains are in `src/config.js`. [CHECKED]
- Exactly 4 options. No two the same. [CHECKED]
- `a` can be 0. The page shuffles the options, so position does not matter.
- `twin` is optional. If you use it, the other question must point back, and each question must have the other's answer as a wrong option. [CHECKED]

## The answer must not stand out

1. The correct option must NOT be longer than the wrong options. Make all four options about the same length and the same level of detail. [CHECKED: max 1.25× the longest wrong option; across the bank, correct-is-longest at most 30%]
2. No joke options. No obviously wrong options. Every wrong option must be a REAL, CURRENT product, feature, setting, command or concept from this exam's subject. [Check yourself]
3. Wrong options must come from the SAME FAMILY as the answer. If the answer is a slash command, all options are slash commands. If the answer is a policy setting, all options are settings. [Check yourself]
4. At least one wrong option must be the answer's TWIN: the thing people really confuse it with (for example NSG vs Azure Firewall, managed identity vs service principal, zero-shot vs few-shot). [Check yourself]
5. Do not put the answer's key word in the question unless a wrong option also contains it. [CHECKED: warning]
6. No "all of the above", "none of the above", "both", "neither". [CHECKED]
7. No absolute words (always, never, only) in the wrong options unless the correct option has them too. Test-takers learn that "always" means wrong.

## Exactly one right answer

8. Exactly one option is correct. If a second option could be argued, rewrite the question so the deciding words make only one fit. [Check yourself]
9. Use the current product names from the docs. Never use old names. [CHECKED: banned list in `src/config.js`. If you see a new old name, ADD it to the list.]
10. Do not write questions about retired products or features.
11. Every fact must come from the page in `src`. Open the page and read it. If the page does not state the fact, do not write the question. [CHECKED: source site only. You must check the content.]
12. If the feature is in public preview, say so in `w` ("public preview as of <month year>").

## Explanation (`w`)

13. At least 80 characters. [CHECKED]
14. Say why the answer is right AND why the closest twin is wrong. [CHECKED: warning if no wrong option is mentioned]
15. Give a rule the learner can use on a differently worded question, for example "Count the examples: none = zero-shot, one or more = few-shot."
16. Full sentences that make sense on their own. No clipped note-style fragments.

## Variety

17. Do not repeat an existing question with different words. Test the same fact from a different angle (a scenario, the reverse direction, a "which is NOT" list question).
18. Every important concept must be the CORRECT answer of at least one question, not only a wrong option.
19. For every confusable pair, write TWO questions, one each way round, and link them with `twin`.
20. For lists ("which three…"), write "Which of these is NOT …" with NOT in capitals. The fake item must be a real term borrowed from a neighbouring list.
21. Spread questions across domains roughly by exam weight (the weights are in `src/config.js`). The heaviest domain needs the most questions.

## Before you say you are finished

- [ ] `npm run check` shows PASS.
- [ ] `npm test` shows 0 failures.
- [ ] You read each warning and either fixed it or can say why it is fine.
- [ ] You opened every `src` page and it states the fact.
- [ ] `CLAUDE.md` is updated (Next Up and Completed).
