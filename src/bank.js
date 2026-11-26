// Question bank. Empty until you add questions.
// Read docs/QUESTION_RULES.md before adding or changing anything, then run:  npm run check
// A filled-in example is in examples/gh300/bank.js.
//
// Each question:
//   id    "d<domain>-<two digits>", e.g. "d2-07". Never reuse or renumber: progress is stored against it.
//   p     domain number (see src/config.js)
//   t     short topic
//   q     the question
//   o     exactly 4 options
//   a     index (0–3) of the correct option. Position does not matter: the page shuffles.
//   w     why the answer is right AND why the closest wrong option is wrong
//   src   the official docs page the fact came from
//   twin  (optional) id of the mirror question, whose answer is a wrong option here
const BANK = [
];

if (typeof module !== "undefined") module.exports = { BANK };
