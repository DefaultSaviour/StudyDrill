// EXAMPLE: SCQF Level 5 Maths configuration (National 5 Mathematics + F3T8 11 Maths for Science).
// To preview the showcase bank in your browser, copy examples/maths-n5/bank.js into src/bank.js.
const CONFIG = {
  exam: "SCQF-L5-Maths",
  title: "SCQF Level 5 Maths drill",
  storageKey: "scqf5-maths-drill-v1",

  features: {
    typedAnswers: true,
    dynamicNumbers: true,
    charts: true,
  },

  domains: {
    1: { name: "Algebraic skills", weight: "30–45%" },
    2: { name: "Geometric skills", weight: "15–35%" },
    3: { name: "Trigonometric skills", weight: "10–25%" },
    4: { name: "Numerical skills", weight: "10–25%" },
    5: { name: "Statistical skills", weight: "5–15%" },
  },

  allowedSources: [
    "https://www.sqa.org.uk/",
    "https://www.bbc.co.uk/bitesize/",
  ],

  bannedTerms: [
    { term: "semi-interquartile range", why: "SQA replaced semi-interquartile range with interquartile range in National 5 Mathematics (June 2020, v2.2)." },
    { term: "SIQR", why: "SQA National 5 Mathematics uses interquartile range (IQR), not SIQR." },
  ],

  commonWords: [
    "calculate", "simplify", "solve", "expression", "equation",
    "formula", "graph", "value", "angle", "triangle",
  ],
};

if (typeof module !== "undefined") module.exports = { CONFIG };
