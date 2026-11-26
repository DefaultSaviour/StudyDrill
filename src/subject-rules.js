// Rules for THIS exam's subject, written at setup (see docs/workflows/setup.md).
// Same shape as the rules in src/rule-packs.js. Every rule MUST have examples:
// tests/rule-packs.test.js checks that each bad example is caught and each good one is not.
//
// Example (chemistry): every element symbol must be a real element.
//   {
//     id: "element-symbol",
//     description: "Chemical symbols written as 'symbol Xx' must be real elements.",
//     level: "error",
//     find: /\bsymbol\s+([A-Z][a-z]?)\b/g,
//     check: m => ["H","He","Li", /* … */].includes(m[1]) ? null : '"' + m[1] + '" is not an element symbol',
//     examples: { good: ["The symbol Na is sodium."], bad: ["The symbol Xq is sodium."] },
//   },
const SUBJECT_RULES = [
];

if (typeof module !== "undefined") module.exports = { SUBJECT_RULES };
