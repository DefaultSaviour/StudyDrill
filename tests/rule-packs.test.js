// Every rule (built-in and subject) must catch all of its bad examples and none of its good ones.
const test = require("node:test");
const assert = require("node:assert/strict");
const RULE_PACKS = require("../src/rule-packs.js");
const { SUBJECT_RULES } = require("../src/subject-rules.js");

const allRules = RULE_PACKS.rules.concat(SUBJECT_RULES).map(r => ({ rule: r, source: RULE_PACKS.byId[r.id] === r ? "built-in" : "subject" }));

test("rule ids are unique and every rule has the required parts", () => {
  const ids = new Set();
  for (const { rule } of allRules) {
    assert.ok(typeof rule.id === "string" && rule.id.length > 0, "rule without id");
    assert.ok(!ids.has(rule.id), "duplicate rule id " + rule.id);
    ids.add(rule.id);
    assert.ok(typeof rule.description === "string" && rule.description.length > 10, rule.id + ": needs a description");
    assert.ok(rule.find instanceof RegExp, rule.id + ": find must be a regular expression");
    assert.equal(typeof rule.check, "function", rule.id + ": check must be a function");
    assert.ok(["error", "warning"].includes(rule.level), rule.id + ": level must be error or warning");
    assert.ok(rule.examples && rule.examples.good.length >= 1 && rule.examples.bad.length >= 1, rule.id + ": needs at least one good and one bad example");
  }
});

for (const { rule, source } of allRules) {
  test(source + " rule " + rule.id + ": catches every bad example, passes every good one", () => {
    for (const text of rule.examples.bad) {
      assert.ok(RULE_PACKS.scan(text, [rule]).length > 0, rule.id + " missed bad example: " + text);
    }
    for (const text of rule.examples.good) {
      assert.deepEqual(RULE_PACKS.scan(text, [rule]), [], rule.id + " wrongly flagged good example: " + text);
    }
  });
}

test("IPv4 rule ignores version numbers and dates", () => {
  const r = [RULE_PACKS.byId.ipv4];
  assert.deepEqual(RULE_PACKS.scan("Install version 1.2.3.4.5 today.", r), []);
  assert.deepEqual(RULE_PACKS.scan("KaTeX 0.16.11 is used.", r), []);
});
