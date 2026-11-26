// Every value type: generate thousands, check each one is valid for its type.
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../src/value-types.js");

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const N = 10000;

test("ipToInt / intToIp round-trip and reject bad addresses", () => {
  assert.equal(V.ipToInt("192.168.1.5"), 3232235781);
  assert.equal(V.intToIp(3232235781), "192.168.1.5");
  for (const bad of ["333.444.55.666", "192.168.1.256", "1.2.3", "1.2.3.4.5", "10.01.0.1", "a.b.c.d", "", null]) {
    assert.equal(V.isValidIPv4(bad), false, String(bad));
  }
});

test("private, public and special addresses are told apart", () => {
  assert.equal(V.isPrivateIPv4("10.0.0.1"), true);
  assert.equal(V.isPrivateIPv4("172.16.0.1"), true);
  assert.equal(V.isPrivateIPv4("172.31.255.254"), true);
  assert.equal(V.isPrivateIPv4("172.32.0.1"), false);
  assert.equal(V.isPrivateIPv4("192.168.0.1"), true);
  assert.equal(V.isPrivateIPv4("192.169.0.1"), false);
  assert.equal(V.isPublicIPv4("8.8.8.8"), true);
  for (const special of ["127.0.0.1", "169.254.1.1", "224.0.0.5", "255.255.255.255", "0.0.0.0", "100.64.0.1", "192.0.2.10"]) {
    assert.equal(V.isPublicIPv4(special), false, special);
  }
});

test(N + " random private IPv4 addresses are all valid and private", () => {
  const rng = seeded(1);
  for (let i = 0; i < N; i++) {
    const ip = V.randPrivateIPv4(rng);
    assert.ok(V.isValidIPv4(ip) && V.isPrivateIPv4(ip), ip);
  }
  for (const block of ["10", "172", "192"]) {
    const ip = V.randPrivateIPv4(rng, { block });
    assert.ok(ip.startsWith(block + "."), ip);
  }
});

test(N + " random public IPv4 addresses are all valid and public", () => {
  const rng = seeded(2);
  for (let i = 0; i < N; i++) {
    const ip = V.randPublicIPv4(rng);
    assert.ok(V.isPublicIPv4(ip), ip);
  }
});

test(N + " random IPv4 addresses are all valid", () => {
  const rng = seeded(3);
  for (let i = 0; i < N; i++) assert.ok(V.isValidIPv4(V.randIPv4(rng)));
});

test("subnet masks: only real masks are valid, and prefixes convert both ways", () => {
  assert.equal(V.prefixToMask(24), "255.255.255.0");
  assert.equal(V.prefixToMask(26), "255.255.255.192");
  assert.equal(V.prefixToMask(0), "0.0.0.0");
  assert.equal(V.prefixToMask(32), "255.255.255.255");
  assert.equal(V.maskToPrefix("255.255.240.0"), 20);
  for (const bad of ["255.255.0.255", "255.255.255.100", "0.255.255.255", "255.255.255.256"]) {
    assert.equal(V.isValidSubnetMask(bad), false, bad);
  }
  const rng = seeded(4);
  for (let i = 0; i < N; i++) {
    const p = V.randCidrPrefix(rng);
    assert.ok(p >= 8 && p <= 30);
    assert.ok(V.isValidSubnetMask(V.randSubnetMask(rng)));
  }
  assert.throws(() => V.randCidrPrefix(rng, 0, 33));
});

test("network, broadcast and host addresses", () => {
  assert.equal(V.networkAddress("192.168.1.77", 26), "192.168.1.64");
  assert.equal(V.broadcastAddress("192.168.1.77", 26), "192.168.1.127");
  assert.equal(V.usableHosts(24), 254);
  assert.equal(V.usableHosts(30), 2);
  assert.equal(V.usableHosts(31), 2);
  assert.equal(V.usableHosts(32), 1);
  const rng = seeded(5);
  for (let i = 0; i < N; i++) {
    const prefix = V.randCidrPrefix(rng, 16, 30);
    const net = V.networkAddress(V.randPrivateIPv4(rng), prefix);
    const host = V.randHostInSubnet(rng, net, prefix);
    assert.ok(V.isInSubnet(host, net, prefix), host + " in " + net + "/" + prefix);
    assert.notEqual(host, net);
    assert.notEqual(host, V.broadcastAddress(net, prefix));
  }
});

test("ports and MAC addresses", () => {
  const rng = seeded(6);
  for (let i = 0; i < N; i++) {
    assert.ok(V.isValidPort(V.randPort(rng)));
    const wk = V.randPort(rng, { range: "well-known" });
    assert.ok(wk >= 1 && wk <= 1023);
    const dyn = V.randPort(rng, { range: "dynamic" });
    assert.ok(dyn >= 49152 && dyn <= 65535);
    const mac = V.randMac(rng);
    assert.ok(V.isValidMac(mac), mac);
    assert.equal(parseInt(mac.slice(0, 2), 16) & 0x03, 0x02, "locally administered unicast: " + mac);
  }
  assert.equal(V.isValidPort(65536), false);
  assert.equal(V.isValidMac("00:1G:2B:3C:4D:5E"), false);
  assert.equal(V.isValidMac("00:1A-2B:3C:4D:5E"), false, "mixed separators");
});

test("times and dates", () => {
  const rng = seeded(7);
  for (let i = 0; i < N; i++) {
    assert.ok(V.isValidTime24(V.randTime24(rng)));
    assert.ok(V.isValidDate(V.randDate(rng, 1999, 2031)));
  }
  assert.equal(V.isValidTime24("24:00"), false);
  assert.equal(V.isValidTime24("12:60"), false);
  assert.equal(V.isValidDate("2027-02-29"), false);
  assert.equal(V.isValidDate("2028-02-29"), true);
  assert.equal(V.isValidDate("2000-02-29"), true, "2000 is a leap year");
  assert.equal(V.isValidDate("1900-02-29"), false, "1900 is not a leap year");
  assert.equal(V.isValidDate("2026-04-31"), false);
});
