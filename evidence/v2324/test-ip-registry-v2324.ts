// test-ip-registry-v2324.ts — F-049 (v2.3.24): IANA special-purpose
// corpus lengkap di classifyIp (REAL module site/server/src/ssrf-guard.ts).
//
// Korpus diturunkan dari fetch LANGSUNG registry IANA 2026-11-08
// (last updated 2025-10-09) — lihat
// evidence/v2324/iana-registry-corpus-v2324.md untuk tiap entri +
// disposisinya. Setiap entri GR=False diuji DENY dengan reason tepat;
// setiap exception GR=True diuji ALLOW.
//
//   H-IP-01  IPv4 GR=False (baru): 192.88.99.2/32 + /24, 192.0.0.8,
//            192.0.0.170/171, 192.0.0.0/29
//   H-IP-02  IPv4 GR=True exception di dalam 192.0.0.0/24: .9/.10 ALLOW;
//            AS112-v4 / AMT / AS112-legacy ALLOW
//   H-IP-03  IPv6 GR=False (baru): 5f00::/16 SRv6, 100:0:0:1::/64 dummy
//   H-IP-04  2001::/23 default-deny: 2001:1::4 (contoh audit), 2001::1,
//            2001:1::ffff, 2001:0:ffff::1
//   H-IP-05  2001::/23 exception GR=True: PCP/TURN/DNS-SD anycast,
//            AMT, AS112-v6, DETs
//   H-IP-06  2001:20::/28 ORCHIDv2 ALLOW (keputusan F-049: ikuti IANA;
//            koreksi false positive H-SSRF-04)
//   H-IP-07  Batas: 2001:200::1 (di luar /23) ALLOW; 2001:db8 tetap DENY;
//            2001:10::/28 deprecated tetap DENY
//   H-IP-08  Regresi: korpus lama H-SSRF-02/04 tetap DENY (kecuali
//            2001:20 yang pindah ke ALLOW) + publik tetap ALLOW
//
// Run:  bun evidence/v2324/test-ip-registry-v2324.ts   (dari worktree root)
// Exit 0 = semua PASS; exit 1 = ada FAIL. VM evidence only.

import { classifyIp } from "../../site/server/src/ssrf-guard.ts";

let pass = 0;
let fail = 0;
const failures: string[] = [];
type Test = { id: string; name: string; run: () => void };
const tests: Test[] = [];
function test(id: string, name: string, run: () => void): void {
  tests.push({ id, name, run });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected)
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function deny(ip: string, reason: string): void {
  const v = classifyIp(ip);
  assert(!v.ok, `${ip} must be DENY, got ${JSON.stringify(v)}`);
  if (!v.ok) eq(v.reason, reason, `${ip} reason`);
}
function allow(ip: string): void {
  const v = classifyIp(ip);
  assert(v.ok, `${ip} must be ALLOW, got ${JSON.stringify(v)}`);
}

test("H-IP-01", "IPv4 GR=False baru: 6to4 relay + 192.0.0/24 sub-ranges", () => {
  deny("192.88.99.2", "ipv4-6to4-relay-192.88.99/24"); // contoh audit V18
  deny("192.88.99.1", "ipv4-6to4-relay-192.88.99/24"); // /24 (stricter, lihat korpus)
  deny("192.88.99.255", "ipv4-6to4-relay-192.88.99/24");
  deny("192.0.0.8", "ipv4-ietf-192.0.0/24"); // IPv4 dummy address
  deny("192.0.0.170", "ipv4-ietf-192.0.0/24"); // NAT64/DNS64 discovery
  deny("192.0.0.171", "ipv4-ietf-192.0.0/24");
  deny("192.0.0.1", "ipv4-ietf-192.0.0/24"); // Service Continuity /29
  deny("192.0.0.7", "ipv4-ietf-192.0.0/24");
});

test("H-IP-02", "IPv4 GR=True: exception .9/.10 + AS112/AMT ALLOW", () => {
  allow("192.0.0.9"); // PCP Anycast — GR=True di dalam /24
  allow("192.0.0.10"); // TURN Anycast — GR=True di dalam /24
  allow("192.31.196.1"); // AS112-v4
  allow("192.52.193.1"); // AMT
  allow("192.175.48.1"); // Direct Delegation AS112
  allow("8.8.8.8"); // publik biasa
});

test("H-IP-03", "IPv6 GR=False baru: SRv6 + dummy prefix", () => {
  deny("5f00::1", "ipv6-srv6-5f00::/16"); // contoh audit V18
  deny("5f00:ffff::1", "ipv6-srv6-5f00::/16");
  deny("5fff::1", "ipv6-srv6-5f00::/16");
  deny("100:0:0:1::1", "ipv6-dummy-100:0:0:1::/64");
  deny("100:0:0:1::ffff", "ipv6-dummy-100:0:0:1::/64");
  deny("100::1", "ipv6-discard-100::/64");
});

test("H-IP-04", "2001::/23 default-deny: non-exception DENY", () => {
  deny("2001:1::4", "ipv6-ietf-2001::/23-default-deny"); // contoh audit V18
  deny("2001:1::ffff", "ipv6-ietf-2001::/23-default-deny");
  deny("2001:0:ffff::1", "ipv6-teredo-2001::/32"); // hextet ke-2 0x0000 = Teredo /32
  deny("2001:100::1", "ipv6-ietf-2001::/23-default-deny"); // hextet ke-2 0x0100, tanpa exception
  deny("2001::1", "ipv6-teredo-2001::/32"); // Teredo: reason spesifik mendahului default-deny
  deny("2001:2::1", "ipv6-benchmarking-2001:2::/48");
  deny("2001:5::1", "ipv6-ietf-2001::/23-default-deny");
  deny("2001:1ff::1", "ipv6-ietf-2001::/23-default-deny"); // ujung atas /23
});

test("H-IP-05", "2001::/23 exception GR=True ALLOW", () => {
  allow("2001:1::1"); // PCP Anycast
  allow("2001:1::2"); // TURN Anycast
  allow("2001:1::3"); // DNS-SD SRP Anycast
  allow("2001:3::1"); // AMT 2001:3::/32
  allow("2001:3:ffff::1"); // AMT, ujung /32
  allow("2001:4:112::1"); // AS112-v6
  allow("2001:4:112:ffff::1"); // AS112-v6, ujung /48
  allow("2001:30::1"); // DETs 2001:30::/28
  allow("2001:3f::1"); // DETs, ujung /28
});

test("H-IP-06", "2001:20::/28 ORCHIDv2 ALLOW (keputusan F-049: ikuti IANA)", () => {
  allow("2001:20::1"); // false positive H-SSRF-04 yang dikoreksi
  allow("2001:2f:ffff::1"); // ujung /28
  deny("2001:10::1", "ipv6-deprecated-orchid-2001:10::/28"); // ORCHID lama tetap DENY
  deny("2001:1f::1", "ipv6-deprecated-orchid-2001:10::/28"); // ujung /28 lama
});

test("H-IP-07", "Batas /23: di luar prefix ALLOW, dokumentasi tetap DENY", () => {
  allow("2001:200::1"); // second hextet 0x0200 — di luar 2001::/23
  allow("2001:4860:4860::8888"); // Google — unicast global biasa
  allow("2620:4f:8000::1"); // AS112 2620 — GR=True, di luar /23
  deny("2001:db8::1", "ipv6-documentation-2001:db8::/32");
  deny("3fff::1", "ipv6-documentation-3fff::/20");
});

test("H-IP-08", "Regresi korpus lama + publik ALLOW", () => {
  const oldDeny: Array<[string, string]> = [
    ["10.0.0.1", "ipv4-private-10/8"],
    ["127.0.0.1", "ipv4-loopback-127/8"],
    ["169.254.169.254", "ipv4-link-local-169.254/16"],
    ["172.16.0.1", "ipv4-private-172.16/12"],
    ["192.168.1.1", "ipv4-private-192.168/16"],
    ["198.18.0.1", "ipv4-benchmarking-198.18/15"],
    ["224.0.0.1", "ipv4-multicast-224/4"],
    ["240.0.0.1", "ipv4-reserved-240/4"],
    ["100.64.0.1", "ipv4-cgnat-100.64/10"],
    ["::1", "ipv6-loopback-::1"],
    ["::", "ipv6-unspecified-::"],
    ["fe80::1", "ipv6-link-local-fe80::/10"],
    ["fc00::1", "ipv6-ula-fc00::/7"],
    ["ff02::1", "ipv6-multicast-ff00::/8"],
    ["2002::1", "ipv6-6to4-2002::/16"],
  ];
  for (const [ip, reason] of oldDeny) deny(ip, reason);
  allow("93.184.216.34");
  allow("2606:4700:4700::1111");
  allow("1.1.1.1");
});

for (const t of tests) {
  try {
    t.run();
    pass++;
    console.log(`PASS ${t.id} ${t.name}`);
  } catch (err) {
    fail++;
    failures.push(t.id);
    console.log(`FAIL ${t.id} ${t.name} — ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`\nH-IP: ${pass} PASS / ${fail} FAIL (total ${tests.length})`);
if (fail > 0) {
  console.log(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
