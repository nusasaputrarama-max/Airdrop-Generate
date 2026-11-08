# Matriks Respons v2.3.23 atas Audit Independen V16

**Revisi:** v2.3.23 — jawaban atas audit independen V16
(`SSRF_INDEPENDENT_AUDIT_V16.md`, commit `7e82818`, audit 2026-11-08
atas `main` sampai v2.3.22) dan butir handoff V16 §6 (7 butir).
Revisi ini JUGA adalah implementasi development-branch pertama:
D-01..D-04 dikerjakan di branch `dev` atas otorisasi V16 §1 +
penilaian U-99 + direktif owner `c53fd73` — lihat §0 dan Decision Log
DL-23-01.
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.34 (baru)
**Staging readiness:** `STAGING_READINESS_V2323.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2322.md`
(diperbarui status F-001..F-005/F-044/F-045/F-046/F-047 di bawah;
isinya dipertahankan utuh sebagai catatan sejarah)
**Branch kerja:** `dev` — base `main` @ `7e82818` (merge `67cc7c7`);
HEAD revisi ini tercatat di §9. `main` TIDAK diubah oleh revisi ini.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.23

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.23, §D.4.34); (b) implementasi pada source code — untuk
**branch pengembangan terisolasi `dev`, OTORISASI DIBERIKAN dan
DIEKSEKUSI dalam revisi ini** (V16 §1 keputusan 1 + §2 penilaian
U-99 + direktif owner `c53fd73` + instruksi owner terbaru; U-99
DITUTUP sebagai blocker proses — bukan blocker valid; U-98
terjawab: nama `dev` sah sebagai development branch); implementasi
di `dev` TIDAK berarti persetujuan rilis/produksi — tahap (b) untuk
produksi dan tahap (c) penerapan ke situs live tetap butuh
persetujuan dan prosedur tersendiri. **Perubahan pada source mirror
GitHub TIDAK otomatis berarti situs live berubah** — live artifact
`cek-link-airdrop` TIDAK disentuh, `app.db` live TIDAK disentuh,
Link Scanner TIDAK diaktifkan kembali, tidak ada destructive testing
produksi. F-001..F-005 kini **diimplementasikan di `dev` + teruji di
VM** (bukan lagi proposal saja) — tetapi tetap **OPEN/BLOCKED untuk
rilis** sampai bukti harness staging (STAGE-P01..P03) tersedia.

## Cara membaca status

- **addressed** — perbaikan selesai dengan bukti yang dapat
  dilacak (file, test ID, log mentah, commit SHA, tanggal run)
  dan kriteria yang benar-benar lolos.
- **partially addressed** — sebagian dikerjakan; sisanya
  dinyatakan eksplisit sebagai pekerjaan berikutnya, bukan
  disembunyikan.
- **blocked** — tidak dapat dikerjakan tanpa keputusan owner /
  bukti runtime / staging; hambatan + yang sudah dicoba +
  hasilnya dicatat di §10.
- **rejected** — tidak dikerjakan karena alasan teknis yang
  dijelaskan + bukti yang dapat direproduksi (bukan diam-diam
  dihilangkan).
- **NOT VERIFIED** — belum ada bukti; bukan klaim benar/salah.

**Catatan penting tentang "addressed" di revisi ini:**
"addressed" di sini berarti **diimplementasikan di branch `dev`
dan teruji di VM** (Bun 1.4.4 / SQLite 3.53.4 + sqlite3 CLI
3.45.1) — BUKAN "lolos staging" dan BUKAN "siap rilis". Setiap
klaim addressed membawa test ID + log mentah + SHA-256 + commit
SHA di §2/§8. Yang belum terbukti di staging tetap dinyatakan
BLOCKED atau NOT VERIFIED di §10. Tidak ada penutupan hanya
karena dokumen diedit.

## §1. Ringkasan status F-001..F-048

| ID | Temuan | Status v2.3.23 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **addressed (dev + VM evidence; staging pending)** | Guard nyata di jalur fetch checkLink: `ssrf-guard.ts` + wiring `actions.ts`; H-SSRF 32/32 PASS. Egress staging NOT VERIFIED (STAGE-P01/P03). |
| F-002 | High — cap setelah buffering | **addressed (dev + VM evidence; staging pending)** | Streamed cap L0/L1 + aggregate budget; H-RES 15/15 PASS. Memori bounded TIDAK diklaim dari model VM (lihat §2 butir 3). |
| F-003 | High — tanpa total deadline | **addressed (dev + VM evidence; staging pending)** | Deadline total 20 detik + lease max 5 + rate 10/menit + 100/jam; H-RES 15/15 + H-LEASE 8/8 PASS. |
| F-004 | Medium — addProject duplicate race | **addressed (dev + VM evidence; staging pending)** | Migrasi 0006 (unique index + CHECK) + pre-check kanonik + tangkap pelanggaran unique index; H-MIG/H-CAT dalam 232/232 PASS. |
| F-005 | Medium — otorisasi addProject tidak jelas | **addressed (dev + VM evidence; staging pending)** | Principal dari `ctx.viewer` (bukan body); provenance diisi server; H-TEN dalam 232/232 PASS. Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah; string di `actions.ts` belum dibersihkan (di luar scope D-01..D-04). |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **blocked** | Sebagian tersentuh: guard berjalan SEBELUM cache (K-1, §2 butir 2) — tetapi cache key tetap tidak memperhitungkan cap (F-017) dan TTL/isolasi cache belum diuji. BACKLOG D-05. |
| F-017 | Cache key tidak memperhitungkan cap | **blocked** | Tidak berubah. BACKLOG D-05. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **addressed (dev + VM evidence; scope `ctx.db` NOT VERIFIED)** | Owner scoping di semua actions + migrasi 0006 (owner col, composite PK); H-TEN-11..15 PASS atas DB libsql nyata + handler Actions asli. Scope `ctx.db` runtime NOT VERIFIED. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checkLink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. |
| F-022 | (resource) parser limits | **addressed (dev + VM evidence)** | Content-Type allowlist + Content-Encoding allowlist (satu encoding saja) + corrupt/truncated fail-closed; H-RES-05a..g PASS. |
| F-025 | (resource) concurrency limits | **addressed (dev + VM evidence)** | Lease global max 5 (atomic conditional INSERT) + script serial R=1; H-LEASE 8/8 PASS. |
| F-026 | (resource) rate limits | **addressed (dev + VM evidence)** | Rate per principal 10/menit + 100/jam (UPSERT counter, approximate); H-LEASE-04/05/06 PASS. IP-based enforcement BLOCKED (U-85). |
| F-027 | (resource) cancellation/abort | **addressed (dev + VM evidence)** | Abort propagation deadline 20 detik + signal gabungan; H-RES-06b/15 PASS (abort 501 ms / 20.002 ms). |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan). |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah (tidak ada re-run clean-clone build — dilarang tanpa perubahan material; U-103). Driver diperbaiki (§2 butir 7). |
| F-033 | Rasio memori A/B terkonfounded | **addressed** (dipertahankan sebagai VM evidence saja) | Tidak berubah. |
| F-034 | Low — oracle terminasi child menerima semua exception sebagai proses mati | **addressed** | Dipertahankan. |
| F-035 | Low — PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU | **addressed** (harness VM) | Dipertahankan, dengan residual U-77. |
| F-036 | Low — parser menerima starttime nol dan dapat salah menyatakan PID hidup sebagai mati | **addressed** | Dipertahankan. |
| F-037 | Medium — tes regresi memakai path tetap di /tmp dan dapat menghapus/menimpa file yang bukan miliknya | **addressed** | Dipertahankan. |
| F-038 | Medium — L0 compressed-byte counter bertentangan dengan perilaku Response.body Bun | **addressed** (desain diperbaiki + bukti VM; implementasi kini di `dev`) | Model B (raw bytes, Node http) diimplementasikan + H-RES-13 membuktikan L0 != L1. Egress L0 staging NOT VERIFIED. |
| F-039 | Medium — aggregate decoded budget belum mendefinisikan reservasi atomik dan batas overshoot untuk reader paralel | **addressed** (desain + implementasi `dev`) | `tryReserve` sinkron + script serial R=1 + H-RES-14 (race: used ≤ cap) + H-RES-07 (aggregate-cap, kode error diperbaiki — DL-23-06). |
| F-040 | High — model ownership F-004/F-018 berisiko mengubah katalog global menjadi katalog privat satu owner | **addressed** (desain + implementasi `dev`) | Katalog tetap GLOBAL; ownership hanya checks + saved_projects (H-TEN: katalog global 12 baris). |
| F-041 | Medium — total deadline dan concurrency policy proposal tidak konsisten dengan keputusan desain terdahulu | **addressed** (desain direkonsiliasi + implementasi `dev`) | Deadline 20 detik (bukan 30 — koreksi atas kode lama), lease TTL 25 detik > deadline by design. |
| F-042 | Medium — SSRF guard pseudodiff tidak menolak set DNS kosong dan belum memetakan seluruh policy constraints ke acceptance tests | **addressed** (desain + implementasi `dev`) | Empty-set guard + port policy + no-fallback + late-DNS ignore + timeout resolver injeksi — H-SSRF-13/17/18/19/26 PASS. |
| F-043 | Medium — normalisasi unique index F-004 tidak konsisten dengan komentar dan semantik alamat lintas chain | **addressed** (desain + implementasi `dev`) | Kanonik app == DB dibuktikan H-CAT-13 (12 baris seed + edge + NULL). |
| F-044 | High — migrasi SQLite mencoba menambahkan generated column STORED dengan ALTER TABLE ADD COLUMN | **addressed (dev + VM evidence)** | Migrasi 0006 AKTUAL di `site/drizzle/` (rebuild, bukan ALTER ADD STORED); H-MIG-00..09 dalam 232/232 PASS. |
| F-045 | Medium — klaim DB fail-closed untuk chain tidak dikenal tidak diwujudkan sebagai CHECK constraint | **addressed (dev + VM evidence)** | CHECK bernama nyata di 0006 + schema.ts; H-CAT-11..13 PASS (negatif + positif + NULL). |
| F-046 | Medium — legacy checks owner NULL dirancang terbaca semua principal | **addressed (dev + VM evidence)** | Fail-closed L-A di semua actions + H-TEN-11..15 PASS. K-10 tersisa (keputusan bisnis L-A/L-B/L-C). |
| F-047 | High — portabilitas deployment free-tier tidak established | **partially addressed (bukti lengkap; resolusi BLOCKED)** | Tidak ada re-run build (dilarang tanpa perubahan material). Driver diperbaiki (U-103, §2 butir 7). T-01 dicoba via tooling (§2 butir 6). |
| F-048 | Medium — README bertentangan dengan kondisi repo/deployment | **addressed** | Dipertahankan (v2.3.22). |
| U-72 | Test seam F029_CHILD_SCRIPT | **addressed** (harness lokal) | Dipertahankan. |
| U-73..U-77 | Risiko v2.3.18/v2.3.19 | **addressed / accepted assumption** | Dipertahankan. |
| U-78..U-86 | Risiko baru v2.3.20 (F-038..F-043) | **OPEN** (tercatat) | Dipertahankan; U-85 kini dipertegas: IP-based enforcement BLOCKED (tanpa peer address di Ctx). |
| U-87..U-96 | Risiko/temuan baru v2.3.21 (F-044..F-046) | **Tercatat; U-91/U-94/U-95/U-96 addressed di level desain+VM, sisanya OPEN** | U-92 addressed untuk schema.ts via DDL diff DK-01..07 (staging codegen pending); U-93 ditegakkan via operator+harness (bukan file migrasi). |
| U-97..U-102 | Risiko/temuan baru v2.3.22 (F-047/F-048, branch dev, diskusi link) | **Tercatat; U-98/U-99 CLOSED (V16), sisanya OPEN** | U-98 (nama `dev`) + U-99 (otorisasi) DITUTUP oleh V16 §1/§2 — lihat §2 butir 1. |
| U-103 | Driver clean-clone tidak portable | **addressed** | §2 butir 7. Driver baru + check-setup PASS. |
| U-104 | Legacy `saved_projects` terbaca anonim | **OPEN (tradeoff tercatat)** | Dipertahankan (DL-23-03): UI state katalog publik saja; K-10 dapat memperketat. |
| U-105 | Drizzle typing merender properti tak dikenal sebagai SQL kosong | **addressed (detection in place)** | DDL diff DK-01..07 PASS; harness gagal bila schema.ts menyimpang dari migrasi. |
| U-106 | Log mentah run-pertama 3 harness tidak dipertahankan terpisah | **BARU — process gap, lihat §5/§10** | Run gagal guard (29/32), resource (14/15), lease (4/8) hanya tercatat di laporan subagent + fix commit; log mentahnya tertimpa saat rename `.log`→`.txt`. |
| U-107 | Semantik `SpaceDb.run` rowsAffected untuk RETURNING di produksi NOT VERIFIED | **BARU — OPEN** | Fix memakai baris RETURNING sebagai ground truth (benar di driver apa pun yang mendukung RETURNING); perilaku produksi belum dapat dipastikan dari VM. |
| U-108 | Multicast 224/4 sempat di-ALLOW guard | **BARU — CLOSED (found + fixed)** | H-SSRF-02 menemukan; diperbaiki commit `514352b`; re-run 32/32 PASS. |

## §2. Respons per butir handoff V16 §6

### Butir 1 — D-01: F-044/F-045/F-046 pada source/schema/migration AKTUAL — **addressed**

**Otorisasi:** V16 §1 keputusan 1 + §2 penilaian U-99 + direktif
owner `c53fd73` + instruksi owner terbaru. U-99 DITUTUP sebagai
blocker proses; U-98 terjawab (`dev` = development branch).
Implementasi HANYA di branch `dev`; `main`/produksi/live artifact/
`app.db` tidak diubah.

**Yang diimplementasikan (file aktual, bukan proposal):**

| Artefak | File | Commit |
| --- | --- | --- |
| Migrasi 0006 (rebuild, teks v3 yang diadaptasi format migrator) | `site/drizzle/0006_unified_ownership_and_uniqueness.sql` + `site/drizzle/meta/_journal.json` idx 5 (`when: 1794122805971`) | `e022869` |
| Down migration 0006 (operator-run) | `evidence/v2323/0006_down.sql` (SHA-256 `beb65c07…`) | `e022869` |
| Schema Drizzle (mirror 0006: STORED, CHECK bernama, provenance, composite PK, `checks_owner_idx`) | `site/server/src/schema.ts` | `daec8ea` |
| Owner scoping semua actions + canonical comparison + provenance server-side | `site/server/src/actions.ts`, `site/server/src/catalog.ts` (baru) | `daec8ea` |
| Down migration 0007 (operator-run) | `evidence/v2323/0007_down.sql` (SHA-256 `d4553c76…`) | (commit dokumen, §9) |

**Adaptasi format migrasi (DL-23-01, dibuktikan dari source
runtime `/opt/hatch/skills/spaces/ts-runtime/dist/migrate.js`):**
(a) satu statement per chunk (breakpoint); (b) tanpa kontrol
transaksi eksplisit — migrator membungkus batch dalam satu transaksi
(`session.migrate`, `PRAGMA foreign_keys=off` selama batch);
(c) tanpa `PRAGMA foreign_keys`; validasi V1–V5/V7–V11 TIDAK di file
(migrator mengabaikan hasil SELECT — U-93) — dijalankan operator +
harness.

**Acceptance V16 butir 1 — semua terpenuhi di VM:**

| Kriteria | Bukti |
| --- | --- |
| Migrasi baru di direktori migrasi aplikasi yang benar | `site/drizzle/0006…` + `0007…`, journal idx 5+6; migrator CLI nyata exit 0, `normalized: []`, ledger 7 baris (H-MIG-01a) |
| Schema Drizzle memuat constraint + ownership yang disepakati | DDL drizzle-kit 0.31.4 dari `schema.ts` ASLI vs skema hasil migrasi: DK-01..07 PASS, tanpa divergensi semantik |
| Legacy NULL tidak pernah dibaca sebagai publik | Default fail-closed L-A (DL-23-03); H-TEN-11..15 PASS (anon `[]`, lintas-principal 0 baris, predikat legacy tepat 2 baris) |
| Up/down, failure injection, row-count, FK/index/trigger, unknown-chain INSERT/UPDATE, two-principal tests menjalankan FILE AKTUAL | H-MIG-00..09 + H-CAT-11..13 + H-TEN-11..15 + DK-01..07 = **232 PASS / 0 FAIL, exit 0** (harness `test-migration-v2323.ts` SHA-256 `d18f5a31…`; log kanonik run-4 `test-migration-v2323.txt` SHA-256 `123ec878…`; re-run verifikasi run-5 `test-migration-v2323-run5-verify.txt` SHA-256 `fa5552cd…`, juga 232/0; run gagal 1–3 dipertahankan terpisah) |
| SQLite minimum + 3.45.1/3.53.4, compatibility floor | H-MIG-00: ALTER ADD STORED gagal di tabel berisi pada 3.53.4 (Bun) DAN 3.45.1 (CLI) — U-96; H-MIG-09 cross-version 3.45.1 PASS; lantai >= 3.31.0 (up) / >= 3.35.0 (down) |
| Runtime SQLite produksi NOT VERIFIED | Ditegaskan: versi runtime produksi TIDAK ditebak; staging validation pending (§10, baris staging 12) |
| K-10 (legacy policy) | Default L-A berlaku; keputusan bisnis L-A/L-B/L-C masih dibutuhkan — didokumentasikan, TIDAK dikarang pemetaannya (DL-23-03) |

**Koreksi atas asumsi awal (dicatat harness, bukan disembunyikan):**
H-MIG-04/V4 — baris chain `Fake Chain` juga terdeteksi V4 (defense-
in-depth, ekspektasi awal diperbaiki); H-MIG-07b — re-run langsung
file 0006 gagal di chunk #10 (`duplicate column name`), bukan di
unique index seperti prediksi awal (rebuild idempotent pada data ini
hanya kebetulan urutan — file tetap TIDAK boleh di-re-run langsung;
keamanan re-run hanya dari ledger migrator).

### Butir 2 — F-001 di jalur fetch nyata — **addressed (VM evidence; staging egress pending)**

**Yang diimplementasikan:**

| Artefak | File | Commit |
| --- | --- | --- |
| Guard module (baru): canonicalizeHost + port policy, resolveAll (ALL A/AAAA, 5 dtk, late-result dibuang), validateDestination, nodeConnector (pinned lookup, Pendekatan 1, Model B raw bytes), fetchGuardedOnce, validateUrlForFetch (K-1 preflight), readCappedStream | `site/server/src/ssrf-guard.ts` | `9c666a4`, `514352b` |
| Wiring: fetchTextOnce/fetchText/lookupRdapOnce/analyze | `site/server/src/actions.ts` | `9c666a4` |

Perubahan perilaku vs kode V16 §3: `normalizeUrl` tetap
skema-only TAPI `fetchText` kini memanggil `validateUrlForFetch`
SEBELUM cache (K-1); `fetchTextOnce` memakai `fetchGuardedOnce`
per hop (revalidasi penuh tiap redirect; body redirect di-destroy
tanpa dibaca; Content-Type gate); `lookupRdapOnce` loop redirect
manual via guard (bukan `redirect: "follow"`); script fetch SERIAL
+ same-origin saja (F-001e); `fetch` global TIDAK lagi dipakai di
jalur scan (tanpa fallback — F-042).

**Bukti: H-SSRF 32/32 PASS, exit 0** — harness
`evidence/v2323/test-ssrf-guard-v2323.ts` (SHA-256 `91770ee7…`),
log `test-ssrf-guard-v2323.txt` (SHA-256 `03676864…`), 2026-11-08.
Stub resolver/connector + server HTTP lokal disposable; NOL request
ke metadata/internal network atau host publik. Mencakup: korpus
§A.4 (IPv4/IPv6, mapped, NAT64 RFC 6052 §2.2, Teredo/6to4, zone),
non-kanonik IPv4, port policy, empty/mixed DNS, NXDOMAIN/timeout,
late-DNS ignore, redirect chain + RDAP redirect, IP literal,
pinning mechanism (`nodeConnector` langsung vs server lokal:
`pinned.test` → 200 via 127.0.0.1; 127.0.0.2 → ECONNREFUSED).

**Tiga temuan harness yang DIPERBAIKI (bukan disembunyikan):**
run pertama 29/32 — (1) H-SSRF-02: multicast 224/4 di-ALLOW
(U-108); (2) H-SSRF-12b: trailing dot ditolak, bukan dinormalisasi;
(3) H-SSRF-18: resolver injeksi tanpa timeout (race 5 detik hanya
di `resolveAll`). Semua diperbaiki commit `514352b`; asersi
H-SSRF-19 dikoreksi ke semantik baru (deny di ~5 detik, DL-23-07);
re-run 32/32 PASS. Log mentah run pertama TIDAK dipertahankan
terpisah (U-106 — process gap, §10).

**Sisa:** staging egress tests (STAGE-P01 pinning runtime,
STAGE-P03 topologi egress + NAT64 prefix + single/multi-instance)
menunggu lingkungan yang sah; DNS VM adalah stub sandbox (semua
host resolve ke 198.18/15 — guard menolak dengan benar).

### Butir 3 — Resource controls F-002/F-003/F-022/F-025/F-026/F-027 — **addressed (VM evidence; staging pending)**

**Yang diimplementasikan:** `readCappedStream` + `ScanBudget`/
`createScanBudget` (`ssrf-guard.ts`); deadline analyze 30 dtk →
20 dtk (`TOTAL_DEADLINE_MS` — nilai 30 dtk di kode lama BUKAN
keputusan pemilik, DL-23-01/F-041); script serial R=1; migrasi
0007 (`scan_leases` + `rate_limits`); `scan-limits.ts`
(atomic conditional INSERT lease max 5, TTL 25 dtk, rate 10/menit
+ 100/jam per principal, bucket anonim); wiring `runCheck`
(rate → lease → analyze → release di `finally`, fail-closed).

**Bukti:**
- H-RES **15/15 PASS, exit 0** — harness
  `test-resource-v2323.ts` (SHA-256 `671ace5e…`), log
  `test-resource-v2323.txt` (SHA-256 `b2a9f207…`). Mencakup L0/L1
  separation (gzip 520 B wire → 500.000 B decoded, H-RES-13),
  wire-cap abort, aggregate-cap (H-RES-07), tryReserve A1/A2 +
  race (H-RES-14), gzip bomb/deflate/brotli/unknown-encoding/
  multiple-encoding/corrupt gzip, Content-Length pre-check,
  deadline 20 dtk end-to-end (H-RES-15: abort 20.002 ms),
  abort propagation (501 ms), serial script timing.
- H-LEASE **8/8 PASS, exit 0** — harness
  `test-lease-v2323.ts` (SHA-256 `67e893b4…`), log
  `test-lease-v2323.txt` (SHA-256 `de5a3a4d…`). Mencakup acquire/
  release, max 5 global (tepat 5 sukses dari 10 paralel), TTL
  expiry T+26 dtk, rate 10/menit + 100/jam, anonymous bucket.

**Dua temuan harness yang DIPERBAIKI:** (1) H-RES-07 — error
aggregate-cap tertutup AbortError (DL-23-06: `transformError`
ditangkap + diutamakan di `catch`); invariant cap selalu terbukti,
hanya kode error yang salah. (2) H-LEASE-01/02/03/07 —
`acquireScanSlot` salah lapor gagal: `INSERT ... RETURNING` di
driver `@libsql/client` nyata mengembalikan `rowsAffected: 0`
meski baris ter-insert (DL-23-05: sukses kini dinilai dari baris
RETURNING). Log mentah run pertama (14/15, 4/8) TIDAK
dipertahankan terpisah (U-106).

**Klaim memori:** TIDAK diklaim bounded dari slice/model VM —
cap ditegakkan oleh streamed read (L0/L1/L3) atas kode aktual;
bukti memori staging tetap pending (STAGE-P03 + baris staging 10).

### Butir 4 — F-004/F-005/F-018 + auth boundary — **addressed (VM evidence; `ctx.viewer` runtime NOT VERIFIED)**

- **F-004:** uniqueness transaksional via unique index + tangkap
  pelanggaran (SpaceDb TIDAK menyediakan `transaction` — SDK
  0.14.0; atomicity dari statement/index, bukan transaksi app).
  Pre-check kanonik per-chain (perbaiki false positive `lower()`
  F-043). H-CAT-11..13 + H-MIG dalam 232/232 PASS.
- **F-005:** principal dari `ctx.viewer` — SDK 0.14.0 MEMILIKI
  `PortableCtx.viewer` (`LocalViewer`/`CloudflareViewer`, diperiksa
  dari tarball SDK). `resolvePrincipal`: `local:<ownerUserId>` /
  `cloudflare:<shareId>` / null (anonim, fail-closed). Provenance
  diisi server (`provenance_source_url` = official URL,
  `provenance_submitted_by` = principal/`"anonymous"`,
  `provenance_verified_by` = NULL — belum ada identitas verifier,
  terkait K-4). **NOT VERIFIED:** apakah worker live benar-benar
  mengisi `ctx.viewer` di setiap jalur invocation (STAGE-P02).
- **F-018:** owner scoping di SEMUA actions (`listChecks`,
  `deleteCheck`, `askGibran`, `listProjects`/`setProjectState`/
  `addProject` via principal); H-TEN-11..15 PASS via handler
  `Actions` ASLI + mock ctx + drizzle libsql nyata (A=2, B=1,
  anon=`[]`; delete lintas-principal/legacy/anon = 0 baris; prompt
  askGibran hanya berisi domain principal pemanggil; isolasi
  `saved_projects` per-principal; katalog global 12 baris).
- **Gate §5 (export legacy) TETAP BELUM DIIMPLEMENTASIKAN** —
  F-005 stays OPEN untuk gate itu; `exportLegacyChecks` TIDAK
  ditambahkan ke Actions map (tidak invocable); H-TEN-14 menguji
  predikatnya via SQL langsung.

### Butir 5 — Static informational landing page — **partially addressed**

**Dibangun oleh parent agent** sebagai artifact BARU dan TERPISAH
(slug `airdrop-generate`, terhubung ke goal
airdrop-generate-website). Live artifact `cek-link-airdrop` TIDAK
disentuh. Subagent ini TIDAK membangun/mengubah artifact apa pun —
fakta di bawah ini parent-reported, dicatat sebagai demikian.

- Verifikasi internal builder: build statis sukses, audit verdict
  pass, nav_status 200, nol console error, nol overflow horizontal
  mobile 390px, nol temuan content/security critique.
- Konten: identitas proyek, banner status V16 per 8 Nov 2026
  (DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE —
  NOT READY FOR COMMUNITY BETA), badge Link Scanner TIDAK AKTIF /
  beta BELUM DIBUKA / perbaikan di branch dev, katalog 15 proyek,
  tautan repo GitHub, daftar batasan. Tanpa form URL, fetch,
  endpoint checkLink, wallet, signing, transaksi. Satu-satunya
  kontrol interaktif adalah tautan keluar ke
  `https://github.com/nusasaputrarama-max/Airdrop-Generate`
  (href terverifikasi dari audit snapshot; klik tidak dijalankan
  karena egress lockdown sesi audit).
- **BATAS JUJUR:** `share.shared=false`, BELUM ADA URL publik
  (`share.url=null`). Tidak ada tool share di run itu; sharing
  publik butuh permintaan eksplisit user.
- **Acceptance V16 butir 5 TIDAK TERPENUHI:** "URL HTTPS publik
  benar-benar ada dan health check dari sesi eksternal berhasil".
  Status: **partially addressed** (halaman dibangun + terverifikasi
  internal). Next action: share/publikasi URL + health check
  eksternal. Bukti: `evidence/v2323/landing-page-status.txt`
  (SHA-256 `045ba28f…`); BACKLOG D-09 diperbarui.

### Butir 6 — T-01 (second Hatch space) — **blocked**

Dicoba via akses/tooling platform yang memang tersedia bagi agen
ini (bukan via owner sebagai kurir). Bukti:
`evidence/v2323/t-01-verification.txt` (SHA-256 `90bed48d…`),
2026-11-08:

- `/opt/hatch/bin/hatch --help` → daemon service binary saja,
  tanpa subcommand (v0.1.0, b7b2517a512). TIDAK ADA perintah
  space/publish/create.
- `builtin-artifacts --help` → hanya menulis 2 built-in
  (`welcome-to-muse-tutorial`, `muse-town`). Bukan tool space.
- `hatch-doctor --help` → hanya `run` (state checks). Bukan tool
  space.
- `share --help` → `share-space` = "Share a published space"
  (butuh space yang SUDAH ter-publish); `fetch-space-url` (probe
  read-only) BEKERJA: `cek-link-airdrop` dan `airdrop-generate`
  keduanya "not currently shared" (exit 1).
- Publish space terjadi lewat web-artifact tools, yang tidak
  dioperasikan subagent ini (parent agent yang mengoperasikannya).

**Status tetap BLOCKED** dengan kebutuhan bukti spesifik:
(a) pernyataan provider atau run artifact-tooling yang menunjukkan
second space DAPAT dibuat + dipublikasikan untuk owner yang sama;
(b) alur publish + URL hasil untuk beta space; (c) konfirmasi
apakah second space berbagi `app.db`/runtime yang sama atau
terisolasi (bukti G2 tenant bergantung padanya). BACKLOG D-07
diperbarui (BLOCKED — bukan lagi "OWNER ACTION REQUIRED" semata;
batas akses agen tercatat).

### Butir 7 — Perbaiki U-103 — **addressed**

Driver baru `evidence/v2323/run-clean-clone-build.sh`
(SHA-256 `9ae1b18b…`) — file v2322 dibiarkan utuh sebagai bukti
historis (SHA `6912b8fd…`):

1. `--repo`/`--ref` sebagai argumen; default = remote repo
   `https://github.com/nusasaputrarama-max/Airdrop-Generate.git`,
   ref `dev` (bukan lagi `file://$HOME/...` lokal).
2. SATU `mktemp -d`; trap menghapus HANYA direktori itu — tanpa
   `rm -rf` path tetap `/tmp`.
3. Output dari lokasi script yang terdeteksi (`SCRIPT_DIR`),
   bukan CWD/`$OLDPWD`.
4. Status setup dipropagasikan: clone/unshare gagal → exit 2
   (`SETUP_FAILED` di log); build gagal dalam eksperimen yang
   selesai → HASIL (`INSTALL_EXIT`/`BUILD_EXIT`), driver exit 0.
   Eksperimen berjalan di subshell agar `exit 2` setup tidak
   mematikan ringkasan akhir.

**Bukti tanpa re-run build** (dilarang untuk kosmetik):
`--check-setup-only` (mode hidden) — clone remote shallow ref
`dev` @ `f25bb24` + unshare sanity OK, exit 0; log
`evidence/v2323/check-setup-hidden.txt` (SHA-256 `54516c79…`);
direktori mktemp terhapus oleh trap (terverifikasi: tidak ada
`/tmp/v2323-clean-clone.*` tersisa). F-047 tetap BLOCKED (tidak
ada klaim baru tentang build).

## §3. Response to Previous Handoff (V15 §2) — carry-forward dari V16 §2

| Permintaan V15 (per V16 §2) | Hasil v2.3.23 | Bukti / batas |
| --- | --- | --- |
| F-044/F-045/F-046: proposal/harness saja | **addressed — kini IMPLEMENTASI** | §2 butir 1. Migrasi 0006 + schema + owner scoping di `dev`; 232/232 PASS. Bukan lagi proposal. |
| Deployment feasibility / free tier | **addressed sebagai analisis; deployment BLOCKED** | Dipertahankan (`DEPLOYMENT_FEASIBILITY_V2322.md`); tidak ada HTTP entry point / Dockerfile / CI baru. |
| F-047: external build | **evidence diperkuat (driver U-103); resolusi BLOCKED** | §2 butir 7. Tidak ada re-run build. VM lokal saja. |
| F-048: README | **addressed** | Dipertahankan (v2.3.22). |
| Development branch/backlog | **addressed** | `dev` kini berisi KODE (7 commit di atas `origin/dev` `f25bb24`), bukan hanya BACKLOG.md. `actions.ts` dev ≠ main (blob berubah). |
| Closed beta package | **addressed sebagai pointer; beta tetap BLOCKED** | Dipertahankan; pointer `CLOSED_BETA_PACKAGE_POINTER.md`. Gate G1/G2/G3/G4/G6/G7/G8 belum lulus. |
| GPT response atas link discussion | **partially addressed — tindak lanjut berjalan** | Landing page dibangun parent (butir 5, §2); T-01 dicoba (§2 butir 6); D implementation-first JALAN di `dev`. Owner-only trial tetap BLOCKED. |
| Implementasi-first directive `c53fd73` | **EXECUTED** | D-01..D-04 di `dev` dalam revisi ini (V16 §1 + U-99 closure). Bukan lagi "belum dijalankan". |

## Decision Log v2.3.23

- **DL-23-01 (format migrasi):** 0006 = teks v3 (SHA-256
  `6c5bcbdc40…`) yang diadaptasi format SAJA: breakpoint-satu-
  statement, tanpa kontrol transaksi, tanpa PRAGMA, tanpa SELECT
  validasi (U-93 — operator/harness). Down migration artefak
  operator (`evidence/v2323/0006_down.sql`, SHA `beb65c07…`).
- **DL-23-02 (schema.ts):** Drizzle mirror 0006+0007 persis
  (STORED, CHECK bernama, provenance, composite PK,
  `checks_owner_idx`, `scan_leases`/`rate_limits`). Diverifikasi
  via drizzle-kit DDL diff (DK-01..07 PASS).
- **DL-23-03 (legacy policy):** checks = L-A fail-closed ketat
  (NULL tidak pernah dibaca principal biasa; anonim = daftar
  kosong). saved_projects = principal dikenal → baris sendiri;
  anonim → baris `'<LEGACY>'` (UI state katalog publik saja —
  bookmark/task flag, tanpa konten privat — tidak seperti riwayat
  checks yang berisi URL kiriman user). K-10 dapat memperketat.
- **DL-23-04 (provenance):** `addProject` diisi server:
  `provenance_source_url` = official URL,
  `provenance_submitted_by` = principal/`"anonymous"`,
  `provenance_verified_by` = NULL (belum ada identitas verifier,
  terkait K-4).
- **DL-23-05 (lease success signal):** sukses acquire dinilai
  dari baris RETURNING (ground truth), BUKAN `rowsAffected` —
  driver `@libsql/client` nyata mengembalikan 0 untuk
  `INSERT ... RETURNING` meski baris ter-insert (H-LEASE).
  Perilaku `SpaceDb.run` produksi NOT VERIFIED (U-107).
- **DL-23-06 (error-code fidelity):** `readCappedStream`
  menangkap CapError transform (`transformError`) dan
  mengutamakannya di `catch` — aggregate overflow sebelumnya
  muncul sebagai `aborted` (H-RES-07). Invariant cap tidak pernah
  gagal; hanya kode error yang salah.
- **DL-23-07 (H-SSRF-19):** asersi dikoreksi ke semantik baru —
  deny di timeout DNS ~5 detik, hasil lambat dibuang. Asersi lama
  (menunggu stub 6 detik penuh) mengukur perilaku buggy H-SSRF-18.
- **DL-23-08 (log `.txt` + U-106):** log bukti disimpan sebagai
  `.txt` (repo meng-ignore `*.log` — konvensi v2321). Process gap:
  log mentah run-pertama guard/resource/lease tertimpa saat rename
  — dicatat jujur di U-106; run gagal migrasi 1–3 dipertahankan.
  Aturan ke depan: simpan run-pertama dengan nama berbeda SEBELUM
  re-run.

## §4. Respons atas 7 butir handoff V16 §6 (ringkas)

| # | Butir | Status | Bukti utama |
| --- | --- | --- | --- |
| 1 | D-01 F-044/45/46 di file aktual | **addressed** | 0006+0007, schema.ts, H-MIG/H-CAT/H-TEN 232/232, commit `e022869`/`daec8ea` |
| 2 | F-001 di jalur fetch nyata | **addressed (VM)** | `ssrf-guard.ts` + wiring, H-SSRF 32/32, commit `9c666a4`/`514352b` |
| 3 | Resource controls F-002/003/022/025/026/027 | **addressed (VM)** | H-RES 15/15 + H-LEASE 8/8, commit `247d98a`/`24de11e` |
| 4 | F-004/F-005/F-018 + auth boundary | **addressed (VM)** | Uniqueness + owner scoping + H-TEN, commit `daec8ea`; `ctx.viewer` runtime NOT VERIFIED |
| 5 | Static landing page terpisah | **partially addressed** | Dibangun parent (slug `airdrop-generate`); URL publik BELUM ADA |
| 6 | T-01 second Hatch space | **blocked** | Dicoba via tooling; tanpa jalur create/publish; `t-01-verification.txt` |
| 7 | Perbaiki U-103 | **addressed** | Driver baru + check-setup PASS; tanpa re-run build |

## §5. Risiko baru v2.3.23 (U-103..U-108)

- **U-103 (driver tidak portable) — ADDRESSED.** Driver baru
  menerima URL/ref, default remote, mktemp+trap, output dari
  lokasi script, status setup dipropagasikan; check-setup PASS
  (exit 0). File v2322 dibiarkan sebagai bukti historis.
- **U-104 (legacy `saved_projects` terbaca anonim) — OPEN.**
  Tradeoff tercatat (DL-23-03): hanya UI state katalog publik;
  K-10 dapat memperketat. Bukan kebocoran konten privat.
- **U-105 (Drizzle typing merender properti tak dikenal sebagai
  SQL kosong) — ADDRESSED (detection in place).** Ditemukan saat
  generasi DDL pertama (`t.contractAddress` → SQL kosong;
  TypeScript TIDAK menandai). Mekanisme penjaga: DDL diff DK-01..
  07 gagal bila schema.ts menyimpang dari migrasi.
- **U-106 (log mentah run-pertama 3 harness tidak dipertahankan
  terpisah) — BARU, process gap.** Run gagal guard (29/32),
  resource (14/15), lease (4/8) hanya tercatat di laporan
  subagent + commit perbaikan; log mentahnya tertimpa/dihapus
  saat rename `.log`→`.txt` oleh koordinator. Temuan + perbaikan
  + re-run hijau TETAP terlacak (commit `514352b`/`24de11e` +
  log final). Mitigasi: DL-23-08 (nama berbeda sebelum re-run).
- **U-107 (semantik `SpaceDb.run` rowsAffected untuk RETURNING
  di produksi NOT VERIFIED) — BARU, OPEN.** Fix DL-23-05 benar
  di driver apa pun yang mendukung RETURNING; perilaku produksi
  belum dapat dipastikan dari VM (staging follow-up, STAGE-P02).
- **U-108 (multicast 224/4 sempat di-ALLOW guard) — BARU,
  CLOSED.** Ditemukan H-SSRF-02, diperbaiki `514352b`, re-run
  32/32 PASS. §A.4: 224/4 "Globally Reachable: False" (IANA).

Risiko lama yang dipertegas: **U-85** (IP-based rate limiting
BLOCKED — Ctx tanpa peer TCP address; key = principal);
**U-90** (versi SQLite produksi NOT VERIFIED); **U-92**
(Drizzle mapping — addressed untuk schema.ts, staging codegen
pending); **U-93** (validasi SQL tidak self-aborting di luar
runner — operator/harness); **U-97** (buildClient menolak build
tangan); **U-101/U-102** (Vercel Hobby, CPU 10 ms — NOT VERIFIED).

## §6. Hard gates — No Implementation Confirmation

- Revisi ini TIDAK mengonfirmasi implementasi untuk rilis:
  status tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
  FOR RELEASE — NOT READY FOR COMMUNITY BETA**.
- Implementasi di `dev` diotorisasi V16 §1 + `c53fd73` untuk
  branch terisolasi SAJA — bukan persetujuan merge ke `main`,
  bukan persetujuan deployment, bukan persetujuan beta.
- Tidak ada commit yang dianggap persetujuan implementasi/rilis.
- Link Scanner TIDAK diaktifkan; `checkLink` TIDAK di-invoke
  dalam revisi ini; tidak ada request ke metadata/internal
  network selama pengujian (stub + fixture lokal saja).
- Live artifact `cek-link-airdrop`, deployment config, dan
  `app.db` live TIDAK diubah. Semua DB pengujian disposable di
  `/tmp` (mkdtemp).

## §7. Gate G-K (diperbarui)

| Gate | Status v2.3.23 |
| --- | --- |
| K-1 (cache guard) | ADDRESSED di `dev`: guard sebelum cache (`fetchText` preflight). F-016/F-017 tetap OPEN. |
| K-2..K-5, K-7..K-9 | Tidak berubah (lihat matriks v2.3.22 §7). |
| K-10 (legacy policy L-A/L-B/L-C) | OPEN — default L-A berlaku di `dev`; keputusan bisnis masih dibutuhkan (DL-23-03). |
| Otorisasi tahap (b) — `dev` | **CLOSED/GRANTED (V16 §1 + U-99 closure)** — implementasi D-01..D-04 dieksekusi. Otorisasi produksi/rilis tetap BELUM diberikan. |
| U-98 (nama branch) | **CLOSED** — `dev` sah (V16 §2). |
| U-99 (konfirmasi tambahan) | **CLOSED sebagai blocker proses** (V16 §2). |
| T-01 | BLOCKED — dicoba via tooling (§2 butir 6); butuh pernyataan provider / run artifact-tooling. |
| M-1/M-2 (SDK redistributable / kontrak build client) | BLOCKED — tidak ada perubahan; U-103 addressed (driver). |
| G-E (staging tersedia) | NOT STARTED — peran belum ditunjuk; lihat `STAGING_READINESS_V2323.md`. |
| F-019 (scanner disabled) | NOT VERIFIED — `checkLink` masih terdaftar. |

**Gate proyek konkret berikutnya (prasyaratnya): STAGING
VALIDATION.** Prasyarat: (1) Rama menunjuk keenam peran staging
(baris 1–6 `STAGING_READINESS_V2323.md`); (2) provider
menyediakan bukti baris 7–17 (versi/digest runtime, scope
`ctx.db`, topologi egress, SDK redistributable/kontrak build,
jawaban T-01); (3) keputusan owner K-10; (4) staging
environment tersedia (G-E). Sampai saat itu STAGE-P01..P12 tetap
BLOCKED dan tidak ada run staging. Pemicu revisi v2.3.24:
audit independen V17, ATAU bukti staging, ATAU keputusan owner
atas K-10/T-01, ATAU jawaban provider atas M-1/M-2.

## §8. Test Evidence (ringkas — detail di README evidence)

Semua run di VM ini (Bun 1.4.4, Node v24.22.1, sqlite3 CLI
3.45.1, SQLite Bun 3.53.4), 2026-11-08 WIB. Bukti VM BUKAN
bukti staging.

| Suite | Hasil | Harness (SHA-256) | Log (SHA-256) |
| --- | --- | --- | --- |
| H-MIG-00..09 + H-CAT-11..13 + H-TEN-11..15 + DK-01..07 | **232 PASS / 0 FAIL, exit 0** (+ re-run verifikasi run-5: 232/0) | `test-migration-v2323.ts` `d18f5a31…` | `test-migration-v2323.txt` `123ec878…`; run-5 `fa5552cd…`; run gagal 1–3: `f3fcf663…` / `c50948b7…` / `60bd0176…` |
| H-SSRF-00..30 | **32 PASS / 0 FAIL, exit 0** (run pertama 29/32 — temuan diperbaiki) | `test-ssrf-guard-v2323.ts` `91770ee7…` | `test-ssrf-guard-v2323.txt` `03676864…` |
| H-RES-02/05/06/07/13/14/15 | **15 PASS / 0 FAIL, exit 0** (run pertama 14/15 — temuan diperbaiki) | `test-resource-v2323.ts` `671ace5e…` | `test-resource-v2323.txt` `b2a9f207…` |
| H-LEASE-00..07 | **8 PASS / 0 FAIL, exit 0** (run pertama 4/8 — temuan diperbaiki) | `test-lease-v2323.ts` `67e893b4…` | `test-lease-v2323.txt` `de5a3a4d…` |
| Typecheck server | **bersih, exit 0** (`bun x tsc --noEmit -p server/tsconfig.json`) | — | (dijalankan tiap commit; tanpa log tersimpan — tsc output kosong) |
| Driver U-103 check-setup | **SETUP_OK, exit 0** | `run-clean-clone-build.sh` `9ae1b18b…` | `check-setup-hidden.txt` `54516c79…` |
| T-01 verification | **BLOCKED (probe jalan, tanpa jalur publish)** | — | `t-01-verification.txt` `90bed48d…` |
| Landing page status | **partially addressed (parent-reported)** | — | `landing-page-status.txt` `045ba28f…` |

Tidak ada pengulangan tes v2.3.21 tanpa perubahan material:
bukti v2321 (109 + 25 assert) tetap berdiri; harness v2.3.23
menjalankan FILE AKTUAL yang baru (migrasi 0006+0007, guard,
limits, actions) — pengulangan dibenarkan karena implementasi
berubah material (protokol handoff butir 6).

## §9. Changed Files

Branch `dev`, base `main` @ `7e82818`. Commit di atas
`origin/dev` (`f25bb24`) — SELURUHNYA di `dev`, belum di-push
saat matriks ini ditulis (push §10, setelah dokumen ini):

| Commit | Isi |
| --- | --- |
| `67cc7c7` | Merge `origin/main` ke `dev` (V16 + docs v2.3.22; bersih, dokumen saja) |
| `e022869` | `feat(db)`: migrasi 0006 + journal idx 5 + down migration (D-01, F-044/45/46) |
| `daec8ea` | `feat(db/auth)`: schema.ts + catalog.ts (baru) + owner scoping actions.ts (D-01/D-04) |
| `9c666a4` | `feat(ssrf)`: `ssrf-guard.ts` (baru) + wiring fetch nyata (D-02/D-03, F-001/002/003) |
| `247d98a` | `feat(db/limits)`: migrasi 0007 + `scan-limits.ts` (baru) + wiring runCheck (D-03, F-003c) |
| `514352b` | `fix(ssrf)`: multicast 224/4, trailing dot, timeout resolver injeksi (H-SSRF-02/12b/18) |
| `24de11e` | `fix(ssrf/limits)`: error aggregate-cap + RETURNING rowsAffected (H-RES-07, H-LEASE) |
| (menyusul) | Dokumen revisi: matriks ini + §D.4.34 + `STAGING_READINESS_V2323.md` + `evidence/v2323/README.md` + BACKLOG final + bukti v2323 |

File bukti baru di `evidence/v2323/`: `0006_down.sql`,
`0007_down.sql`, `run-clean-clone-build.sh`,
`check-setup-hidden.txt`, `t-01-verification.txt`,
`landing-page-status.txt`, `test-migration-v2323.ts/.txt/
.sha256` (+ run1–3 fail + run5 verify),
`test-ssrf-guard-v2323.ts/.txt/.sha256`,
`test-resource-v2323.ts/.txt/.sha256`,
`test-lease-v2323.ts/.txt/.sha256`,
`drizzle-kit-generated/` (DDL + snapshot + README),
`README.md`.

**Dibersihkan sebelum push (bukan bagian commit):**
`site/.bun-cache/`, `site/client/.tsbuildinfo.client`,
`site/server/.tsbuildinfo.server` (artefak build lokal dari
`bun install`/`tsc` — untracked, tidak di-commit).

## §10. Unresolved Blockers

1. **Staging tidak tersedia (G-E).** Peran 1–6 UNASSIGNED;
   bukti provider baris 7–17 belum ada. STAGE-P01 (pinning
   runtime), STAGE-P02 (`ctx.viewer` terisi di runtime +
   semantik `SpaceDb.run` rowsAffected — U-107), STAGE-P03
   (topologi egress + NAT64 prefix + single/multi-instance +
   batas L0 egress) semuanya pending. Tidak ada run staging.
2. **T-01 BLOCKED.** Tanpa jalur create/publish space kedua
   dari tooling agen ini; butuh pernyataan provider atau run
   artifact-tooling (§2 butir 6).
3. **Landing page: URL publik BELUM ADA.** Butuh permintaan
   eksplisit user untuk share + health check eksternal (§2
   butir 5).
4. **K-10 belum diputuskan.** Default L-A berlaku; L-B/L-C
   butuh keputusan bisnis owner (+ bukti scope `ctx.db` untuk
   L-B).
5. **F-019 NOT VERIFIED.** `checkLink` masih terdaftar; status
   disabled tanpa bukti kontrol runtime.
6. **F-047 resolusi BLOCKED.** SDK tarball tidak terdistribusi
   + `buildClient` menolak build tangan (U-97); butuh M-1/M-2.
7. **U-106 (process gap).** Log mentah run-pertama guard/
   resource/lease tidak dipertahankan terpisah — lihat §5.
   Temuan + perbaikan tetap terlacak via commit + log final.
8. **F-006b OPEN.** Narasi insiden di string kode belum
   dibersihkan (di luar scope revisi ini).
9. **F-016/F-017 OPEN.** Cache key belum memperhitungkan cap;
   isolasi/TTL cache belum diuji (D-05).
10. **Runtime SQLite produksi NOT VERIFIED (U-90).** Lantai
    >= 3.31.0 (up) / >= 3.35.0 (down); teruji VM 3.53.4 +
    3.45.1 saja.
11. **Beta BLOCKED.** Gate G1/G2/G3/G4/G6/G7/G8 belum lulus;
    owner-only trial BLOCKED (butuh staging + F-001/resource
    teruji di staging + ditinjau).
