# SSRF RESPONSE MATRIX v2.3.14 — Jawaban atas Audit Independen ChatGPT V7

**Dokumen:** matriks respons revisi desain v2.3.14
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V7.md` (commit `7b90478`, 2026-11-08)
  — temuan baru F-026, F-027, F-028 + Muse Handoff §10 (9 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.14:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.14 — §D.4.25 ringkasan revisi, risiko baru U-63..U-66 di §G,
U-62 dipersempit, gerbang G-I baru, koreksi "overhead 0 byte" pada
§D.4.24) + `DEPLOYMENT_MANIFEST_TEMPLATE.md` (baru — skema manifest
deployment non-secret, tetap kosong). Matriks v2.3.13
(`SSRF_RESPONSE_MATRIX_V2313.md`) dipertahankan utuh sebagai catatan
sejarah revisi itu. Temuan F-001..F-025 dibawa ke sini dengan status
terbarunya; yang baru di v2.3.14 hanyalah F-026, F-027, F-028,
koreksi semantik budget memori, template manifest deployment, bukti
Bun 1.3.10, dan temuan lockfile v2 vs 1.3.10 (U-66).

**Yang TIDAK dilakukan v2.3.14:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh — termasuk tidak ada
perubahan `site/package.json` / `site/bun.lock` di repo), tidak ada
perubahan database/katalog, tidak ada production build, tidak ada
pemanggilan action produksi apa pun (termasuk `checkLink` — tidak
di-invoke), Link Scanner tidak diaktifkan, public tester tidak
disentuh, live artifact tidak diubah. Bukti yang dipakai adalah:
eksperimen VM lokal read-only atas perilaku chunk `fetch` Bun dan
salinan string turunan (server + klien di `127.0.0.1`, tanpa jaringan
eksternal, tanpa artifact live), plus frozen install + typecheck pada
salinan sementara `site/` di `/tmp` (bukan `site/` di repo).

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.14

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.14.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.14 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.14. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.14 — semua temuan V7 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-028

| ID | Severity | Status v2.3.14 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Implementasi tetap menunggu tahap (b); **oracle + semantik DIKOREKSI v2.3.14** (F-026/F-027 §2): anggaran A1 (accepted) vs A2 (transient) dipisah; L2 dinyatakan input-body budget; larangan materialisasi bersamaan + pemindaian incremental; H-RES-03/05 diperbarui. |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V7 §7.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | **BARU v2.3.14 (temuan U-66):** frozen install pada Bun kanonik 1.3.10 GAGAL — lockfile ter-commit v2 tidak dikenali 1.3.10 (`Unknown lockfile version`); typecheck 1.3.10 exit 0 hanya berlaku terhadap lockfile hasil regenerasi v1 di scratch. Keputusan G-G kini punya bukti konkret (opsi adopsi Bun baru vs regenerasi lockfile). Absolute local SDK path tetap blocker clean-builder. Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 / V7 §7.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Tidak berubah: operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | **BARU v2.3.14:** reproduksibilitas pada 1.3.10 diuji langsung — frozen install GAGAL (U-66); lihat F-009. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | Tidak berubah: semantik kepemilikan G-F diklarifikasi v2.3.13 — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.14; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | **BARU v2.3.14:** oracle tes cap DIKOREKSI ULANG (F-026/F-027 §2) — semantik A1/A2 + L2 sebagai input-body budget + H-RES-03/05 diperbarui; implementasi + tes tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | Tidak berubah: arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | **BARU v2.3.14:** perilaku dekompresi transparan TERKONFIRMASI pada Bun kanonik 1.3.10 (re-run skrip v2.3.13 tanpa perubahan — gzip 551→500.000, br 51→500.000); bagian VM dari U-62 terjawab. Staging + `deflate`/`zstd` tetap NOT VERIFIED. |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | **BARU v2.3.14:** angka 1.000.000 byte DINYATAKAN sebagai input-body budget (bukan peak-memory budget); klaim "overhead 0 byte" DIBATASI hanya pada accumulator (A1). Tes staging belum dijalankan. |
| F-026 | Medium — batas decoded-byte tidak membatasi transient chunk allocation | **addressed** (desain) | **BARU v2.3.14:** anggaran A1 (accepted, terbukti ≤ cap) vs A2 (transient/in-flight, worst-case = seluruh body) dipisah eksplisit; klaim "overhead 0 byte" DICABUT sebagai pernyataan umum; chunk maksimum terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED. Tes staging belum dijalankan. |
| F-027 | Medium — L2 tidak mencakup representasi string turunan | **addressed** (desain) | **BARU v2.3.14:** karakter hidup 3,60× input; peak RSS +4,98× input (1.3.10) / +4,33× (1.4.4); LARANGAN materialisasi bersamaan + pemindaian incremental (terukur ~4,5–5,4× lebih hemat); H-RES-05 diperbarui (fixture batas + varian non-ASCII, high-water RSS). Tes staging belum dijalankan. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | **BARU v2.3.14:** LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template/skema deployment manifest non-secret dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. Tidak ada tebakan versi live. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V7

### F-026 — Medium: batas decoded-byte tidak membatasi transient chunk allocation — **addressed** (desain; chunk maksimum + perilaku in-flight terukur di VM pada Bun 1.3.10 dan 1.4.4, tes staging belum dijalankan)

**Temuan (diterima):** Pre-append accounting mencegah chunk yang
melewati cap ditambahkan ke accumulator, tetapi tidak menghapus
alokasi chunk yang sudah diserahkan runtime. Log VM v2.3.13 mencatat
chunk pertama 393.110 byte — lebih besar dari cap script 300.000
byte. Klaim "overhead 0 byte" tidak boleh ditafsir sebagai
peak-memory overhead nol.

**Eksperimen VM baru v2.3.14
(`evidence/f026-chunk-accounting/`):** server + klien di `127.0.0.1`,
Bun 1.3.10 (diunduh dari rilis resmi oven-sh/bun `bun-v1.3.10`,
revisi `1.3.10+30e609e08`) DAN Bun 1.4.4, tanggal 2026-11-08.
Skrip `exp-chunk.ts` (SHA-256
`cafc3cb3fb1d904ee83707fd514566e9668665e3063f871bf8f0a64f7d5e95c4`)
menjalankan 5 probe (P1, P2, P2b, P3, P4) dengan aturan desain
v2.3.13 (pre-append accounting, cap halaman 400.000 / script
300.000, shared L2 1.000.000 + satu AbortController bersama).
Log mentah: `run-1310-chunk.txt` (SHA-256
`879de437ceb7cd0e5ab4db8f2bbae8b6822912e0f53791cd09d3319b172997e5`)
dan `run-144-chunk.txt` (SHA-256
`239a692acdf248aa72c6b880dc61f902ccf6523d873b388cb250ac0ab2dae344`).

| Probe | Bun 1.3.10 | Bun 1.4.4 |
| --- | --- | --- |
| P1 `/plain500k` cap 300.000 | chunk `[16384, 483616]`, max **483.616**, accepted 16.384 | chunk `[65430, 95232, 131072, 131072]`, max 131.072, accepted 291.734 |
| P2 3× paralel `/plain500k` cap 300.000 + L2 | r0 `[16384, 483616]`; r1/r2 fetch ter-abort sebelum chunk pertama; total accepted 16.384 | r0 `[65377, 130966, 131072]`; r1/r2 ter-abort sebelum chunk pertama; total accepted 196.343 |
| P2b 3× paralel `/stream64k` cap 300.000 + L2 | r0 `[262144, 237856]`; r1/r2 0 chunk; total accepted 262.144 | r0 `[262144]`; r1 `[327680]`; r2 ter-abort; total accepted 262.144 |
| P3 `/plain1m` cap 400.000 | **`[528384]` — satu chunk 528.384 > cap 400.000**, accepted 0 | `[392791, 262144]`, accepted 392.791 |
| P4 `/stream64k` cap 300.000 | **`[500000]` — seluruh body dalam satu chunk**, accepted 0 | `[262144, 237856]`, accepted 262.144 |

**Kesimpulan yang mengikat (desain §D.4.25):**

1. **Klaim "overhead 0 byte" v2.3.13 DICABUT sebagai pernyataan
   umum** dan DIBATASI hanya pada **accepted/retained bytes di
   accumulator yang dikendalikan aplikasi** (terbukti ≤ cap pada
   kedua versi Bun). Koreksi `[KOREKSI v2.3.14 (F-026)]`
   ditambahkan pada dua situs definisi normatif §D.4.24 (F-024
   dan F-025).
2. **Dua anggaran dipisah eksplisit:**
   - **A1 — accepted/retained decoded bytes:** halaman ≤ 400.000,
     tiap script ≤ 300.000, aggregate L2 ≤ 1.000.000 — ditegakkan
     pre-append, terbukti VM.
   - **A2 — transient chunk / in-flight memory:** worst-case per
     chunk = **seluruh body** (teramati 528.384 byte untuk body
     1.000.000; satu chunk 500.000 byte = seluruh body); worst-case
     simultan = jumlah max-chunk semua reader yang masih berjalan
     sebelum abort bersama diproses. **Tidak ada angka A2 yang
     dijamin** tanpa batas chunk runtime / BYOB / limit proses.
3. **Chunk tidak deterministik dan bergantung versi** (max 1.3.10:
   483.616–528.384; max 1.4.4: 131.072–392.791 untuk body yang
   sama) — tidak ada batas ukuran chunk tetap yang aman diasumsikan.
4. **Chunking sisi server TIDAK membatasi chunk sisi klien** (P4
   1.3.10: server enqueue 64 KiB → chunk klien 500.000 byte).
5. **Shared abort membatalkan sibling dengan cepat di loopback,
   tetapi itu balapan, bukan jaminan** — tidak ada angka in-flight
   maksimum yang diklaim dari eksperimen loopback ini.
6. **RSS + external adalah metrik yang benar; `heapUsed` saja
   menyesatkan** (peak RSS 1.3.10: 65.044.480 pada P4 dari baseline
   ~50 MB, sementara `heapUsed` tetap ~1,8–2,3 MB — body hidup
   sebagai external).
7. **BYOB / fixed-size reads NOT VERIFIED** pada Bun mana pun —
   jangan diasumsikan tersedia.
8. **Batas desain yang ditetapkan:** max chunk yang diasumsikan =
   ukuran body penuh; concurrency reader = max 4 (1 halaman + 3
   script); bila peak memory adalah requirement, wajib ada limit
   proses/cgroup + pengukuran high-water RSS pada concurrency
   maksimum di staging Bun 1.3.10.
9. **Tes regresi wajib (staging, diperbarui):** respons dengan chunk
   > cap script; tiga script paralel dengan chunk besar; catat
   ukuran maksimum chunk, jumlah in-flight, accepted bytes,
   cancellation, dan **peak RSS/heap + external** pada Bun 1.3.10
   staging. Acceptance: accepted ≤ cap (DAN) peak RSS ≤ ambang
   operasional yang ditetapkan SEBELUM tes oleh staging operator.

**Yang belum terjawab:** angka A2 yang dijamin (butuh batas chunk
runtime / BYOB yang terbukti, atau limit proses/cgroup + hasil
staging); perilaku in-flight pada jaringan nyata / runtime staging.

### F-027 — Medium: L2 tidak mencakup representasi string turunan — **addressed** (desain; high-water memory terukur di VM pada Bun 1.3.10 dan 1.4.4, tes staging belum dijalankan)

**Temuan (diterima):** L2 v2.3.13 hanya menghitung decoded-body
bytes, sedangkan source (`site/server/src/actions.ts:520-533`,
dikutip read-only) membentuk `scriptTexts.join("\n")`, `haystack`
dari HTML + scriptText, dan `lower = haystack.toLowerCase()`.
Aggregate input 1.000.000 byte tidak sama dengan peak memory
1.000.000 byte.

**Eksperimen VM baru v2.3.14
(`evidence/f027-derived-strings/`):** simulasi pola source pada
string lokal (tanpa jaringan, tanpa artifact), kasus batas L2 —
halaman 400.000 + 2 script 300.000 = 1.000.000 karakter input
(maksimum yang mencapai jalur analisis; script ketiga pada cap
penuh meng-abort scan dan parsialnya dibuang). Skrip
`exp-derived.ts` (SHA-256
`6b8a63530e5409bd200db592f7d568600a095b4a3d321de66bad2149408c43b4`).
Log mentah: `run-1310-derived.txt` (SHA-256
`d37b36306ea4d42991a06f8d8ff32b25f340dc9a04bf2409bd8ddc481aa48fa1`)
dan `run-144-derived.txt` (SHA-256
`341b41a76a8b2829d79768fcc6ae9132c8e46f47613fb41b9f6d1a992080548e`).

| Pengukuran | Bun 1.3.10 | Bun 1.4.4 |
| --- | --- | --- |
| Karakter hidup pada titik analisis | **3.599.936 = 3,60× input** | **3.599.936 = 3,60× input** |
| Peak RSS pola saat ini (A5) | **+4.980.736 (~4,98× input)** | **+4.325.376 (~4,33× input)** |
| Peak heapUsed pola saat ini (A5) | +0 (lihat batasan) | **+3.609.196 (~3,61× input)** |
| Peak RSS alternatif incremental (B3) | **+917.504** | +2.228.224 |
| Peak heapUsed alternatif incremental (B3) | +0 (lihat batasan) | +802.465 |
| Rasio pola-saat-ini / incremental | **~5,4× (RSS)** | **~4,5× (heapUsed)** |

Pemeriksaan menemukan sinyal pada kedua pola (`asksConnect = true`
di A dan B) — alternatif incremental tidak kehilangan deteksi pada
kasus uji ini.

**Keputusan desain yang mengikat (desain §D.4.25):**

1. **L2 DINYATAKAN sebagai input-body budget, BUKAN peak-memory
   budget.** "Aggregate 1.000.000 byte" = jumlah decoded-body byte
   halaman + script yang diterima per scan ≤ 1.000.000. Peak memory
   per scan TIDAK dibatasi oleh L2.
2. **LARANGAN materialisasi bersamaan:** implementasi TIDAK BOLEH
   menahan `html` + `scriptTexts` + `scriptText` (join) + `haystack`
   + `lower` secara bersamaan pada jalur analisis.
3. **Pemindaian incremental:** tiap segmen diperiksa sendiri-sendiri;
   lowercase hanya per segmen dan dilepas sebelum segmen berikutnya;
   sinyal dikumpulkan sebagai boolean/ringkasan, bukan string
   gabungan. Tidak ada pengecualian — sinyal lintas segmen ditulis
   ulang sebagai pemeriksaan per segmen + agregasi boolean.
4. **Stress test H-RES-05 diperbarui (staging):** fixture halaman
   400.000 + 2 script 300.000 (tepat 1.000.000 byte) DAN varian
   non-ASCII (fixture H-RES-02 A/B/C sebagai konten script — angka
   teoretis UTF-16 2 byte/karakter adalah batas atas; pengukuran
   ASCII saja tidak cukup untuk worst-case), pada concurrency scan
   yang disepakati; acceptance = high-water **RSS** ≤ ambang
   operasional yang ditetapkan SEBELUM tes oleh staging operator.
   Sampai ambang ditetapkan dan tes lolos, peak-memory per scan
   tetap **NOT VERIFIED**.
5. **Limit proses/cgroup tetap menjadi lapisan pertahanan yang
   disyaratkan** bila peak memory adalah requirement (lihat F-026).

**Batasan pengukuran (dicatat jujur):** `heapUsed` pada Bun 1.3.10
TIDAK BERGERAK sama sekali (tetap 211.394) sementara RSS naik ~5 MB
dan `external` naik ~2,6 MB — string dicatat di luar `heapUsed`
pada versi itu. Karena itu ambang acceptance wajib memakai **RSS
(+ external), per versi runtime**, bukan `heapUsed` saja. Input uji
ASCII; worst-case non-ASCII tidak diukur di sini — staging harus
memakai fixture H-RES-02. Pengukuran satu run per versi.

**Yang belum terjawab:** hasil stress test H-RES-05 yang diperbarui
di staging; ambang RSS operasional (prasyarat tes, belum
ditetapkan — staging operator UNASSIGNED).

### F-028 — Medium: klaim live v15 dan persetujuan d85a1e2 tidak memiliki provenance yang dapat diaudit — **partially addressed** (template manifest dipublikasikan sebagai desain; LIVE VERSION / DEPLOYMENT APPROVAL tetap NOT VERIFIED)

**Temuan (diterima):** Audit V7 benar — tidak ada deployment
manifest, artifact digest, release record, approval artifact, atau
diff live yang dapat diverifikasi dari repository untuk klaim
v2.3.13 ("live sudah v15, d85a1e2 disetujui Rama 2026-11-08
~02:09 WIB"). Klaim itu dicatat NOT VERIFIED — bukan salah, bukan
benar.

**Respons v2.3.14:**

1. **LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED —
   dipertahankan.** Tidak ada tebakan versi live, tidak ada
   perubahan live, tidak ada klaim approval baru.
2. **Template/skema deployment manifest non-secret dipublikasikan
   sebagai dokumen desain:** `DEPLOYMENT_MANIFEST_TEMPLATE.md`
   (15 field: environment, artifact version/digest, source commit,
   timestamp, operator, release/workflow ID, diff, rollback target
   + verifikasi rollback, rujukan approval + scope, verifikasi
   pasca-deploy, notes) beserta aturan pengisian yang mengikat
   (satu manifest per deployment; nilai ditebak = manifest tidak
   sah; approval harus dapat ditelusuri — "disetujui Rama" tanpa
   tanggal + rujukan yang dapat diperiksa TIDAK memenuhi
   `approval_ref`).
3. **Manifest itu sendiri tetap KOSONG** (`NOT PROVIDED` di semua
   field) sampai operator menyediakannya. Manifest yang terisi
   TIDAK mengubah status DESIGN REVIEW ONLY dan TIDAK memberi
   otorisasi deployment berikutnya.

**Yang belum terjawab:** manifest terisi untuk deployment apa pun
(operator + owner UNASSIGNED untuk tugas ini); klaim "live sudah
v15" tetap NOT VERIFIED sampai ada manifest terisi yang memenuhi
field 2, 4, 6, 8, dan 12.

### F-009 / U-62 / U-66 — Clean build provenance + bukti Bun 1.3.10 — **partially addressed** (dekompresi 1.3.10 terkonfirmasi; frozen install 1.3.10 TERBUKTI GAGAL — temuan baru U-66; clean external builder tetap NOT VERIFIED)

**Bukti VM baru v2.3.14
(`evidence/f009-bun1310-install-typecheck/`):** percobaan pada
salinan sementara `site/` di `/tmp/scratch-site-1310` (repo TIDAK
diubah — `site/bun.lock` di repo tetap SHA-256
`a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f`,
sama dengan yang tercatat v2.3.9). Bun 1.3.10 diunduh dari rilis
resmi oven-sh/bun (`bun-v1.3.10`, revisi `1.3.10+30e609e08`).

| Langkah | Hasil |
| --- | --- |
| Frozen install, Bun 1.3.10, lockfile ter-commit | **GAGAL, exit 1.** `error: Unknown lockfile version` pada `bun.lock:2` — lockfile ter-commit memakai `"lockfileVersion": 2`, tidak dikenali Bun 1.3.10. `bun.lock` TIDAK berubah. Log: `run-1310-install.txt` (SHA-256 `75641b138c5e293b6c14d125c4eb0054d807e5ce640ecb30792b598e06f4b33b`) |
| Typecheck tanpa install, Bun 1.3.10 | **GAGAL, exit 1** — hanya efek turunan (tidak ada `node_modules`; `tsc` tidak menemukan `bun-types`/`react`/`react-dom`). Bukan bukti typecheck gagal pada pohon ter-install. Log: `run-1310-typecheck.txt` (SHA-256 `2ce3714060c688bbb36dd4c0470d37c5ef6780ff55963824fa9496b8913bb353`) |
| Install TANPA frozen, Bun 1.3.10 (scratch saja) | **BERHASIL, exit 0** — 79 paket, 26,03 detik. Tetapi lockfile **ditulis ulang ke `"lockfileVersion": 1`** di scratch. Log: `run-1310-install-nofrozen.txt` (SHA-256 `d765037d8a70a070b6b8cebca17c7defa0cfdd516f52ac9271a961156d175bfb`) |
| Typecheck setelah install non-frozen, Bun 1.3.10 | **BERHASIL, exit 0** — `tsc --noEmit` client + server tanpa diagnostik. Berlaku HANYA terhadap lockfile hasil regenerasi v1 di scratch. Log: `run-1310-typecheck-after-install.txt` (SHA-256 `772c40b94a86a71230bdb7860f156c7362ae5aa39aa205d3455613b495816786`) |

**Dekompresi transparan TERKONFIRMASI pada Bun 1.3.10** (bagian VM
dari U-62 terjawab): skrip F-024 v2.3.13 (`exp-gzip.ts`,
`exp-br.ts`) dijalankan ulang TANPA perubahan di bawah 1.3.10 —
log `run-1310-gzip-rerun.txt` (SHA-256
`9c729f4e4fe7528df8e7dfbdc769d2eb24296ca3a0133a784b43452ac861eeb1`)
dan `run-1310-br-rerun.txt` (SHA-256
`aeb6b1379bc57eb444bb9c2758b6ede793e120a4bd31ef8e54420ee39d8430fb`)
di `evidence/f026-chunk-accounting/`: gzip 551 byte wire →
500.000 byte decoded; br 51 → 500.000; marker offset 400.000.
Pengulangan ini dibenarkan protokol — lingkungan berubah (versi
Bun), dan justru itulah celah yang dinamai U-62. Yang tetap
NOT VERIFIED: perilaku di runtime artifact staging/produksi dan
`deflate`/`zstd`.

**Temuan baru U-66:** kanonik 1.3.10 dan lockfile ter-commit (v2)
**tidak kompatibel** — clean builder yang memakai 1.3.10 tidak
dapat mereproduksi install dari pohon ter-commit. F-009 tetap
NOT REPRODUCIBLE untuk clean external builder.

**Rencana desain penggantian absolute local SDK path**
(`file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` —
clean builder tanpa `/opt/hatch` tidak dapat meng-install sama
sekali): (a) terbitkan SDK sebagai paket berversi yang dapat
diambil builder (registry / URL bertanda digest), kunci versinya
di `package.json` + `bun.lock`; ATAU (b) vendorkan artefak SDK
berversi ke dalam repo dengan digest SHA-256 yang tercatat dan
diverifikasi saat install; ATAU (c) sediakan artefak SDK yang
provenance-nya dapat diverifikasi dari sumber resmi runtime
provider. Opsi dipilih oleh owner + runtime provider; acceptance =
frozen install + typecheck pada Bun 1.3.10 dari clean external
builder, raw output, dependency digest, tanpa path `/opt/hatch`.
Sampai rencana ini dieksekusi dan dibuktikan, F-009 tetap NOT
REPRODUCIBLE. Tidak ada perubahan `package.json`/`bun.lock` di
revisi ini.

**Keputusan G-G kini punya bukti konkret:** (a) adopsi Bun lebih
baru sebagai kanonik (1.4.4 membaca lockfile v2; frozen install +
typecheck terbukti v2.3.9) — butuh keputusan owner + pembaruan
`packageManager`; atau (b) regenerasi lockfile di bawah 1.3.10
(v1) dan kunci kanonik tetap 1.3.10 — butuh regenerasi +
verifikasi ulang resolusi dependensi. Keduanya adalah perubahan
source dan butuh otorisasi tahap (b) terpisah.

### F-019 — High: status Link Scanner nonaktif tanpa bukti kontrol runtime — **blocked (NOT VERIFIED)**

**Temuan (diterima):** `checklink` masih tercantum sebagai
published action; artifact version/digest dan kontrol
dispatch/runtime tetap NOT PROVIDED.

**Respons v2.3.14:** Tidak ada fakta baru. Hanya bukti read-only
yang dipakai; `checkLink` TIDAK di-invoke, tidak ada public share
yang dibuat, tidak ada perubahan runtime state. Kontrol (a)–(e)
(§D.4.22) tetap belum satu pun terpenuhi: bukti read-only artifact
version/digest, action dispatch denial / pre-handler rejection, UI
gate, public invocation denial, dan egress observation. Deployment
tetap BLOCKED. Tidak ada langkah dalam revisi ini yang menyentuh
runtime live.

### F-020 — Medium: scope refactoring source mirror perlu klarifikasi otorisasi — **partially addressed** (HOLD dipertahankan)

Tidak ada perubahan `.ts`/`.tsx`, skema, migrasi, client, build,
atau live artifact di v2.3.14; d85a1e2 TIDAK di-revert; tidak ada
artefak approval terpisah di repo. HOLD tetap berlaku penuh.
Perubahan di revisi ini terbatas pada dokumen desain, matriks
respons, template manifest, dan paket bukti read-only/VM.

### F-018 — High bila DB shared: isolasi data antar-pengguna belum terbukti — **partially addressed** (tidak ada fakta baru)

Tidak ada fakta baru: kutipan `.d.ts` dipublikasikan v2.3.12;
semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi
provider tentang scope `ctx.db` tetap belum ada. Status hanya
boleh berubah berdasarkan pernyataan provider atau artefak runtime
yang dapat dilacak.

### F-001..F-005 — spesifikasi implementasi dipertahankan + semantik F-002 dikoreksi — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Requirement implementasi ditulis ulang sebagai desain + test ID +
regression mapping yang dibutuhkan (desain §D.4.25) — tanpa
menyentuh source:

| Temuan | Requirement implementasi (desain) | Test ID / bukti staging |
| --- | --- | --- |
| F-001 Critical SSRF | Validasi URL pada input awal, SETIAP hop redirect, dan SETIAP script URL (host/IP/port/skema per hop; tolak IP privat/loopback/link-local/metadata + bentuk non-kanonik) | H-SSRF-01..20 + log mentah staging + review independen |
| F-002 High response cap | Streamed decoded-byte limit L1 (halaman 400.000, script 300.000) + L2 aggregate 1.000.000 dengan semantik baru F-026/F-027: A1 accepted (pre-append) + A2 transient (worst-case = seluruh body per chunk) + larangan materialisasi bersamaan + pemindaian incremental | H-RES-01..03 (diperbarui: chunk > cap, 3 script paralel chunk besar, peak RSS/heap+external) + H-RES-05 (diperbarui: fixture batas 1.000.000 + varian non-ASCII, high-water RSS ≤ ambang pra-tes) |
| F-003 High total deadline | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-06 |
| F-004 Medium duplicate race | Atomic DB uniqueness (unique constraint; bukan check-then-insert) | H-CAT-01..03 + bukti migrasi staging |
| F-005 Medium authorization | Endpoint ownership + caller authorization (mekanisme diputuskan owner; kandidat `ctx.viewer` SDK) | H-AUTH-01..03 + bukti scoping endpoint runtime |

Setiap perubahan harus memiliki test ID, raw staging log, artifact
digest, serta regression mapping sebelum dapat dinyatakan lolos.
Handoff V7 BUKAN izin untuk mulai mengubah source.

### Reproducibility + ownership staging (handoff V7 butir 6 dan 7) — **blocked**

- **Reproducibility (butir 6):** lihat §2 F-009/U-62/U-66 di atas
  — frozen install 1.3.10 GAGAL (U-66); dekompresi 1.3.10
  terkonfirmasi (U-62 bagian VM); rencana penggantian SDK path
  dirumuskan sebagai desain; clean external builder tetap NOT
  VERIFIED.
- **Staging owners (butir 7):** staging operator, platform/runtime
  provider, egress owner, DB/runtime owner, alert channel +
  operator penerima, dan rollback owner tetap UNASSIGNED;
  STAGE-P01..P12 tetap BLOCKED; ST-01..ST-16 TIDAK dilabeli READY;
  kriteria ST-12-LAT-01..03 hanya dapat diuji setelah kanal +
  owner nyata ada — kanal masih UNASSIGNED sehingga ST-12 =
  NOT RUN bila kanal tidak tersedia, bukan PASS.

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`;
cleanup tetap butuh edit source + otorisasi terpisah. Tidak ada
narasi insiden atau detail wallet yang direproduksi di dokumen
revisi ini (hanya nama pengenal + nomor baris).

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak berubah: status tetap "reported by Muse, not independently
verified"; bukti versi/diff/hash live yang dapat diaudit independen
tetap belum tersedia. Klaim versi live kini juga tunduk pada
F-028 (NOT VERIFIED) — redaksi live tidak dapat diverifikasi
sampai ada deployment manifest terisi.

## §3. Response to Previous Handoff — status temuan V6 menurut audit V7 §3 (dicatat, bukan diklaim ulang)

Audit V7 §3 memverifikasi respons v2.3.13 atas handoff V6 sebagai
berikut (ringkasan setia; status akhir tetap milik audit V7):

| Permintaan V6 | Respons Muse v2.3.13 | Verifikasi independen V7 |
| --- | --- | --- |
| 1. H-RES-02: hapus kondisi fixture mustahil | Addressed pada desain; tiga fixture diterbitkan | Hitung ulang tiga file mentah — byte UTF-8, code unit, dan offset marker cocok. Harness staging belum dijalankan. |
| 2. H-RES-03: bedakan compressed/decompressed bytes | Addressed pada desain; eksperimen gzip/br VM diterbitkan | Log mentah konsisten (551/51 wire → 500.000 byte). Hanya Bun 1.4.4; Bun 1.3.10 NOT VERIFIED. |
| 3. H-RES-05: tetapkan angka aggregate | Addressed pada desain: 1.000.000 byte | Angka dan cakupan ditetapkan. Klaim overhead nol/peak memory belum didukung; lihat F-026/F-027. |
| 4. Klarifikasi G-F | Addressed | Cache removal dinyatakan rekomendasi yang menunggu keputusan owner, bukan otorisasi implementasi. Source tetap memakai cache. |
| 5. Pertahankan source HOLD | Dipatuhi | Tidak ada source aplikasi berubah dalam commit v2.3.13. |
| 6. F-019: bukti Link Scanner nonaktif | Belum dipenuhi | `checklink` masih tercantum sebagai published action. Artifact version/digest dan kontrol dispatch/runtime tetap NOT PROVIDED. |
| 7. Petakan F-001..F-005 ke tes implementasi/staging | Dijawab pada level desain | Tidak ada remediasi source atau hasil staging. F-001..F-005 tetap OPEN/BLOCKED. |
| 8. F-018 dan F-009/F-014 | Belum dipenuhi | Pernyataan provider tentang tenancy `ctx.db` tidak ada; SDK masih absolute local path; clean build Bun 1.3.10 belum terbukti. |
| 9. Tetapkan owner staging | Belum dipenuhi | Operator, alert channel, egress owner, DB/runtime owner, dan rollback owner tetap UNASSIGNED. |
| 10. Pertahankan provenance bukti | Sebagian dipenuhi | Bukti VM dipisah dari staging dan log mentah tersedia. Timestamp/command provenance sebagian bergantung pada manifest; tidak ada bukti staging. |
| 11. Carry-forward F-006b/F-006c dan U-38/U-33/U-45/U-46 | Dipertahankan | Residual privacy tetap OPEN; live redaction NOT VERIFIED; U-46 tetap keputusan owner yang belum ada. |

Muse menjawab V7 melalui commit dan matriks v2.3.14 ini. Itu
membuktikan adanya artefak respons di repository, bukan bahwa semua
permintaan telah lulus acceptance criteria — penutupan butuh bukti
yang dapat dilacak dan kriteria yang benar-benar lolos.

## §4. Jawaban atas Handoff V7 §10 (9 butir)

1. **F-026 — definisi resource yang jujur** — Dijawab §2 F-026:
   anggaran A1 (accepted/retained, terbukti ≤ cap) vs A2
   (transient/in-flight, worst-case = seluruh body) dipisah
   eksplisit; klaim "overhead 0 byte" DICABUT sebagai pernyataan
   umum dan dibatasi hanya pada accumulator aplikasi; batas
   maksimum chunk yang diasumsikan = ukuran body penuh +
   concurrency bound 4 reader + acceptance criteria (accepted ≤
   cap DAN peak RSS ≤ ambang pra-tes). Eksperimen VM BARU pada
   Bun 1.3.10 (kanonik — tersedia di VM ini, diunduh dari rilis
   resmi) dan 1.4.4: max chunk 528.384 byte (1.3.10), satu chunk
   500.000 byte = seluruh body, chunking server 64 KiB tidak
   membatasi chunk klien. H-RES-03/H-RES-05 staging pada Bun
   1.3.10 (termasuk max chunk, jumlah in-flight, cancellation,
   peak RSS/heap+external) dirumuskan sebagai tes wajib — belum
   dijalankan (staging belum tersedia).
2. **F-027 — budget yang sesuai implementasi** — Dijawab §2 F-027:
   L2 DINYATAKAN sebagai input-body budget, BUKAN peak-memory
   budget; LARANGAN materialisasi bersamaan + pemindaian
   incremental sebagai aturan desain; stress test diperbarui
   (fixture 1.000.000 byte + varian non-ASCII, concurrency yang
   disepakati, acceptance = high-water RSS ≤ ambang pra-tes).
   Status implementasi tetap desain-only.
3. **F-028 — buktikan atau pertahankan NOT VERIFIED** — Dijawab
   §2 F-028: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED
   dipertahankan; template/skema deployment manifest non-secret
   dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`, 15 field) —
   manifest itu sendiri tetap KOSONG sampai operator
   menyediakannya. Tidak ada tebakan versi live, tidak ada
   perubahan live.
4. **F-019 tetap BLOCKED** — Dijawab §2 F-019: hanya bukti
   read-only; `checkLink` TIDAK di-invoke, tidak ada public share,
   tidak ada perubahan runtime state; kontrol (a)–(e) tetap belum
   terpenuhi.
5. **F-001..F-005 tetap blocker implementasi** — Dijawab §2
   F-001..F-005: requirement implementasi (validasi URL tiap hop
   redirect + script URL, DNS/IP policy, connection pinning,
   streamed byte limit L1+L2 dengan semantik baru, total deadline,
   atomic DB uniqueness, authorization) sebagai desain + test ID +
   regression mapping — tanpa menyentuh source. Handoff ini BUKAN
   izin mengubah source.
6. **Clean build provenance** — Dijawab §2 F-009/U-62/U-66: rencana
   desain penggantian absolute local SDK path (3 opsi) dirumuskan;
   acceptance = frozen install + typecheck pada Bun 1.3.10 dari
   clean external builder, raw output, dependency digest, tanpa
   path `/opt/hatch`. Percobaan read-only dari salinan sementara
   `/tmp/scratch-site-1310` DILAKUKAN dan dilaporkan apa adanya:
   frozen install 1.3.10 GAGAL (lockfile v2, temuan U-66);
   typecheck 1.3.10 exit 0 hanya terhadap lockfile hasil
   regenerasi v1. Tidak ada perubahan satu byte pun di `site/`.
7. **Staging owners/prereqs** — Dijawab §2 (staging owners):
   peran yang dibutuhkan didaftarkan (staging operator,
   platform/runtime provider, egress owner, DB/runtime owner,
   alert channel + operator penerima, rollback owner); STAGE-P01..
   P12 tetap BLOCKED sampai bukti masing-masing tersedia; ST-12
   tidak PASS tanpa pengiriman alert nyata kepada operator.
8. **Pertahankan provenance suite lama** — Dijawab §2
   (provenance) dan §3: klaim bundle asli 9/9 × 4 TIDAK diubah
   (bundle asli 1 log lengkap + duplikat + tail; suplemen RUN=1..4);
   log gagal SU-T5 TIDAK direkonstruksi; semua bukti VM baru
   dilabeli VM dan dipisah ketat dari staging.
9. **Carry-forward tenancy, privacy, residual operational risks**
   — Dijawab §2 F-018/F-006b/F-006c dan §5: F-018, F-006b/F-006c,
   U-38/U-33/U-41/U-43/U-44/U-45/U-46 dipertahankan tanpa
   perubahan status (hanya bukti/keputusan owner yang dapat
   dilacak yang boleh mengubahnya); U-46 tetap OPEN; tidak ada
   narasi insiden atau data wallet di dokumen mana pun.

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.14)

Status VM vs staging tetap dipisah ketat. Tidak ada perubahan status
tanpa bukti staging atau keputusan tertulis owner.

| Risiko | Status v2.3.14 | Catatan |
| --- | --- | --- |
| U-38-A PID reuse antara cek procfs dan kill numerik | ANSWERED di VM | Residual U-41; bukti identitas/namespace staging tetap dibutuhkan |
| U-38-B PID sudah ter-reuse sebelum akuisisi pidfd | PARTIAL | U-41 + namespace mapping; ST-06 |
| U-38-C FFI/syscall Bun tidak tersedia di sandbox artifact | OPEN | ST-02 |
| U-38-D kebenaran FFI ABI/simbol/errno | PARTIAL | Review implementasi + ST-02/ST-03 |
| U-33-A pathname lock ter-unlink saat inode lama terkunci | PARTIAL | Residual U-43 (privileged actor); kontrol operasional |
| U-33-B inode pengganti terkunci saat holder lama bertahan | PARTIAL | Residual U-45 (latensi deteksi); ST-11/ST-12 |
| U-33-C proses non-kooperatif mengabaikan flock advisory | OPEN | Inventaris partisipan + desain enforcement |
| U-33-D semantik filesystem/flock/NFS | OPEN | ST-04/ST-05/ST-09 |
| U-33-E tooling operator mengubah inode lock | PARTIAL | Residual U-43/U-44 (privileged/runbook) |
| U-33-F perilaku supervisor/process-group | OPEN | SUP-01 / ST-07 |
| U-41 residual PID/namespace | OPEN | Lihat U-38-A/B |
| U-43 residual privileged actor | OPEN | Lihat U-33-A/E |
| U-44 residual runbook | OPEN | Lihat U-33-E |
| U-45 latensi deteksi | OPEN | Lihat U-33-B; kriteria latensi eksplisit di ST-12 (ST-12-LAT-01..03) |
| U-46 divergensi fallback numeric-kill | **OPEN — keputusan owner belum ada** | Kedua opsi + trade-off terkuantifikasi dipertahankan; tidak ada opsi yang dipilih atau diimplementasikan atas nama owner; scope blokir tetap sempit (hanya worker-signaling fallback path) |
| U-55 F-022 — cabang cache tidak dinyatakan | **partially addressed (desain)** | Cabang pilihan dinyatakan v2.3.12; semantik kepemilikan DIKLARIFIKASI v2.3.13 (§2 G-F); implementasi + tes menunggu tahap (b) |
| U-56 F-022 — oracle cap mengukur string, bukan byte | **partially addressed (desain)** | Oracle dikoreksi v2.3.12, v2.3.13 (F-023/F-024/F-025), dan DIKOREKSI ULANG v2.3.14 (F-026/F-027 — semantik A1/A2 + L2 input-body budget); implementasi + tes menunggu tahap (b) |
| U-57 F-021 — bukti artifact-state tidak auditable | **partially addressed** | Paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool) |
| U-58 F-018 — kutipan `.d.ts` tidak ada di repo | **partially addressed** | Kutipan minimal dipublikasikan v2.3.12; pernyataan provider tentang scope `ctx.db` tetap belum ada |
| U-59 F-023 — fixture H-RES-02 mustahil | **addressed (desain)** | Arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan; harness staging belum dijalankan |
| U-60 F-024 — lapisan byte H-RES-03 ambigu | **addressed (desain)** | Tiga lapisan didefinisikan terpisah v2.3.13; perilaku Bun teruji di VM (gzip 551→500.000, br 51→500.000); **BARU v2.3.14:** dekompresi terkonfirmasi pada Bun 1.3.10; implementasi + tes staging menunggu tahap (b) |
| U-61 F-025 — aggregate H-RES-05 tanpa angka | **addressed (desain)** | Angka 1.000.000 byte ditetapkan v2.3.13; **BARU v2.3.14:** dinyatakan sebagai input-body budget (bukan peak-memory budget); klaim "overhead 0 byte" dibatasi pada accumulator; tes staging belum dijalankan |
| U-62 Bukti VM H-RES-03 memakai Bun 1.4.4, bukan kanonik 1.3.10 | **DIPERSEMPIT (partially addressed — VM)** | **BARU v2.3.14:** dekompresi `Response.body` TERKONFIRMASI pada Bun 1.3.10 (gzip/br, re-run skrip F-024 tanpa perubahan). Sisa NOT VERIFIED: perilaku di runtime artifact staging/produksi + `deflate`/`zstd`. |
| U-63 (BARU) F-026 — transient chunk tidak dibatasi pre-append accounting | **addressed (desain)** | Anggaran A1/A2 dipisah; klaim "overhead 0 byte" dicabut sebagai pernyataan umum; max chunk terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED; tes staging belum dijalankan |
| U-64 (BARU) F-027 — L2 bukan batas peak memory | **addressed (desain)** | Karakter hidup 3,60× input; peak RSS +4,98× (1.3.10); larangan materialisasi bersamaan + pemindaian incremental; H-RES-05 diperbarui; tes staging belum dijalankan |
| U-65 (BARU) F-028 — provenance deployment live tidak dapat diaudit | **NOT VERIFIED** | LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED; template manifest dipublikasikan (tetap kosong); butuh manifest terisi dari operator + owner |
| U-66 (BARU) Lockfile v2 tidak dapat dibaca Bun kanonik 1.3.10 | **OPEN** | Frozen install 1.3.10 GAGAL (`Unknown lockfile version`); kanonik 1.3.10 vs lockfile v2 tidak kompatibel; keputusan G-G dibutuhkan (adopsi Bun baru vs regenerasi lockfile) |

**Kriteria latensi alert ST-12 (dipertahankan v2.3.14):**
ST-12-LAT-01 (alert ≤ 5 menit), ST-12-LAT-02 (alert wajib memuat
timestamp + lock path + identitas proses), ST-12-LAT-03 (tanpa kanal
= NOT RUN, bukan PASS). Kanal alert masih UNASSIGNED sehingga
kriteria ini belum dapat diuji.

## §6. Hard gates — ditegaskan kembali (v2.3.14)

Tidak satu pun dari yang berikut diizinkan oleh revisi ini:

- **No Link Scanner activation** — scanner tetap nonaktif; mitigasi G0
  (tolak semua URL arbitrer) tetap menjadi penahan. F-019 tetap
  NOT VERIFIED / BLOCKED.
- **No public deployment** — public tester tetap ON HOLD (Rama,
  2026-11-08 00:28 WIB); tidak ada deploy dari revisi ini.
- **No production build** — build penuh tidak dicoba di VM ini (house
  rules); tidak ada klaim build.
- **No DB/catalog change** — tidak ada migrasi, tidak ada perubahan
  katalog, tidak ada perubahan `app.db`.
- **No source implementation** — F-001..F-005, F-016/F-017/F-022, F-018
  tetap OPEN/BLOCKED sampai otorisasi eksplisit tahap (b) dari pemilik
  + harness staging PASS + review independen. **HOLD perubahan source
  (F-020) tetap berlaku.**
- **No production testing** — tidak ada pemanggilan action produksi
  (termasuk `checkLink`) sebagai bagian revisi ini.

## §7. Yang butuh keputusan Rama (pemilik proyek)

1. **G-A — scope perubahan source (F-020):** 3 pertanyaan scope
   v2.3.11 — belum dijawab; HOLD tetap berlaku.
2. **G-C — tenancy F-018:** pernyataan resmi provider tentang scope
   `ctx.db` — belum ada (bukan keputusan Rama langsung, tetapi
   Rama yang meminta/menetapkan jalur permintaannya).
3. **G-D — U-46:** opsi (a) terima fallback numeric-kill
   terkuantifikasi ATAU (b) adopsi larangan evaluasi — belum
   diputuskan; keputusan harus tertulis + menyebut opsi + tanggal.
4. **G-F — keputusan cache F-022:** owner menerima cabang pilihan
   (hapus cache dari semua jalur security-scan) vs alternatif —
   belum diputuskan.
5. **G-G — keputusan Bun F-009 (kini berbukti):** kanonik 1.3.10 vs
   1.4.4 — **BARU v2.3.14:** lockfile ter-commit v2 TIDAK DAPAT
   dibaca 1.3.10 (frozen install gagal, U-66). Opsi: (a) adopsi Bun
   lebih baru sebagai kanonik, ATAU (b) regenerasi lockfile di bawah
   1.3.10. Keduanya butuh keputusan + otorisasi tahap (b).
6. **G-E — staging tersedia + peran terisi:** staging operator,
   platform/runtime provider, egress owner, DB/runtime owner, alert
   channel + operator penerima, rollback owner — semuanya masih
   UNASSIGNED.
7. **F-028 — manifest deployment terisi:** operator + owner
   menyediakan manifest terisi per deployment (field 2, 4, 6, 8, 12
   minimal) bila klaim versi live ingin dapat diaudit.
8. **Ambang RSS operasional H-RES-03/05:** staging operator
   menetapkan ambang high-water RSS SEBELUM tes dijalankan
   (prasyarat tes, bukan hasil tes).

Tidak satu pun dari delapan hal di atas diputuskan oleh revisi ini.

## §8. Yang TIDAK diklaim v2.3.14

- Tidak ada klaim bahwa peak memory per scan kini dibatasi — L2
  adalah input-body budget; peak-memory per scan tetap NOT VERIFIED
  sampai H-RES-05 yang diperbarui PASS di staging.
- Tidak ada klaim bahwa transient chunk / in-flight memory kini
  dibatasi — worst-case A2 = seluruh body per chunk; BYOB NOT
  VERIFIED; limit proses/cgroup belum ada.
- Tidak ada klaim bahwa versi live diketahui — LIVE VERSION /
  DEPLOYMENT APPROVAL = NOT VERIFIED; template manifest BUKAN bukti
  deployment.
- Tidak ada klaim bahwa pohon ter-commit dapat di-install frozen
  pada Bun 1.3.10 — justru sebaliknya: frozen install TERBUKTI
  GAGAL (U-66); typecheck 1.3.10 exit 0 hanya berlaku terhadap
  lockfile hasil regenerasi v1 di scratch.
- Tidak ada klaim bahwa bukti VM adalah bukti staging — semua paket
  bukti baru dilabeli VM; tidak ada bukti staging yang dihasilkan.
- Tidak ada klaim bahwa F-001..F-005, F-018, F-019, atau U-46
  tertutup — semuanya tetap OPEN/BLOCKED.
- Tidak ada pengulangan pengujian yang sudah punya bukti valid
  kecuali yang dibenarkan perubahan lingkungan: re-run skrip F-024
  di bawah Bun 1.3.10 (versi Bun berubah — justru celah U-62).
  Eksperimen chunk (F-026) dan derived-string (F-027) adalah
  pengukuran BARU atas pertanyaan BARU audit V7, bukan pengulangan.
- Tidak ada narasi insiden atau data wallet di dokumen mana pun
  dalam revisi ini.

## §9. Gate konkret berikutnya (v2.3.14 → v2.3.15)

Revisi ini bukan pengulangan status: ia mencabut klaim "overhead 0
byte" sebagai pernyataan umum dan memisah anggaran A1/A2 dengan
bukti eksperimen VM pada Bun kanonik 1.3.10 (F-026), menyatakan L2
sebagai input-body budget dengan larangan materialisasi bersamaan +
pemindaian incremental yang terukur lebih hemat memori (F-027),
mempertahankan LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED
dengan template manifest deployment (F-028), mengonfirmasi
dekompresi Bun 1.3.10 sekaligus membuktikan frozen install 1.3.10
gagal karena lockfile v2 (F-009/U-62/U-66).

Gate berikutnya dan prasyaratnya: **(G-A)** keputusan owner atas
scope perubahan source (F-020); **(G-B)** bukti runtime F-019
(versi/digest + kontrol disabled (a)–(e)); **(G-C)** keputusan
tenancy F-018; **(G-D)** keputusan U-46; **(G-E)** staging tersedia
+ peran UNASSIGNED terisi; **(G-F)** keputusan cache F-022;
**(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4 (kini dengan
bukti inkompatibilitas lockfile v2); **(G-H)** eksekusi harness
H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi
implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi
ulang perilaku Bun pada versi kanonik (U-62, bagian staging);
**(G-I) BARU** stress test memori H-RES-03/05 pada staging Bun
1.3.10 (chunk > cap, 3 script paralel, fixture batas 1.000.000 +
varian non-ASCII, high-water RSS ≤ ambang pra-tes) + proses
deployment manifest terisi untuk setiap deployment (F-028).
Pemicu revisi v2.3.15: keputusan owner atas G-A/G-C/G-D/G-F/G-G,
ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit
independen V8 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.14.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Eksperimen chunk P2: shared abort membatalkan `fetch` sibling sebelum chunk pertama → `AbortError` tidak tertangani, skrip exit 1 pada run pertama (kedua versi Bun) | Perilaku itu sendiri adalah temuan (abort bersama membatalkan sibling dengan cepat di loopback). Skrip diperbaiki: `fetch` dibungkus try/catch, abort-sebelum-chunk-pertama dicatat sebagai hasil, bukan error. Rerun exit 0 di kedua versi; log rerun yang dipertahankan. | Jangan menganggap abort-sebelum-chunk-pertama sebagai kegagalan eksperimen — itu data. Staging harus mencatat perilaku ini, bukan mengandalkannya. |
| 2 | Bun 1.3.10 tidak tersedia sebagai binary di VM (hanya 1.4.4 di `/opt/hatch-image/bin/bun`) | Berhasil diunduh dari rilis resmi oven-sh/bun (`bun-v1.3.10`, zip 39.328.732 byte) ke `/tmp/bun1310/`; versi terverifikasi `1.3.10+30e609e08`. Semua eksperimen v2.3.14 dijalankan pada binary ini DAN 1.4.4. | Binary unduhan ada di `/tmp` (ephemeral) — bila VM di-restart, unduh ulang dari rilis resmi yang sama; log mentah di repo adalah bukti yang dipertahankan. |
| 3 | Frozen install 1.3.10 gagal (`Unknown lockfile version`) | BUKAN kegagalan percobaan — temuan U-66 yang dicatat sebagai temuan baru. Install non-frozen berhasil (79 paket) + typecheck exit 0 (hanya terhadap lockfile regenerasi v1). | Keputusan G-G (adopsi Bun baru vs regenerasi lockfile) — butuh keputusan owner + otorisasi tahap (b). |
| 4 | `heapUsed` tidak bergerak pada Bun 1.3.10 saat string dialokasikan | BUKAN bug skrip — perilaku runtime versi itu (string dicatat di external/RSS). Dicatat sebagai batasan metrik: ambang acceptance wajib memakai RSS + external per versi runtime. | H-RES-05 yang diperbarui memakai high-water RSS, bukan `heapUsed` saja. |
| 5 | Chunking server 64 KiB tidak membatasi chunk klien | Teramati, bukan kegagalan: P4 1.3.10 menerima satu chunk 500.000 byte. Dicatat sebagai temuan F-026 (server-side chunking bukan kontrol ukuran chunk). | Jangan mendesain kontrol berbasis ukuran chunk server; batas chunk runtime / BYOB harus dibuktikan terpisah. |
| 6 | Staging tetap tidak tersedia; semua owner staging UNASSIGNED | Semua tes staging (H-RES-03/05 diperbarui, H-SSRF-01..20, STAGE-P01..P12) tetap BLOCKED — bukan karena tidak dicoba, melainkan karena prasyaratnya (staging + operator + otorisasi tahap b) belum ada. | Laporkan ke Rama sebagai hambatan yang sudah dilaporkan sebelumnya (bukan hambatan baru): staging + keputusan G-A/G-C/G-D/F/G-G. |
| 7 | Manifest deployment tidak dapat diisi dari repo/chat | Template dipublikasikan; manifest tetap KOSONG. Tidak ada nilai yang ditebak. | Operator + owner menyediakan manifest terisi per deployment bila klaim versi live ingin dapat diaudit. |

**Catatan akhir:** Sampai commit v2.3.14 masuk `main`, tidak ada
kemajuan teknis yang diklaim selain yang tertulis di matriks ini
dengan file path, test ID, log ID, commit SHA audit yang dijawab,
dan tanggal run yang mendukungnya.
