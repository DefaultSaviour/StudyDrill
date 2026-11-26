// Tests for src/logic.js. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

// A fixed random source, so shuffles are the same every run.
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const Q = (id, p) => ({ id, p, t: "t", q: "q " + id, o: ["a", "b", "c", "d"], a: 0, w: "w" });

test("shuffle keeps every item and does not change the original", () => {
  const src = [1, 2, 3, 4, 5];
  const out = L.shuffle(src, seeded(1));
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});

test("presentQuestion tracks where the correct option moved", () => {
  const q = { id: "x", o: ["right", "w1", "w2", "w3"], a: 0 };
  for (let seed = 1; seed < 50; seed++) {
    const pq = L.presentQuestion(q, seeded(seed));
    assert.equal(pq.options[pq.correctIndex], "right");
  }
});

test("presentQuestion puts the correct answer in every position over many shuffles", () => {
  const q = { id: "x", o: ["right", "w1", "w2", "w3"], a: 0 };
  const positions = new Set();
  const rng = seeded(7);
  for (let i = 0; i < 200; i++) positions.add(L.presentQuestion(q, rng).correctIndex);
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
});

test("recordAnswer counts, dates and does not change the old stats", () => {
  const before = {};
  const after = L.recordAnswer(before, "d1-01", "wrong", 1000);
  assert.deepEqual(before, {});
  assert.equal(after["d1-01"].wrong, 1);
  assert.equal(after["d1-01"].seen, 1);
  assert.deepEqual(after["d1-01"].h, [[1000, "w"]]);
  const again = L.recordAnswer(after, "d1-01", "knew", 2000);
  assert.equal(again["d1-01"].knew, 1);
  assert.equal(again["d1-01"].seen, 2);
});

test("recordAnswer rejects an unknown result", () => {
  assert.throws(() => L.recordAnswer({}, "x", "maybe", 1));
  assert.throws(() => L.recordAnswer({}, "x", "toString", 1));
});

test("history is capped but totals are not", () => {
  let s = {};
  for (let i = 0; i < L.HISTORY_CAP + 10; i++) s = L.recordAnswer(s, "x", "knew", i);
  assert.equal(s.x.h.length, L.HISTORY_CAP);
  assert.equal(s.x.knew, L.HISTORY_CAP + 10);
});

test("historyOf skips bad entries", () => {
  const h = L.historyOf({ h: [[1, "k"], ["x", "k"], [2, "z"], null, [3, "w"]] });
  assert.deepEqual(h, [[1, "k"], [3, "w"]]);
});

test("trend labels", () => {
  assert.equal(L.trend({ seen: 2, h: [[1, "w"], [2, "w"]] }).label, "still missing it");
  assert.equal(L.trend({ seen: 2, h: [[1, "w"], [2, "k"]] }).label, "first clean answer");
  assert.equal(L.trend({ seen: 3, h: [[1, "w"], [2, "k"], [3, "k"]] }).label, "getting better");
});

test("weak and unseen", () => {
  assert.equal(L.isUnseen(undefined), true);
  assert.equal(L.isWeak({ seen: 2, knew: 1, guessed: 1, wrong: 0 }), true);
  assert.equal(L.isWeak({ seen: 3, knew: 2, guessed: 1, wrong: 0 }), false);
});

test("pickNext respects domains and modes", () => {
  const bank = [Q("d1-01", 1), Q("d2-01", 2), Q("d2-02", 2)];
  const stats = { "d2-01": { seen: 1, knew: 0, guessed: 0, wrong: 1, h: [] } };
  const rng = seeded(3);
  for (let i = 0; i < 30; i++) {
    assert.equal(L.pickNext(bank, stats, { parts: [1], mode: "mixed", recent: [] }, rng).p, 1);
    assert.equal(L.pickNext(bank, stats, { parts: [1, 2], mode: "weak", recent: [] }, rng).id, "d2-01");
    assert.notEqual(L.pickNext(bank, stats, { parts: [2], mode: "new", recent: [] }, rng).id, "d2-01");
  }
  assert.equal(L.pickNext(bank, stats, { parts: [1], mode: "weak", recent: [] }, rng), null);
});

test("pickNext avoids recent questions while others are left", () => {
  const bank = [Q("d1-01", 1), Q("d1-02", 1)];
  const rng = seeded(5);
  for (let i = 0; i < 20; i++) {
    assert.equal(L.pickNext(bank, {}, { parts: [1], mode: "mixed", recent: ["d1-01"] }, rng).id, "d1-02");
  }
});

test("mergeStats keeps the bigger total and joins histories without doubles", () => {
  const a = { x: { knew: 1, guessed: 0, wrong: 0, seen: 1, last: 1, h: [[1, "k"]] } };
  const b = { x: { knew: 1, guessed: 0, wrong: 1, seen: 2, last: 2, h: [[1, "k"], [2, "w"]] } };
  const m = L.mergeStats(a, b);
  assert.equal(m.x.seen, 2);
  assert.deepEqual(m.x.h, [[1, "k"], [2, "w"]]);
});

test("partSummary counts per domain", () => {
  const bank = [Q("d1-01", 1), Q("d1-02", 1), Q("d2-01", 2)];
  const stats = { "d1-01": { seen: 2, knew: 2, guessed: 0, wrong: 0 }, "d1-02": { seen: 1, knew: 0, guessed: 0, wrong: 1 } };
  const s = L.partSummary(bank, stats, [1, 2]);
  assert.equal(s[1].questions, 2);
  assert.equal(s[1].answered, 2);
  assert.equal(s[1].weak, 1);
  assert.equal(s[1].solid, 1);
  assert.equal(s[2].knewRate, null);
});

test("parseBackup accepts only this drill's backups", () => {
  const ok = JSON.stringify({ app: "gh300-drill-v1", stats: { x: { seen: 1 } } });
  assert.deepEqual(L.parseBackup(ok, "gh300-drill-v1"), { x: { seen: 1 } });
  assert.equal(L.parseBackup(ok, "other-app"), null);
  assert.equal(L.parseBackup("not json", "gh300-drill-v1"), null);
  assert.equal(L.parseBackup(JSON.stringify({ app: "gh300-drill-v1", stats: [] }), "gh300-drill-v1"), null);
});

test("presentQuestion supports dynamic input, plot and mcq generators", () => {
  const M = require("../src/math-engine.js");
  const dynInput = {
    id: "d1-90", p: 1, t: "Eval",
    generate(rng, engine) {
      const a = engine.randInt(rng, 2, 5);
      return { kind: "input", q: "Double " + a, answerType: "number", answer: 2 * a, displayAnswer: String(2 * a), w: "Multiply by two." };
    },
  };
  const pq1 = L.presentQuestion(dynInput, seeded(11), M);
  assert.equal(pq1.kind, "input");
  assert.equal(pq1.answer, 4);

  const pqFresh = L.presentFreshQuestion(dynInput, seeded(11), M, pq1.q);
  assert.notEqual(pqFresh.q, pq1.q);

  const dynPlot = {
    id: "d1-91", p: 1, t: "Plot",
    generate() {
      return {
        kind: "plot",
        q: "Plot y = x",
        visual: { type: "graph", xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
        plotSpec: { plotType: "line", m: 1, c: 0 },
        displayAnswer: "y = x",
        w: "Gradient 1, intercept 0.",
      };
    },
  };
  const pqp = L.presentQuestion(dynPlot, seeded(3), M);
  assert.equal(pqp.kind, "plot");
  assert.equal(pqp.plotSpec.m, 1);
});
