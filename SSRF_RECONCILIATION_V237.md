# Rekonsiliasi Bukti v2.3.7 — Pemetaan Evaluasi ChatGPT (ST-01..ST-12, SU-T1..SU-T9, U-38/U-33) ke Bukti v2.3.6 yang Sudah Ada

- **Tanggal:** 7 November 2026 — **Revisi v2.3.7 (rekonsiliasi bukti)**
- **Status dokumen:** DESIGN REVIEW ONLY — **IMPLEMENTATION NOT APPROVED**. Dokumen ini adalah pemetaan bukti, bukan persetujuan implementasi dan bukan hasil pengujian baru.
- **Sumber yang direkonsiliasi:**
  - Evaluasi: `SSRF_EVALUATION_V235.md` (commit `39ea4ef`, 280 baris; judul di dalamnya "SSRF Evaluation v2.3.6") — berisi matriks staging ST-01..ST-12, §6.1 SU-T1..SU-T9, §5 matriks risiko U-38-A..D dan U-33-A..F, §7 evidence register, §8 risiko yang tidak dapat dihilangkan.
  - Desain: `SSRF_REMEDIATION_DESIGN.md` v2.3.6 (commit `fc798ce`) — terutama §A.5.5.2a (pidfd), §A.5.5.4g (kontrol operasional), §D.4.14, §D.4.15 (STAGE-P01..P12), §G (U-41..U-44), §H (gerbang).
  - Bukti: `SSRF_SPIKE_V236.md` + `spike-harness-v236/` (PIDFD-T1..T12, OPS-T1..T7, SU-T1..SU-T9 9/9 × 4); konteks `SSRF_SPIKE_V235.md`, `SSRF_SPIKE_V234.md`, `SSRF_SPIKE_V233.md`, `SSRF_SPIKE_V232.md`.
- **Prinsip v2.3.7:** TIDAK ADA pengujian yang diulang. Setiap gate/prasyarat yang sudah terbukti di v2.3.6 dikutip dengan referensi file/bagian/ID tes yang dapat dilacak. Hanya hal yang benar-benar belum ada buktinya yang masuk daftar kekurangan (§6). Tidak ada kode aplikasi live artifact (slug `cek-link-airdrop`) yang diubah, tidak ada database/katalog yang diubah, tidak ada production build, Link Scanner tetap NONAKTIF.

## §0 Koreksi kejujuran — apa yang salah pada evaluasi, dan apa yang diperbaiki v2.3.7

Evaluasi ChatGPT (`SSRF_EVALUATION_V235.md`) ditulis **tanpa mereferensikan bukti v2.3.6**, padahal bukti itu sudah ada di repo (commit `fc798ce`) sebelum evaluasi di-commit (`39ea4ef`). Tiga cacat keterlacakan yang dicatat secara eksplisit di sini:

1. **Nama file vs isi tidak cocok.** File bernama `SSRF_EVALUATION_V235.md` tetapi judul di dalamnya "SSRF Evaluation v2.3.6". Nama file menyiratkan evaluasi atas v2.3.5, isinya mengklaim mengevaluasi v2.3.6 — tanpa pernah mengutip satu pun file bukti v2.3.6 (`SSRF_SPIKE_V236.md` tidak muncul di §7 evidence register-nya).
2. **Status NOT RUN sudah kedaluwarsa saat ditulis.** §6.1 menyatakan SU-T1..SU-T9 "NOT RUN in this review" dan §7 mencatat eksperimen pidfd "NOT RUN". Faktanya SU-T1..SU-T9 sudah dijalankan 9/9 PASS sejak v2.3.2 (`SSRF_SPIKE_V232.md`, RUN=1..3), diulang 9/9 × 2 terhadap kode yang diperkeras di v2.3.3 (`SSRF_SPIKE_V233.md`), dan diulang lagi 9/9 × 4 di v2.3.6 (`SSRF_SPIKE_V236.md` §0.1 + `spike-harness-v236/su-run1.log` s.d. `su-run4.log`). Eksperimen pidfd sudah dijalankan lengkap di v2.3.6 (PIDFD-T1..T12, `spike-harness-v236/pidfd-run1.log`, `pidfd-run2.log`, `pidfd-node-run1.log` s.d. `pidfd-node-run3.log`). Evaluasi §6.1 sendiri mensyaratkan perubahan status "hanya dengan referensi bukti yang dapat dilacak dan konfirmasi reviewer" — syarat itu dipenuhi dokumen ini (§3), bukan dengan mengklaim ulang.
3. **Risiko U-38/U-33 ditulis seolah belum dijawab.** Evaluasi §5 menyajikan U-38-A..D dan U-33-A..F sebagai risiko terbuka tanpa memetakan ke jawaban v2.3.6 (pidfd §A.5.5.2a, kontrol operasional §A.5.5.4g, risiko residual U-41..U-44). Pemetaan itu dilakukan di §5 dokumen ini: sebagian risiko evaluasi SUDAH dijawab/dikurangi oleh bukti v2.3.6, sebagian tetap terbuka, dan dua risiko benar-benar baru (U-45, U-46).

**Yang v2.3.7 TIDAK lakukan:** v2.3.7 tidak mengubah satu pun kesimpulan evaluasi tentang apa yang harus dibuktikan di staging. Semua prasyarat staging (runtime produksi, filesystem produksi, supervisor produksi, NFS bila relevan, auditd) TETAP wajib dan TETAP belum terbukti — lihat §6. Yang diperbaiki hanyalah status bukti VM: pekerjaan yang sudah selesai tidak boleh ditulis ulang sebagai "belum dikerjakan".

---

## §1 Matriks rekonsiliasi ST-01..ST-12

Legenda status:
- **TERBUKTI (VM)** — kriteria PASS evaluasi terpenuhi oleh bukti v2.3.6 di VM ini; yang tersisa hanyalah pengulangan di staging bila evaluasi mensyaratkannya secara eksplisit (dicatat per baris).
- **SEBAGIAN** — sebagian kriteria terbukti di VM, sebagian hanya dapat dibuktikan di staging.
- **BELUM** — tidak ada bukti sama sekali di VM ini; wajib di staging.

| Gate | Persyaratan evaluasi (ringkas) | Bukti v2.3.6 yang sudah ada | Status | Sisa yang wajib dibuktikan & di mana |
| --- | --- | --- | --- | --- |
| **ST-01** Runtime artifact | Runtime artifact produksi teridentifikasi: digest, versi Bun, kernel, ketersediaan pidfd di sandbox artifact; perilaku VM CLI ≠ bukti artifact | **Tidak ada.** Bukti v2.3.6 semuanya dari Bun CLI 1.4.4 di VM ini (`SSRF_SPIKE_V236.md` §0, §6). Desain §D.4.15 STAGE-P01 merumuskan prasyarat ini tetapi tidak membuktikannya | **BELUM** | Seluruhnya — staging: identifikasi artifact produksi (digest + versi Bun + kernel + pidfd di sandbox). Kriteria PASS/FAIL: STAGE-P01 (§D.4.15 desain v2.3.6). |
| **ST-02** bun:ffi | `bun:ffi` tersedia di sandbox setara produksi; simbol & prototipe yang dipakai implementasi sudah benar; perilaku fallback bila tidak tersedia | **Mekanisme TERBUKTI di VM:** PIDFD-T8 — binding `bun:ffi` ke `pidfd_open`/`pidfd_send_signal`/`__errno_location` bekerja di Bun 1.4.4, 5/5 PASS × 3 run (`SSRF_SPIKE_V236.md` §3.2; `spike-harness-v236/pidfd-node-run1.log` s.d. `pidfd-node-run3.log`; harness `pidfd-lib.mjs`). **Yang belum:** ketersediaan di sandbox produksi, dan review simbol/prototipe terhadap implementasi produksi (implementasi belum ada — desain saja) | **SEBAGIAN** | Sandbox produksi (ketersediaan `bun:ffi`) + review implementasi saat kode ditulis. Kriteria: STAGE-P01 (bagian FFI). |
| **ST-03** pidfd | Pensinyalan terikat identitas via pidfd terbukti; jalur fallback bila pidfd tidak tersedia | **TERBUKTI di VM, lengkap:** PIDFD-T1..T12 (`SSRF_SPIKE_V236.md` §3.1–§3.6; log `pidfd-run1.log`, `pidfd-run2.log`, `pidfd-node-run1..3.log`): T1 open+kill terikat identitas 7/7 × 2; T2 reuse PID 461 setelah 7.871 spawn — `pidfd_send_signal` → ESRCH, decoy hidup; T3 kill-by-number SETELAH reuse membunuh decoy (membuktikan race itu NYATA); T4 zombie; T5 PID tidak ada → ESRCH; T6 PID 1; T7 flag buruk → EINVAL; T8 `bun:ffi` 5/5 × 3; T9 jendela reuse p99 ~43 µs (Python) / ~46 µs (Node), P ≈ 7e-9/cleanup pada pid_max default; T10 pinning dirfd `/proc/<pid>` DITOLAK eksperimen (4/4 × 2 — symlink `/proc/self/fd` mengikuti PID baru); T11 pidAlive zombie-aware 5/5; T12a–d urutan mengikat 4/4 × 2 | **SEBAGIAN** | Mekanisme VM selesai. **Pengulangan di sandbox setara produksi tetap wajib** (kriteria STAGE-P07) — VM tidak membuktikan syscall tersedia di sandbox artifact. |
| **ST-04** Lock filesystem | Filesystem direktori lock produksi teridentifikasi (tipe, mount, opsi) | **Tipe lokal TERBUKTI, produksi BELUM:** FLK-T1..T8 — semantik flock teruji 9/9 × 2 di tmpfs DAN 9/9 × 2 di overlay (`SSRF_SPIKE_V234.md` §5; diregresi di `SSRF_SPIKE_V235.md` §5); OPS-T1..T6 di tmpfs (`SSRF_SPIKE_V236.md` §4.1). Filesystem produksi TIDAK diketahui dari VM ini | **SEBAGIAN** | Identifikasi filesystem produksi + pengulangan FLK/OPS di atasnya (kriteria STAGE-P02). Bila produksi memakai NFS → ST-09. |
| **ST-05** flock semantics | Semantik flock kernel pada filesystem produksi terbukti (bukan asumsi POSIX) | **TERBUKTI di VM pada dua fs:** FLK-T1..T8 9/9 × 2 tmpfs + 9/9 × 2 overlay (`SSRF_SPIKE_V234.md` §5; regresi `SSRF_SPIKE_V235.md` §5); ADV-T2/T2sim/T5/T6 4/4 × 2 membuktikan perbaikan flock menutup race reklamasi (`SSRF_SPIKE_V234.md` §4); AUTH suite 18/18 × 2 (`SSRF_SPIKE_V235.md` §4) | **SEBAGIAN** | Mekanisme VM selesai. **Pengulangan di filesystem produksi tetap wajib** (kriteria STAGE-P02). |
| **ST-06** /proc | `/proc` tersedia & dapat dibaca di runtime produksi (termasuk namespace/mount) | **TERBUKTI di VM:** seluruh suite identitas berbasis `/proc` berjalan di VM ini (SU-T2 starttime-mismatch; AUTH-T11 zombie-aware pidAlive 2/2, `SSRF_SPIKE_V235.md` §4; PIDFD-T11e). **Produksi BELUM:** ketersediaan/mount `/proc` di sandbox artifact tidak dapat diperiksa dari VM ini (risiko U-16, U-22 di §G desain) | **SEBAGIAN** | Ketersediaan `/proc` + namespace di runtime produksi (kriteria STAGE-P03). |
| **ST-07** Supervisor / process groups | Supervisor produksi teridentifikasi (tipe, versi, konfigurasi) + tes hidup: parent dibunuh → group ikut mati; restart otomatis | **Tidak ada bukti supervisor.** Yang ada hanya lapis pertahanan VM: PARENT-T1a/T1b — worker self-exit via `disconnect`/ppid-watchdog + pidfile cleanup oleh parent baru (`SSRF_SPIKE_V231.md` §3); AUTH-T7 (supervisor stub — eksplisit dicatat "SUP-01 tetap wajib", `SSRF_SPIKE_V235.md` §4). Desain §D.4.15 STAGE-P04 dan §G U-22/U-36/U-39 merumuskan prasyarat ini sebagai BLOCK | **BELUM** | Seluruhnya — staging: dokumentasi supervisor + tes hidup SUP-01 (kriteria STAGE-P04). |
| **ST-08** SU-T1..SU-T9 | Kesembilan tes startup dijalankan, lolos, kegagalan diselesaikan dan diuji ulang | **TERBUKTI (VM) — koreksi atas status NOT RUN evaluasi.** Lihat §3 dokumen ini untuk matriks per tes. Ringkas: v2.3.2 9/9 × 3 run (`SSRF_SPIKE_V232.md` §1–§2; RUN=3 di `SSRF_SPIKE_V233.md` §0); v2.3.3 regresi terhadap kode yang diperkeras 9/9 × 2 (`SSRF_SPIKE_V233.md`); v2.3.6 re-run 9/9 × 4 (`SSRF_SPIKE_V236.md` §0.1; `spike-harness-v236/su-run1.log` s.d. `su-run4.log`). Kegagalan SU-T5 pada run pertama v2.3.6 terdiagnosis sebagai bug setup harness (`lock-racer.cjs` memakai fd lock lalu `process.exit()` tanpa `flock.unlock()` — penutupan fd oleh kernel tidak tercatat harness), diperbaiki, lalu 9/9 × 4 bersih | **TERBUKTI (VM)** | Status NOT RUN evaluasi **dikoreksi menjadi PASS (VM)** berdasarkan referensi di §3 + konfirmasi reviewer (dokumen ini; re-review ChatGPT pada G7). **Pengulangan di staging tetap wajib** sebagai aspek terpisah (STAGE-P05) — bukan pengulangan bukti VM. |
| **ST-09** NFS | Bila lock di NFS: binding flock + flock di NFS terbukti; bila bukan NFS: dibuktikan bukan NFS | **Tidak ada.** Tidak ada NFS di VM ini: AUTH-T9c NOT RUN (`SSRF_SPIKE_V235.md` §4), FLK-06/FLK-07 NOT RUN (`SSRF_SPIKE_V234.md` §5). Desain §D.4.15 STAGE-P06 merumuskan prasyarat ini (FAIL = BLOCK bila NFS, atau bukti bukan-NFS) | **BELUM** (bersyarat) | Staging: tentukan dulu filesystem produksi (ST-04); bila NFS → FLK-06/FLK-07 + AUTH-T9c; bila bukan NFS → bukti tipe fs sebagai penutup (kriteria STAGE-P06). |
| **ST-10** Lock operations | Dry-run deployment/rollback/cleanup/maintenance pada tooling produksi + bukti permission identitas | **Prosedur + kontrol VM TERBUKTI; dry-run produksi BELUM.** Prosedur deployment/rollback/maintenance yang mengikat ada di §A.5.5.4g desain v2.3.6; kontrol OS-enforced teruji: OPS-T1 (direktori 0700 ditegakkan kernel — `nobody` rm → Permission denied), OPS-T3 (bind-mount ro menghentikan penghapusan tak sengaja; root dapat me-remount), OPS-T4 (root melewati DAC), OPS-T6 (isolasi antar user layanan) — 6/6 × 3 (`SSRF_SPIKE_V236.md` §4.1; `spike-harness-v236/ops-run1..3.log`). **Yang belum:** dry-run pada tooling produksi yang sebenarnya, dan bukti permission identitas operator produksi | **SEBAGIAN** | Dry-run deployment/rollback/cleanup/maintenance di staging + bukti permission identitas (kriteria STAGE-P12, bagian operasional). |
| **ST-11** Recovery drill | Simulasi pemulihan: lock terhapus saat parent aktif → dua pemilik terdeteksi & diselesaikan tanpa cleanup ganda | **Mekanisme TERBUKTI di VM; simulasi staging BELUM.** OPS-T7 PASS × 3 (`SSRF_SPIKE_V236.md` §4.2; `spike-harness-v236/opsrec-run1..3.log`): dua pemilik pada inode berbeda direproduksi (T7a), pemindaian proses mendeteksi pemegang basi (T7b), pemegang lama stand-down setelah verifikasi salah (T7c), pemegang baru tetap pemilik (T7d) — 0 cleanup ganda. **Yang belum:** simulasi yang sama di staging dengan supervisor produksi dan quiescence produksi | **SEBAGIAN** | Simulasi pemulihan di staging (kriteria STAGE-P12, bagian pemulihan). |
| **ST-12** Observability | Tes alert: path lock hilang, inode drift, permission drift, perubahan mount — alert sampai ke operator yang bertanggung jawab | **Tidak ada bukti.** Tidak ada sistem alert yang diuji di VM ini. Desain mendefinisikan metrik/monitoring (§A.5.4, §A.5.5.4g) dan audit trail (OPS-T5 mencatat auditd/eBPF TIDAK ADA di VM ini), tetapi tidak ada satu pun tes pengiriman alert. Risiko terkait: U-45 (baru, §5) | **BELUM** | Seluruhnya — staging: definisikan jalur alert + uji keempat pemicu (path hilang, inode drift, permission drift, mount berubah) sampai ke operator (kriteria §6 butir 10). |

**Hitungan ST-01..ST-12:** TERBUKTI (VM) **1** (ST-08) · SEBAGIAN **7** (ST-02, ST-03, ST-04, ST-05, ST-06, ST-10, ST-11) · BELUM **4** (ST-01, ST-07, ST-09, ST-12). Tidak ada satu pun gate yang status VM-nya "belum dikerjakan" padahal sudah terbukti — dan tidak ada satu pun gate yang diklaim lolos staging, karena **nol** bukti staging ada di tangan.

---

## §2 Matriks SU-T1..SU-T9 — koreksi status NOT RUN evaluasi §6.1

Evaluasi §6.1 menulis kesembilan tes ini "NOT RUN in this review" dan §7 mencatatnya sebagai prasyarat yang belum dieksekusi. Itu kedaluwarsa. Definisi tiap tes di bawah dikutip dari `SSRF_SPIKE_V232.md` §1 dan §3 (tempat tes didefinisikan); hasil v2.3.6 dikutip dari `SSRF_SPIKE_V236.md` §0.1 dan log run.

**Riwayat eksekusi suite SU (semua 9/9 PASS, nol kegagalan implementasi pada run bersih):**
- v2.3.2 — RUN=1, RUN=2 (`SSRF_SPIKE_V232.md` §2, output verbatim) + RUN=3 (`SSRF_SPIKE_V233.md` §0, output verbatim; koreksi atas klaim "3×" yang awalnya tanpa output RUN=3).
- v2.3.3 — regresi terhadap kode yang diperkeras (RCL): 9/9 PASS × 2 (`SSRF_SPIKE_V233.md`).
- v2.3.6 — re-run: 9/9 PASS × 4 (`SSRF_SPIKE_V236.md` §0.1; `spike-harness-v236/su-run1.log` s.d. `su-run4.log`).
- Total: **9 eksekusi penuh suite, semuanya 9/9 PASS.** Satu-satunya kegagalan yang pernah tercatat adalah bug setup harness pada run pertama v2.3.6 (SU-T5, lihat bawah) — bukan regresi implementasi.

**Koreksi bug harness SU-T5 (v2.3.6, `SSRF_SPIKE_V236.md` §0.1):** pada run pertama v2.3.6, SU-T5 gagal karena `lock-racer.cjs` memakai fd lock lalu memanggil `process.exit()` tanpa `flock.unlock()` — penutupan fd oleh kernel tidak tercatat oleh harness, sehingga harness mengira lock masih dipegang. Diagnosis: bug setup harness, bukan regresi kode. Perbaikan: racer menutup fd secara eksplisit sebelum keluar. Setelah perbaikan: SU-T5 PASS pada keempat run bersih (pemenang=1, kalah=4, alasan `held-by-live-holder` — output verbatim di `su-run1.log`).

| Tes | Definisi (dari `SSRF_SPIKE_V232.md`) | Hasil v2.3.6 (log) | Status |
| --- | --- | --- | --- |
| **SU-T1** | Worker tidak bisa dimatikan (exit tak terkonfirmasi) → tetap NOT_READY; batas percobaan habis BUKAN izin melanjutkan | `PASS SU-T1 :: state=NOT_READY path=attempts-exhausted-unconfirmed sigsSent=3 rejections=2 workerMasihHidup=true` (`su-run1.log`) | **TERBUKTI (VM)** — 9/9 × 4 (v2.3.6) + 9/9 × 3 (v2.3.2) + 9/9 × 2 (v2.3.3) |
| **SU-T2** | PID reuse (starttime tidak cocok) → tanpa SIGKILL, NOT_READY | `PASS SU-T2 :: state=NOT_READY path=identity-failed reason=starttime-mismatch sigsSent=0 page=1 decoyHidup=true` | **TERBUKTI (VM)** — sama |
| **SU-T3** | Worker nyata, identitas valid → SIGKILL + exit terkonfirmasi → READY | `PASS SU-T3 :: state=READY path=exit-confirmed attemptsUsed=1 lookupOk=true workerHidup=false` | **TERBUKTI (VM)** — sama |
| **SU-T4** | Pidfile atomik — 20 penulis bersamaan + crash saat tulis → selalu satu record lengkap yang valid | `PASS SU-T4 :: setelahRace ok=true token=<redacted> setelahCrash ok=true tokenSama=true` | **TERBUKTI (VM)** — sama |
| **SU-T5** | Startup lock — 5 parent (proses nyata) bersamaan, tepat 1 menang | `PASS SU-T5 :: pemenang=1 kalah=4 alasanKalah=held-by-live-holder` (setelah perbaikan harness §0.1) | **TERBUKTI (VM)** — sama |
| **SU-T6** | Pemegang lock mati → lock dapat direklamasi parent baru | `PASS SU-T6 :: pertama=true kedua=true direklamasi=true` | **TERBUKTI (VM)** — sama |
| **SU-T7** | Pidfile basi (parent+worker mati) → READY tanpa SIGKILL | `PASS SU-T7 :: state=READY path=worker-already-dead sigsSent=0` | **TERBUKTI (VM)** — sama |
| **SU-T8** | Worker mati sendiri sebelum cleanup → READY tanpa SIGKILL | `PASS SU-T8 :: matiSebelumCleanup=true state=READY path=worker-already-dead sigsSent=0` | **TERBUKTI (VM)** — sama |
| **SU-T9** | Pidfile rusak/parsial → NOT_READY + page; pidfile hilang → READY | `PASS SU-T9 :: rusak: state=NOT_READY path=pidfile-corrupt \| parsial: state=NOT_READY path=pidfile-corrupt \| hilang: state=READY path=no-pidfile \| sigsSent=0 page=2` | **TERBUKTI (VM)** — sama |

**Batas bukti SU (tetap berlaku, tidak diubah v2.3.7):** semua bukti dari VM ini (Node v24.22.1, Linux, `/proc` tersedia) — BUKAN dari runtime artifact produksi. SU-T1 memakai adapter killer palsu (exit tak terkonfirmasi tidak dapat diproduksi dengan proses nyata karena SIGKILL selalu membunuh — dinyatakan di `SSRF_SPIKE_V232.md` §3, bukan disembunyikan). Jendela TOCTOU kecil reklamasi lock basi tetap ada (risiko U-25). **Pengulangan SU-T1..SU-T9 di staging tetap wajib** (STAGE-P05 / ST-08 aspek staging) — itu prasyarat staging, bukan pengulangan bukti VM.

---

## §3 Rekonsiliasi STAGE-P01..P12 (v2.3.6) dengan ST-01..ST-12 (evaluasi) — penomoran kanonik

Kedua matriks tumpang tindih tetapi tidak identik: v2.3.6 memakai satu prasyarat per lapis (STAGE-P01..P12), evaluasi memecah beberapa lapis menjadi dua-tiga gate (mis. STAGE-P01 → ST-01 + ST-02; STAGE-P12 → ST-10 + ST-11 + ST-12) dan tidak mencakup empat prasyarat v2.3.6 yang berada di luar lingkup evaluasi (pid_max, DNS/pinning, lease PostgreSQL, NAT64/NSP). Perbedaan penamaan yang tersisa dicatat di bawah, bukan disembunyikan.

**Keputusan penomoran kanonik ke depan: ST-01..ST-16.** ST-01..ST-12 memakai nomor evaluasi (kerangka reviewer eksternal); ST-13..ST-16 adalah keempat prasyarat v2.3.6 tanpa padanan evaluasi, diberi nomor ST agar satu daftar gate staging yang utuh. STAGE-P01..P12 dipertahankan sebagai alias historis v2.3.6 dan tetap dirujuk di §D.4.15 desain — tidak ada penomoran lama yang dihapus diam-diam.

| Alias v2.3.6 | Gate kanonik | Hubungan | Kriteria PASS/FAIL |
| --- | --- | --- | --- |
| STAGE-P01 | **ST-01** + **ST-02** | Evaluasi memecah: ST-01 = identitas runtime artifact; ST-02 = ketersediaan `bun:ffi` di sandbox | STAGE-P01 (§D.4.15): BLOCK bila runtime artifact tidak dapat diidentifikasi |
| STAGE-P02 | **ST-04** + **ST-05** | Evaluasi memecah: ST-04 = identitas filesystem; ST-05 = semantik flock di fs tersebut | STAGE-P02: BLOCK bila filesystem tidak dapat diidentifikasi; BLOCK bila flock tidak dapat dibuktikan |
| STAGE-P03 | **ST-06** | Sama (ketersediaan `/proc`) | STAGE-P03: BLOCK bila `/proc` tidak tersedia |
| STAGE-P04 | **ST-07** | Sama (supervisor + process group) | STAGE-P04: BLOCK kecuali owner menerima residual U-22 secara tertulis |
| STAGE-P05 | **ST-08** (aspek staging) | Sama — pengulangan SU-T1..SU-T9 di staging; aspek VM ST-08 sudah TERBUKTI (§2) | STAGE-P05: FAIL = implementasi DIBLOKIR |
| STAGE-P06 | **ST-09** | Sama (NFS — bersyarat) | STAGE-P06: FAIL = BLOCK bila NFS; atau bukti bukan-NFS |
| STAGE-P07 | **ST-03** (aspek staging) | Sama — pengulangan pidfd di sandbox produksi; aspek VM ST-03 sudah TERBUKTI (§1) | STAGE-P07: BLOCK bila pidfd tidak tersedia DAN fallback tidak disetujui; fallback terkuantifikasi (P ≈ 7e-9/cleanup) BUKAN default |
| STAGE-P08 | **ST-13** (baru) | Tanpa padanan evaluasi — pid_max produksi + pengukuran jendela fallback | STAGE-P08: FAIL = BLOCK bila pid_max tidak dapat dibaca; fallback BUKAN default tanpa persetujuan eksplisit owner |
| STAGE-P09 | **ST-14** (baru) | Tanpa padanan evaluasi — DNS/pinning staging (P0-1a' / U-1) | STAGE-P09: FAIL = implementasi DIBLOKIR |
| STAGE-P10 | **ST-15** (baru) | Tanpa padanan evaluasi — atomicity lease global PostgreSQL di staging | STAGE-P10: FAIL = implementasi DIBLOKIR |
| STAGE-P11 | **ST-16** (baru) | Tanpa padanan evaluasi — NAT64/NSP staging | STAGE-P11: FAIL = implementasi DIBLOKIR |
| STAGE-P12 | **ST-10** + **ST-11** + **ST-12** | Evaluasi memecah: ST-10 = dry-run operasional; ST-11 = simulasi pemulihan; ST-12 = tes alert/observabilitas | STAGE-P12: FAIL = implementasi DIBLOKIR |

**Perbedaan yang tersisa (dicatat, bukan diratakan):**
1. Evaluasi memakai ST-08 untuk SU-T1..SU-T9 sebagai satu gate; v2.3.6 memakai AUTH-16 (§D.4.13) untuk re-run yang sama. Keduanya merujuk suite yang sama — kanonik: ST-08, alias AUTH-16.
2. Evaluasi §2.2 melarang fallback ke numeric `kill(pid)` ("Never fall back to numeric kill(pid)"); v2.3.6 STAGE-P07 mengizinkan fallback terkuantifikasi itu **hanya dengan persetujuan eksplisit owner** dan BUKAN sebagai default. Ini divergensi nyata, bukan perbedaan penamaan — dicatat sebagai risiko baru U-46 (§5) yang membutuhkan keputusan owner, bukan diselesaikan sepihak oleh v2.3.7.
3. Evaluasi §3.2 menambahkan persyaratan yang **tidak ada di desain v2.3.6**: mode file lock 0600 (opsi setgid 0770), open dengan `O_NOFOLLOW` + validasi `fstat`, penolakan symlink dan non-regular file. Pencarian di desain v2.3.6: nol kemunculan "0600", "NOFOLLOW", "symlink". Dicatat sebagai kesenjangan desain DG-1..DG-3 (§5.4) — untuk diputuskan pada revisi desain berikutnya, bukan diklaim sudah ada.

---

## §4 Matriks risiko — U-38-A..D dan U-33-A..F (evaluasi) terhadap risiko v2.3.6

Legenda: **DIJAWAB** = bukti v2.3.6 menutup risiko (residual dicatat bila ada) · **SEBAGIAN** = sebagian ditutup, sisa dicatat · **TERBUKA** = tidak ada bukti baru; status v2.3.6 tetap.

| Risiko evaluasi | Padanan v2.3.6 | Bukti / alasan | Status |
| --- | --- | --- | --- |
| **U-38-A** PID keluar + reuse antara cek procfs dan kill numerik (Medium/Critical) | U-38 (dijawab v2.3.6, §G) + residual U-41 | PIDFD-T2: reuse PID 461 setelah 7.871 spawn — `pidfd_send_signal` → ESRCH, decoy hidup; PIDFD-T3 membuktikan kill-by-number SETELAH reuse membunuh decoy (race NYATA, kini ditutup pidfd). Urutan mengikat T12a–d 4/4 × 2 | **DIJAWAB** — residual: U-41 (tabrakan starttime, P ≈ 7e-9/cleanup) |
| **U-38-B** PID sudah ter-reuse sebelum pidfd diperoleh (Medium/High) | U-38 + U-41 + U-37 (zombie) | PIDFD-T12b (identitas salah saat pidfd_open → tolak) dan T12c (identitas berubah antara pidfd_open dan re-validasi → tolak) 4/4 × 2; T11 pidAlive zombie-aware 5/5. Sisa: ambiguitas sumber identitas/namespace (STAGE-P03/ST-06) | **SEBAGIAN** — residual: U-41 + namespace mapping (ST-06) |
| **U-38-C** Bun FFI/syscall tidak tersedia atau diblokir sandbox (Unknown/High) | U-34 + U-29 (§G) | VM membuktikan `bun:ffi` di Bun 1.4.4 CLI (PIDFD-T8 5/5 × 3); sandbox produksi TIDAK TERBUKTI. Tidak ada bukti baru sejak v2.3.6 | **TERBUKA** — wajib ST-02 (staging) |
| **U-38-D** ABI/simbol/syscall/errno FFI salah (Medium/Critical) | U-29 + U-34 (§G) | VM: simbol yang benar dipakai harness referensi (`pidfd_open`, `pidfd_send_signal`, `__errno_location` — `pidfd-lib.mjs`); jalur negatif teruji (T5 ESRCH, T7 EINVAL). **Belum:** review terhadap implementasi produksi (belum ada) + review arsitektur | **SEBAGIAN** — sisa: review implementasi + staging (ST-02/ST-03) |
| **U-33-A** Pathname lock di-unlink saat inode lama terkunci (Medium/Critical) | U-33 (dijawab v2.3.6) + residual U-43 | OPS-T1/T3/T6: kontrol OS-enforced teruji (direktori 0700, isolasi antar-user, bind-mount ro); OPS-T7: dua pemilik terdeteksi & diselesaikan. Sisa: aktor istimewa yang sengaja menghapus | **SEBAGIAN** — residual: U-43 (root sengaja menghapus — hanya audit + runbook) |
| **U-33-B** Proses baru mengunci inode pengganti sementara pemegang lama memegang inode lama (Medium/Critical) | U-33 + U-43 (§G) | OPS-T7 PASS × 3: dua pemilik direproduksi, terdeteksi via pemindaian proses, pemegang lama stand-down, 0 cleanup ganda (`opsrec-run1..3.log`) | **SEBAGIAN** — residual: ketidakpastian quiescence + jendela mid-guardedAction (lihat U-45) |
| **U-33-C** Proses non-kooperatif mengabaikan flock advisory (Medium/High) | U-33 (§G) | Tidak ada bukti baru. Sifat advisory flock tidak berubah; inventaris partisipan adalah persyaratan desain, bukan sesuatu yang teruji | **TERBUKA** — tetap seperti v2.3.6 |
| **U-33-D** Perilaku fs/flock/NFS tak terduga (Unknown/High) | U-35 + U-30 (§G) | VM membuktikan tmpfs + overlay (FLK 9/9 × 2 tiap fs); filesystem produksi / NFS TIDAK TERBUKTI | **TERBUKA** — wajib ST-04/ST-05/ST-09 (staging) |
| **U-33-E** Tooling operator/cleanup/deployment mengganti inode (Medium/Critical) | U-33 + U-43 + U-44 (§G) | Prosedur deployment/rollback/maintenance mengikat (§A.5.5.4g) + OPS-T1..T7; sisa: kontrol runbook-only untuk aktor istimewa | **SEBAGIAN** — residual: U-43/U-44 |
| **U-33-F** Perilaku supervisor/process-group berbeda (Unknown/High) | U-22 + U-36 + U-39 (§G) | Tidak ada bukti baru. SUP-01 NOT RUN; hanya self-exit + pidfile cleanup teruji (PARENT-T1a/T1b) | **TERBUKA** — wajib ST-07 (staging) |

### §4.1 Risiko yang berubah status oleh v2.3.7
- **U-38-A: TERBUKA (di evaluasi) → DIJAWAB (residual U-41).** Perubahan ini adalah koreksi keterlacakan, bukan pengujian baru.
- **U-38-B: TERBUKA → SEBAGIAN.** T12b/T12c/T11 sudah ada di v2.3.6 tetapi tidak dirujuk evaluasi.
- **U-33-A, U-33-B, U-33-E: TERBUKA → SEBAGIAN.** OPS-T1..T7 sudah ada di v2.3.6 tetapi tidak dirujuk evaluasi.
- **U-38-C, U-33-C, U-33-D, U-33-F: tetap TERBUKA.** v2.3.7 tidak mengklaim apa pun atas keempatnya — semuanya membutuhkan staging.
- **U-38-D: TERBUKA → SEBAGIAN** (jalur negatif VM teruji; review implementasi tetap menunggu kode).

### §4.2 Risiko benar-benar baru dari evaluasi (tidak ada padanan v2.3.6)
- **U-45 — Latensi deteksi (baru, dari evaluasi §8 butir 9).** Monitoring inode mendeteksi pemisahan lock *setelah* terjadi; tidak ada bukti yang membuktikan tidak ada interval split-lock di antara pemindaian. v2.3.6 memiliki monitoring sebagai deteksi tetapi tidak pernah merumuskan latensi deteksi sebagai risiko. Status: TERBUKA. Penutup: bagian dari ST-12 (uji alert) — alert harus diuji sampai ke operator, bukan hanya dicatat.
- **U-46 — Divergensi fallback numeric-kill (baru, dari evaluasi §2.2 vs desain §A.5.5.2a/STAGE-P07).** Evaluasi melarang fallback ke numeric `kill(pid)`; v2.3.6 mengizinkan fallback terkuantifikasi (jendela ~46 µs, P ≈ 7e-9/cleanup) hanya dengan persetujuan eksplisit owner dan BUKAN sebagai default, dengan alternatif yang diizinkan evaluasi (§2.4) adalah retained child-process handle / supervisor / Bun documented termination API — ketiganya belum ada di desain. Status: TERBUKA — **membutuhkan keputusan owner** (terima fallback terkuantifikasi v2.3.6, atau adopsi larangan evaluasi dan ganti fallback dengan retained-handle/supervisor). v2.3.7 tidak memutuskan sepihak.

### §4.3 Kesenjangan desain dari evaluasi §3.2 (bukan risiko — persyaratan yang tidak ada di desain)
Pencarian teks di `SSRF_REMEDIATION_DESIGN.md` v2.3.6 menghasilkan **nol** kemunculan untuk "0600", "NOFOLLOW", dan "symlink". Artinya persyaratan berikut dari evaluasi §3.2 belum menjadi bagian desain:
- **DG-1** — Mode file lock 0600 (opsi direktori setgid 0770) tidak dirumuskan di desain. (Direktori 0700 sudah ada — OPS-T1.)
- **DG-2** — Open lock dengan `O_NOFOLLOW` + validasi `fstat` tidak dirumuskan di desain.
- **DG-3** — Penolakan symlink dan file non-regular pada path lock tidak dirumuskan di desain.
Ketiganya dicatat di §6 butir 15 sebagai pekerjaan desain pada revisi berikutnya — bukan diklaim sudah dipenuhi.

---

## §5 Daftar kekurangan yang tersisa — hanya yang BENAR-BENAR belum terbukti

Setiap butir di bawah ini belum memiliki bukti di VM ini maupun di staging. Tidak satu pun butir di sini adalah pengulangan pekerjaan v2.3.6. Kriteria PASS/FAIL dikutip dari desain v2.3.6 §D.4.15 (STAGE-Pxx) atau dirumuskan di sini bila belum ada (ST-12, DG-1..DG-3, U-45, U-46).

| # | Kekurangan | Gate | Kriteria PASS | Kriteria FAIL | Lokasi pengujian |
| --- | --- | --- | --- | --- | --- |
| 1 | Identitas runtime artifact produksi (digest, versi Bun, kernel, pidfd di sandbox) | ST-01 | Artifact teridentifikasi lengkap; pidfd tersedia di sandbox artifact | Artifact tidak dapat diidentifikasi, atau pidfd tidak tersedia tanpa fallback yang disetujui | Staging |
| 2 | `bun:ffi` di sandbox setara produksi + review simbol/prototipe implementasi | ST-02 | FFI tersedia di sandbox; simbol & prototipe sesuai implementasi | FFI diblokir, atau simbol/prototipe salah | Staging (+ review kode saat implementasi) |
| 3 | Suite pidfd di sandbox produksi (pengulangan PIDFD-T1..T12) | ST-03 | Semua PIDFD-01..PIDFD-08 lolos di sandbox produksi | Satu pun gagal, atau pidfd tidak tersedia dan fallback tidak disetujui owner | Staging |
| 4 | Identitas filesystem produksi + pengulangan FLK/OPS di atasnya | ST-04/ST-05 | FS teridentifikasi; FLK-T1..T8 lolos di fs produksi | FS tidak teridentifikasi, atau flock tidak terbukti | Staging |
| 5 | Ketersediaan `/proc` + namespace di runtime produksi | ST-06 | `/proc` dapat dibaca dari proses artifact; starttime dapat divalidasi | `/proc` tidak tersedia / tidak dapat dibaca | Staging |
| 6 | Dokumentasi supervisor + tes hidup SUP-01 (kill parent → group mati; restart otomatis; kill berdasarkan PID pidfile, bukan PID spawn — U-39) | ST-07 | Supervisor terdokumentasi DAN terbukti lewat tes hidup | Tidak terdokumentasi, atau tes hidup gagal | Staging |
| 7 | Penentuan NFS + (bila NFS) FLK-06/FLK-07 + AUTH-T9c; (bila bukan NFS) bukti tipe fs | ST-09 | NFS terbukti + flock NFS lolos, ATAU bukan-NFS terbukti | NFS tanpa bukti flock, atau status fs tidak dapat ditentukan | Staging |
| 8 | Pengulangan SU-T1..SU-T9 di staging | ST-08 (staging) | 9/9 PASS di runtime staging | Satu pun gagal | Staging |
| 9 | Dry-run deployment/rollback/cleanup/maintenance pada tooling produksi + bukti permission identitas operator | ST-10 | Dry-run lolos; identitas operator terbukti; tidak ada penghapusan lock di luar prosedur | Dry-run gagal, atau permission tidak terbukti | Staging |
| 10 | Simulasi pemulihan di staging (lock terhapus saat parent aktif, dengan supervisor produksi) | ST-11 | Dua pemilik terdeteksi & diselesaikan tanpa cleanup ganda, seperti OPS-T7 | Split-brain tidak terdeteksi, atau cleanup ganda terjadi | Staging |
| 11 | Tes alert/observabilitas: path lock hilang, inode drift, permission drift, perubahan mount — sampai ke operator | ST-12 | Keempat pemicu menghasilkan alert yang sampai ke operator yang bertanggung jawab dalam batas waktu yang ditetapkan | Satu pun pemicu tidak menghasilkan alert, atau alert tidak sampai | Staging |
| 12 | pid_max produksi + pengukuran jendela fallback di produksi | ST-13 (ex-P08) | pid_max terbaca; jendela terukur; fallback BUKAN default tanpa persetujuan eksplisit owner | pid_max tidak dapat dibaca, atau fallback dipakai sebagai default | Staging |
| 13 | DNS/pinning staging (P0-1a' / U-1) | ST-14 (ex-P09) | Pendekatan yang dipilih terbukti bekerja di runtime produksi | Gagal di runtime produksi | Staging |
| 14 | Atomicity lease global PostgreSQL di staging | ST-15 (ex-P10) | LSE-01..LSE-06 lolos terhadap PostgreSQL staging | Gagal terhadap PostgreSQL | Staging |
| 15 | NAT64/NSP staging | ST-16 (ex-P11) | Uji NAT64/NSP lolos di staging | Gagal di staging | Staging |
| 16 | Kesenjangan desain DG-1..DG-3 (mode file lock 0600; open `O_NOFOLLOW` + validasi `fstat`; penolakan symlink/non-regular) | — (desain) | Dirumuskan di desain + diuji (mode, no-follow, penolakan symlink) | Tidak dirumuskan, atau dirumuskan tanpa uji | Revisi desain berikutnya, lalu uji |
| 17 | Keputusan owner atas divergensi fallback U-46 (larangan evaluasi vs fallback terkuantifikasi v2.3.6) | — (keputusan) | Owner memutuskan secara tertulis: terima fallback terkuantifikasi, ATAU adopsi larangan + ganti fallback (retained handle/supervisor/API Bun) | Tidak ada keputusan tertulis sebelum implementasi | Keputusan owner |
| 18 | Latensi deteksi U-45 (interval split-lock antar pemindaian) | ST-12 | Batas latensi dirumuskan + alert teruji (§5 butir 11) | Tidak ada batas latensi yang dirumuskan | Staging (bersama ST-12) |
| 19 | AUTH-T9c mixed-version (v2.3.5 NOT RUN — tidak ada NFS di VM ini; tidak dijalankan di v2.3.6) | AUTH-16 | Dijalankan dan lolos (VM dengan dua versi harness, atau staging bila butuh NFS) | Tetap NOT RUN saat G6 dievaluasi | VM atau staging |
| 20 | G0 — bukti mitigasi (a) aktif di produksi (belum terbukti sejak v2.2; dicatat di §H desain) | G0 | Bukti aktif dari produksi (bukan klaim) | Tidak ada bukti | Produksi (read-only check) |

**Catatan atas butir 20:** G0 bukan kekurangan baru v2.3.7 — ia sudah tercatat sebagai gerbang yang wajib dibuktikan sejak v2.2 dan tetap belum terbukti. Dicantumkan di sini agar daftar kekurangan ini lengkap dan tidak ada gerbang yang hilang dari pandangan.

---

## §6 Ringkasan hitungan v2.3.7

- **ST-01..ST-12:** TERBUKTI (VM) **1** · SEBAGIAN **7** · BELUM **4**. Nol gate diklaim lolos staging.
- **SU-T1..SU-T9:** **9/9 TERBUKTI (VM)** — status NOT RUN evaluasi dikoreksi untuk kesembilannya, dengan 9 eksekusi penuh suite (v2.3.2 × 3, v2.3.3 × 2, v2.3.6 × 4), semuanya 9/9 PASS.
- **Risiko evaluasi:** DIJAWAB 1 (U-38-A) · SEBAGIAN 5 (U-38-B, U-38-D, U-33-A, U-33-B, U-33-E) · TERBUKA 4 (U-38-C, U-33-C, U-33-D, U-33-F) · BARU 2 (U-45, U-46).
- **Penomoran kanonik:** ST-01..ST-16 (ST-01..ST-12 dari evaluasi; ST-13..ST-16 dari STAGE-P08..P11); STAGE-P01..P12 dipertahankan sebagai alias.
- **Kekurangan yang benar-benar tersisa:** 20 butir (§5) — 15 staging, 1 desain (DG-1..DG-3), 1 keputusan owner (U-46), 1 pengujian tertunda (AUTH-T9c), 1 gerbang produksi (G0), 1 latensi deteksi (U-45, bersama ST-12).
- **Pengujian baru yang dijalankan untuk v2.3.7: NOL.** Tidak ada file bukti eksperimen baru. Semua klaim di dokumen ini mengutip bukti v2.3.2–v2.3.6 yang sudah ada.

---

## §7 Apa yang TIDAK dilakukan v2.3.7

- Tidak mengulang satu pun pengujian yang sudah PASS (SU-T1..SU-T9, PIDFD-T1..T12, OPS-T1..T7, FLK, AUTH, ADV).
- Tidak mengubah kode aplikasi live artifact (slug `cek-link-airdrop`), database/katalog, atau production build.
- Tidak mengaktifkan kembali Link Scanner; scanner tetap NONAKTIF di produksi.
- Tidak memutuskan divergensi U-46 sepihak — keputusan ada di tangan owner.
- Tidak mengklaim satu pun gate lolos staging — semua bukti staging masih kosong dan wajib diisi sebelum G8.
- Status akhir tetap: **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**

---

*Referensi silang: `SSRF_EVALUATION_V235.md` (evaluasi ChatGPT, commit 39ea4ef) · `SSRF_REMEDIATION_DESIGN.md` v2.3.7 (§D.4.16, §G, §H diperbarui) · `SSRF_SPIKE_V236.md` + `spike-harness-v236/` (bukti v2.3.6) · `SSRF_SPIKE_V235.md` · `SSRF_SPIKE_V234.md` · `SSRF_SPIKE_V233.md` · `SSRF_SPIKE_V232.md`.*
