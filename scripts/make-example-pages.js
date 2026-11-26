#!/usr/bin/env node
// Makes examples/<name>/drill.html for every example folder, so anyone can try an
// example by double-clicking it. Each page is index.html with its file paths
// pointed back to the main folder, except config.js and bank.js, which come
// from the example's own folder.
// Run after changing index.html:  npm run examples
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function buildExamplePage(indexHtml) {
  return indexHtml
    .replace(/(<script src=")(?!https?:)([^"]+)(")/g, (m, a, src, b) => {
      if (src === "src/config.js") return a + "config.js" + b;
      if (src === "src/bank.js") return a + "bank.js" + b;
      return a + "../../" + src + b;
    })
    .replace(/(<link rel="stylesheet" href=")(?!https?:)([^"]+)(")/g, "$1../../$2$3")
    .replace("<head>", "<head>\n<!-- Made by scripts/make-example-pages.js from index.html. Do not edit by hand. -->");
}

function exampleFolders() {
  const dir = path.join(ROOT, "examples");
  return fs.readdirSync(dir).filter(name =>
    fs.existsSync(path.join(dir, name, "config.js")) && fs.existsSync(path.join(dir, name, "bank.js")));
}

module.exports = { buildExamplePage, exampleFolders };

if (require.main === module) {
  const html = buildExamplePage(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"));
  for (const name of exampleFolders()) {
    fs.writeFileSync(path.join(ROOT, "examples", name, "drill.html"), html);
    console.log("wrote examples/" + name + "/drill.html");
  }
}
