// Tests for scripts/check-bank.js, plus a test that the real bank passes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkBank, checkConfig } = require("../scripts/check-bank.js");
// The rule tests use the GH-300 example config, so they work even when src/ is blank.
const { CONFIG } = require("../examples/gh300/config.js");
const { BANK: EXAMPLE_BANK } = require("../examples/gh300/bank.js");
const { CONFIG: LIVE_CONFIG } = require("../src/config.js");
const { BANK: LIVE_BANK } = require("../src/bank.js");
const { CONFIG: MATHS_CONFIG } = require("../examples/maths-n5/config.js");
const { BANK: MATHS_EXAMPLE_BANK } = require("../examples/maths-n5/bank.js");

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

test("the SCQF Level 5 Maths showcase bank passes with 0 errors and 0 warnings", () => {
  const r = checkBank(MATHS_EXAMPLE_BANK, MATHS_CONFIG);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("rejects broken, constant or failing-self-test dynamic generators", () => {
  const baseDyn = () => ({
    id: "d1-01",
    p: 1,
    t: "Algebra",
    title: "Dynamic test skill",
    rule: "Always simplify algebraic expressions carefully before checking your final answer.",
    src: "https://www.sqa.org.uk/files_ccc/n5-course-spec-mathematics.pdf",
    generate(rng, M) {
      const a = M.randInt(rng, 2, 9);
      return {
        kind: "input",
        q: "Evaluate `" + a + " + 1`.",
        answerType: "number",
        answer: a + 1,
        displayAnswer: String(a + 1),
        w: "Add one to the given integer and verify your mental arithmetic step.",
      };
    },
  });
  assert.deepEqual(checkBank([baseDyn()], MATHS_CONFIG).errors, []);

  // Throws inside generator
  const throwsDyn = baseDyn();
  throwsDyn.generate = () => { throw new Error("boom"); };
  assert.ok(checkBank([throwsDyn], MATHS_CONFIG).errors.some(e => e.includes("threw")));

  // Always emits the exact same question
  const staticDyn = baseDyn();
  staticDyn.generate = () => ({
    kind: "input", q: "Evaluate 2 + 1.", answerType: "number", answer: 3, displayAnswer: "3",
    w: "Add two and one together to obtain three in every single generated run.",
  });
  assert.ok(checkBank([staticDyn], MATHS_CONFIG).errors.some(e => e.includes("exact same question")));

  // Self-test answer fails checker
  const badAnsDyn = baseDyn();
  badAnsDyn.generate = (rng, M) => {
    const a = M.randInt(rng, 2, 9);
    return {
      kind: "input", q: "Evaluate `" + a + " + 1`.", answerType: "number", answer: "not a number",
      displayAnswer: "3", w: "Add one to the given number to obtain the correct sum.",
    };
  };
  assert.ok(checkBank([badAnsDyn], MATHS_CONFIG).errors.some(e => e.includes("self-test failed")));

  // Missing rule & title
  const noMeta = baseDyn();
  delete noMeta.title;
  delete noMeta.rule;
  const metaErrs = checkBank([noMeta], MATHS_CONFIG).errors;
  assert.ok(metaErrs.some(e => e.includes("missing title")));
  assert.ok(metaErrs.some(e => e.includes("missing rule")));
});

test("enforces CONFIG.features flags and catches NaN/Infinity in dynamic generators", () => {
  const dynQ = {
    id: "d1-01",
    p: 1,
    t: "Algebra",
    title: "Add 1",
    rule: "Add one carefully to any positive integer to get the next integer.",
    src: "https://www.sqa.org.uk/files_ccc/n5-course-spec-mathematics.pdf",
    generate(rng, M) {
      const a = M.randInt(rng, 2, 9);
      return {
        kind: "input",
        q: "Evaluate `" + a + " + 1`.",
        answerType: "number",
        answer: a + 1,
        displayAnswer: String(a + 1),
        w: "Add one to the given integer and verify your arithmetic carefully.",
      };
    },
  };

  // dynamicNumbers: false blocks dynamic generator
  const noDynCfg = { ...MATHS_CONFIG, features: { typedAnswers: true, dynamicNumbers: false, charts: true } };
  assert.ok(checkBank([dynQ], noDynCfg).errors.some(e => e.includes("dynamicNumbers is false")));

  // typedAnswers: false blocks input/plot questions
  const noTypedCfg = { ...MATHS_CONFIG, features: { typedAnswers: false, dynamicNumbers: true, charts: true } };
  assert.ok(checkBank([dynQ], noTypedCfg).errors.some(e => e.includes("typedAnswers is false")));

  // charts: false blocks visual diagrams
  const chartDyn = {
    ...dynQ,
    generate(rng, M) {
      const a = M.randInt(rng, 2, 5);
      return {
        kind: "mcq",
        q: "Which value equals `" + a + "` on the graph?",
        o: [String(a), String(a + 1), String(a + 2), String(a + 3)],
        a: 0,
        visual: { type: "graph", xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
        w: "Read the plotted number directly from the coordinate grid shown above.",
      };
    },
  };
  const noChartsCfg = { ...MATHS_CONFIG, features: { typedAnswers: true, dynamicNumbers: true, charts: false } };
  assert.ok(checkBank([chartDyn], noChartsCfg).errors.some(e => e.includes("charts is false")));

  // NaN / Infinity in generated output is caught
  const nanDyn = {
    ...dynQ,
    generate(rng, M) {
      const a = M.randInt(rng, 2, 9);
      return {
        kind: "input",
        q: "Evaluate `" + a + " / 0` = NaN.",
        answerType: "number",
        answer: NaN,
        displayAnswer: "NaN",
        w: "Division by zero is undefined and never produces a finite real value.",
      };
    },
  };
  const nanErrs = checkBank([nanDyn], MATHS_CONFIG).errors;
  assert.ok(nanErrs.some(e => e.includes("NaN/Infinity/undefined") || e.includes("non-finite")));
});

// ── Rule packs, value types and file sources ──
const { CONFIG: NET_CONFIG } = require("../examples/networking/config.js");
const { BANK: NET_BANK } = require("../examples/networking/bank.js");

const netQ = () => ({
  id: "d1-50", p: 1, t: "Private ranges",
  q: "A laptop on a home network has the private IP 192.168.1.20. Which device usually gave it this address?",
  o: ["The home router, using DHCP", "The internet provider, using DNS", "The laptop itself, using APIPA", "A web server, using NAT"],
  a: 0,
  w: "Home routers run a DHCP server that hands out private addresses. APIPA would give a 169.254 address instead, and DNS only turns names into addresses.",
  src: "https://www.rfc-editor.org/rfc/rfc1918",
});

test("the networking example bank passes with 0 errors and 0 warnings", () => {
  const r = checkBank(NET_BANK, NET_CONFIG);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("a good networking question passes", () => {
  assert.deepEqual(checkBank([netQ()], NET_CONFIG).errors, []);
});

test("rule packs reject an impossible IP address in a static question", () => {
  const q = netQ(); q.q = q.q.replace("192.168.1.20", "333.444.55.666");
  assert.ok(checkBank([q], NET_CONFIG).errors.some(e => e.includes("[ipv4]")));
});

test("rule packs reject a public address that is called private", () => {
  const q = netQ(); q.q = q.q.replace("192.168.1.20", "8.8.8.8");
  assert.ok(checkBank([q], NET_CONFIG).errors.some(e => e.includes("[ipv4-public-private]")));
});

test("rule packs only run when listed in CONFIG.rulePacks", () => {
  const q = netQ(); q.q = q.q.replace("192.168.1.20", "333.444.55.666");
  const cfg = Object.assign({}, NET_CONFIG, { rulePacks: [] });
  assert.ok(!checkBank([q], cfg).errors.some(e => e.includes("[ipv4]")));
});

test("rule packs scan every generated instance of a dynamic question", () => {
  const bad = {
    id: "d1-60", p: 1, t: "Broken generator",
    title: "Bad addresses from a hand-made generator",
    rule: "This generator invents its own octets instead of using the value types, so some are over 255.",
    example: "300.1.1.1",
    src: "https://www.rfc-editor.org/rfc/rfc1918",
    generate(rng) {
      const ip = [Math.floor(rng() * 400), 1, 1, 1].join(".");
      return { kind: "input", q: "What is the first part of " + ip + "?", answerType: "exact", answer: ip.split(".")[0], displayAnswer: ip.split(".")[0],
        w: "The first part of a dotted address is everything before the first dot in the address." };
    },
  };
  assert.ok(checkBank([bad], NET_CONFIG).errors.some(e => e.includes("[ipv4]")));
});

test("dynamic generators get the value types as M", () => {
  const { TOOLKIT } = require("../scripts/check-bank.js");
  for (const fn of ["randPrivateIPv4", "randPublicIPv4", "randPort", "randSubnetMask", "randInt", "randMoney"]) {
    assert.equal(typeof TOOLKIT[fn], "function", fn);
  }
});

test("config: unknown rule packs and features are rejected", () => {
  const cfg = Object.assign({}, NET_CONFIG, { rulePacks: ["ipv4", "not-a-pack"], features: { typedAnswers: true, sound: true } });
  const problems = checkConfig(cfg);
  assert.ok(problems.some(p => p.includes("not-a-pack")));
  assert.ok(problems.some(p => p.includes('unknown feature "sound"')));
});

test("a source can be a file in the repo, but it must exist", () => {
  const cfg = Object.assign({}, NET_CONFIG, { allowedSources: ["https://www.rfc-editor.org/", "docs/"] });
  const ok = netQ(); ok.src = "docs/LESSONS.md";
  assert.deepEqual(checkBank([ok], cfg).errors, []);
  const missing = netQ(); missing.src = "docs/no-such-notes.md";
  assert.ok(checkBank([missing], cfg).errors.some(e => e.includes("does not exist")));
  const escape = netQ(); escape.src = "docs/../../etc/passwd";
  assert.ok(checkBank([escape], cfg).errors.some(e => e.includes("does not exist")));
});
