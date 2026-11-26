// Rule packs: checks that scan question text for impossible or wrong values,
// for example the IP address 333.444.55.666 or the price £14.999.
//
// The checker runs every rule pack listed in CONFIG.rulePacks over the text of
// every question: q, options, w, and (for dynamic questions) every generated
// instance, including worked steps and the displayed answer.
// "broken-output" always runs, whatever the config says.
//
// Each rule:
//   id          short name used in CONFIG.rulePacks
//   description what it checks, in plain English
//   level       "error" (the question fails) or "warning" (a person should look)
//   find        a regular expression with the g flag that finds candidates
//   check(m)    gets one regex match; returns a problem message, or null if fine
//   examples    { good: [...], bad: [...] } — tests/rule-packs.test.js checks
//               every bad example is caught and every good one is not.
//
// Exam-specific rules go in src/subject-rules.js, in exactly the same shape.
const RULE_PACKS = (function () {
  "use strict";
  const VT = typeof VALUE_TYPES !== "undefined" ? VALUE_TYPES
    : (typeof require === "function" ? require("./value-types.js") : null);

  const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december"];

  const rules = [
    {
      id: "broken-output",
      description: "Text that shows a bug: NaN, Infinity or [object Object]. (Lower-case words like \"undefined gradient\" are fine.)",
      level: "error",
      find: /\bNaN\b|\bInfinity\b|\[object Object\]/g,
      check: m => 'contains "' + m[0] + '", which is a bug in the question or generator',
      examples: {
        good: ["The answer is 12.", "The gradient of a vertical line is undefined.", "It tends to infinity."],
        bad: ["The answer is NaN.", "x = Infinity", "See [object Object]"],
      },
    },
    {
      id: "ipv4",
      description: "Every IPv4 address has 4 parts, each 0–255, with no leading zeros.",
      level: "error",
      find: /(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?![\d.]*\d)/g,
      check: m => VT.isValidIPv4(m[0]) ? null : '"' + m[0] + '" is not a valid IPv4 address (each part must be 0–255, no leading zeros)',
      examples: {
        good: ["Ping 192.168.1.10 first.", "The DNS server is 8.8.8.8."],
        bad: ["Ping 333.444.55.666 first.", "The host is 192.168.1.256.", "Use 10.01.0.1"],
      },
    },
    {
      id: "ipv4-public-private",
      description: "An address called private must be in a private range (10/8, 172.16/12, 192.168/16), and one called public must not be.",
      level: "error",
      find: /\b(public|private)\s+(?:IPv4\s+|IP\s+)?(?:address\s+)?(?:of\s+|is\s+)?(\d{1,3}(?:\.\d{1,3}){3})\b/gi,
      check: m => {
        const kind = m[1].toLowerCase(), ip = m[2];
        if (!VT.isValidIPv4(ip)) return null; // the ipv4 rule reports this
        if (kind === "private" && !VT.isPrivateIPv4(ip)) return '"' + ip + '" is called private but is not in a private range (10/8, 172.16/12, 192.168/16)';
        if (kind === "public" && !VT.isPublicIPv4(ip)) return '"' + ip + '" is called public but is a private or special-use address';
        return null;
      },
      examples: {
        good: ["The private IP 192.168.4.20 is on the LAN.", "Its public IP address is 81.2.69.160."],
        bad: ["The private IP 172.32.1.1 is on the LAN.", "Its public IP address is 192.168.1.1.", "The public address 127.0.0.1 is used."],
      },
    },
    {
      id: "cidr",
      description: "A CIDR prefix after an address is /0 to /32.",
      level: "error",
      find: /\b(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,3})\b/g,
      check: m => Number(m[2]) <= 32 ? null : '"/' + m[2] + '" is not a valid IPv4 prefix (0–32)',
      examples: {
        good: ["The subnet is 10.0.0.0/8.", "Use 192.168.1.0/24."],
        bad: ["The subnet is 10.0.0.0/33.", "Use 192.168.1.0/240."],
      },
    },
    {
      id: "subnet-mask",
      description: "A subnet mask is all 1s then all 0s in binary, e.g. 255.255.255.192, never 255.255.0.255.",
      level: "error",
      find: /\b(?:subnet\s+)?mask\s+(?:of\s+|is\s+)?(\d{1,3}(?:\.\d{1,3}){3})\b/gi,
      check: m => VT.isValidSubnetMask(m[1]) ? null : '"' + m[1] + '" is not a real subnet mask (the 1s must all be on the left)',
      examples: {
        good: ["The subnet mask is 255.255.255.192.", "A mask of 255.255.0.0 is a /16."],
        bad: ["The subnet mask is 255.255.0.255.", "A mask of 255.255.255.100 is used."],
      },
    },
    {
      id: "port",
      description: "A TCP/UDP port number is 0–65535.",
      level: "error",
      find: /\bports?\s+(?:number\s+)?(\d+)\b/gi,
      check: m => Number(m[1]) <= 65535 ? null : '"port ' + m[1] + '" is out of range (0–65535)',
      examples: {
        good: ["HTTPS uses port 443.", "Open port number 3389."],
        bad: ["HTTPS uses port 70000.", "Open port number 99999."],
      },
    },
    {
      id: "mac",
      description: "A MAC address is 6 pairs of hexadecimal digits (0–9, A–F).",
      level: "error",
      find: /\b[0-9A-Za-z]{2}([:-])(?:[0-9A-Za-z]{2}\1){4}[0-9A-Za-z]{2}\b/g,
      check: m => VT.isValidMac(m[0]) ? null : '"' + m[0] + '" is not a valid MAC address (hex digits 0–9, A–F only)',
      examples: {
        good: ["The NIC is 00:1A:2B:3C:4D:5E.", "MAC 02-00-5E-10-00-01."],
        bad: ["The NIC is 00:1G:2B:3C:4D:5E.", "MAC ZZ-00-5E-10-00-01."],
      },
    },
    {
      id: "money",
      description: "Money in £, $ or € has 0 or 2 decimal places, never 1 or 3+ (so £14.50, not £14.5 or £14.999).",
      level: "error",
      find: /[£$€]\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?![\d,])/g,
      check: m => {
        const dp = m[1];
        if (dp === undefined || dp.length === 2) return null;
        return '"' + m[0] + '" has ' + dp.length + " decimal place" + (dp.length === 1 ? "" : "s") + "; money needs 0 or 2";
      },
      examples: {
        good: ["It costs £14.99.", "A total of $1,250.00.", "Pay €3."],
        bad: ["It costs £14.999.", "Change of £0.5 is given.", "A fee of $12.3."],
      },
    },
    {
      id: "percentage",
      description: "A percentage below 0 or above 100 is flagged for a person to check (it is right for increases, wrong for shares or marks).",
      level: "warning",
      find: /(-?\d+(?:\.\d+)?)\s?%/g,
      check: m => {
        const v = Number(m[1]);
        return v < 0 || v > 100 ? '"' + m[0] + '" is outside 0–100%. Fine for an increase; wrong for a share, mark or probability' : null;
      },
      examples: {
        good: ["She scored 85%.", "VAT is 20%."],
        bad: ["She scored 115%.", "A share of -5%."],
      },
    },
    {
      id: "time24",
      description: "A 24-hour time HH:MM has hours 00–23 and minutes 00–59. (Off by default: it can mistake ratios like 12:75 for times.)",
      level: "error",
      find: /\b(\d{2}):(\d{2})(?::(\d{2}))?\b/g,
      check: m => VT.isValidTime24(m[0]) ? null : '"' + m[0] + '" is not a valid 24-hour time',
      examples: {
        good: ["The train leaves at 09:45.", "Backups run at 23:59:30."],
        bad: ["The train leaves at 25:10.", "Backups run at 12:75."],
      },
    },
    {
      id: "date",
      description: "A date must exist: no 31 April, no 29 February in a non-leap year, no month 13.",
      level: "error",
      find: /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?\b/gi,
      check: m => {
        if (m[1]) return VT.isValidDate(m[0]) ? null : '"' + m[0] + '" is not a real date';
        const day = Number(m[4]);
        const month = MONTHS.indexOf(m[5].toLowerCase()) + 1;
        const year = m[6] ? Number(m[6]) : 2024; // no year: allow 29 February
        return day >= 1 && day <= VT.daysInMonth(year, month) ? null : '"' + m[0] + '" is not a real date';
      },
      examples: {
        good: ["It was released on 2026-08-07.", "Due on 29 February 2028.", "Meet on 30th April."],
        bad: ["It was released on 2026-13-07.", "Due on 29 February 2027.", "Meet on 31st April."],
      },
    },
  ];

  const byId = {};
  for (const r of rules) byId[r.id] = r;

  // Run a list of rules over one piece of text. Returns [{ id, level, message }].
  function scan(text, ruleList) {
    const found = [];
    if (typeof text !== "string" || text.length === 0) return found;
    for (const rule of ruleList) {
      const re = new RegExp(rule.find.source, rule.find.flags.includes("g") ? rule.find.flags : rule.find.flags + "g");
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        const problem = rule.check(m, text);
        if (problem) found.push({ id: rule.id, level: rule.level === "warning" ? "warning" : "error", message: problem });
      }
    }
    return found;
  }

  return { rules, byId, scan, ALWAYS_ON: ["broken-output"] };
})();

if (typeof module !== "undefined") module.exports = RULE_PACKS;
