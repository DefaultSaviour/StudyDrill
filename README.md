# StudyDrill

A free study drill for any subject. It asks you questions, and it asks the ones you get wrong more often until you know them.

It works for exams (like IT certifications), school subjects (like maths) and topics you are learning on your own. It runs in your web browser. It does not need the internet, an account or any installing.

---

## Try it (5 minutes, no experience needed)

1. At the top of this page, click the green **Code** button, then click **Download ZIP**.
2. Find the file `StudyDrill-main.zip` in your **Downloads** folder.
3. **Unzip it.** This step is important: the drill does not work from inside the zip file.
   - **Windows:** right-click the file, click **Extract All…**, then click **Extract**.
   - **Mac:** double-click the file.
4. Open the new **StudyDrill-main** folder.
5. Double-click **index.html**. It opens in your web browser.
6. Click one of the examples to try it.

### How to use the drill

- Read the question and click an answer, or press **1**, **2**, **3** or **4**.
- If you get it right, say whether you **knew it** or **guessed**. Be honest: guessed questions come back more often, which is what you want.
- **Weak spots** shows only the questions you got wrong or guessed.
- **New** shows only the questions you have not seen yet.
- The **Trouble questions** list shows your worst questions. Click **Show why** to read the explanation again.

### Your progress

- Your progress is saved in the web browser you use. Use the **same browser** each time.
- If you clear your browser's history or "site data", your progress is deleted.
- To keep a copy, click **Export progress**. It saves a small backup file. To bring it back, or to move it to another computer, click **Import progress** and choose that file.

---

## Make your own drill

To make questions for your own subject, you need an **AI coding assistant**. The AI writes the questions, and the drill checks them for mistakes before you see them. These AI assistants can do it:

| AI assistant | Cost |
|---|---|
| [Antigravity](https://antigravity.google/) (Google) | Free to start |
| [Claude Code](https://claude.com/claude-code) (Anthropic) | Needs a paid Claude plan |
| [Cursor](https://cursor.com/) | Free to start |

You also need **Node.js**, a free program that runs the checks. Download the "LTS" version from [nodejs.org](https://nodejs.org/) and install it like any other program. (If you skip this, the AI will tell you it is missing.)

### Steps

1. Download and unzip StudyDrill, as in **Try it** above. Give the folder a name for your subject, for example `Spanish Drill`. Use a new copy for each subject.
2. Open your AI assistant. Use **File → Open Folder** and choose your drill folder.
3. In the AI's chat box, type **/setup** and press Enter. (In Cursor, type: *Set up this drill using docs/workflows/setup.md*.)
4. The AI asks you a few questions, one at a time:
   - **What are you studying?** For example "AZ-900", "National 5 Maths" or "Spanish verbs".
   - **How should the topics be organised?** You can give it your own list of topics, ask it to find the official ones, or let it make them as you go.
   - **What kind of questions?** It suggests the best type for your subject: pick an answer, type the answer, or questions with new numbers every time.
   - **Where should the facts come from?** Official websites, or your own notes.
   - **Which checks?** It suggests checks for impossible answers, like an IP address of 333.444.55.666 or a price of £14.999.
5. Then type **/add-questions** and what you want, for example: `/add-questions 10 on past tense verbs`.
6. Wait until the AI says the check **PASSED**. If it says it is finished but does not show PASS, type: *run npm run check*.
7. Double-click **index.html** again (or press F5 if it is already open). Your questions are there.

Add more questions any time with `/add-questions`. When you take a practice test somewhere else, type **/mock-review** and tell the AI which questions you got wrong. It turns them into new drill questions.

---

## Problems

| Problem | What to do |
|---|---|
| index.html opens as text or code, not as the drill | Right-click **index.html**, choose **Open with**, then choose your web browser (Chrome, Edge, Firefox or Safari). |
| The page is blank or broken | You probably opened it from inside the zip file. Unzip it first (step 3 of **Try it**). |
| My progress is gone | Check you are using the same browser as before. If you exported a backup, click **Import progress**. |
| The AI does not understand /setup | Make sure you opened the whole StudyDrill folder in the AI, not just one file. |
| The AI says Node.js or npm is missing | Install Node.js (LTS) from [nodejs.org](https://nodejs.org/), close the AI assistant, and open it again. |

---

## For developers

### What it can do

- **Multiple choice**, with checks that stop common AI mistakes: the right answer is never the longest option, every wrong option is a real thing, no "all of the above".
- **Typed answers**: text, numbers, fractions, algebra (`2(x+3)` = `2x+6`), equations, coordinates.
- **Dynamic questions**: new numbers or values every attempt, always valid (a "private IP" is always really private; money always has 2 decimal places).
- **Graphs**: questions with a chart, or where the learner plots the answer.
- **Rule packs** that scan all question text for impossible values (IPv4, CIDR, subnet masks, ports, MAC, money, percentages, dates, times), plus tested rules for each subject.

Each subject switches on only what it needs, in `src/config.js`.

### Examples

Each folder in `examples/` has a `drill.html` you can open directly, and a `config.js` and `bank.js` you can copy into `src/` as a starting point:
- `examples/gh300` — GitHub Copilot exam, multiple choice
- `examples/networking` — IPv4 addressing with new addresses every attempt
- `examples/maths-n5` — National 5 Maths with typed answers and graph plotting

After changing `index.html`, run `npm run examples` to rebuild the example pages.

### AI commands

| Command | What it does |
|---|---|
| `/setup` | Asks about the subject and fills in `src/config.js` |
| `/add-questions` | Writes questions, checks them, fixes them until they pass |
| `/make-mock` | Writes a mock test and gives it one question at a time |
| `/mock-review` | Turns mock misses into drill questions |

The instructions for every AI tool are in one place: `docs/AI_INSTRUCTIONS.md`. Pointer files load them for Claude (`CLAUDE.md`, `.claude/commands/`), Antigravity (`.agents/`) and Cursor (`.cursor/rules/`).

### Checks (Node.js 18 or newer, no `npm install`)

```
npm run check   # checks every question against the rules
npm test        # tests the drill, checker, value types, rules and example pages
```

### Credits

Maths rendering uses [KaTeX](https://katex.org/) (MIT licence), included in `vendor/katex/`.
`docs/LESSONS.md` explains why the question rules exist.
