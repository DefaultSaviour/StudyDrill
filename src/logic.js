// Drill logic. Pure functions only: no page, no storage.
// That means every function here can be tested in Node (see tests/).
const LOGIC = (function () {
"use strict";

// Shuffle a copy of a list. Pass Math.random in the page; tests pass a
// fixed random source so the result is predictable.
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The toolkit a dynamic generator gets as M in generate(rng, M):
// the maths helpers plus the value types (IP addresses, ports, dates…).
function loadValueTypes() {
  if (typeof VALUE_TYPES !== "undefined") return VALUE_TYPES;
  if (typeof require === "function") {
    try { return require("./value-types.js"); } catch (e) { return null; }
  }
  return null;
}

function resolveMathEngine(mathEngine) {
  let engine = mathEngine || null;
  if (!engine && typeof MATH_ENGINE !== "undefined") engine = MATH_ENGINE;
  if (!engine && typeof require === "function") {
    try { engine = require("./math-engine.js"); } catch (e) { engine = null; }
  }
  const vt = loadValueTypes();
  if (vt && (!engine || !engine.randPrivateIPv4)) engine = Object.assign({}, engine || {}, vt);
  return engine;
}

// Build a presentable instance for a question:
//   - static MCQ ({ o, a, q, w })
//   - dynamic generator ({ generate(rng, MATH_ENGINE) }) returning mcq, input, or plot
function presentQuestion(q, rng, mathEngine) {
  const engine = resolveMathEngine(mathEngine);

  if (typeof q.generate === "function") {
    const inst = q.generate(rng, engine);
    const kind = inst.kind || q.kind || (Array.isArray(inst.o) ? "mcq" : "input");

    if (kind === "mcq") {
      const order = shuffle(inst.o.map((_, i) => i), rng);
      return {
        id: q.id,
        kind: "mcq",
        q: inst.q,
        options: order.map(i => inst.o[i]),
        correctIndex: order.indexOf(inst.a),
        w: inst.w,
        visual: inst.visual || null,
        paper: inst.paper || q.paper || null,
        src: inst.src || q.src,
      };
    }

    if (kind === "plot") {
      return {
        id: q.id,
        kind: "plot",
        q: inst.q,
        hint: inst.hint || null,
        plotSpec: inst.plotSpec,
        visual: inst.visual,
        displayAnswer: inst.displayAnswer,
        steps: inst.steps || [],
        w: inst.w,
        paper: inst.paper || q.paper || null,
        src: inst.src || q.src,
      };
    }

    return {
      id: q.id,
      kind: "input",
      q: inst.q,
      prompt: inst.prompt || null,
      hint: inst.hint || null,
      fields: inst.fields || null,
      answer: inst.answer,
      answerType: inst.answerType || "number",
      tolerance: inst.tolerance,
      sigFigs: inst.sigFigs,
      requireSimplified: inst.requireSimplified,
      requireExpanded: inst.requireExpanded,
      requireFactorised: inst.requireFactorised,
      requireCompletedSquare: inst.requireCompletedSquare,
      requireSimplifiedSurd: inst.requireSimplifiedSurd,
      requireRationalDenominator: inst.requireRationalDenominator,
      requireSubject: inst.requireSubject,
      allowRhsOnly: inst.allowRhsOnly,
      displayAnswer: inst.displayAnswer,
      steps: inst.steps || [],
      w: inst.w,
      visual: inst.visual || null,
      paper: inst.paper || q.paper || null,
      src: inst.src || q.src,
    };
  }

  // Static MCQ (classic StudyDrill format)
  const order = shuffle(q.o.map((_, i) => i), rng);
  return {
    id: q.id,
    kind: "mcq",
    q: q.q,
    options: order.map(i => q.o[i]),
    correctIndex: order.indexOf(q.a),
    w: q.w,
    visual: q.visual || null,
    paper: q.paper || null,
    src: q.src,
  };
}

function questionSignature(pq) {
  return pq.q + " || " + (pq.displayAnswer || "");
}

// Re-roll dynamic generators up to maxTries times so the same question/answer isn't repeated consecutively.
function presentFreshQuestion(q, rng, mathEngine, previousSig, maxTries) {
  const limit = maxTries || 6;
  let pq = presentQuestion(q, rng, mathEngine);
  if (typeof q.generate !== "function" || !previousSig) return pq;
  for (let i = 1; i < limit && (pq.q === previousSig || questionSignature(pq) === previousSig); i++) {
    pq = presentQuestion(q, rng, mathEngine);
  }
  return pq;
}

// How many dated attempts to keep per question. Totals are never capped.
const HISTORY_CAP = 40;
const CODE = { knew: "k", guessed: "g", wrong: "w" };

// Per-question stats: { knew, guessed, wrong, seen, last, h }
// h = attempt history, oldest first: [timestamp, "k" | "g" | "w"]
function emptyStat() {
  return { knew: 0, guessed: 0, wrong: 0, seen: 0, last: 0, h: [] };
}

// Read a history safely. Bad entries are skipped, not fatal.
function historyOf(stat) {
  if (!stat || !Array.isArray(stat.h)) return [];
  return stat.h.filter(e =>
    Array.isArray(e) && e.length === 2 &&
    typeof e[0] === "number" && Number.isFinite(e[0]) &&
    (e[1] === "k" || e[1] === "g" || e[1] === "w"));
}

// result is "knew" | "guessed" | "wrong". Returns a NEW stats object.
function recordAnswer(stats, id, result, now) {
  if (!Object.prototype.hasOwnProperty.call(CODE, result)) {
    throw new Error("Unknown result: " + result);
  }
  const prev = stats[id] || emptyStat();
  const h = historyOf(prev).concat([[now, CODE[result]]]).slice(-HISTORY_CAP);
  const next = { ...prev, seen: prev.seen + 1, last: now, h };
  next[result] = prev[result] + 1;
  return { ...stats, [id]: next };
}

// Join two histories. The same attempt (same time, same result) counts once.
function mergeHistory(ha, hb) {
  const seen = new Set();
  const out = [];
  for (const e of historyOf({ h: ha }).concat(historyOf({ h: hb }))) {
    const key = e[0] + ":" + e[1];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  out.sort((x, y) => x[0] - y[0]);
  return out.slice(-HISTORY_CAP);
}

// What one question's history says.
//   streak — how many of the latest attempts in a row you knew
//   label  — plain-English direction of travel
function trend(stat) {
  const codes = historyOf(stat).map(e => e[1]);
  const seen = stat && typeof stat.seen === "number" ? stat.seen : 0;
  const untracked = Math.max(0, seen - codes.length);
  let streak = 0;
  for (let i = codes.length - 1; i >= 0; i--) {
    if (codes[i] === "k") streak++; else break;
  }
  let label = null;
  if (codes.length === 0) label = null;
  else if (streak >= 2) label = "getting better";
  else if (streak === 1) label = "first clean answer";
  else label = "still missing it";
  return { codes, tracked: codes.length, untracked, streak, label };
}

// Questions missed or guessed at least once. Worst first.
function troubleList(bank, stats, limit) {
  const rows = [];
  for (const q of bank) {
    const s = stats[q.id];
    if (!s || !s.seen) continue;
    const miss = (s.wrong || 0) + (s.guessed || 0);
    if (miss === 0) continue;
    rows.push({ q, stat: s, miss, missRate: miss / s.seen });
  }
  rows.sort((a, b) => b.miss - a.miss || b.missRate - a.missRate || a.q.id.localeCompare(b.q.id));
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

// How often a question should come up. Unseen, wrong and guessed come up
// more. Questions you know again and again fade back (but never vanish).
function weight(stat) {
  if (!stat || stat.seen === 0) return 3;
  const w = 1 + 3 * stat.wrong + 2 * stat.guessed - 1 * stat.knew;
  return Math.max(0.25, w);
}

// Weak = missed or guessed at least as often as known.
function isWeak(stat) {
  if (!stat || stat.seen === 0) return false;
  return stat.wrong + stat.guessed >= stat.knew;
}

function isUnseen(stat) {
  return !stat || !stat.seen;
}

// Choose the next question.
//   parts: domain numbers to include, e.g. [1, 2, 3]
//   mode:  "mixed" | "weak" | "new"
//   recent: ids shown recently; avoided unless nothing else is left
function pickNext(bank, stats, { parts, mode, recent }, rng) {
  let pool = bank.filter(q => parts.includes(q.p));
  if (mode === "weak") pool = pool.filter(q => isWeak(stats[q.id]));
  if (mode === "new") pool = pool.filter(q => isUnseen(stats[q.id]));
  if (pool.length === 0) return null;

  const fresh = pool.filter(q => !recent.includes(q.id));
  const candidates = fresh.length > 0 ? fresh : pool;

  const weights = candidates.map(q => weight(stats[q.id]));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// Combine progress from two places (for example, an imported backup).
// Totals come from the copy that has seen more answers; histories are joined.
function mergeStats(a, b) {
  const out = { ...(a || {}) };
  for (const [id, sb] of Object.entries(b || {})) {
    if (!sb || typeof sb !== "object") continue;
    const sa = out[id];
    const winner = (!sa || sb.seen > sa.seen || (sb.seen === sa.seen && sb.last > sa.last)) ? sb : sa;
    out[id] = { ...winner, h: mergeHistory(sa && sa.h, sb && sb.h) };
  }
  return out;
}

// Per-domain progress.
function partSummary(bank, stats, partNumbers) {
  const out = {};
  for (const p of partNumbers) {
    const qs = bank.filter(q => q.p === p);
    let answered = 0, knew = 0, total = 0, weak = 0;
    for (const q of qs) {
      const s = stats[q.id];
      if (s && s.seen > 0) {
        answered++;
        knew += s.knew;
        total += s.seen;
        if (isWeak(s)) weak++;
      }
    }
    out[p] = {
      questions: qs.length,
      answered,
      weak,
      solid: answered - weak,
      knewRate: total === 0 ? null : knew / total,
    };
  }
  return out;
}

// Check an imported progress file before using it. Returns the stats
// object, or null if the file is not a drill backup.
function parseBackup(text, storageKey) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || typeof data !== "object") return null;
  if (data.app !== storageKey) return null;
  if (!data.stats || typeof data.stats !== "object" || Array.isArray(data.stats)) return null;
  return data.stats;
}

return {
  shuffle, presentQuestion, presentFreshQuestion, emptyStat, historyOf, recordAnswer, mergeHistory,
  trend, troubleList, weight, isWeak, isUnseen, pickNext, mergeStats,
  partSummary, parseBackup, HISTORY_CAP,
};
})();

if (typeof module !== "undefined") module.exports = LOGIC;
