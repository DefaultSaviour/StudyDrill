// GH-300 question bank.
// Read .agents/rules/02-question-rules.md before you add or change anything.
// Then run:  npm run check
//
// Each question:
//   id    "d<domain>-<two digits>", for example "d2-07". Never reuse or renumber an id:
//         progress is stored against it.
//   p     domain number, 1–6 (see src/config.js)
//   t     short topic
//   q     the question
//   o     exactly 4 options
//   a     index (0–3) of the correct option. Position does not matter: the page shuffles.
//   w     why the answer is right AND why the closest wrong option is wrong
//   src   the docs page the fact came from
//   twin  (optional) id of the mirror question, where this question's twin is the answer
const BANK = [
// ───────────── DOMAIN 1 — RESPONSIBLE AI ─────────────
{id:"d1-01",p:1,t:"Validate AI output",
 q:"Copilot suggests a function that compiles and looks correct. What should the developer do before merging it?",
 o:["Review it and run tests, because AI output can be wrong or insecure","Merge it, because code that compiles has been checked by Copilot","Ask Copilot Chat whether the code is correct, then merge it","Accept it only if it matches the style of the surrounding code"],
 a:0,
 w:"You stay responsible for code you accept. Copilot can produce code that compiles but has bugs, security problems or out-of-date patterns. Asking Copilot to check its own work is not validation: a person must review and test it.",
 src:"https://docs.github.com/en/copilot/responsible-use"},

// ───────────── DOMAIN 2 — COPILOT FEATURES ─────────────
{id:"d2-01",p:2,t:"Custom instructions",
 q:"Your team wants Copilot Chat to follow its coding standards in every chat in one repository, without anyone pasting them in. Where do you put the standards?",
 o:[".github/copilot-instructions.md",".github/prompts/standards.prompt.md",".vscode/settings.json",".github/CODEOWNERS"],
 a:0,
 w:"Repository custom instructions in .github/copilot-instructions.md are added to chat requests automatically. A prompt file (.prompt.md) is different: it is a saved prompt that someone runs on demand.",
 src:"https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions",
 twin:"d2-02"},
{id:"d2-02",p:2,t:"Prompt files",
 q:"A developer wants a saved, reusable prompt for writing release notes that anyone on the team can run from Copilot Chat when they need it. What should they create?",
 o:["A prompt file in .github/prompts","A .github/copilot-instructions.md file","A content exclusion for the docs folder","A Copilot Space for the release team"],
 a:0,
 w:"A prompt file (.prompt.md in .github/prompts) is a reusable prompt that runs only when someone chooses it. copilot-instructions.md is applied to every request automatically, so it is wrong for a task you run now and then.",
 src:"https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file",
 twin:"d2-01"},

// ───────────── DOMAIN 3 — DATA AND ARCHITECTURE ─────────────
{id:"d3-01",p:3,t:"Suggestion lifecycle",
 q:"After the model produces a response, and before it reaches the editor, which step can stop it for reasons such as harmful content or poor quality?",
 o:["Post-processing checks on the model's response","Prompt building in the IDE extension","Content exclusion settings in the repository","Fine-tuning of the language model"],
 a:0,
 w:"Inbound: the prompt is built with context, then the proxy filters it before the model sees it. Outbound: the response passes through post-processing (for example a toxicity filter and quality checks) before it reaches the editor. Prompt building happens before the model, so it cannot check the output.",
 src:"https://learn.microsoft.com/en-us/training/modules/introduction-prompt-engineering-with-github-copilot/3-github-copilot-user-prompt-process-flow"},

// ───────────── DOMAIN 4 — PROMPT ENGINEERING ─────────────
{id:"d4-01",p:4,t:"Prompting styles",
 q:"You show Copilot Chat two examples of an input and the output you want, then ask it to convert a third input the same way. Which technique is this?",
 o:["Few-shot prompting","Zero-shot prompting","Chain-of-thought prompting","Role prompting"],
 a:0,
 w:"Few-shot means you give examples first. Zero-shot means you ask with no examples at all. Count the examples in the stem: none is zero-shot, one or more is few-shot.",
 src:"https://docs.github.com/en/copilot/concepts/prompt-engineering",
 twin:"d4-02"},
{id:"d4-02",p:4,t:"Prompting styles",
 q:"You ask Copilot Chat \"Write a function that checks if a string is a valid UK postcode\" and give no examples. Which technique is this?",
 o:["Zero-shot prompting","Few-shot prompting","Chain-of-thought prompting","Prompt chaining"],
 a:0,
 w:"Zero-shot means a request with no examples. It would become few-shot only if you added examples of valid and invalid postcodes with the result you expect.",
 src:"https://docs.github.com/en/copilot/concepts/prompt-engineering",
 twin:"d4-01"},

// ───────────── DOMAIN 5 — PRODUCTIVITY ─────────────
{id:"d5-01",p:5,t:"Slash commands",
 q:"A function has no automated checks yet. In Copilot Chat in VS Code, which slash command writes them for the selected code?",
 o:["/tests","/fix","/explain","/new"],
 a:0,
 w:"/tests generates tests for the selection. /fix proposes a fix for a problem in the selected code. If the stem says \"tests\" or \"unit tests\", the answer is /tests even when the code also has a bug.",
 src:"https://docs.github.com/en/copilot/reference/cheat-sheet",
 twin:"d5-02"},
{id:"d5-02",p:5,t:"Slash commands",
 q:"The selected code throws an error. In Copilot Chat in VS Code, which slash command asks Copilot to propose a correction?",
 o:["/fix","/tests","/explain","/new"],
 a:0,
 w:"/fix proposes a fix for problems in the selected code. /explain only describes what the code does, and /tests writes tests. Nothing in the stem asks for tests, so /tests is wrong.",
 src:"https://docs.github.com/en/copilot/reference/cheat-sheet",
 twin:"d5-01"},

// ───────────── DOMAIN 6 — PRIVACY AND SAFEGUARDS ─────────────
{id:"d6-01",p:6,t:"Public code filter",
 q:"Your organisation does not want Copilot to show suggestions that match code in public repositories. What should an admin configure?",
 o:["Set the policy for suggestions matching public code to Block","Turn on code referencing for all members of the organisation","Add content exclusions for every public repository you use","Turn off Copilot Chat in the IDE for all organisation members"],
 a:0,
 w:"Blocking suggestions matching public code stops matching suggestions from being shown. Code referencing is the opposite choice: it applies when matches are allowed, and shows you where the matching code came from and its licence.",
 src:"https://docs.github.com/en/copilot/concepts/completions/code-referencing",
 twin:"d6-02"},
{id:"d6-02",p:6,t:"Code referencing",
 q:"Suggestions matching public code are allowed. A developer wants to see the licence of public code that a suggestion matches. Which feature shows this?",
 o:["Code referencing","Blocking suggestions matching public code","Content exclusions","Audit log events"],
 a:0,
 w:"When matches are allowed, code referencing lists the matching public code and its licence. Blocking is the other setting, and when it is on the developer never sees the match at all, so there is no licence to show.",
 src:"https://docs.github.com/en/copilot/concepts/completions/code-referencing",
 twin:"d6-01"},
];

if (typeof module !== "undefined") module.exports = { BANK };
