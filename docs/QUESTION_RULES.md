# Rules for writing drill questions

Follow EVERY rule. The checker (`npm run check`) tests the rules marked [CHECKED]. You must check the others yourself before you finish.

There are three question formats. Which ones this drill allows is set by `features` in `src/config.js`. The checker rejects a format that is switched off. [CHECKED]

| Format | Use it for | Needs feature |
|---|---|---|
| A. Static multiple choice | Facts, rules, concepts, "which product/setting/term" | none |
| B. Dynamic question (`generate`) | Anything with numbers or values that should change every attempt | `dynamicNumbers` |
| — typed answer (`kind: "input"`) | The learner types the answer instead of choosing | `typedAnswers` |
| — graph plotting (`kind: "plot"`) | The learner plots points or a line on a grid | `typedAnswers` + `charts` |
| — a chart in the question (`visual`) | The question shows a graph or diagram | `charts` |

Working examples of every format: `examples/gh300/` (multiple choice), `examples/networking/` (dynamic multiple choice and typed answers with IP addresses), `examples/maths-n5/` (typed maths answers, worked steps, plotting).

---

## Format A: static multiple choice

```js
{id:"d2-07", p:2, t:"Short topic",
 q:"The question?",
 o:["Correct option","Wrong option","Wrong option","Wrong option"],
 a:0,
 w:"Why the answer is right. Why the closest wrong option is wrong.",
 src:"https://learn.microsoft.com/...",
 twin:"d2-08"},
```

- `id` = `d` + domain number + `-` + two digits. Use the next free number in that domain. Never change an id. [CHECKED]
- `p` = domain number from `src/config.js`. [CHECKED]
- Exactly 4 options, no two the same. [CHECKED]
- `a` can be 0. The page shuffles the options, so the position does not matter.
- `twin` is optional. If used, the other question must point back, and each must have the other's answer as a wrong option. [CHECKED]
- Any extra field the subject needs (for example `paper: 1` for a non-calculator paper) is allowed.

### The answer must not stand out

1. The correct option must NOT be longer or more detailed than the wrong ones. [CHECKED: max 1.25× the longest wrong option; across the bank, correct-is-longest at most 30%]
2. No joke options. Every wrong option must be a REAL thing from this subject: a real product, term, rule or a realistic mistake. [Check yourself]
3. Wrong options come from the SAME FAMILY as the answer. If the answer is a command, all options are commands. [Check yourself]
4. At least one wrong option is the answer's TWIN: the thing learners really confuse it with. [Check yourself]
5. Do not put the answer's key word in the question unless a wrong option also has it. [CHECKED: warning]
6. No "all of the above", "none of the above", "both", "neither". [CHECKED]
7. No absolute words (always, never, only) in the wrong options unless the correct option has them too. [Check yourself]

### Exactly one right answer

8. Exactly one option is correct. If a second could be argued, rewrite the question so the deciding words make only one fit. [Check yourself]
9. Use current names. Never use old or renamed terms. [CHECKED: `bannedTerms` in `src/config.js`. If you meet a new old name, ADD it.]
10. No questions about retired products, features or syllabus content.
11. Every fact comes from the page or file in `src`. Open it and read it. If it does not state the fact, do not write the question. [CHECKED: the source is on an allowed site, or is a file that exists in the repo. You must check the content.]

### Explanation (`w`)

12. At least 80 characters. [CHECKED]
13. Say why the answer is right AND why the closest twin is wrong. [CHECKED: warning if no wrong option is mentioned]
14. Give a rule the learner can reuse on a differently worded question.
15. Full sentences that make sense on their own.

### Variety

16. Do not reword an existing question. Test the same fact from a new angle (a scenario, the reverse direction, a "which is NOT" list question).
17. Every important concept must be the CORRECT answer of at least one question, not only a wrong option.
18. For every confusable pair, write TWO questions, one each way round, linked with `twin`.
19. For lists ("which three…"), write "Which of these is NOT…" with NOT in capitals. [CHECKED: warning] The fake item is a real term borrowed from a neighbouring list.
20. Spread questions across domains by the weights in `src/config.js`.

---

## Format B: dynamic questions

```js
{id:"d2-02", p:2, t:"Broadcast address",
 title:"Find the broadcast address of a subnet",            // shown in the Trouble list
 rule:"The broadcast address is the last address in the subnet: keep the network bits and set every host bit to 1.",
 example:"192.168.1.77/26 → network 192.168.1.64 → broadcast 192.168.1.127",
 src:"https://www.rfc-editor.org/rfc/rfc4632",
 generate(rng, M) {
   const prefix = M.randCidrPrefix(rng, 24, 30);            // values ONLY from M, with the rng passed in
   const host = M.randHostInSubnet(rng, M.networkAddress(M.randPrivateIPv4(rng), prefix), prefix);
   const answer = M.broadcastAddress(host, prefix);
   return {
     kind: "input",                 // "input" (typed), "mcq" (needs o and a), or "plot"
     q: "What is the broadcast address of the subnet that contains " + host + "/" + prefix + "?",
     answerType: "exact",           // see the list below
     answer, displayAnswer: answer,
     steps: ["Worked line 1", "Worked line 2"],
     w: "Why, in at least 60 characters, stating the rule.",
   };
 }},
```

### Values: never invent your own numbers

21. Get EVERY changing value from `M` using the `rng` you were given. Never call `Math.random()`. [CHECKED: the generator runs on 100 fixed seeds; output must change between seeds]
22. Use a named value type, so the value is always valid. If a value has a valid range (an IP address, a port, a percentage, an angle), there must be a type for it.

| Need | Use |
|---|---|
| Whole numbers | `M.randInt(rng, min, max)`, `M.randNonZero(rng, min, max)` |
| Pick from a list | `M.pick(rng, list)` |
| Decimals | `M.randDecimal(rng, min, max, dp)` |
| Money (always 2 d.p.) | `M.randMoney(rng, min, max)`, `M.formatMoney(value)` |
| Percentage 0–100 | `M.randPercentage(rng, min, max)` |
| Angle 0–360 | `M.randAngle(rng, min, max)` |
| Triangle angles (sum 180°) | `M.randTriangleAngles(rng, minAngle)` |
| Proper fraction | `M.randProperFraction(rng, minDen, maxDen)` |
| IPv4 address | `M.randIPv4(rng)`, `M.randPrivateIPv4(rng, {block: "10" \| "172" \| "192"})`, `M.randPublicIPv4(rng)` |
| Subnets | `M.randCidrPrefix(rng, min, max)`, `M.randSubnetMask(rng)`, `M.prefixToMask(p)`, `M.networkAddress(ip, p)`, `M.broadcastAddress(ip, p)`, `M.randHostInSubnet(rng, net, p)`, `M.usableHosts(p)` |
| Port 0–65535 | `M.randPort(rng, {range: "well-known" \| "registered" \| "dynamic"})` |
| MAC address | `M.randMac(rng)` |
| Time HH:MM, date YYYY-MM-DD | `M.randTime24(rng)`, `M.randDate(rng, fromYear, toYear)` |

23. If the subject needs a value type that is not in this table, ADD it first: maths types in `src/math-engine.js`, everything else in `src/value-types.js`, each with a test that generates thousands of values and checks every one (see `tests/value-types.test.js`). Only then use it in a question.

### Generator output

24. Every generator has `title` and `rule` (at least 50 characters). [CHECKED]
25. Every instance has `q`, `displayAnswer`, `w` (at least 60 characters) and, for typed answers, `steps`. [CHECKED]
26. Every generated answer must pass its own answer check. [CHECKED: self-test on all 100 seeds]
27. No `NaN`, `Infinity` or `[object Object]` anywhere in the output. [CHECKED]
28. Every generated text is scanned by the rule packs, the same as static questions. [CHECKED]
29. Guard against degenerate values: dividing by 0, a 0 coefficient, an answer outside the graph grid, two options that come out the same.
30. For maths, wrap expressions in backticks (`` `x^2 - 4x + 3` ``) so they render properly.

### `answerType` values for typed answers

- `exact` — text match, ignoring case and extra spaces. `answer` can be a list of accepted answers. Use for names, commands, addresses.
- `number` — numeric value or constant expression (`3/2`, `-4`, `£12.50`, `45°`); optional `tolerance`.
- `sigfig` — number plus `sigFigs: N`.
- `fraction` — exact fraction or mixed number; `requireSimplified` (default true).
- `expression` — algebraic equivalence; optional `requireExpanded`, `requireFactorised`, `requireCompletedSquare`, `requireSimplifiedSurd`, `requireRationalDenominator`.
- `equation` — equation equivalence; optional `requireSubject: "t"` for rearranging formulas.
- `roots` — unordered list of roots. `coords` / `vector` — tuples. `inequality` — solved inequality.
- `fields` — several labelled parts, e.g. `x =` and `y =`.
- `kind: "plot"` — the learner plots on a grid; needs `plotSpec`.

---

## Rule packs and subject rules

The checker scans the text of every question with:
- the built-in packs listed in `rulePacks` in `src/config.js` (see `src/rule-packs.js`: `ipv4`, `ipv4-public-private`, `cidr`, `subnet-mask`, `port`, `mac`, `money`, `percentage`, `time24`, `date`; `broken-output` always runs);
- the subject's own rules in `src/subject-rules.js`.

31. A rule pack error means the question has an impossible value. Fix the question, never the rule.
32. If you find a mistake the rules should have caught, add a rule to `src/subject-rules.js` with good and bad examples. `npm test` proves the rule catches the bad examples and not the good ones.

---

## Before you say you are finished

- [ ] `npm run check` shows PASS.
- [ ] `npm test` shows 0 failures.
- [ ] You read each warning and either fixed it or can say why it is fine.
- [ ] You opened every `src` and it states the fact.
- [ ] `CLAUDE.md` is updated (Next Up and Completed).
