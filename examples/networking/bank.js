// EXAMPLE bank: 2 static and 2 dynamic questions. The dynamic ones use the
// value types in src/value-types.js through M, so every address is valid.
const RFC1918 = "https://www.rfc-editor.org/rfc/rfc1918";
const RFC4632 = "https://www.rfc-editor.org/rfc/rfc4632";

const BANK = [
  {id:"d1-01",p:1,t:"Private ranges",
   q:"Which of these address ranges is private under RFC 1918?",
   o:["172.16.0.0 to 172.31.255.255","172.16.0.0 to 172.32.255.255","169.254.0.0 to 169.254.255.255","100.64.0.0 to 100.127.255.255"],
   a:0,
   w:"The 172 private block is 172.16.0.0/12, which ends at 172.31.255.255, not 172.32. 169.254.0.0/16 is link-local (APIPA) and 100.64.0.0/10 is carrier-grade NAT: both are special-use, but neither is an RFC 1918 private range.",
   src:RFC1918},

  {id:"d1-02",p:1,t:"Private or public",
   title:"Is this address private or public?",
   rule:"Private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. Anything else that is a normal internet address is public.",
   example:"192.168.4.20 is private; 81.2.69.160 is public.",
   src:RFC1918,
   generate(rng, M) {
     const isPrivate = rng() < 0.5;
     const ip = isPrivate ? M.randPrivateIPv4(rng) : M.randPublicIPv4(rng);
     return {
       kind: "mcq",
       q: "Is the address " + ip + " private or public?",
       o: ["Private, in an RFC 1918 range", "Public, routable on the internet", "Loopback, used for testing", "Link-local, from APIPA"],
       a: isPrivate ? 0 : 1,
       w: isPrivate
         ? ip + " is inside one of the three RFC 1918 ranges, so it is private. Loopback starts with 127 and link-local with 169.254."
         : ip + " is outside 10/8, 172.16/12 and 192.168/16 and is not special-use, so it is public. Loopback starts with 127 and link-local with 169.254.",
     };
   }},

  {id:"d2-01",p:2,t:"Prefix to mask",
   q:"Which subnet mask is the same as a /26 prefix?",
   o:["255.255.255.192","255.255.255.128","255.255.255.224","255.255.255.240"],
   a:0,
   w:"/26 means 26 one-bits: 24 for the first three parts, then 2 more, which is 128 + 64 = 192. 255.255.255.128 is only one extra bit (/25), and .224 is three (/27).",
   src:RFC4632},

  {id:"d2-02",p:2,t:"Broadcast address",
   title:"Find the broadcast address of a subnet",
   rule:"The broadcast address is the last address in the subnet: keep the network bits and set every host bit to 1.",
   example:"192.168.1.77/26: the block size is 64, the network is 192.168.1.64, so the broadcast is 192.168.1.127.",
   src:RFC4632,
   generate(rng, M) {
     const prefix = M.randCidrPrefix(rng, 24, 30);
     const network = M.networkAddress(M.randPrivateIPv4(rng, { block: "192" }), prefix);
     const host = M.randHostInSubnet(rng, network, prefix);
     const broadcast = M.broadcastAddress(host, prefix);
     const size = Math.pow(2, 32 - prefix);
     return {
       kind: "input",
       q: "What is the broadcast address of the subnet that contains " + host + "/" + prefix + "?",
       answerType: "exact",
       answer: broadcast,
       displayAnswer: broadcast,
       steps: [
         "A /" + prefix + " leaves " + (32 - prefix) + " host bits, so each block is " + size + " addresses.",
         "The block that contains " + host + " starts at the network address " + network + ".",
         "The broadcast is the last address in the block: " + broadcast + ".",
       ],
       w: "The broadcast address is the network address plus the block size minus one. It is never a usable host address.",
     };
   }},
];

if (typeof module !== "undefined") module.exports = { BANK };
