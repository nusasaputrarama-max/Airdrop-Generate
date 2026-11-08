# SSRF RESPONSE MATRIX v2.3.18 — Jawaban atas Audit Independen ChatGPT V11

**Dokumen:** matriks respons revisi desain v2.3.18
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V11.md` (commit `c69af06`, 2026-11-08)
  — temuan baru F-034 + F-035, catatan U-72, F-032 partially
  addressed + Muse Handoff §11 (9 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.18:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.18 — §D.4.29 ringkasan revisi, risiko baru U-73/U-74 di §G,
U-70/U-72 diperbarui, ambang pra-tes H-RES-05 ditetapkan) +
`evidence/f032-harness-validation/` (diperbarui — modul oracle PID
ketat + driver E2E direktori privat + 3 tes regresi baru + 4 log
mentah baru) + `evidence/f029-memory-methodology/` (diperbarui —
seam diperketat + tes regresi U-72 + log baru). Matriks v2.3.17
(`SSRF_RESPONSE_MATRIX_V2317.md`) dipertahankan utuh sebagai
catatan sejarah revisi itu. Temuan F-001..F-033 dibawa ke sini
dengan status terbarunya; yang baru di v2.3.18 hanyalah F-034,
F-035, pengetatan U-72, dan risiko baru U-73/U-74.

**Yang TIDAK dilakukan v2.3.18:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh — termasuk tidak ada
perubahan `site/package.json` / `site/bun.lock` di repo), tidak ada
perubahan database/katalog, tidak ada production build, tidak ada
pemanggilan action produksi apa pun (termasuk `checkLink` — tidak
di-invoke), Link Scanner tidak diaktifkan, public tester tidak
disentuh, live artifact tidak diubah. Bukti yang dipakai adalah:
pengujian harness di VM yang sama (oracle PID, file PID, seam) plus
eksperimen VM yang sudah ada (F-029 TIDAK diulang — lihat §2
F-033). Rerun harness F-032/E2E/negatif dibenarkan karena harness
berubah (F-034/F-035/U-72) — protokol butir 6 — dan dijelaskan
di §2.

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.18

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.18.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.18 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.18. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir berstatus ini di v2.3.18. |

## §1. Ringkasan status F-001..F-035

| ID | Severity | Status v2.3.18 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah: H-RES-05 kini memakai ambang pra-tes yang ditetapkan operator staging (bukan rasio VM); implementasi tetap menunggu tahap (b). |
| F-003 | High — tanpa total deadline | **blocked** | Tidak berubah: deadline total 30 detik PARTIALLY MITIGATED di kode mirror (d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`; cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | Tidak berubah: status tetap "reported by Muse, not independently verified"; bukti versi/diff live (a)–(c) tetap belum tersedia. |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V10 §7.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | Tidak berubah: proposal keputusan F-030 selesai sebagai paket yang dapat diputuskan (v2.3.16); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED. Status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 / V6 §8.1 / V7 §7.1 / V8 §7.1 / V9 §7.1 / V10 §7.1 / V11 §8 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | Tidak berubah: STAGE-P01..P12 dilengkapi prasyarat/prosedur/oracle/bukti; operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED — tidak ada nama owner yang dikarang; tidak ada gate READY. Kriteria ST-12-LAT-01..03 dipertahankan. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak berubah; lihat F-009/F-030. |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | Tidak berubah: cabang pilihan dinyatakan (hapus cache dari semua jalur security-scan); implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | Tidak berubah: semantik kepemilikan G-F diklarifikasi v2.3.13 — cabang pilihan adalah rekomendasi yang menunggu penerimaan owner, BUKAN otorisasi implementasi; F-017 + H-CACHE-05/06 menjadi NOT APPLICABLE HANYA SETELAH cabang penghapusan cache diimplementasikan. |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | Tidak berubah: kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | Tidak berubah: `checklink` MASIH TERDAFTAR (paket F-021); tidak ada versi/digest terekspos; tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | Tidak berubah: HOLD dipertahankan; tidak ada perubahan source di v2.3.18; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | Tidak berubah: paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool). |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | Tidak berubah: oracle tes cap dikoreksi v2.3.12/v2.3.13/v2.3.14; H-RES-05 kini memakai ambang pra-tes operator staging + fixture v2.3.17; implementasi + tes tetap menunggu tahap (b) + staging. |
| F-023 | Medium — H-RES-02 berisi kondisi fixture UTF-8 yang mustahil | **addressed** (desain) | Tidak berubah: arah mustahil dihapus v2.3.13; tiga fixture feasible + angka terverifikasi dipublikasikan. Harness staging belum dijalankan. |
| F-024 | Medium — H-RES-03 tidak mendefinisikan lapisan byte yang di-cap | **addressed** (desain) | Tidak berubah: perilaku dekompresi transparan TERKONFIRMASI pada Bun kanonik 1.3.10 (re-run v2.3.14). Staging + `deflate`/`zstd` tetap NOT VERIFIED. |
| F-025 | Medium — H-RES-05 tanpa angka aggregate budget | **addressed** (desain) | Tidak berubah: angka 1.000.000 byte tetap sebagai input-body budget; ambang pra-tes high-water kini ditetapkan eksplisit sebagai keputusan operator staging (bukan rasio VM). Tes staging belum dijalankan. |
| F-026 | Medium — batas decoded-byte tidak membatasi transient chunk allocation | **addressed** (desain) | Tidak berubah: anggaran A1 vs A2 dipisah v2.3.14; chunk maksimum terukur 528.384 byte (1.3.10); BYOB NOT VERIFIED. Tes staging belum dijalankan. |
| F-027 | Medium — L2 tidak mencakup representasi string turunan | **addressed** (desain) / **koreksi kuantitatif v2.3.17** | Tidak berubah: karakter hidup 3,60× DIPERTAHANKAN sebagai character accounting; rasio penghematan incremental v2.3.16 (1,13–1,84×) dinyatakan SUPERSEDED — rasio terukur ulang de-confounded 1,12–2,62× (median VmHWM). Larangan materialisasi bersamaan + pemindaian incremental TETAP berlaku. Tes staging belum dijalankan. |
| F-028 | Medium — klaim live v15 dan persetujuan d85a1e2 tanpa provenance yang dapat diaudit | **partially addressed** | Tidak berubah: LIVE VERSION / DEPLOYMENT APPROVAL = NOT VERIFIED (dipertahankan); template manifest dipublikasikan (`DEPLOYMENT_MANIFEST_TEMPLATE.md`) — manifest itu sendiri tetap KOSONG sampai operator menyediakannya. Tidak ada tebakan versi live. |
| F-029 | Medium — perbandingan peak memory F-027 tidak valid secara metodologis | **addressed** (metodologi + koreksi klaim) | Tidak berubah; TIDAK diulang di v2.3.18 (child terukur + metodologi byte tidak berubah — lihat §2 F-033). Manfaat staging (bukan angka VM) tetap harus dibuktikan di H-RES-05. |
| F-030 | Medium — lockfile ter-commit tidak kompatibel dengan Bun kanonik | **partially addressed** (proposal keputusan selesai; blocker CONFIRMED) | Tidak berubah: proposal keputusan selesai sebagai paket yang dapat diputuskan (v2.3.16 — rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED. F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE. |
| F-031 | Low — fixture F-029 tidak tepat pada batas byte yang dinyatakan | **addressed** (fixture diperbaiki + rerun + varian cap−1/cap+1) | Tidak berubah; bukti byte diperkuat v2.3.17 (preflight terpisah 61 checks, independen dari measured process). |
| F-032 | Low — harness dapat melaporkan sukses dengan nol run | **addressed** (validasi + tes regresi negatif + timeout E2E + oracle ketat + direktori privat) | **BARU v2.3.18:** caveat V11 atas oracle terminasi DITUTUP — oracle ketat `pid-oracle.ts` (hanya ESRCH = mati; EPERM = hidup; starttime `/proc` untuk identitas PID) + file PID di direktori privat per-run; uji E2E diulang (log `run-f032-timeout-e2e-v2318.txt`): 12 child timeout, ke-12 PID mati via ESRCH, 12 PID yang diuji == 12 child yang diluncurkan, exit 1, tanpa success line; tes regresi negatif diulang pada harness baru (log `run-f032-negative-v2318.txt`). |
| F-033 | Medium — alokasi instrumen TextEncoder dan lifecycle GC tidak simetris pada eksperimen A/B | **addressed** (harness diperbaiki + rerun + rasio terukur ulang) | Tidak berubah; rasio 1,12–2,62× tetap HANYA bukti VM, BUKAN sizing/cgroup/acceptance. Ambang pra-tes H-RES-05 kini ditetapkan eksplisit sebagai keputusan operator staging (lihat §2 F-033). |
| F-034 | Low — oracle terminasi child menerima semua exception sebagai proses mati | **addressed** (oracle diperketat + tes regresi) | **BARU v2.3.18:** modul `pid-oracle.ts` — hanya ESRCH = mati; EPERM = hidup; EINVAL/lainnya = inconclusive; parsing file PID ketat; identitas PID via starttime `/proc`; tes regresi `test-pid-oracle.ts` 30 assert PASS (log `test-pid-oracle-v2318.txt`). |
| F-035 | Low — PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU | **addressed** (direktori privat per-run + file eksklusif + tes regresi) | **BARU v2.3.18:** path tetap DIHAPUS; direktori privat `mkdtemp` 0700 + file PID `openSync "wx"` 0600 + validasi `lstat` di child + cleanup `finally`; tes regresi `test-f035-pidfile.ts` 25 assert PASS (log `test-f035-pidfile-v2318.txt`): symlink di path lama tak tersentuh, dua driver paralel aman, cleanup terverifikasi. |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V11

### F-034 — Low: oracle terminasi child menerima semua exception sebagai proses mati — **addressed** (oracle diperketat, tes regresi, E2E diulang)

**Temuan (diterima sepenuhnya):** Audit V11 benar di semua poin
bukti (§6 F-034): `run-f032-timeout-e2e.ts` v2.3.17 membaca PID
file dan mengubah tiap baris menjadi `Number` tanpa validasi;
pada pemeriksaan `process.kill(pid, 0)`, semua exception
ditangkap oleh `catch { stillAlive = false; }` — komentar
menyebut ESRCH tetapi kode tidak memeriksa `error.code`. Bila
proses masih hidup tetapi pemeriksaan mengembalikan EPERM, atau
input PID tidak valid menghasilkan exception lain, driver tetap
menganggap proses mati. Log yang diterbitkan menyebut ESRCH,
tetapi implementasi driver tidak mencatat atau mengharuskan kode
error tersebut.

**Perbaikan v2.3.18 (`evidence/f032-harness-validation/`):**

- Modul baru `pid-oracle.ts` (SHA-256
  `4d36b47ea6bced479944cd6d959a305e9209cf406445c595e306306f69a8166c`):
  `parsePidFile()` + `classifyLiveness()` + `parseProcStat()` +
  `defaultDeps()`. Aturan yang ditegakkan:
  1. File PID di-parse ketat: tiap baris tepat `"<pid>
     <starttime>"`, keduanya positive safe integer, pid
     1..2^31−1. Baris kosong (selain satu newline penutup),
     malformed, duplikat, atau di luar rentang adalah error —
     file ditolak SEBELUM assertion liveness.
  2. Hanya `error.code === "ESRCH"` dari `kill(pid, 0)` yang
     berarti proses tidak ada (verdict `dead`).
  3. EPERM berarti proses ADA tetapi tidak bisa di-signal
     (verdict `alive` — caller WAJIB FAIL, tidak pernah PASS).
  4. EINVAL, `ERR_INVALID_ARG_TYPE`, dan exception lain berarti
     oracle tidak dapat memutuskan (verdict `inconclusive` —
     caller WAJIB FAIL).
  5. Bila `kill(pid, 0)` berhasil, identitas diverifikasi via
     starttime field 22 `/proc/<pid>/stat` yang dicatat child
     saat spawn: cocok = child yang sama masih hidup; berbeda =
     PID dipakai ulang proses lain (child asli mati); state Z/X =
     zombie/mati; `/proc` tak terbaca/tak ter-parse =
     inconclusive. Satu-satunya pengecualian: proses yang keluar
     di antara probe signal dan pembacaan `/proc` (ENOENT) =
     mati.
  6. Oracle injectable (`kill`/`readStat`) supaya tes regresi
     dapat membuktikan aturan EPERM/EINVAL tanpa bergantung pada
     layout permission host.
- `hang-child.ts` diperbarui (SHA-256
  `da44592561e181ff196b607cc94b0f37c71174eb57543f08b17765541ea7b25a`):
  mencatat `"<pid> <starttime>"` (starttime dari
  `/proc/self/stat` saat spawn); bila `/proc/self/stat` tidak
  terbaca/tidak ter-parse, child exit 1 tanpa menggantung —
  E2E gagal dengan keras, bukan melemah diam-diam.
- `run-f032-timeout-e2e.ts` ditulis ulang (SHA-256
  `55be54784500953aed13ac2daa27551ee19a2f2f7cddd0f7e50df2bdce51063f`):
  memakai oracle ketat; meng-assert jumlah PID yang diuji (12)
  == jumlah child yang diluncurkan (12); tiap verdict liveness
  dicatat di log (`e2e liveness pid=… starttime=…: dead
  (kill(pid,0) threw ESRCH …)`).

**Bukti baru v2.3.18 — tes regresi oracle (`test-pid-oracle.ts`,
SHA-256
`56e0e0cb2a2b727fa8f12bd30e6e835638e75b1fe10b44447266eb55f42068f9`;
log `test-pid-oracle-v2318.txt`, SHA-256
`4cc0d407c90dbb2900ca35be46afc6c0c68413f849de6dd123f2d749f529b300`,
36 baris; Bun 1.4.4, 2026-11-08T03:59:48Z):**

| # | Kasus | Hasil |
| --- | --- | --- |
| 1–15 | Parsing: valid (3 record), tanpa trailing newline, file kosong, baris kosong di tengah, tanpa starttime, non-numerik, field tambahan, pid 0, pid > 2^31−1, float, negatif, duplikat, starttime sama di dua pid (diizinkan), spasi di depan | PASS (15/15 — tiap kasus error ditolak atau diterima sesuai aturan) |
| 16 | ESRCH (stub) → dead | PASS |
| 17 | EPERM (stub) → alive, TIDAK PERNAH dead | PASS |
| 18 | EINVAL (stub) → inconclusive, TIDAK PERNAH dead | PASS |
| 19 | ERR_INVALID_ARG_TYPE (stub) → inconclusive | PASS |
| 20 | `parseProcStat` mem-parse `/proc/self/stat` sendiri | PASS |
| 21 | Hidup + starttime cocok (stub) → alive | PASS |
| 22 | Hidup + starttime berbeda (stub) → dead (PID reuse) | PASS |
| 23 | State Z / zombie (stub) → dead | PASS |
| 24 | kill ok + `/proc` ENOENT → dead (keluar di antara probe) | PASS |
| 25 | kill ok + `/proc` EPERM → inconclusive | PASS |
| 26 | kill ok + stat tak ter-parse → inconclusive | PASS |
| 27 | Child yang sudah exit → dead via ESRCH SUNGGUHAN | PASS (pid 2956) |
| 28 | Stat `/proc` `sleep 30` ter-parse | PASS (pid 2958) |
| 29 | `sleep 30` hidup → alive via kill + starttime SUNGGUHAN | PASS (pid 2958) |
| 30 | `sleep 30` setelah SIGKILL terkontrol → dead | PASS (pid 2958) |
| — | Probe EPERM hidup | TIDAK DAPAT DIPRODUKSI — VM berjalan sebagai root (uid 0), `kill(1,0)` berhasil; dicatat jujur di log. Aturan EPERM→FAIL dibuktikan kasus stub #17, bukan proses hidup. |

Verdict tes: **PID ORACLE TEST: PASS** (30 assert). Kriteria
penerimaan V11 §11 butir 1 terpenuhi: raw log baru disertakan;
tes membuktikan EPERM/EINVAL tidak dapat menghasilkan PASS
(kasus 17–19, 24–25); PID hidup → FAIL + cleanup terkontrol
(kasus 27–28); PID malformed/duplikat gagal sebelum assertion
liveness (kasus 1–15); 12 PID yang diuji = 12 child yang
diluncurkan (dibuktikan log E2E di bawah).

**Bukti E2E diulang (log `run-f032-timeout-e2e-v2318.txt`,
SHA-256
`00d23aa532548242bc19f0399f298f485e25f91a823112798b046b56c594de33`,
189 baris; Bun 1.4.4, 2026-11-08T03:58:01Z, durasi ~36 detik):**
12 FAIL `timeout after 3000 ms`; ke-12 PID tercatat sebagai
`"<pid> <starttime>"` (3116, 3126, 3135, 3147, 3155, 3165, 3178,
3188, 3198, 3206, 3219, 3232); assert `PIDs tested (12) ==
children launched (12)` PASS; ke-12 verdict liveness `dead`
via ESRCH sungguhan (starttime tercatat per baris); 0 record;
`COUNT MISMATCH`; `parent done: FAILED`; exit 1; TIDAK ADA
`all child runs ok`; TIDAK ADA baris RESULT. Verdict driver:
**E2E TIMEOUT TEST: PASS**. F-032 kini ADDRESSED pada tingkat
harness VM — termasuk oracle terminasi yang di V11 §3 butir 4
masih PARTIALLY ADDRESSED.

**Risiko tersisa:** U-73 (oracle lama terkonfounded — log v2.3.17
dipertahankan sebagai bukti historis; klaim yang mengikat kini
bersandar pada log v2.3.18). **Aksi berikutnya:** tidak ada —
oracle v2.3.18 adalah oracle yang dipakai untuk rerun apa pun.

### F-035 — Low: PID file E2E memakai path tetap di /tmp dan rentan symlink/TOCTOU — **addressed** (direktori privat per-run + file eksklusif + tes regresi)

**Temuan (diterima sepenuhnya):** Audit V11 benar (§6 F-035):
driver v2.3.17 memakai path tetap `/tmp/f032-hang-child.pid`,
mengecek keberadaan lalu menghapusnya, lalu meneruskan path itu
via environment; child membuka path dengan `appendFileSync`
yang mengikuti symlink. Pada VM bersama, pengguna lokal lain
dapat membuat symlink pada celah waktu setelah unlink dan
sebelum child membuka file; dua eksekusi driver bersamaan juga
dapat saling menghapus/mencampur PID file.

**Perbaikan v2.3.18 (`evidence/f032-harness-validation/` —
`run-f032-timeout-e2e.ts` ditulis ulang +
`hang-child.ts` diperbarui):**

- **Direktori privat per-run** dengan `mkdtemp`
  (`/tmp/f032-e2e-XXXXXX`, mode 0700); realpath + kepemilikan
  uid divalidasi SEBELUM child mana pun dijalankan; bila
  validasi gagal, driver FAIL.
- **File PID eksklusif:** dibuat di dalam direktori privat
  dengan `openSync "wx"` (O_CREAT|O_EXCL — gagal bila path
  adalah symlink, bahkan yang menggantung), mode 0600,
  fstat-validated (regular file + mode 600).
- **Validasi di child:** `hang-child.ts` memvalidasi file PID
  dengan `lstat` sebelum append — harus file regular (bukan
  symlink), milik uid yang sama, mode 0600; bila gagal, child
  exit 1 tanpa menggantung (parent mencatat FAIL non-timeout).
  Jendela mikro antara `lstat` dan `append` ditutup oleh
  direktori privat itu sendiri (hanya pemilik yang bisa menulis
  di dalamnya); pemeriksaan `lstat` adalah lapis tambahan, bukan
  satu-satunya kontrol.
- **Cleanup di `finally`:** direktori (dan file PID di dalamnya)
  dihapus setelah semua child selesai, apa pun hasil run-nya.
- Path tetap lama `/tmp/f032-hang-child.pid` TIDAK lagi
  direferensikan driver sama sekali.

**Bukti baru v2.3.18 — tes regresi F-035
(`test-f035-pidfile.ts`, SHA-256
`7f060400fb07555171334aa976a0178e51293272b65102682f0811ac8efe6975`;
log `test-f035-pidfile-v2318.txt`, SHA-256
`937ed44521d09a8c218130ac97f3faf9344e982c15b730c97bc733cd86e539df`,
31 baris; Bun 1.4.4, 2026-11-08T03:59:56Z):**

| # | Assert | Hasil |
| --- | --- | --- |
| 1 | Path lama adalah symlink sebelum run | PASS |
| 2–3 | Driver A dan B exit 0 | PASS |
| 4–5 | Driver A dan B melaporkan E2E TIMEOUT TEST: PASS | PASS |
| 6–9 | Kedua driver mencetak direktori privat; keduanya BERBEDA (`/tmp/f032-e2e-48auan` vs `/tmp/f032-e2e-YyTPEK`); keduanya path `mkdtemp` segar | PASS |
| 10–11 | Driver A dan B masing-masing mencatat 12 PID | PASS |
| 12 | Kedua set PID disjoint — tiap run hanya membaca PID miliknya (overlap: none) | PASS |
| 13–14 | Tak satu pun log menyebut path tetap lama | PASS |
| 15–18 | Mode direktori 700 + mode file 600 tervalidasi di kedua log | PASS |
| 19–22 | Kedua direktori privat terhapus setelah run; kedua log mengonfirmasi `removed: true` | PASS |
| 23–25 | Target symlink byte-identik sebelum/sesudah (sha256 `dfdbc645…` sama); symlink tetap menunjuk target; symlink dihapus di teardown | PASS |

Verdict tes: **F-035 PIDFILE TEST: PASS** (25 assert). Dua
driver paralel berjalan ~36 detik total (bersamaan, bukan
berurutan). Kriteria penerimaan V11 §11 butir 2 terpenuhi: tes
symlink pre-created, dua invocation paralel, cleanup, dan bukti
tidak ada file target lain yang berubah — semuanya ada di log.

**Risiko tersisa:** U-74 (pola path tetap — kini dihapus dari
driver; pola yang sama di harness lain harus diperiksa bila
harness baru dibuat). **Aksi berikutnya:** tidak ada — pola
direktori privat adalah pola yang dipakai untuk pengujian
harness apa pun ke depannya.

### U-72 — Test seam F029_CHILD_SCRIPT diperketat — **addressed** (mode test eksplisit + allowlist realpath + tolak symlink + tes regresi)

**Catatan audit (diterima sepenuhnya):** Audit V11 §6 U-72 benar:
`run-f029.ts:62` mengambil `F029_CHILD_SCRIPT` langsung dari
environment lalu memakainya pada argumen child (~baris 163)
tanpa allowlist atau pembatasan realpath — seam yang disengaja
untuk timeout E2E, bukan kerentanan aplikasi. Siapa pun yang
dapat mengontrol environment harness dapat memilih script yang
dijalankan Bun dengan privilege pengguna yang menjalankan
harness. Status audit: design gap / local tooling risk; BUKAN
product vulnerability. Revisi ini TIDAK menaikkannya menjadi
risiko aplikasi.

**Perbaikan v2.3.18 (`run-f029.ts` diperbarui, SHA-256
`df7cd6c6dd6b736ae05e3ad02ff7dea4c401616306cc97b22f34a067a6e97295`):**

- Override `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` hanya
  dihormati bila `F029_TEST_MODE=1` eksplisit. Nilai lain
  (`"true"`, `"0"`, `"yes"`) TIDAK mengaktifkan mode test.
- Script child harus realpath ke fixture yang disetujui:
  `exp-pattern.ts` atau `hang-child.ts` di dalam evidence tree.
  Path di luar evidence tree, path yang tidak resolve, dan file
  non-script → exit 2.
- Path yang diberikan tidak boleh berupa symlink (diperiksa
  dengan `lstat` sebelum `realpath`) — bahkan symlink yang
  menunjuk fixture yang disetujui ditolak.
- Semua penolakan terjadi SEBELUM preflight/child mana pun
  di-spawn (exit 2). Perilaku default tidak berubah: tanpa env
  var, script = `exp-pattern.ts`, timeout = 120.000 ms.
- Driver E2E kini menyetel `F029_TEST_MODE=1` bersama seam-nya;
  baris log `test-seam:` kini menyebut `F029_TEST_MODE=1`
  eksplisit.

**Bukti baru v2.3.18 — tes regresi seam
(`evidence/f029-memory-methodology/test-u72-seam.ts`, SHA-256
`a598eba8a6182b2e698af4e208e8d8ea871af69cba8d50dabe1fb9cc942ed34e`;
log `test-u72-seam-v2318.txt`, SHA-256
`cefadfdd4753f7686f6d1656c85c5813976adec38babdc095259689663eaa550`,
20 baris; Bun 1.4.4, 2026-11-08T03:59:48Z):**

| # | Kasus | Hasil |
| --- | --- | --- |
| 1 | Override tanpa test mode → exit 2, error menyebut `F029_TEST_MODE=1`, ditolak sebelum preflight | PASS |
| 2 | `F029_TEST_MODE=true` + override → exit 2 | PASS |
| 3 | Timeout override tanpa test mode → exit 2 | PASS |
| 4 | Path arbitrer di luar evidence dalam test mode → exit 2 ("not an approved fixture") | PASS |
| 5 | Symlink ke fixture yang disetujui dalam test mode → exit 2 ("must not be a symlink") | PASS |
| 6 | Path tak ada dalam test mode → exit 2 | PASS |
| 7 | File non-script (`/etc/passwd`) dalam test mode → exit 2 | PASS |
| 8 | Fixture yang disetujui dalam test mode DITERIMA: hang-child + timeout 100 ms → 12 FAIL timeout, exit 1, baris `test-seam:` tercatat | PASS |

Verdict tes: **U-72 SEAM TEST: PASS** (15 assert). Semua kasus
penolakan gagal CEPAT (exit 2 sebelum preflight/child).
**TIDAK ADA workflow CI yang ditambahkan** — sesuai audit V11
§11 butir 3: tidak ada workflow yang mengeksekusi input PR tak
tepercaya tanpa threat model.

**Risiko tersisa:** U-72 diperbarui (sisa risiko: operator yang
SENGAJA menyetel `F029_TEST_MODE=1` dengan fixture yang
disetujui lalu mengklaim run itu sebagai run produksi —
dimigasi baris log `test-seam:` eksplisit + reviewer WAJIB
memeriksanya). **Aksi berikutnya:** tidak ada.

### F-033 — dipertahankan sebagai VM evidence saja; ambang pra-tes H-RES-05 ditetapkan — **addressed** (dipertahankan dengan benar)

Tidak ada perubahan pada rasio 1,12–2,62× (median VmHWM) dan
tidak ada rerun eksperimen F-029 di v2.3.18: child terukur dan
metodologi byte tidak berubah (yang berubah hanya gate seam +
oracle/file PID pada jalur uji), sehingga pengulangan 120 run
tidak dibenarkan protokol butir 6. Kontrol positif `--runs 1`
pada harness baru (log `run-f032-negative-v2318.txt`) membuktikan
jalur default tetap bekerja end-to-end (12 RESULT + `parent
done: all child runs ok`).

**Ambang pra-tes H-RES-05 — ditetapkan di sini (desain §D.4.29):**
ambang high-water RSS/VmHWM untuk staging ditentukan oleh
operator staging dari budget memori target (runtime, kernel,
cgroup, concurrency, dan konfigurasi yang sama dengan target)
pada saat staging disiapkan — BUKAN diturunkan dari rasio VM
1,12–2,62× atau dari angka forced-GC mana pun. Gate G-I
mensyaratkan high-water terukur di staging ≤ ambang pra-tes itu,
pada kedua mode GC, dengan fixture v2.3.17. Rasio 1,12–2,62×
tetap HANYA bukti VM atas pola simulasi; statusnya sebagai angka
operasional tetap NOT VERIFIED sampai review independen atas
paket ini — audit V11 §4.3 menegaskan batas interpretasi yang
sama (rasio tidak boleh dipakai sebagai angka kapasitas, cgroup
limit, atau acceptance staging).

### F-030 — proposal keputusan dipertahankan tanpa implementasi — **partially addressed** (paket keputusan selesai; blocker CONFIRMED)

Tidak ada fakta baru di v2.3.18. Proposal keputusan v2.3.16
(rekomendasi Opsi A + SDK vendorkan, fallback Opsi B,
provenance/digest yang dibutuhkan, prasyarat clean-builder,
rollback, dampak bukti runtime) dibawa utuh; digest rilis Bun
1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED (tidak
dikarang). **Acceptance F-030 tetap belum satu pun
terpenuhi** — F-030 tetap **CONFIRMED BLOCKER** dan F-009
tetap **NOT REPRODUCIBLE**. Tidak ada klaim reproducible
sebelum frozen install + typecheck + build pada clean
external builder berhasil dengan SDK yang dapat diverifikasi.

**Risiko tersisa:** U-68 (keputusan reproduksibilitas belum
ada). **Aksi berikutnya:** keputusan owner G-G (gate G-J).

### F-028 — klaim live v15 tanpa provenance — **partially addressed** (dipertahankan NOT VERIFIED)

Tidak ada fakta baru. LIVE VERSION / DEPLOYMENT APPROVAL tetap
**NOT VERIFIED**; semua 15 field template manifest tetap
NOT PROVIDED; tidak ada tebakan versi live, tidak ada perubahan
live, tidak ada klaim approval baru. Template manifest
(`DEPLOYMENT_MANIFEST_TEMPLATE.md`) tetap kosong sampai operator
menyediakannya. Satu manifest per deployment; nilai ditebak =
manifest tidak sah.

### F-019 — status Link Scanner nonaktif tanpa bukti kontrol runtime — **blocked (NOT VERIFIED)**

Tidak ada fakta baru. Hanya bukti read-only; `checkLink` TIDAK
di-invoke, tidak ada public share yang dibuat, tidak ada perubahan
runtime state. Kontrol (a)–(e) (§D.4.22) tetap belum satu pun
terpenuhi: versi/digest artifact, action dispatch denial /
pre-handler rejection, UI gate, public invocation denial, dan
egress observation. Deployment tetap BLOCKED.

### F-020 — scope refactoring source mirror — **partially addressed** (HOLD dipertahankan)

Tidak ada perubahan source di v2.3.18; tidak ada revert d85a1e2;
tidak ada artefak approval terpisah di repo. HOLD perubahan source
lanjutan tetap berlaku sampai owner mengklarifikasi scope.

### F-018 — isolasi data antar-pengguna — **partially addressed** (tidak ada fakta baru)

Kutipan `.d.ts` dipublikasikan v2.3.12; semantik tenancy runtime
tetap **NOT VERIFIED**; pernyataan resmi provider tetap belum ada.
Tidak ada kesimpulan dari nama tipe saja.

### F-001..F-005 — spesifikasi implementasi dipertahankan — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Tidak ada perubahan status. Satu pembaruan spesifikasi (F-033 §2):
ambang pra-tes H-RES-05 kini ditetapkan sebagai keputusan
operator staging dari budget memori target (bukan rasio VM).
Handoff V11 BUKAN izin mengubah source.

### Reproducibility + ownership staging (handoff V11 butir 5 dan 7) — **blocked**

Reproducibility: lihat F-030 §2 di atas (proposal keputusan
selesai sebagai paket yang dapat diputuskan; HOLD).
Ownership staging: STAGE-P01..P12 dipertahankan lengkap
dengan prasyarat, prosedur/oracle/bukti yang harus dihasilkan
(desain §D.4.26 — tabel 12 baris). Semua peran tetap
**UNASSIGNED**; tidak ada nama owner yang dikarang. ST-12
tetap tidak PASS tanpa alert yang benar-benar diterima operator
(kriteria ST-12-LAT-01..03 dipertahankan).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

Tidak berubah: lokasi baris 52, 483, 1245 pada mirror `d85a1e2`;
cleanup tetap butuh edit source + otorisasi terpisah. Tidak ada
detail narasi insiden atau data wallet apa pun di dokumen revisi
ini.

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak berubah: status tetap "reported by Muse, not independently
verified"; bukti versi/diff live (a)–(c) tetap belum tersedia.

## §3. Response to Previous Handoff — status temuan V10 menurut audit V11 §3 (dicatat, bukan diklaim ulang)

Audit V11 §3 menilai sembilan permintaan Handoff V10. Status
independen itu dicatat di sini apa adanya; respons v2.3.18 atas
kekurangan yang dicatat V11 ada di §2 dan §4.

| # | Permintaan V10 | Respons v2.3.17 | Status audit V11 |
|---|---|---|---|
| 1 | Hilangkan alokasi encoder dari measured phase | `exp-pattern.ts` tidak lagi memanggil TextEncoder; byte dihitung aritmetik dari fixture | **ADDRESSED — VM harness** |
| 2 | Buktikan lifecycle pola B | Pemindaian dipindah ke `scanSegment()`; fungsi mengembalikan boolean/angka saja | **ADDRESSED — static review** |
| 3 | Rerun F-029 pada Bun 1.3.10 dan 1.4.4 | Dua log 60-run + byte variants diterbitkan | **ADDRESSED — VM evidence only** |
| 4 | Timeout E2E F-032 | Child dummy menggantung diuji melalui parent harness sebenarnya | **PARTIALLY ADDRESSED**; pemeriksaan PID menerima semua exception sebagai "mati" — lihat F-034. → **DIPERBAIKI v2.3.18 (F-034 §2): oracle ketat (hanya ESRCH = mati; EPERM = hidup; starttime `/proc`), E2E diulang, 12 PID mati via ESRCH, 12 == 12 diluncurkan.** |
| 5 | Pertahankan F-030/F-009 sebagai blocker | Tidak ada digest Bun/SDK atau clean builder baru | **ADDRESSED AS CARRY-FORWARD** |
| 6 | Pertahankan F-019/F-028 NOT VERIFIED | Tidak ada invocation `checkLink`; manifest deployment tetap kosong | **ADDRESSED AS CARRY-FORWARD** |
| 7 | Lengkapi owner staging | STAGE-P01..P12 memiliki prasyarat/prosedur/oracle; owner masih kosong | **PARTIALLY ADDRESSED**; operator, provider, egress, DB/runtime, alert recipient, dan rollback owner masih UNASSIGNED. → **Dipertahankan v2.3.18 (§4 butir 7): tetap UNASSIGNED, dicatat sebagai BLOCKED dengan prasyarat eksplisit.** |
| 8 | Pertahankan baseline security/provenance | F-001..F-005, F-006b/c, F-016..F-019, U-38/U-33 dan koreksi SU historis dibawa | **ADDRESSED AS CARRY-FORWARD**; bukan bukti staging. → **Dipertahankan v2.3.18 (§5).** |
| 9 | Tidak ada source implementation tanpa otorisasi terpisah | Tidak ada perubahan source/lockfile/DB/deployment | **ADDRESSED**. → **Dipertahankan v2.3.18 (diff hanya dokumen + harness + bukti; lihat §4 butir 9).** |

## §4. Jawaban atas Handoff V11 §11 (9 butir)

### Butir 1 — Perbaiki F-034 — oracle terminasi PID — **addressed**

Hanya ESRCH yang dihitung sebagai proses tidak ada. EPERM dan
semua exception lain menghasilkan FAIL (verdict `alive` /
`inconclusive` pada `classifyLiveness()`). PID divalidasi
sebagai positive safe integer (1..2^31−1); baris kosong,
malformed, duplikat, atau di luar rentang ditolak sebelum
assertion liveness. Raw log baru + tes regresi disertakan
(`test-pid-oracle-v2318.txt`, 30 assert PASS; E2E diulang,
`run-f032-timeout-e2e-v2318.txt`, 12 verdict `dead` via ESRCH).
Detail penuh: F-034 §2 di atas.

### Butir 2 — Perbaiki F-035 — file PID E2E — **addressed**

Path tetap `/tmp/f032-hang-child.pid` diganti direktori privat
per-run (`mkdtemp`, mode 0700, realpath + ownership divalidasi)
dan file PID mode 0600 yang dibuat eksklusif (`openSync "wx"`,
no-follow via O_EXCL). Cleanup di blok `finally`; invocation
paralel memakai direktori terpisah. Tes symlink pre-created,
dua driver paralel, cleanup, dan bukti target symlink tidak
berubah disertakan (`test-f035-pidfile-v2318.txt`, 25 assert
PASS). Detail penuh: F-035 §2 di atas.

### Butir 3 — Perketat U-72 — test seam child script — **addressed**

`F029_CHILD_SCRIPT` ditolak kecuali mode test eksplisit
(`F029_TEST_MODE=1`) aktif; realpath dibatasi ke fixture yang
disetujui (`exp-pattern.ts`, `hang-child.ts`); path di luar
direktori evidence atau symlink ditolak; override pada mode
benchmark normal gagal (exit 2). Tes bahwa path arbitrary
ditolak disertakan (`test-u72-seam-v2318.txt`, 15 assert PASS).
TIDAK ADA workflow CI yang ditambahkan — sesuai audit, tanpa
threat model tidak ada workflow yang mengeksekusi input PR tak
tepercaya. Detail penuh: U-72 §2 di atas.

### Butir 4 — Pertahankan hasil F-033 sebagai VM evidence saja — **addressed** (dipertahankan dengan benar)

Rasio 1,12–2,62× TIDAK diubah menjadi angka sizing/cgroup/
acceptance. Ambang pra-tes H-RES-05 ditetapkan di desain
§D.4.29 sebagai keputusan operator staging dari budget memori
target (runtime, kernel, cgroup, concurrency, konfigurasi yang
sama dengan target) — bukan diturunkan dari rasio VM. Pengukuran
staging tetap harus dilakukan pada staging yang benar-benar
tersedia. Detail penuh: F-033 §2 di atas.

### Butir 5 — Pertahankan F-030/F-009 sebagai blocker sampai clean builder tersedia — **addressed** (dipertahankan dengan benar)

Opsi A/B tetap proposal; tidak ada klaim reproducible. Digest
resmi Bun, provenance SDK, frozen install, typecheck, dan build
clean external tetap belum tersedia — tidak ada yang dikarang.
F-030 tetap CONFIRMED BLOCKER; F-009 tetap NOT REPRODUCIBLE.
Detail: F-030 §2 di atas.

### Butir 6 — Pertahankan F-019 dan F-028 NOT VERIFIED — **addressed** (dipertahankan dengan benar)

`checkLink` TIDAK di-invoke; tidak ada public share yang dibuat;
tidak ada perubahan runtime. Manifest deployment hanya berisi
template kosong — tidak ada field yang diisi tanpa bukti
artifact provider yang dapat ditelusuri (tidak ada — jadi
tetap kosong). Detail: F-019 §2 dan F-028 §2 di atas.

### Butir 7 — Lengkapi owner staging — **partially addressed** (tabel lengkap + prasyarat eksplisit; owner tetap UNASSIGNED karena tidak ada keputusan)

Tidak ada keputusan Rama/provider sejak v2.3.17, maka owner
tetap UNASSIGNED — dicatat sebagai BLOCKED, bukan diisi dengan
nama karangan. Prasyarat tiap peran dirumuskan eksplisit di
bawah; oracle PASS/FAIL STAGE-P01..P12 dipertahankan; ST-12
tidak PASS tanpa alert yang diterima operator.

| Peran | Status | Prasyarat penunjukan |
| --- | --- | --- |
| Staging operator | **UNASSIGNED — BLOCKED** | Rama menunjuk operator (nama + kanal kontak) yang dapat menjalankan ST-01..ST-12 dan menerima alert; tanpa operator, tidak ada run staging |
| Runtime provider | **UNASSIGNED — BLOCKED** | Provider menyatakan tertulis: versi/digest runtime artifact, scope `ctx.db` (F-018), dan asal tarball SDK (F-030) |
| Egress owner | **UNASSIGNED — BLOCKED** | Pemilik topologi egress (NAT64/DNS64, prefix, allowlist) ditetapkan; uji S-49/S-50 tidak dapat jalan tanpa ini |
| DB/runtime owner | **UNASSIGNED — BLOCKED** | Pemilik staging DB + runtime ditetapkan; uji H-CAT-01..03 + H-TEN-01..05 tidak dapat jalan tanpa ini |
| Alert channel / operator penerima | **UNASSIGNED — BLOCKED** | Kanal alert + operator penerima ditetapkan; ST-12 hanya PASS bila alert diterima operator ≤ 5 menit dengan isi lengkap (ST-12-LAT-01..03) |
| Rollback owner | **UNASSIGNED — BLOCKED** | Pemilik prosedur rollback ditetapkan; tanpa ini, tidak ada cutover yang dapat di-rollback |

STAGE-P01..P12 dipertahankan lengkap dengan prasyarat,
prosedur aman, PASS/FAIL oracle, dan bukti yang harus
dihasilkan (desain §D.4.26 — tabel 12 baris). Tidak ada gate
READY.

### Butir 8 — Pertahankan baseline keamanan/provenance — **addressed** (dipertahankan dengan benar)

F-001..F-005, F-006b/F-006c, F-016..F-019, U-38/U-33, dan
koreksi SU historis dibawa tanpa klaim penutupan dan tanpa
kenaikan ke PASS. SU-T5 TIDAK direkonstruksi. Detail: §1 dan
§5 di bawah.

### Butir 9 — Tidak ada source implementation tanpa otorisasi terpisah — **addressed** (dipatuhi)

v2.3.18 TIDAK mengubah satu pun file source aplikasi, lockfile,
database, deployment, atau live artifact. Diff revisi ini hanya:
dokumen desain + matriks ini + harness eksperimen
(`evidence/f029-memory-methodology/`,
`evidence/f032-harness-validation/`) + log mentah. Kebutuhan
teknis yang hanya bisa dibuktikan melalui source change diajukan
sebagai proposal perubahan terpisah di bawah ini (bukan sebagai
implementasi) — dibawa utuh dari matriks v2.3.16 §4 butir 8,
tanpa proposal baru:

| Proposal | File list | Rencana diff | Rollback | Test IDs | Dampak DB/runtime |
| --- | --- | --- | --- | --- | --- |
| P-1 (Opsi A, F-030) | `site/package.json` (`packageManager` → `bun@1.4.4`) | Satu baris + dokumentasi versi kanonik | Kembalikan `packageManager` ke `bun@1.3.10` | Frozen install + typecheck + build pada 1.4.4; H-RES-03/05 diulang pada 1.4.4 | Tidak ada dampak DB; runtime staging harus memakai 1.4.4; semua bukti VM 1.3.10 dibaca ulang sebagai bukti versi lama |
| P-2 (Opsi B, F-030) | `site/bun.lock` (regenerasi v1 di bawah 1.3.10) | Lockfile ditulis ulang v1; diff resolusi diperiksa paket-per-paket | Kembalikan `bun.lock` v2 ter-commit | Frozen install + typecheck + build dari lockfile hasil regenerasi; diff resolusi v1 vs v2 | Tidak ada dampak DB; tidak ada perubahan runtime |
| P-3 (SDK path, F-030) | `site/package.json` + `site/bun.lock` (dependensi `@hatch/space-sdk`) | Ganti `file:/opt/hatch/...` dengan artefak SDK vendorkan berdigest (rekomendasi) / paket ter-publish berversi / sumber resmi | Kembalikan ke path lama (hanya di VM ini) | Frozen install + typecheck dari clean builder tanpa `/opt/hatch` | Tidak ada dampak DB; builder harus dapat mengambil SDK tanpa `/opt/hatch` |

Ketiga proposal tetap **HOLD** — masing-masing butuh keputusan
owner (G-G untuk P-1/P-2; owner + runtime provider untuk P-3)
dan otorisasi tahap (b) terpisah sebelum dieksekusi. Digest
rilis Bun 1.4.4 dan atestasi provider atas SDK harus tersedia
pada saat keputusan (saat ini NOT PROVIDED).

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.18)

| ID | Status v2.3.18 | Inti |
| --- | --- | --- |
| U-38 | Dijawab v2.3.6 (pidfd), residual U-41 | Tidak berubah. |
| U-33 | Dijawab v2.3.6 (katalog kontrol), residual U-43/U-44 | Tidak berubah. |
| U-41 | Terbuka (terkuantifikasi) | Tidak berubah; STAGE-P08 memberi oracle PASS ≤ 1e-6. |
| U-43 | Terbuka (root sengaja menghapus lock — hanya audit + runbook) | Tidak berubah; STAGE-P12 memberi oracle bukti audit. |
| U-44 | Terbuka (ro-bind-mount bukan default deployment) | Tidak berubah. |
| U-45 | Terbuka (latensi deteksi) | Tidak berubah; STAGE-P11 + ST-12-LAT-01..03 memberi oracle latensi. |
| U-46 | Terbuka — keputusan owner belum ada | Tidak berubah; opsi (a)/(b) tetap terbuka; implementasi pensinyalan tetap DIBLOKIR; STAGE-P07 memberi prasyarat keputusan. |
| U-59..U-62 | Dipertahankan (U-62 dipersempit v2.3.14) | Tidak berubah. |
| U-63 | Terbuka (F-026 — transient chunk) | Tidak berubah. |
| U-64 | **DIPERBARUI v2.3.17** (F-027/F-029/F-033) | Rasio 4,5–5,4× DICABUT; rasio terukur ulang de-confounded 1,12–2,62× (v2.3.17, preflight terpisah + lifecycle eksplisit); rentang 1,13–1,84× v2.3.16 SUPERSEDED; aturan desain (larangan materialisasi + incremental) tetap; H-RES-05 diperbarui (kedua mode GC + fixture v2.3.17). |
| U-65 | Terbuka (F-028 — provenance deployment) | Tidak berubah. |
| U-66 | **DIPERBARUI v2.3.15** (F-009/F-030) | Matriks kompatibilitas + trade-off Opsi A/B + penggantian SDK path dirumuskan (PROPOSAL — HOLD); F-009 tetap NOT REPRODUCIBLE. |
| U-67 | **DIPERBARUI v2.3.17** (F-029/F-033) | Rasio incremental v2.3.14 tidak valid; manfaat terukur ulang 1,12–2,62× dan bergantung GC (forced 1,69–2,62× vs natural 1,12–1,30×); angka forced-GC bukan perilaku runtime natural; rasio VM bukan acceptance staging. Penanganan: H-RES-05 staging (gate G-I) dengan ambang pra-tes + kedua mode GC + fixture v2.3.17. **DIPERBARUI v2.3.18:** ambang pra-tes H-RES-05 kini ditetapkan eksplisit sebagai keputusan operator staging dari budget memori target (bukan rasio VM). |
| U-68 | **DIPERBARUI v2.3.16** (F-009/F-030) | Lockfile v2 vs Bun kanonik + SDK path absolut; proposal keputusan selesai sebagai paket yang dapat diputuskan (§D.4.27 — rekomendasi Opsi A + SDK vendorkan, fallback Opsi B); digest rilis Bun 1.4.4 + atestasi provider atas SDK tetap NOT PROVIDED; build penuh NOT RUN; dependency digest NOT VERIFIED. Penanganan: keputusan owner G-G + bukti clean-builder (gate G-J). |
| U-69 | **DIPERBARUI v2.3.16** (F-031) | Klaim batas byte fixture v2.3.15 tidak tepat (ASCII 999.981, non-ASCII byte-matched 999.901); rasio v2.3.15 (1,18–1,88×) superseded oleh 1,13–1,84×. **DIPERBARUI v2.3.17:** bukti byte kini diperkuat preflight terpisah (61 checks, independen dari measured process); rasio 1,13–1,84× sendiri dinyatakan SUPERSEDED oleh 1,12–2,62× (F-033). Penanganan: fixture v2.3.17 (preflight + lifecycle eksplisit) untuk H-RES-05 staging (gate G-I); jangan kutip angka v2.3.15/v2.3.16 sebagai pengukuran batas eksak. |
| U-70 | **DIPERBARUI v2.3.18** (F-032/F-034/F-035) | Parent harness dapat melaporkan sukses dengan nol run (false green); jalur timeout child belum diuji end-to-end. **DIPERBAIKI v2.3.16:** validasi `--runs` + assertion record + timeout child; tes regresi negatif 7 kasus exit 2. **DIPERBAIKI v2.3.17:** timeout TERBUKTI end-to-end (12 child gantung, ke-12 PID terverifikasi mati, exit 1, tanpa success line — log `run-f032-timeout-e2e.txt`); tes regresi negatif diulang pada harness baru. **DIPERBARUI v2.3.18:** oracle terminasi DIPERKETAT (hanya ESRCH = mati; EPERM = hidup; identitas via starttime `/proc` — F-034) + file PID pindah ke direktori privat per-run (F-035); E2E diulang (log `run-f032-timeout-e2e-v2318.txt`, 12 PID mati via ESRCH, 12 == 12 diluncurkan). Sisa risiko kini adalah seam yang diperketat (U-72). Penanganan: harness v2.3.18 adalah oracle untuk rerun apa pun. |
| U-71 | **BARU v2.3.17** (F-033) | Instrumen pengukuran A/B v2.3.16 terkonfounded (encoder sementara + `segLower` hidup melewati GC pola B); rasio 1,13–1,84× superseded; hipotesis arah V10 (rasio lama melebih-lebihkan manfaat) TIDAK terkonfirmasi pada sel forced-GC — confound `segLower` lebih besar daripada transient encoder. Penanganan: harness v2.3.17 (preflight terpisah + lifecycle eksplisit) untuk H-RES-05 staging; rasio 1,12–2,62× tetap HANYA bukti VM, status operasional NOT VERIFIED sampai review independen. |
| U-72 | **DIPERBARUI v2.3.18** (F-032 — seam diperketat) | Test seam `F029_CHILD_SCRIPT` / `F029_CHILD_TIMEOUT_MS` adalah permukaan override baru di harness: run dengan seam aktif dapat disalahartikan sebagai run produksi. **DIPERBAIKI v2.3.18:** override hanya dihormati bila `F029_TEST_MODE=1` eksplisit; script child harus realpath ke fixture yang disetujui; path yang diberikan tidak boleh berupa symlink; selain itu exit 2 sebelum child mana pun di-spawn (tes regresi `test-u72-seam.ts`, 15 assert PASS, log `test-u72-seam-v2318.txt`). Sisa risiko: operator yang SENGAJA menyetel `F029_TEST_MODE=1` dengan fixture yang disetujui lalu mengklaim run itu sebagai run produksi — dimitigasi baris log `test-seam:` eksplisit; reviewer WAJIB memeriksanya. Penanganan: perilaku default tidak berubah; seam hanya dipakai driver E2E yang terdokumentasi. |
| U-73 | **BARU v2.3.18** (F-034) | Oracle terminasi PID v2.3.17 menerima semua exception sebagai "mati" (catch-all tanpa cek `error.code`); PID file di-parse dengan `Number(...)` tanpa validasi — EPERM/EINVAL atau PID malformed dapat false-pass assertion "semua child terminated". Penanganan: modul ketat `pid-oracle.ts` (hanya ESRCH = mati; EPERM = hidup; lainnya inconclusive; parsing ketat; identitas via starttime `/proc`); tes regresi 30 assert PASS; E2E diulang dengan oracle baru. Log v2.3.17 dipertahankan sebagai bukti historis; klaim yang mengikat bersandar pada log v2.3.18. |
| U-74 | **BARU v2.3.18** (F-035) | File PID E2E v2.3.17 memakai path tetap `/tmp/f032-hang-child.pid` — rentan symlink/TOCTOU pada host multi-user dan dua invocation paralel dapat saling menghapus/mencampur PID. Penanganan: direktori privat per-run (`mkdtemp`, 0700) + file PID eksklusif (`openSync "wx"`, 0600) + validasi `lstat` di child + cleanup `finally`; tes regresi 25 assert PASS (symlink di path lama tak tersentuh, dua driver paralel aman). Pola path tetap tidak boleh dipakai lagi untuk pengujian harness. |

## §6. Hard gates — ditegaskan kembali (v2.3.18)

- No Link Scanner activation.
- No public deployment.
- No production build (house rules: tidak ada `bun run build` dari `site/`).
- No DB/catalog change.
- No source implementation tanpa owner approval terpisah (HOLD perubahan source mirror sampai klarifikasi F-020 tetap berlaku).
- No production testing (termasuk tidak memanggil `checkLink`).
- F-001..F-005, F-016/F-017/F-022, F-018 tetap OPEN/BLOCKED.
- Penutupan F-001 butuh H-SSRF-01..20 terhadap implementasi aktual di staging terisolasi + log mentah + review independen — hasil VM saja tidak cukup.
- Penutupan F-029 sebagai klaim kuantitatif butuh H-RES-05 PASS di staging (ambang pra-tes yang ditetapkan operator staging dari budget memori target + kedua mode GC + fixture v2.3.17) — hasil VM v2.3.17 hanya memperbaiki instrumen dan metodologi, bukan membuktikan kapasitas staging.
- Penutupan F-030 butuh keputusan owner G-G + penggantian SDK path + bukti clean-builder (gate G-J).
- Penutupan F-033 sebagai angka operasional butuh review independen atas paket v2.3.17 (audit V11) — rasio 1,12–2,62× sampai saat itu tetap NOT VERIFIED FOR CAPACITY/SIZING. Audit V11 §4.3 menegaskan batas yang sama.
- Penutupan F-034/F-035 sebagai klaim harness butuh review independen atas paket v2.3.18 (audit V12) — oracle ketat + direktori privat adalah bukti VM, bukan staging.

## §7. Yang butuh keputusan Rama (pemilik proyek)

| # | Keputusan | Konteks | Dampak bila belum diputuskan |
| --- | --- | --- | --- |
| 1 | Scope perubahan source (F-020, G-A) | 3 pertanyaan scope matriks v2.3.11 §6 | HOLD perubahan source tetap berlaku; tidak ada pekerjaan tahap (b) |
| 2 | Tenancy F-018 (G-C) | Pernyataan resmi provider tentang scope `ctx.db` (per-user vs shared) | Desain ownership + H-TEN-01..05 tidak dapat dieksekusi |
| 3 | U-46 (G-D) | Opsi (a) terima fallback numeric-kill terkuantifikasi vs opsi (b) larangan mutlak | Implementasi pensinyalan worker tetap DIBLOKIR |
| 4 | Cache F-022 (G-F) | Cabang pilihan (hapus cache dari semua jalur security-scan, rekomendasi) vs alternatif (6 syarat) | Implementasi cache tidak dapat dimulai |
| 5 | Bun kanonik F-009/F-030 (G-G) | Rekomendasi Opsi A (naikkan kanonik ke 1.4.4) + SDK vendorkan berdigest vs fallback Opsi B (regenerasi lockfile v1) — paket keputusan lengkap di §2 F-030 (v2.3.16); digest rilis Bun 1.4.4 + atestasi provider atas SDK harus diisi pada saat keputusan | Reproducible build tetap NOT VERIFIED; clean builder tetap gagal (gate G-J) |
| 6 | Staging (G-E) | Environment + penunjukan staging operator, runtime provider, egress owner, DB/runtime owner, alert channel/operator penerima, rollback owner | STAGE-P01..P12 tetap BLOCKED; tidak ada validasi staging |
| 7 | Otorisasi implementasi tahap (b) | Persetujuan eksplisit terpisah untuk setiap perubahan source (termasuk proposal P-1/P-2/P-3 di §4 butir 9) | Semua remediasi source tetap desain saja |

## §8. Yang TIDAK diklaim v2.3.18

- v2.3.18 TIDAK mengklaim rasio penghematan incremental apa pun sebagai acceptance staging — rasio 1,12–2,62× adalah bukti VM atas pola simulasi dengan instrumen de-confounded, bukan kapasitas operasional.
- v2.3.18 TIDAK mengklaim rentang rasio v2.3.16 (1,13–1,84×) direproduksi — rentang itu dinyatakan SUPERSEDED oleh pengukuran ulang 1,12–2,62×.
- v2.3.18 TIDAK mengklaim F-029 tertutup sebagai bukti staging — yang tertutup adalah instrumen, metodologi VM, lifecycle pola B, dan validasi harness; H-RES-05 staging tetap harus dijalankan dan lolos (dengan ambang pra-tes yang ditetapkan operator staging).
- v2.3.18 TIDAK mengklaim F-030 selesai — proposal keputusan TIDAK mengubah status blocker; F-030 tetap CONFIRMED BLOCKER dan F-009 tetap NOT REPRODUCIBLE.
- v2.3.18 TIDAK mengklaim versi live, approval deployment, atau status runtime apa pun — F-028 tetap NOT VERIFIED, F-019 tetap BLOCKED.
- v2.3.18 TIDAK mengklaim staging tersedia atau owner staging terisi — semua peran tetap UNASSIGNED.
- v2.3.18 TIDAK mengklaim EPERM hidup pernah diamati di VM ini — VM berjalan sebagai root sehingga `kill(1,0)` berhasil; aturan EPERM→FAIL dibuktikan oleh kasus stub injeksi pada `test-pid-oracle.ts`, bukan oleh proses hidup. Ini dicatat di log dan di §2 F-034, bukan dipalsukan.
- v2.3.18 TIDAK mengubah satu pun file source aplikasi, lockfile, database/katalog, atau live artifact.

## §9. Gate konkret berikutnya (v2.3.18 → v2.3.19)

- **(G-A)** keputusan owner atas scope perubahan source (F-020).
- **(G-B)** bukti runtime F-019 (versi/digest + kontrol disabled (a)–(e)).
- **(G-C)** keputusan tenancy F-018 (pernyataan resmi provider tentang scope `ctx.db`).
- **(G-D)** keputusan U-46.
- **(G-E)** staging tersedia + peran UNASSIGNED terisi.
- **(G-F)** keputusan cache F-022 — owner menerima cabang pilihan (rekomendasi) vs alternatif.
- **(G-G)** keputusan Bun F-009 — kanonik 1.3.10 vs 1.4.4 (dengan rekomendasi Opsi A + SDK vendorkan vs fallback Opsi B, §2 F-030 v2.3.16).
- **(G-H)** eksekusi harness H-RES-02/03/05 yang sudah dikoreksi — prasyarat: otorisasi implementasi tahap (b) (G-A) + staging tersedia (G-E) + verifikasi ulang perilaku Bun pada versi kanonik (U-62, bagian staging).
- **(G-I)** stress test memori H-RES-03/05 pada staging (chunk > cap, 3 script paralel, fixture batas 1.000.000 + varian cap−1/cap+1 + non-ASCII byte-matched terukur eksak, high-water RSS/VmHWM ≤ ambang pra-tes yang ditetapkan operator staging dari budget memori target, kedua mode GC) + proses deployment manifest terisi untuk setiap deployment (F-028).
- **(G-J)** keputusan reproduksibilitas F-030 — prasyarat: keputusan owner G-G (Opsi A vs Opsi B) + penggantian SDK path (paket ter-publish/vendorkan/sumber resmi) + bukti clean-builder (frozen install + typecheck + build exit 0, lockfile tidak berubah, dependency digest tercatat, tanpa `/opt/hatch`).

Pemicu revisi v2.3.19: keputusan owner atas G-A/G-C/G-D/G-F/G-G,
ATAU bukti runtime G-B, ATAU staging tersedia (G-E), ATAU audit
independen V12 — mana pun yang datang dulu. Tidak ada revisi baru
yang hanya mengulang status v2.3.18.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | VM berjalan sebagai root (uid 0) — EPERM hidup tidak dapat diproduksi (`kill(1,0)` berhasil) | Aturan EPERM→FAIL dibuktikan oleh kasus stub injeksi deterministik pada `test-pid-oracle.ts` (kasus 17), bukan oleh proses hidup; keterbatasan ini dicatat jujur di log tes dan di §2 F-034 | Bila harness kelak dijalankan sebagai non-root, tambahkan kasus EPERM hidup (mis. `kill(1,0)` sebagai non-root) ke `test-pid-oracle.ts`; sampai saat itu, klaim EPERM bersandar pada stub |
| 2 | Kasus penerimaan U-72 (fixture disetujui + timeout 100 ms) membutuhkan `$F032_PID_FILE` yang valid — `hang-child.ts` v2.3.18 menolak append tanpa file PID yang lolos validasi `lstat` | Draf pertama tes tidak menyetel `F032_PID_FILE`; ditangkap saat penulisan tes (sebelum satu pun run) — tes membuat file PID mode 0600 terlebih dahulu dan menyetel env var-nya | Pola ini didokumentasikan di header `test-u72-seam.ts`; driver E2E menyetel `F032_PID_FILE` ke file di direktori privatnya |
| 3 | Edit §D.4.29 pertama kali mengenai lokasi yang salah di `SSRF_REMEDIATION_DESIGN.md` (teks hard-gates berulang di tiap revisi; edit tool mengganti kemunculan pertama — akhir §D.4.23, bukan akhir §D.4.28) | Terdeteksi via `grep` (D.4.29 muncul di baris 4925, sebelum D.4.24); blok dipindahkan dengan skrip ke akhir §D.4.28 (baris 6319) dan penempatan diverifikasi (D.4.28 → D.4.29 → `## E.`); situs pemindahan diperiksa utuh | Untuk dokumen ini, sisipan bagian baru WAJIB memakai anchor unik (judul bagian + baris berikut yang unik) atau skrip berbasis nomor baris — jangan mengandalkan teks yang berulang |
| 4 | Eksperimen memori F-029 (120 run) tidak diulang | Child terukur dan metodologi byte tidak berubah di v2.3.18; pengulangan tidak dibenarkan protokol butir 6; kontrol positif `--runs 1` pada harness baru membuktikan jalur default tetap bekerja | Bila `exp-pattern.ts`/`fixture.ts`/`preflight-fixture.ts` berubah, rerun penuh dibenarkan dan wajib dijelaskan |

## §11. What materially changed (v2.3.17 → v2.3.18) + peta kepatuhan brief eksekusi

Bagian ini memenuhi format respons yang diminta
`MUSE_EXECUTION_BRIEF_2026-11-08.md` (commit `8441aec`) untuk
commit Muse berikutnya. Butir 1 brief (tutup F-034/F-035/U-72)
dikerjakan penuh di revisi ini; butir 3 brief (tabel readiness
staging) dijawab dengan file baru `STAGING_READINESS_V2318.md`;
butir 2 brief (proposal remediasi F-001..F-005 yang
implementation-ready) BELUM dikerjakan di revisi ini — ia
membutuhkan verifikasi baris-per-baris terhadap `main` saat ini
dan penulisan pseudodiff + test matrix tersendiri, dan dicatat
di sini sebagai pekerjaan berikutnya yang eksplisit (lihat
peta di bawah), bukan disembunyikan sebagai "selesai".

**Yang berubah secara material (bukan pengulangan status):**

- **F-034 (baru, diperbaiki):** oracle terminasi PID diganti
  modul ketat `pid-oracle.ts` — hanya ESRCH = mati; EPERM =
  hidup; EINVAL/lainnya = inconclusive; parsing file PID ketat;
  identitas PID via starttime `/proc`. Tes regresi baru 30
  assert PASS; E2E diulang (12 PID mati via ESRCH, 12 == 12).
- **F-035 (baru, diperbaiki):** file PID pindah dari path tetap
  `/tmp/f032-hang-child.pid` ke direktori privat per-run
  (`mkdtemp` 0700) + file eksklusif (0600) + cleanup `finally`.
  Tes regresi baru 25 assert PASS (symlink tak tersentuh, dua
  driver paralel aman).
- **U-72 (diperketat):** seam kini di-gate `F029_TEST_MODE=1`
  eksplisit + allowlist realpath + tolak symlink. Tes regresi
  baru 15 assert PASS. TIDAK ADA workflow CI yang ditambahkan.
- **F-033 (dipertahankan + ambang ditetapkan):** rasio 1,12–2,62×
  tetap bukti VM; ambang pra-tes H-RES-05 kini ditetapkan
  eksplisit sebagai keputusan operator staging (bukan rasio VM).
  Eksperimen F-029 TIDAK diulang (tidak dibenarkan protokol
  butir 6 — child terukur + metodologi tidak berubah).
- **Staging readiness (baru):** `STAGING_READINESS_V2318.md`
  (1 halaman, 8 baris — semua UNASSIGNED / BLOCKED / NOT
  PROVIDED; tidak ada nama yang dikarang).
- **Yang TIDAK berubah:** F-001..F-005, F-006b/c, F-016..F-019,
  F-028, F-030/F-009, U-38/U-33/U-41/U-43/U-44/U-45/U-46 —
  semua dipertahankan tanpa perubahan status; tidak ada file
  source/lockfile/DB/deployment yang diubah; `checkLink` tidak
  di-invoke; Link Scanner tetap nonaktif.

**Peta kepatuhan brief eksekusi — satu baris per item yang
diminta brief (status, lokasi, bukti, kriteria, risiko):**

| Item brief | Status | Lokasi di revisi ini | Bukti (commit SHA / test / log) | Kriteria lolos / belum lolos | Risiko tersisa + aksi berikutnya |
| --- | --- | --- | --- | --- | --- |
| F-034 | ADDRESSED | Matriks §2 F-034; desain §D.4.29 | `pid-oracle.ts` `4d36b47e…`; `test-pid-oracle-v2318.txt` `4cc0d407…` (30 assert PASS); `run-f032-timeout-e2e-v2318.txt` `00d23aa5…` | Lolos: ESRCH-only, EPERM/EINVAL tidak bisa PASS, parsing ketat, 12 == 12. Belum: review independen V12 atas paket ini | U-73; audit V12 |
| F-035 | ADDRESSED | Matriks §2 F-035; desain §D.4.29 | `run-f032-timeout-e2e.ts` `55be5478…`; `test-f035-pidfile-v2318.txt` `937ed445…` (25 assert PASS) | Lolos: symlink tak tersentuh, paralel aman, cleanup terverifikasi. Belum: review independen V12 | U-74; audit V12 |
| U-72 | ADDRESSED | Matriks §2 U-72; desain §D.4.29 | `run-f029.ts` `df7cd6c6…`; `test-u72-seam-v2318.txt` `cefadfdd…` (15 assert PASS) | Lolos: override ditolak tanpa test mode, path arbitrer/symlink ditolak, fixture disetujui diterima. Belum: review independen V12; tidak ada workflow CI (sesuai brief) | U-72 (sisa: operator sengaja menyetel test mode); audit V12 |
| F-001 | BLOCKED | Matriks §1 + §2 (F-001..F-005); desain §D.4.29 | Tidak ada test/log baru (desain saja); proposal implementation-ready BELUM ditulis | Belum: proposal butir 2 brief belum ada; implementasi menunggu otorisasi tahap (b) | Proposal F-001..F-005 (pekerjaan berikutnya); keputusan G-A |
| F-002 | BLOCKED | Matriks §1 + §2; desain §D.4.29 | Tidak ada test/log baru; ambang pra-tes H-RES-05 ditetapkan (keputusan operator staging) | Belum: proposal butir 2 brief belum ada; H-RES-05 staging belum dijalankan | Proposal F-001..F-005; gate G-I |
| F-003 | BLOCKED | Matriks §1 + §2; desain §D.4.29 | Tidak ada test/log baru | Belum: proposal butir 2 brief belum ada; H-RES-06 staging belum dijalankan | Proposal F-001..F-005; gate G-I |
| F-004 | BLOCKED | Matriks §1 + §2; desain §D.4.29 | Tidak ada test/log baru | Belum: proposal butir 2 brief belum ada; migrasi DB menunggu otorisasi | Proposal F-001..F-005; keputusan G-A |
| F-005 | BLOCKED | Matriks §1 + §2; desain §D.4.29 | Tidak ada test/log baru | Belum: proposal butir 2 brief belum ada; bukti auth/tenancy belum ada | Proposal F-001..F-005; keputusan G-C |
| F-019 | BLOCKED (NOT VERIFIED) | Matriks §1 + §2 F-019; desain §D.4.29 | Tidak ada test/log baru; `checkLink` TIDAK di-invoke | Belum: kontrol (a)–(e) belum satu pun terpenuhi | Bukti runtime G-B; deployment tetap BLOCKED |
| F-028 | PARTIALLY ADDRESSED (NOT VERIFIED) | Matriks §1 + §2 F-028; desain §D.4.29 | Tidak ada test/log baru; template manifest tetap kosong | Belum: manifest terisi dari provider belum ada | Manifest per deployment; gate G-I |
| Staging ownership | BLOCKED (UNASSIGNED) | Matriks §4 butir 7; `STAGING_READINESS_V2318.md` (baru) | Tabel 8 baris; semua UNASSIGNED / BLOCKED / NOT PROVIDED | Lolos: tabel 1 halaman tersedia, tanpa nama karangan. Belum: keenam peran belum ditunjuk; bukti baris 7–8 belum ada | Penunjukan peran oleh Rama/provider; gate G-E |
