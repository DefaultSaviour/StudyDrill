// EXAMPLE BANK: demonstrates dynamic input questions, interactive graph plotting,
// SVG graph reading, formula transposition (F3T8 11), and rule-based MCQs.
// Do NOT add live questions to src/bank.js until a study topic is chosen.
const N5_SPEC = "https://www.sqa.org.uk/files_ccc/n5-course-spec-mathematics.pdf";
const F3T8_SPEC = "https://www.sqa.org.uk/files/nq/F3T811.pdf";

const BANK = [
  {
    id: "d4-01",
    p: 4,
    t: "Order of operations & powers",
    paper: 1,
    title: "Evaluate `a(b^2) - c` using BODMAS",
    rule: "Always evaluate indices (powers) inside or beside brackets first, then multiply, then add or subtract.",
    example: "`2(2^2) - 1 = 2(4) - 1 = 8 - 1 = 7`",
    src: F3T8_SPEC,
    generate(rng, M) {
      const a = M.randNonZero(rng, 2, 5);
      const b = M.randNonZero(rng, -4, 5);
      const c = M.randInt(rng, 1, 9);
      const bSq = b * b;
      const prod = a * bSq;
      const ans = prod - c;
      const bText = b < 0 ? "(" + b + ")" : String(b);
      return {
        kind: "input",
        q: "Calculate `" + a + "(" + bText + "^2) - " + c + "`.",
        hint: "Apply indices first, then multiply, then subtract.",
        answerType: "number",
        answer: ans,
        displayAnswer: String(ans),
        steps: [
          "Square first: `" + bText + "^2 = " + bSq + "`",
          "Multiply: `" + a + " * " + bSq + " = " + prod + "`",
          "Subtract: `" + prod + " - " + c + " = " + ans + "`",
        ],
        w: "Powers come before multiplication, and multiplication comes before subtraction. A negative number squared is always positive.",
      };
    },
  },
  {
    id: "d1-01",
    p: 1,
    t: "Expanding brackets",
    paper: 1,
    title: "Expand and simplify `a(bx + c) + d(ex + f)`",
    rule: "Multiply every term inside each bracket by the number in front (keeping careful track of minus signs), then collect like terms.",
    src: N5_SPEC,
    generate(rng, M) {
      const a = M.randInt(rng, 2, 5);
      const b = M.randInt(rng, 1, 4);
      const c = M.randNonZero(rng, -5, 5);
      let d = M.randNonZero(rng, -5, 5);
      let e = M.randInt(rng, 1, 4);
      while (a * b + d * e === 0) {
        d = M.randNonZero(rng, -5, 5);
        e = M.randInt(rng, 1, 4);
      }
      const f = M.randNonZero(rng, -5, 5);

      const xCoeff = a * b + d * e;
      const constTerm = a * c + d * f;
      const ansExpr = M.formatPoly([xCoeff, constTerm], "x");

      const br1 = M.formatPoly([b, c], "x");
      const br2 = M.formatPoly([e, f], "x");
      const dSign = d < 0 ? "- " + Math.abs(d) : "+ " + d;
      const exprText = a + "(" + br1 + ") " + dSign + "(" + br2 + ")";

      const exp1 = M.formatPoly([a * b, a * c], "x");
      const exp2 = M.formatPoly([d * e, d * f], "x");

      return {
        kind: "input",
        q: "Expand and simplify `" + exprText + "`.",
        hint: "Give your final simplified expression with no brackets.",
        answerType: "expression",
        requireExpanded: true,
        answer: ansExpr,
        displayAnswer: ansExpr,
        steps: [
          "First bracket: `" + a + "(" + br1 + ") = " + exp1 + "`",
          "Second bracket: `" + d + "(" + br2 + ") = " + exp2 + "`",
          "Collect like terms: `" + ansExpr + "`",
        ],
        w: "Multiply both terms in the second bracket by " + d + " (including its sign), then add the x terms and constant terms separately.",
      };
    },
  },
  {
    id: "d1-02",
    p: 1,
    t: "Factorising trinomials",
    paper: 1,
    title: "Factorise `x^2 + bx + c` into two brackets",
    rule: "Find two numbers that multiply to give c and add to give b, then write `(x + p)(x + q)`.",
    src: N5_SPEC,
    generate(rng, M) {
      const r1 = M.randNonZero(rng, -6, 6);
      let r2 = M.randNonZero(rng, -6, 6);
      // Avoid r1 + r2 === 0 so this stays a 3-term trinomial rather than difference of squares
      while (r1 + r2 === 0 || r1 === r2) {
        r2 = M.randNonZero(rng, -6, 6);
      }
      const b = r1 + r2;
      const c = r1 * r2;
      const quad = M.formatPoly([1, b, c], "x");
      const f1 = "(" + M.formatPoly([1, r1], "x") + ")";
      const f2 = "(" + M.formatPoly([1, r2], "x") + ")";
      const ans = f1 + f2;
      return {
        kind: "input",
        q: "Factorise `" + quad + "`.",
        hint: "Write your answer as two brackets, e.g. (x + 2)(x - 3).",
        answerType: "expression",
        requireFactorised: true,
        answer: ans,
        displayAnswer: ans,
        steps: [
          "Find two numbers that multiply to `" + c + "` and add to `" + b + "`.",
          "Those numbers are `" + r1 + "` and `" + r2 + "`.",
          "Factorised form: `" + ans + "`",
        ],
        w: "Factorising is the reverse of expanding: check your answer by multiplying the brackets back out to verify the middle term and constant.",
      };
    },
  },
  {
    id: "d1-03",
    p: 1,
    t: "Completing the square",
    paper: 1,
    title: "Write `x^2 + bx + c` in the form `(x + p)^2 + q`",
    rule: "Halve the x coefficient to get p inside `(x + p)^2`, then adjust the constant term with `c - p^2` to find q.",
    src: N5_SPEC,
    generate(rng, M) {
      const p = M.randNonZero(rng, -5, 5);
      const q = M.randNonZero(rng, -9, 9);
      const b = 2 * p;
      const c = p * p + q;
      const quad = M.formatPoly([1, b, c], "x");
      const inner = M.formatPoly([1, p], "x");
      const ans = "(" + inner + ")^2" + (q < 0 ? " - " + Math.abs(q) : " + " + q);
      return {
        kind: "input",
        q: "Write `" + quad + "` in the form `(x + p)^2 + q`.",
        hint: "Use ^2 or the ² button for the squared bracket.",
        answerType: "expression",
        requireCompletedSquare: true,
        answer: ans,
        displayAnswer: ans,
        steps: [
          "Halve `" + b + "` to get `p = " + p + "`, giving `(" + inner + ")^2`.",
          "Subtract `p^2 = " + (p * p) + "` and add `" + c + "`: `" + c + " - " + (p * p) + " = " + q + "`.",
          "Completed square: `" + ans + "`",
        ],
        w: "Remember to subtract p^2 from the original constant c because `(" + inner + ")^2` expands to `x^2 + " + b + "x + " + (p * p) + "`.",
      };
    },
  },
  {
    id: "d1-04",
    p: 1,
    t: "Simultaneous equations",
    paper: 1,
    title: "Solve a pair of simultaneous linear equations",
    rule: "Scale one or both equations so a variable has matching or opposite coefficients, add/subtract to eliminate it, then substitute back.",
    src: N5_SPEC,
    generate(rng, M) {
      const x = M.randNonZero(rng, -5, 5);
      const y = M.randNonZero(rng, -5, 5);
      const a1 = M.randInt(rng, 1, 4);
      const b1 = M.randNonZero(rng, -3, 3);
      let a2 = M.randInt(rng, 1, 4);
      let b2 = M.randNonZero(rng, -3, 3);
      while (a1 * b2 - a2 * b1 === 0) {
        a2 = M.randInt(rng, 1, 4);
        b2 = M.randNonZero(rng, -3, 3);
      }
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;

      const fmtEq = (a, b, c) => {
        const t1 = M.formatSignTerm(a, "x", true);
        const t2 = M.formatSignTerm(b, "y", false);
        return t1 + t2 + " = " + c;
      };
      const eq1 = fmtEq(a1, b1, c1);
      const eq2 = fmtEq(a2, b2, c2);

      return {
        kind: "input",
        q: "Solve the simultaneous equations `" + eq1 + "` and `" + eq2 + "`.",
        fields: [
          { label: "x =", answerType: "number", answer: x, placeholder: "Value of x" },
          { label: "y =", answerType: "number", answer: y, placeholder: "Value of y" },
        ],
        displayAnswer: "x = " + x + ", y = " + y,
        steps: [
          "Eliminate y by scaling: multiply the first equation by `" + Math.abs(b2) + "` and the second by `" + Math.abs(b1) + "`.",
          "Solve the resulting equation for `x = " + x + "`.",
          "Substitute `x = " + x + "` into `" + eq1 + "` to get `y = " + y + "`.",
        ],
        w: "Always substitute both values back into the second equation to check that both equations balance.",
      };
    },
  },
  {
    id: "d1-05",
    p: 1,
    t: "Equation of a straight line",
    paper: 1,
    title: "Find `y = mx + c` from a straight-line graph",
    rule: "Read the y-intercept c where the line crosses the y-axis, pick two clear grid points to find gradient `m = (y2 - y1) / (x2 - x1)`, then write `y = mx + c`.",
    src: F3T8_SPEC,
    generate(rng, M) {
      const m = M.randNonZero(rng, -3, 3);
      const c = M.randInt(rng, -3, 3);
      const eq = M.formatLinear(m, c, "y");
      const pts = [{ x: 0, y: c }];
      const x2 = m > 0 ? (c + m <= 5 ? 1 : -1) : (c - m <= 5 ? -1 : 1);
      pts.push({ x: x2, y: m * x2 + c });
      return {
        kind: "input",
        q: "State the equation of the straight line shown on the graph.",
        hint: "Write your answer in the form y = mx + c.",
        visual: {
          type: "graph",
          xMin: -5, xMax: 5, yMin: -5, yMax: 5,
          curves: [{ fn: x => m * x + c }],
          points: pts,
          ariaLabel: "Straight line graph passing through (0, " + c + ")",
        },
        answerType: "equation",
        requireSubject: "y",
        answer: eq,
        displayAnswer: eq,
        steps: [
          "The line crosses the y-axis at `(0, " + c + ")`, so `c = " + c + "`.",
          "Using two marked points on the line, gradient `m = (" + pts[1].y + " - " + c + ") / (" + x2 + " - 0) = " + m + "`.",
          "Equation: `" + eq + "`",
        ],
        w: "The coefficient of x is the gradient m (rise over run) and the constant c is the y-intercept where x = 0.",
      };
    },
  },
  {
    id: "d1-06",
    p: 1,
    t: "Plotting straight lines",
    paper: 1,
    title: "Plot the line `y = mx + c` on a grid",
    rule: "Choose at least two x-values (such as x = 0 and x = 2), calculate y for each, and plot those `(x, y)` points on the grid.",
    src: F3T8_SPEC,
    generate(rng, M) {
      const m = M.pick(rng, [-2, -1, 1, 2]);
      const c = M.randInt(rng, -3, 3);
      const eq = M.formatLinear(m, c, "y");
      const x1 = 0;
      const x2 = c + m * 2 >= -6 && c + m * 2 <= 6 ? 2 : -2;
      const y1 = c;
      const y2 = m * x2 + c;
      return {
        kind: "plot",
        q: "Plot at least two points that lie on `" + eq + "`.",
        hint: "Click grid intersections to place or remove points.",
        visual: {
          type: "graph",
          xMin: -6, xMax: 6, yMin: -6, yMax: 6,
          snap: 1,
          ariaLabel: "Interactive coordinate grid from -6 to 6",
        },
        plotSpec: {
          plotType: "line",
          m,
          c,
          minPoints: 2,
          selfTestPoints: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
        },
        displayAnswer: eq + " passes through (" + x1 + ", " + y1 + ") and (" + x2 + ", " + y2 + ")",
        steps: [
          "When `x = " + x1 + "`: `y = " + y1 + "`, giving `(" + x1 + ", " + y1 + ")`.",
          "When `x = " + x2 + "`: `y = " + y2 + "`, giving `(" + x2 + ", " + y2 + ")`.",
        ],
        w: "Any two distinct points whose coordinates satisfy `" + eq + "` define the straight line; the y-intercept `(0, " + c + ")` is always a quick starting point.",
      };
    },
  },
  {
    id: "d1-07",
    p: 1,
    t: "Changing the subject of a formula",
    paper: 2,
    title: "Transpose a scientific formula to change the subject",
    rule: "Undo operations around the target letter in reverse order (undo additions/subtractions first, then multiplications/divisions, then powers/roots).",
    src: F3T8_SPEC,
    generate(rng, M) {
      const variants = [
        {
          formula: "v = u + at",
          subject: "t",
          answer: "t = (v - u)/a",
          steps: ["Subtract `u` from both sides: `v - u = at`", "Divide both sides by `a`: `t = (v - u)/a`"],
          w: "Undo adding u before dividing by a, so the entire difference `v - u` is divided by a.",
        },
        {
          formula: "v = u + at",
          subject: "u",
          answer: "u = v - at",
          steps: ["Subtract `at` from both sides: `v - at = u`", "Rewrite with `u` on the left: `u = v - at`"],
          w: "Because `at` is added to `u`, subtracting `at` from both sides isolates `u` immediately.",
        },
        {
          formula: "E = mgh",
          subject: "h",
          answer: "h = E/(mg)",
          steps: ["Divide both sides by `mg`: `h = E/(mg)`"],
          w: "Both m and g multiply h, so divide E by the product `(mg)` — remember brackets around `mg` when typing `E/(mg)`.",
        },
        {
          formula: "A = pi r^2",
          subject: "r",
          answer: "r = sqrt(A/pi)",
          steps: ["Divide both sides by `pi`: `r^2 = A/pi`", "Take the positive square root: `r = sqrt(A/pi)`"],
          w: "Divide by pi before taking the square root so the square root covers the whole fraction `A/pi`.",
        },
      ];
      const chosen = M.pick(rng, variants);
      return {
        kind: "input",
        q: "Change the subject of the formula `" + chosen.formula + "` to `" + chosen.subject + "`.",
        hint: "Include `" + chosen.subject + " = ...` and use brackets for numerators/denominators.",
        answerType: "equation",
        requireSubject: chosen.subject,
        answer: chosen.answer,
        displayAnswer: chosen.answer,
        steps: chosen.steps,
        w: chosen.w,
      };
    },
  },
  {
    id: "d1-08",
    p: 1,
    t: "The discriminant",
    paper: 1,
    q: "For a quadratic equation `ax^2 + bx + c = 0`, what does `b^2 - 4ac < 0` tell you about its roots?",
    o: [
      "The equation has no real roots",
      "The equation has two equal real roots",
      "The equation has two distinct real roots",
      "The equation has one positive real root",
    ],
    a: 0,
    w: "When `b^2 - 4ac < 0`, the square root in the quadratic formula would take a negative number, so there are no real roots. Two equal real roots happen when `b^2 - 4ac = 0`, and two distinct real roots when `b^2 - 4ac > 0`.",
    src: N5_SPEC,
  },
];

if (typeof module !== "undefined") module.exports = { BANK };
