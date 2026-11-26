// Tests for src/math-engine.js and src/visuals.js. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/math-engine.js");
const V = require("../src/visuals.js");

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

test("RNG helpers stay within range and exclude zero", () => {
  const rng = seeded(42);
  for (let i = 0; i < 100; i++) {
    const a = M.randInt(rng, -3, 5);
    assert.ok(a >= -3 && a <= 5);
    const b = M.randNonZero(rng, -3, 3);
    assert.ok(b >= -3 && b <= 3 && b !== 0);
  }
});

test("formatting helpers produce clean algebraic strings", () => {
  assert.deepEqual(M.simplifyFraction(6, -8), { num: -3, den: 4 });
  assert.equal(M.formatFrac(8, -2), "-4");
  assert.equal(M.formatFrac(-6, -9), "2/3");
  assert.equal(M.formatPoly([1, -3, 0], "x"), "x^2 - 3x");
  assert.equal(M.formatPoly([-1, 0, 9], "x"), "-x^2 + 9");
  assert.equal(M.formatLinear(1, -4), "y = x - 4");
  assert.equal(M.formatLinear(-1, 0), "y = -x");
  assert.equal(M.formatLinear({ num: 1, den: 2 }, 3), "y = (1/2)x + 3");
});

test("significant figures counting handles leading and trailing zeros", () => {
  assert.equal(M.countSigFigs("0.0450"), 3);
  assert.equal(M.countSigFigs("10.0"), 3);
  assert.equal(M.countSigFigs("0.005"), 1);
  assert.deepEqual(M.sigFigRange("1200"), { min: 2, max: 4 });
  assert.deepEqual(M.sigFigRange("1200.0"), { min: 5, max: 5 });
});

test("parser handles precedence, unary minus, implicit multiplication and degree trig", () => {
  const eval1 = (expr, env) => M.evalAst(M.parseExpression(expr), env || {});
  assert.equal(eval1("2(2^2) - 1"), 7);
  assert.equal(eval1("-x^2", { x: 3 }), -9);
  assert.equal(eval1("(-x)^2", { x: 3 }), 9);
  assert.equal(eval1("x^-2", { x: 2 }), 0.25);
  assert.equal(eval1("2(x+1)(x-3)", { x: 5 }), 24);
  assert.ok(Math.abs(eval1("2√3") - 2 * Math.sqrt(3)) < 1e-9);
  assert.ok(Math.abs(eval1("πr²", { r: 2 }) - 4 * Math.PI) < 1e-9);
  assert.ok(Math.abs(eval1("sin(30)") - 0.5) < 1e-9);
  assert.ok(Math.abs(eval1("cos(60)") - 0.5) < 1e-9);
  assert.ok(Math.abs(eval1("tan(45)") - 1) < 1e-9);
  assert.throws(() => M.parseExpression("(x + 1"));
  assert.throws(() => M.parseExpression("2 + * 3"));
});

test("checkAnswer validates numbers and units", () => {
  assert.equal(M.checkAnswer("7", { answerType: "number", answer: 7 }).ok, true);
  assert.equal(M.checkAnswer("£12.50", { answerType: "number", answer: 12.5 }).ok, true);
  assert.equal(M.checkAnswer("45°", { answerType: "number", answer: 45 }).ok, true);
  assert.equal(M.checkAnswer("3/2", { answerType: "number", answer: 1.5 }).ok, true);
  assert.equal(M.checkAnswer("8", { answerType: "number", answer: 7 }).ok, false);
  const badFmt = M.checkAnswer("hello", { answerType: "number", answer: 7 });
  assert.equal(badFmt.ok, false);
  assert.equal(badFmt.formatError, true);
});

test("checkAnswer validates significant figures", () => {
  assert.equal(M.checkAnswer("0.0450", { answerType: "sigfig", answer: 0.045, sigFigs: 3 }).ok, true);
  const wrongSf = M.checkAnswer("0.045", { answerType: "sigfig", answer: 0.045, sigFigs: 3 });
  assert.equal(wrongSf.ok, false);
  assert.ok(wrongSf.message.includes("significant figures"));
  assert.equal(M.checkAnswer("1200", { answerType: "sigfig", answer: 1200, sigFigs: 3 }).ok, true);
});

test("checkAnswer validates fractions and mixed numbers", () => {
  assert.equal(M.checkAnswer("3/4", { answerType: "fraction", answer: "3/4" }).ok, true);
  assert.equal(M.checkAnswer("1 3/4", { answerType: "fraction", answer: "7/4" }).ok, true);
  assert.equal(M.checkAnswer("-1 1/2", { answerType: "fraction", answer: "-3/2" }).ok, true);
  const unsimp = M.checkAnswer("6/8", { answerType: "fraction", answer: "3/4", requireSimplified: true });
  assert.equal(unsimp.ok, false);
  assert.ok(unsimp.message.includes("simplify"));
  assert.equal(M.checkAnswer("6/8", { answerType: "fraction", answer: "3/4", requireSimplified: false }).ok, true);
});

test("checkAnswer validates expressions and structural forms", () => {
  // Expanded
  assert.equal(M.checkAnswer("6x - 5", { answerType: "expression", answer: "6x - 5", requireExpanded: true }).ok, true);
  assert.equal(M.checkAnswer("-5 + 6x", { answerType: "expression", answer: "6x - 5", requireExpanded: true }).ok, true);
  const notExp = M.checkAnswer("2(3x - 2) - 1", { answerType: "expression", answer: "6x - 5", requireExpanded: true });
  assert.equal(notExp.ok, false);
  assert.ok(notExp.message.includes("expand"));

  // Factorised
  assert.equal(M.checkAnswer("(x + 3)(x + 2)", { answerType: "expression", answer: "(x+2)(x+3)", requireFactorised: true }).ok, true);
  assert.equal(M.checkAnswer("(x + 3)^2", { answerType: "expression", answer: "(x+3)(x+3)", requireFactorised: true }).ok, true);
  const notFac = M.checkAnswer("x^2 + 5x + 6", { answerType: "expression", answer: "(x+2)(x+3)", requireFactorised: true });
  assert.equal(notFac.ok, false);
  assert.ok(notFac.message.includes("factorised"));

  // Completed square
  assert.equal(M.checkAnswer("(x + 3)² - 4", { answerType: "expression", answer: "(x+3)^2 - 4", requireCompletedSquare: true }).ok, true);
  assert.equal(M.checkAnswer("-4 + (x + 3)^2", { answerType: "expression", answer: "(x+3)^2 - 4", requireCompletedSquare: true }).ok, true);
  const notSq = M.checkAnswer("x^2 + 6x + 5", { answerType: "expression", answer: "(x+3)^2 - 4", requireCompletedSquare: true });
  assert.equal(notSq.ok, false);
  assert.ok(notSq.message.includes("completed square"));

  // Simplified surds & rational denominator
  assert.equal(M.checkAnswer("2√3", { answerType: "expression", answer: "2*sqrt(3)", requireSimplifiedSurd: true }).ok, true);
  const unsimpSurd = M.checkAnswer("√12", { answerType: "expression", answer: "2*sqrt(3)", requireSimplifiedSurd: true });
  assert.equal(unsimpSurd.ok, false);
  assert.equal(M.checkAnswer("√2/2", { answerType: "expression", answer: "sqrt(2)/2", requireRationalDenominator: true }).ok, true);
  const unrat = M.checkAnswer("1/√2", { answerType: "expression", answer: "sqrt(2)/2", requireRationalDenominator: true });
  assert.equal(unrat.ok, false);
});

test("checkAnswer validates equations and subject transposition", () => {
  assert.equal(M.checkAnswer("y = 3 + 2x", { answerType: "equation", answer: "y = 2x + 3" }).ok, true);
  assert.equal(M.checkAnswer("2x - y + 3 = 0", { answerType: "equation", answer: "y = 2x + 3" }).ok, true);
  assert.equal(M.checkAnswer("y = 2x + 4", { answerType: "equation", answer: "y = 2x + 3" }).ok, false);

  const subjSpec = { answerType: "equation", answer: "t = (v - u)/a", requireSubject: "t" };
  assert.equal(M.checkAnswer("t = (v - u)/a", subjSpec).ok, true);
  assert.equal(M.checkAnswer("(v - u)/a = t", subjSpec).ok, true);
  assert.equal(M.checkAnswer("v = u + at", subjSpec).ok, false);
});

test("checkAnswer validates roots, coords, vectors, inequalities and multi-fields", () => {
  assert.equal(M.checkAnswer("5, -2", { answerType: "roots", answer: [-2, 5] }).ok, true);
  assert.equal(M.checkAnswer("x = -2 and x = 5", { answerType: "roots", answer: [-2, 5] }).ok, true);
  assert.equal(M.checkAnswer("5", { answerType: "roots", answer: [-2, 5] }).ok, false);

  assert.equal(M.checkAnswer("(2, -3)", { answerType: "coords", answer: [2, -3] }).ok, true);
  assert.equal(M.checkAnswer("1, 0, -4", { answerType: "coords", answer: [1, 0, -4] }).ok, true);
  assert.equal(M.checkAnswer("[3, -2]", { answerType: "vector", answer: [3, -2] }).ok, true);

  assert.equal(M.checkAnswer("x > 3", { answerType: "inequality", answer: "x > 3" }).ok, true);
  assert.equal(M.checkAnswer("3 < x", { answerType: "inequality", answer: "x > 3" }).ok, true);
  assert.equal(M.checkAnswer("x < 3", { answerType: "inequality", answer: "x > 3" }).ok, false);

  const fRes = M.checkFields(["2", "-1"], [
    { answerType: "number", answer: 2 },
    { answerType: "number", answer: -1 },
  ]);
  assert.equal(fRes.ok, true);
});

test("checkPlot validates lines, point targets and curves", () => {
  assert.equal(M.checkPlot([{ x: 0, y: 1 }, { x: 2, y: 5 }], { plotType: "line", m: 2, c: 1 }).ok, true);
  assert.equal(M.checkPlot([{ x: 0, y: 1 }, { x: 2, y: 4 }], { plotType: "line", m: 2, c: 1 }).ok, false);
  const tooFew = M.checkPlot([{ x: 0, y: 1 }], { plotType: "line", m: 2, c: 1 });
  assert.equal(tooFew.ok, false);
  assert.equal(tooFew.formatError, true);

  assert.equal(M.checkPlot([{ x: 1, y: 2 }, { x: -2, y: 3 }], { plotType: "points", targets: [{ x: -2, y: 3 }, { x: 1, y: 2 }] }).ok, true);

  const quadSpec = { plotType: "curve", fn: x => x * x - 4, minPoints: 3, requiredPoints: [{ x: 0, y: -4 }] };
  assert.equal(M.checkPlot([{ x: -2, y: 0 }, { x: 0, y: -4 }, { x: 2, y: 0 }], quadSpec).ok, true);
  assert.equal(M.checkPlot([{ x: -2, y: 0 }, { x: 1, y: -3 }, { x: 2, y: 0 }], quadSpec).ok, false);
});

test("VISUALS safely formats maths HTML, converts to LaTeX, and renders SVG diagrams", () => {
  assert.equal(V.toLatex("(-4) * (-2) = 8"), "(-4) \\times (-2) = 8");
  assert.equal(V.toLatex("(-12) / 3 = -4"), "(-12) \\div 3 = -4");
  assert.equal(V.toLatex("sqrt(x^-2 + 1)"), "\\sqrt{x^{-2} + 1}");
  assert.equal(V.toLatex("\\frac{v - u}{a}"), "\\frac{v - u}{a}");

  const html = V.formatMathHtml("Solve `2(2^2) - 1` <script>evil()</script>");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("<sup>2</sup>"));
  assert.ok(html.includes("&minus;"));

  const gSvg = V.renderVisualSvg({ type: "graph", xMin: -5, xMax: 5, yMin: -5, yMax: 5, curves: [{ fn: x => x * x - 2 }] });
  assert.ok(gSvg.startsWith("<svg") && gSvg.includes("<path"));

  const tSvg = V.renderVisualSvg({ type: "triangle", adj: "4 cm", opp: "3 cm", angle: "x°" });
  assert.ok(tSvg.startsWith("<svg") && tSvg.includes("4 cm"));

  const sSvg = V.renderVisualSvg({ type: "sector", angleDeg: 120, angleLabel: "120°", radiusLabel: "6 cm" });
  assert.ok(sSvg.startsWith("<svg") && sSvg.includes("120°"));
});

test("named maths value-type generators obey valid ranges across 1,000 runs", () => {
  const rng = seeded(99);
  for (let i = 0; i < 1000; i++) {
    const d = M.randDecimal(rng, 1.5, 4.75, 2);
    assert.ok(d >= 1.5 && d <= 4.75);
    assert.equal(M.roundToDp(d, 2), d);

    const money = M.randMoney(rng, 5, 50);
    assert.ok(money >= 5 && money <= 50);
    assert.match(M.formatMoney(money), /^£\d+\.\d{2}$/);

    const pct = M.randPercentage(rng, 5, 35);
    assert.ok(Number.isInteger(pct) && pct >= 5 && pct <= 35);

    const ang = M.randAngle(rng, 10, 350);
    assert.ok(Number.isInteger(ang) && ang >= 10 && ang <= 350);

    const [a, b, c] = M.randTriangleAngles(rng, 20);
    assert.ok(a >= 20 && b >= 20 && c >= 20);
    assert.equal(a + b + c, 180);

    const frac = M.randProperFraction(rng, 2, 12);
    assert.ok(frac.num >= 1 && frac.num < frac.den && frac.den <= 12);
    assert.equal(M.gcd(frac.num, frac.den), 1);
  }
});
