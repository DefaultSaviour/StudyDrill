// Settings for the subject this drill is used for. With src/bank.js (and,
// optionally, src/subject-rules.js) this is all that changes per subject.
// Fill it in with the guided setup: docs/workflows/setup.md (/setup).
// Filled-in examples: examples/gh300, examples/networking, examples/maths-n5.
const CONFIG = {
  // Subject or exam name, e.g. "GH-300" or "National 5 Maths". Empty = not set up yet.
  exam: "",
  // Page title, e.g. "GH-300 drill".
  title: "Study drill",
  // Where progress is saved in the browser. Different for each subject.
  // Never change it after you start, or progress is lost.
  storageKey: "studydrill-v1",

  // Question formats this drill allows. The checker rejects questions that use
  // a format that is switched off.
  features: {
    typedAnswers: false,    // the learner types the answer
    dynamicNumbers: false,  // values change every attempt (generate(rng, M))
    charts: false,          // questions can show a graph or ask the learner to plot
  },

  // Built-in checks for impossible values (see src/rule-packs.js), e.g.
  // ["ipv4", "port", "money"]. "broken-output" always runs.
  rulePacks: [],

  // Sections of the subject, numbered from 1, with weights if known.
  // Example:  1: { name: "Responsible AI", weight: "15–20%" },
  domains: {},

  // Every question must link to a page on one of these sites, or to a file in
  // a folder listed here (for example "notes/").
  allowedSources: [
    "https://learn.microsoft.com/",
  ],

  // Old or wrong names AI question writers copy from old material.
  // Example:  { term: "Azure AD", why: "Renamed Microsoft Entra ID." },
  bannedTerms: [],

  // Words that appear in nearly every question (product or subject names).
  commonWords: [],
};

if (typeof module !== "undefined") module.exports = { CONFIG };
