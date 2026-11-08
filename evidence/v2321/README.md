# Bukti v2.3.21 — jawaban atas audit independen V14 (F-044/F-045/F-046)

**Revisi:** v2.3.21 — jawaban atas `SSRF_INDEPENDENT_AUDIT_V14.md`
(commit `f74f0bd`, audit 2026-11-08 13:09 WIB atas v2.3.20 commit
`b543eca`) + `MUSE_DIRECTIVE_V14_ACTION_REQUIRED.md` (commit
`48c3f94`, dibaca sebagai referensi isi audit — otorisasi kerja
tetap dari tugas terjadwal: revisi desain + bukti saja).
**Tanggal run:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Bun 1.4.4 (SQLite 3.53.4), sqlite3 CLI 3.45.1, uid 0 (root), kernel
Linux 7.0.0-43-generic. Tidak ada jaringan luar, tidak ada
`checkLink`, tidak ada artifact live, tidak ada DB/katalog nyata —
semua DB adalah salinan disposable di direktori temp (mkdtemp 0700)
yang dibangun dari migrasi repo 0001–0005 (read-only) + fixture.

## Artefak yang dieksekusi (bukan copy-paste test-only)

Harness di bawah MENJALANKAN file migrasi yang sebenarnya — file
yang sama yang akan ditinjau sebagai proposal — terhadap salinan
disposable dari schema saat ini:

| File | SHA-256 | Isi |
| --- | --- | --- |
| `0006_unified_ownership_and_uniqueness_v2321.sql` (339 baris) | `6c5bcbdc4082497f682dd4d2908e71fa0f89a26bdb933c1d84b85e12edf2640c` | Migrasi 0006 teks v3 (proposal): rebuild projects (STORED + 2 CHECK bernama + provenance), checks.owner_user_id, saved_projects composite key |
| `0006_down_v2321.sql` (149 baris) | `1f1bf2a260174d5a424cfb855b74fd06f16d5e74bfd0f114104d9f5c9eac46cf` | Down migration v3 (proposal) |
| `test-f044-f045-f046-migration-v2321.ts` (1.104 baris) | `6fb8bd905726b0c88d9933fe7fd4390863588360cffbb752364f60b305def040` | Harness utama (Bun, SQLite 3.53.4): H-MIG-00..08, H-CAT-11..13, H-TEN-11..15 |
| `crash-mid-migration.ts` (29 baris) | `db0e9124037f0d5dc34841b06ba37f324008b617267ba72b3b102a1cb6a5c815` | Proses anak simulasi crash tanpa COMMIT (H-MIG-05b) |
| `run-mig-sqlite3451.sh` (143 baris) | `c0e959072bd841bb2b8d22e01ed0fd3824318ddcf06409417d2d2d776d9cac91` | Driver lintas versi (sqlite3 CLI 3.45.1): H-MIG-09 |

## Tes + log kanonik

| Tes | Log kanonik | Hasil | Menjawab |
| --- | --- | --- | --- |
| H-MIG-00..08, H-CAT-11..13, H-TEN-11..15 | `test-f044-f045-f046-migration-v2321.txt` (142 baris, 13:32:54 WIB, SHA-256 `24c314b57bbcfc665cc80d91cbbff4842cb48fc0c1ff9a29972ee2491a579167`) | **109 PASS, 0 FAIL**, exit 0 | F-044, F-045, F-046 |
| H-MIG-09 (lintas versi 3.45.1) | `test-f044-f045-f046-migration-v2321-sqlite3451.txt` (40 baris, 13:32:54 WIB, SHA-256 `3f3cecc313f7a700e3899e20b8a62559da58ca72f046b25d6a61d6231b8d5831`) | **25 PASS, 0 FAIL**, exit 0 | F-044 (versi), F-045 |

Total: **134 assertion PASS, 0 FAIL** pada log kanonik.

## Yang dibuktikan tiap kelompok

- **H-MIG-00 (F-044 reproduksi):** DDL v2.3.20 (ALTER ADD ... STORED)
  GAGAL pada tabel berisi (`cannot add a STORED column`) di 3.53.4
  dan 3.45.1. NUANSA (U-96): pada tabel KOSONG statement itu
  BERHASIL di kedua versi — DDL v2 lolos di DB dev kosong dan gagal
  di katalog produksi (12 baris). VIRTUAL ADD berhasil + index pada
  kolom VIRTUAL berfungsi (alternatif terdokumentasi, bukan yang
  dipilih — CHECK baru tetap butuh rebuild).
- **H-MIG-01/02:** migrasi v3 sukses pada salinan schema 0001–0005;
  12/2/2 baris utuh (dump JSON identik); canonical semua baris ==
  fungsi JS; insert baru dapat id 13 (AUTOINCREMENT utuh);
  foreign_key_check 0; integrity_check ok; schema hasil memuat
  generated STORED, `projects_chain_allowlist_ck`,
  `projects_contract_format_ck`, kedua unique index,
  `checks_owner_idx`, composite PK saved_projects.
- **H-MIG-03/04:** pre-check duplikat / chain tak dikenal -> abort
  sebelum BEGIN; DB byte-identik (SHA-256 sama).
- **H-MIG-05:** file migrasi disabotase (index menunjuk tabel
  tak ada) -> ROLLBACK penuh, DB byte-identik; crash tanpa COMMIT
  (proses terpisah, exit 2) -> journal memulihkan schema + 12 baris,
  DB byte-identik.
- **H-MIG-06:** backup/restore byte-identik.
- **H-MIG-07:** re-run pada DB termigrasi gagal bersih; DB tidak berubah.
- **H-MIG-08:** down migration sukses pada salinan terpisah; dump +
  table_info ketiga tabel == base; kolom kanonik/CHECK/index/owner
  hilang.
- **H-MIG-09:** migrasi v3 + down + F-045 negatif juga lolos di
  SQLite 3.45.1 (CLI) dengan file artefak yang sama (SHA-256 sama).
- **H-CAT-11 (F-045):** direct SQL INSERT/UPDATE chain tak dikenal
  DITOLAK `projects_chain_allowlist_ck` — termasuk dengan contract
  NULL (tutup bypass canonical-NULL), salah case, dan spasi; format
  salah DITOLAK `projects_contract_format_ck`; jumlah baris tetap.
- **H-CAT-12:** semua 8 chain allowlist lolos; duplikat EVM
  (case/prefix 0x/0X/whitespace) DITOLAK unique index; Solana beda
  huruf DITERIMA; alamat sama lintas chain DITERIMA; NULL boleh >1;
  duplikat nama ternormalisasi DITOLAK.
- **H-CAT-13:** fungsi JS == kolom generated DB untuk semua 12
  baris seed + korpus edge (whitespace, tanpa prefix, prefix 0X,
  Solana trim).
- **H-TEN-11..15 (F-046):** listChecks fail-closed — B hanya melihat
  baris B; legacy NULL tidak terlihat principal mana pun; predikat
  lama v2.3.20 (OR owner IS NULL) terbukti membocorkan 2 baris
  legacy ke B; deleteCheck lintas principal = 0 baris; askGibran
  hanya membaca checks principal; export legacy (admin-gated) tepat
  2 baris NULL; isolasi saved_projects pasca-rebuild (composite key
  menegakkan di DB).

## Log non-kanonik (run gagal — dipertahankan, tidak ditimpa)

| File | Isi |
| --- | --- |
| `test-f044-f045-f046-migration-v2321-run1-fail.txt` (SHA-256 `eecd5d35227d63a7ac4e3d3cb4fe02391d04e8e4c450af295d39f926b1d81c7c`, 13:28:53 WIB) | Run pertama GAGAL: DDL artefak mengandung typo sintaks v2.3.20 (`lower(trim(`contract_address'))` — U-94). Harness menangkapnya di statement #1; tidak ada DB yang berubah (semua tes hilir gagal berantai karena migrasi tidak jalan). Artefak diperbaiki (tanda kutip benar), re-run ke log kanonik. |
| `test-f044-f045-f046-migration-v2321-run2-fail.txt` (SHA-256 `5419ba1e0235775d3d1470d86e0f1ca04823c9f993a9d5839d5d3704b74e36c8`, 13:30:04 WIB) | Run kedua: 90 PASS, 5 FAIL — (1) down migration gagal: DROP COLUMN owner_user_id ditolak karena index `checks_owner_idx` masih merujuk kolom itu (diperbaiki: DROP INDEX dulu di file down); (2) CHECK format menolak alamat EVM tanpa prefix `0x` padahal fungsi aplikasi menerimanya (diperbaiki: CHECK menerima 40-hex tanpa prefix + prefix `0X`, dan ekspresi generated memakai `lower(substr(...))` — U-95); (3) tiga ekspektasi pesan error SQLite di tes salah (SQLite menyebut nama kolom/index, bukan nama index yang diduga — diperbaiki regex tes, bukan desain). Re-run ke log kanonik. |
| `test-f044-f045-f046-migration-v2321-sqlite3451-run1-fail.txt` (SHA-256 `8e7ef2f726ebd2276e57e534312386969e41c164bc2a6ed0282f42174bb12e89`, 13:31 WIB) | Run CLI pertama: 23 PASS, 1 FAIL — probe STORED ADD memakai tabel KOSONG sehingga berhasil (bukan kegagalan desain, melainkan probe yang salah: nuansa U-96 belum dipahami). Skrip diperbaiki (probe memakai tabel berisi + kasus tabel kosong terpisah), re-run ke log kanonik. |

## Temuan saat mengerjakan (bukan hanya status)

- **U-87 (koreksi faktual atas v2.3.20):** katalog dari migrasi repo
  0001–0005 adalah **12 baris, bukan 15** (12 INSERT di 0004;
  CATALOG di `actions.ts` juga 12 entri). Klaim "15 baris" v2.3.20
  §4.1/§4.3 SALAH. Migrasi v3 tidak memakai angka hardcode —
  pre-check mencatat jumlah aktual dan mensyaratkan kesamaan.
  Jumlah baris DB live TIDAK TERVERIFIKASI dari VM ini.
- **U-88:** `SSRF_REMEDIATION_DESIGN.md` tidak memiliki badan
  §D.4.31 — changelog v2.3.20 merujuknya 9×, tetapi seksinya tidak
  pernah ditulis. v2.3.21 menambahkan §D.4.32 dan TIDAK memalsukan
  §D.4.31 secara retroaktif.
- **U-94:** ekspresi generated column v2.3.20 mengandung typo
  sintaks (tanda kutip tidak cocok) — DDL v2 tidak pernah dapat
  dieksekusi apa adanya, terlepas dari isu STORED. Ditemukan karena
  harness mengeksekusi artefak, bukan menyalin teks tes.
- **U-95:** ekspresi v2.3.20 mishandle prefix `0X` (menghasilkan
  `0x0x...`) dan CHECK format v3 awal menolak alamat tanpa prefix
  yang diterima fungsi aplikasi — keduanya diperbaiki agar
  aplikasi dan DB menerima himpunan input yang SAMA.
- **U-96:** kegagalan ALTER ADD STORED bergantung isi tabel (gagal
  bila berisi baris, berhasil bila kosong) — jebakan dev/prod.

## Cara menjalankan ulang

Dari direktori ini:

```sh
bun test-f044-f045-f046-migration-v2321.ts > test-f044-f045-f046-migration-v2321.txt 2>&1
sh run-mig-sqlite3451.sh > test-f044-f045-f046-migration-v2321-sqlite3451.txt 2>&1
```

Bila ada run yang gagal: JANGAN timpa file log di atas. Simpan log
gagal dengan nama `*-run<N>-fail.txt`, perbaiki penyebabnya, lalu
re-run ke nama kanonik. Exit 0 = semua assertion PASS.
