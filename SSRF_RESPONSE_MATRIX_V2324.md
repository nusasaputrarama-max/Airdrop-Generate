# Matriks Respons v2.3.24 atas Audit Independen V18

**Revisi:** v2.3.24 — jawaban atas audit independen V18
(`SSRF_INDEPENDENT_AUDIT_V18.md`, commit `75fc5ee` + klarifikasi
`1699706`, audit 2026-11-08 atas `main` sampai V17 `c0efbfd`) dan
butir handoff V18 §7 (10 butir). Revisi ini JUGA adalah implementasi
development-branch kedua: F-049..F-056 dikerjakan di branch
`development` atas otorisasi V18 §7 ("The existing owner authorization
for isolated development-branch implementation remains sufficient") +
direktif owner `c53fd73` + instruksi owner 2026-11-08 ~15:31 WIB
("perbaiki semua") — lihat §0 dan Decision Log DL-24-03.
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR RELEASE — NOT READY FOR COMMUNITY BETA**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.35 (baru)
**Staging readiness:** `STAGING_READINESS_V2324.md`
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2323.md` (branch
`development`, commit `31c3db3` — tidak pernah di-push ke `main`;
diringkas di §1; isinya dipertahankan utuh sebagai catatan sejarah di
branch tersebut) dan `SSRF_RESPONSE_MATRIX_V2322.md` (main, terakhir
di main sebelum revisi ini)
**Branch kerja:** `development` — merge `main` @ `1699706` (merge
`32731de`); HEAD revisi ini `ecd6f06` (lihat §9). `main` TIDAK diubah
source aplikasinya oleh revisi ini.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.24

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.24, §D.4.35); (b) implementasi pada source code — untuk
**branch pengembangan terisolasi `development`, OTORISASI DIBERIKAN
dan DIEKSEKUSI dalam revisi ini** (V18 §7 + direktif owner `c53fd73`
+ instruksi owner "perbaiki semua"); implementasi di `development`
TIDAK berarti persetujuan rilis/produksi — tahap (b) untuk produksi
dan tahap (c) penerapan ke situs live tetap butuh persetujuan dan
prosedur tersendiri. **Perubahan pada source mirror GitHub TIDAK
otomatis berarti situs live berubah** — live artifact
`cek-link-airdrop` TIDAK disentuh, `app.db` live TIDAK disentuh,
Link Scanner TIDAK diaktifkan kembali, tidak ada destructive testing
produksi. F-049..F-056 kini **diimplementasikan di `development` +
teruji di VM** (bukan lagi proposal saja) — tetapi tetap
**OPEN/BLOCKED untuk rilis** sampai bukti harness staging
(STAGE-P01..P03) tersedia.

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

**Catatan penting tentang "addressed" di revisi ini:** "addressed"
di sini berarti **diimplementasikan di branch `development` dan
teruji di VM** (Bun 1.4.4 / SQLite 3.53.4 + sqlite3 CLI 3.45.1) —
BUKAN "lolos staging" dan BUKAN "siap rilis". Setiap klaim addressed
membawa test ID + log mentah + SHA-256 + commit SHA di §2/§8. Yang
belum terbukti di staging tetap dinyatakan BLOCKED atau NOT VERIFIED
di §10. Tidak ada penutupan hanya karena dokumen diedit.

**KOREKSI ANGKA TOTAL (DL-24-01):** matriks development
(`SSRF_RESPONSE_MATRIX_V2324.md` di branch `development`, commit
`811561b`) dan pesan commitnya menulis total regresi **353/353**.
Angka itu SALAH HITUNG: 312 (baseline) + 41 (tes baru) = 353,
tetapi H-RD 10/10 yang juga di-re-run dalam putaran ini tidak ikut
dijumlahkan. Jumlah harness per-harness yang terverifikasi dari
ekor log mentah (lihat §8) adalah **363/363 PASS** (232+32+15+8+12
+8+5+10+8+6+6+6+1+4+5+5). Koreksi ini dibuat oleh koordinator revisi
(setelah verifikasi independen penuh: ke-16 SHA-256 log cocok dengan
file sidecar, ekor tiap log dibaca, typecheck diulang exit 0) dan
BERLAKU untuk dokumen ini; matriks development yang salah hitung
dipertahankan apa adanya sebagai catatan sejarah dan TIDAK ditulis
ulang (history branch development tidak di-rewrite).

## §1. Ringkasan status F-001..F-056

| ID | Temuan | Status v2.3.24 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **addressed (dev + VM evidence; staging pending)** | Diperkuat v2.3.24: korpus IANA lengkap (F-049) + deadline mengikat DNS (F-052) + same-origin tiap hop (F-056). H-SSRF 32/32 + H-IP 8/8 + H-SO 5/5 PASS. Egress staging NOT VERIFIED (STAGE-P01/P03). |
| F-002 | High — cap setelah buffering | **addressed (dev + VM evidence; staging pending)** | Diperkuat v2.3.24: cache hit kini di-charge ke budget agregat (F-054). H-RES 15/15 + H-CB 4/4 PASS. Memori bounded TIDAK diklaim dari model VM. |
| F-003 | High — tanpa total deadline | **addressed (dev + VM evidence; staging pending)** | Diperkuat v2.3.24: deadline kini batas keras sampai DNS/preflight/script + timeout tidak tersimpan (F-052/F-053). H-DL 6/6 + H-TO 1/1 PASS (elapsed 20015 ms). Timing runtime NOT VERIFIED. |
| F-004 | Medium — addProject duplicate race | **addressed (dev + VM evidence; staging pending)** | Tidak berubah dari v2.3.23 (migrasi 0006 + H-MIG 232/232 PASS, kini atas 8 migrasi). |
| F-005 | Medium — otorisasi addProject tidak jelas | **addressed (dev + VM evidence; staging pending)** | Diperkuat v2.3.24: gate owner-only DI DALAM handler sebelum akses DB (F-050). H-AUTH 6/6 PASS. Runtime population `ctx.viewer` NOT VERIFIED (STAGE-P02). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah; string di `actions.ts` belum dibersihkan (di luar scope revisi ini). |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **addressed (dev + VM evidence; staging pending)** | Selesai v2.3.23 putaran 2 (D-05: H-CACHE 12/12); diperkuat v2.3.24 (F-054: H-CB 4/4). Staleness dalam TTL tetap residual yang diakui. |
| F-017 | Cache key tidak memperhitungkan cap | **addressed (dev + VM evidence; staging pending)** | Selesai v2.3.23 putaran 2 (D-05: cap bagian dari cache key; H-CACHE 12/12). |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **addressed (dev + VM evidence; scope `ctx.db` NOT VERIFIED)** | Diperkuat v2.3.24: principal share tidak lagi disalahartikan sebagai identitas per-user (F-051). H-PRIN 6/6 PASS. Scope `ctx.db` runtime NOT VERIFIED. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checkLink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Kill-switch default-off TERBUKTI di VM (H-KILL 5/5), bukan bukti runtime. |
| F-022 | (resource) parser limits | **addressed (dev + VM evidence)** | Tidak berubah (H-RES 15/15 PASS di re-run v2.3.24). |
| F-025 | (resource) concurrency limits | **addressed (dev + VM evidence)** | Tidak berubah (H-LEASE 8/8 PASS di re-run v2.3.24). |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah (D-06/F-047 tetap IN PROGRESS/BLOCKED; stub tidak disentuh v2.3.24). |
| F-033..F-043 | Risiko/temuan v2.3.20 | **addressed** (dipertahankan) | Tidak berubah; lihat matriks v2.3.21 §1. |
| F-044 | High — migrasi SQLite generated column STORED via ALTER TABLE | **addressed (dev + VM evidence)** | Tidak berubah; H-MIG 232/232 PASS di re-run v2.3.24 (kini 8 migrasi). |
| F-045 | Medium — CHECK chain bukan constraint SQL nyata | **addressed (dev + VM evidence)** | Tidak berubah; H-CAT dalam 232/232 PASS di re-run v2.3.24. Catatan: F-045 dinyatakan closed untuk chain; kelemahan CHECK Solana yang sejenis kini ditutup terpisah sebagai F-055. |
| F-046 | Medium — legacy checks owner NULL terbaca semua principal | **addressed (dev + VM evidence)** | Tidak berubah; H-TEN dalam 232/232 PASS di re-run v2.3.24. K-10 tersisa; scope NOT VERIFIED. |
| F-047 | High — portabilitas deployment free-tier tidak established | **partially addressed (bukti lengkap; resolusi BLOCKED)** | Tidak berubah (D-06/F-047 IN PROGRESS/BLOCKED; stub SDK 0.14.0-stub.1 tidak disentuh; clean-clone TIDAK diulang — tidak ada perubahan material). |
| F-048 | Medium — README bertentangan dengan kondisi repo/deployment | **addressed** | Tidak berubah (README v2.3.22 dipertahankan; tidak ada klaim baru yang perlu direkonsiliasi v2.3.24). |
| F-049 | High — klasifikasi IP special-purpose tidak lengkap + false positive 2001:20::/28 | **addressed (dev + VM evidence; staging pending)** | §2 butir 2. Korpus IANA lengkap dari fetch live 2026-11-08; 2001:20::/28 diputuskan ALLOW mengikuti IANA; H-IP 8/8 PASS. Runtime reachability NOT VERIFIED. |
| F-050 | High — addProject tanpa otorisasi handler | **addressed (dev + VM evidence; staging pending)** | §2 butir 3. Gate owner-only di dalam handler sebelum akses DB; H-AUTH 6/6 PASS. Dispatch-layer runtime NOT VERIFIED (handler tidak mengandalkannya). |
| F-051 | High — shareId Cloudflare dipakai sebagai principal → cross-viewer | **addressed (dev + VM evidence; staging pending)** | §2 butir 4. Viewer share non-owner → principal null: tanpa history/saved state; H-PRIN 6/6 PASS. `ctx.viewer` runtime NOT VERIFIED (STAGE-P02). |
| F-052 | High — deadline 20 dtk tidak mengikat DNS/preflight | **addressed (dev + VM evidence; staging pending)** | §2 butir 5. Deadline dirace ke DNS, dicek sebelum cache read + tiap script; H-DL 6/6 PASS. Timing runtime NOT VERIFIED. |
| F-053 | Medium — timeout tersimpan sebagai hasil biasa | **addressed (dev + VM evidence; staging pending)** | §2 butir 5. `ScanTimeoutError` di 3 checkpoint; tanpa insert baris; H-TO-01 PASS (20015 ms, 0 baris, lease 0). |
| F-054 | Medium — cache hit bypass budget byte agregat 1 MB | **addressed (dev + VM evidence; staging pending)** | §2 butir 6. `decodedBytes` disimpan + di-reserve saat cache hit; H-CB 4/4 PASS. |
| F-055 | Medium — CHECK Solana di DB lebih lemah dari validator app | **addressed (dev + VM evidence; staging pending)** | §2 butir 7. Migrasi 0008: CHECK allowlist base58 penuh; H-B58 5/5 PASS; H-MIG 232/232. Versi SQLite produksi NOT VERIFIED (U-90). |
| F-056 | Medium — script same-origin lolos lewat redirect | **addressed (dev + VM evidence; staging pending)** | §2 butir 8. `allowedOrigin` ditegakkan tiap hop redirect; H-SO 5/5 PASS. |
| U-97..U-102 | Risiko/temuan baru v2.3.22 | **Tercatat; U-98/U-99 CLOSED, sisanya OPEN** | U-98 (nama branch) CLOSED v2.3.23 (rename ke `development`); U-99 (otorisasi dev) CLOSED v2.3.23; U-97/U-100/U-101/U-102 OPEN — lihat §10. |
| U-103..U-107 | Risiko baru v2.3.23 | **Tercatat; U-103 addressed, sisanya OPEN** | U-103 (driver portabel) addressed; U-104..U-107 OPEN — lihat matriks v2.3.23 §5 + §10 di sini. |
| U-108..U-112 | Risiko/temuan baru v2.3.24 | **BARU — tercatat; lihat §5** | U-108 (registry-diff berkala), U-109 (service identity terjadwal), U-110 (pre-check migrasi 0008), U-111 (total regresi salah hitung di matriks dev — DIKOREKSI di sini), U-112 (re-run 0006 mengembalikan CHECK lemah). |

## §2. Respons per butir handoff V18 §7

### Butir 1 — Sinkronisasi development dengan main terbaru: addressed

- main HEAD saat re-read: `1699706` (tidak ada audit lebih baru dari
  V18 — V18 sendiri `75fc5ee` + klarifikasi `1699706`).
- Merge commit `32731defe190694fc49efad6ca259c5a5e03b905` — merge
  origin/main (V17+V18) ke `development`, tanpa konflik.
- Setelah merge: `git log origin/main --not HEAD` = 0 (tidak ada
  behind). Push merge langsung terverifikasi via ls-remote.
- Tidak ada merge balik development→main. Semua commit Muse
  dipertahankan (28+ commit development utuh; HEAD akhir `ecd6f06`).

### Butir 2 — F-049: addressed (korpus IANA lengkap + keputusan 2001:20::/28)

**Yang dilakukan:** korpus prefix diturunkan dari **fetch live kedua
registry IANA 2026-11-08 ~16:25 WIB** (bukan dari ingatan):
`iana-ipv4-special-registry.xhtml` dan
`iana-ipv6-special-registry.xhtml`; keduanya tercantum "Last Updated:
2025-10-09" — sama dengan tanggal yang disebut audit V18. Korpus
per-entri didokumentasikan di
`evidence/v2324/iana-registry-corpus-v2324.md` (branch `development`,
commit `1863c1f`) dengan kolom Globally Reachable + disposisi tiap
entri di `classifyIp`.

**Perubahan kode** (`site/server/src/ssrf-guard.ts`, commit
`1863c1f2698f34e928428ba50d11893a26597096`):
- Tambah DENY: `192.88.99.0/24` (termasuk `192.88.99.2/32`),
  `5f00::/16` (SRv6 SIDs, GR=False).
- Default-deny `2001::/23` dengan exception GR=True yang lebih
  spesifik (mis. `2001:1::4` kini DENY — sebelumnya lolos ke `ok: true`).
- Exception GR=True di dalam prefix GR=False dipertahankan sebagai
  ALLOW: `192.0.0.9/32` (PCP anycast), `192.0.0.10/32` (TURN anycast),
  `100::/64`? (lihat korpus — entri `100:0:0:1::/64` yang disebut
  laporan implementasi sudah benar sejak awal dan tetap ALLOW).

**Keputusan eksplisit 2001:20::/28 — ALLOW, mengikuti IANA.**
ORCHIDv2 (`2001:20::/28`, Globally Reachable=True) adalah identifier
kriptografis, bukan host routable; tidak ada alasan produk untuk
memblokir rentang yang IANA nyatakan reachable sementara entry
anycast GR=True tetangganya di-allow. Kebijakan produk yang sengaja
lebih ketat **tidak** diadopsi. Test lama H-SSRF-04 yang mengharapkan
DENY diperbaiki (ekspektasi usang dihapus); H-IP-06 membuktikan
ALLOW (`2001:20::1`, `2001:2f:ffff::1`).

**Bukti:** harness baru `evidence/v2324/test-ip-registry-v2324.ts`,
H-IP-01..08 **8/8 PASS** (log
`evidence/v2324/test-ip-registry-v2324-v2324.txt`, SHA-256
`3bda3f83ec0430630821e3c96aca1d50c1a86d831c2e4d668db53e4658712c54`);
H-SSRF re-run 32/32 PASS (ekspektasi 2001:20 diperbaiki).

**Sisa risiko:** registry IANA bisa berubah — registry-diff test
berkala belum dibuat (U-108, tindak lanjut, bukan blocker).
Runtime reachability tetap NOT VERIFIED (staging).

### Butir 3 — F-050: addressed (otorisasi addProject di handler)

**Yang dilakukan:** `addProject` kini owner-only **di dalam handler**,
sebelum akses DB (`site/server/src/actions.ts` —
`isAddProjectAuthorized` + gate di `addProject`, commit
`56d4a6622bf428add874c7f615f9c178562160cf`).

**Bukti:** harness baru `evidence/v2324/test-auth-addproject-v2324.ts`,
H-AUTH-01..06 **6/6 PASS** (log SHA-256
`ff3fda64d83528a26060ae9804294b6de6006c706b967571a5b9f91654fc5365`):
anonim, non-owner lokal, dan viewer share non-owner ditolak dengan
**0 baris** tercipta (termasuk tiga penolakan beruntun H-AUTH-06);
hanya owner lokal + owner Cloudflare yang berhasil insert.

**Kejujuran batas:** **tidak ada** service principal terjadwal di
codebase/runtime, jadi gate = `isOwner`; job terjadwal hanya bisa
menambah katalog bila berjalan sebagai owner. Gate TIDAK mengandalkan
asumsi dispatch-layer SDK yang belum terbukti — bila dispatch layer
memang kontrol yang dimaksud, kontrak source/runtime-nya tetap harus
dibuktikan di staging (U-109). Definisi service identity terjadwal
tetap butuh keputusan + staging proof bila diinginkan.

### Butir 4 — F-051: addressed (semantik principal didesain ulang)

**Yang dilakukan** (`site/server/src/actions.ts`, commit `56d4a66`):
viewer share Cloudflare non-owner kini resolve ke **principal null**:
tanpa history (`listChecks` → `[]`, `runCheck` → baris owner NULL),
saved state dinonaktifkan (`setProjectState` no-op,
`listProjects` default), dan Gibran tanpa riwayat. Owner Cloudflare
→ `cloudflare-owner:{shareId}` (identitas owner, bukan viewer).
Tidak ada lagi label user-scoped pada baris share-scoped.

**Bukti:** harness baru `evidence/v2324/test-principal-share-v2324.ts`,
H-PRIN-01..06 **6/6 PASS** (log SHA-256
`f0a4671942aaeeee7c401e5eab52a31eefa1412dc62474bda9d71d12dff045a5`):
dua viewer berbeda pada satu share tidak dapat saling baca/mutasi/
hapus history atau saved state; prompt Gibran hanya berisi data
viewer saat ini.

**Trade-off yang diakui:** viewer share kehilangan saved state — by
design, karena tidak ada identitas per-user di konteks share.
`ctx.viewer` terisi di runtime tetap NOT VERIFIED (STAGE-P02).

### Butir 5 — F-052 + F-053: addressed (deadline batas keras + timeout tidak tersimpan)

**F-052 — yang dilakukan:**
- `validateUrlForFetch` (`site/server/src/ssrf-guard.ts`, commit
  `1863c1f`): DNS di-race melawan **kedua** batas — per-query 5 dtk
  DAN deadline total; race hanya dibangun untuk hostname (bukan IP
  literal — perbaikan atas kegagalan H-SSRF-24 di tengah jalan, §8).
- `fetchGuardedOnce` meneruskan deadline; `fetchText`/`lookupRdap`
  (`site/server/src/actions.ts`, commit `56d4a66`) mengecek
  `deadline.aborted` sebelum cache read dan sebelum tiap script.
- Lease TTL 25 dtk **dipertahankan** (bukan diperpanjang) dengan alasan
  tertulis: deadline kini batas keras dan unwind pasca-deadline
  terukur <1 dtk di VM, sehingga lease tidak kedaluwarsa sebelum kerja
  selesai (dokumentasi invarian di `site/server/src/scan-limits.ts`).

**F-053 — yang dilakukan:** `analyze` melempar `ScanTimeoutError`
di 3 checkpoint (`throwIfDeadlineAborted`); `runCheck` mengubahnya
menjadi error timeout eksplisit yang retryable dan **tidak insert
baris checks**.

**Bukti:** H-DL-01..06 **6/6 PASS** (log SHA-256
`3ce18117d8ca242e58a16aedc5cb93b90be70ecc96e09461bf604b70e523a992`);
H-TO-01 **1/1 PASS** (log SHA-256
`836ba9797a99817908d319c06f7137bef97924f461b400c6c9d3ced871dfa639`):
elapsed **20015 ms**, 0 baris checks, lease 0.

**Catatan kejujuran:** kegagalan DNS 5 dtk (bukan deadline) tetap
menghasilkan vonis "unreachable" yang lengkap — itu perilaku yang
benar, bukan timeout deadline. Fixture pertama H-TO-01 justru
membuktikan hal ini (resolver tak pernah settle → dipotong race DNS
5 dtk menjadi kegagalan DNS biasa); fixture diganti resolver
4 dtk/query agar kerja serial terakumulasi melewati 20 dtk (§8).

**Sisa risiko:** timing runtime NOT VERIFIED (staging) — angka
<1 dtk unwind dan 20015 ms adalah VM, bukan runtime produksi.

### Butir 6 — F-054: addressed (akuntansi agregat pada cache hit)

**Yang dilakukan** (`site/server/src/actions.ts`, commit `56d4a66`):
dipilih opsi **simpan panjang eksak + reserve** (bukan bypass cache):
`FetchResult.decodedBytes` disimpan di tiap cache entry dan
di-reserve ke `ScanBudget` saat ini via `tryReserve` sebelum cache
hit dilayani.

**Bukti:** harness baru `evidence/v2324/test-cache-budget-v2324.ts`,
H-CB-01..04 **4/4 PASS** (log SHA-256
`2b30e455ce4a703c4e4253f17bad76cc6bd2acbc2507e0b2567e85bbe77f1356`):
900 KB lolos, +300 KB ditolak, used tetap 900 KB; H-CB-04 membuktikan
`decodedBytes` eksak untuk body 100 KB. Skenario audit (400 KB page +
tiga script 300 KB cached = 1,3 MB) kini tidak dapat melewati cap
1.000.000 decoded byte per scan.

**Batas yang diakui:** RDAP cache tetap berbudget sendiri (by design
— bukan bagian agregat scan page+script).

### Butir 7 — F-055: addressed (CHECK Solana base58 penuh)

**Yang dilakukan:** migrasi baru
`site/drizzle/0008_solana_base58_check.sql` (journal idx 7, commit
`8344055edbc9751607dc023096b91d9213711739`) — CHECK
`projects_contract_format_ck` cabang Solana kini menegakkan
allowlist base58 penuh (`length 32–44 AND trim(addr) NOT GLOB
'*[^1-9A-HJ-NP-Za-km-z]*'`), persis sama dengan validator aplikasi
`canonicalizeContractAddress` (`/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`).
`site/server/src/schema.ts` + `site/server/src/catalog.ts`
diselaraskan; DDL drizzle-kit diregenerasi
(`evidence/v2324/drizzle-kit-generated/` — diff vs v2.3.23 hanya
cabang CHECK Solana); down migration `evidence/v2324/0008_down.sql`
diuji.

**Bukti:** harness baru `evidence/v2324/test-solana-check-v2324.ts`,
H-B58-01..05 **5/5 PASS** (log SHA-256
`d7704e8fdd6472567b0a632e6349f8f6280079e582626407a78780afdabdad6f`):
INSERT/UPDATE direct SQL dengan `!`, `-`, Unicode, dan karakter
non-base58 lain GAGAL; alamat base58 valid lolos; NULL tetap benar;
down 0008 via sqlite3 CLI mengembalikan CHECK ke 0006 dengan baris +
skema lain utuh. H-MIG re-run **232/232 PASS** (kini 8 migrasi).

**Sisa risiko:** versi SQLite runtime produksi NOT VERIFIED (U-90).
**Pre-check operator V1 wajib** sebelum migrate 0008 di DB berisi
data: 0 baris Solana boleh melanggar CHECK baru (U-110).

### Butir 8 — F-056: addressed (same-origin ditegakkan tiap hop)

**Yang dilakukan** (`site/server/src/actions.ts`, commit `56d4a66`):
`fetchText`/`fetchTextOnce` menerima `opts.allowedOrigin` dan
menegakkannya di **setiap hop redirect sebelum koneksi hop
berikutnya**; `analyze` meneruskan `pageOrigin` untuk fetch script.

**Bukti:** harness baru
`evidence/v2324/test-same-origin-redirect-v2324.ts`, H-SO-01..05
**5/5 PASS** (log SHA-256
`9dc6878e51dd203e1b2ab4d201ae3fe7137cc556f6d7f5ed4cca912d27f5a54d`):
redirect cross-origin dari endpoint script same-origin ditolak
sebelum koneksi kedua; redirect relatif same-origin tetap diikuti
(H-SO-05).

**Batas yang diakui:** script fetch di `analyze` tetap memakai jalur
produksi (tanpa testHooks) — perilaku lama yang dipertahankan;
H-SO menguji `fetchText` langsung.

### Butir 9 — D-06: tidak diubah (tetap IN PROGRESS/BLOCKED)

Stub SDK **tidak disentuh** v2.3.24; tidak ada klaim baru; tidak ada
upaya menyamarkan stub sebagai SDK produksi. Clean-clone build TIDAK
diulang (tidak ada perubahan material pada implementasi, lingkungan,
harness, atau risiko D-06 sejak v2.3.23 — protokol handoff butir 6).
Resolusi tetap butuh SDK redistributable yang sah / pernyataan
provider (keputusan owner M-1/M-2). Status: **blocked**.

### Butir 10 — T-01 + landing page: tetap jujur (BLOCKED / tidak diklaim)

- **T-01 tetap BLOCKED.** Tidak dicoba ulang; tidak ada perintah
  create/publish di Hatch CLI (bukti v2.3.23
  `evidence/v2323/t-01-verification.txt` tetap berlaku). Jawaban
  harus datang dari platform.
- **Landing page tidak disentuh** v2.3.24; tidak ada URL publik baru
  yang diklaim. Status tetap: SOURCE PREPARED di branch
  `project-landing`; artifact terpisah yang dilaporkan parent
  (URL `https://muse.ai/s/airdrop-generate-xdxj6xcxoseqkxjxp/...`)
  **belum diverifikasi independen** oleh audit mana pun (V18 §3:
  `share.shared=false`, `share.url=null` pada sisi audit).
- Link Scanner tetap DISABLED (`CHECKLINK_ENABLED=false` default;
  H-KILL 5/5 PASS di regresi v2.3.24).

## §3. Response to Previous Handoff (V17) — carry-forward

Butir handoff V17 §6 sudah dijawab v2.3.23 (matriks v2.3.23 §2,
branch `development` commit `31c3db3`) dan hasil implementasinya
kini diperkuat v2.3.24:

| V17 request | Hasil setelah v2.3.24 |
| --- | --- |
| Sinkronisasi development dengan main | **ADDRESSED** — merge `32731de` (main 1699706, termasuk V17+V18); 0 behind (V18 butir 1 di atas). |
| D-01 migrasi/schema/ownership | **IMPLEMENTED IN DEVELOPMENT; STAGING BLOCKED** — H-MIG re-run 232/232 (8 migrasi, termasuk 0008). |
| D-02 SSRF guard | **IMPLEMENTED IN DEVELOPMENT; INDEPENDENT REVIEW OPEN** — F-049/F-052/F-056 ditutup di level VM (§2 butir 2/5/8); review independen berikutnya (V19) yang menilai. |
| D-03 resource controls | **IMPLEMENTED IN DEVELOPMENT; STAGING BLOCKED** — F-052/F-053/F-054 ditutup di level VM; H-RES 15/15 + H-LEASE 8/8 re-run PASS. |
| D-04 uniqueness/authorization/tenant isolation | **IMPLEMENTED IN DEVELOPMENT; STAGING BLOCKED** — F-050/F-051 ditutup di level VM; runtime `ctx.viewer` population/scope tetap NOT VERIFIED. |
| D-05 cache correctness | **IMPLEMENTED IN DEVELOPMENT; STAGING BLOCKED** — F-054 ditutup di level VM; staleness dalam TTL tetap residual yang diakui. |
| Landing page | **SOURCE PREPARED; PUBLIC URL NOT VERIFIED** (tidak berubah). |
| T-01 | **BLOCKED** (tidak berubah). |

## Decision Log v2.3.24

| ID | Keputusan | Alasan / bukti |
| --- | --- | --- |
| DL-24-01 | Total regresi DIKOREKSI 353 → **363/363 PASS** | Matriks development salah hitung (H-RD 10/10 tidak dijumlahkan). Koordinator memverifikasi independen: ke-16 SHA-256 cocok, ekor tiap log dibaca, typecheck diulang exit 0. Matriks dev TIDAK ditulis ulang (history tidak di-rewrite); koreksi berlaku di dokumen ini. |
| DL-24-02 | Bukti mentah v2.3.24 TIDAK diduplikasi ke `main` | Log + harness sudah ter-commit di branch `development` (commit `811561b`/`ecd6f06`, ls-remote terverifikasi) dan dirujuk di sini dengan path + SHA-256 + SHA commit penuh. Duplikasi ke `main` menimbulkan drift dua salinan (precedent v2.3.22 §2 butir 6 untuk paket beta). |
| DL-24-03 | Implementasi F-049..F-056 DIEKSEKUSI di `development` tanpa konfirmasi ulang Rama | Otorisasi eksplisit V18 §7 + direktif `c53fd73` + instruksi owner "perbaiki semua" (2026-11-08 ~15:31 WIB). V18 §7 menegaskan otorisasi yang ada "remains sufficient" dan pemilik tidak perlu diminta mengulang konfirmasi. |
| DL-24-04 | 2001:20::/28 = ALLOW mengikuti IANA | ORCHIDv2 GR=True, identifier kriptografis bukan host routable; kebijakan lebih ketat tidak diadopsi. Lihat §2 butir 2. |
| DL-24-05 | F-054 memakai opsi simpan-panjang + reserve (bukan bypass cache) | Cache tetap berguna untuk scan; akuntansi ditegakkan dengan `decodedBytes` eksak. Lihat §2 butir 6. |
| DL-24-06 | F-051 memakai principal-null + nonaktifkan saved state (bukan owner-only artifact) | Tidak ada identitas per-user di konteks share; menonaktifkan state lebih aman daripada memberi label user-scoped pada baris share-scoped. Lihat §2 butir 4. |
| DL-24-07 | Lease TTL 25 dtk dipertahankan (tidak diperpanjang) | Deadline kini batas keras + unwind <1 dtk di VM; perpanjangan TTL tidak dibutuhkan. Timing runtime tetap NOT VERIFIED. |
| DL-24-08 | D-06 clean-clone TIDAK diulang v2.3.24 | Tidak ada perubahan material pada implementasi/lingkungan/harness/risiko D-06; protokol handoff butir 6 melarang pengulangan tanpa alasan material. |
| DL-24-09 | §D.4.34 TIDAK ditulis di `main` | §D.4.34 (v2.3.23) hanya ada di branch `development` (commit `31c3db3`); `main` tidak pernah menerima revisi v2.3.23 sebagai dokumen. Revisi ini menambahkan §D.4.35 di `main` dan mencatat gap penomoran ini secara eksplisit — tidak memalsukan §D.4.34 secara retroaktif (precedent koreksi U-88 v2.3.21). |

## §4. Respons atas 10 butir handoff V18 §7

| Butir | Respons | Bukti |
| --- | --- | --- |
| 1. Sinkronisasi development | Addressed — merge `32731de`, 0 behind | §2 butir 1 |
| 2. F-049 korpus IANA | Addressed — fetch live IANA, H-IP 8/8, keputusan 2001:20 ALLOW | §2 butir 2; `evidence/v2324/iana-registry-corpus-v2324.md` |
| 3. F-050 otorisasi addProject | Addressed — gate owner-only di handler, H-AUTH 6/6 | §2 butir 3 |
| 4. F-051 semantik principal | Addressed — principal-null + saved state nonaktif, H-PRIN 6/6 | §2 butir 4 |
| 5. F-052 deadline + F-053 timeout | Addressed — deadline mengikat DNS/preflight/script, timeout tanpa insert, H-DL 6/6 + H-TO 1/1 | §2 butir 5 |
| 6. F-054 akuntansi cache hit | Addressed — `decodedBytes` + reserve, H-CB 4/4 | §2 butir 6 |
| 7. F-055 CHECK Solana | Addressed — migrasi 0008, H-B58 5/5, H-MIG 232/232 | §2 butir 7 |
| 8. F-056 same-origin redirect | Addressed — `allowedOrigin` tiap hop, H-SO 5/5 | §2 butir 8 |
| 9. D-06 tanpa samarkan stub | Dipatuhi — stub tidak disentuh; tetap IN PROGRESS/BLOCKED | §2 butir 9 |
| 10. T-01 + landing jujur | Dipatuhi — T-01 tetap BLOCKED; landing tidak diklaim | §2 butir 10 |

## §5. Risiko baru v2.3.24 (U-108..U-112)

| ID | Risiko/temuan | Status |
| --- | --- | --- |
| U-108 | Korpus IANA bisa berubah setelah 2025-10-09 tanpa terdeteksi — registry-diff test berkala belum dibuat | BARU — tindak lanjut F-049; bukan blocker rilis (korpus saat ini lengkap per registry 2025-10-09) |
| U-109 | Tidak ada definisi service identity terjadwal — job auto-discovery tidak dapat menambah katalog tanpa berjalan sebagai owner | BARU — tindak lanjut F-050; butuh keputusan owner + staging proof bila diinginkan |
| U-110 | Migrasi 0008 di DB berisi data: baris Solana yang melanggar CHECK baru akan menggagalkan migrate | BARU — pre-check operator V1 wajib (0 baris pelanggar) sebelum migrate; prosedur di §2 butir 7 |
| U-111 | Total regresi salah hitung di matriks development (353 vs 363) | BARU — **DIKOREKSI di dokumen ini (DL-24-01)**; akar: H-RD 10/10 tidak dijumlahkan; mitigasi: koordinator memverifikasi total dari ekor log, bukan dari klaim agen |
| U-112 | Re-run langsung file migrasi 0006 mengembalikan CHECK Solana ke versi lemah (0008 → 0006) secara diam-diam | BARU — ditemukan H-MIG-07b-6 (§8); perilaku benar untuk diuji — tes diperbarui menegaskan tepat satu diff (teks CHECK tabel projects); memperkuat larangan re-run file migrasi langsung di luar harness |

## §6. Hard gates — No Implementation Confirmation

Revisi v2.3.24 mengubah HANYA (di `main`): `SSRF_RESPONSE_MATRIX_V2324.md`
(BARU, file ini), `STAGING_READINESS_V2324.md` (BARU),
`SSRF_REMEDIATION_DESIGN.md` (header + changelog + §D.4.35 baru).
Semua perubahan kode aplikasi + bukti mentah ada HANYA di branch
`development` (commit `32731de`..`ecd6f06`, ls-remote terverifikasi).
Verifikasi `git status` sebelum commit menunjukkan TIDAK ADA perubahan
pada `site/**`, `package.json`, `bun.lock`, migration aktual di
`site/drizzle/`, workflow CI, deployment, database/katalog, atau live
artifact di `main`. `checkLink` TIDAK di-invoke. Link Scanner TIDAK
diaktifkan. Tidak ada tes produksi/destruktif. Tidak ada deployment.
Tidak ada merge development→main. Status tetap **DESIGN REVIEW ONLY —
IMPLEMENTATION NOT APPROVED — NOT READY FOR COMMUNITY BETA.**

## §7. Gate G-L (diperbarui)

Gate **G-L** kini: audit independen V19 atas diff v2.3.24 + keputusan
K-1/K-4/K-10 + jawaban T-01 (M-6) + pernyataan provider SDK (M-1/M-2)
+ registry-diff test berkala (U-108) + definisi service identity
terjadwal bila diinginkan (U-109) + pre-check migrasi 0008 (U-110) +
staging tersedia (G-E). Pemicu revisi v2.3.25 adalah audit independen
V19, ATAU keputusan owner atas K-1/K-4/K-10/T-01, ATAU bukti runtime
G-B (termasuk versi SQLite produksi, U-90), ATAU staging tersedia
(G-E). Gate G-A..G-K dipertahankan.

## §8. Test Evidence (ringkas — detail di branch development)

**Lingkungan run:** VM lokal, Bun 1.4.4, SQLite 3.53.4 / sqlite3 CLI
3.45.1, 2026-11-08 ~16:25–16:41 WIB. Semua log di branch
`development`, folder `evidence/v2324/` (commit `811561b`,
`ecd6f06`). **Semua bukti di sini adalah VM — BUKAN staging, BUKAN
produksi.**

**Verifikasi independen koordinator (2026-11-08 ~16:45 WIB):**
ke-16 file `.txt.sha256` dicocokkan dengan `sha256sum` — **16/16
COCOK**; ekor tiap log dibaca — semua tail menunjukkan PASS sesuai
tabel; `bun run typecheck` di `site/` (worktree development)
diulang — **exit 0**. Total dikoreksi 353 → **363/363 PASS**
(DL-24-01).

| Harness | Perintah (ringkas) | Hasil | Log (SHA-256 lengkap) |
| --- | --- | --- | --- |
| H-MIG/H-CAT/H-TEN/DK | `bun test-migration-v2323.ts` (re-run; 8 migrasi) | 232/0 | `test-migration-v2323-v2324.txt` — `24b5ffcb2a85d6792281b102e25edd274a00750bf778cf7dfb58ff323af879f2` |
| H-SSRF | `bun test-ssrf-guard-v2323.ts` (re-run; ekspektasi 2001:20 diperbaiki) | 32/0 | `test-ssrf-guard-v2323-v2324.txt` — `2b8decc595b7263421e23ae719ecdb2f0fcc14e1561eec88c6a920d42dccab90` |
| H-RES | `bun test-resource-v2323.ts` (re-run) | 15/0 | `test-resource-v2323-v2324.txt` — `b2a9f20778ac2b7aae96933bf491cab09e0afba98e3e3d58e82297e4ffaf06` |
| H-LEASE | `bun test-lease-v2323.ts` (re-run; ekspektasi migrasi 7→8) | 8/0 | `test-lease-v2323-v2324.txt` — `b27f1ace2a22ee652549b61084b2be158a93a30b3c927291377a41eb9a7f0ad0` |
| H-CACHE | `bun test-cache-v2323.ts` (re-run) | 12/0 | `test-cache-v2323-v2324.txt` — `2dfb2deca4209d8087e4d235fc42709628a393ba6cee789f51fcbfcc1386c8f9` |
| H-LEG | `bun test-legacy-export-v2323.ts` (re-run) | 8/0 | `test-legacy-export-v2323-v2324.txt` — `51c6b49afc027196c7d7f1731d85a17c901ea432268d0a50bc6cae234a01d614` |
| H-KILL | `bun test-checklink-killswitch-v2323.ts` (re-run) | 5/0 | `test-checklink-killswitch-v2323-v2324.txt` — `e04bf199ab19683cef109441994f64e70df04128e5050e1013deb752695be7ef` |
| H-RD | `bun test-registrable-domain-v2323.ts` (re-run) | 10/0 | `test-registrable-domain-v2323-v2324.txt` — `ca020129d2827b6e09605ba2b804e1f6b9cfac3fba1db8ea9fc2cd85a2305aa6` |
| H-IP (F-049, baru) | `bun test-ip-registry-v2324.ts` | 8/0 | `test-ip-registry-v2324-v2324.txt` — `3bda3f83ec0430630821e3c96aca1d50c1a86d831c2e4d668db53e4658712c54` |
| H-AUTH (F-050, baru) | `bun test-auth-addproject-v2324.ts` | 6/0 | `test-auth-addproject-v2324-v2324.txt` — `ff3fda64d83528a26060ae9804294b6de6006c706b967571a5b9f91654fc5365` |
| H-PRIN (F-051, baru) | `bun test-principal-share-v2324.ts` | 6/0 | `test-principal-share-v2324-v2324.txt` — `f0a4671942aaeeee7c401e5eab52a31eefa1412dc62474bda9d71d12dff045a5` |
| H-DL (F-052, baru) | `bun test-deadline-v2324.ts` | 6/0 | `test-deadline-v2324-v2324.txt` — `3ce18117d8ca242e58a16aedc5cb93b90be70ecc96e09461bf604b70e523a992` |
| H-TO (F-053, baru) | `bun test-timeout-persist-v2324.ts` | 1/0 | `test-timeout-persist-v2324-v2324.txt` — `836ba9797a99817908d319c06f7137bef97924f461b400c6c9d3ced871dfa639` |
| H-CB (F-054, baru) | `bun test-cache-budget-v2324.ts` | 4/0 | `test-cache-budget-v2324-v2324.txt` — `2b30e455ce4a703c4e4253f17bad76cc6bd2acbc2507e0b2567e85bbe77f1356` |
| H-B58 (F-055, baru) | `bun test-solana-check-v2324.ts` | 5/0 | `test-solana-check-v2324-v2324.txt` — `d7704e8fdd6472567b0a632e6349f8f6280079e582626407a78780afdabdad6f` |
| H-SO (F-056, baru) | `bun test-same-origin-redirect-v2324.ts` | 5/0 | `test-same-origin-redirect-v2324-v2324.txt` — `9dc6878e51dd203e1b2ab4d201ae3fe7137cc556f6d7f5ed4cca912d27f5a54d` |

**TOTAL: 363/363 PASS, 0 FAIL.** `tsc` server + client: exit 0
(diverifikasi ulang oleh koordinator).

**Yang gagal selama putaran ini (diperbaiki, bukan disembunyikan):**
1. **H-SSRF-24 gagal** — refactor `validateUrlForFetch` memanggil
   resolver untuk IP literal saat membangun array race. Diperbaiki:
   race hanya dibangun untuk hostname. Re-run 32/32.
2. **H-TO-01 gagal di percobaan pertama** — fixture "resolver tak
   pernah settle" tidak memicu deadline (race DNS 5 dtk memotongnya
   menjadi kegagalan DNS biasa → vonis "unreachable" yang sah).
   Fixture diganti resolver 4 dtk/query agar kerja serial
   terakumulasi melewati 20 dtk. Hasil: 20015 ms, timeout eksplisit,
   0 baris.
3. **H-MIG-07b-6 gagal** — re-run langsung file 0006 diam-diam
   mengembalikan CHECK Solana ke versi lemah (0008→0006). Tes
   diperbarui menegaskan tepat satu diff (teks CHECK tabel projects).
   Temuan ini dicatat sebagai U-112.
4. **H-LEASE-00 gagal** — ekspektasi hardcoded 7 migrasi; diperbarui
   ke 8. Re-run 8/8.
5. **H-CB-04 / H-SO-01 gagal pertama** — bug stub tes (pola URL,
   retry fetchText); ekspektasi diperbaiki, kode tidak diubah.

**Pengulangan yang dijelaskan (protokol butir 6):** H-MIG/H-SSRF/
H-RES/H-LEASE/H-CACHE/H-LEG/H-KILL/H-RD diulang karena implementasi
berubah material (F-049..F-056 menyentuh `ssrf-guard.ts`,
`actions.ts`, `scan-limits.ts`, `schema.ts`, `catalog.ts`, dan
migrasi 0008). D-06 clean-clone TIDAK diulang (tidak ada perubahan
material — DL-24-08).

## §9. Changed Files

| File | Tujuan |
| --- | --- |
| `SSRF_RESPONSE_MATRIX_V2324.md` (BARU, file ini — `main`) | Matriks respons atas V18: §1 status F-001..F-056, §2 handoff 10 butir, §3 carry-forward V17, Decision Log DL-24-01..09, §4 tabel handoff, §5 risiko U-108..U-112, §6 hard gates, §7 gate G-L, §8 bukti, §10 blocker |
| `STAGING_READINESS_V2324.md` (BARU — `main`) | Readiness diperbarui: peran tetap UNASSIGNED + 3 baris baru (21–23) untuk prasyarat baru v2.3.24 (F-051/STAGE-P02, F-055/U-110, F-049/U-108) |
| `SSRF_REMEDIATION_DESIGN.md` (diubah: header + changelog + §D.4.35 baru — `main`) | Desain diperbarui secukupnya tanpa menghapus riwayat; §D.4.34 dicatat hanya ada di branch `development` (DL-24-09) |
| Branch `development` (BUKAN `main`) — merge `32731de` | Sync V17+V18 dari main |
| Branch `development` — `1863c1f` | F-049 korpus IANA + F-052 deadline ke DNS (`ssrf-guard.ts`; korpus `evidence/v2324/iana-registry-corpus-v2324.md`; H-IP 8/8) |
| Branch `development` — `56d4a66` | F-050/F-051/F-052/F-053/F-054/F-056 (`actions.ts`, `scan-limits.ts`; H-AUTH 6/6, H-PRIN 6/6, H-DL 6/6, H-TO 1/1, H-CB 4/4, H-SO 5/5) |
| Branch `development` — `8344055` | F-055 migrasi 0008 (`site/drizzle/0008_solana_base58_check.sql` + journal idx 7; `schema.ts`, `catalog.ts`; H-B58 5/5) |
| Branch `development` — `811561b` + `ecd6f06` | Regresi penuh v2.3.24 (evidence/v2324/ 16 log + 8 harness baru + matriks dev + BACKLOG D-12) |

Verifikasi `git ls-remote origin development` = `ecd6f069d95ffa7fcfb98110cd542a3cc7faf266`
(cocok HEAD lokal development); `origin/main` = `16997061e00ff6809798c94634675ed5547a57d9`
(sebelum commit revisi ini; SHA main baru dicatat setelah push §9).

## §10. Unresolved Blockers

| Blocker | Owner yang dibutuhkan | Percobaan/bukti | Hasil | Langkah berikutnya |
| --- | --- | --- | --- | --- |
| F-047 SDK redistributable / kontrak build (M-1/M-2, U-97) | Provider Hatch via owner | npm 404; clean-clone install FAIL; build:client ditolak SDK (v2.3.22); stub tidak disentuh v2.3.24 | BLOCKED | Owner minta pernyataan/distribusi SDK + kontrak build client |
| F-047/F-030 build reproducibility | Runtime/build provider | Bun/lockfile mismatch historis + SDK path absolut + penolakan build tangan | CONFIRMED BLOCKER | Clean external builder + provenance SDK + frozen install/typecheck/build |
| T-01 second Hatch space (M-6) | Platform Hatch via owner | `evidence/v2323/t-01-verification.txt` (v2.3.23, branch development); tidak dicoba ulang v2.3.24 | BLOCKED / NOT VERIFIED | Owner menanyakan T-01 ke platform; catat jawaban tertulis |
| F-019 Link Scanner disabled | Runtime/artifact operator | Tidak ada bukti kontrol (a)–(e); kill-switch default-off hanya terbukti di VM (H-KILL 5/5) | BLOCKED / NOT VERIFIED | Bukti read-only semua invocation paths; jangan invoke action |
| F-028 deployment provenance | Artifact operator/provider | Manifest belum terisi | NOT VERIFIED | Manifest artifact digest/source commit/release/approval/rollback |
| Staging roles + environment | Rama/provider/ops sesuai peran | Readiness v2.3.24 (baris 1–6 UNASSIGNED) | Keenam role UNASSIGNED | Tetapkan owner dan staging sebelum STAGE-P01..P12 |
| F-001..F-005/F-049..F-056 staging | Staging operator + runtime/egress/DB owner | Semua bukti baru adalah VM; STAGE-P01/P02/P03 belum dapat jalan | BLOCKED | Staging tersedia → ulang H-SSRF/H-DL/H-TO/H-PRIN di runtime staging (bukan Node/Bun VM) |
| F-006b narasi insiden di string kode | Muse (stage-(b) code change) | String di `actions.ts` belum dibersihkan | OPEN | Bersihkan string insiden di putaran development berikutnya |
| K-1 (cabang cache), K-4 (provenance verifier), K-10 (legacy) | Owner proyek | Belum diputuskan | OPEN | Keputusan tertulis owner; K-4 kini terkait F-050 (service identity U-109) |
| U-90 versi SQLite produksi | Runtime provider / staging operator | Hanya terukur di VM (3.53.4) + CLI (3.45.1) | NOT VERIFIED | STAGE-P01 mencatat versi SQLite runtime produksi sebelum migrate 0008 |
| U-108 registry-diff berkala | Muse | Korpus IANA lengkap per 2025-10-09; belum ada tes diff otomatis | OPEN | Buat harness registry-diff + jadwal pengecekan berkala |
| U-109 service identity terjadwal | Owner + runtime provider | Tidak ada principal terjadwal di codebase/runtime | OPEN | Owner memutuskan apakah job terjadwal perlu menambah katalog; bila ya, definisikan identitas + staging proof |
| U-110 pre-check migrasi 0008 | DB operator / staging | Prosedur dicatat §2 butir 7 | OPEN | Jalankan pre-check (0 baris pelanggar) sebelum migrate di DB berisi data |
| Diskusi link-jadi (U-100) | ChatGPT + owner | Dijawab GPT 13:47 WIB 2026-11-08 (rangking C/A/D/B) | ANSWERED — tindak lanjut OPEN (T-01, landing page, implementation-first) | T-01 diverifikasi Muse + ditinjau GPT; landing page terpisah bila owner memutuskan |
| Klasifikasi Vercel Hobby (U-101) | Owner proyek | Terms resmi dibaca 2026-11-08 | NOT VERIFIED | Owner memutuskan non-komersial vs komersial sebelum deploy Hobby |
| CPU checkLink vs 10 ms Cloudflare (U-102, M-10) | Muse + staging | Belum pernah diukur | NOT VERIFIED | Ukur setelah port/adapter tersedia |
