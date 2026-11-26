#!/usr/bin/env node
// Checks every question in src/bank.js against StudyDrill + dynamic maths rules.
// Run:  npm run check
// Exit code 0 = no errors (warnings are allowed). Exit code 1 = fix the errors.
"use strict";

const path = require("path");
const fs = require("fs");
const MATH_ENGINE = require("../src/math-engine.js");
const VALUE_TYPES = require("../src/value-types.js");
const RULE_PACKS = require("../src/rule-packs.js");
const { SUBJECT_RULES } = require("../src/subject-rules.js");
// Everything a dynamic generator can use as M in generate(rng, M): maths helpers + value types.
const TOOLKIT = Object.assign({}, MATH_ENGINE, VALUE_TYPES);
const REPO_ROOT = path.join(__dirname, "..");

const MAX_LENGTH_RATIO = 1.25;
const MAX_LONGEST_SHARE = 0.30;
const WARN_LONGEST_SHARE = 0.25;
const MIN_BANK_FOR_SHARE = 8;
const SHORT_OPTION_RATIO = 0.35;
const MIN_WHY_LENGTH = 80;
const MIN_DYNAMIC_WHY_LENGTH = 60;
const MIN_RULE_LENGTH = 50;

const GENERATOR_SEEDS = Array.from({ length: 100 }, (_, i) => (i + 1) * 37 + 11);
const BAD_GENERATED_TEXT = /\b(NaN|Infinity|undefined)\b/;
const VALID_ANSWER_TYPES = new Set([
  "number", "sigfig", "fraction", "expression", "equation",
  "roots", "coords", "vector", "inequality", "exact",
]);

function getFeatures(config) {
  return {
    typedAnswers: false,
    dynamicNumbers: false,
    charts: false,
    ...(config && config.features ? config.features : {}),
  };
}

const GENERIC_COMMON_WORDS = [
  "which", "should", "using", "would", "about", "their", "there", "these", "those",
  "where", "while", "after", "before", "users", "being", "could", "other", "every",
];

const BANNED_OPTION_TEXT = /\b(all|none|both) of the (above|options)\b|^both\b|^neither\b/i;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function seededRng(seed) {
  let s = seed;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  // Warm up Park-Miller LCG so small seeds diverge immediately on call #1
  for (let i = 0; i < 5; i++) next();
  return next;
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

function checkBannedTerms(text, bannedTerms, err) {
  for (const b of bannedTerms || []) {
    const re = new RegExp("\\b" + b.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(text)) err('uses "' + b.term + '". ' + b.why);
  }
}

// The rules that apply to this exam: always-on packs, the packs in CONFIG.rulePacks,
// and the exam's own rules in src/subject-rules.js.
function activeRules(config, subjectRules) {
  const ids = new Set(RULE_PACKS.ALWAYS_ON.concat((config && config.rulePacks) || []));
  const rules = [];
  for (const id of ids) if (RULE_PACKS.byId[id]) rules.push(RULE_PACKS.byId[id]);
  return rules.concat(subjectRules || SUBJECT_RULES || []);
}

// Scan text with the active rules. Errors go to err, warnings to warn.
function checkRuleText(text, config, err, warn) {
  const rules = config.__rules || activeRules(config);
  for (const f of RULE_PACKS.scan(text, rules)) {
    (f.level === "warning" ? warn : err)("[" + f.id + "] " + f.message);
  }
}

function checkSource(src, config, err) {
  if (!isNonEmptyString(src)) { err("missing source (src)"); return; }
  const prefix = config.allowedSources.find(p => src.startsWith(p));
  if (!prefix) { err("source must start with one of: " + config.allowedSources.join(", ")); return; }
  // A source that is not a web link is a file in this repo (for example notes/topic.md). It must exist.
  if (!/^https?:\/\//.test(src)) {
    const file = path.normalize(path.join(REPO_ROOT, src.split("#")[0]));
    if (!file.startsWith(REPO_ROOT + path.sep) || !fs.existsSync(file)) err('source file "' + src + '" does not exist in this repo');
  }
}

function checkCommonEnvelope(q, index, config, seenIds, err) {
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
  checkSource(q.src, config, err);
}

function derivePlotSelfTestPoints(inst) {
  const ps = inst.plotSpec || {};
  if (Array.isArray(ps.selfTestPoints)) return ps.selfTestPoints;
  const vis = inst.visual || {};
  const xMin = vis.xMin !== undefined ? vis.xMin : -6;
  const xMax = vis.xMax !== undefined ? vis.xMax : 6;

  if (ps.plotType === "line") {
    const minPts = ps.minPoints || 2;
    const pts = [];
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax) && pts.length < minPts; x++) {
      pts.push({ x, y: ps.m * x + ps.c });
    }
    return pts;
  }
  if (ps.plotType === "points") {
    return ps.targets || [];
  }
  if (ps.plotType === "curve" && typeof ps.fn === "function") {
    const minPts = ps.minPoints || 3;
    const pts = Array.isArray(ps.requiredPoints) ? ps.requiredPoints.slice() : [];
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax) && pts.length < minPts; x++) {
      if (!pts.some(p => p.x === x)) {
        const y = ps.fn(x);
        if (Number.isFinite(y)) pts.push({ x, y });
      }
    }
    return pts;
  }
  return [];
}

function checkDynamicQuestion(q, index, config, seenIds) {
  const errors = [];
  const warnings = [];
  const label = q && isNonEmptyString(q.id) ? q.id : "question #" + (index + 1);
  const err = m => errors.push(label + ": " + m);
  const warn = m => warnings.push(label + ": " + m);
  const features = getFeatures(config);

  checkCommonEnvelope(q, index, config, seenIds, err);

  if (!features.dynamicNumbers) {
    err("uses a dynamic generator, but CONFIG.features.dynamicNumbers is false");
    return { errors, warnings };
  }

  if (!isNonEmptyString(q.title)) err("dynamic question missing title (shown in Trouble list)");
  if (!isNonEmptyString(q.rule)) err("dynamic question missing rule (shown in Trouble list)");
  else if (q.rule.trim().length < MIN_RULE_LENGTH) {
    err("rule is too short (" + q.rule.trim().length + " characters, need " + MIN_RULE_LENGTH + ")");
  }

  checkBannedTerms([q.title, q.rule, q.t, q.example || ""].join(" \n "), config.bannedTerms, err);
  checkRuleText([q.title, q.rule, q.example || ""].join(" \n "), config, err, warn);

  const variantsSeen = new Set();
  for (const seed of GENERATOR_SEEDS) {
    let inst;
    try {
      inst = q.generate(seededRng(seed), TOOLKIT);
    } catch (e) {
      err("generator threw on seed " + seed + ": " + e.message);
      return { errors, warnings };
    }
    if (!inst || typeof inst !== "object") {
      err("generator returned invalid object on seed " + seed);
      return { errors, warnings };
    }
    if (!isNonEmptyString(inst.q)) err("generated instance missing question text (q) on seed " + seed);
    else {
      const sig = inst.q.trim() + " || " + (inst.displayAnswer || "") + " || " + (Array.isArray(inst.o) ? inst.o.join("|") : "");
      variantsSeen.add(sig);
    }

    if (!isNonEmptyString(inst.w)) err("generated instance missing explanation (w) on seed " + seed);
    else if (inst.w.trim().length < MIN_DYNAMIC_WHY_LENGTH) {
      err("generated explanation (w) too short on seed " + seed + " (" + inst.w.trim().length + " chars, need " + MIN_DYNAMIC_WHY_LENGTH + ")");
    }

    const genTexts = [inst.q, inst.w, inst.displayAnswer, ...(Array.isArray(inst.steps) ? inst.steps : [])];
    for (const txt of genTexts) {
      if (typeof txt === "string" && BAD_GENERATED_TEXT.test(txt)) {
        err("generated text contains NaN/Infinity/undefined on seed " + seed);
        break;
      }
    }

    const instText = [inst.q, inst.w, ...(Array.isArray(inst.o) ? inst.o : [])].join(" \n ");
    checkBannedTerms(instText, config.bannedTerms, err);
    checkRuleText([instText, inst.displayAnswer, inst.hint, ...(Array.isArray(inst.steps) ? inst.steps : [])].filter(t => typeof t === "string").join(" \n "), config, err, warn);

    const kind = inst.kind || q.kind || (Array.isArray(inst.o) ? "mcq" : "input");

    if ((kind === "input" || kind === "plot") && !features.typedAnswers) {
      err("uses typed/plot answers (" + kind + "), but CONFIG.features.typedAnswers is false");
      return { errors, warnings };
    }
    if ((q.visual || inst.visual || kind === "plot") && !features.charts) {
      err("uses a chart or visual diagram, but CONFIG.features.charts is false");
      return { errors, warnings };
    }

    if (kind === "mcq") {
      if (!Array.isArray(inst.o) || inst.o.length !== 4) {
        err("generated mcq must have 4 options on seed " + seed);
        continue;
      }
      if (!inst.o.every(isNonEmptyString)) { err("generated mcq has empty option on seed " + seed); continue; }
      if (new Set(inst.o.map(o => o.trim().toLowerCase())).size !== 4) {
        err("generated mcq has duplicate options on seed " + seed);
      }
      inst.o.forEach((o, i) => {
        if (BANNED_OPTION_TEXT.test(o.trim())) err("generated mcq option " + (i + 1) + " uses banned wording on seed " + seed);
      });
      if (!Number.isInteger(inst.a) || inst.a < 0 || inst.a > 3) {
        err("generated mcq answer index a must be 0–3 on seed " + seed);
      } else {
        const lengths = inst.o.map(o => o.trim().length);
        const cLen = lengths[inst.a];
        const longestWrong = Math.max(...lengths.filter((_, i) => i !== inst.a));
        if (cLen > longestWrong * MAX_LENGTH_RATIO) {
          err("generated mcq correct answer too long vs wrong options on seed " + seed);
        }
      }
    } else if (kind === "input") {
      if (!isNonEmptyString(inst.displayAnswer)) {
        err("generated input question missing displayAnswer on seed " + seed);
      }
      if (Array.isArray(inst.fields)) {
        if (inst.fields.length === 0) {
          err("generated input fields cannot be empty on seed " + seed);
          continue;
        }
        let fieldsValid = true;
        for (let fi = 0; fi < inst.fields.length; fi++) {
          const f = inst.fields[fi];
          const at = f.answerType || "number";
          if (!VALID_ANSWER_TYPES.has(at)) { err("field #" + (fi + 1) + " has unknown answerType: " + at); fieldsValid = false; }
          if (f.answer === undefined || f.answer === null || f.answer === "" || (typeof f.answer === "number" && !Number.isFinite(f.answer))) {
            err("field #" + (fi + 1) + " has missing or non-finite answer on seed " + seed); fieldsValid = false;
          }
        }
        if (fieldsValid) {
          const sample = inst.fields.map(f => f.selfTestAnswer !== undefined ? f.selfTestAnswer : f.answer);
          const check = MATH_ENGINE.checkFields(sample, inst.fields);
          if (!check.ok) err("input fields self-test failed on seed " + seed);
        }
      } else {
        const at = inst.answerType || "number";
        if (!VALID_ANSWER_TYPES.has(at)) err("unknown answerType: " + at);
        else if (inst.answer === undefined || inst.answer === null || inst.answer === "" || (typeof inst.answer === "number" && !Number.isFinite(inst.answer))) {
          err("missing or non-finite answer on seed " + seed);
        } else {
          const sample = inst.selfTestAnswer !== undefined ? inst.selfTestAnswer : inst.answer;
          const check = MATH_ENGINE.checkAnswer(sample, inst);
          if (!check.ok) {
            err("input self-test failed on seed " + seed + (check.message ? " (" + check.message + ")" : ""));
          }
        }
      }
    } else if (kind === "plot") {
      if (!isNonEmptyString(inst.displayAnswer)) err("generated plot question missing displayAnswer on seed " + seed);
      if (!inst.visual || inst.visual.type !== "graph") err("generated plot question missing graph visual on seed " + seed);
      if (!inst.plotSpec || typeof inst.plotSpec !== "object") {
        err("generated plot question missing plotSpec on seed " + seed);
      } else {
        const pts = derivePlotSelfTestPoints(inst);
        const check = MATH_ENGINE.checkPlot(pts, inst.plotSpec);
        if (!check.ok) {
          err("plot self-test failed on seed " + seed + (check.message ? " (" + check.message + ")" : ""));
        }
      }
    } else {
      err("unknown question kind: " + kind);
    }

    if (errors.length > 5) break; // avoid flooding identical seed failures
  }

  if (variantsSeen.size < 2 && !q.allowStaticPrompt && errors.length === 0) {
    err("dynamic generator produced the exact same question across all " + GENERATOR_SEEDS.length + " seeds — vary the numbers!");
  }

  return { errors, warnings };
}

function checkQuestion(q, index, config, seenIds) {
  const errors = [];
  const warnings = [];
  const label = q && isNonEmptyString(q.id) ? q.id : "question #" + (index + 1);
  const err = m => errors.push(label + ": " + m);
  const warn = m => warnings.push(label + ": " + m);
  const features = getFeatures(config);

  if (!q || typeof q !== "object") { err("is not an object"); return { errors, warnings }; }
  if (typeof q.generate === "function") return checkDynamicQuestion(q, index, config, seenIds);

  if (q.visual && !features.charts) {
    err("uses a chart or visual diagram, but CONFIG.features.charts is false");
  }

  // ── classic static MCQ shape ──
  checkCommonEnvelope(q, index, config, seenIds, err);
  if (!isNonEmptyString(q.q)) err("missing question (q)");
  if (!isNonEmptyString(q.w)) err("missing explanation (w)");
  else if (q.w.trim().length < MIN_WHY_LENGTH) err("explanation (w) is too short to say why the twin is wrong (" + q.w.trim().length + " characters, need " + MIN_WHY_LENGTH + ")");

  if (!Array.isArray(q.o) || q.o.length !== 4) { err("must have exactly 4 options"); return { errors, warnings }; }
  if (!q.o.every(isNonEmptyString)) { err("every option must be non-empty text"); return { errors, warnings }; }
  const lowered = q.o.map(o => o.trim().toLowerCase());
  if (new Set(lowered).size !== 4) err("two options are the same");
  q.o.forEach((o, i) => { if (BANNED_OPTION_TEXT.test(o.trim())) err('option ' + (i + 1) + ' uses "all/none/both of the above" style wording'); });
  if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) { err("a must be 0, 1, 2 or 3"); return { errors, warnings }; }

  // ── banned names ──
  const allText = [q.q, q.w, ...q.o].join(" \n ");
  checkBannedTerms(allText, config.bannedTerms, err);
  checkRuleText(allText, config, err, warn);

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
      // Numbers like "172.32" or "/25" count too, so numeric options can be named.
      const numbers = (o.match(/\d+(?:[.:/]\d+)+/g) || []).filter(n => n.length >= 4);
      if (numbers.some(n => q.w.includes(n))) return true;
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
  if (!isNonEmptyString(config.exam)) problems.push('CONFIG: exam is empty. Fill in src/config.js (see docs/workflows/setup.md).');
  if (!config.domains || Object.keys(config.domains).length === 0) problems.push("CONFIG: no domains. Add the exam's domains from the official study guide.");
  else for (const [k, d] of Object.entries(config.domains)) {
    if (!/^\d+$/.test(k)) problems.push("CONFIG: domain key \"" + k + "\" must be a number");
    if (!d || !isNonEmptyString(d.name)) problems.push("CONFIG: domain " + k + " has no name");
  }
  if (!isNonEmptyString(config.storageKey)) problems.push("CONFIG: storageKey is empty");
  if (!Array.isArray(config.allowedSources) || config.allowedSources.length === 0) problems.push("CONFIG: allowedSources is empty");
  if (!Array.isArray(config.bannedTerms)) problems.push("CONFIG: bannedTerms must be a list");
  if (config.rulePacks !== undefined) {
    if (!Array.isArray(config.rulePacks)) problems.push("CONFIG: rulePacks must be a list");
    else for (const id of config.rulePacks) {
      if (!RULE_PACKS.byId[id]) problems.push('CONFIG: rule pack "' + id + '" does not exist. Built-in packs: ' + RULE_PACKS.rules.map(r => r.id).join(", "));
    }
  }
  if (config.features !== undefined) {
    const known = ["typedAnswers", "dynamicNumbers", "charts"];
    for (const k of Object.keys(config.features)) if (!known.includes(k)) problems.push('CONFIG: unknown feature "' + k + '". Known: ' + known.join(", "));
  }
  return problems;
}

function checkBank(bank, config, subjectRules) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(bank)) return { errors: ["BANK is not a list"], warnings, stats: null };
  const configProblems = checkConfig(config);
  if (!configProblems.length) config = Object.assign({}, config, { __rules: activeRules(config, subjectRules) });
  if (configProblems.length) return { errors: configProblems, warnings, stats: { total: bank.length, dynamicCount: 0, longestCount: 0, longestShare: 0, perDomain: {} }, notSetUp: true };

  const seenIds = new Set();
  const seenStems = new Map();
  const seenTitles = new Map();
  let dynamicCount = 0;

  for (let i = 0; i < bank.length; i++) {
    const r = checkQuestion(bank[i], i, config, seenIds);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    const q = bank[i];
    if (q && typeof q.generate === "function") {
      dynamicCount++;
      if (isNonEmptyString(q.title)) {
        const key = normalise(q.title);
        if (seenTitles.has(key)) errors.push(q.id + ": same dynamic title as " + seenTitles.get(key));
        else seenTitles.set(key, q.id);
      }
    } else if (q && isNonEmptyString(q.q)) {
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

  // ── bank-wide: how often is the right answer the single longest option (static MCQs)? ──
  let longestCount = 0, counted = 0;
  for (const q of bank) {
    if (!q || typeof q.generate === "function" || !Array.isArray(q.o) || q.o.length !== 4 || !Number.isInteger(q.a)) continue;
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

  return { errors, warnings, stats: { total: bank.length, dynamicCount, longestCount, longestShare: share, perDomain } };
}

module.exports = { checkBank, checkConfig, activeRules, TOOLKIT, checkQuestion, significantWords, MAX_LENGTH_RATIO, MAX_LONGEST_SHARE };

if (require.main === module) {
  const path = require("path");
  const root = path.join(__dirname, "..");
  const { CONFIG } = require(path.join(root, "src", "config.js"));
  const { BANK } = require(path.join(root, "src", "bank.js"));
  const { errors, warnings, stats, notSetUp } = checkBank(BANK, CONFIG);
  if (notSetUp && BANK.length === 0) {
    console.log("This drill is blank: no exam set up yet.");
    errors.forEach(e => console.log("  - " + e));
    console.log("\nNOT SET UP: follow docs/workflows/setup.md first.");
    process.exit(1);
  }

  const dynLabel = stats.dynamicCount > 0 ? " (" + stats.dynamicCount + " dynamic, " + (stats.total - stats.dynamicCount) + " static)" : "";
  console.log(CONFIG.exam + " bank: " + stats.total + " questions" + dynLabel);
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
