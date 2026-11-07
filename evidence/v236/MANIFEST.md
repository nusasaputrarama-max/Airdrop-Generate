# MANIFEST — Bukti Mentah v2.3.6 (evidence/v236/)

**Dokumen:** manifest bukti mentah revisi desain v2.3.6
**Tanggal publikasi:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:** F-007 (audit V2 — log mentah v2.3.6 yang dikutip tidak ada di repo)

## Koreksi v2.3.10 (F-010) — baca dulu, mengikat seluruh manifest ini

Audit V3 (`SSRF_INDEPENDENT_AUDIT_V3.md` §4.1/§5, F-010) menemukan cacat
integritas pada bundle ini, dan Muse memverifikasi sendiri dengan
`sha256sum` pada 2026-11-08 ~01:49 WIB (sebelum menulis koreksi ini):

- `su-run1.txt`, `su-run2.txt`, `su-run3.txt` **byte-identik**:
  SHA-256 ketiganya `a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036`,
  masing-masing 904 byte / 11 baris, header `=== SUITE v2.3.2 (RUN=1) ===`
  dan ringkasan `=== HASIL RUN=1: 9/9 PASS ===`.
- `su-run4.txt` hanya 194 byte / 2 baris (baris PASS SU-T9 + ringkasan
  `RUN=1`) — ekor, bukan log lengkap; mtime 14:10:42 UTC, lebih awal dari
  su-run1..3.

**Konsekuensi:** bundle ini TIDAK berisi tiga log SU lengkap yang berbeda.
Yang dapat dibuktikan dari artefak hanyalah **SATU output SU lengkap
(RUN=1) yang tersimpan tiga kali**, plus satu ekor. Klaim v2.3.6/v2.3.7
"SU-T1..SU-T9 9/9 × 4" tetap merupakan hitungan run yang dijalankan
menurut `SSRF_SPIKE_V236.md` §0.1, tetapi **jumlah run itu TIDAK DAPAT
diverifikasi dari repo** — status yang benar untuk klaim asli adalah
"reported PASS in VM documentation" dengan 1 log lengkap yang
terverifikasi, bukan "4 log lengkap" dan bukan "3 log lengkap".

**File TIDAK dihapus.** Menghapus `su-run2.txt`/`su-run3.txt` akan
menghancurkan jejak audit (bagaimana cacat ini terjadi dan apa yang
dulu diklaim). Ketiganya dipertahankan apa adanya dan ditandai di bawah
sebagai duplikat — label, bukan penghapusan.

**Status bukti yang dikoreksi (menggantikan interpretasi tabel
Inventaris di bawah — kolom Run/SHA tabel tetap mencatat klaim ASLI
v2.3.8 agar sejarah klaim tidak ditulis ulang):**

| File | Status bukti v2.3.10 |
| --- | --- |
| `su-run1.txt` | INDEPENDEN — satu-satunya output SU lengkap yang terverifikasi dari bundle asli (RUN=1, 9/9 PASS). |
| `su-run2.txt` | **DUPLIKAT — NOT PRESERVED sebagai log independen.** Byte-identik dengan su-run1.txt; header/ringkasan RUN=1, bukan RUN=2. Jangan dikutip sebagai run ke-2. |
| `su-run3.txt` | **DUPLIKAT — NOT PRESERVED sebagai log independen.** Byte-identik dengan su-run1.txt; header/ringkasan RUN=1, bukan RUN=3. Jangan dikutip sebagai run ke-3. |
| `su-run4.txt` | **SEBAGIAN — ekor 2 baris, NOT PRESERVED sebagai log lengkap.** Ringkasan RUN=1; tidak membuktikan run ke-4 yang lengkap. |
| `ops-run1.txt` / `ops-run2.txt` | **NOT-INDEPENDENT (temuan sejenis, baru dicatat v2.3.10).** Keduanya byte-identik (SHA-256 `c534b541…`, 1.423 byte) dan isinya tidak mengandung diskriminator nomor run apa pun (tidak ada header/ringkasan RUN) — artefak tidak dapat membedakan dua run yang diklaim. Audit V3 tidak menyinggung pasangan ini; checker v2.3.10 menemukannya dengan aturan yang sama. Klaim "OPS-T1..T6 6/6 PASS × 2" dari bundle asli berstatus NOT VERIFIED sebagai dua run independen. |
| File lain (`pidfd-*`, `pidfd-bun-*`, `pidfd-t11-*`, `pidfd-t12-*`, `dirfd-*`, `window-*`, `opsrec-*`) | Tidak berubah — tiap file punya SHA-256 berbeda dan lolos pemeriksaan hash/ukuran checker; catatan: sebagian besar tidak mengandung diskriminator RUN di dalam isi (checker memberi WARN), tetapi hash-nya berbeda sehingga tidak ada klaim duplikat atas mereka. |

**Klaim v2.3.6 asli vs suplemen v2.3.9 — dipisahkan secara eksplisit:**
klaim "9/9 × 4" v2.3.6 bersandar pada bundle ini (status terkoreksi di
atas). Empat run suplemen v2.3.9 (`evidence/v236-supplement-20261108/`,
supp-1..supp-4, masing-masing 11 baris lengkap, header/ringkasan RUN=1..4
yang cocok, SHA-256 berbeda kecuali supp-1 yang memang byte-identik
dengan su-run1.txt karena mereproduksinya) adalah **kumpulan bukti VM
yang terpisah, tertanggal terpisah (2026-11-07T17:29:40Z–17:30:06Z)** —
bukan log asli yang hilang dan bukan pengganti bundle ini. Suplemen itu
yang kini menjadi bukti 4-run SU yang dapat diverifikasi dari repo.

**Verifikasi mesin (checker):** `scripts/verify-evidence-manifest.mjs`
memverifikasi SHA-256, ukuran byte, header run, nomor run ringkasan, dan
keunikan hash di mana eksekusi berbeda diklaim. Dijalankan 2026-11-08
~01:50 WIB; output lengkap tersimpan di `evidence/v236/VERIFY-20261108.txt`
(**exit 1 — 11 failure**: 6 ketidakcocokan RUN su-run2/3, 3 kegagalan
su-run4, 2 kegagalan duplikat hash — kegagalan ini ADALAH hasil yang
diharapkan untuk bundle asli yang terkoreksi, bukan kesalahan checker).
Suplemen lolos: `evidence/v236-supplement-20261108/VERIFY-20261108.txt`
(exit 0 — 0 failure). Perintah:

```sh
node scripts/verify-evidence-manifest.mjs evidence/v236
node scripts/verify-evidence-manifest.mjs evidence/v236-supplement-20261108
```

## Mengapa file-file ini berbentuk .txt

Log mentah v2.3.6 ADA secara lokal di `spike-harness-v236/*.log` sejak
2026-11-07, tetapi **tidak pernah ter-commit** karena root `.gitignore`
baris 8 mengecualikan `*.log` (verifikasi: `git log --all -- "*.log"`
kosong). File-file di direktori ini adalah **salinan byte-identik** dari
log tersebut dengan ekstensi `.txt` — dipilih agar tidak diam-diam
dikecualikan `.gitignore` — dan diverifikasi dengan `cmp` satu per satu
pada 2026-11-08: **21/21 OK**. SHA-256 di bawah adalah hash file `.txt`
di sini, yang identik dengan hash file `.log` aslinya (salinan byte-identik
memiliki hash yang sama).

**Yang TIDAK dilakukan:** tidak ada log yang ditulis ulang, diringkas,
atau diedit. Satu-satunya pengecualian adalah `su-run4.txt` yang memang
sudah hanya berisi 2 baris di sumbernya (lihat peringatan di bawah).

## Lingkungan run (identitas yang dapat diverifikasi)

| Butir | Nilai |
| --- | --- |
| Host / VM | `htch-runtime` |
| Kernel | Linux 7.0.0-43-generic x86_64 |
| Arsitektur | x86_64 |
| Bun | 1.4.4 |
| Node | v24.22.1 |
| Python | 3.12.3 |
| UID run | 0 (root) |
| pid_max | 4194304 (diturunkan sementara ke 8192 hanya di dalam tes reuse, dipulihkan sesudahnya) |
| Filesystem | `/tmp` tmpfs, `/home` btrfs (overlay, `fsync=volatile`) |
| Harness commit | `fc798ce` — "SSRF remediation design v2.3.6 — pidfd SIGKILL, operational controls, staging prerequisites" (2026-11-07) |
| Dokumen bukti | `SSRF_SPIKE_V236.md` (638 baris, commit `fc798ce`) |
| Tanggal run | 2026-11-07, 14:10–14:19 UTC (21:10–21:19 WIB) |

**Catatan mtime:** timestamp di bawah adalah mtime file log (UTC). Nomor
run TIDAK monoton terhadap mtime — mis. `pidfd-run2` (14:10:23) lebih awal
dari `pidfd-run1` (14:10:58). Dicatat apa adanya; penomoran tidak
"diperbaiki" agar sesuai urutan waktu.

**Perintah shell per run:** perintah shell eksak tiap run **tidak
tercatat** di `SSRF_SPIKE_V236.md` — NOT VERIFIED. Yang tercatat adalah
file harness per kelompok tes (kolom "Harness" di bawah); harness dapat
dijalankan ulang dari `spike-harness-v236/`. Jangan mengklaim perintah
yang tidak ada buktinya.

**Exit status per run:** exit status proses **tidak tercatat terpisah** —
NOT VERIFIED sebagai angka. Yang tercatat adalah baris ringkasan PASS di
dalam tiap log (mis. `=== HASIL RUN=1: 9/9 PASS ===`).

## Inventaris file

| File | Test ID | Run | Timestamp UTC 2026-11-07 | Ukuran | SHA-256 | Hasil |
| --- | --- | --- | --- | --- | --- | --- |
| `su-run1.txt` | SU-T1..SU-T9 | 1 | 14:11:11 | 904 B | `a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036` | 9/9 PASS |
| `su-run2.txt` | SU-T1..SU-T9 | 2 | 14:11:20 | 904 B | `a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036` | 9/9 PASS |
| `su-run3.txt` | SU-T1..SU-T9 | 3 | 14:11:28 | 904 B | `a8bbf1bbc724cfe248712717888b6e6957b7c23dae591aabe29ef24cb15ca036` | 9/9 PASS |
| `su-run4.txt` | SU-T9 + ringkasan | 4 | 14:10:42 | 194 B | `12f62f5ecea1de475bbc629ffbe7ebffde1139b974182e3362cd7b03eefb876a` | **SEBAGIAN — lihat peringatan** |
| `pidfd-run1.txt` | PIDFD-T1..T7 | 1 | 14:10:58 | 939 B | `a4745f87d25c89869d671e677ff4d4f26dbaf8b35eb9b228711489f617c56ebf` | 7/7 PASS |
| `pidfd-run2.txt` | PIDFD-T1..T7 | 2 | 14:10:23 | 943 B | `b0da3b5d3e37d8d42560026d1486ba400a0a80b6900149c6f238072918fe8025` | 7/7 PASS |
| `pidfd-bun-run1.txt` | PIDFD-T8a/T8b | 1 | 14:10:58 | 254 B | `b4c78b7b95ca46c3f530ac0f5ce57c00bad4de1ab2988a1e2af1a1c35f6a976e` | 2/2 PASS |
| `pidfd-bun-run2.txt` | PIDFD-T8a/T8b | 2 | 14:10:24 | 255 B | `e470fccd5386c6759eeb2bf68061c7083b7606dc060fb032cce05379b0435bad` | 2/2 PASS |
| `pidfd-t11-run1.txt` | PIDFD-T11a..e | 1 | 14:19:23 | 635 B | `ace6622ad3c05d1bd2bf7bda28ae403790f5b6add42efbcc4963565d66509420` | 5/5 PASS |
| `pidfd-t11-run2.txt` | PIDFD-T11a..e | 2 | 14:18:12 | 637 B | `ee4248f433635f824cef13b275afb19692f91e8992f2f2ceb5e3635e2477f1dd` | 5/5 PASS |
| `pidfd-t11-run3.txt` | PIDFD-T11a..e | 3 | 14:19:25 | 635 B | `8536b2b22ac5bf018b0f0d8d2d92466152ec1b5c52444f075abe5d8fce4d630b` | 5/5 PASS |
| `pidfd-t12-run1.txt` | PIDFD-T12a..d | 1 | 14:19:04 | 624 B | `edd9350a048c3c58186904d2d44ed8f598ff20e55d3b73653cbe972d7479ef3c` | 4/4 PASS |
| `pidfd-t12-run2.txt` | PIDFD-T12a..d | 2 | 14:19:20 | 624 B | `97a1462c7b6432d74d62adf6390a1bacf38efb382470c2daa0325cfce3c0faf1` | 4/4 PASS |
| `dirfd-run1.txt` | PIDFD-T10a/b | 1 | 14:11:06 | 474 B | `9867eea72f60c1bd7b083dab007e2e02c25d8cf3bdcf9ed863aaf8a0110a52af` | Lihat catatan T10b |
| `dirfd-run2.txt` | PIDFD-T10a/b | 2 | 14:10:32 | 472 B | `41d9c3d3967da65c09a1e286d418a29bb109cca95bd6ce12c900bb5657095a62` | Lihat catatan T10b |
| `window-run1.txt` | WINDOW-P99 | 1 | 14:11:02 | 444 B | `dbf41bf28e97e1d702f516baede5f4c53130859a7a035fad2a41aca14ce32cda` | P99 ≈ 46,0 µs |
| `window-run2.txt` | WINDOW-P99 | 2 | 14:10:28 | 444 B | `44a0d03ed92f76286ee7c00385d82d38ceec49958075c4261000bc506e7fd3f9` | P99 ≈ 41,7 µs |
| `ops-run1.txt` | OPS-T1..T6 | 1 | 14:11:06 | 1423 B | `c534b541739517366d64976e77e8172308b30662aee23d7e52f259799347d9f8` | 6/6 PASS |
| `ops-run2.txt` | OPS-T1..T6 | 2 | 14:10:32 | 1423 B | `c534b541739517366d64976e77e8172308b30662aee23d7e52f259799347d9f8` | 6/6 PASS |
| `opsrec-run1.txt` | OPS-T7a/b/c | 1 | 14:11:07 | 300 B | `b3d066f959f9d1e09633c7459acabc6050972db29147bbe3e8364cdf1e8e56e2` | PASS |
| `opsrec-run2.txt` | OPS-T7a/b/c | 2 | 14:10:33 | 297 B | `0bc65012a7daac0cb31336adbc0ff88042a09264fb755b55e625272c015438ee` | PASS |

Total: 21 file, 13.729 byte.

## Harness per kelompok tes

| Kelompok | File harness (`spike-harness-v236/`) | Dokumen |
| --- | --- | --- |
| SU-T1..SU-T9 | `su-v232/` (`startup.cjs`, `dns-worker.cjs`, `lock-racer.cjs`, `run-tests.cjs`) | `SSRF_SPIKE_V236.md` §0.1 |
| PIDFD-T1..T7 | `pidfd-tests.py` | §1.2 |
| PIDFD-T8a/b | `pidfd-bun.js` | §1.2 |
| PIDFD-T10a/b | `pidfd-dirfd-pin.py` | §1.3 |
| PIDFD-T11a..e | `pidfd-t11.js` + `zombie-holder.py` | §1.4 |
| PIDFD-T12a..d | `pidfd-t12.py` | §1.5 |
| WINDOW-P99 | `window-measure.cjs` | §1.6 |
| OPS-T1..T6 | `ops-tests.py` | §2 |
| OPS-T7a/b/c | `ops-recovery.cjs` | §2.3 |

## Peringatan bukti — baca sebelum mengutip angka

### 1. `su-run4.txt` hanya sebagian (material)

> **Koreksi v2.3.10 (F-010):** paragraf ini juga sudah kedaluwarsa dalam
> satu hal — bundle ini ternyata hanya berisi **1 log lengkap** (su-run1),
> bukan 3 log lengkap seperti tertulis di bawah ("3 log lengkap + 1 log
> ekor"). Yang benar: **1 log lengkap + 2 duplikat + 1 ekor** — lihat
> "Koreksi v2.3.10 (F-010)" di kepala manifest ini. Isi paragraf di bawah
> dipertahankan sebagai catatan sejarah klaim v2.3.8, bukan sebagai status
> saat ini.

`su-run4.txt` hanya 194 byte / 2 baris: baris PASS SU-T9 dan baris
`=== HASIL RUN=1: 9/9 PASS ===`. Mtime-nya 14:10:42 UTC — LEBIH AWAL
dari `su-run1..3` (14:11:11–28). File ini adalah **ekor (tail) dari satu
run**, bukan log lengkap. Output lengkap run ke-4 SU-T1..SU-T9 **TIDAK
tersimpan** di disk dan tidak ada salinan lain di mesin ini
(pencarian menyeluruh 2026-11-08: tidak ditemukan).

Konsekuensi yang jujur: klaim v2.3.6/v2.3.7 "SU-T1..SU-T9 9/9 × 4"
bersandar pada **3 log lengkap + 1 log ekor**. Status yang benar:
**"reported PASS in VM documentation" dengan 3 log lengkap**, bukan
"4 log lengkap". Dokumen v2.3.7 yang menyebut "9/9 × 4" tetap benar
sebagai hitungan run yang dijalankan (menurut `SSRF_SPIKE_V236.md`
§0.1), tetapi bukti mentah yang dapat diverifikasi dari repo hanya
mencakup 3 run lengkap. Koreksi ini dicatat di
`SSRF_RESPONSE_MATRIX_V238.md` (F-007) dan di §D.4.17 desain v2.3.8.

### 2. Percobaan gagal awal SU-T5 — TIDAK ADA log mentah (tidak dapat dipulihkan)

Re-run awal SU-T1..SU-T9 menghasilkan **8/9 × 3 run** dengan SU-T5
selalu FAIL (`no-output`) — diagnosis: `lock-racer.cjs` belum disalin
ke salinan harness v2.3.6. **Tidak ada file log mentah** dari ketiga run
gagal itu yang tersimpan; yang ada hanya diagnosis prose di
`SSRF_SPIKE_V236.md` §0.1. Kegagalan ini dicatat di sini sebagai
**NOT PRESERVED (tidak dapat dipulihkan)** — bukan direkonstruksi,
bukan ditimpa oleh rerun bersih. Rerun bersih (su-run1..3) disimpan
terpisah dan tidak menggantikan bukti kegagalan asli.

### 3. OPS-T7 — dokumen mengklaim × 3 run, hanya 2 log tersimpan

`SSRF_SPIKE_V236.md` §2.3 menulis OPS-T7 "PASS × 3 run", tetapi hanya
`opsrec-run1.txt` dan `opsrec-run2.txt` yang ada di disk. Log run
ketiga **TIDAK DITEMUKAN** (pencarian menyeluruh 2026-11-08). Status
yang benar: OPS-T7 terbukti dari **2 log**; klaim run ketiga adalah
klaim dokumentasi yang tidak dapat diverifikasi dari repo.

### 4. PIDFD-T10b — baris verdict FAIL di dalam log

`dirfd-run1.txt` / `dirfd-run2.txt` mengandung baris verdict `FAIL`
untuk PIDFD-T10b. Itu adalah verdict harness sendiri atas hipotesis
"dirfd mem-pin task lama": setelah target mati + di-reap, stat via
dirfd gagal (ESRCH) — dirfd **tidak** mem-pin task lama. Temuan yang
didokumentasikan adalah kegagalan pinning itu (lihat
`SSRF_SPIKE_V236.md` §1.3); jangan menilai ulang di sini tanpa membaca
bagian itu.

### 5. OPS-T2 dan OPS-T5 — "tidak tersedia", bukan PASS

`ops-run1/2.txt` mencatat `chattr +i/+a` TIDAK tersedia di VM ini
(OPS-T2) dan auditd/auditctl TIDAK ADA (OPS-T5). Keduanya dicatat
sebagai kontrol yang **tidak dapat dibuktikan di VM**, bukan sebagai
PASS. Keduanya tetap wajib prasyarat staging (STAGE-P12 / ST-12).

## Apa yang TIDAK ada di bundle ini

- Log mentah v2.3.2 dan v2.3.3: output run hanya ada sebagai kutipan
  verbatim di dalam `SSRF_SPIKE_V232.md` / `SSRF_SPIKE_V233.md`, bukan
  sebagai file log. Dicatat sebagai **kutipan dokumen, bukan log mentah
  terverifikasi hash**.
- Log mentah v2.3.5 (AUTH suite 18/18 × 2): tidak ada file log yang
  tersimpan; bukti berupa `SSRF_SPIKE_V235.md`. Status sama: kutipan
  dokumen, bukan log mentah.
- Log v2.3.4 (ADV-T1..T6, FLK-T1..T8): sama — hanya di dalam dokumen
  spike.

## Verifikasi ulang

Untuk memverifikasi bundle ini setelah checkout, bandingkan tiap file
dengan `.log` aslinya dan bandingkan SHA-256 dengan tabel di atas:

```sh
cd evidence/v236
for f in *.txt; do cmp -s "$f" "../../spike-harness-v236/${f%.txt}.log" && echo "OK $f" || echo "MISMATCH $f"; done
sha256sum *.txt   # bandingkan dengan kolom SHA-256 pada tabel Inventaris
```

Perbandingan `cmp` terakhir dijalankan 2026-11-08: **21/21 OK**.
