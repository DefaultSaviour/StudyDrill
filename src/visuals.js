// Pure SVG diagram / graph renderer and offline maths HTML formatter.
// Zero external dependencies — works in browsers (<script>) and Node (require).
const VISUALS = (function () {
  "use strict";

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatInlinePowers(escaped) {
    return escaped
      .replace(/([a-zA-Z0-9)\]])\^\{([^}]+)\}/g, "$1<sup>$2</sup>")
      .replace(/([a-zA-Z0-9)\]])\^([+-]?[a-zA-Z0-9]+)/g, "$1<sup>$2</sup>");
  }

  function toLatex(expr) {
    let s = String(expr == null ? "" : expr).trim();
    if (!s) return "";
    // Already raw LaTeX (e.g. \frac{a}{b}, \sqrt{2}, \begin{pmatrix}...)
    if (s.includes("\\")) return s;
    s = s
      .replace(/cbrt\(([^()]+)\)/gi, "\\sqrt[3]{$1}")
      .replace(/sqrt\(([^()]+)\)/gi, "\\sqrt{$1}")
      .replace(/\+-/g, "\\pm ")
      .replace(/<=/g, "\\le ")
      .replace(/>=/g, "\\ge ")
      .replace(/\bpi\b/gi, "\\pi ")
      .replace(/\s*\*\s*/g, " \\times ")
      .replace(/\s+\/\s+/g, " \\div ")
      .replace(/\^([+-]?[a-zA-Z0-9]{2,}|-[a-zA-Z0-9])/g, "^{$1}");
    return s;
  }

  function formatMathSpan(escapedInner) {
    let s = escapedInner
      .replace(/&gt;=/g, "&ge;")
      .replace(/&lt;=/g, "&le;")
      .replace(/\+-/g, "&plusmn;")
      .replace(/\bpi\b/gi, "&pi;")
      .replace(/sqrt\(([^()]+)\)/gi, "&radic;<span class=\"radicand\">$1</span>")
      .replace(/cbrt\(([^()]+)\)/gi, "&#8731;<span class=\"radicand\">$1</span>")
      .replace(/\s*\*\s*/g, " &times; ")
      .replace(/\s+\/\s+/g, " &divide; ");
    s = formatInlinePowers(s);
    // Use true minus sign in maths spans (safe because HTML tags have no '-' in tag names)
    s = s.replace(/-/g, "&minus;");
    return "<span class=\"math\">" + s + "</span>";
  }

  // Escapes HTML first, then formats backticked maths expressions (`...`) with KaTeX
  // when available in the browser (falling back to clean escaped HTML in Node).
  function formatMathHtml(text) {
    const raw = String(text == null ? "" : text);
    const parts = raw.split(/`([^`]+)`/);
    const useKatex = typeof katex !== "undefined" && typeof katex.renderToString === "function";
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        if (useKatex) {
          out += katex.renderToString(toLatex(parts[i]), { throwOnError: false, strict: false });
        } else {
          out += formatMathSpan(escapeHtml(parts[i]));
        }
      } else {
        out += formatInlinePowers(
          escapeHtml(parts[i])
            .replace(/&gt;=/g, "&ge;")
            .replace(/&lt;=/g, "&le;")
            .replace(/\+-/g, "&plusmn;")
        );
      }
    }
    return out;
  }

  // ── Cartesian graph layout & SVG renderer ──

  function graphLayout(spec) {
    const xMin = spec.xMin !== undefined ? spec.xMin : -6;
    const xMax = spec.xMax !== undefined ? spec.xMax : 6;
    const yMin = spec.yMin !== undefined ? spec.yMin : -6;
    const yMax = spec.yMax !== undefined ? spec.yMax : 6;
    const width = spec.width || 380;
    const height = spec.height || 380;
    const pad = spec.pad || 34;
    const plotW = width - 2 * pad;
    const plotH = height - 2 * pad;

    function toSvg(x, y) {
      return {
        px: pad + ((x - xMin) / (xMax - xMin)) * plotW,
        py: pad + ((yMax - y) / (yMax - yMin)) * plotH,
      };
    }

    function fromSvg(px, py) {
      return {
        x: xMin + ((px - pad) / plotW) * (xMax - xMin),
        y: yMax - ((py - pad) / plotH) * (yMax - yMin),
      };
    }

    function clampSnap(val, min, max, step) {
      const s = step || 1;
      const snapped = Math.round(val / s) * s;
      const fixed = Number(snapped.toFixed(6));
      return Math.max(min, Math.min(max, fixed));
    }

    return { xMin, xMax, yMin, yMax, width, height, pad, plotW, plotH, toSvg, fromSvg, clampSnap };
  }

  function autoTickStep(min, max, requested) {
    if (requested) return requested;
    const span = max - min;
    if (span <= 14) return 1;
    if (span <= 30) return 2;
    return 5;
  }

  function fmtTick(n) {
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  }

  function drawArrowHead(x1, y1, x2, y2, color, size) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const sz = size || 8;
    const ax1 = x2 - sz * Math.cos(angle - Math.PI / 6);
    const ay1 = y2 - sz * Math.sin(angle - Math.PI / 6);
    const ax2 = x2 - sz * Math.cos(angle + Math.PI / 6);
    const ay2 = y2 - sz * Math.sin(angle + Math.PI / 6);
    return "<polygon points=\"" +
      x2.toFixed(1) + "," + y2.toFixed(1) + " " +
      ax1.toFixed(1) + "," + ay1.toFixed(1) + " " +
      ax2.toFixed(1) + "," + ay2.toFixed(1) +
      "\" fill=\"" + escapeHtml(color) + "\" />";
  }

  // Samples a curve fn(x) and breaks into clipped SVG paths within [yMin, yMax]
  function buildCurvePaths(fn, layout) {
    const samples = 180;
    const { xMin, xMax, yMin, yMax, toSvg } = layout;
    const paths = [];
    let current = [];

    function clipY(x0, y0, x1, y1, boundY) {
      const t = (boundY - y0) / (y1 - y0);
      return { x: x0 + t * (x1 - x0), y: boundY };
    }

    let prev = null;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = fn(x);
      if (!Number.isFinite(y)) {
        if (current.length >= 2) paths.push(current);
        current = [];
        prev = null;
        continue;
      }

      const inBox = y >= yMin && y <= yMax;
      if (prev) {
        const prevIn = prev.y >= yMin && prev.y <= yMax;
        if (prevIn && inBox) {
          current.push({ x, y });
        } else if (prevIn && !inBox) {
          const bound = y > yMax ? yMax : yMin;
          current.push(clipY(prev.x, prev.y, x, y, bound));
          if (current.length >= 2) paths.push(current);
          current = [];
        } else if (!prevIn && inBox) {
          const bound = prev.y > yMax ? yMax : yMin;
          current = [clipY(prev.x, prev.y, x, y, bound), { x, y }];
        } else {
          // Check if segment crossed the visible y band completely
          if ((prev.y < yMin && y > yMax) || (prev.y > yMax && y < yMin)) {
            const pA = clipY(prev.x, prev.y, x, y, prev.y < yMin ? yMin : yMax);
            const pB = clipY(prev.x, prev.y, x, y, y > yMax ? yMax : yMin);
            paths.push([pA, pB]);
          }
        }
      } else if (inBox) {
        current.push({ x, y });
      }
      prev = { x, y };
    }
    if (current.length >= 2) paths.push(current);

    return paths.map(pts =>
      pts.map((pt, idx) => {
        const p = toSvg(pt.x, pt.y);
        return (idx === 0 ? "M" : "L") + p.px.toFixed(1) + " " + p.py.toFixed(1);
      }).join(" ")
    );
  }

  function renderGraphSvg(spec) {
    const layout = graphLayout(spec);
    const { xMin, xMax, yMin, yMax, width, height, pad, plotW, plotH, toSvg } = layout;
    const xStep = spec.gridStep || 1;
    const yStep = spec.gridStep || 1;
    const xTick = autoTickStep(xMin, xMax, spec.tickStep);
    const yTick = autoTickStep(yMin, yMax, spec.tickStep);

    const svg = [];
    const aria = spec.ariaLabel || "Coordinate graph";
    svg.push("<svg viewBox=\"0 0 " + width + " " + height + "\" class=\"diagram" + (spec.interactive ? " is-interactive" : "") + "\" role=\"img\" aria-label=\"" + escapeHtml(aria) + "\">");

    // Background box
    svg.push("<rect x=\"" + pad + "\" y=\"" + pad + "\" width=\"" + plotW + "\" height=\"" + plotH + "\" fill=\"var(--card)\" stroke=\"var(--line)\" stroke-width=\"1\" />");

    // Vertical grid lines
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
      const xr = Number(x.toFixed(6));
      const { px } = toSvg(xr, yMin);
      const isAxis = Math.abs(xr) < 1e-6;
      if (!isAxis) {
        svg.push("<line x1=\"" + px.toFixed(1) + "\" y1=\"" + pad + "\" x2=\"" + px.toFixed(1) + "\" y2=\"" + (pad + plotH) + "\" stroke=\"var(--line)\" stroke-width=\"1\" />");
      }
    }

    // Horizontal grid lines
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
      const yr = Number(y.toFixed(6));
      const { py } = toSvg(xMin, yr);
      const isAxis = Math.abs(yr) < 1e-6;
      if (!isAxis) {
        svg.push("<line x1=\"" + pad + "\" y1=\"" + py.toFixed(1) + "\" x2=\"" + (pad + plotW) + "\" y2=\"" + py.toFixed(1) + "\" stroke=\"var(--line)\" stroke-width=\"1\" />");
      }
    }

    // Axes
    const hasYAxis = xMin <= 0 && xMax >= 0;
    const hasXAxis = yMin <= 0 && yMax >= 0;
    const origin = toSvg(0, 0);

    if (hasXAxis) {
      svg.push("<line x1=\"" + pad + "\" y1=\"" + origin.py.toFixed(1) + "\" x2=\"" + (pad + plotW) + "\" y2=\"" + origin.py.toFixed(1) + "\" stroke=\"var(--ink)\" stroke-width=\"1.8\" />");
      svg.push(drawArrowHead(pad, origin.py, pad + plotW + 4, origin.py, "var(--ink)", 7));
      svg.push("<text x=\"" + (pad + plotW + 10) + "\" y=\"" + (origin.py + 4).toFixed(1) + "\" font-size=\"13\" font-weight=\"700\" font-style=\"italic\" fill=\"var(--ink)\">" + escapeHtml(spec.xLabel || "x") + "</text>");
    }
    if (hasYAxis) {
      svg.push("<line x1=\"" + origin.px.toFixed(1) + "\" y1=\"" + (pad + plotH) + "\" x2=\"" + origin.px.toFixed(1) + "\" y2=\"" + pad + "\" stroke=\"var(--ink)\" stroke-width=\"1.8\" />");
      svg.push(drawArrowHead(origin.px, pad + plotH, origin.px, pad - 4, "var(--ink)", 7));
      svg.push("<text x=\"" + (origin.px + 8).toFixed(1) + "\" y=\"" + (pad - 8) + "\" font-size=\"13\" font-weight=\"700\" font-style=\"italic\" fill=\"var(--ink)\">" + escapeHtml(spec.yLabel || "y") + "</text>");
    }

    // Tick labels
    const xLabelY = hasXAxis ? Math.min(pad + plotH + 15, origin.py + 15) : pad + plotH + 15;
    for (let x = Math.ceil(xMin / xTick) * xTick; x <= xMax + 1e-9; x += xTick) {
      const xr = Number(x.toFixed(6));
      if (Math.abs(xr) < 1e-6) continue;
      const { px } = toSvg(xr, 0);
      svg.push("<text x=\"" + px.toFixed(1) + "\" y=\"" + xLabelY.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"11\" fill=\"var(--muted)\">" + escapeHtml(fmtTick(xr)) + "</text>");
    }

    const yLabelX = hasYAxis ? Math.max(pad - 6, origin.px - 7) : pad - 7;
    for (let y = Math.ceil(yMin / yTick) * yTick; y <= yMax + 1e-9; y += yTick) {
      const yr = Number(y.toFixed(6));
      if (Math.abs(yr) < 1e-6) continue;
      const { py } = toSvg(0, yr);
      svg.push("<text x=\"" + yLabelX.toFixed(1) + "\" y=\"" + (py + 4).toFixed(1) + "\" text-anchor=\"end\" font-size=\"11\" fill=\"var(--muted)\">" + escapeHtml(fmtTick(yr)) + "</text>");
    }

    if (hasXAxis && hasYAxis) {
      svg.push("<text x=\"" + (origin.px - 6).toFixed(1) + "\" y=\"" + (origin.py + 14).toFixed(1) + "\" text-anchor=\"end\" font-size=\"11\" fill=\"var(--muted)\">0</text>");
    }

    // Curves
    for (const curve of spec.curves || []) {
      const ds = buildCurvePaths(curve.fn, layout);
      const col = curve.color || "var(--pc)";
      const dash = curve.dashed ? " stroke-dasharray=\"6 5\"" : "";
      const sw = curve.strokeWidth || 2.5;
      for (const d of ds) {
        svg.push("<path d=\"" + d + "\" fill=\"none\" stroke=\"" + escapeHtml(col) + "\" stroke-width=\"" + sw + "\"" + dash + " stroke-linecap=\"round\" />");
      }
    }

    // Segments / vectors
    for (const seg of spec.segments || []) {
      const p1 = toSvg(seg.x1, seg.y1);
      const p2 = toSvg(seg.x2, seg.y2);
      const col = seg.color || "var(--pc)";
      const dash = seg.dashed ? " stroke-dasharray=\"5 4\"" : "";
      svg.push("<line x1=\"" + p1.px.toFixed(1) + "\" y1=\"" + p1.py.toFixed(1) + "\" x2=\"" + p2.px.toFixed(1) + "\" y2=\"" + p2.py.toFixed(1) + "\" stroke=\"" + escapeHtml(col) + "\" stroke-width=\"" + (seg.strokeWidth || 2.4) + "\"" + dash + " />");
      if (seg.arrow) {
        svg.push(drawArrowHead(p1.px, p1.py, p2.px, p2.py, col, 9));
      }
      if (seg.label) {
        const mx = (p1.px + p2.px) / 2 + (seg.dx || 6);
        const my = (p1.py + p2.py) / 2 + (seg.dy || -6);
        svg.push("<text x=\"" + mx.toFixed(1) + "\" y=\"" + my.toFixed(1) + "\" font-size=\"12\" font-weight=\"700\" fill=\"" + escapeHtml(col) + "\">" + escapeHtml(seg.label) + "</text>");
      }
    }

    // Static points
    for (const pt of spec.points || []) {
      const p = toSvg(pt.x, pt.y);
      const col = pt.color || "var(--pc)";
      const r = pt.radius || 4.5;
      svg.push("<circle cx=\"" + p.px.toFixed(1) + "\" cy=\"" + p.py.toFixed(1) + "\" r=\"" + r + "\" fill=\"" + escapeHtml(col) + "\" stroke=\"var(--card)\" stroke-width=\"1.5\" />");
      if (pt.label) {
        svg.push("<text x=\"" + (p.px + 7).toFixed(1) + "\" y=\"" + (p.py - 7).toFixed(1) + "\" font-size=\"12\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(pt.label) + "</text>");
      }
    }

    if (spec.interactive) {
      svg.push("<g class=\"plot-solution\"></g>");
      svg.push("<g class=\"plot-preview\"></g>");
      svg.push("<g class=\"plot-user-points\"></g>");
    }

    svg.push("</svg>");
    return svg.join("");
  }

  // ── Geometry & trigonometry diagrams ──

  function renderTriangleSvg(spec) {
    const width = spec.width || 360;
    const height = spec.height || 220;
    const svg = ["<svg viewBox=\"0 0 " + width + " " + height + "\" class=\"diagram\" role=\"img\" aria-label=\"" + escapeHtml(spec.ariaLabel || "Triangle diagram") + "\">"];

    if (spec.rightAngle !== false && !spec.points) {
      const flip = spec.orientation === "left";
      const ax = flip ? 285 : 75;
      const ay = 175;
      const bx = flip ? 75 : 285;
      const by = 175;
      const cx = flip ? 285 : 75;
      const cy = 45;

      svg.push("<polygon points=\"" + ax + "," + ay + " " + bx + "," + by + " " + cx + "," + cy + "\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linejoin=\"round\" />");
      // Right-angle square marker at A
      const s = 14;
      const sx = flip ? ax - s : ax + s;
      svg.push("<polyline points=\"" + ax + "," + (ay - s) + " " + sx + "," + (ay - s) + " " + sx + "," + ay + "\" fill=\"none\" stroke=\"var(--muted)\" stroke-width=\"1.6\" />");

      if (spec.angle) {
        const arcX = flip ? bx + 28 : bx - 28;
        const arcEndX = flip ? bx + 23 : bx - 23;
        const arcEndY = by - 17;
        svg.push("<path d=\"M " + arcX + " " + by + " A 28 28 0 0 " + (flip ? "0" : "1") + " " + arcEndX + " " + arcEndY + "\" fill=\"none\" stroke=\"var(--pc)\" stroke-width=\"2\" />");
        const labelX = flip ? bx + 38 : bx - 52;
        svg.push("<text x=\"" + labelX + "\" y=\"" + (by - 8) + "\" font-size=\"13\" font-weight=\"700\" fill=\"var(--pc)\">" + escapeHtml(spec.angle) + "</text>");
      }

      if (spec.adj) {
        svg.push("<text x=\"" + ((ax + bx) / 2) + "\" y=\"" + (ay + 22) + "\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(spec.adj) + "</text>");
      }
      if (spec.opp) {
        const ox = flip ? ax + 14 : ax - 14;
        const anchor = flip ? "start" : "end";
        svg.push("<text x=\"" + ox + "\" y=\"" + ((ay + cy) / 2 + 5) + "\" text-anchor=\"" + anchor + "\" font-size=\"14\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(spec.opp) + "</text>");
      }
      if (spec.hyp) {
        const hx = (bx + cx) / 2 + (flip ? -12 : 12);
        const hy = (by + cy) / 2 - 8;
        const anchor = flip ? "end" : "start";
        svg.push("<text x=\"" + hx + "\" y=\"" + hy + "\" text-anchor=\"" + anchor + "\" font-size=\"14\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(spec.hyp) + "</text>");
      }
    } else {
      const pts = spec.points || [[65, 175], [295, 175], [160, 45]];
      const pStr = pts.map(p => p[0] + "," + p[1]).join(" ");
      svg.push("<polygon points=\"" + pStr + "\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linejoin=\"round\" />");

      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;

      if (Array.isArray(spec.vertices)) {
        pts.forEach((p, idx) => {
          if (!spec.vertices[idx]) return;
          const dx = p[0] - cx;
          const dy = p[1] - cy;
          const len = Math.hypot(dx, dy) || 1;
          const lx = p[0] + (dx / len) * 16;
          const ly = p[1] + (dy / len) * 16 + 4;
          svg.push("<text x=\"" + lx.toFixed(1) + "\" y=\"" + ly.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"var(--pc)\">" + escapeHtml(spec.vertices[idx]) + "</text>");
        });
      }

      if (Array.isArray(spec.sides)) {
        const edges = [[0, 1], [1, 2], [2, 0]];
        edges.forEach(([i, j], idx) => {
          if (!spec.sides[idx]) return;
          const mx = (pts[i][0] + pts[j][0]) / 2;
          const my = (pts[i][1] + pts[j][1]) / 2;
          const dx = mx - cx;
          const dy = my - cy;
          const len = Math.hypot(dx, dy) || 1;
          const lx = mx + (dx / len) * 18;
          const ly = my + (dy / len) * 18 + 4;
          svg.push("<text x=\"" + lx.toFixed(1) + "\" y=\"" + ly.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(spec.sides[idx]) + "</text>");
        });
      }
    }

    if (spec.northArrow) {
      svg.push("<line x1=\"36\" y1=\"76\" x2=\"36\" y2=\"28\" stroke=\"var(--muted)\" stroke-width=\"1.8\" />");
      svg.push(drawArrowHead(36, 76, 36, 26, "var(--muted)", 7));
      svg.push("<text x=\"36\" y=\"20\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"var(--muted)\">N</text>");
    }

    svg.push("</svg>");
    return svg.join("");
  }

  function renderSectorSvg(spec) {
    const width = spec.width || 320;
    const height = spec.height || 220;
    const cx = 135;
    const cy = 155;
    const r = 92;
    const deg = Math.max(15, Math.min(340, spec.angleDeg || 60));
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + r;
    const y1 = cy;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy - r * Math.sin(rad);
    const largeArc = deg > 180 ? 1 : 0;

    const svg = ["<svg viewBox=\"0 0 " + width + " " + height + "\" class=\"diagram\" role=\"img\" aria-label=\"" + escapeHtml(spec.ariaLabel || "Circle sector diagram") + "\">"];
    if (spec.showFullCircle !== false) {
      svg.push("<circle cx=\"" + cx + "\" cy=\"" + cy + "\" r=\"" + r + "\" fill=\"none\" stroke=\"var(--line)\" stroke-width=\"1.5\" stroke-dasharray=\"5 4\" />");
    }
    svg.push("<path d=\"M " + cx + " " + cy + " L " + x1.toFixed(1) + " " + y1.toFixed(1) + " A " + r + " " + r + " 0 " + largeArc + " 0 " + x2.toFixed(1) + " " + y2.toFixed(1) + " Z\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linejoin=\"round\" />");
    svg.push("<path d=\"M " + x1.toFixed(1) + " " + y1.toFixed(1) + " A " + r + " " + r + " 0 " + largeArc + " 0 " + x2.toFixed(1) + " " + y2.toFixed(1) + "\" fill=\"none\" stroke=\"var(--pc)\" stroke-width=\"3.2\" stroke-linecap=\"round\" />");

    // Angle arc
    const ar = 24;
    const ax1 = cx + ar;
    const ax2 = cx + ar * Math.cos(rad);
    const ay2 = cy - ar * Math.sin(rad);
    svg.push("<path d=\"M " + ax1 + " " + cy + " A " + ar + " " + ar + " 0 " + largeArc + " 0 " + ax2.toFixed(1) + " " + ay2.toFixed(1) + "\" fill=\"none\" stroke=\"var(--pc)\" stroke-width=\"1.8\" />");

    if (spec.angleLabel) {
      const mid = rad / 2;
      const lx = cx + 42 * Math.cos(mid);
      const ly = cy - 42 * Math.sin(mid) + 4;
      svg.push("<text x=\"" + lx.toFixed(1) + "\" y=\"" + ly.toFixed(1) + "\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"var(--pc)\">" + escapeHtml(spec.angleLabel) + "</text>");
    }
    if (spec.radiusLabel) {
      svg.push("<text x=\"" + (cx + r / 2) + "\" y=\"" + (cy + 20) + "\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"700\" fill=\"var(--ink)\">" + escapeHtml(spec.radiusLabel) + "</text>");
    }
    svg.push("</svg>");
    return svg.join("");
  }

  function renderVisualSvg(spec) {
    if (!spec || typeof spec !== "object") return "";
    if (spec.type === "graph" || spec.type === "vectorGrid") return renderGraphSvg(spec);
    if (spec.type === "triangle") return renderTriangleSvg(spec);
    if (spec.type === "sector") return renderSectorSvg(spec);
    return "";
  }

  return {
    escapeHtml,
    toLatex,
    formatMathHtml,
    graphLayout,
    renderGraphSvg,
    renderTriangleSvg,
    renderSectorSvg,
    renderVisualSvg,
  };
})();

if (typeof module !== "undefined") module.exports = VISUALS;
