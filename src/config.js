// Exam settings. This is the ONLY file (with src/bank.js) that changes per exam.
// Fill it in with the "new exam" setup steps in docs/workflows/new-exam.md.
// A filled-in example is in examples/gh300/config.js.
const CONFIG = {
  // Exam code, e.g. "GH-300". Empty = not set up yet.
  exam: "",
  // Page title, e.g. "GH-300 drill".
  title: "Study drill",
  // Where progress is saved in the browser. Must be different for each exam,
  // e.g. "gh300-drill-v1". Never change it after you start, or progress is lost.
  storageKey: "studydrill-v1",

  // The exam's domains (sections) from the official study guide, with weights.
  // Example:  1: { name: "Responsible AI", weight: "15–20%" },
  domains: {},

  // Every question must link to a page on one of these sites.
  allowedSources: [
    "https://learn.microsoft.com/",
  ],

  // Old or wrong names AI question writers copy from old material.
  // A question that contains one of these fails the check.
  // Example:  { term: "Azure AD", why: "Renamed Microsoft Entra ID." },
  bannedTerms: [],

  // Words that appear in nearly every question for this exam (product names),
  // so the "answer copies a word from the question" check ignores them.
  // Example: ["copilot", "github"]
  commonWords: [],
};

if (typeof module !== "undefined") module.exports = { CONFIG };
