// The page: drawing questions (MCQ, maths input, interactive graph plotting), clicks, keys, and saving progress.
// All quiz selection and grading rules live in logic.js, math-engine.js, and visuals.js.
(function () {
  "use strict";
  // Example drills linked from the empty screen. Each folder has a drill.html
  // made by scripts/make-example-pages.js.
  const EXAMPLE_PAGES = [
    ["gh300", "GitHub Copilot exam (GH-300): multiple choice"],
    ["networking", "IPv4 networking: new addresses every time"],
    ["maths-n5", "National 5 Maths: type the answer, plot graphs"],
  ];
  const PARTS = Object.keys(CONFIG.domains).map(Number);
  const KEYPAD_SYMBOLS = ["²", "³", "√", "π", "°", "±", "≤", "≥", "/"];

  // ── state ──
  let stats = loadLocal();
  let parts = PARTS.slice();
  let mode = "mixed";
  let recent = [];
  let current = null;      // { q, pq, state: "asking"|"right"|"wrong", chosen, userInputs, plottedPoints, feedbackHint }
  let session = { answered: 0, knew: 0 };
  let troubleAll = false;
  const troubleOpen = new Set();
  const lastPromptById = {};

  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const colour = p => "var(--p" + (((p - 1) % 6) + 1) + ")";

  function setMath(node, text) {
    node.innerHTML = VISUALS.formatMathHtml(text);
    return node;
  }

  // ── storage ──
  function loadLocal() {
    try { const r = localStorage.getItem(CONFIG.storageKey); const p = r ? JSON.parse(r) : {}; return p && typeof p === "object" ? p : {}; }
    catch (e) { return {}; }
  }
  function saveLocal() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(stats)); } catch (e) {} }

  function exportProgress() {
    const data = { app: CONFIG.storageKey, exported: new Date().toISOString(), stats };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = CONFIG.storageKey + "-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    $("#iomsg").textContent = "Progress exported.";
  }

  function importProgress(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const imported = LOGIC.parseBackup(String(reader.result), CONFIG.storageKey);
      if (!imported) { $("#iomsg").textContent = "That file is not a progress backup for this drill."; return; }
      stats = LOGIC.mergeStats(stats, imported);
      saveLocal(); renderProgress();
      $("#iomsg").textContent = "Progress imported and merged.";
    };
    reader.readAsText(file);
  }

  // ── quiz flow ──
  function nextQuestion() {
    const q = LOGIC.pickNext(BANK, stats, { parts, mode, recent }, Math.random);
    if (!q) { current = null; renderEmpty(); return; }
    const poolSize = BANK.filter(x => parts.includes(x.p)).length;
    recent.push(q.id);
    const cap = Math.max(1, Math.min(25, Math.floor(poolSize / 2)));
    while (recent.length > cap) recent.shift();

    const pq = LOGIC.presentFreshQuestion(q, Math.random, MATH_ENGINE, lastPromptById[q.id]);
    lastPromptById[q.id] = pq.q + " || " + (pq.displayAnswer || "");
    const fieldCount = pq.fields ? pq.fields.length : 1;

    current = {
      q,
      pq,
      state: "asking",
      chosen: null,
      userInputs: new Array(fieldCount).fill(""),
      plottedPoints: [],
      feedbackHint: "",
    };
    renderQuestion();
  }

  function choose(i) {
    if (!current || current.state !== "asking" || current.pq.kind !== "mcq") return;
    current.chosen = i;
    if (i === current.pq.correctIndex) current.state = "right";
    else { current.state = "wrong"; record("wrong"); }
    renderQuestion();
  }

  function submitInput() {
    if (!current || current.state !== "asking" || current.pq.kind !== "input") return;
    const { pq, userInputs } = current;
    const inputs = Array.from(document.querySelectorAll("#card .math-input"));
    inputs.forEach((inp, idx) => { userInputs[idx] = inp.value; });

    if (pq.fields) {
      if (userInputs.some(v => !v.trim())) {
        current.feedbackHint = "Fill in every answer box before checking.";
        updateCheckHint();
        return;
      }
      const res = MATH_ENGINE.checkFields(userInputs, pq.fields);
      if (res.ok) {
        current.feedbackHint = "";
        current.state = "right";
      } else {
        const formatErr = res.results.find(r => r.formatError && r.message);
        if (formatErr) {
          current.feedbackHint = formatErr.message;
          updateCheckHint();
          return;
        }
        current.feedbackHint = res.results.map(r => r.message).find(Boolean) || "";
        current.state = "wrong";
        record("wrong");
      }
      renderQuestion();
      return;
    }

    const val = userInputs[0] || "";
    if (!val.trim()) {
      current.feedbackHint = "Please enter an answer first.";
      updateCheckHint();
      return;
    }
    const res = MATH_ENGINE.checkAnswer(val, pq);
    if (res.ok) {
      current.feedbackHint = "";
      current.state = "right";
    } else if (res.formatError && res.message) {
      current.feedbackHint = res.message;
      updateCheckHint();
      return;
    } else {
      current.feedbackHint = res.message || "";
      current.state = "wrong";
      record("wrong");
    }
    renderQuestion();
  }

  function submitPlot() {
    if (!current || current.state !== "asking" || current.pq.kind !== "plot") return;
    const res = MATH_ENGINE.checkPlot(current.plottedPoints, current.pq.plotSpec);
    if (res.formatError && res.message) {
      current.feedbackHint = res.message;
      updateCheckHint();
      return;
    }
    current.feedbackHint = res.ok ? "" : (res.message || "");
    if (res.ok) current.state = "right";
    else { current.state = "wrong"; record("wrong"); }
    renderQuestion();
  }

  function updateCheckHint() {
    const h = $("#checkhint");
    if (h && current) {
      h.textContent = current.feedbackHint || "";
      h.hidden = !current.feedbackHint;
    }
  }

  function record(result) {
    stats = LOGIC.recordAnswer(stats, current.q.id, result, Date.now());
    session.answered++;
    if (result === "knew") session.knew++;
    saveLocal(); renderProgress(); renderSession();
  }

  function markRight(result) {
    if (!current || current.state !== "right") return;
    record(result);
    nextQuestion();
  }

  // ── rendering ──
  function renderSession() {
    $("#session").textContent = session.answered === 0 ? "No answers yet this session"
      : session.knew + " known of " + session.answered + " this session";
  }

  function updateKeyHint() {
    const hint = $("#keyhint");
    if (!hint) return;
    if (!current) { hint.textContent = ""; return; }
    if (current.state === "right") {
      hint.textContent = "Keys: K if you knew it, G if you guessed.";
    } else if (current.state === "wrong") {
      hint.textContent = "Keys: N for next question.";
    } else if (current.pq.kind === "mcq") {
      hint.textContent = "Keys: 1–4 to answer.";
    } else if (current.pq.kind === "input") {
      hint.textContent = "Type your answer and press Enter to check.";
    } else {
      hint.textContent = "Click points on the grid, then choose Check plot.";
    }
  }

  function renderEmpty() {
    const card = $("#card");
    card.replaceChildren();
    card.style.setProperty("--pc", "var(--muted)");
    updateKeyHint();
    const EMPTY = {
      weak: ["No weak spots in these domains", "Nothing missed or guessed yet. Switch to Mixed, or pick other domains."],
      new: ["You've seen every question in these domains", "Switch to Mixed or Weak spots, or pick other domains."],
    };
    if (!CONFIG.exam || PARTS.length === 0 || BANK.length === 0) {
      const notSetUp = !CONFIG.exam || PARTS.length === 0;
      card.append(
        el("p", "empty-title", notSetUp ? "This drill is empty" : CONFIG.exam + " has no questions yet"),
        el("p", "empty-body", notSetUp
          ? "To make your own, follow \"Make your own drill\" in the README file. Or try one of the examples first:"
          : "Ask your AI assistant to add questions: /add-questions, then the topic you are studying."));
      // Only the blank drill (in the repo's root folder) links to the examples.
      if (notSetUp && !/\/examples\//.test(location.pathname)) {
        const list = el("ul", "example-links");
        for (const [folder, label] of EXAMPLE_PAGES) {
          const li = el("li");
          const a = el("a", null, label);
          a.href = "examples/" + folder + "/drill.html";
          li.append(a);
          list.append(li);
        }
        card.append(list);
      }
      return;
    }
    const [title, body] = EMPTY[mode] || ["No questions for this selection", "Select at least one domain above."];
    card.append(el("p", "empty-title", title), el("p", "empty-body", body));
    if (EMPTY[mode]) {
      const b = el("button", "btn primary", "Switch to Mixed");
      b.addEventListener("click", () => setMode("mixed"));
      card.append(b);
    }
  }

  function createSvgEl(tag, attrs) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v));
    return n;
  }

  function redrawPlotOverlay(svgWrap, pq, points, state) {
    const svg = svgWrap.querySelector("svg");
    if (!svg || !pq.visual) return;
    const layout = VISUALS.graphLayout(pq.visual);
    const ptsGroup = svg.querySelector(".plot-user-points");
    const previewGroup = svg.querySelector(".plot-preview");
    const solGroup = svg.querySelector(".plot-solution");

    if (previewGroup) {
      previewGroup.replaceChildren();
      if (pq.plotSpec && pq.plotSpec.plotType === "line" && points.length >= 2) {
        const p0 = points[0];
        const p1 = points[1];
        if (Math.abs(p1.x - p0.x) > 1e-6) {
          const m = (p1.y - p0.y) / (p1.x - p0.x);
          const c = p0.y - m * p0.x;
          const a = layout.toSvg(layout.xMin, m * layout.xMin + c);
          const b = layout.toSvg(layout.xMax, m * layout.xMax + c);
          previewGroup.append(createSvgEl("line", {
            x1: a.px.toFixed(1), y1: a.py.toFixed(1),
            x2: b.px.toFixed(1), y2: b.py.toFixed(1),
            stroke: "var(--pc)", "stroke-width": 2, "stroke-dasharray": "6 4", opacity: 0.7,
          }));
        } else {
          const top = layout.toSvg(p0.x, layout.yMax);
          const bot = layout.toSvg(p0.x, layout.yMin);
          previewGroup.append(createSvgEl("line", {
            x1: top.px.toFixed(1), y1: top.py.toFixed(1),
            x2: bot.px.toFixed(1), y2: bot.py.toFixed(1),
            stroke: "var(--pc)", "stroke-width": 2, "stroke-dasharray": "6 4", opacity: 0.7,
          }));
        }
      }
    }

    if (ptsGroup) {
      ptsGroup.replaceChildren();
      const ptColor = state === "right" ? "var(--ok)" : state === "wrong" ? "var(--no)" : "var(--pc)";
      for (const pt of points) {
        const p = layout.toSvg(pt.x, pt.y);
        ptsGroup.append(createSvgEl("circle", {
          cx: p.px.toFixed(1), cy: p.py.toFixed(1), r: 5.5,
          fill: ptColor, stroke: "var(--card)", "stroke-width": 2,
        }));
        const txt = createSvgEl("text", {
          x: (p.px + 7).toFixed(1), y: (p.py - 7).toFixed(1),
          "font-size": 11, "font-weight": 700, fill: ptColor,
        });
        txt.textContent = "(" + pt.x + ", " + pt.y + ")";
        ptsGroup.append(txt);
      }
    }

    if (solGroup) {
      solGroup.replaceChildren();
    }
  }

  function renderMcqBody(card, pq, state, chosen) {
    const list = el("div", "options");
    pq.options.forEach((text, i) => {
      const b = el("button", "opt");
      b.type = "button";
      const key = el("span", "key", String(i + 1));
      key.setAttribute("aria-hidden", "true");
      const txt = setMath(el("span", "opt-text"), text);
      b.append(key, txt);
      if (state !== "asking") {
        b.disabled = true;
        if (i === pq.correctIndex) { b.classList.add("is-correct"); b.append(el("span", "mark", "✓")); }
        else if (i === chosen) { b.classList.add("is-wrong"); b.append(el("span", "mark", "✗")); }
        else b.classList.add("is-dim");
      }
      b.addEventListener("click", () => choose(i));
      list.append(b);
    });
    card.append(list);
  }

  function renderInputBody(card, pq, state) {
    const area = el("div", "input-area");
    if (pq.prompt) area.append(setMath(el("p", "input-prompt"), pq.prompt));

    let activeInput = null;
    const specs = pq.fields || [{ label: pq.label || "", placeholder: pq.placeholder || "Type your answer..." }];
    specs.forEach((f, idx) => {
      const row = el("div", "field-row");
      if (f.label) row.append(setMath(el("label", "field-label"), f.label));
      const inp = el("input", "math-input");
      inp.type = "text";
      inp.autocomplete = "off";
      inp.spellcheck = false;
      inp.placeholder = f.placeholder || "Type your answer...";
      inp.value = current.userInputs[idx] || "";
      if (state !== "asking") {
        inp.disabled = true;
        inp.classList.add(state === "right" ? "is-correct" : "is-wrong");
      }
      inp.addEventListener("focus", () => { activeInput = inp; });
      inp.addEventListener("input", () => { current.userInputs[idx] = inp.value; });
      inp.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); submitInput(); }
      });
      if (!activeInput) activeInput = inp;
      row.append(inp);
      area.append(row);
    });

    if (pq.hint) area.append(setMath(el("p", "input-hint"), pq.hint));

    if (state === "asking") {
      const keypad = el("div", "keypad");
      keypad.setAttribute("aria-label", "Maths symbol buttons");
      for (const sym of KEYPAD_SYMBOLS) {
        const kb = el("button", "kbtn", sym);
        kb.type = "button";
        kb.title = "Insert " + sym;
        kb.addEventListener("mousedown", e => e.preventDefault());
        kb.addEventListener("click", () => {
          const target = activeInput || area.querySelector(".math-input");
          if (!target) return;
          const start = target.selectionStart != null ? target.selectionStart : target.value.length;
          const end = target.selectionEnd != null ? target.selectionEnd : target.value.length;
          target.value = target.value.slice(0, start) + sym + target.value.slice(end);
          target.focus();
          target.setSelectionRange(start + sym.length, start + sym.length);
          const idx = Array.from(area.querySelectorAll(".math-input")).indexOf(target);
          if (idx >= 0) current.userInputs[idx] = target.value;
        });
        keypad.append(kb);
      }
      area.append(keypad);

      const checkRow = el("div", "check-row");
      const checkBtn = el("button", "btn primary", "Check answer");
      checkBtn.type = "button";
      checkBtn.addEventListener("click", submitInput);
      checkRow.append(checkBtn);
      area.append(checkRow);

      const hintEl = el("p", "check-hint");
      hintEl.id = "checkhint";
      hintEl.hidden = !current.feedbackHint;
      hintEl.textContent = current.feedbackHint || "";
      area.append(hintEl);
    }

    card.append(area);
    if (state === "asking" && activeInput) {
      activeInput.focus({ preventScroll: true });
    }
  }

  function renderPlotBody(card, pq, state) {
    let visualSpec = { ...pq.visual, interactive: true };
    if (state === "wrong" && pq.plotSpec) {
      const extraCurves = (pq.visual && pq.visual.curves) ? pq.visual.curves.slice() : [];
      const extraPoints = (pq.visual && pq.visual.points) ? pq.visual.points.slice() : [];
      if (pq.plotSpec.plotType === "line") {
        extraCurves.push({ fn: x => pq.plotSpec.m * x + pq.plotSpec.c, color: "var(--ok)", strokeWidth: 2.6 });
      } else if (pq.plotSpec.plotType === "curve" && typeof pq.plotSpec.fn === "function") {
        extraCurves.push({ fn: pq.plotSpec.fn, color: "var(--ok)", strokeWidth: 2.6 });
      } else if (pq.plotSpec.plotType === "points" && Array.isArray(pq.plotSpec.targets)) {
        for (const t of pq.plotSpec.targets) extraPoints.push({ x: t.x, y: t.y, color: "var(--ok)", radius: 6 });
      }
      visualSpec = { ...visualSpec, curves: extraCurves, points: extraPoints };
    }
    const visWrap = el("div", "visual");
    visWrap.innerHTML = VISUALS.renderVisualSvg(visualSpec);
    card.append(visWrap);

    const bar = el("div", "plot-bar");
    const coords = el("span", "plot-coords", "Hover grid to see coordinates");
    bar.append(coords);
    if (pq.hint) bar.append(setMath(el("span"), pq.hint));
    card.append(bar);

    const svg = visWrap.querySelector("svg");
    const layout = VISUALS.graphLayout(pq.visual);
    const snapStep = (pq.visual && pq.visual.snap) || 1;

    function pointerToGrid(e) {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * layout.width;
      const py = ((e.clientY - rect.top) / rect.height) * layout.height;
      const raw = layout.fromSvg(px, py);
      return {
        x: layout.clampSnap(raw.x, layout.xMin, layout.xMax, snapStep),
        y: layout.clampSnap(raw.y, layout.yMin, layout.yMax, snapStep),
      };
    }

    if (svg && state === "asking") {
      svg.addEventListener("pointermove", e => {
        const pt = pointerToGrid(e);
        coords.textContent = "(" + pt.x + ", " + pt.y + ")";
      });
      svg.addEventListener("pointerleave", () => {
        coords.textContent = current.plottedPoints.length
          ? current.plottedPoints.length + " point" + (current.plottedPoints.length === 1 ? "" : "s") + " plotted"
          : "Hover grid to see coordinates";
      });
      svg.addEventListener("click", e => {
        const pt = pointerToGrid(e);
        const existingIdx = current.plottedPoints.findIndex(p => Math.abs(p.x - pt.x) < 1e-6 && Math.abs(p.y - pt.y) < 1e-6);
        if (existingIdx >= 0) current.plottedPoints.splice(existingIdx, 1);
        else current.plottedPoints.push(pt);
        current.feedbackHint = "";
        updateCheckHint();
        redrawPlotOverlay(visWrap, pq, current.plottedPoints, state);
      });
    }

    redrawPlotOverlay(visWrap, pq, current.plottedPoints, state);

    if (state === "asking") {
      const row = el("div", "check-row");
      const checkBtn = el("button", "btn primary", "Check plot");
      checkBtn.type = "button";
      checkBtn.addEventListener("click", submitPlot);

      const undoBtn = el("button", "btn", "Undo");
      undoBtn.type = "button";
      undoBtn.addEventListener("click", () => {
        current.plottedPoints.pop();
        redrawPlotOverlay(visWrap, pq, current.plottedPoints, state);
      });

      const clearBtn = el("button", "btn", "Clear");
      clearBtn.type = "button";
      clearBtn.addEventListener("click", () => {
        current.plottedPoints = [];
        redrawPlotOverlay(visWrap, pq, current.plottedPoints, state);
      });

      row.append(checkBtn, undoBtn, clearBtn);
      card.append(row);

      const hintEl = el("p", "check-hint");
      hintEl.id = "checkhint";
      hintEl.hidden = !current.feedbackHint;
      hintEl.textContent = current.feedbackHint || "";
      card.append(hintEl);
    }
  }

  function renderQuestion() {
    const { q, pq, state, chosen, feedbackHint } = current;
    const card = $("#card");
    card.replaceChildren();
    card.style.setProperty("--pc", colour(q.p));
    updateKeyHint();

    const meta = el("div", "meta");
    meta.append(el("span", "pill", CONFIG.domains[q.p] ? CONFIG.domains[q.p].name : "Domain " + q.p), el("span", "topic", q.t));
    if (pq.paper) {
      meta.append(el("span", "badge", pq.paper === 1 ? "Paper 1 · Non-calc" : "Paper 2 · Calculator"));
    }
    card.append(meta);
    card.append(setMath(el("h2", "question"), pq.q));

    if (pq.visual && pq.kind !== "plot") {
      const visWrap = el("div", "visual");
      visWrap.innerHTML = VISUALS.renderVisualSvg(pq.visual);
      card.append(visWrap);
    }

    if (pq.kind === "mcq") renderMcqBody(card, pq, state, chosen);
    else if (pq.kind === "input") renderInputBody(card, pq, state);
    else if (pq.kind === "plot") renderPlotBody(card, pq, state);

    const fb = el("div", "feedback");
    fb.setAttribute("aria-live", "polite");
    if (state !== "asking") {
      fb.append(el("p", "verdict " + (state === "right" ? "ok" : "no"), state === "right" ? "Correct" : "Not quite"));
      if (state === "wrong" && feedbackHint) {
        fb.append(el("p", "check-hint", feedbackHint));
      }
      if (pq.kind !== "mcq" && pq.displayAnswer) {
        const ans = el("p", "expected-ans");
        // Plain-text answers (names, commands, addresses) show as normal text; maths answers render as maths.
        if (pq.answerType === "exact") ans.textContent = "Answer: " + pq.displayAnswer;
        else setMath(ans, "Answer: `" + pq.displayAnswer + "`");
        fb.append(ans);
      }
      if (Array.isArray(pq.steps) && pq.steps.length > 0) {
        const ol = el("ol", "steps");
        for (const st of pq.steps) ol.append(setMath(el("li"), st));
        fb.append(ol);
      }
      fb.append(setMath(el("p", "why"), pq.w));
      const srcUrl = pq.src || q.src;
      if (srcUrl) {
        const p = el("p", "src");
        const a = el("a", null, "Source");
        a.href = srcUrl; a.target = "_blank"; a.rel = "noopener";
        p.append(a);
        fb.append(p);
      }
      const strip = historyStrip(stats[q.id], state === "wrong");
      if (strip) fb.append(strip);
      const actions = el("div", "actions");
      if (state === "right") {
        fb.append(el("p", "ask", "Did you know it, or guess?"));
        const k = el("button", "btn primary", "I knew it");
        const g = el("button", "btn", "I guessed");
        k.addEventListener("click", () => markRight("knew"));
        g.addEventListener("click", () => markRight("guessed"));
        actions.append(k, g);
      } else {
        const n = el("button", "btn primary", "Next question");
        n.addEventListener("click", nextQuestion);
        actions.append(n);
      }
      fb.append(actions);
    }
    card.append(fb);
    if (state !== "asking") { const btn = card.querySelector(".actions .btn"); if (btn) btn.focus({ preventScroll: true }); }
  }

  function dotsNode(codes) {
    const wrap = el("span", "dots");
    wrap.setAttribute("role", "img");
    const words = { k: "knew it", g: "guessed", w: "wrong" };
    wrap.setAttribute("aria-label", "Attempts, oldest first: " + codes.map(c => words[c]).join(", "));
    for (const c of codes) wrap.append(el("i", "dot " + c));
    return wrap;
  }

  function historyStrip(stat, dropLast) {
    if (!stat) return null;
    const t = LOGIC.trend(stat);
    const codes = dropLast ? t.codes.slice(0, -1) : t.codes;
    if (codes.length === 0) return null;
    const row = el("p", "hist");
    row.append(el("span", null, "Before this: "), dotsNode(codes));
    const misses = (stat.wrong || 0) + (stat.guessed || 0) - (dropLast ? 1 : 0);
    if (misses > 0) row.append(el("span", "verdict-tag", "missed " + misses + " time" + (misses === 1 ? "" : "s") + " so far"));
    return row;
  }

  function renderTrouble() {
    const box = $("#trouble");
    const toggle = $("#troubletoggle");
    const rows = LOGIC.troubleList(BANK, stats);
    box.replaceChildren();
    if (rows.length === 0) {
      box.append(el("p", "empty-body", "Nothing missed yet. Anything you get wrong or mark as a guess shows up here."));
      toggle.hidden = true;
      return;
    }
    const LIMIT = 8;
    for (const r of (troubleAll ? rows : rows.slice(0, LIMIT))) {
      const row = el("div", "trow");
      row.style.setProperty("--pc", colour(r.q.p));
      const titleText = r.q.title || r.q.q || r.q.t;
      row.append(setMath(el("div", "trow-q"), titleText));
      const meta = el("div", "trow-meta");
      meta.append(el("span", "trow-part", (CONFIG.domains[r.q.p] ? CONFIG.domains[r.q.p].name : "Domain " + r.q.p) + " · " + r.q.t));
      meta.append(el("span", null, r.stat.wrong + " wrong, " + r.stat.guessed + " guessed, " + r.stat.knew + " known"));
      const t = LOGIC.trend(r.stat);
      if (t.codes.length) meta.append(dotsNode(t.codes));
      if (t.label) meta.append(el("span", "verdict-tag", t.label));
      row.append(meta);

      const why = el("div", "trow-why");
      why.id = "why-" + r.q.id;
      if (Array.isArray(r.q.o)) {
        why.append(setMath(el("p"), "Answer: " + r.q.o[r.q.a]), setMath(el("p"), r.q.w));
      } else {
        why.append(setMath(el("p"), "Rule: " + (r.q.rule || "Dynamic practice skill — numbers change every time.")));
        if (r.q.example) why.append(setMath(el("p"), "Example: " + r.q.example));
      }
      why.hidden = !troubleOpen.has(r.q.id);
      const btn = el("button", "linkbtn", why.hidden ? "Show why" : "Hide");
      btn.type = "button";
      btn.setAttribute("aria-expanded", String(!why.hidden));
      btn.setAttribute("aria-controls", why.id);
      btn.addEventListener("click", () => {
        const opening = why.hidden;
        if (opening) troubleOpen.add(r.q.id); else troubleOpen.delete(r.q.id);
        why.hidden = !opening;
        btn.textContent = opening ? "Hide" : "Show why";
        btn.setAttribute("aria-expanded", String(opening));
      });
      row.append(btn, why);
      box.append(row);
    }
    toggle.hidden = rows.length <= LIMIT;
    toggle.textContent = troubleAll ? "Show fewer" : "Show all " + rows.length;
  }

  function renderProgress() {
    renderTrouble();
    renderNewCount();
    const sum = LOGIC.partSummary(BANK, stats, PARTS);
    const box = $("#parts-progress");
    box.replaceChildren();
    for (const p of PARTS) {
      const s = sum[p];
      const row = el("div", "prow");
      row.style.setProperty("--pc", colour(p));
      const head = el("div", "prow-head");
      head.append(el("span", "prow-name", p + ". " + CONFIG.domains[p].name + " (" + CONFIG.domains[p].weight + ")"));
      head.append(el("span", "prow-pct", s.solid + " of " + s.questions + " solid"));
      const bar = el("div", "bar");
      const fill = el("div", "fill");
      fill.style.width = (s.questions ? Math.round((s.solid / s.questions) * 100) : 0) + "%";
      bar.append(fill);
      const foot = el("div", "prow-foot", s.answered === 0 ? "Not started"
        : "Seen " + s.answered + ", knew " + Math.round(s.knewRate * 100) + "% of answers" + (s.weak ? ", " + s.weak + " still weak" : ""));
      row.append(head, bar, foot);
      box.append(row);
    }
  }

  function renderNewCount() {
    const n = BANK.filter(q => parts.includes(q.p) && LOGIC.isUnseen(stats[q.id])).length;
    $("#newcount").textContent = " (" + n + ")";
  }

  function renderFilters() {
    renderNewCount();
    document.querySelectorAll("[data-part]").forEach(b => b.setAttribute("aria-pressed", String(parts.includes(Number(b.dataset.part)))));
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  }

  function togglePart(p) {
    if (parts.includes(p)) { if (parts.length === 1) return; parts = parts.filter(x => x !== p); }
    else parts = [...parts, p].sort((a, b) => a - b);
    recent = [];
    renderFilters(); nextQuestion();
  }
  function setMode(m) { mode = m; recent = []; renderFilters(); nextQuestion(); }

  function resetProgress() {
    if (!confirm("Clear all your answer history? Export a backup first if you might want it.")) return;
    stats = {}; session = { answered: 0, knew: 0 };
    saveLocal(); renderProgress(); renderSession(); nextQuestion();
  }

  // ── wiring ──
  function init() {
    document.title = CONFIG.title;
    $("#title").textContent = CONFIG.title;
    const chips = $("#partchips");
    for (const p of PARTS) {
      const b = el("button", "chip", CONFIG.domains[p].name);
      b.dataset.part = String(p);
      b.title = CONFIG.domains[p].name;
      b.setAttribute("aria-label", "Domain " + p + ": " + CONFIG.domains[p].name);
      b.style.setProperty("--c", colour(p));
      b.addEventListener("click", () => togglePart(p));
      chips.append(b);
    }
    document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
    $("#reset").addEventListener("click", resetProgress);
    $("#export").addEventListener("click", exportProgress);
    $("#import").addEventListener("click", () => $("#importfile").click());
    $("#importfile").addEventListener("change", e => { const f = e.target.files && e.target.files[0]; if (f) importProgress(f); e.target.value = ""; });
    $("#troubletoggle").addEventListener("click", () => { troubleAll = !troubleAll; renderTrouble(); });
    $("#total").textContent = BANK.length + " questions across " + PARTS.length + " domains.";

    document.addEventListener("keydown", e => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !current) return;
      if (current.state === "asking" && current.pq.kind === "mcq" && /^[1-4]$/.test(e.key)) {
        e.preventDefault(); choose(Number(e.key) - 1);
      } else if (current.state === "right") {
        if (e.key === "k" || e.key === "K") { e.preventDefault(); markRight("knew"); }
        if (e.key === "g" || e.key === "G") { e.preventDefault(); markRight("guessed"); }
      } else if (current.state === "wrong" && (e.key === "n" || e.key === "N")) {
        e.preventDefault(); nextQuestion();
      }
    });

    renderFilters(); renderProgress(); renderSession(); nextQuestion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
