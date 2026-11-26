// EXAMPLE: the GH-300 (GitHub Copilot) setup. To use it, copy this file to
// src/config.js and examples/gh300/bank.js to src/bank.js.
const CONFIG = {
  exam: "GH-300",
  title: "GH-300 drill",
  storageKey: "gh300-drill-v1",

  // The six domains from the official study guide (skills measured as of
  // 7 August 2026). The study guide lists "GitHub Copilot features" twice;
  // that is a duplicate on Microsoft's page, so it is not a seventh domain.
  // https://learn.microsoft.com/credentials/certifications/resources/study-guides/gh-300
  domains: {
    1: { name: "Responsible AI", weight: "15–20%" },
    2: { name: "Copilot features", weight: "25–30%" },
    3: { name: "Data and architecture", weight: "10–15%" },
    4: { name: "Prompt engineering", weight: "10–15%" },
    5: { name: "Productivity", weight: "10–15%" },
    6: { name: "Privacy and safeguards", weight: "10–15%" },
  },

  // Every question must give a source on one of these sites.
  allowedSources: [
    "https://docs.github.com/",
    "https://learn.microsoft.com/",
    "https://github.blog/",
    "https://resources.github.com/",
    "https://code.visualstudio.com/docs/copilot",
  ],

  // Old or wrong names that AI question writers copy from old material.
  // A question that contains one of these fails the check.
  // Add to this list each time a mock uses an old name.
  bannedTerms: [
    { term: "Copilot X", why: "Old 2023 marketing name, not a product." },
    { term: "Copilot Labs", why: "Retired experiment." },
    { term: "Copilot Workspace", why: "Technical preview that was shut down." },
    { term: "Copilot Individual", why: "Old plan name. The plans are Free, Pro, Pro+, Business and Enterprise." },
    { term: "Azure AD", why: "Renamed Microsoft Entra ID." },
  ],

  // Exam-specific words that appear in nearly every question.
  commonWords: [
    "copilot", "github", "developer", "developers", "organisation", "organization",
    "feature", "features", "code", "suggestions", "suggestion", "files", "repository",
  ],
};

if (typeof module !== "undefined") module.exports = { CONFIG };
