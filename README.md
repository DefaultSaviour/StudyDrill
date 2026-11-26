# StudyDrill

A free study drill for any subject. It asks you questions, and it asks the ones you get wrong more often until you know them.

It works for exams (like IT certifications), school subjects (like maths) and topics you are learning on your own. It runs in your web browser. It does not need the internet, an account or any installing.


---

## Get started

You need two things:

- **An AI assistant that can work with files in a folder**, for example [Antigravity](https://antigravity.google/) (free to start), [Claude Code](https://claude.com/claude-code) (needs a paid Claude plan) or [Cursor](https://cursor.com/) (free to start). The AI writes your questions and runs the checks.
- **Node.js**, a free program that runs the checks. Download the "LTS" version from [nodejs.org](https://nodejs.org/) and install it like any other program. If it is missing, the AI will tell you.

Then choose the way that suits you.

### Option 1: Ask your AI assistant to do it (easiest)

**A new project just for your drill**

1. Make a new, empty folder, for example `Spanish Drill`. Use a new folder for each subject.
2. Open your AI assistant and open that folder as a new project (usually **File → Open Folder**).
3. Copy this message, change the last line to your subject, and send it to the AI:

```text
Download StudyDrill into this folder with:
git clone https://github.com/DefaultSaviour/StudyDrill.git .
(If git says the folder is not empty, clone into a temporary folder and
move everything, including hidden files, into this folder.)
Then read docs/AI_INSTRUCTIONS.md and follow docs/workflows/setup.md.
Ask me the setup questions one at a time.
My subject is: Spanish verbs
```

4. Close the project and open the folder again, so the AI loads the drill's own rules and commands (like `/setup` and `/add-questions`).

**Add it to a project you already have**

Open your project in your AI assistant and send this message (change the last line):

```text
Add StudyDrill to this project in a folder called study-drill:
git clone https://github.com/DefaultSaviour/StudyDrill.git study-drill
Then read study-drill/docs/AI_INSTRUCTIONS.md and follow
study-drill/docs/workflows/setup.md. Run every npm command inside the
study-drill folder. Ask me the setup questions one at a time.
My subject is: National 5 Maths
```

Inside an existing project, the `/setup` and `/add-questions` shortcuts are not available. Ask in words instead, for example: *"Follow study-drill/docs/workflows/add-questions.md and add 10 questions on fractions."*

### Option 2: Do it yourself with git

**A new project just for your drill**

```bash
git clone https://github.com/DefaultSaviour/StudyDrill.git "Spanish Drill"
```

Open the `Spanish Drill` folder in your AI assistant as the project, and type **/setup**. (In Cursor, type: *Set up this drill using docs/workflows/setup.md*.)

**Add it to a project you already have**

```bash
cd your-project
git clone https://github.com/DefaultSaviour/StudyDrill.git study-drill
```

Then ask your AI assistant: *"Read study-drill/docs/AI_INSTRUCTIONS.md and follow study-drill/docs/workflows/setup.md. Run npm commands inside study-drill."*

To get updates to the drill later, run `git pull` inside the drill folder.

### What happens in the setup

The AI asks you a few questions, one at a time:

- **What are you studying?** For example "AZ-900", "National 5 Maths" or "Spanish verbs".
- **How should the topics be organised?** You give it your own list, it finds the official one, or it makes them as you go.
- **What kind of questions?** It suggests the best type for your subject: pick an answer, type the answer, or new numbers every time.
- **Where should the facts come from?** Official websites, or your own notes.
- **Which checks?** It suggests checks for impossible answers, like an IP address of 333.444.55.666 or a price of £14.999.

Then ask for questions, for example **/add-questions 10 on past tense verbs**. Wait until the AI says the check **PASSED**. If it says it is finished but does not show PASS, tell it: *run npm run check*.

### Open the drill

Double-click **index.html** in the drill folder (or ask the AI to open it). It opens in your web browser. Press **F5** to see new questions after the AI adds them.

Before you set it up, the drill shows three examples you can try: an IT exam, networking and maths.

### Use the drill

- Read the question and click an answer, or press **1**, **2**, **3** or **4**.
- If you get it right, say whether you **knew it** or **guessed**. Be honest: guessed questions come back more often, which is what you want.
- **Weak spots** shows only the questions you got wrong or guessed.
- **New** shows only the questions you have not seen yet.
- The **Trouble questions** list shows your worst questions. Click **Show why** to read the explanation again.

### Your progress

- Your progress is saved in the web browser you use. Use the **same browser** each time.
- If you clear your browser's history or "site data", your progress is deleted.
- To keep a copy, click **Export progress**. It saves a small backup file. To bring it back, or to move it to another computer, click **Import progress** and choose that file.

### Later

- Add more questions any time: **/add-questions** and the topic.
- After a practice test somewhere else, type **/mock-review** and tell the AI which questions you got wrong. It turns them into new drill questions.
- For a mock test inside the drill, type **/make-mock**.

<details>
<summary>No AI assistant? Download it to try the examples</summary>

1. At the top of this page, click the green **Code** button, then **Download ZIP**.
2. Unzip it. On Windows: right-click the file, **Extract All…**, **Extract**. On a Mac: double-click it. (The drill does not work from inside the zip.)
3. Open the **StudyDrill-main** folder and double-click **index.html**.
4. Click one of the examples.

To make your own questions you need an AI assistant (see **Get started**).
</details>

---

## Problems

| Problem | What to do |
|---|---|
| index.html opens as text or code, not as the drill | Right-click **index.html**, choose **Open with**, then choose your web browser (Chrome, Edge, Firefox or Safari). |
| The page is blank or broken | If you downloaded the zip, you probably opened it from inside the zip file. Unzip it first. |
| My progress is gone | Check you are using the same browser as before. If you exported a backup, click **Import progress**. |
| The AI does not understand /setup | Close the project and open the drill folder again, so the AI loads the drill's commands. If the drill is inside a bigger project, ask in words instead (see **Add it to a project you already have**). |
| The AI says git is missing | Install Git from [git-scm.com](https://git-scm.com/downloads), close the AI assistant and open it again. Or use the zip download (under **Later**). |
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
