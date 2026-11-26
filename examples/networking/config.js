// EXAMPLE: a small IPv4 networking drill. It shows typed answers, dynamic
// numbers and the networking rule packs working together.
// To try it: copy this file to src/config.js and bank.js to src/bank.js.
const CONFIG = {
  exam: "IPv4-basics",
  title: "IPv4 basics drill",
  storageKey: "ipv4-basics-drill-v1",

  features: {
    typedAnswers: true,
    dynamicNumbers: true,
    charts: false,
  },

  // Checks run over every question's text (see src/rule-packs.js).
  rulePacks: ["ipv4", "ipv4-public-private", "cidr", "subnet-mask", "port", "mac"],

  domains: {
    1: { name: "Addressing", weight: "60%" },
    2: { name: "Subnetting", weight: "40%" },
  },

  allowedSources: [
    "https://www.rfc-editor.org/",
  ],

  bannedTerms: [],

  commonWords: ["address", "addresses", "network", "subnet"],
};

if (typeof module !== "undefined") module.exports = { CONFIG };
