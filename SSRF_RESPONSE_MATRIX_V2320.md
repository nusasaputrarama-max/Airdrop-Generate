# Matriks Respons v2.3.20 atas Audit Independen V13

**Revisi:** v2.3.20 — jawaban atas audit independen V13
(`SSRF_INDEPENDENT_AUDIT_V13.md`, commit `fe84a4b`, audit
2026-11-08 12:16–12:20 WIB atas v2.3.19 commit `f2f928f`)
**Tanggal revisi:** 2026-11-08 (WIB)
**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Dokumen desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.31
**Proposal F-001..F-005:** `SSRF_PROPOSAL_F001_F005_V2320.md`
(SHA-256 `a672b050…`, 1.144 baris)
**Staging readiness:** `STAGING_READINESS_V2320.md` (SHA-256 `b7d54fa3…`)
**Matriks sebelumnya:** `SSRF_RESPONSE_MATRIX_V2319.md`
(diperbarui status F-036/F-037/U-77 di bawah; isinya
dipertahankan utuh sebagai catatan sejarah)

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.20

(a) desain remediasi — boleh dilanjutkan dan ditinjau (inilah
v2.3.20); (b) implementasi pada source code — butuh persetujuan
eksplisit terpisah dari pemilik proyek, **TIDAK diberikan saat
ini**; (c) penerapan ke situs live — butuh persetujuan dan
prosedur deployment tersendiri. **Perubahan pada source mirror
GitHub TIDAK otomatis berarti situs live berubah.** v2.3.20
TIDAK mengimplementasikan apa pun; F-001..F-005 tetap
OPEN/BLOCKED sampai tahap (b) + bukti harness staging.

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

**Catatan penting tentang "addressed" di revisi ini:** F-038..F-043
adalah temuan DESAIN atas proposal v2.3.19. "Addressed" di sini
berarti DESAINNYA diperbaiki + mekanisme yang diperbaiki dibuktikan
di VM — BUKAN berarti F-001..F-005 tertutup. F-001..F-005 tetap
**blocked** (OPEN) sampai implementasi tahap (b) + bukti staging.
Tidak ada satu pun finding F-001..F-005 yang ditandai closed di
revisi ini.

## §1. Ringkasan status F-001..F-043

| ID | Temuan | Status v2.3.20 | Ringkasan |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Proposal direvisi (§1 proposal: guard empty set F-042, port 80/443, DNS timeout + late-result, tanpa fallback; H-SSRF-27..30 baru). Implementasi tetap menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Proposal direvisi (§2 proposal: L0/L1 dipisah, Model A/B, tryReserve, A1/A2, serialisasi script; H-RES-13/14 baru; H-RES-07 direvisi). Implementasi menunggu tahap (b). |
| F-003 | High — tanpa total deadline | **blocked** | Proposal direvisi (§3 proposal: deadline 20 detik — KOREKSI dari 30 detik v2.3.19; DB lease global default; trusted IP + anti-spoof; H-RES-15..17 baru). Tetap OPEN sampai H-RES-04..06/11..12/15..17 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Migrasi 0006 DITULIS ULANG (§4 proposal: tanpa owner di projects, tanpa backfill; checks.owner_user_id; savedProjects composite key; kolom kanonik + unique index per (chain, canonical); H-CAT-07..10 baru). Migrasi menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Proposal diperbarui (§5 proposal: tabel peran model global; H-AUTH-04 direvisi; H-AUTH-07 baru; service principal). Mekanisme butuh keputusan pemilik (K-4). |
| F-006b | Narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah. |
| F-006c | DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah. |
| F-016 | Cache fetch | **blocked** | Tidak berubah; cabang pilihan G-F kini menjadi keputusan K-1 di proposal. |
| F-017 | Cache key tidak memperhitungkan cap | **blocked** | Tidak berubah. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Model diputuskan desain (global) + migrasi v2 SELESAI (§4 proposal); semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada; ratifikasi owner (G-C) tersisa. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR; tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. `checkLink` TIDAK di-invoke. Deployment tetap BLOCKED. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest tetap kosong. |
| F-030 | Bun/lockfile + SDK path | **blocked (CONFIRMED BLOCKER)** | Tidak berubah. |
| F-033 | Rasio memori A/B terkonfounded | **addressed** (dipertahankan sebagai VM evidence saja) | Tidak berubah: rasio 1,12–2,62× tetap HANYA bukti VM; F-029 TIDAK diulang. |
| F-034 | Low — oracle terminasi child menerima semua exception sebagai proses mati | **addressed** | Dipertahankan; audit V13 §3.1 menyatakan ADDRESSED pada level harness VM (50 assert PASS). |
| F-035 | Low — PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU | **addressed** (harness VM) | Dipertahankan; audit V13 §3.2–3.3 menyatakan ADDRESSED pada level harness VM, dengan residual U-77. |
| F-036 | Low — parser menerima starttime nol dan dapat salah menyatakan PID hidup sebagai mati | **addressed** | Dipertahankan; audit V13 §3.1 menyatakan ADDRESSED pada level harness VM (50 assert PASS). |
| F-037 | Medium — tes regresi memakai path tetap di /tmp dan dapat menghapus/menimpa file yang bukan miliknya | **addressed** | Dipertahankan; audit V13 §3.2 menyatakan ADDRESSED pada level harness VM (59 + 25 assert PASS), dengan catatan raw log run pertama tidak tersedia — diperbaiki sebagai ATURAN di v2.3.20 (§9 proposal + §10 butir 2 matriks ini). |
| F-038 | Medium — L0 compressed-byte counter bertentangan dengan perilaku Response.body Bun | **addressed** (desain diperbaiki + bukti VM; F-002 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f038-layers-v2320.txt` (8 assert PASS). |
| F-039 | Medium — aggregate decoded budget belum mendefinisikan reservasi atomik dan batas overshoot untuk reader paralel | **addressed** (desain diperbaiki + bukti VM; F-002 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f039-tryreserve-v2320.txt` (23 assert PASS). |
| F-040 | High — model ownership F-004/F-018 berisiko mengubah katalog global menjadi katalog privat satu owner | **addressed** (desain diputuskan: global + migrasi ditulis ulang; F-004/F-018 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f043-canonical-v2320.txt` (bagian F-040) + proposal §4. |
| F-041 | Medium — total deadline dan concurrency policy proposal tidak konsisten dengan keputusan desain terdahulu | **addressed** (desain direkonsiliasi: 20 detik + DB lease default + trusted IP; F-003 tetap OPEN/BLOCKED) | §2 matriks ini. |
| F-042 | Medium — SSRF guard pseudodiff tidak menolak set DNS kosong dan belum memetakan seluruh policy constraints ke acceptance tests | **addressed** (desain diperketat + bukti VM; F-001 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f042-guard-v2320.txt` (47 assert PASS). |
| F-043 | Medium — normalisasi unique index F-004 tidak konsisten dengan komentar dan semantik alamat lintas chain | **addressed** (desain diperbaiki + bukti VM atas kesamaan app-vs-DB; F-004 tetap OPEN/BLOCKED) | §2 matriks ini. Bukti: `test-f043-canonical-v2320.txt` (27 assert PASS). |
| U-72 | Test seam F029_CHILD_SCRIPT | **addressed** (harness lokal) | Dipertahankan; audit V13 §5 menyatakan ADDRESSED (25 assert PASS). |
| U-73 | Oracle terminasi (F-034) | **addressed** | Dipertahankan. |
| U-74 | File PID path tetap (F-035) | **addressed** | Dipertahankan. |
| U-75 | Parser starttime 0 (F-036) | **addressed** | Dipertahankan; audit V13 mengonfirmasi penutupan di level harness VM. |
| U-76 | Tes regresi path tetap (F-037) | **addressed** | Dipertahankan; audit V13 mengonfirmasi penutupan di level harness VM. |
| U-77 | Trust boundary UID-sama (F-035) | **accepted assumption** (risiko tersisa tercatat) | Dipertahankan; audit V13 §3.3 menyatakan asumsi dapat diterima untuk VM single-user, NOT VERIFIED untuk host multi-user. |
| U-78..U-86 | Risiko baru v2.3.20 (F-038..F-043) | **BARU — tercatat, OPEN** | Lihat proposal Lampiran B + matriks §5. |

## §2. Respons per temuan baru V13

### F-038 — Medium: L0 compressed-byte counter bertentangan dengan perilaku Response.body Bun — **addressed** (desain diperbaiki + bukti VM empiris; F-002 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.20 §2.3 DITULIS ULANG: definisi tiga lapisan
  (L0 wire / L1 decoded / L3 aggregate) menggantikan definisi
  v2.3.19 yang salah; aturan mengikat "SATU chunk TIDAK PERNAH
  dihitung sebagai L0 dan L1 sekaligus"; `Response.body` Bun
  HANYA menghasilkan L1.
- Dua model dipilih eksplisit (K-7): Model B — transport mentah +
  dekompresi di aplikasi (rekomendasi; L0 terukur); Model A —
  egress/infrastruktur menegakkan L0, aplikasi TIDAK mengklaim L0
  (fallback; tanpa bukti egress, Model A TIDAK memenuhi F-002 —
  dicatat U-78, bukan disembunyikan). Bila runtime produksi tidak
  mendukung transport mentah (STAGE-P01 FAIL): implementasi
  DIBLOKIR, bukan lanjut dengan klaim palsu.
- `Content-Length` tetap DILARANG sebagai oracle.
- Tes baru H-RES-13 (L0/L1 layer test dengan fixture wire/decoded
  diketahui).

**Bukti (VM, Bun 1.4.4, 2026-11-08 12:54:41 WIB):**
- Log `evidence/v2320/test-f038-layers-v2320.txt` (19 baris,
  SHA-256 `001c24a6…`, exit 0): **8 assert PASS, 0 FAIL** —
  fixture gzip 520 byte wire → 500.000 byte decoded (rasio
  961,5x); chunk `Response.body` berjumlah 500.000 (decoded);
  penghitung naif "wire = chunk.length" overstate ~962x;
  transport mentah (`node:http`) mengukur 520 byte (wire
  sebenarnya); `fetch()` dengan `Accept-Encoding: identity`
  TETAP mendekompresi (500.000 byte, bukan gzip magic) —
  aplikasi TIDAK DAPAT memperoleh raw bytes lewat Bun fetch.
- Skrip `evidence/v2320/test-f038-layers-v2320.ts` (SHA-256
  `f78335d8…`). Run pertama dipertahankan terpisah
  (`test-f038-layers-v2320-run1-label.txt`, SHA-256 `3df13787…`,
  8 PASS — label satu assertion diperbaiki karena menyebut
  "max 16 KiB" padahal chunk teramati 483.616 byte; lihat §10
  butir 1).
- **Kriteria penerimaan audit V13 §8 butir 1 terpenuhi pada level
  desain + bukti VM:** dokumen menyebut tegas layer yang diukur
  (tabel L0/L1/L3 §2.3), bukti raw/decoded terpisah ada,
  tidak ada klaim L0 dari `Response.body`.

**Sisa risiko:** U-78 (egress limit L0 UNASSIGNED — Model A belum
memenuhi F-002 tanpa buktinya); U-83 (transport mentah mungkin
tidak didukung runtime produksi — STAGE-P01 harus membuktikan);
U-62 (Bun 1.3.10 vs 1.4.4 — perilaku dekompresi kanonik NOT
VERIFIED). F-002 tetap OPEN/BLOCKED sampai implementasi + H-RES-13
PASS di staging.

### F-039 — Medium: aggregate decoded budget belum mendefinisikan reservasi atomik dan batas overshoot untuk reader paralel — **addressed** (desain diperbaiki + bukti VM; F-002 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.20 §2.3: `tryReserve()` sinkron SEBELUM append
  (check-and-reserve atomik; bila async, dua reader dapat lolos
  cek yang sama — race yang dibuktikan F-039); definisi A1
  (accepted/retained — dijamin keras A1 ≤ cap) vs A2
  (transient/in-flight — batas RUMUS R × C_max, bukan angka
  mutlak); C_max dinyatakan TIDAK dijamin kecil oleh runtime
  (bukti f024: hingga 393.110 byte; probe v2.3.20: 483.616 byte
  pada satu run, 16.384 byte pada run lain).
- **Keputusan serialisasi:** script dibaca SERIAL (satu reader
  aktif, R = 1) sehingga batas A2 menjadi 1 × C_max. Trade-off
  latensi TERUKUR (bukan ditebak): paralel 19–22 ms vs serial
  25–28 ms pada fixture 400k + 3×300k di jaringan lokal — selisih
  ~6 ms, jauh di bawah deadline 20 detik. Alternatif paralel
  (R = 3, A2 ≤ 3 × C_max) DITOLAK untuk desain ini dengan alasan
  tercatat (batasnya bergantung pada C_max yang tidak dijamin).
- Saat aggregate terlampaui: batalkan SEMUA reader, buang
  seluruh hasil parsial, jangan simpan verdict parsial.
- H-RES-07 DIREVISI (klaim v2.3.19 "cap + satu chunk" SALAH dan
  diganti — bukan dipertahankan); H-RES-14 baru (tryReserve +
  A1/A2).
- Catatan implementasi baru: `await fetch(...)` dan
  `await reader.cancel()` HARUS di try/catch dengan AbortError
  ditangkap (temuan evidence — lihat §10 butir 3).

**Bukti (VM, Bun 1.4.4, 2026-11-08 12:58:21 WIB):**
- Log `evidence/v2320/test-f039-tryreserve-v2320.txt` (39 baris,
  SHA-256 `a94ad487…`, exit 0): **23 assert PASS, 0 FAIL**.
  Bagian 1 (simulasi lockstep deterministik, tanpa jaringan):
  logika baru A1 = 989.824 ≤ cap (tepat seperti hitungan);
  logika lama v2.3.19 A1 = 1.186.432 > cap, overshoot 186.432 =
  3 chunk (membuktikan klaim "cap + satu chunk" SALAH);
  varian serial A1 = tepat 1.000.000. Bagian 2 (jaringan lokal
  nyata, Bun fetch): paralel dan serial — A1 ≤ cap, abort
  terjadi, 0 append setelah abort, hasil parsial dibuang,
  peak pending (A2 teramati) = 65.536.
- Skrip `evidence/v2320/test-f039-tryreserve-v2320.ts` (SHA-256
  `2b16ea32…`). Dua run sebelumnya dipertahankan terpisah:
  `test-f039-tryreserve-v2320-run1-noisy.txt` (SHA-256
  `7cee87ec…`, 22 PASS + 3 unhandled AbortError dari
  `reader.cancel()` tanpa await) dan
  `test-f039-tryreserve-v2320-run2-fail.txt` (SHA-256
  `6b3b1cb6…`, 22 PASS + 1 FAIL — handler unhandledRejection
  menangkap ketiganya; akar masalah lalu diperbaiki).
- **Kriteria penerimaan audit V13 §8 butir 2 terpenuhi pada level
  desain + bukti VM:** tryReserve dirancang sinkron sebelum
  append; A1/A2 didefinisikan terpisah; batas overshoot dinyatakan
  (serial: 1 × C_max, terukur); H-RES-07 direvisi + H-RES-14 baru.

**Sisa risiko:** U-79 (C_max deployment-dependent; staging harus
mengukur C_max pada runtime kanonik 1.3.10); U-62 (tetap).
F-002 tetap OPEN/BLOCKED sampai implementasi + H-RES-07 (revisi)
+ H-RES-14 PASS di staging.

### F-040 — High: model ownership F-004/F-018 berisiko mengubah katalog global menjadi katalog privat satu owner — **addressed** (desain diputuskan + migrasi ditulis ulang; F-004/F-018 tetap OPEN/BLOCKED)

**Yang diubah:**
- **Keputusan model (proposal §4.1, §0 K-5): `projects` adalah
  katalog GLOBAL.** Keputusan ini dibuat eksplisit di revisi
  ini (bukan disimpulkan dari `ctx.db` yang tenancy-nya NOT
  VERIFIED). Sisa yang butuh owner/provider: ratifikasi model
  (G-C) + penyediaan service principal (K-9). Cabang per-tenant
  dicatat sebagai alternatif yang ditolak untuk revisi ini
  (proposal §4.7) — dapat dibalik secara terlacak bila owner
  memutuskan lain.
- Migrasi 0006 DITULIS ULANG (proposal §4.3, teks v2 —
  menggantikan teks v2.3.19): TIDAK ADA kolom `owner_user_id`
  di `projects`; TIDAK ADA backfill 15 baris ke satu owner
  (K-6 DIHAPUS); `checks` mendapat `owner_user_id` nullable
  (NULL = riwayat anonim/legacy, dibaca publik seperti sekarang);
  `savedProjects` di-rework ke composite key
  `(principal_id, project_id)` + sentinel `<LEGACY>` yang
  terdokumentasi untuk state lama; `listProjects` membaca
  GLOBAL tanpa filter owner; mutasi katalog lewat gerbang
  otorisasi §5 (admin/service principal saja).
- H-TEN-06/07 v2.3.19 SUPERSEDED (keduanya mengasumsikan
  backfill — alasan supersede dicatat di proposal §4.5, bukan
  dihapus diam-diam); H-TEN-08..10 baru (dua principal baca
  katalog global; isolasi bookmark; service principal job).
  H-AUTH-04 DIREVISI (B MELIHAT baris A — model global);
  H-AUTH-07 baru.
- Peran ditegaskan eksplisit (proposal §5.3): pengguna biasa
  membaca global + menulis HANYA state-nya sendiri; admin/
  service principal menulis katalog; anonim membaca publik.

**Bukti:**
- Mekanisme pendukung (composite key + kanonikalisasi) dibuktikan
  di VM oleh `test-f043-canonical-v2320.txt` (lihat F-043 di
  bawah — 27 assert PASS, termasuk kesamaan fungsi JS vs kolom
  generated DB). Bukti H-TEN-08..10 di staging tetap wajib
  (tidak ada staging yang tersedia — tidak ada yang dikarang).
- **Kriteria penerimaan audit V13 §8 butir 3 terpenuhi pada level
  desain:** model diputuskan (global); `listProjects` tidak
  difilter satu service principal; `savedProjects` per-user
  dengan composite key; tidak ada backfill ke satu owner.

**Sisa risiko:** U-80 (gerbang mutasi bergantung mekanisme
F-005; default Opsi C = katalog manual via migrasi); U-86
(sentinel `<LEGACY>` — collision bila principal baru memakai
string itu; mitigasi: dilarang di §5); G-C (ratifikasi provider/
owner tersisa). F-004/F-018 tetap OPEN/BLOCKED sampai migrasi
0006 v2 dieksekusi + H-CAT/H-TEN PASS di staging.

### F-041 — Medium: total deadline dan concurrency policy proposal tidak konsisten dengan keputusan desain terdahulu — **addressed** (desain direkonsiliasi; F-003 tetap OPEN/BLOCKED)

**Yang diubah:**
- **Deadline: 20 detik.** Proposal v2.3.19 §3.3 yang
  mempertahankan 30 detik ("sudah ada di kode") dinyatakan
  KESALAHAN rekonsiliasi (proposal §3.1). 20 detik adalah
  keputusan pemilik tercatat (§A.5, `TOTAL_TIMEOUT_MS = 20_000`,
  syarat cutover); 30 detik di `actions.ts:378` adalah nilai
  yang HARUS diubah saat implementasi (bagian dari change set
  yang sama). Toleransi staging +2 detik tetap. Aturan baru:
  bila owner kelak memutuskan 30 detik, keputusan itu harus
  eksplisit + tercatat + seluruh dokumen diperbarui konsisten
  pada revisi yang sama. H-RES-04..06/11..12 yang tertulis
  30 detik dibaca 20 detik mulai v2.3.20.
- **Concurrency: global DB lease (`scan_leases`, maks 5) adalah
  DEFAULT.** Varian in-memory semaphore v2.3.19 yang bebas
  dipilih saat implementasi kini TERKUNCI: hanya boleh dipakai
  bila (a) provider MEMBUKTIKAN tertulis deployment
  single-instance DAN (b) owner MENERIMA tertulis batas
  per-instance. Klaim "global" atas semaphore in-memory adalah
  pelanggaran desain.
- **Sumber IP + anti-spoof (BARU):** identitas = alamat IP peer
  TCP langsung; `X-Forwarded-For`/`X-Real-IP` hanya dipakai bila
  peer langsung ada di daftar TRUSTED PROXY tertulis + header
  divalidasi hop-per-hop + hasil ekstraksi adalah IP publik
  valid; bila peer bukan proxy tepercaya, SEMUA forwarding
  header DIABAIKAN. Spoofed XFF dari pemanggil langsung TIDAK
  PERNAH menjadi identitas. Storage rate limit = tabel DB
  (bukan in-memory); angka 10/menit + 100/jam tidak final
  sebelum prasyarat ini ada.
- Tes baru H-RES-15 (deadline 20 detik end-to-end), H-RES-16
  (global lease lintas instance), H-RES-17 (spoofed XFF).

**Bukti:** tidak ada tes VM baru yang diperlukan untuk F-041
(rekonsiliasi keputusan + definisi kebijakan — bukti yang
dibutuhkan adalah staging: H-RES-15..17). Keputusan 20 detik
dapat dilacak ke `SSRF_REMEDIATION_DESIGN.md` §A.5 ("20 detik
total — disetujui pemilik v2", syarat cutover) dan §B.4
(`TOTAL_TIMEOUT_MS = 20_000`, "menggantikan 30_000 di fondasi").
- **Kriteria penerimaan audit V13 §8 butir 4 terpenuhi pada level
  desain:** satu angka deadline (20 detik) dan satu model
  concurrency (DB lease global) yang konsisten di desain,
  proposal, dan test matrix; sumber IP + penolakan spoof
  didefinisikan.

**Sisa risiko:** U-81 (kode mirror masih 30 detik — change set
harus mengubahnya); U-85 (daftar trusted proxy + storage rate
limit belum ada). F-003 tetap OPEN/BLOCKED sampai implementasi
+ H-RES-04..06/11..12/15..17 PASS di staging.

### F-042 — Medium: SSRF guard pseudodiff tidak menolak set DNS kosong dan belum memetakan seluruh policy constraints ke acceptance tests — **addressed** (desain diperketat + bukti VM; F-001 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.20 §1.3: `validateDestination` kini punya guard
  eksplisit — `!Array.isArray(ips)` → deny
  (`resolver-no-answer`); `ips.length === 0` → deny
  (`empty-dns-result`); entri kosong/malformed → deny.
  Mengembalikan IP KANONIK hasil `classifyIp` (untuk
  IPv4-mapped: IPv4 hasil ekstraksi).
- `resolveAll`: timeout DNS 5 detik (race vs timer);
  resolver error (NXDOMAIN/SERVFAIL/NODATA/timeout) → throw →
  DENY; late result DIABAIKAN (generation flag — tidak pernah
  dipakai sebagai destination); AbortSignal TIDAK dianggap
  membatalkan operasi resolver bila API tidak mendukungnya
  (SPIKE_V21 TEST 3).
- `fetchGuarded`: checkPort eksplisit (http→80, https→443,
  selain itu DENY; skema lain/userinfo DENY); tiap hop redirect
  mengulang langkah 0–3 penuh. **LARANGAN KERAS:** bila
  destination pin tidak tersedia, TIDAK ADA fallback ke fetch
  biasa.
- Tes baru H-SSRF-27..30 (empty/NODATA/NXDOMAIN/timeout;
  campuran + malformed; port non-standar; late DNS result).

**Bukti (VM, Bun 1.4.4, 2026-11-08 12:54:41 WIB):**
- Log `evidence/v2320/test-f042-guard-v2320.txt` (53 baris,
  SHA-256 `3108312f…`, exit 0): **47 assert PASS, 0 FAIL** —
  empty/null/undefined → deny; NODATA/NXDOMAIN/resolver error →
  deny; jawaban campuran → deny; 19 alamat terlarang/malformed/
  non-kanonik/zone → deny; mapped publik → ok dengan IPv4
  ekstraksi; port 80/443 ok, 81/8080/8443/22/443-di-http/
  80-di-https/ftp/userinfo → deny; resolver lambat → deny
  timeout dalam 100 ms; late result tiba tetapi tidak dipakai
  (0 koneksi); guard deny → connect TIDAK dipanggil (0 panggilan);
  guard ok → connect tepat 1x ke IP ter-pin.
- Skrip `evidence/v2320/test-f042-guard-v2320.ts` (SHA-256
  `80332a6f…`). Bukti VM atas CERMIN pseudodiff — implementasi
  aplikasi belum ada; H-SSRF-27..30 di staging tetap wajib.
- **Kriteria penerimaan audit V13 §8 butir 5 terpenuhi pada level
  desain + bukti VM:** empty/malformed/resolver error/timeout
  ditolak; port 80/443 + DNS timeout/late-result dipetakan;
  tidak ada fallback ke fetch biasa.

**Sisa risiko:** U-84 (resolver runtime produksi mungkin tidak
mendukung timeout/late-result semantics — guard harus memakai
timeout eksplisit di lapisan aplikasi). F-001 tetap OPEN/BLOCKED
sampai implementasi + H-SSRF-01..30 PASS di staging.

### F-043 — Medium: normalisasi unique index F-004 tidak konsisten dengan komentar dan semantik alamat lintas chain — **addressed** (desain diperbaiki + bukti VM atas kesamaan app-vs-DB; F-004 tetap OPEN/BLOCKED)

**Yang diubah:**
- Proposal v2.3.20 §4.3b: kanonikalisasi PER TIPE ALAMAT —
  EVM hex case-insensitive (trim → strip `0x` → lowercase →
  simpan `'0x' + hex`, validasi tepat 40 char hex); Solana
  base58 case-sensitive (trim SAJA, huruf tidak diubah,
  validasi 32..44 char base58 tanpa `0`/`O`/`I`/`l`).
  `lower(contract_address)` mentah v2.3.19 DIHAPUS dari desain
  (terbukti: mengaburkan case Solana + tidak menghapus prefix
  `0x` sehingga komentar "tanpa prefix" bohong).
- Scope uniqueness: PER `(chain, canonical_address)` — GLOBAL
  lintas tenant (konsisten F-040). Alamat sama di chain berbeda
  = baris berbeda (diizinkan); alamat Solana beda huruf = alamat
  berbeda (diizinkan); alamat EVM beda case/prefix/whitespace =
  alamat sama (ditolak); NULL tidak masuk index.
- Peta chain → tipe alamat mengikat (K-8): EVM — BNB Chain,
  Ethereum, Base, Arbitrum, Polygon, opBNB, Robinhood Chain;
  Solana — Solana. Chain di luar peta → INSERT DITOLAK
  (CHECK constraint DB + pre-check aplikasi fail-closed).
  Peta didasarkan pada seed 0004 saat ini (hanya BNB Chain +
  Robinhood Chain, keduanya EVM; 0 baris Solana — aturan Solana
  didefinisikan sekarang sebelum baris pertama tiba).
- SATU fungsi `canonicalizeContractAddress()` (modul baru
  `catalog.ts`) dipakai pre-check aplikasi DAN dirujuk definisi
  kolom kanonik DB (generated column STORED + unique index) —
  bila keduanya berbeda hasil untuk satu pun input, migrasi
  GAGAL (diuji H-CAT-10).
- Tes baru H-CAT-07..10 (EVM case variants; Solana case
  variants; lintas chain; NULL/whitespace/paralel + kesamaan
  app-vs-DB).

**Bukti (VM, Bun 1.4.4 + bun:sqlite in-memory, 2026-11-08 12:57:35 WIB):**
- Log `evidence/v2320/test-f043-canonical-v2320.txt` (33 baris,
  SHA-256 `6cb5ddcf…`, exit 0): **27 assert PASS, 0 FAIL** —
  fungsi JS == generated column DB untuk SEMUA 7 baris;
  EVM varian case/prefix/whitespace → UNIQUE violation;
  alamat sama chain berbeda → OK; Solana satu huruf beda case
  → OK (alamat berbeda); Solana sama persis → UNIQUE violation;
  dua baris NULL → OK; chain tak dikenal → reject aplikasi +
  CHECK constraint; full-lowercase alamat Solana DITOLAK
  (`'l'` bukan base58 — bukti tambahan bahwa `lower()` pada
  Solana adalah bug, bukan normalisasi).
- Skrip `evidence/v2320/test-f043-canonical-v2320.ts` (SHA-256
  `6923db5a…`). Tabel + generated column + index dibuat PERSIS
  teks migrasi 0006 v2. Run pertama GAGAL dan dipertahankan
  terpisah (`test-f043-canonical-v2320-run1-fail.txt`, SHA-256
  `fd71e6c7…`, exit 1 — varian "lowercase seluruh alamat Solana"
  ternyata bukan alamat valid; cacat pada TES, diperbaiki —
  lihat §10 butir 4).
- **Kriteria penerimaan audit V13 §8 butir 6 terpenuhi pada level
  desain + bukti VM:** aturan EVM/Solana dipisah; scope uniqueness
  diputuskan (per chain, global); expression index benar-benar
  sama dengan komentar dan pre-check (dibuktikan 100% cocok
  untuk semua baris uji).

**Sisa risiko:** U-82 (peta chain harus diperluas tiap chain
baru tiba; chain baru DITOLAK sampai dipetakan — fail-closed,
tetapi dapat menghambat penambahan katalog yang sah). F-004
tetap OPEN/BLOCKED sampai migrasi 0006 v2 dieksekusi +
H-CAT-07..10 PASS di staging.

### Butir 7 — Traceability & konsistensi dokumen — **addressed**

**Yang diubah:**
- Kalimat stale di header `SSRF_REMEDIATION_DESIGN.md` (baris 5)
  yang masih menyatakan "butir 2 brief (proposal remediasi
  F-001..F-005 yang implementation-ready) BELUM dikerjakan"
  DIPERBAIKI pada revisi ini (lihat §D.4.31): proposal SELESAI
  v2.3.19 dan DIREVISI v2.3.20. Header juga diperbarui ke
  "Revisi v2.3.20 (8 November 2026)" + rujukan matriks v2.3.20.
  Tidak ada substansi desain lain yang diubah pada file itu.
- Aturan raw log BARU (proposal §9, mengikat semua revisi mulai
  v2.3.20): setiap run gagal dan run ulang disimpan sebagai file
  terpisah (tidak pernah ditimpa); setiap log memuat tanggal WIB,
  versi Bun, UID, label lingkungan, PASS/FAIL, exit code; setiap
  status matriks harus dapat ditelusuri ke file + test ID + raw
  log (+ SHA-256) + commit SHA + tanggal run + exit code.
- Revisi ini MEMPRAKTIKKAN aturan itu (bukan hanya menulisnya):
  5 file log non-kanonik dipertahankan di `evidence/v2320/` —
  `test-f038-layers-v2320-run1-label.txt` (label diperbaiki),
  `test-f043-canonical-v2320-run1-fail.txt` (exit 1),
  `test-f039-tryreserve-v2320-run1-noisy.txt` (3 unhandled
  AbortError), `test-f039-tryreserve-v2320-run2-fail.txt`
  (22 PASS + 1 FAIL) — masing-masing dengan penyebab +
  perbaikan yang dicatat di `evidence/v2320/README.md`
  (SHA-256 `ba5e3f7b…`) dan §10 matriks ini.
- **Kriteria penerimaan audit V13 §8 butir 7 terpenuhi:**
  kalimat stale diperbaiki; raw log gagal + ulang tersedia
  sebagai file terpisah; setiap status di matriks ini merujuk
  file + test ID + log + SHA + tanggal + exit code.

**Sisa risiko:** log gagal historis yang sudah hilang (SU-T5,
run pertama F-035 v2.3.19) tetap NOT PRESERVED — tidak pernah
direkonstruksi (aturan §9 butir 5).

### Butir 8 — Hard gates — **addressed** (dipertahankan)

- F-001..F-005 tetap OPEN/BLOCKED (lihat §1 — tidak satu pun
  ditandai closed di revisi ini).
- ST-01..ST-12 dan STAGE-P01..P12 tetap BLOCKED/NOT RUN
  (`STAGING_READINESS_V2320.md` — keenam peran tetap UNASSIGNED;
  tiga baris baru 9–11 juga UNASSIGNED/BLOCKED).
- F-019/F-028 tetap NOT VERIFIED; `checkLink` TIDAK di-invoke;
  Link Scanner TIDAK diaktifkan; tidak ada deploy atau
  public-share; tidak ada source implementation tanpa otorisasi
  eksplisit terpisah dari pemilik proyek.
- **Kriteria penerimaan audit V13 §8 butir 8 terpenuhi:**
  tidak ada satu pun gate yang dilonggarkan di revisi ini.

## §3. Response to Previous Handoff — status temuan V12 menurut audit V13 §3 (dicatat, bukan diklaim ulang)

| Butir V12 | Status menurut V13 §3 | Status v2.3.20 |
| --- | --- | --- |
| F-036 parser PID | ADDRESSED — harness VM (50 assert PASS) | **ADDRESSED** — dipertahankan (§1) |
| F-037 keselamatan filesystem | ADDRESSED — harness VM (59 + 25 assert PASS), dengan catatan raw log run pertama tidak tersedia | **ADDRESSED** — dipertahankan; catatan itu dijawab sebagai ATURAN raw log v2.3.20 (§2 butir 7) |
| Trust boundary F-035 child writer | ADDRESSED untuk asumsi harness yang dinyatakan; NOT VERIFIED untuk host multi-user (residual U-77) | **ADDRESSED** — dipertahankan; U-77 tetap tercatat |
| Proposal F-001..F-005 | Tersedia untuk review, tetapi BELUM DITERIMA tanpa koreksi (F-038..F-043) | **DIREVISI v2.3.20** — keenam temuan dijawab (§2); proposal tetap menunggu review independen V14 |
| Staging readiness | Dokumentasi gap terpenuhi; readiness operasional tetap BLOCKED | **ADDRESSED AS GAP DOCUMENTATION** — `STAGING_READINESS_V2320.md`, keenam peran tetap UNASSIGNED + 3 baris baru UNASSIGNED/BLOCKED |
| F-030/F-009 | CONFIRMED REPRODUCIBILITY BLOCKER | **ADDRESSED AS CARRY-FORWARD** — tetap blocker |
| F-019/F-028 | BLOCKED / NOT VERIFIED | **ADDRESSED AS CARRY-FORWARD — NOT VERIFIED** — tidak berubah |
| Konsistensi dokumentasi | Kalimat stale di header desain (proposal disebut belum dikerjakan) | **DIPERBAIKI v2.3.20** (§2 butir 7) |

## §4. Jawaban atas Handoff V13 §8 (8 butir)

### Butir 1 — Perbaiki F-038 — **addressed** (lihat §2 F-038)

- L0/L1 dipisah; Model A/B dipilih (K-7); tidak ada klaim L0
  dari `Response.body`; bukti raw/decoded terpisah
  (`test-f038-layers-v2320.txt`, 8 assert PASS).
- Acceptance audit terpenuhi pada level desain + bukti VM;
  H-RES-13 baru untuk staging.

### Butir 2 — Perbaiki F-039 — **addressed** (lihat §2 F-039)

- `tryReserve` sinkron sebelum append; A1/A2 didefinisikan
  terpisah; batas overshoot dinyatakan (serial: 1 × C_max,
  terukur ~6 ms); H-RES-07 direvisi + H-RES-14 baru.
- Bukti: `test-f039-tryreserve-v2320.txt` (23 assert PASS) —
  logika lama terbukti overshoot 186.432 byte.

### Butir 3 — Rancang ulang F-040 — **addressed** (lihat §2 F-040)

- Model diputuskan: katalog GLOBAL; tidak ada backfill ke satu
  owner; `savedProjects` composite key; H-TEN-08..10 +
  H-AUTH-07 baru; H-TEN-06/07 superseded dengan alasan tercatat.
- Acceptance audit terpenuhi pada level desain; H-TEN-08..10
  di staging tetap wajib.

### Butir 4 — Rekonsiliasi F-041 — **addressed** (lihat §2 F-041)

- Deadline 20 detik (koreksi kesalahan v2.3.19); DB lease
  global default; in-memory semaphore terkunci; sumber IP
  tepercaya + penolakan spoofed XFF + storage rate limit
  didefinisikan; H-RES-15..17 baru.
- Acceptance audit terpenuhi pada level desain: satu angka
  deadline + satu model concurrency yang konsisten.

### Butir 5 — Perketat F-042 — **addressed** (lihat §2 F-042)

- Guard empty set eksplisit; port 80/443; DNS timeout 5 detik +
  late-result diabaikan; tanpa fallback ke fetch biasa.
- Bukti: `test-f042-guard-v2320.txt` (47 assert PASS).
- Acceptance audit terpenuhi pada level desain + bukti VM;
  H-SSRF-27..30 baru untuk staging.

### Butir 6 — Perjelas F-043 — **addressed** (lihat §2 F-043)

- Kanonikalisasi per tipe alamat; scope per (chain, canonical),
  global; expression index == komentar == pre-check (dibuktikan
  100% cocok di VM); H-CAT-07..10 baru.
- Bukti: `test-f043-canonical-v2320.txt` (27 assert PASS).

### Butir 7 — Perbaiki traceability dan konsistensi dokumen — **addressed** (lihat §2 butir 7)

- Kalimat stale header desain diperbaiki; aturan raw log (§9
  proposal) ditetapkan + dipraktikkan (5 file log non-kanonik
  dipertahankan); setiap status matriks ini dapat ditelusuri ke
  file + test ID + log + SHA + tanggal + exit code.

### Butir 8 — Pertahankan hard gates — **addressed** (lihat §2 butir 8)

- F-001..F-005 tetap OPEN/BLOCKED; ST-01..ST-12 dan
  STAGE-P01..P12 tetap BLOCKED/NOT RUN; F-019/F-028 tetap
  NOT VERIFIED; tidak ada implementasi tanpa otorisasi.

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.20)

| ID | Risiko | Status v2.3.20 |
| --- | --- | --- |
| U-38-A..D, U-33-A..F | Pemetaan artefak / runtime | Carry-forward; tidak ada bukti baru yang menutupnya. |
| U-41, U-43, U-44, U-45, U-46 | Keputusan owner / pensinyalan | Carry-forward; U-46 tetap keputusan owner yang belum ada (implementasi pensinyalan tetap DIBLOKIR). |
| U-47, U-48, U-49 | DG-1..DG-3 (file lock) | Carry-forward (persyaratan desain, belum diimplementasikan). |
| U-50..U-54 | F-016..F-020 | Carry-forward. |
| U-55..U-58 | F-021/F-022, artifact-state | Carry-forward. |
| U-59..U-62 | H-RES-02/03/05, dekompresi Bun | Carry-forward; U-62 tetap (Bun 1.3.10 vs 1.4.4 NOT VERIFIED). |
| U-63..U-66 | F-026/F-027/F-028, lockfile | Carry-forward. |
| U-67, U-68 | F-029/F-030 | Carry-forward. |
| U-69, U-70 | F-031/F-032 | Carry-forward. |
| U-71 | F-033 (instrumen A/B terkonfounded) | Carry-forward (VM-only). |
| U-72 | F-032 test seam | Dipertahankan (tes seam ditulis ulang v2.3.19; tidak diulang v2.3.20 — tidak ada perubahan relevan). |
| U-73 | F-034 oracle terminasi | Dipertahankan; audit V13 mengonfirmasi ADDRESSED (harness VM). |
| U-74 | F-035 file PID path tetap | Dipertahankan. |
| U-75 | F-036 parser starttime 0 | Dipertahankan; audit V13 mengonfirmasi ADDRESSED (harness VM). |
| U-76 | F-037 tes regresi path tetap | Dipertahankan; audit V13 mengonfirmasi ADDRESSED (harness VM). |
| U-77 | F-035 trust boundary UID-sama | Accepted assumption (tetap tercatat); audit V13: dapat diterima untuk VM single-user, NOT VERIFIED untuk host multi-user. |
| U-78 | **BARU v2.3.20** (F-038) | Egress limit L0 masih UNASSIGNED (Model A tidak memenuhi F-002 tanpa buktinya). Penanganan: prasyarat staging STAGE-P03; pemilik egress UNASSIGNED. |
| U-79 | **BARU v2.3.20** (F-039) | C_max deployment-dependent; batas A2 paralel bergantung runtime kanonik 1.3.10 (NOT VERIFIED). Penanganan: serialisasi (R = 1); staging harus mengukur C_max. |
| U-80 | **BARU v2.3.20** (F-040) | Gerbang mutasi katalog global bergantung mekanisme F-005; default Opsi C = katalog manual via migrasi. Penanganan: dinyatakan sebagai harga yang diterima. |
| U-81 | **BARU v2.3.20** (F-041) | Kode mirror masih 30 detik; change set harus mengubahnya ke 20 detik. Penanganan: diikat §3.3 proposal + H-RES-15; rollback mempertahankan 20 detik. |
| U-82 | **BARU v2.3.20** (F-043) | Peta chain harus diperluas tiap chain baru tiba; chain baru DITOLAK sampai dipetakan. Penanganan: fail-closed by design; perluasan = keputusan owner + migrasi (K-8). |
| U-83 | **BARU v2.3.20** (F-038) | Transport mentah (Model B) mungkin tidak didukung runtime produksi. Penanganan: STAGE-P01 harus membuktikan; bila FAIL, jatuh ke Model A + bukti egress. |
| U-84 | **BARU v2.3.20** (F-042) | Resolver runtime produksi mungkin tidak mendukung timeout/late-result semantics. Penanganan: timeout eksplisit di lapisan aplikasi; bukan andalkan AbortSignal. |
| U-85 | **BARU v2.3.20** (F-041) | Daftar trusted proxy + storage rate limit belum ada; angka 10/menit + 100/jam belum dapat ditegakkan. Penanganan: prasyarat staging (K-9). |
| U-86 | **BARU v2.3.20** (F-040) | Sentinel `<LEGACY>` pada savedProjects: collision bila principal baru memakai string itu. Penanganan: sentinel didokumentasikan; principal baru dilarang memakai nilai itu (§5 proposal). |

## §6. Hard gates — ditegaskan kembali (v2.3.20)

No Link Scanner activation, no public deployment, no production
build, no DB/catalog change, no source implementation tanpa owner
approval terpisah (HOLD perubahan source mirror sampai klarifikasi
F-020 tetap berlaku), no production testing (termasuk tidak
memanggil `checkLink`). F-001..F-005, F-016/F-017/F-022, F-018
tetap OPEN/BLOCKED. Penutupan F-001 butuh H-SSRF-01..30 terhadap
implementasi aktual di staging terisolasi + log mentah + review
independen — hasil VM saja tidak cukup. Proposal v2.3.20 BUKAN
otorisasi implementasi. Aturan raw log (§9 proposal) mengikat
semua revisi mulai v2.3.20.

## §7. Yang butuh keputusan Rama (pemilik proyek)

- K-1..K-5 + K-7..K-9 + G-A (proposal §7) — keputusan atas cabang
  cache, nilai cap + definisi layer, toleransi deadline 20 detik,
  mekanisme otorisasi F-005, ratifikasi model katalog global,
  model L0, peta chain, service principal + trusted proxy, dan
  otorisasi tahap (b). K-6 DIHAPUS (superseded F-040).
- G-B — bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- G-C — keputusan tenancy F-018 (ratifikasi model global + pernyataan
  resmi provider tentang scope `ctx.db`).
- G-D — keputusan U-46.
- G-E — staging tersedia + keenam peran UNASSIGNED terisi.
- G-F — keputusan cache F-022 (sama dengan K-1).
- G-G — keputusan Bun F-009 (kanonik 1.3.10 vs 1.4.4).
- G-H — eksekusi harness H-RES-02/03/05 yang sudah dikoreksi.
- G-I — stress test memori H-RES-03/05 pada staging + proses
  deployment manifest.
- G-J — keputusan reproduksibilitas F-030.
- **G-K (diperbarui v2.3.20)** — review + keputusan atas proposal
  F-001..F-005 v2.3.20: ChatGPT meninjau proposal
  (`SSRF_PROPOSAL_F001_F005_V2320.md`) dan Rama memutuskan
  K-1..K-5 + K-7..K-9 + G-A. Prasyarat: tidak ada (proposal sudah
  tersedia untuk ditinjau); hasil: keputusan per K-item +
  otorisasi tahap (b) per change set, atau penolakan dengan alasan.

## §8. Yang TIDAK diklaim v2.3.20

- Tidak ada perubahan source aplikasi, database/katalog,
  package/lockfile, workflow CI, deployment, atau live artifact.
- Tidak ada staging, production, CI release, atau live artifact
  yang diuji. Semua log baru adalah tes harness VM lokal
  (Bun 1.4.4, uid 0 — lihat catatan uid di `evidence/v2320/README.md`).
- F-001..F-005 TIDAK closed. Proposal bukan implementasi.
- F-019/F-028 tetap NOT VERIFIED/BLOCKED. F-030 tetap CONFIRMED
  BLOCKER. Keenam peran staging tetap UNASSIGNED (+ 3 baris baru
  9–11 UNASSIGNED/BLOCKED).
- `checkLink` TIDAK di-invoke. Link Scanner TIDAK diaktifkan.
- Rasio memori F-029 (1,12–2,62×) tetap HANYA bukti VM.
- Bukti VM v2.3.20 (105 assert) membuktikan MEKANISME desain yang
  diperbaiki (guard fail-closed, layer L0/L1, tryReserve,
  kanonikalisasi) — BUKAN keamanan implementasi aplikasi, yang
  belum ada.

## §9. Gate konkret berikutnya (v2.3.20 → v2.3.21)

Pemicu revisi v2.3.21: audit independen V14 atas v2.3.20, ATAU
keputusan owner atas K-1..K-5/K-7..K-9 / G-A / G-C / G-D / G-F /
G-G (G-K), ATAU bukti runtime G-B, ATAU staging tersedia (G-E) —
mana pun yang datang dulu. Tidak ada revisi baru yang hanya
mengulang status v2.3.20.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan | Percobaan / hasil | Pelajaran |
| --- | --- | --- | --- |
| 1 | Label assertion F-038 menyebut "max 16 KiB" padahal chunk teramati 483.616 byte (run 12:54:27 WIB, 8 PASS) | Penyebab: label disalin dari probe awal (chunk pertama 16.384 byte) padahal chunk reader Bun bervariasi antar run (2 chunk: 16.384 + 483.616). BUKAN cacat mekanisme: semua 8 assert lolos. Perbaikan: label diubah menjadi "ukuran chunk runtime bervariasi dan tidak dijamin kecil". Re-run 12:54:41 WIB → 8 PASS. Log run pertama dipertahankan sebagai `test-f038-layers-v2320-run1-label.txt` (SHA-256 `3df13787…`). | Label assertion harus menyebut apa yang DIUKUR, bukan angka dari run lain; ukuran chunk runtime bervariasi — itulah sebabnya batas A2 dinyatakan sebagai rumus (R × C_max). |
| 2 | Raw log run pertama F-035 v2.3.19 tidak tersedia (catatan audit V13 §3.2) — kegagalan hanya tercatat sebagai ringkasan | Tidak dapat diperbaiki surut (log hilang). Penanganan v2.3.20: ATURAN raw log (§9 proposal) ditetapkan + dipraktikkan — 5 file log non-kanonik dipertahankan di `evidence/v2320/` (lihat README paket, SHA-256 `ba5e3f7b…`). | Setiap run gagal/ulang disimpan sebagai file terpisah; jangan pernah timpa log kanonik dengan re-run. |
| 3 | Run pertama `test-f039-tryreserve-v2320.ts` mencetak 3 unhandled AbortError (stack trace) walau 22 assert PASS dan exit 0 | Penyebab: `reader.cancel()` tanpa await di blok `finally` — pada stream yang sudah di-abort, cancel() me-reject AbortError menjadi unhandled rejection (false green: log berisik tetapi exit 0). Diagnosis: skrip probe `/tmp/f038-probe/diag.ts` membuktikan fetch() yang belum resolve juga reject AbortError bila shared controller abort — karena itu `await fetch` HARUS di try/catch. Perbaikan: `await reader.cancel()` di try/catch + handler `process.on("unhandledRejection")` yang MENGGAGALKAN tes bila ada satu pun unhandled rejection. Run kedua masih FAIL (22 PASS + 1 FAIL — handler menangkap ketiganya); run ketiga 12:58:21 WIB → 23 PASS, 0 FAIL, 0 unhandled. Log run 1 + 2 dipertahankan (`*-run1-noisy.txt` `7cee87ec…`, `*-run2-fail.txt` `6b3b1cb6…`). | `reader.cancel()` tanpa await pada stream ter-abort = unhandled rejection; tes harness HARUS menggagalkan diri sendiri bila ada unhandled rejection (jangan biarkan exit 0 menutupi stack trace). Catatan ini juga menjadi syarat implementasi (§2.3 proposal). |
| 4 | Run pertama `test-f043-canonical-v2320.ts` GAGAL (exit 1) — varian "lowercase seluruh alamat Solana" ternyata bukan alamat valid | Penyebab: `'L'` menjadi `'l'` saat lower-case, dan `'l'` BUKAN karakter base58 (0/O/I/l dikecualikan). Jadi full-lowercase sebuah alamat Solana dapat menghasilkan string yang BUKAN alamat Solana sama sekali — cacat pada TES (bukan pada fungsi yang diuji, yang benar menolaknya). Perbaikan: varian case memakai satu huruf yang valid di kedua case (`'W'`→`'w'`, `'pump'`→`'PUMP'`); ditambah assertion bahwa full-lowercase DITOLAK. Re-run 12:57:35 WIB → 27 PASS. Log run pertama dipertahankan sebagai `test-f043-canonical-v2320-run1-fail.txt` (SHA-256 `fd71e6c7…`). | Jangan mengasumsikan lower-case sebuah alamat Solana tetap valid — justru itulah bukti bahwa `lower()` sembarangan pada Solana adalah bug (F-043). |
| 5 | Tes v2.3.20 berjalan sebagai uid 0 (root), berbeda dengan paket F-035/U-72 v2.3.19 (uid 65534) | Alasan tercatat di `evidence/v2320/README.md`: keempat tes tidak membuat assertion yang bergantung pada privilege (tidak ada fixture `/tmp`, tidak ada signal proses, tidak ada baca `/proc`). Menjalankan ulang sebagai non-root tidak mengubah satu pun assertion. Pola stage + verifikasi sha256 (matriks v2.3.19 §10 butir 1) tetap tersedia bila auditor menginginkan run non-root. | Catat UID + alasan di setiap paket bukti; jangan mengklaim non-root bila run-nya root. |
| 6 | F-029/F-032/F-034/F-035/U-72 TIDAK diulang v2.3.20 | Tidak ada perubahan implementasi, lingkungan, harness, atau risiko yang relevan pada kelompok itu (hanya proposal + tes baru F-038..F-043). Audit V13 §3 mengonfirmasi status ADDRESSED mereka pada level harness VM. | Jangan ulangi tes yang sudah punya bukti valid tanpa perubahan material (protokol handoff butir 6). |
| 7 | Staging owners tetap UNASSIGNED; tidak ada keputusan Rama/provider | Tidak ada yang dikarang; `STAGING_READINESS_V2320.md` carry-forward + 3 baris baru (egress L0, transport mentah, trusted proxy) juga UNASSIGNED/BLOCKED; gate G-K diperbarui (K-7..K-9). | — |

## §11. What materially changed (v2.3.19 → v2.3.20) + peta kepatuhan handoff V13

Revisi ini BUKAN pengulangan status: ia menjawab keenam temuan
desain audit V13 (F-038..F-043) dengan perbaikan proposal yang
dapat diverifikasi + bukti VM atas mekanisme yang diperbaiki
(105 assert PASS) + aturan raw log yang dipraktikkan — sambil
mempertahankan F-001..F-005 OPEN/BLOCKED, F-030 sebagai CONFIRMED
BLOCKER, LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED
(F-028), F-019 BLOCKED, dan keenam peran staging UNASSIGNED
(+ 3 baris baru).

| ID | Respons | Rujukan desain/matriks | Bukti (file, test ID, log, SHA, tanggal run) | Kriteria lolos / belum | Risiko tersisa / aksi berikutnya |
| --- | --- | --- | --- | --- | --- |
| F-038 | ADDRESSED (desain + bukti VM) | Proposal §2.3; matriks §2 F-038 | `test-f038-layers-v2320.ts` `f78335d8…`; `test-f038-layers-v2320.txt` `001c24a6…` (8 assert PASS, Bun 1.4.4, uid 0, 2026-11-08 12:54:41 WIB, exit 0) | Lolos: L0/L1 dipisah; Model A/B; tidak ada klaim L0 dari Response.body. Belum: review independen V14; H-RES-13 staging | U-78/U-83; audit V14 |
| F-039 | ADDRESSED (desain + bukti VM) | Proposal §2.3; matriks §2 F-039 | `test-f039-tryreserve-v2320.ts` `2b16ea32…`; `test-f039-tryreserve-v2320.txt` `a94ad487…` (23 assert PASS, Bun 1.4.4, uid 0, 2026-11-08 12:58:21 WIB, exit 0) | Lolos: tryReserve sinkron; A1 ≤ cap (989.824 paralel / 1.000.000 serial); logika lama terbukti overshoot 186.432. Belum: review independen V14; H-RES-07 (revisi) + H-RES-14 staging | U-79; audit V14 |
| F-040 | ADDRESSED (desain diputuskan + migrasi ditulis ulang) | Proposal §4; matriks §2 F-040 | `SSRF_PROPOSAL_F001_F005_V2320.md` `a672b050…` (§4, K-5, H-TEN-08..10); bukti mekanisme di `test-f043-canonical-v2320.txt` `6cb5ddcf…` | Lolos: model global diputuskan; tanpa backfill; savedProjects composite key. Belum: ratifikasi G-C; review V14; H-TEN-08..10 staging | U-80/U-86; G-C; audit V14 |
| F-041 | ADDRESSED (desain direkonsiliasi) | Proposal §3.3; matriks §2 F-041 | `SSRF_PROPOSAL_F001_F005_V2320.md` `a672b050…` (§3.3, K-3/K-9, H-RES-15..17); dasar keputusan di desain §A.5/§B.4 (20 detik, syarat cutover) | Lolos: satu angka deadline (20 detik) + satu model concurrency (DB lease) + trusted IP. Belum: keputusan owner K-3/K-9; review V14; H-RES-15..17 staging | U-81/U-85; audit V14 |
| F-042 | ADDRESSED (desain + bukti VM) | Proposal §1.3; matriks §2 F-042 | `test-f042-guard-v2320.ts` `80332a6f…`; `test-f042-guard-v2320.txt` `3108312f…` (47 assert PASS, Bun 1.4.4, uid 0, 2026-11-08 12:54:41 WIB, exit 0) | Lolos: empty set deny; port 80/443; DNS timeout + late-result; tanpa fallback. Belum: review V14; H-SSRF-27..30 staging | U-84; audit V14 |
| F-043 | ADDRESSED (desain + bukti VM) | Proposal §4.3; matriks §2 F-043 | `test-f043-canonical-v2320.ts` `6923db5a…`; `test-f043-canonical-v2320.txt` `6cb5ddcf…` (27 assert PASS, Bun 1.4.4, uid 0, 2026-11-08 12:57:35 WIB, exit 0) | Lolos: EVM/Solana dipisah; scope per (chain, canonical); JS == kolom DB 100%. Belum: review V14; H-CAT-07..10 staging | U-82; audit V14 |
| Butir 7 traceability | ADDRESSED | Proposal §9; matriks §2 butir 7 + §10 | Desain header diperbaiki (§D.4.31); `evidence/v2320/README.md` `ba5e3f7b…`; 5 log non-kanonik dipertahankan | Lolos: kalimat stale diperbaiki; aturan raw log ditetapkan + dipraktikkan. Belum: review V14 | Log historis hilang tetap NOT PRESERVED |
| Butir 8 hard gates | ADDRESSED | Matriks §2 butir 8; §6 | Tidak ada test/log baru; F-001..F-005 tetap OPEN/BLOCKED; ST-01..ST-12 + STAGE-P01..P12 tetap BLOCKED/NOT RUN | Lolos: tidak ada gate yang dilonggarkan. Belum: — | G-K; audit V14 |
| F-034 | ADDRESSED | Matriks §1; desain §D.4.31 | Bukti v2.3.19 dipertahankan; audit V13 §3.1 mengonfirmasi (50 assert PASS) | Lolos: celah V12 (F-036) ditutup. Belum: — | U-73; audit V14 |
| F-035 | ADDRESSED (harness VM) | Matriks §1; desain §D.4.31 | Bukti v2.3.19 dipertahankan; audit V13 §3.2–3.3 mengonfirmasi | Lolos: driver privat + child fd-based + tes aman. Belum: review V14 atas asumsi UID-sama (U-77) | U-74/U-77; audit V14 |
| F-036 | ADDRESSED | Matriks §1; desain §D.4.31 | Bukti v2.3.19 dipertahankan; audit V13 §3.1 mengonfirmasi (50 assert PASS) | Lolos: starttime 0/negatif/non-integer/unsafe ditolak; fail-fast tanpa liveness atas record parsial. Belum: — | U-75; audit V14 |
| F-037 | ADDRESSED | Matriks §1; desain §D.4.31 | Bukti v2.3.19 dipertahankan; audit V13 §3.2 mengonfirmasi (59 + 25 assert PASS) | Lolos: symlink + regular file pre-existing tak tersentuh; paralel tanpa benturan; cleanup terverifikasi; tidak ada run root. Belum: — | U-76; audit V14 |
| U-72 | ADDRESSED | Matriks §1; desain §D.4.31 | Bukti v2.3.19 dipertahankan; audit V13 §5 mengonfirmasi | Lolos: 7 penolakan + 1 penerimaan + fixture privat. Belum: — | U-72; audit V14 |
| F-001 | BLOCKED (proposal DIREVISI) | Proposal §1; matriks §2 F-042 | Proposal `a672b050…` (H-SSRF-27..30 baru; guard empty set + port + timeout) | Belum: implementasi menunggu otorisasi tahap (b) G-A + staging STAGE-P01/P03 + review independen atas implementasi | G-K; keputusan K-1/K-2; gate G-A/G-E |
| F-002 | BLOCKED (proposal DIREVISI) | Proposal §2; matriks §2 F-038/F-039 | Proposal `a672b050…` (Model A/B; tryReserve; A1/A2; serialisasi; H-RES-13/14 baru; H-RES-07 direvisi) | Belum: implementasi + H-RES staging | G-K; keputusan K-2/K-7; gate G-H/G-I |
| F-003 | BLOCKED (proposal DIREVISI) | Proposal §3; matriks §2 F-041 | Proposal `a672b050…` (deadline 20 detik; DB lease default; trusted IP; H-RES-15..17 baru) | Belum: implementasi + H-RES-04..06/11..12/15..17 staging | G-K; keputusan K-3/K-9; gate G-I |
| F-004 | BLOCKED (migrasi DITULIS ULANG) | Proposal §4; matriks §2 F-040/F-043 | Proposal `a672b050…` (migrasi 0006 v2; H-CAT-07..10; H-TEN-08..10) | Belum: migrasi menunggu otorisasi + staging DB | G-K; keputusan K-5/K-8; gate G-A |
| F-005 | BLOCKED (proposal DIPERBARUI) | Proposal §5; matriks §2 F-040 | Proposal `a672b050…` (tabel peran; H-AUTH-04 direvisi; H-AUTH-07 baru) | Belum: keputusan mekanisme K-4 + bukti prasyarat Opsi A | G-K; keputusan K-4/K-9; gate G-C |
| F-018 | PARTIALLY ADDRESSED | Proposal §4; matriks §2 F-040 | Proposal `a672b050…` (model global diputuskan; migrasi v2; tenancy runtime tetap NOT VERIFIED) | Belum: ratifikasi provider/owner (G-C) + migrasi staging | G-K; gate G-C |
| F-019 | BLOCKED (NOT VERIFIED) | Matriks §2 butir 8; desain §D.4.31 | Tidak ada test/log baru; `checkLink` TIDAK di-invoke | Belum: kontrol (a)–(e) belum satu pun terpenuhi | Bukti runtime G-B; deployment tetap BLOCKED |
| F-028 | PARTIALLY ADDRESSED (NOT VERIFIED) | Matriks §2 butir 8; desain §D.4.31 | Tidak ada test/log baru; template manifest tetap kosong | Belum: manifest terisi dari provider belum ada | Manifest per deployment; gate G-I |
| F-030 | BLOCKED (CONFIRMED BLOCKER) | Matriks §1; desain §D.4.31 | Tidak ada test/log baru | Belum: clean builder + SDK provenance | Gate G-G/G-J |
| F-033 | ADDRESSED (VM-only) | Matriks §2 F-033; desain §D.4.31 | Tidak ada test/log baru; F-029 TIDAK diulang | Dipertahankan dengan benar | — |
| Staging owners | ADDRESSED AS GAP DOCUMENTATION | `STAGING_READINESS_V2320.md` `b7d54fa3…`; matriks §4 butir 8 | Tidak ada test/log baru; keenam peran tetap UNASSIGNED/BLOCKED + 3 baris baru (9–11) UNASSIGNED/BLOCKED | Belum: penunjukan peran + bukti baris 7–11 | Gate G-E; G-K |

**File yang diubah/dibuat v2.3.20 (untuk commit):**
- Diubah: `SSRF_REMEDIATION_DESIGN.md` (hanya: perbaikan kalimat
  stale header + referensi v2.3.20 + §D.4.31 baru — tidak ada
  substansi desain lain yang diubah).
- Baru: `SSRF_PROPOSAL_F001_F005_V2320.md`,
  `SSRF_RESPONSE_MATRIX_V2320.md`, `STAGING_READINESS_V2320.md`,
  `evidence/v2320/README.md`,
  `evidence/v2320/test-f038-layers-v2320.ts`,
  `test-f038-layers-v2320.txt`,
  `test-f038-layers-v2320-run1-label.txt`,
  `evidence/v2320/test-f042-guard-v2320.ts`,
  `test-f042-guard-v2320.txt`,
  `evidence/v2320/test-f043-canonical-v2320.ts`,
  `test-f043-canonical-v2320.txt`,
  `test-f043-canonical-v2320-run1-fail.txt`,
  `evidence/v2320/test-f039-tryreserve-v2320.ts`,
  `test-f039-tryreserve-v2320.txt`,
  `test-f039-tryreserve-v2320-run1-noisy.txt`,
  `test-f039-tryreserve-v2320-run2-fail.txt`.
- TIDAK diubah: `site/**`, `src/**`, `package.json`, lockfile,
  workflow CI, deployment, database/katalog, live artifact.
  (`SSRF_PROPOSAL_F001_F005_V2319.md`,
  `SSRF_RESPONSE_MATRIX_V2319.md`, `STAGING_READINESS_V2319.md`
  TIDAK diubah — dipertahankan sebagai catatan sejarah; versi
  baru adalah file terpisah.)
