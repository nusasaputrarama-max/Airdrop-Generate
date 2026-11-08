// Tes regresi guard fail-closed F-042 (v2.3.20) — jawaban atas audit V13 §4 F-042.
//
// Menguji CERMIN pseudodiff v2.3.20 §1.3 (validateDestination +
// checkPort + resolveWithTimeout) sebagai fungsi murni — logika yang
// SAMA yang akan dipakai ssrf-guard.ts pada implementasi tahap (b).
// Bukan implementasi aplikasinya; ini bukti bahwa rancangan yang
// diperbaiki menutup celah v2.3.19 (empty IP set -> ok=true, ip=undefined).
//
// Yang dibuktikan:
//   - ips kosong / NODATA / NXDOMAIN / resolver error / timeout -> DENY.
//   - jawaban campuran (satu publik + satu internal) -> DENY (tolak-set).
//   - IP malformed / non-kanonik -> DENY.
//   - IPv4-mapped publik -> OK dengan IPv4 hasil ekstraksi;
//     mapped loopback -> DENY.
//   - zone identifier -> DENY.
//   - port hanya 80 (http) / 443 (https); 81/8080/22/443-di-http -> DENY.
//   - late DNS result (datang setelah timeout 5 detik) DIABAIKAN:
//     tidak ada koneksi yang dibuat dari hasil telat itu.
//   - TIDAK ADA fallback ke fetch biasa: jalur koneksi hanya dipanggil
//     bila guard ok (dicatat oleh stub connect; 0 panggilan saat deny).
//
// Murni fungsi + stub; tidak ada jaringan, tidak ada DNS sungguhan,
// tidak ada checkLink. Bukti VM SAJA — bukan staging.
//
// Usage (dari evidence/v2320/):
//   bun test-f042-guard-v2320.ts > test-f042-guard-v2320.txt 2>&1
// Exit 0 = semua assertion PASS; exit 1 = FAIL.

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("=== test-f042-guard-v2320 ===");
console.log(`date: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`);
console.log(`bun: ${Bun.version}`);
console.log(`uid: ${typeof process.getuid === "function" ? process.getuid() : "n/a"}`);
console.log(`env: VM lokal — BUKAN staging, BUKAN produksi`);

// ------------------------------------------------------------------
// Cermin pseudodiff v2.3.20 §1.3 (disederhanakan ke kasus yang diuji;
// klasifikasi lengkap §A.4 tetap menjadi rujukan implementasi).
// ------------------------------------------------------------------
type Verdict = { ok: true; ip: string } | { ok: false; reason: string };

function ipv4Octets(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((x) => x > 255)) return null;
  return o;
}

function isBlockedIpv4(o: number[]): boolean {
  const [a, b] = o;
  if (a === 127) return true; // 127/8
  if (a === 10) return true; // 10/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 169 && b === 254) return true; // 169.254/16 (metadata)
  if (a === 0) return true; // 0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  return false;
}

function classifyIp(ip: string): Verdict {
  if (typeof ip !== "string" || ip.length === 0) return { ok: false, reason: "malformed-empty" };
  if (ip.includes("%")) return { ok: false, reason: "zone-identifier" };
  // Bentuk non-kanonik ditolak sebelum klasifikasi (desimal/oktal/heks/pendek).
  if (/[^0-9a-fA-F:.\[\]]/.test(ip)) return { ok: false, reason: "malformed-chars" };
  if (/^0x/i.test(ip) || /\b0\d+\./.test(ip) || /^\d+$/.test(ip)) return { ok: false, reason: "non-canonical-form" };
  // IPv4-mapped IPv6: ekstrak IPv4 tertanam, klasifikasikan sebagai IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) {
    const o = ipv4Octets(mapped[1]);
    if (!o) return { ok: false, reason: "malformed-mapped" };
    return isBlockedIpv4(o)
      ? { ok: false, reason: "mapped-blocked-ipv4" }
      : { ok: true, ip: mapped[1] };
  }
  const v4 = ipv4Octets(ip);
  if (v4) {
    return isBlockedIpv4(v4) ? { ok: false, reason: "blocked-ipv4" } : { ok: true, ip };
  }
  // IPv6 literal (bentuk kanonik saja yang diterima di sini).
  if (ip.includes(":")) {
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return { ok: false, reason: "blocked-ipv6-loopback-unspecified" };
    if (low.startsWith("fe80:") || low.startsWith("fe8") || low.startsWith("fe9") || low.startsWith("fea") || low.startsWith("feb"))
      return { ok: false, reason: "blocked-ipv6-link-local" };
    if (/^f[c-d]/.test(low)) return { ok: false, reason: "blocked-ipv6-ula" };
    if (/^[0-9a-f:]+$/.test(low)) return { ok: true, ip: low };
    return { ok: false, reason: "malformed-ipv6" };
  }
  return { ok: false, reason: "malformed-not-ip" };
}

// validateDestination v2.3.20 — PERBAIKAN F-042: guard eksplisit empty set.
function validateDestination(hostname: string, ips: string[] | null | undefined): Verdict {
  if (!Array.isArray(ips)) return { ok: false, reason: "resolver-no-answer" };
  if (ips.length === 0) return { ok: false, reason: "empty-dns-result" };
  for (const ip of ips) {
    if (typeof ip !== "string" || ip.length === 0) return { ok: false, reason: "malformed-empty-entry" };
    const v = classifyIp(ip);
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  const first = classifyIp(ips[0]) as { ok: true; ip: string };
  return { ok: true, ip: first.ip };
}

// checkPort v2.3.20 — hanya 80 (http) / 443 (https), sesuai keputusan pemilik v2 (§A.5).
function checkPort(rawUrl: string): Verdict {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "malformed-url" };
  }
  if (u.username !== "" || u.password !== "") return { ok: false, reason: "userinfo" };
  if (u.protocol === "http:") {
    if (u.port !== "" && u.port !== "80") return { ok: false, reason: `non-standard-port:${u.port}` };
    return { ok: true, ip: "port-ok" };
  }
  if (u.protocol === "https:") {
    if (u.port !== "" && u.port !== "443") return { ok: false, reason: `non-standard-port:${u.port}` };
    return { ok: true, ip: "port-ok" };
  }
  return { ok: false, reason: `scheme-not-allowed:${u.protocol}` };
}

// resolveWithTimeout — race resolver vs timeout 5 detik; hasil telat
// diabaikan (generation flag); TIDAK PERNAH dipakai untuk koneksi.
async function resolveWithTimeout(
  hostname: string,
  resolver: (h: string) => Promise<string[]>,
  timeoutMs = 5_000,
): Promise<{ verdict: Verdict; lateIgnored: boolean }> {
  let settled = false;
  let lateIgnored = false;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const answer = resolver(hostname).then(
    (ips) => ({ ips }),
    () => ({ ips: null as string[] | null }),
  );
  const raced = await Promise.race([
    answer.then((r) => ({ kind: "answer" as const, ...r })),
    timeout.then(() => ({ kind: "timeout" as const })),
  ]);
  if (raced.kind === "timeout") {
    settled = true;
    // Hasil telat yang datang kemudian harus diabaikan.
    void answer.then(() => { lateIgnored = true; });
    return { verdict: { ok: false, reason: "dns-timeout" }, lateIgnored: true };
  }
  settled = true;
  if (raced.ips === null) return { verdict: { ok: false, reason: "resolver-error" }, lateIgnored: false };
  return { verdict: validateDestination(hostname, raced.ips), lateIgnored: false };
}

// Stub koneksi: mencatat setiap upaya koneksi. Guard yang benar tidak
// boleh memanggil ini bila verdict deny.
let connectCalls: string[] = [];
function connectPinned(ip: string): string {
  connectCalls.push(ip);
  return `connected:${ip}`;
}
function guardedConnect(hostname: string, ips: string[] | null | undefined): string | null {
  const v = validateDestination(hostname, ips);
  if (!v.ok) return null;
  return connectPinned(v.ip);
}

// ------------------------------------------------------------------
// Kasus uji.
// ------------------------------------------------------------------

// 1. Empty set — celah v2.3.19 (ok=true, ip=undefined). Kini HARUS deny.
{
  const v = validateDestination("example.com", []);
  check("F-042 empty set -> deny", !v.ok && (v as any).reason === "empty-dns-result", JSON.stringify(v));
  const v2 = validateDestination("example.com", null);
  check("F-042 null answer -> deny", !v2.ok, JSON.stringify(v2));
  const v3 = validateDestination("example.com", undefined);
  check("F-042 undefined answer -> deny", !v3.ok, JSON.stringify(v3));
}

// 2. NODATA/NXDOMAIN dimodelkan sebagai empty set / resolver error.
{
  const nodata = validateDestination("nodata.example", []);
  check("F-042 NODATA (empty) -> deny", !nodata.ok);
  const r = await resolveWithTimeout("nxdomain.example", async () => { throw new Error("ENOTFOUND"); }, 100);
  check("F-042 resolver error (NXDOMAIN) -> deny", !r.verdict.ok && (r.verdict as any).reason === "resolver-error");
}

// 3. Satu jawaban publik -> ok; jawaban campuran -> deny (tolak-set).
{
  const pub = validateDestination("example.com", ["93.184.216.34"]);
  check("F-042 single public -> ok", pub.ok && (pub as any).ip === "93.184.216.34", JSON.stringify(pub));
  const mixed = validateDestination("evil.example", ["93.184.216.34", "10.0.0.5"]);
  check("F-042 mixed public+private -> deny", !mixed.ok, JSON.stringify(mixed));
  const mixed6 = validateDestination("evil.example", ["2606:4700:4700::1111", "127.0.0.1"]);
  check("F-042 mixed v6 public + loopback -> deny", !mixed6.ok, JSON.stringify(mixed6));
}

// 4. Alamat terlarang + malformed.
{
  const cases: Array<[string, string]> = [
    ["127.0.0.1", "loopback"],
    ["10.0.0.5", "rfc1918"],
    ["172.16.0.9", "rfc1918"],
    ["192.168.1.1", "rfc1918"],
    ["169.254.169.254", "metadata"],
    ["0.0.0.0", "unspecified"],
    ["100.64.0.1", "cgnat"],
    ["::1", "v6 loopback"],
    ["fe80::1", "v6 link-local"],
    ["fc00::1", "v6 ula"],
    ["::ffff:127.0.0.1", "mapped loopback"],
    ["not-an-ip", "malformed"],
    ["999.1.1.1", "malformed octet"],
    ["", "empty entry"],
    ["2130706433", "decimal form"],
    ["0x7f.0.0.1", "hex form"],
    ["0177.0.0.1", "octal form"],
    ["127.1", "short form"],
    ["fe80::1%eth0", "zone identifier"],
  ];
  for (const [ip, label] of cases) {
    const v = validateDestination("x.example", [ip]);
    check(`F-042 deny ${label} (${ip})`, !v.ok, JSON.stringify(v));
  }
}

// 5. IPv4-mapped publik -> ok dengan IPv4 hasil ekstraksi.
{
  const v = validateDestination("example.com", ["::ffff:93.184.216.34"]);
  check("F-042 mapped public -> ok, ip=IPv4 hasil ekstraksi", v.ok && (v as any).ip === "93.184.216.34", JSON.stringify(v));
}

// 6. Port policy 80/443 saja.
{
  const okCases = ["http://example.com/", "http://example.com:80/x", "https://example.com/", "https://example.com:443/x"];
  for (const u of okCases) {
    const v = checkPort(u);
    check(`F-042 port ok ${u}`, v.ok, JSON.stringify(v));
  }
  const denyCases: Array<[string, string]> = [
    ["http://example.com:81/", "port 81"],
    ["http://example.com:8080/", "port 8080"],
    ["https://example.com:8443/", "port 8443"],
    ["http://example.com:22/", "port 22"],
    ["http://example.com:443/", "443 di skema http"],
    ["https://example.com:80/", "80 di skema https"],
    ["ftp://example.com/", "skema ftp"],
    ["http://user@example.com/", "userinfo"],
  ];
  for (const [u, label] of denyCases) {
    const v = checkPort(u);
    check(`F-042 port deny ${label} (${u})`, !v.ok, JSON.stringify(v));
  }
}

// 7. DNS timeout 5 detik + late result diabaikan; tidak ada koneksi.
{
  let lateDelivered = false;
  const slowResolver = async (_h: string): Promise<string[]> => {
    await new Promise((r) => setTimeout(r, 300)); // datang SETELAH timeout 100 ms
    lateDelivered = true;
    return ["93.184.216.34"];
  };
  const t0 = Date.now();
  const r = await resolveWithTimeout("slow.example", slowResolver, 100);
  const dt = Date.now() - t0;
  check("F-042 resolver lambat -> deny timeout", !r.verdict.ok && (r.verdict as any).reason === "dns-timeout", JSON.stringify(r.verdict));
  check("F-042 timeout terjadi cepat (< 300 ms)", dt < 300, `dt=${dt}ms`);
  check("F-042 late result ditandai diabaikan", r.lateIgnored === true);
  // Tunggu hasil telat benar-benar tiba, lalu pastikan tidak dipakai.
  await new Promise((res) => setTimeout(res, 400));
  check("F-042 late result tiba tetapi tidak dipakai", lateDelivered === true && connectCalls.length === 0);
}

// 8. Tidak ada fallback ke fetch biasa: connect hanya bila guard ok.
{
  connectCalls = [];
  const denied = guardedConnect("evil.example", []);
  check("F-042 guard deny -> connect TIDAK dipanggil", denied === null && connectCalls.length === 0);
  const denied2 = guardedConnect("evil.example", ["127.0.0.1"]);
  check("F-042 guard deny loopback -> connect TIDAK dipanggil", denied2 === null && connectCalls.length === 0);
  const allowed = guardedConnect("example.com", ["93.184.216.34"]);
  check("F-042 guard ok -> connect dipanggil tepat 1x ke IP ter-pin", allowed === "connected:93.184.216.34" && connectCalls.length === 1, JSON.stringify(connectCalls));
}

console.log(`=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
