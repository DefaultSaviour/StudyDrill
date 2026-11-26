// Value types for dynamic questions that are NOT maths: networking, times, dates.
// (Maths value types — randInt, randDecimal, randMoney, randAngle, randTriangleAngles,
//  randPercentage, randProperFraction — live in src/math-engine.js.)
//
// Every generator here only ever returns VALID values, and every type has a
// matching "is valid" check. tests/value-types.test.js generates thousands of
// each and checks them, so a broken type fails npm test.
//
// Dynamic questions get these through the second argument of generate(rng, M):
//   const ip = M.randPrivateIPv4(rng);
// Pure functions, no dependencies. Works in the browser (<script>) and Node (require).
const VALUE_TYPES = (function () {
  "use strict";

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  // ── IPv4 basics ──

  // "192.168.1.5" -> 3232235781. Returns null for anything that is not a valid IPv4.
  function ipToInt(ip) {
    if (typeof ip !== "string") return null;
    const parts = ip.trim().split(".");
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return null;
      if (p.length > 1 && p[0] === "0") return null; // no leading zeros: "01" is ambiguous
      const v = Number(p);
      if (v > 255) return null;
      n = n * 256 + v;
    }
    return n;
  }

  function intToIp(n) {
    if (!Number.isInteger(n) || n < 0 || n > 0xFFFFFFFF) throw new Error("Not a 32-bit address: " + n);
    return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
  }

  function isValidIPv4(ip) {
    return ipToInt(ip) !== null;
  }

  // Address blocks, as [first address, prefix length].
  const PRIVATE_BLOCKS = [["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16]]; // RFC 1918
  const SPECIAL_BLOCKS = [
    ["0.0.0.0", 8],         // "this network"
    ["100.64.0.0", 10],     // carrier-grade NAT (RFC 6598)
    ["127.0.0.0", 8],       // loopback
    ["169.254.0.0", 16],    // link-local (APIPA)
    ["192.0.0.0", 24],      // IETF protocol assignments
    ["192.0.2.0", 24],      // documentation TEST-NET-1
    ["198.18.0.0", 15],     // benchmarking
    ["198.51.100.0", 24],   // documentation TEST-NET-2
    ["203.0.113.0", 24],    // documentation TEST-NET-3
    ["224.0.0.0", 4],       // multicast
    ["240.0.0.0", 4],       // reserved, includes 255.255.255.255 broadcast
  ];

  function prefixToMaskInt(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Prefix must be 0–32: " + prefix);
    return prefix === 0 ? 0 : (0xFFFFFFFF - (Math.pow(2, 32 - prefix) - 1));
  }

  function inBlock(n, block) {
    const start = ipToInt(block[0]);
    const size = Math.pow(2, 32 - block[1]);
    return n >= start && n < start + size;
  }

  function isPrivateIPv4(ip) {
    const n = ipToInt(ip);
    return n !== null && PRIVATE_BLOCKS.some(b => inBlock(n, b));
  }

  function isSpecialIPv4(ip) {
    const n = ipToInt(ip);
    return n !== null && SPECIAL_BLOCKS.some(b => inBlock(n, b));
  }

  // Public = a normal internet address: valid, not private, not special-use.
  function isPublicIPv4(ip) {
    return isValidIPv4(ip) && !isPrivateIPv4(ip) && !isSpecialIPv4(ip);
  }

  function randomInBlock(rng, block) {
    const start = ipToInt(block[0]);
    const size = Math.pow(2, 32 - block[1]);
    // Avoid the first (network) and last (broadcast) address of the block.
    return intToIp(start + randInt(rng, 1, size - 2));
  }

  // Any address someone might type: a private or a public one.
  function randIPv4(rng) {
    return rng() < 0.5 ? randPrivateIPv4(rng) : randPublicIPv4(rng);
  }

  // options.block: "10" | "172" | "192" to force one private range.
  function randPrivateIPv4(rng, options) {
    const want = options && options.block;
    const blocks = want ? PRIVATE_BLOCKS.filter(b => b[0].startsWith(String(want) + ".")) : PRIVATE_BLOCKS;
    if (blocks.length === 0) throw new Error("Unknown private block: " + want);
    return randomInBlock(rng, blocks[Math.floor(rng() * blocks.length)]);
  }

  function randPublicIPv4(rng) {
    for (let i = 0; i < 1000; i++) {
      const ip = [randInt(rng, 1, 223), randInt(rng, 0, 255), randInt(rng, 0, 255), randInt(rng, 1, 254)].join(".");
      if (isPublicIPv4(ip)) return ip;
    }
    throw new Error("Could not find a public IPv4 address");
  }

  // ── Subnets ──

  function maskToPrefix(mask) {
    const n = ipToInt(mask);
    if (n === null) return null;
    for (let p = 0; p <= 32; p++) if (prefixToMaskInt(p) === n) return p;
    return null; // not a real mask: the 1s are not all on the left
  }

  function isValidSubnetMask(mask) {
    return maskToPrefix(mask) !== null;
  }

  function prefixToMask(prefix) {
    return intToIp(prefixToMaskInt(prefix));
  }

  // Default 8–30: /31 and /32 are special cases that confuse beginner questions.
  function randCidrPrefix(rng, min, max) {
    const lo = min === undefined ? 8 : min;
    const hi = max === undefined ? 30 : max;
    if (lo < 0 || hi > 32 || lo > hi) throw new Error("Prefix range must be inside 0–32");
    return randInt(rng, lo, hi);
  }

  function randSubnetMask(rng, min, max) {
    return prefixToMask(randCidrPrefix(rng, min, max));
  }

  function networkAddress(ip, prefix) {
    const n = ipToInt(ip);
    if (n === null) throw new Error("Not a valid IPv4: " + ip);
    const size = Math.pow(2, 32 - prefix);
    return intToIp(Math.floor(n / size) * size);
  }

  function broadcastAddress(ip, prefix) {
    const size = Math.pow(2, 32 - prefix);
    return intToIp(ipToInt(networkAddress(ip, prefix)) + size - 1);
  }

  // Usable hosts: /31 and /32 have no network/broadcast pair, so they are special.
  function usableHosts(prefix) {
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return Math.pow(2, 32 - prefix) - 2;
  }

  // A usable host address inside the given network (never the network or broadcast address).
  function randHostInSubnet(rng, network, prefix) {
    if (prefix > 30) throw new Error("randHostInSubnet needs a prefix of 30 or less");
    const start = ipToInt(networkAddress(network, prefix));
    return intToIp(start + randInt(rng, 1, Math.pow(2, 32 - prefix) - 2));
  }

  function isInSubnet(ip, network, prefix) {
    return isValidIPv4(ip) && networkAddress(ip, prefix) === networkAddress(network, prefix);
  }

  // ── Ports and MAC addresses ──

  // options.range: "well-known" (0–1023), "registered" (1024–49151), "dynamic" (49152–65535)
  function randPort(rng, options) {
    const r = options && options.range;
    if (r === "well-known") return randInt(rng, 1, 1023);
    if (r === "registered") return randInt(rng, 1024, 49151);
    if (r === "dynamic") return randInt(rng, 49152, 65535);
    return randInt(rng, 1, 65535);
  }

  function isValidPort(n) {
    return Number.isInteger(n) && n >= 0 && n <= 65535;
  }

  function randMac(rng) {
    const bytes = [];
    for (let i = 0; i < 6; i++) bytes.push(randInt(rng, 0, 255));
    bytes[0] = (bytes[0] & 0xFC) | 0x02; // locally administered, unicast: never a real vendor's address
    return bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(":");
  }

  function isValidMac(mac) {
    return typeof mac === "string" && /^[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}$/.test(mac.trim());
  }

  // ── Times and dates ──

  function pad2(n) { return String(n).padStart(2, "0"); }

  // 24-hour clock "HH:MM".
  function randTime24(rng) {
    return pad2(randInt(rng, 0, 23)) + ":" + pad2(randInt(rng, 0, 59));
  }

  function isValidTime24(t) {
    const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(t).trim());
    if (!m) return false;
    return Number(m[1]) <= 23 && Number(m[2]) <= 59 && (m[3] === undefined || Number(m[3]) <= 59);
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }

  // ISO date "YYYY-MM-DD" between two years (inclusive).
  function randDate(rng, fromYear, toYear) {
    const lo = fromYear === undefined ? 2000 : fromYear;
    const hi = toYear === undefined ? 2030 : toYear;
    if (lo > hi) throw new Error("fromYear cannot be after toYear");
    const y = randInt(rng, lo, hi);
    const m = randInt(rng, 1, 12);
    const d = randInt(rng, 1, daysInMonth(y, m));
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  function isValidDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
    if (!m) return false;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
  }

  return {
    // IPv4
    ipToInt, intToIp, isValidIPv4, isPrivateIPv4, isPublicIPv4, isSpecialIPv4,
    randIPv4, randPrivateIPv4, randPublicIPv4,
    // subnets
    prefixToMask, maskToPrefix, isValidSubnetMask, randCidrPrefix, randSubnetMask,
    networkAddress, broadcastAddress, usableHosts, randHostInSubnet, isInSubnet,
    // ports, MAC
    randPort, isValidPort, randMac, isValidMac,
    // time and date
    randTime24, isValidTime24, randDate, isValidDate, isLeapYear, daysInMonth,
  };
})();

if (typeof module !== "undefined") module.exports = VALUE_TYPES;
