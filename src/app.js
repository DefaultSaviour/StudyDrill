// The page: drawing questions, clicks, keys and saving progress.
// All decisions (which question next, what counts as weak) live in logic.js.
(function () {
  "use strict";
  const PARTS = Object.keys(CONFIG.domains).map(Number);

  // ── state ──
  let stats = loadLocal();
  let parts = PARTS.slice();
  let mode = "mixed";
  let recent = [];
  let current = null;      // { q, pq, state: "asking"|"right"|"wrong", chosen }
  let session = { answered: 0, knew: 0 };
  let troubleAll = false;
  const troubleOpen = new Set();

  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const colour = p => "var(--p" + (((p - 1) % 6) + 1) + ")";

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
    current = { q, pq: LOGIC.presentQuestion(q, Math.random), state: "asking", chosen: null };
    renderQuestion();
  }

  function choose(i) {
    if (!current || current.state !== "asking") return;
    current.chosen = i;
    if (i === current.pq.correctIndex) current.state = "right";
    else { current.state = "wrong"; record("wrong"); }
    renderQuestion();
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

  function renderEmpty() {
    const card = $("#card");
    card.replaceChildren();
    card.style.setProperty("--pc", "var(--muted)");
    const EMPTY = {
      weak: ["No weak spots in these domains", "Nothing missed or guessed yet. Switch to Mixed, or pick other domains."],
      new: ["You've seen every question in these domains", "Switch to Mixed or Weak spots, or pick other domains."],
    };
    if (!CONFIG.exam || PARTS.length === 0 || BANK.length === 0) {
      card.append(
        el("p", "empty-title", "This drill is blank"),
        el("p", "empty-body", !CONFIG.exam || PARTS.length === 0
          ? "No exam is set up yet. Ask your AI assistant to follow docs/workflows/new-exam.md, or copy the example in examples/gh300 into src."
          : "The exam is set up but has no questions yet. Ask your AI assistant to follow docs/workflows/add-questions.md."));
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

  function renderQuestion() {
    const { q, pq, state, chosen } = current;
    const card = $("#card");
    card.replaceChildren();
    card.style.setProperty("--pc", colour(q.p));

    const meta = el("div", "meta");
    meta.append(el("span", "pill", "Domain " + q.p), el("span", "topic", q.t));
    card.append(meta, el("h2", "question", q.q));

    const list = el("div", "options");
    pq.options.forEach((text, i) => {
      const b = el("button", "opt");
      b.type = "button";
      const key = el("span", "key", String(i + 1));
      key.setAttribute("aria-hidden", "true");
      b.append(key, el("span", "opt-text", text));
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

    const fb = el("div", "feedback");
    fb.setAttribute("aria-live", "polite");
    if (state !== "asking") {
      fb.append(el("p", "verdict " + (state === "right" ? "ok" : "no"), state === "right" ? "Correct" : "Not quite"));
      fb.append(el("p", "why", q.w));
      if (q.src) {
        const p = el("p", "src");
        const a = el("a", null, "Source");
        a.href = q.src; a.target = "_blank"; a.rel = "noopener";
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

  // "You've been here before" line. A wrong answer is already recorded when
  // this is drawn, so dropLast removes it: the strip always shows the past.
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
      row.append(el("div", "trow-q", r.q.q));
      const meta = el("div", "trow-meta");
      meta.append(el("span", "trow-part", "Domain " + r.q.p + " · " + r.q.t));
      meta.append(el("span", null, r.stat.wrong + " wrong, " + r.stat.guessed + " guessed, " + r.stat.knew + " known"));
      const t = LOGIC.trend(r.stat);
      if (t.codes.length) meta.append(dotsNode(t.codes));
      if (t.label) meta.append(el("span", "verdict-tag", t.label));
      row.append(meta);

      const why = el("div", "trow-why");
      why.id = "why-" + r.q.id;
      why.append(el("p", null, "Answer: " + r.q.o[r.q.a]), el("p", null, r.q.w));
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
      const b = el("button", "chip", String(p));
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
      if (e.ctrlKey || e.metaKey || e.altKey || !current) return;
      if (current.state === "asking" && /^[1-4]$/.test(e.key)) {
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
