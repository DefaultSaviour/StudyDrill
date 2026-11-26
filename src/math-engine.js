// Pure maths engine: deterministic RNG helpers, safe expression parser/evaluator,
// algebraic form validators, answer checker, and graph plot checker.
// Zero dependencies — works both in browsers (<script>) and in Node (require).
const MATH_ENGINE = (function () {
  "use strict";

  const KNOWN_FUNCS = new Set(["sqrt", "cbrt", "sin", "cos", "tan", "abs"]);
  const KNOWN_FUNCS_BY_LEN = ["sqrt", "cbrt", "sin", "cos", "tan", "abs"];
  const MAX_AST_DEPTH = 64;

  // ── RNG & numeric helpers ──

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function randNonZero(rng, min, max) {
    if (min === 0 && max === 0) throw new Error("randNonZero range cannot be [0, 0]");
    if (min > 0 || max < 0) return randInt(rng, min, max);
    const totalNonZero = max - min; // excludes 0
    const v = min + Math.floor(rng() * totalNonZero);
    return v >= 0 ? v + 1 : v;
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function randDecimal(rng, min, max, dp) {
    const places = dp === undefined ? 2 : dp;
    if (!Number.isInteger(places) || places < 0) throw new Error("dp must be a non-negative integer");
    if (min > max) throw new Error("randDecimal min cannot exceed max");
    const scale = Math.pow(10, places);
    const lo = Math.ceil(min * scale - 1e-9);
    const hi = Math.floor(max * scale + 1e-9);
    if (lo > hi) throw new Error("No decimal with " + places + " d.p. inside [" + min + ", " + max + "]");
    return roundToDp(randInt(rng, lo, hi) / scale, places);
  }

  function randMoney(rng, min, max) {
    const lo = min === undefined ? 1 : min;
    const hi = max === undefined ? 200 : max;
    return randDecimal(rng, lo, hi, 2);
  }

  function formatMoney(val) {
    const n = Number(val);
    return (n < 0 ? "-£" : "£") + Math.abs(n).toFixed(2);
  }

  function randPercentage(rng, min, max) {
    const lo = min === undefined ? 1 : min;
    const hi = max === undefined ? 99 : max;
    if (lo < 0 || hi > 100 || lo > hi) throw new Error("randPercentage range must lie inside [0, 100]");
    return randInt(rng, lo, hi);
  }

  function randAngle(rng, min, max) {
    const lo = min === undefined ? 1 : min;
    const hi = max === undefined ? 359 : max;
    if (lo < 0 || hi > 360 || lo > hi) throw new Error("randAngle range must lie inside [0, 360]");
    return randInt(rng, lo, hi);
  }

  function randTriangleAngles(rng, minAngle) {
    const m = minAngle === undefined ? 15 : minAngle;
    if (!Number.isInteger(m) || m < 1 || m * 3 > 180) {
      throw new Error("randTriangleAngles minAngle must be an integer between 1 and 60");
    }
    const a = randInt(rng, m, 180 - 2 * m);
    const b = randInt(rng, m, 180 - m - a);
    const c = 180 - a - b;
    return [a, b, c];
  }

  function randProperFraction(rng, minDen, maxDen) {
    const loD = minDen === undefined ? 2 : minDen;
    const hiD = maxDen === undefined ? 12 : maxDen;
    if (loD < 2 || loD > hiD) throw new Error("randProperFraction requires 2 <= minDen <= maxDen");
    const den = randInt(rng, loD, hiD);
    const num = randInt(rng, 1, den - 1);
    return simplifyFraction(num, den);
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x;
  }

  function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(Math.round(a) * Math.round(b)) / gcd(a, b);
  }

  function simplifyFraction(num, den) {
    if (den === 0) throw new Error("Denominator cannot be zero");
    if (num === 0) return { num: 0, den: 1 };
    let n = Math.round(num);
    let d = Math.round(den);
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return { num: n / g, den: d / g };
  }

  function roundToDp(val, dp) {
    const factor = Math.pow(10, dp);
    const sign = val < 0 ? -1 : 1;
    const res = (sign * Math.round((Math.abs(val) + 1e-12) * factor)) / factor;
    return res === 0 ? 0 : res;
  }

  function roundToSigFigs(val, sf) {
    if (val === 0) return 0;
    const res = Number(val.toPrecision(sf));
    return res === 0 ? 0 : res;
  }

  // Returns { min, max } significant figures for a numeric string.
  // Trailing zeros in a whole number without a decimal point (e.g. "1200")
  // can represent 2, 3 or 4 significant figures.
  function sigFigRange(str) {
    let s = String(str).trim().replace(/^[+-]/, "");
    const eIdx = s.search(/[eE]/);
    if (eIdx !== -1) s = s.slice(0, eIdx);
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(s)) return null;

    if (s.includes(".")) {
      const digits = s.replace(".", "");
      const firstNonZero = digits.search(/[1-9]/);
      if (firstNonZero === -1) return { min: 1, max: 1 };
      const count = digits.length - firstNonZero;
      return { min: count, max: count };
    }

    const trimmedLeading = s.replace(/^0+/, "");
    if (!trimmedLeading) return { min: 1, max: 1 };
    const trimmedTrailing = trimmedLeading.replace(/0+$/, "");
    return { min: trimmedTrailing.length, max: trimmedLeading.length };
  }

  function countSigFigs(str) {
    const r = sigFigRange(str);
    return r ? r.min : 0;
  }

  // ── Formatting helpers ──

  function formatSignTerm(coeff, variable, isFirst) {
    if (coeff === 0) return "";
    const abs = Math.abs(coeff);
    const sign = isFirst ? (coeff < 0 ? "-" : "") : (coeff < 0 ? " - " : " + ");
    if (!variable) return sign + String(abs);
    return sign + (abs === 1 ? "" : String(abs)) + variable;
  }

  // Formats a polynomial from either:
  //   - descending coefficients array, e.g. [2, -3, 5] -> "2x^2 - 3x + 5"
  //   - or array of { coeff, power } objects
  function formatPoly(terms, variable) {
    const v = variable || "x";
    let list;
    if (Array.isArray(terms) && terms.length > 0 && typeof terms[0] === "number") {
      const deg = terms.length - 1;
      list = terms.map((c, i) => ({ coeff: c, power: deg - i }));
    } else {
      list = (terms || []).map(t => ({ coeff: t.coeff, power: t.power }));
    }

    let out = "";
    for (const item of list) {
      if (!item.coeff) continue;
      const termVar = item.power === 0 ? "" : (item.power === 1 ? v : v + "^" + item.power);
      out += formatSignTerm(item.coeff, termVar, out === "");
    }
    return out || "0";
  }

  function formatFrac(num, den) {
    const f = simplifyFraction(num, den);
    return f.den === 1 ? String(f.num) : f.num + "/" + f.den;
  }

  function formatLinear(m, c, lhs) {
    const left = lhs === undefined ? "y" : lhs;
    const prefix = left ? left + " = " : "";

    let mStr = "";
    if (typeof m === "object" && m !== null) {
      const f = simplifyFraction(m.num, m.den);
      if (f.num !== 0) {
        if (f.den === 1) {
          mStr = formatSignTerm(f.num, "x", true);
        } else {
          const sign = f.num < 0 ? "-" : "";
          mStr = sign + "(" + Math.abs(f.num) + "/" + f.den + ")x";
        }
      }
    } else if (m !== 0) {
      mStr = formatSignTerm(m, "x", true);
    }

    let rhs = mStr;
    if (c !== 0 || rhs === "") {
      rhs += formatSignTerm(c, "", rhs === "");
    }
    return prefix + (rhs || "0");
  }

  // ── Safe expression parser & evaluator (recursive descent, no eval) ──

  function normaliseMathInput(raw) {
    let s = String(raw == null ? "" : raw).trim();
    s = s
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/[\u00D7\u00B7]/g, "*")
      .replace(/\u00F7/g, "/")
      .replace(/\u00B2/g, "^2")
      .replace(/\u00B3/g, "^3")
      .replace(/\u03C0/g, "pi")
      .replace(/\u2265/g, ">=")
      .replace(/\u2264/g, "<=")
      .replace(/\u221A/g, "sqrt")
      .replace(/\u221B/g, "cbrt")
      .replace(/°/g, "");
    // Allow shorthand √3 or √x without parentheses (even after a coefficient like 2√3)
    s = s.replace(/(^|[^a-zA-Z])(sqrt|cbrt)\s*(\d+(?:\.\d+)?|[a-zA-Z])(?![a-zA-Z0-9_(])/g, "$1$2($3)");
    return s;
  }

  function tokenise(raw) {
    const s = normaliseMathInput(raw);
    const tokens = [];
    let i = 0;

    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Number (decimal or integer, optional scientific exponent)
      if (/\d/.test(ch) || (ch === "." && i + 1 < s.length && /\d/.test(s[i + 1]))) {
        const rest = s.slice(i);
        const m = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
        if (!m) throw new Error("Invalid number near: " + rest.slice(0, 8));
        tokens.push({ type: "num", value: Number(m[0]), raw: m[0] });
        i += m[0].length;
        continue;
      }

      // Letters: match known multi-letter functions / "pi", otherwise split into single-letter variables
      if (/[a-zA-Z]/.test(ch)) {
        const restLower = s.slice(i).toLowerCase();
        let matchedFunc = null;
        for (const fn of KNOWN_FUNCS_BY_LEN) {
          if (restLower.startsWith(fn)) {
            matchedFunc = fn;
            break;
          }
        }
        if (matchedFunc) {
          tokens.push({ type: "func", value: matchedFunc });
          i += matchedFunc.length;
          continue;
        }
        if (restLower.startsWith("pi")) {
          tokens.push({ type: "const", value: "pi" });
          i += 2;
          continue;
        }
        tokens.push({ type: "var", value: ch });
        i++;
        continue;
      }

      if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
        tokens.push({ type: "op", value: ch });
        i++;
        continue;
      }
      if (ch === "(") {
        tokens.push({ type: "lparen", value: "(" });
        i++;
        continue;
      }
      if (ch === ")") {
        tokens.push({ type: "rparen", value: ")" });
        i++;
        continue;
      }

      throw new Error("Unexpected character: " + ch);
    }

    // Insert implicit multiplication (e.g. 2x, 2(x+1), (x+1)(x-2), 2sqrt(3), xy)
    const out = [];
    const isValueEnd = t => t.type === "num" || t.type === "var" || t.type === "const" || t.type === "rparen";
    const isValueStart = t => t.type === "var" || t.type === "const" || t.type === "func" || t.type === "lparen";
    for (let k = 0; k < tokens.length; k++) {
      const curr = tokens[k];
      if (out.length > 0) {
        const prev = out[out.length - 1];
        if (isValueEnd(prev) && (isValueStart(curr) || (prev.type === "rparen" && curr.type === "num"))) {
          out.push({ type: "op", value: "*" });
        }
      }
      out.push(curr);
    }
    return out;
  }

  function parseExpression(raw) {
    const tokens = tokenise(raw);
    if (tokens.length === 0) throw new Error("Empty expression");
    let pos = 0;

    function peek() {
      return tokens[pos];
    }

    function consume() {
      return tokens[pos++];
    }

    function parseAddSub(depth) {
      if (depth > MAX_AST_DEPTH) throw new Error("Expression too deeply nested");
      let node = parseMulDiv(depth + 1);
      while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
        const op = consume().value;
        const right = parseMulDiv(depth + 1);
        node = { type: "bin", op, left: node, right };
      }
      return node;
    }

    function parseMulDiv(depth) {
      let node = parseUnary(depth + 1);
      while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
        const op = consume().value;
        const right = parseUnary(depth + 1);
        node = { type: "bin", op, left: node, right };
      }
      return node;
    }

    // Unary sits ABOVE power on the left (-x^2 = -(x^2)) and BELOW power on the right (x^-2)
    function parseUnary(depth) {
      if (depth > MAX_AST_DEPTH) throw new Error("Expression too deeply nested");
      if (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
        const op = consume().value;
        const arg = parseUnary(depth + 1);
        return op === "+" ? arg : { type: "unary", op: "-", arg };
      }
      return parsePower(depth + 1);
    }

    function parsePower(depth) {
      let node = parsePrimary(depth + 1);
      if (peek() && peek().type === "op" && peek().value === "^") {
        consume();
        const right = parseUnary(depth + 1);
        node = { type: "bin", op: "^", left: node, right };
      }
      return node;
    }

    function parsePrimary(depth) {
      const t = peek();
      if (!t) throw new Error("Unexpected end of expression");

      if (t.type === "num") {
        consume();
        return { type: "num", value: t.value };
      }
      if (t.type === "const") {
        consume();
        return { type: "const", name: t.value };
      }
      if (t.type === "var") {
        consume();
        return { type: "var", name: t.value };
      }
      if (t.type === "func") {
        consume();
        const next = peek();
        if (!next || next.type !== "lparen") {
          throw new Error("Expected '(' after function " + t.value);
        }
        consume();
        const arg = parseAddSub(depth + 1);
        const close = peek();
        if (!close || close.type !== "rparen") {
          throw new Error("Missing ')' after " + t.value + "(");
        }
        consume();
        return { type: "call", name: t.value, arg };
      }
      if (t.type === "lparen") {
        consume();
        const expr = parseAddSub(depth + 1);
        const close = peek();
        if (!close || close.type !== "rparen") {
          throw new Error("Missing closing ')'");
        }
        consume();
        return expr;
      }

      throw new Error("Unexpected token: " + (t.value || t.type));
    }

    const ast = parseAddSub(0);
    if (pos < tokens.length) {
      throw new Error("Unexpected trailing token: " + tokens[pos].value);
    }
    return ast;
  }

  function extractVars(ast, out) {
    const set = out || new Set();
    if (!ast) return set;
    if (ast.type === "var") set.add(ast.name);
    else if (ast.type === "unary" || ast.type === "call") extractVars(ast.arg, set);
    else if (ast.type === "bin") {
      extractVars(ast.left, set);
      extractVars(ast.right, set);
    }
    return set;
  }

  function evalAst(ast, env) {
    switch (ast.type) {
      case "num": return ast.value;
      case "const": return ast.name === "pi" ? Math.PI : NaN;
      case "var": {
        if (!env || !Object.prototype.hasOwnProperty.call(env, ast.name)) {
          throw new Error("Missing variable: " + ast.name);
        }
        return env[ast.name];
      }
      case "unary": return -evalAst(ast.arg, env);
      case "bin": {
        const a = evalAst(ast.left, env);
        const b = evalAst(ast.right, env);
        switch (ast.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b === 0 ? NaN : a / b;
          case "^": return Math.pow(a, b);
          default: return NaN;
        }
      }
      case "call": {
        const v = evalAst(ast.arg, env);
        switch (ast.name) {
          case "sqrt": return Math.sqrt(v);
          case "cbrt": return Math.cbrt(v);
          case "abs": return Math.abs(v);
          case "sin": return Math.sin((v * Math.PI) / 180);
          case "cos": return Math.cos((v * Math.PI) / 180);
          case "tan": return Math.tan((v * Math.PI) / 180);
          default: return NaN;
        }
      }
      default: return NaN;
    }
  }

  function remapVars(ast, varMap) {
    if (!ast) return ast;
    if (ast.type === "var") {
      return { type: "var", name: varMap[ast.name] || ast.name };
    }
    if (ast.type === "unary" || ast.type === "call") {
      return { ...ast, arg: remapVars(ast.arg, varMap) };
    }
    if (ast.type === "bin") {
      return { ...ast, left: remapVars(ast.left, varMap), right: remapVars(ast.right, varMap) };
    }
    return ast;
  }

  // Build case-insensitive variable mapping against targetVars when safe
  function buildVarMap(sourceVars, targetVars) {
    const lowerMap = new Map();
    let hasCaseCollision = false;
    for (const tv of targetVars) {
      const low = tv.toLowerCase();
      if (lowerMap.has(low) && lowerMap.get(low) !== tv) hasCaseCollision = true;
      lowerMap.set(low, tv);
    }
    const map = {};
    for (const sv of sourceVars) {
      if (targetVars.has(sv)) {
        map[sv] = sv;
      } else if (!hasCaseCollision && lowerMap.has(sv.toLowerCase())) {
        map[sv] = lowerMap.get(sv.toLowerCase());
      } else {
        return null; // unexpected variable
      }
    }
    return map;
  }

  const TEST_SEED_BASES = [1.37, 2.71, 3.19, 4.63, 5.47, 7.13, -1.73, -3.11];

  function buildTestEnvs(varNames) {
    const list = Array.from(varNames).sort();
    return TEST_SEED_BASES.map((base, rowIdx) => {
      const env = {};
      for (let i = 0; i < list.length; i++) {
        // Offset per variable index so distinct variables never get equal values
        const shift = (i + 1) * 0.41 * (base >= 0 ? 1 : -1) + (rowIdx % 3) * 0.07 * i;
        env[list[i]] = base + shift;
      }
      return env;
    });
  }

  function astsEquivalent(astA, astB, tolerance) {
    const tol = tolerance ?? 1e-6;
    const varsA = extractVars(astA);
    const varsB = extractVars(astB);
    const varMap = buildVarMap(varsA, varsB);
    if (!varMap) return false;
    const mappedA = remapVars(astA, varMap);
    const envs = buildTestEnvs(varsB);

    let valid = 0;
    for (const env of envs) {
      const va = evalAst(mappedA, env);
      const vb = evalAst(astB, env);
      if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
      valid++;
      const limit = tol * Math.max(1, Math.abs(vb));
      if (Math.abs(va - vb) > limit) return false;
    }
    return valid >= 3;
  }

  function expressionsEquivalent(exprA, exprB, opts) {
    let astA, astB;
    try {
      astA = parseExpression(exprA);
      astB = parseExpression(exprB);
    } catch (e) {
      return false;
    }
    return astsEquivalent(astA, astB, opts && opts.tolerance);
  }

  // ── Structural form validators on AST ──

  function containsAddSub(node) {
    if (!node) return false;
    if (node.type === "bin" && (node.op === "+" || node.op === "-")) return true;
    if (node.type === "unary" || node.type === "call") return containsAddSub(node.arg);
    if (node.type === "bin") return containsAddSub(node.left) || containsAddSub(node.right);
    return false;
  }

  function isExpanded(ast) {
    if (!ast) return false;
    if (ast.type === "unary") {
      if (ast.op === "-" && ast.arg.type === "bin" && (ast.arg.op === "+" || ast.arg.op === "-")) {
        return false;
      }
      return isExpanded(ast.arg);
    }
    if (ast.type === "bin") {
      if (ast.op === "*" && (containsAddSub(ast.left) || containsAddSub(ast.right))) {
        return false;
      }
      if (ast.op === "^" && containsAddSub(ast.left)) {
        return false;
      }
      return isExpanded(ast.left) && isExpanded(ast.right);
    }
    if (ast.type === "call") return isExpanded(ast.arg);
    return true;
  }

  function isFactorised(ast) {
    let node = ast;
    while (node && node.type === "unary") node = node.arg;
    if (!node) return false;

    if (node.type === "bin" && node.op === "^") {
      if (extractVars(node.left).size === 0) return false;
      try {
        const expVal = evalAst(node.right, {});
        return Number.isFinite(expVal) && expVal >= 2 && containsAddSub(node.left);
      } catch (e) {
        return false;
      }
    }

    if (node.type === "bin" && node.op === "*") {
      // Collect multiplicative factors
      const factors = [];
      const collect = n => {
        let cur = n;
        while (cur && cur.type === "unary") cur = cur.arg;
        if (cur && cur.type === "bin" && cur.op === "*") {
          collect(cur.left);
          collect(cur.right);
        } else if (cur) {
          factors.push(cur);
        }
      };
      collect(node);
      const hasCompositeFactor = factors.some(f => containsAddSub(f));
      const varFactors = factors.filter(f => extractVars(f).size > 0);
      return hasCompositeFactor || varFactors.length >= 2;
    }

    return false;
  }

  // Matches k * (x + p)^2 or (x + p)^2 / k where (x + p) is linear in 1 variable
  function isSquareTerm(node) {
    let cur = node;
    while (cur && cur.type === "unary") cur = cur.arg;
    if (!cur) return false;

    while (cur.type === "bin" && (cur.op === "*" || cur.op === "/")) {
      if (cur.op === "*") {
        const leftHasVar = extractVars(cur.left).size > 0;
        const rightHasVar = extractVars(cur.right).size > 0;
        if (leftHasVar && !rightHasVar) cur = cur.left;
        else if (rightHasVar && !leftHasVar) cur = cur.right;
        else return false;
      } else {
        if (extractVars(cur.right).size > 0) return false;
        cur = cur.left;
      }
      while (cur && cur.type === "unary") cur = cur.arg;
    }

    if (cur.type !== "bin" || cur.op !== "^") return false;
    let expVal;
    try {
      expVal = evalAst(cur.right, {});
    } catch (e) {
      return false;
    }
    if (Math.abs(expVal - 2) > 1e-9) return false;

    const baseVars = extractVars(cur.left);
    if (baseVars.size !== 1) return false;
    // Ensure base is linear (no ^ inside base)
    let hasPower = false;
    const checkBase = n => {
      if (!n) return;
      if (n.type === "bin" && n.op === "^") hasPower = true;
      if (n.type === "unary" || n.type === "call") checkBase(n.arg);
      if (n.type === "bin") { checkBase(n.left); checkBase(n.right); }
    };
    checkBase(cur.left);
    return !hasPower;
  }

  function isCompletedSquare(ast) {
    if (!ast) return false;
    if (isSquareTerm(ast)) return true;
    if (ast.type === "bin" && (ast.op === "+" || ast.op === "-")) {
      const leftPureNum = extractVars(ast.left).size === 0;
      const rightPureNum = extractVars(ast.right).size === 0;
      if (rightPureNum && isSquareTerm(ast.left)) return true;
      if (leftPureNum && ast.op === "+" && isSquareTerm(ast.right)) return true;
    }
    return false;
  }

  function containsSqrt(ast) {
    if (!ast) return false;
    if (ast.type === "call" && ast.name === "sqrt") return true;
    if (ast.type === "unary" || ast.type === "call") return containsSqrt(ast.arg);
    if (ast.type === "bin") return containsSqrt(ast.left) || containsSqrt(ast.right);
    return false;
  }

  function checkSurdForm(ast, requireRationalDenominator) {
    let error = null;
    function walk(node, inDenominator) {
      if (!node || error) return;
      if (node.type === "call" && node.name === "sqrt") {
        if (inDenominator && requireRationalDenominator) {
          error = "Rationalise the denominator so there is no surd on the bottom.";
          return;
        }
        if (extractVars(node.arg).size === 0) {
          try {
            const val = evalAst(node.arg, {});
            if (Number.isInteger(val) && val > 1) {
              for (let k = 2; k * k <= val; k++) {
                if (val % (k * k) === 0) {
                  error = "Simplify the surd further (extract square factors).";
                  return;
                }
              }
            }
          } catch (e) { /* ignore */ }
        }
        walk(node.arg, inDenominator);
        return;
      }
      if (node.type === "bin" && node.op === "/") {
        walk(node.left, inDenominator);
        if (containsSqrt(node.right) && requireRationalDenominator) {
          error = "Rationalise the denominator so there is no surd on the bottom.";
          return;
        }
        walk(node.right, true);
        return;
      }
      if (node.type === "unary" || node.type === "call") walk(node.arg, inDenominator);
      else if (node.type === "bin") {
        walk(node.left, inDenominator);
        walk(node.right, inDenominator);
      }
    }
    walk(ast, false);
    return error ? { ok: false, message: error } : { ok: true };
  }

  // ── Answer parsing & checking ──

  function stripUnits(raw) {
    return String(raw)
      .trim()
      .replace(/^[£$]/, "")
      .replace(/(?:cm\^?3|cm\^?2|mm\^?3|mm\^?2|m\^?3|m\^?2|km|cm|mm|m\/s|ms\^-1|kg|g|m|s|deg|°|%)$/i, "")
      .trim();
  }

  function evalConstant(raw) {
    const ast = parseExpression(raw);
    if (extractVars(ast).size > 0) throw new Error("Expected a number, not an algebraic variable");
    const val = evalAst(ast, {});
    if (!Number.isFinite(val)) throw new Error("Expression did not evaluate to a finite number");
    return val;
  }

  function parseFractionValue(raw) {
    const s = normaliseMathInput(raw).replace(/\s+/g, " ").trim();
    // Mixed number: e.g. "1 3/4" or "-2 1/3"
    const mixed = /^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
    if (mixed) {
      const whole = Number(mixed[1]);
      const num = Number(mixed[2]);
      const den = Number(mixed[3]);
      if (den === 0) throw new Error("Denominator cannot be zero");
      const sign = whole < 0 || mixed[1].startsWith("-") ? -1 : 1;
      return { num: sign * (Math.abs(whole) * den + num), den };
    }
    // Simple fraction: e.g. "-3/4"
    const frac = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(s);
    if (frac) {
      const num = Number(frac[1]);
      const den = Number(frac[2]);
      if (den === 0) throw new Error("Denominator cannot be zero");
      return den < 0 ? { num: -num, den: -den } : { num, den };
    }
    // Whole integer
    if (/^[+-]?\d+$/.test(s)) {
      return { num: Number(s), den: 1 };
    }
    throw new Error("Expected a fraction such as 3/4 or 1 3/4");
  }

  function parseInequality(raw) {
    const s = normaliseMathInput(raw);
    const m = /^(.+?)(<=|>=|<|>)(.+)$/.exec(s);
    if (!m) throw new Error("Expected an inequality using <, >, <= or >=");
    const left = m[1].trim();
    const op = m[2];
    const right = m[3].trim();
    const astL = parseExpression(left);
    const astR = parseExpression(right);
    const varsL = extractVars(astL);
    const varsR = extractVars(astR);

    const flip = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
    if (astL.type === "var" && varsR.size === 0) {
      return { varName: astL.name, op, val: evalAst(astR, {}) };
    }
    if (astR.type === "var" && varsL.size === 0) {
      return { varName: astR.name, op: flip[op], val: evalAst(astL, {}) };
    }
    throw new Error("Write the inequality with one variable on one side and a number on the other");
  }

  function parseTuple(raw, allowSpaceSplit) {
    let s = normaliseMathInput(raw).trim();
    if ((s.startsWith("(") && s.endsWith(")")) || (s.startsWith("[") && s.endsWith("]"))) {
      s = s.slice(1, -1).trim();
    }
    const parts = s.includes(",") ? s.split(",") : (allowSpaceSplit ? s.split(/\s+/) : [s]);
    return parts.map(p => evalConstant(p.trim()));
  }

  function checkEquation(raw, spec) {
    let userStr = normaliseMathInput(raw);
    if (!userStr.includes("=") && spec.allowRhsOnly && spec.requireSubject) {
      userStr = spec.requireSubject + " = " + userStr;
    }
    const uParts = userStr.split("=");
    const eParts = normaliseMathInput(spec.answer).split("=");
    if (uParts.length !== 2 || !uParts[0].trim() || !uParts[1].trim()) {
      return { ok: false, formatError: true, message: "Write an equation with an '=' sign (for example, y = 2x + 3)." };
    }
    if (eParts.length !== 2) throw new Error("Invalid expected equation in question spec");

    let uL, uR, eL, eR;
    try {
      uL = parseExpression(uParts[0]);
      uR = parseExpression(uParts[1]);
      eL = parseExpression(eParts[0]);
      eR = parseExpression(eParts[1]);
    } catch (e) {
      return { ok: false, formatError: true, message: "Check your maths syntax: " + e.message };
    }

    if (spec.requireSubject) {
      const subj = spec.requireSubject;
      const eLeftIsSubj = eL.type === "var" && eL.name.toLowerCase() === subj.toLowerCase();
      const expectedRhsAst = eLeftIsSubj ? eR : eL;
      const expectedSubj = eLeftIsSubj ? eL.name : eR.name;

      let userOtherAst = null;
      if (uL.type === "var" && uL.name.toLowerCase() === expectedSubj.toLowerCase()) {
        userOtherAst = uR;
      } else if (uR.type === "var" && uR.name.toLowerCase() === expectedSubj.toLowerCase()) {
        userOtherAst = uL;
      }

      if (!userOtherAst) {
        return { ok: false, message: "Make " + subj + " the subject (for example, " + subj + " = ...)." };
      }
      const otherVars = extractVars(userOtherAst);
      for (const v of otherVars) {
        if (v.toLowerCase() === expectedSubj.toLowerCase()) {
          return { ok: false, message: subj + " must appear only on one side of the formula." };
        }
      }
      const ok = astsEquivalent(userOtherAst, expectedRhsAst, spec.tolerance);
      return ok ? { ok: true } : { ok: false };
    }

    // General equation equivalence: (uL - uR) === k * (eL - eR) for some non-zero constant k
    const diffU = { type: "bin", op: "-", left: uL, right: uR };
    const diffE = { type: "bin", op: "-", left: eL, right: eR };
    const varsU = extractVars(diffU);
    const varsE = extractVars(diffE);
    const varMap = buildVarMap(varsU, varsE);
    if (!varMap) return { ok: false };
    const mappedU = remapVars(diffU, varMap);
    const envs = buildTestEnvs(varsE);
    const tol = spec.tolerance ?? 1e-6;

    let ratio = null;
    let valid = 0;
    for (const env of envs) {
      const vu = evalAst(mappedU, env);
      const ve = evalAst(diffE, env);
      if (!Number.isFinite(vu) || !Number.isFinite(ve)) continue;
      if (Math.abs(ve) <= 1e-9) {
        if (Math.abs(vu) > 1e-6) return { ok: false };
        continue;
      }
      const r = vu / ve;
      if (Math.abs(r) <= 1e-9) return { ok: false };
      if (ratio === null) ratio = r;
      else if (Math.abs(r - ratio) > tol * Math.max(1, Math.abs(ratio))) return { ok: false };
      valid++;
    }
    return { ok: valid >= 3 };
  }

  function checkAnswer(userInput, spec) {
    const raw = String(userInput == null ? "" : userInput).trim();
    if (!raw) return { ok: false, formatError: true, message: "Please enter an answer first." };

    const type = (spec && spec.answerType) || "number";
    const tol = spec && spec.tolerance !== undefined ? spec.tolerance : 1e-6;

    if (type === "exact") {
      const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, " ");
      const accepted = Array.isArray(spec.answer) ? spec.answer : [spec.answer];
      return { ok: accepted.some(a => norm(raw) === norm(a)) };
    }

    if (type === "number") {
      const cleaned = stripUnits(raw);
      let userVal, expVal;
      try {
        userVal = evalConstant(cleaned);
        expVal = typeof spec.answer === "number" ? spec.answer : evalConstant(String(spec.answer));
      } catch (e) {
        return { ok: false, formatError: true, message: "Enter a numeric answer (for example, 12, -3.5 or 3/2)." };
      }
      return { ok: Math.abs(userVal - expVal) <= tol * Math.max(1, Math.abs(expVal)) };
    }

    if (type === "sigfig") {
      const cleaned = stripUnits(raw);
      const range = sigFigRange(cleaned);
      if (!range) {
        return { ok: false, formatError: true, message: "Enter a plain number rounded to " + spec.sigFigs + " significant figures." };
      }
      const userVal = Number(cleaned);
      const expVal = typeof spec.answer === "number" ? spec.answer : Number(spec.answer);
      const valMatch = Math.abs(userVal - expVal) <= tol * Math.max(1, Math.abs(expVal));
      if (!valMatch) return { ok: false };
      if (spec.sigFigs < range.min || spec.sigFigs > range.max) {
        return { ok: false, message: "Right value, but check significant figures (" + spec.sigFigs + " s.f. needed)." };
      }
      return { ok: true };
    }

    if (type === "fraction") {
      let uFrac, eFrac;
      try {
        uFrac = parseFractionValue(raw);
      } catch (e) {
        return { ok: false, formatError: true, message: e.message };
      }
      eFrac = (typeof spec.answer === "object" && spec.answer !== null)
        ? simplifyFraction(spec.answer.num, spec.answer.den)
        : parseFractionValue(String(spec.answer));

      if (uFrac.num * eFrac.den !== eFrac.num * uFrac.den) return { ok: false };
      if (spec.requireSimplified !== false && gcd(uFrac.num, uFrac.den) !== 1) {
        return { ok: false, message: "Equivalent value, now simplify the fraction fully." };
      }
      return { ok: true };
    }

    if (type === "expression") {
      let astU, astE;
      try {
        astU = parseExpression(raw);
        astE = parseExpression(spec.answer);
      } catch (e) {
        return { ok: false, formatError: true, message: "Check your maths syntax: " + e.message };
      }
      if (!astsEquivalent(astU, astE, tol)) return { ok: false };
      if (spec.requireExpanded && !isExpanded(astU)) {
        return { ok: false, message: "Equivalent value, but expand and simplify all brackets." };
      }
      if (spec.requireFactorised && !isFactorised(astU)) {
        return { ok: false, message: "Equivalent value, but write it in factorised form." };
      }
      if (spec.requireCompletedSquare && !isCompletedSquare(astU)) {
        return { ok: false, message: "Equivalent value, but write it in completed square form (x + p)² + q." };
      }
      if (spec.requireSimplifiedSurd || spec.requireRationalDenominator) {
        const surdRes = checkSurdForm(astU, Boolean(spec.requireRationalDenominator));
        if (!surdRes.ok) return surdRes;
      }
      return { ok: true };
    }

    if (type === "equation") {
      return checkEquation(raw, spec);
    }

    if (type === "roots") {
      const rootTol = spec.tolerance !== undefined ? spec.tolerance : 1e-4;
      const cleaned = raw.replace(/^[\{\[]|[\}\]]$/g, "");
      const pieces = cleaned.split(/[,;]|\band\b/i).map(p => p.trim()).filter(Boolean);
      if (pieces.length === 0) return { ok: false, formatError: true, message: "Enter your solutions separated by a comma." };
      let uVals;
      try {
        uVals = pieces.map(p => {
          const stripped = p.replace(/^[a-zA-Z]\s*=\s*/, "").trim();
          return evalConstant(stripUnits(stripped));
        });
      } catch (e) {
        return { ok: false, formatError: true, message: "Enter numeric roots separated by a comma (for example, -2, 5)." };
      }
      const expRaw = Array.isArray(spec.answer) ? spec.answer : String(spec.answer).split(",");
      const eVals = expRaw.map(v => typeof v === "number" ? v : evalConstant(String(v)));
      if (uVals.length !== eVals.length) {
        return { ok: false, message: "Expected " + eVals.length + " root" + (eVals.length === 1 ? "" : "s") + "." };
      }
      uVals.sort((a, b) => a - b);
      eVals.sort((a, b) => a - b);
      const match = uVals.every((v, i) => Math.abs(v - eVals[i]) <= rootTol * Math.max(1, Math.abs(eVals[i])));
      return { ok: match };
    }

    if (type === "coords" || type === "vector") {
      let uParts, eParts;
      try {
        uParts = parseTuple(raw, type === "vector");
      } catch (e) {
        return { ok: false, formatError: true, message: "Enter numbers separated by a comma, e.g. (2, -3)." };
      }
      eParts = Array.isArray(spec.answer)
        ? spec.answer.map(Number)
        : parseTuple(String(spec.answer), type === "vector");
      if (uParts.length !== eParts.length) return { ok: false };
      const match = uParts.every((v, i) => Math.abs(v - eParts[i]) <= tol * Math.max(1, Math.abs(eParts[i])));
      return { ok: match };
    }

    if (type === "inequality") {
      let uIneq, eIneq;
      try {
        uIneq = parseInequality(raw);
      } catch (e) {
        return { ok: false, formatError: true, message: e.message };
      }
      eIneq = parseInequality(spec.answer);
      const ok = uIneq.varName.toLowerCase() === eIneq.varName.toLowerCase() &&
        uIneq.op === eIneq.op &&
        Math.abs(uIneq.val - eIneq.val) <= tol * Math.max(1, Math.abs(eIneq.val));
      return { ok };
    }

    throw new Error("Unknown answerType: " + type);
  }

  function checkFields(userValues, fieldsSpec) {
    const results = fieldsSpec.map((f, i) => checkAnswer(userValues[i], f));
    return { ok: results.every(r => r.ok), results };
  }

  // ── Interactive graph plot checker ──

  function distinctPoints(points) {
    const out = [];
    for (const pt of points || []) {
      if (!out.some(p => Math.abs(p.x - pt.x) < 1e-6 && Math.abs(p.y - pt.y) < 1e-6)) {
        out.push({ x: pt.x, y: pt.y });
      }
    }
    return out;
  }

  function checkPlot(plottedPoints, plotSpec) {
    const pts = distinctPoints(plottedPoints);
    const tol = plotSpec && plotSpec.tolerance !== undefined ? plotSpec.tolerance : 0.01;
    const type = plotSpec.plotType || "line";

    if (type === "line") {
      const minPts = plotSpec.minPoints || 2;
      if (pts.length < minPts) {
        return { ok: false, formatError: true, message: "Plot at least " + minPts + " points on the grid." };
      }
      for (const p of pts) {
        const expectedY = plotSpec.m * p.x + plotSpec.c;
        if (Math.abs(p.y - expectedY) > tol) {
          return { ok: false, message: "Point (" + p.x + ", " + p.y + ") does not lie on the line." };
        }
      }
      return { ok: true };
    }

    if (type === "points") {
      const targets = plotSpec.targets || [];
      if (pts.length !== targets.length) {
        return { ok: false, formatError: true, message: "Plot exactly " + targets.length + " point" + (targets.length === 1 ? "" : "s") + "." };
      }
      const allMatched = targets.every(t =>
        pts.some(p => Math.abs(p.x - t.x) <= tol && Math.abs(p.y - t.y) <= tol)
      );
      return { ok: allMatched };
    }

    if (type === "curve") {
      const minPts = plotSpec.minPoints || 3;
      if (pts.length < minPts) {
        return { ok: false, formatError: true, message: "Plot at least " + minPts + " points on the curve." };
      }
      for (const p of pts) {
        const expectedY = plotSpec.fn(p.x);
        if (!Number.isFinite(expectedY) || Math.abs(p.y - expectedY) > tol) {
          return { ok: false, message: "Point (" + p.x + ", " + p.y + ") is not on the curve." };
        }
      }
      if (Array.isArray(plotSpec.requiredPoints)) {
        for (const req of plotSpec.requiredPoints) {
          if (!pts.some(p => Math.abs(p.x - req.x) <= tol && Math.abs(p.y - req.y) <= tol)) {
            return { ok: false, message: "Make sure you include the key point (" + req.x + ", " + req.y + ")." };
          }
        }
      }
      return { ok: true };
    }

    throw new Error("Unknown plotType: " + type);
  }

  return {
    randInt, randNonZero, pick,
    randDecimal, randMoney, formatMoney, randPercentage, randAngle, randTriangleAngles, randProperFraction,
    gcd, lcm, simplifyFraction,
    roundToDp, roundToSigFigs, sigFigRange, countSigFigs,
    formatSignTerm, formatPoly, formatFrac, formatLinear,
    normaliseMathInput, tokenise, parseExpression, evalAst, extractVars,
    expressionsEquivalent, isExpanded, isFactorised, isCompletedSquare,
    checkAnswer, checkFields, checkPlot,
  };
})();

if (typeof module !== "undefined") module.exports = MATH_ENGINE;
