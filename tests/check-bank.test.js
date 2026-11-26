// Tests for scripts/check-bank.js, plus a test that the real bank passes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkBank, checkConfig } = require("../scripts/check-bank.js");
// The rule tests use the GH-300 example config, so they work even when src/ is blank.
const { CONFIG } = require("../examples/gh300/config.js");
const { BANK: EXAMPLE_BANK } = require("../examples/gh300/bank.js");
const { CONFIG: LIVE_CONFIG } = require("../src/config.js");
const { BANK: LIVE_BANK } = require("../src/bank.js");

const good = () => ({
  id: "d6-01", p: 6, t: "Public code filter",
  q: "Your organisation does not want suggestions that match code in public repositories. What should an admin configure?",
  o: ["Set the public code policy to Block", "Turn on code referencing for everyone", "Add exclusions for each public repository", "Turn off Copilot Chat for all members"],
  a: 0,
  w: "Blocking stops matching suggestions being shown. Code referencing is for when matches are allowed: it shows the source and licence.",
  src: "https://docs.github.com/en/copilot",
});
const errorsFor = q => checkBank([q], CONFIG).errors;
const warningsFor = q => checkBank([q], CONFIG).warnings;

test("a good question passes", () => {
  assert.deepEqual(errorsFor(good()), []);
});

test("YOUR BANK PASSES — if this fails, run npm run check and fix the errors", () => {
  if (checkConfig(LIVE_CONFIG).length > 0) {
    // Blank drill: allowed, but only while there are no questions.
    assert.equal(LIVE_BANK.length, 0, "src/bank.js has questions but src/config.js is not set up");
    return;
  }
  assert.deepEqual(checkBank(LIVE_BANK, LIVE_CONFIG).errors, []);
});

test("the GH-300 example bank passes", () => {
  assert.deepEqual(checkBank(EXAMPLE_BANK, CONFIG).errors, []);
});

test("a blank config is reported as not set up", () => {
  const blank = { exam: "", title: "x", storageKey: "k", domains: {}, allowedSources: ["https://a/"], bannedTerms: [], commonWords: [] };
  const r = checkBank([], blank);
  assert.equal(r.notSetUp, true);
  assert.ok(r.errors.some(e => e.includes("exam is empty")));
  assert.ok(r.errors.some(e => e.includes("no domains")));
});

test("rejects a correct answer that is much longer than the wrong ones", () => {
  const q = good();
  q.o = ["Set the policy for suggestions matching public code to Block for the whole organisation", "Code referencing", "Content exclusions", "Turn off Chat"];
  assert.ok(errorsFor(q).some(e => e.includes("longest wrong option")));
});

test("rejects all/none of the above", () => {
  const q = good();
  q.o[3] = "All of the above";
  assert.ok(errorsFor(q).some(e => e.includes("of the above")));
});

test("rejects banned old names", () => {
  const q = good();
  q.o[2] = "Use Copilot Labs to filter matches";
  assert.ok(errorsFor(q).some(e => e.includes("Copilot Labs")));
});

test("rejects a missing or untrusted source", () => {
  const q = good(); delete q.src;
  assert.ok(errorsFor(q).some(e => e.includes("missing source")));
  const q2 = good(); q2.src = "https://some-quiz-site.example/answers";
  assert.ok(errorsFor(q2).some(e => e.includes("source must start")));
});

test("rejects wrong option count, duplicates and a bad answer index", () => {
  const q = good(); q.o = q.o.slice(0, 3);
  assert.ok(errorsFor(q).some(e => e.includes("exactly 4")));
  const q2 = good(); q2.o[1] = q2.o[0];
  assert.ok(errorsFor(q2).some(e => e.includes("same")));
  const q3 = good(); q3.a = 4;
  assert.ok(errorsFor(q3).some(e => e.includes("a must be")));
});

test("rejects an id that does not match the domain, and duplicate ids", () => {
  const q = good(); q.id = "d2-01";
  assert.ok(errorsFor(q).some(e => e.includes("id says domain")));
  const r = checkBank([good(), good()], CONFIG);
  assert.ok(r.errors.some(e => e.includes("duplicate id")));
});

test("rejects a too-short explanation", () => {
  const q = good(); q.w = "Because it is.";
  assert.ok(errorsFor(q).some(e => e.includes("too short")));
});

test("twins must point both ways", () => {
  const a = good(); a.twin = "d6-02";
  const b = good(); b.id = "d6-02"; b.q = "Different question about code referencing and licences?";
  const r = checkBank([a, b], CONFIG);
  assert.ok(r.errors.some(e => e.includes("does not point back")));
});

test("bank-wide: too many 'longest is correct' questions fails", () => {
  const bank = [];
  for (let i = 1; i <= 10; i++) {
    const q = good();
    q.id = "d6-" + String(i).padStart(2, "0");
    q.q = "Question number " + i + " about the public code filter?";
    q.o = ["Set the public code policy to Block now", "Turn on code referencing for everyone", "Add exclusions for public repos", "Turn off Copilot Chat"];
    bank.push(q);
  }
  const r = checkBank(bank, CONFIG);
  assert.ok(r.errors.some(e => e.startsWith("BANK:")));
});

test("warns when only the correct answer copies a word from the question", () => {
  const q = good();
  q.q = "Which setting performs referencing of public code matches?";
  q.o = ["Code referencing", "Content exclusions", "Audit log events", "Organisation policies"];
  assert.ok(warningsFor(q).some(w => w.includes("Word-matching")));
});

test("warns on a lower-case NOT question", () => {
  const q = good();
  q.q = "Which of these is not a Copilot plan?";
  assert.ok(warningsFor(q).some(w => w.includes("NOT")));
});
