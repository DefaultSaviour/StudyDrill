#!/usr/bin/env node
// Checks every question in src/bank.js against the rules we learned on SC-900.
// Run:  npm run check
// Exit code 0 = no errors (warnings are allowed). Exit code 1 = fix the errors.
//
// ERRORS stop the bank being accepted. WARNINGS are things a person should look at.
"use strict";

// Correct answer may be at most this much longer than the longest wrong option.
const MAX_LENGTH_RATIO = 1.25;
// Across the bank, the correct answer may be the single longest option in at most
// this share of questions. Random chance with 4 options is 25%.
const MAX_LONGEST_SHARE = 0.30;
const WARN_LONGEST_SHARE = 0.25;
// The bank-wide length rule starts once the bank is this big.
const MIN_BANK_FOR_SHARE = 8;
// A wrong option shorter than this share of the longest option looks like a joke option.
const SHORT_OPTION_RATIO = 0.35;
// Explanations shorter than this cannot say why the twin is wrong.
const MIN_WHY_LENGTH = 80;

// Everyday words that never count as "the answer copies a word from the question".
const GENERIC_COMMON_WORDS = [
  "which", "should", "using", "would", "about", "their", "there", "these", "those",
  "where", "while", "after", "before", "users", "being", "could", "other", "every",
];

const BANNED_OPTION_TEXT = /\b(all|none|both) of the (above|options)\b|^both\b|^neither\b/i;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Lower-case words of 5+ letters, with a trailing "s" removed, minus common words.
function significantWords(text, commonWords) {
  const common = new Set(GENERIC_COMMON_WORDS.concat(commonWords || []).map(w => w.toLowerCase()));
  const words = String(text).toLowerCase().match(/[a-z][a-z0-9-]{4,}/g) || [];
  const out = new Set();
  for (let w of words) {
    if (w.length > 5 && w.endsWith("s")) w = w.slice(0, -1);
    if (!common.has(w) && !common.has(w + "s")) out.add(w);
  }
  return out;
}

function overlaps(a, b) {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

function normalise(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function checkQuestion(q, index, config, seenIds) {
  const errors = [];
  const warnings = [];
  const label = q && isNonEmptyString(q.id) ? q.id : "question #" + (index + 1);
  const err = m => errors.push(label + ": " + m);
  const warn = m => warnings.push(label + ": " + m);

  if (!q || typeof q !== "object") { err("is not an object"); return { errors, warnings }; }

  // ── shape ──
  const domainNumbers = Object.keys(config.domains).map(Number);
  if (!isNonEmptyString(q.id)) err("missing id");
  else {
    const m = /^d(\d+)-(\d{2,3})$/.exec(q.id);
    if (!m) err('id must look like "d2-07"');
    else if (Number(m[1]) !== q.p) err("id says domain " + m[1] + " but p is " + q.p);
    if (seenIds.has(q.id)) err("duplicate id");
    seenIds.add(q.id);
  }
  if (!domainNumbers.includes(q.p)) err("p must be one of " + domainNumbers.join(", "));
  if (!isNonEmptyString(q.t)) err("missing topic (t)");
  if (!isNonEmptyString(q.q)) err("missing question (q)");
  if (!isNonEmptyString(q.w)) err("missing explanation (w)");
  else if (q.w.trim().length < MIN_WHY_LENGTH) err("explanation (w) is too short to say why the twin is wrong (" + q.w.trim().length + " characters, need " + MIN_WHY_LENGTH + ")");

  if (!Array.isArray(q.o) || q.o.length !== 4) { err("must have exactly 4 options"); return { errors, warnings }; }
  if (!q.o.every(isNonEmptyString)) { err("every option must be non-empty text"); return { errors, warnings }; }
  const lowered = q.o.map(o => o.trim().toLowerCase());
  if (new Set(lowered).size !== 4) err("two options are the same");
  q.o.forEach((o, i) => { if (BANNED_OPTION_TEXT.test(o.trim())) err('option ' + (i + 1) + ' uses "all/none/both of the above" style wording'); });
  if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { err("a must be 0, 1, 2 or 3"); return { errors, warnings }; }

  // ── source ──
  if (!isNonEmptyString(q.src)) err("missing source (src)");
  else if (!config.allowedSources.some(prefix => q.src.startsWith(prefix))) {
    err("source must start with one of: " + config.allowedSources.join(", "));
  }

  // ── banned names ──
  const allText = [q.q, q.w, ...q.o].join(" \n ");
  for (const b of config.bannedTerms) {
    const re = new RegExp("\\b" + b.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(allText)) err('uses "' + b.term + '". ' + b.why);
  }

  // ── length: the correct answer must not stand out ──
  const lengths = q.o.map(o => o.trim().length);
  const correctLen = lengths[q.a];
  const wrongLens = lengths.filter((_, i) => i !== q.a);
  const longestWrong = Math.max(...wrongLens);
  if (correctLen > longestWrong * MAX_LENGTH_RATIO) {
    err("correct answer is " + correctLen + " characters but the longest wrong option is " + longestWrong + ". Make the wrong options as detailed as the right one, or shorten the right one.");
  }
  const longest = Math.max(...lengths);
  q.o.forEach((o, i) => {
    if (i !== q.a && lengths[i] < longest * SHORT_OPTION_RATIO && longest > 20) {
      warn('option "' + o + '" is much shorter than the others and may look obviously wrong');
    }
  });

  // ── the stem must not give the answer away ──
  const common = config.commonWords || [];
  const stemWords = significantWords(q.q, common);
  const correctWords = significantWords(q.o[q.a], common);
  const wrongShare = q.o.some((o, i) => i !== q.a && overlaps(significantWords(o, common), stemWords));
  if (overlaps(correctWords, stemWords) && !wrongShare) {
    warn("the correct answer repeats a word from the question and no wrong option does. Word-matching would find the answer without knowing it.");
  }

  // ── "NOT" questions ──
  if (/\bwhich\b[^?]*\bnot\b/i.test(q.q) && !/\bNOT\b/.test(q.q)) {
    warn('negative question: write NOT in capitals so it cannot be misread');
  }

  // ── explanation should name a wrong option ──
  if (isNonEmptyString(q.w)) {
    const whyWords = significantWords(q.w, common);
    const namesTwin = q.o.some((o, i) => {
      if (i === q.a) return false;
      const ow = significantWords(o, common);
      if (ow.size === 0) return q.w.toLowerCase().includes(o.trim().toLowerCase());
      return overlaps(ow, whyWords);
    });
    if (!namesTwin) warn("the explanation never mentions a wrong option. Say why the closest twin is wrong.");
  }

  return { errors, warnings };
}

// Is src/config.js filled in? Returns a list of problems (empty = fine).
function checkConfig(config) {
  const problems = [];
  if (!config || typeof config !== "object") return ["CONFIG is missing"];
  if (!isNonEmptyString(config.exam)) problems.push('CONFIG: exam is empty. Fill in src/config.js (see docs/workflows/new-exam.md).');
  if (!config.domains || Object.keys(config.domains).length === 0) problems.push("CONFIG: no domains. Add the exam's domains from the official study guide.");
  else for (const [k, d] of Object.entries(config.domains)) {
    if (!/^\d+$/.test(k)) problems.push("CONFIG: domain key \"" + k + "\" must be a number");
    if (!d || !isNonEmptyString(d.name)) problems.push("CONFIG: domain " + k + " has no name");
  }
  if (!isNonEmptyString(config.storageKey)) problems.push("CONFIG: storageKey is empty");
  if (!Array.isArray(config.allowedSources) || config.allowedSources.length === 0) problems.push("CONFIG: allowedSources is empty");
  if (!Array.isArray(config.bannedTerms)) problems.push("CONFIG: bannedTerms must be a list");
  return problems;
}

function checkBank(bank, config) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(bank)) return { errors: ["BANK is not a list"], warnings, stats: null };
  const configProblems = checkConfig(config);
  if (configProblems.length) return { errors: configProblems, warnings, stats: { total: bank.length, longestCount: 0, longestShare: 0, perDomain: {} }, notSetUp: true };

  const seenIds = new Set();
  const seenStems = new Map();
  for (let i = 0; i < bank.length; i++) {
    const r = checkQuestion(bank[i], i, config, seenIds);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    const q = bank[i];
    if (q && isNonEmptyString(q.q)) {
      const key = normalise(q.q);
      if (seenStems.has(key)) errors.push(q.id + ": same question text as " + seenStems.get(key));
      else seenStems.set(key, q.id);
    }
  }

  // ── twins must point both ways and hold each other's answer ──
  const byId = new Map(bank.filter(q => q && q.id).map(q => [q.id, q]));
  for (const q of bank) {
    if (!q || q.twin === undefined) continue;
    const t = byId.get(q.twin);
    if (!t) { errors.push(q.id + ": twin " + q.twin + " does not exist"); continue; }
    if (t.twin !== q.id) errors.push(q.id + ": twin " + q.twin + " does not point back (add twin:\"" + q.id + "\" to it)");
    if (Array.isArray(t.o) && Number.isInteger(t.a) && Array.isArray(q.o)) {
      // The wording may differ, so a wrong option only needs to share a key word
      // with the twin's answer (or match it exactly).
      const twinAnswer = String(t.o[t.a]).trim().toLowerCase();
      const twinWords = significantWords(twinAnswer, config.commonWords || []);
      const present = q.o.some((o, i) => {
        if (i === q.a) return false;
        const text = String(o).trim().toLowerCase();
        return text === twinAnswer || overlaps(significantWords(text, config.commonWords || []), twinWords);
      });
      if (!present) {
        errors.push(q.id + ': its twin\'s answer "' + t.o[t.a] + '" must be one of its wrong options');
      }
    }
  }

  // ── bank-wide: how often is the right answer the single longest option? ──
  let longestCount = 0, counted = 0;
  for (const q of bank) {
    if (!q || !Array.isArray(q.o) || q.o.length !== 4 || !Number.isInteger(q.a)) continue;
    counted++;
    const lengths = q.o.map(o => String(o).trim().length);
    const c = lengths[q.a];
    if (lengths.every((l, i) => i === q.a || l < c)) longestCount++;
  }
  const share = counted === 0 ? 0 : longestCount / counted;
  if (counted >= MIN_BANK_FOR_SHARE) {
    const msg = "the correct answer is the single longest option in " + longestCount + " of " + counted + " questions (" + Math.round(share * 100) + "%). Chance is 25%.";
    if (share > MAX_LONGEST_SHARE) errors.push("BANK: " + msg + " The limit is " + Math.round(MAX_LONGEST_SHARE * 100) + "%. Lengthen wrong options in the newest questions.");
    else if (share > WARN_LONGEST_SHARE) warnings.push("BANK: " + msg);
  }

  // ── bank-wide: coverage per domain ──
  const perDomain = {};
  for (const p of Object.keys(config.domains)) perDomain[p] = 0;
  for (const q of bank) if (q && perDomain[q.p] !== undefined) perDomain[q.p]++;

  return { errors, warnings, stats: { total: bank.length, longestCount, longestShare: share, perDomain } };
}

module.exports = { checkBank, checkConfig, checkQuestion, significantWords, MAX_LENGTH_RATIO, MAX_LONGEST_SHARE };

if (require.main === module) {
  const path = require("path");
  const root = path.join(__dirname, "..");
  const { CONFIG } = require(path.join(root, "src", "config.js"));
  const { BANK } = require(path.join(root, "src", "bank.js"));
  const { errors, warnings, stats, notSetUp } = checkBank(BANK, CONFIG);
  if (notSetUp && BANK.length === 0) {
    console.log("This drill is blank: no exam set up yet.");
    errors.forEach(e => console.log("  - " + e));
    console.log("\nNOT SET UP: follow docs/workflows/new-exam.md first.");
    process.exit(1);
  }

  console.log(CONFIG.exam + " bank: " + stats.total + " questions");
  if (stats.total === 0) console.log("  (no questions yet — follow docs/workflows/add-questions.md)");
  for (const [p, n] of Object.entries(stats.perDomain)) {
    console.log("  Domain " + p + " (" + CONFIG.domains[p].name + ", " + CONFIG.domains[p].weight + "): " + n);
  }
  console.log("  Correct answer is the single longest option: " + stats.longestCount + " (" + Math.round(stats.longestShare * 100) + "%)");
  if (warnings.length) {
    console.log("\nWARNINGS (" + warnings.length + ") — look at these:");
    warnings.forEach(w => console.log("  - " + w));
  }
  if (errors.length) {
    console.log("\nERRORS (" + errors.length + ") — the bank is NOT accepted until these are fixed:");
    errors.forEach(e => console.log("  - " + e));
    process.exit(1);
  }
  console.log("\nPASS: no errors.");
}
