# Set up the drill for a subject

Use this the first time the drill is used. It works for any subject: a certification exam, a school course, a language, a topic the person is learning on their own.

Ask the questions below ONE AT A TIME, in plain words, and wait for each answer. If the person already gave an answer in their first message, do not ask it again. If the person is not there to answer (a scheduled or unattended run), take the default shown, and say at the end which defaults you took.

## Before you start

- Check `src/bank.js` is empty and `exam` in `src/config.js` is empty. If either already has content, STOP and ask: this copy is already set up. A new subject needs a new copy of the repo (on GitHub: **Use this template**).

## 1. What are you studying?

Ask: "What are you studying? An exam code (like AZ-900), a course (like National 5 Maths), or a topic (like Python basics)?"

- Write down the exact name. If it is an exam or course, find its OFFICIAL page or specification and open it. Write down the link and the date it was last updated.

## 2. How should the topics be organised?

The drill groups questions into numbered **domains** (sections). Ask which they want:

| Option | What you do |
|---|---|
| **a. "I'll give you them"** | Use their list exactly, numbered from 1, in their order. Ask for weights only if they know them. |
| **b. "Find them for me"** (default for exams and courses) | Use the official study guide or specification. Copy the domain names and weights exactly as written. Watch for duplicated lines: count the real domains in the detailed list. Show the person the table and ask them to confirm it. |
| **c. "Build them as we go"** (default for a self-chosen topic) | Start with one domain, `1: { name: "General", weight: "" }`. Each time a new group of questions clearly forms (at least 3 questions on one theme), add a new domain at the next free number and tell the person. Never renumber or rename a domain that has questions: progress and ids depend on it. |

## 3. What kind of questions?

Suggest the right answer for the subject, then ask the person to confirm. Set `features` in `src/config.js`.

| Subject | Suggest | Why |
|---|---|---|
| A multiple-choice exam (most IT certifications) | All features off | The real exam is multiple choice; typed answers would train a different skill. |
| Maths, physics, accounting, anything with calculations | `dynamicNumbers`, `typedAnswers`, `charts` on | Numbers should change every attempt, and the learner should work the answer out. |
| Networking, subnetting, IP addressing | `dynamicNumbers` and `typedAnswers` on | Each attempt gets new valid addresses. |
| Languages, definitions, commands, terminology | `typedAnswers` on | Recall (typing the word) is harder and better than recognition. |

## 4. Where do the facts come from?

Fill in `allowedSources` in `src/config.js`:
- Official sites for the subject (for example `https://learn.microsoft.com/`, `https://docs.github.com/`, `https://www.sqa.org.uk/`, `https://www.rfc-editor.org/`).
- If the person learns from their own notes, ask them to put the notes in a `notes/` folder and add `"notes/"`. A question can then use `src: "notes/topic.md"`; the checker makes sure the file exists.
- Do NOT add quiz sites, forums or AI-written pages.

## 5. Checks for impossible values

### 5a. Built-in rule packs

Choose the packs that fit the subject and put them in `rulePacks` in `src/config.js`. `broken-output` (NaN, Infinity) always runs.

| Pack | Catches | Turn on for |
|---|---|---|
| `ipv4` | 333.444.55.666, 10.01.0.1 | Networking, IT support, cloud |
| `ipv4-public-private` | "the private IP 8.8.8.8" | Networking |
| `cidr` | /33 | Networking |
| `subnet-mask` | 255.255.0.255 | Networking |
| `port` | port 70000 | Networking, security |
| `mac` | 00:1G:2B:3C:4D:5E | Networking |
| `money` | £14.999, £0.5 | Maths, finance, business |
| `percentage` | 115% (warning only) | Maths, statistics, finance |
| `date` | 31 April, 2027-02-29 | History, anything with dates |
| `time24` | 25:10 | Timetables, logs. Off for maths (it can mistake ratios for times) |

### 5b. The subject's own rules

Think about what an impossible or wrong value looks like in THIS subject, then propose 2–5 rules to the person in a short table: what the rule catches, and one good and one bad example. Examples of ideas:
- Chemistry: element symbols must be real; pH must be 0–14.
- Biology: no human body temperature of 50 °C.
- History: an event cannot be dated after today; a person cannot act after their death year if both are in the text.
- Music: note names are A–G with ♯ or ♭.
- Programming: HTTP status codes are 100–599.
- Maths: a probability is 0–1; a triangle's angles add up to 180°.

Only add a rule the person agrees with. Write each one in `src/subject-rules.js`, in the same shape as `src/rule-packs.js`, with at least 2 good and 2 bad examples. A rule that catches too much (flags correct text) is worse than no rule: if it might, make it a `"warning"`, not an `"error"`.

If the subject needs changing values that have a valid range and there is no value type for them yet (see the table in `docs/QUESTION_RULES.md`), add the type to `src/value-types.js` with a test in `tests/value-types.test.js` before writing questions that use it.

## 6. Fill in the rest of `src/config.js`

- `exam`: the name from step 1 (short).
- `title`: "<name> drill".
- `storageKey`: the name in lower case, letters and digits only, plus "-drill-v1" (for example "az900-drill-v1"). Never change it later.
- `bannedTerms`: old or renamed terms for this subject, each with a one-line reason. Check each one against an official source.
- `commonWords`: 3–10 words that appear in nearly every question (product or subject names).

Use the files in `examples/` as models: `gh300` (multiple-choice exam), `networking` (dynamic values and rule packs), `maths-n5` (maths with typed answers and graphs).

## 7. Check and record

1. Run `npm run check`. It should say 0 questions and PASS.
2. Run `npm test`. 0 failures. (This also proves every subject rule catches its bad examples.)
3. Update `CLAUDE.md`:
   - **Exam**: the name, the official link and date, the domains table (or "built as we go").
   - **Exam traps**: anything surprising you found (renamed terms, recent syllabus changes, duplicated lines on the official page).
   - **Next Up**: "add questions, heaviest domain first" (or "add questions on <first topic>").
4. Commit.
5. Tell the person, in a short summary: the domains, the features, the rule packs, the subject rules, and what to type next (`/add-questions`).
