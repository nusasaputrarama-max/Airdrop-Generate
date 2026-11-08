# Proposal Remediasi Implementation-Ready F-001..F-005 — v2.3.21

**Status: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Tanggal:** 2026-11-08 (WIB)
**Menjawab:** audit independen V14 (`SSRF_INDEPENDENT_AUDIT_V14.md`,
commit `f74f0bd`, audit 2026-11-08 13:09 WIB atas v2.3.20 commit
`b543eca`) §9 butir 1–8 — F-044, F-045, F-046, bukti migrasi atas
artefak aktual, dan carry-forward F-001..F-005 + hard gates.
Referensi isi audit tambahan: `MUSE_DIRECTIVE_V14_ACTION_REQUIRED.md`
(commit `48c3f94`) — dibaca sebagai referensi; otorisasi kerja
revisi ini berasal dari tugas terjadwal (revisi desain + bukti saja).
**Dokumen sebelumnya:** `SSRF_PROPOSAL_F001_F005_V2320.md`
(SHA-256 `a672b050…`, 1.144 baris) — dokumen ini adalah REVISI
TERARAH, bukan pengganti penuh: bagian v2.3.20 yang TIDAK disebut
di bawah tetap berlaku penuh dan dirujuk dengan nomor bagiannya;
bagian yang diubah ditulis ulang lengkap di sini, dengan log
perubahan di §7. **Dua bagian v2.3.20 SUPERSEDED oleh revisi ini:**
§4.3 (migrasi 0006 teks v2) dan kebijakan legacy checks di §4.3
langkah 1 + pseudodiff baca (§5.3 bagian checkLink tetap berlaku
kecuali yang disebut di §5 di bawah).
**Dasar desain:** `SSRF_REMEDIATION_DESIGN.md` §D.4.18 + §A + §B +
§D.4.31 (dirujuk; badannya tidak pernah ditulis — U-88) + §D.4.32
(baru, v2.3.21).

**Verifikasi basis (read-only, 2026-11-08):** `git diff --stat
f74f0bd 48c3f94` menunjukkan TIDAK ADA perubahan pada
`site/server/src/actions.ts`, `site/server/src/schema.ts`, atau
`site/drizzle/*` antara audit V14 dan directive V14 — hanya dokumen
audit/directive yang berubah. Karena itu seluruh verifikasi
file/fungsi/baris v2.3.19 (§1.1, §2.1, §3.1, §4.1, §5.1) dan
v2.3.20 (§0, §4.1) tetap berlaku tanpa verifikasi ulang, KECUALI
bila bagian di bawah menyatakan sebaliknya. Fakta baru yang
diverifikasi v2.3.21 (lihat §6):
- Katalog dari migrasi repo 0001–0005 adalah **12 baris, bukan 15**
  (12 INSERT di 0004; CATALOG di `actions.ts` juga 12 entri) —
  koreksi U-87 atas klaim v2.3.20 §4.1/§4.3.
- Desain tidak memiliki badan §D.4.31 (U-88).
- Ekspresi generated column v2.3.20 mengandung typo sintaks (U-94)
  dan mishandle prefix `0X` (U-95).
- ALTER ADD STORED gagal hanya pada tabel berisi baris (U-96).

**Yang TIDAK dilakukan dokumen ini:** tidak mengimplementasikan
apa pun; tidak menutup F-001..F-005 (status tetap OPEN/BLOCKED,
lihat §8); tidak mengubah `site/**`, package/lockfile, migration
aktual, CI, deployment, database/katalog live, atau live artifact;
tidak mengasumsikan perilaku SDK/runtime yang belum dibuktikan;
tidak mengarang owner, staging, atau bukti runtime; tidak
meng-invoke `checkLink`.

---

## §0. Cara membaca + Response to V14 Handoff (ringkas)

Pola per finding sama dengan v2.3.19 §0. Tabel keputusan v2.3.20
tetap berlaku, ditambah satu keputusan baru:

| # | Keputusan | Status v2.3.21 | Dampak bila tidak diputuskan |
| --- | --- | --- | --- |
| K-1..K-5, K-7..K-9 | (v2.3.20 §0) | TIDAK BERUBAH | lihat v2.3.20 §0 |
| K-10 | Kebijakan legacy checks (F-046): L-A default fail-closed + export legacy admin-gated; L-B single-user terkonfirmasi; L-C owner mapping berbasis bukti | **BARU (F-046). Default desain: L-A.** L-B/L-C butuh keputusan owner + bukti provider (K-10). Bila owner diam: L-A berlaku; riwayat anonim menjadi write-only sampai identitas principal ada (K-4) | Tanpa keputusan, perilaku anonim (riwayat check tanpa principal) tetap fail-closed — trade-off tercatat U-89, bukan disembunyikan |

**Jawaban atas 8 butir handoff V14 §9 (ringkas; detail lengkap +
bukti di `SSRF_RESPONSE_MATRIX_V2321.md`):**

| Butir V14 §9 | Respons v2.3.21 | Bukti |
| --- | --- | --- |
| 1. Perbaiki F-044 — migrasi SQLite | **Addressed (desain + bukti VM).** Strategi rebuild create/copy/validate/swap dipilih; teks v2 SUPERSEDED; file artefak migrasi v3 dieksekusi harness pada salinan schema saat ini; failure injection + rollback + down migration teruji; nuansa isi-tabel (U-96) + typo DDL v2 (U-94) dicatat | Proposal §4; `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql`; H-MIG-00..09 (109 PASS Bun + 25 PASS CLI) |
| 2. Perbaiki F-045 — constraint chain | **Addressed (desain + bukti VM).** CHECK bernama `projects_chain_allowlist_ck` + `projects_contract_format_ck` sebagai SQL nyata dalam rebuild; direct SQL INSERT/UPDATE negatif teruji termasuk NULL contract; inspeksi schema membuktikan constraint terpasang | Proposal §4; H-CAT-11..13 |
| 3. Selesaikan F-046 — legacy privacy | **Addressed (desain + bukti VM); keputusan owner K-10 tersisa.** Default fail-closed L-A; NULL tidak pernah dibaca sebagai publik; dua principal teruji; scope DB/action dinyatakan NOT VERIFIED (bukti provider tidak ada) | Proposal §5; H-TEN-11..15 |
| 4. Buktikan migrasi F-043 bukan sekadar mirror test | **Addressed.** Harness MENJALANKAN file artefak migrasi (SHA-256 tercatat di header log); JS canonicalization, generated column/index, direct SQL, dan rollback semuanya diuji pada DDL aktual | `evidence/v2321/`; H-MIG-01/02/05/08, H-CAT-13 |
| 5. Pertahankan F-001..F-005 OPEN/BLOCKED | **Dipatuhi.** Tidak ada finding yang ditutup; lihat §8 | Matriks §1 |
| 6. Pertahankan seluruh hard gates | **Dipatuhi.** `checkLink` tidak di-invoke; Link Scanner tidak diaktifkan; tidak ada perubahan source/migration/CI/deployment/live | Matriks §6; §8 dokumen ini |
| 7. Perbarui blocker/readiness | **Dipatuhi.** `STAGING_READINESS_V2321.md`: peran tetap UNASSIGNED; dua baris baru (versi SQLite runtime produksi, keputusan legacy K-10) | Staging readiness v2.3.21 |
| 8. Raw logs dan provenance | **Dipatuhi.** Setiap run gagal disimpan terpisah (run1/run2 + CLI run1); command, Bun/SQLite/kernel/UID, tanggal, exit code, SHA-256 file, commit SHA tercatat | `evidence/v2321/README.md` |

**Aturan pengikat v2.3.19 + v2.3.20 tetap berlaku** (satu change set =
satu finding; tiap change set membawa tes regresinya; satu kasus
negatif FAIL = finding tetap OPEN; aturan raw log §9 v2.3.20)
**ditambah aturan baru v2.3.21:** artefak migrasi yang diuji harus
file yang sama dengan yang ditinjau (SHA-256 tercatat di header
log); tes TIDAK BOLEH memakai copy-paste SQL "versi test-only".

**Alokasi test ID baru v2.3.21** (tidak menimpa ID lama):

| Kelompok | ID baru | Untuk |
| --- | --- | --- |
| H-MIG-00..09 | 00 reproduksi F-044 + nuansa isi-tabel; 01 migrasi sukses; 02 inspeksi schema; 03 pre-check duplikat; 04 pre-check chain; 05 failure injection + crash; 06 backup/restore; 07 re-run; 08 down migration; 09 lintas versi 3.45.1 | F-044 (+ F-045 lintas versi) |
| H-CAT-11..13 | 11 direct SQL negatif chain/format; 12 positif allowlist + uniqueness; 13 JS == DB canonical | F-045 (+ F-043 lanjutan) |
| H-TEN-11..15 | 11 listChecks fail-closed; 12 deleteCheck; 13 askGibran; 14 export legacy; 15 isolasi saved_projects pasca-rebuild | F-046 (+ F-040) |

---

## §4. F-004 + F-018 — Migrasi 0006 teks v3 (DITULIS ULANG — F-044/F-045)

### 4.1 Verifikasi current main (DIREVISI — koreksi U-87)

Tetap berlaku v2.3.19 §4.1 + v2.3.20 §4.1, DENGAN KOREKSI:
seed `0004` berisi **12 baris, bukan 15** — diverifikasi dengan
membangun DB disposable dari migrasi repo 0001–0005 dan menghitung
(`SELECT count(*) FROM projects` = 12; 12 INSERT di 0004; CATALOG
di `actions.ts:823` juga 12 entri). Klaim "15 baris" v2.3.20 §4.1
dan "jumlah baris HARUS tetap 15" di §4.3 teks v2 adalah SALAH dan
SUPERSEDED. **Migrasi v3 tidak memakai angka hardcode:** pre-check
mencatat jumlah aktual SEBELUM migrasi dan mensyaratkan jumlah yang
SAMA sesudahnya. Jumlah baris DB live TIDAK TERVERIFIKASI dari VM
ini (tidak ada akses ke `app.db` live, dan tidak boleh ada) —
operator wajib mencatat jumlah aktual saat migrasi. Komposisi 12
baris seed: 11 `'BNB Chain'` + 1 `'Robinhood Chain'`, 0 Solana;
semua `contract_address` non-NULL berbentuk hex EVM `0x` + 40 char
(case campuran). Fakta ini tetap membuat F-043 material seperti
v2.3.20.

### 4.2 File list (DIREVISI)

| File | Perubahan (menggantikan v2.3.20 §4.2) |
| --- | --- |
| `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql` (BARU — teks v3, artefak proposal) | SATU migrasi: rebuild `projects` (STORED + 2 CHECK bernama + provenance); `checks.owner_user_id`; rebuild `savedProjects` composite key. **BUKAN file di `site/drizzle/`** — penyalinan ke sana butuh persetujuan eksplisit terpisah + review audit berikutnya |
| `evidence/v2321/0006_down_v2321.sql` (BARU — artefak proposal) | Down migration v3 (rebuild kembali + DROP COLUMN checks; DROP INDEX dulu — lihat §4.3) |
| `site/server/src/schema.ts` | (Pseudodiff, tetap seperti v2.3.20 §4.2 DITAMBAH: definisi CHECK bernama + generated STORED + catatan lantai versi SQLite; TIDAK diubah di revisi ini) |
| `site/server/src/actions.ts` | (Pseudodiff, tetap seperti v2.3.20 §4.2 DITAMBAH §5 revisi ini untuk `listChecks`/`deleteCheck`/`askGibran` fail-closed) |
| `site/server/src/catalog.ts` | (Tetap v2.3.20 §4.2; SATU fungsi `canonicalizeContractAddress()` — kini HARUS menerima himpunan input yang SAMA dengan CHECK DB: prefix `0x`/`0X` + 40 hex, atau 40 hex tanpa prefix; lihat §4.3b) |
| `evidence/v2321/test-f044-f045-f046-migration-v2321.ts` + `crash-mid-migration.ts` + `run-mig-sqlite3451.sh` (BARU) | Harness yang MENJALANKAN artefak migrasi di atas (bukan mirror) |

### 4.3 Pseudodiff — migrasi `0006` v3 (SATU migrasi koheren, menggantikan teks v2.3.20)

File lengkap: `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql`
(SHA-256 `6c5bcbdc4082497f682dd4d2908e71fa0f89a26bdb933c1d84b85e12edf2640c`,
339 baris). Ringkasan terstruktur di bawah; bila ada perbedaan
antara ringkasan ini dan file artefak, **file artefak yang
berlaku** (itulah yang dieksekusi harness).

**Keputusan pendekatan (F-044) — rebuild, bukan ALTER, bukan VIRTUAL,
bukan kolom biasa:**

| Pendekatan | Putusan | Alasan |
| --- | --- | --- |
| Rebuild create/copy/validate/swap (STORED) | **DIPILIH** | Satu-satunya pendekatan yang sekaligus (a) memberi STORED generated column pada tabel berisi baris, (b) menambahkan CHECK constraint (F-045) — yang TIDAK DAPAT ditambahkan via ALTER TABLE — dan (c) me-rework PK `savedProjects`, dalam SATU transaksi atomik. Prosedur 12 langkah SQLite yang terdokumentasi; setiap langkah teruji (H-MIG-01..09) |
| VIRTUAL via ALTER TABLE ADD COLUMN | DITOLAK untuk revisi ini (terdokumentasi sebagai fallback) | Secara teknis valid (H-MIG-00b/c: ADD berhasil, index pada VIRTUAL berfungsi) — TETAPI CHECK chain tetap membutuhkan rebuild, sehingga VIRTUAL tidak menghemat apa pun; beralih ke VIRTUAL juga mengubah semantik read-path (rekomputasi per probe index) dan membatalkan penalaran v2.3.20 (H-CAT-10) tanpa keuntungan. Dicatat sebagai fallback bila STORED terbukti bermasalah di runtime target |
| Kolom biasa diisi aplikasi | DITOLAK | Sumber kebenaran kanonik menjadi kode aplikasi, bukan DB; butuh kontrol audit/repair transaksional terpisah yang belum dirancang; melanggar prinsip "DB menegakkan" F-045 |
| ALTER ADD STORED (teks v2) | SUPERSEDED — TIDAK BOLEH dijalankan | Gagal pada tabel berisi baris (`cannot add a STORED column`, H-MIG-00a, kedua versi SQLite); berhasil pada tabel kosong (U-96) — perilaku bergantung isi tabel |

**Persyaratan versi SQLite:** up migration >= 3.31.0 (generated
columns); down migration >= 3.35.0 (ALTER TABLE DROP COLUMN).
Teruji: 3.53.4 (Bun 1.4.4, `bun:sqlite`) dan 3.45.1 (CLI sqlite3).
Versi SQLite runtime artifact produksi **TIDAK TERVERIFIKASI**
(U-90) — STAGE-P01 wajib mencatatnya sebelum implementasi; bila
runtime produksi di bawah 3.31.0, migrasi ini TIDAK BOLEH dijalankan.

**Fase 0 (operator, di luar file):** backup file DB (salin file +
catat SHA-256 + jumlah baris per tabel); verifikasi backup dapat
di-restore (H-MIG-06). Tanpa backup terverifikasi: JANGAN lanjut.

**Fase 1 — Pre-check (read-only, SEBELUM BEGIN; tiap VALIDATION
harus 0 baris, bila tidak ABORT tanpa mengubah apa pun):**
- V1: duplikat nama ternormalisasi (`lower(trim(name))`).
- V2: duplikat alamat kanonik per chain dengan ekspresi kanonik
  v3 (IDENTIK dengan definisi generated column — bukan `lower()`
  mentah, F-043).
- V3 (F-045): chain di luar allowlist.
- V4: alamat berformat tidak valid untuk tipe chain-nya (EVM:
  `0x`/`0X` + 40 hex ATAU 40 hex tanpa prefix; Solana: 32–44 char
  base58 tanpa `0/O/I/l`/spasi).
- V5: tidak ada trigger/view yang merujuk `projects` (saat ini 0).
- V6: runner memeriksa `PRAGMA table_info(checks)` — kolom
  `owner_user_id` belum ada (mencegah re-run diam-diam).

**Fase 2 — Transaksi tunggal (atomik; satu kegagalan = ROLLBACK):**
urutan mengikuti prosedur 12 langkah SQLite:
1. `PRAGMA foreign_keys = OFF` (di luar transaksi — no-op di
   dalamnya).
2. `BEGIN IMMEDIATE`.
3. Simpan AUTOINCREMENT sequence ke tabel temp `_mig_saved_seq`.
4. `CREATE TABLE projects_new (...)` — SEMUA kolom 0003 + kolom
   kanonik STORED + `provenance_*` (nullable) + DUA CHECK bernama
   (lihat bawah).
5. `INSERT INTO projects_new (...) SELECT ... FROM projects`
   (daftar kolom eksplisit; kolom generated TIDAK ditulis).
6. VALIDATION V7 (jumlah baris sama), V8 (tidak ada canonical NULL
   untuk contract non-NULL), V9 (tidak ada duplikat kanonik di tabel
   baru) — bila ada baris: ROLLBACK.
7. `DROP TABLE projects; ALTER TABLE projects_new RENAME TO projects;`
8. Pulihkan `sqlite_sequence` (DELETE + INSERT dari temp; deterministik
   apa pun perilaku rename — H-MIG-01h membuktikan id lanjut 13).
9. `CREATE UNIQUE INDEX projects_name_normalized_unique` +
   `projects_contract_normalized_unique` (partial,
   `WHERE contract_address IS NOT NULL`).
10. `ALTER TABLE checks ADD COLUMN owner_user_id text` (kolom biasa
    — valid via ALTER) + `CREATE INDEX checks_owner_idx`.
11. Rebuild `saved_projects` ke composite key
    `(principal_id, project_id)` + sentinel `'<LEGACY>'` (F-040;
    data lama `principal_id = '<LEGACY>'`).
12. VALIDATION V10 (`PRAGMA foreign_key_check` = 0 baris), V11
    (`PRAGMA integrity_check` = `'ok'`).
13. `COMMIT; PRAGMA foreign_keys = ON;`

**Fase 3 — Post-check (read-only):** jumlah baris == sebelum
migrasi; `sqlite_master` memuat artefak bernama; INSERT percobaan
chain tak dikenal DITOLAK (H-CAT-11, dijalankan harness pada
salinan, bukan pada DB hasil yang akan dipakai).

**3a. Peta chain → tipe alamat (K-8; TABEL MENGIKAT, tidak berubah):**
EVM family (hex, case-insensitive): 'BNB Chain', 'Ethereum',
'Base', 'Arbitrum', 'Polygon', 'opBNB', 'Robinhood Chain'.
Solana family (base58, case-sensitive): 'Solana'.
Chain di luar peta → INSERT DITOLAK (CHECK constraint di bawah +
pre-check aplikasi). Memperluas peta = keputusan owner + migrasi,
bukan tebakan implementor.

**3b. Kanonikalisasi (SATU aturan, dipakai aplikasi DAN DB) —
DIREVISI (U-95):**
- EVM: trim → strip prefix `0x` ATAU `0X` (bila ada) → lowercase →
  simpan dengan prefix `'0x'` (`'0x'` + hex lowercase 40 char).
  Validasi: 40 char hex, dengan ATAU tanpa prefix `0x`/`0X`;
  selain itu REJECT. **Koreksi atas v2.3.20:** ekspresi v2 memakai
  `substr(...,1,2) = '0x'` (case-sensitive) sehingga input `'0X...'`
  akan menjadi `'0x0x...'` — SALAH. Ekspresi v3 memakai
  `lower(substr(trim(...),1,2)) = '0x'`.
- Solana: trim SAJA (huruf TIDAK diubah). Validasi: 32..44 char
  base58 (tanpa 0/O/I/l/spasi); selain itu REJECT.
- NULL → NULL (tidak masuk unique index).
- **Himpunan input yang diterima aplikasi dan DB HARUS SAMA:**
  fungsi JS menerima prefix `0x`/`0X` + 40 hex atau 40 hex tanpa
  prefix; CHECK DB menerima himpunan yang sama (H-CAT-12c/12d2
  membuktikan ketidaksamaan lama sudah ditutup).

**3c. Kolom kanonik (generated, STORED) — DITULIS ULANG:**
```sql
`contract_address_canonical` text GENERATED ALWAYS AS (
  CASE
    WHEN `contract_address` IS NULL THEN NULL
    WHEN `chain` = 'Solana' THEN trim(`contract_address`)
    WHEN `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
      CASE WHEN lower(substr(trim(`contract_address`),1,2)) = '0x'
           THEN '0x' || lower(substr(trim(`contract_address`),3))
           ELSE '0x' || lower(trim(`contract_address`)) END
    ELSE NULL
  END
) STORED
```
**Koreksi U-94:** teks v2 menulis
`lower(trim(`contract_address'))` — backtick dibuka, single-quote
menutup — sintaks tidak valid; DDL v2 tidak pernah dapat
dieksekusi apa adanya (harness run1 menangkapnya di statement #1).
Teks v3 memakai ``lower(trim(`contract_address`))`` yang benar.
Cabang `ELSE NULL` tidak terjangkau untuk alamat non-NULL karena
CHECK chain menolak chain tak dikenal LEBIH DULU — NULL canonical
hanya dari `contract_address` NULL (benar).

**3d. CHECK constraint chain + format (F-045) — BARU, SQL nyata:**
```sql
CONSTRAINT `projects_chain_allowlist_ck` CHECK (
  `chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')
),
CONSTRAINT `projects_contract_format_ck` CHECK (
  `contract_address` IS NULL
  OR (`chain` = 'Solana'
    AND length(trim(`contract_address`)) BETWEEN 32 AND 44
    AND trim(`contract_address`) NOT GLOB '*[0OlI]*'
    AND trim(`contract_address`) NOT GLOB '* *')
  OR (`chain` IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
    AND (
      (length(trim(`contract_address`)) = 42
       AND lower(substr(trim(`contract_address`),1,2)) = '0x'
       AND substr(trim(`contract_address`),3) NOT GLOB '*[^0-9a-fA-F]*')
      OR
      (length(trim(`contract_address`)) = 40
       AND trim(`contract_address`) NOT GLOB '*[^0-9a-fA-F]*')
    ))
)
```
Kedua constraint BERNAMA eksplisit agar dapat diperiksa di
`sqlite_master` (H-MIG-02b/c) dan dikenali di pesan error
(H-CAT-11). CHECK chain menolak chain tak dikenal pada INSERT DAN
UPDATE, termasuk bila `contract_address` NULL — menutup bypass
canonical-NULL yang ditunjukkan audit V14 §4 F-045 (H-CAT-11
membuktikan langsung).

**3e. Unique index — DUA index terpisah (tidak berubah dari v2.3.20):**
(a) `projects_name_normalized_unique` pada `lower(trim(name))`;
(b) `projects_contract_normalized_unique` pada
`(chain, contract_address_canonical) WHERE contract_address IS NOT NULL`.
Scope: global lintas tenant (F-040). Alamat SAMA di chain BERBEDA =
baris BERBEDA. Alamat Solana beda huruf = alamat BERBEDA. Alamat EVM
beda case/prefix/whitespace = alamat SAMA (ditolak). NULL tidak
pernah cocok.

**Langkah 4: kolom provenance (TETAP dari v2.3.19 §5.2):**
`provenance_source_url`, `provenance_submitted_by`,
`provenance_verified_by` — diisi SERVER (bukan dari args caller);
bagian dari tabel baru (nullable), bukan ADD COLUMN terpisah.

**Down migration (rollback):** file
`evidence/v2321/0006_down_v2321.sql` (SHA-256 `1f1bf2a2…`).
Rebuild `projects` ke definisi 0003; DROP kedua unique index
(otomatis bersama DROP TABLE — tidak perlu statement terpisah);
`DROP INDEX IF EXISTS checks_owner_idx` DULU, baru
`ALTER TABLE checks DROP COLUMN owner_user_id` — **urutan ini
mengikat**: DROP COLUMN gagal bila index masih merujuk kolom itu
(dibuktikan H-MIG-08 run2: `error in index checks_owner_idx after
drop column`); rebuild `savedProjects` ke PK `projectId` saja.
Pre-check V-D1 menolak bila ada baris `saved_projects` dengan
`principal_id <> '<LEGACY>'` (state per-principal baru akan hilang);
V-D2 mencatat baris checks ber-owner (nilainya hilang bersama
kolom — butuh persetujuan operator). Data katalog TIDAK dihapus;
jumlah baris HARUS sama. Down migration HANYA boleh dijalankan bila
belum ada state per-principal baru; bila sudah ada, rollback =
restore dari backup Fase 0. Down migration butuh SQLite >= 3.35.0.

```diff
 // addProject(): baris ~1197-1262 — TETAP seperti v2.3.20 §4.3,
 // DITAMBAH satu baris: pre-check aplikasi HARUS memakai himpunan
 // input yang sama dengan CHECK DB (§4.3b — prefix 0x/0X + 40 hex,
 // atau 40 hex tanpa prefix). Bila canonicalizeContractAddress()
 // menerima input yang CHECK tolak (atau sebaliknya), migrasi
 // GAGAL di H-CAT-12 (diuji) — ketidakcocokan itu BUKAN ditoleransi.
+  // 1a. canonicalizeContractAddress(chain, contract_address) —
+  //    throw bila chain tak dikenal / alamat tidak valid (fail-closed).
+  //    Aturan ini IDENTIK dengan CHECK DB (§4.3b/3d); H-CAT-13
+  //    membuktikan kesamaan JS == DB untuk semua baris + edge.
```

```diff
 // Semua baca katalog — model GLOBAL (F-040; TETAP v2.3.20 §4.3,
 // KECUALI baris legacy checks — lihat §5 revisi ini):
   listProjects: TANPA filter owner — SEMUA principal melihat katalog
     global yang sama (12 baris). Mutasi katalog lewat gerbang §5.
-  listChecks / deleteCheck: WHERE owner_user_id = <principal>
-    OR owner_user_id IS NULL (riwayat anonim/legacy tetap terbaca
-    publik seperti sekarang — BARIS INI DIHAPUS v2.3.21, F-046).
+  listChecks / deleteCheck / askGibran: fail-closed, lihat §5.
   setProjectState / savedProjects: WHERE principal_id = <principal>
     AND project_id = ... (TETAP — composite key menjamin di DB).
```

### 4.4 Threat model (DITAMBAH dua baris)

Tetap berlaku v2.3.19 §4.4 + v2.3.20 §4.4, DITAMBAH:

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Penulis data lain / jalur seed / bug action | INSERT/UPDATE langsung ke DB dengan chain tak dikenal (bypass validasi aplikasi) | Baris lolos ke katalog — CHECK `projects_chain_allowlist_ck` menolak di lapisan DB (H-CAT-11) |
| Penulis data lain | INSERT chain tak dikenal + contract NULL (coba jadikan canonical NULL agar lolos unique index) | Baris lolos — CHECK chain menolak terlepas dari NULL (H-CAT-11) |
| Operator migrasi (lama) | Menjalankan migrasi v2.3.20 (teks v2) | — TIDAK BOLEH: teks v2 SUPERSEDED; DDL-nya gagal pada tabel berisi (H-MIG-00a) DAN mengandung typo sintaks (U-94). Bila sudah terlanjur dicoba di staging, DB tidak berubah (gagal sebelum/selama transaksi — rollback) |

### 4.5 Matriks tes — H-CAT-01..10 (tetap) + H-CAT-11..13 + H-MIG-00..09 + H-TEN-11..15 (BARU)

H-CAT-01..10 dan H-TEN-01..05 + H-TEN-08..10 tetap berlaku
(v2.3.19 §4.5 + v2.3.20 §4.5) dengan SATU koreksi: kasus-kasusnya
kini memakai aturan kanonik v3 §4.3b (prefix `0x`/`0X` + 40 hex,
atau 40 hex tanpa prefix; bukan hanya `0x` lowercase).

| ID | Kasus (BARU) | Setup | PASS yang diharapkan | FAIL yang diharapkan |
| --- | --- | --- | --- | --- |
| H-MIG-00 | Reproduksi F-044 + nuansa isi-tabel | ALTER ADD STORED pada tabel berisi vs kosong, di 3.53.4 + 3.45.1; VIRTUAL ADD + index | Berisi → gagal `cannot add a STORED column` (kedua versi); kosong → berhasil (U-96); VIRTUAL berhasil + index berfungsi | Hasil berbeda antar versi |
| H-MIG-01 | Migrasi v3 sukses | Salinan disposable schema 0001–0005 + fixture; jalankan file artefak v3 | 12/2/2 baris utuh; dump identik; id lanjut 13; FK 0; integrity ok | Satu nilai berubah/hilang |
| H-MIG-02 | Inspeksi schema | `sqlite_master` + `PRAGMA table_info` pasca-migrasi | STORED + 2 CHECK bernama + 2 unique index + owner + composite PK ada; base TIDAK punya | Satu artefak hilang |
| H-MIG-03 | Pre-check duplikat | Injeksi duplikat nama/alamat EVM beda case | Abort sebelum BEGIN; DB byte-identik | Satu byte berubah |
| H-MIG-04 | Pre-check chain tak dikenal | Injeksi baris chain `'Fake Chain'` | Abort sebelum BEGIN; DB byte-identik | Satu byte berubah |
| H-MIG-05 | Failure injection tengah transaksi + crash | (a) file migrasi disabotase (index ke tabel tak ada); (b) proses terpisah mati tanpa COMMIT | (a) ROLLBACK, DB byte-identik; (b) journal pulihkan schema + 12 baris, DB byte-identik | Data hilang/berubah sebagian |
| H-MIG-06 | Backup/restore | Backup file → migrasi salinan kerja → restore | Restore byte-identik dengan backup; schema lama | Hash berbeda |
| H-MIG-07 | Re-run | Jalankan file v3 pada DB termigrasi | Gagal bersih; DB tidak berubah | Perubahan sebagian |
| H-MIG-08 | Down migration | Jalankan file down pada salinan terpisah | Sukses; dump + table_info == base; artefak v3 hilang | Satu nilai hilang |
| H-MIG-09 | Lintas versi 3.45.1 | Skrip CLI menjalankan file artefak yang SAMA (SHA-256 sama) | Migrasi + down + F-045 negatif lolos di 3.45.1 | Gagal di satu versi |
| H-CAT-11 | F-045 direct SQL negatif | INSERT/UPDATE chain tak dikenal (termasuk NULL contract), salah case/spasi, format salah — langsung SQL, bukan via helper aplikasi | Semua DITOLAK CHECK bernama; jumlah baris tetap | Satu pun lolos |
| H-CAT-12 | F-045 positif + uniqueness | 8 chain allowlist; duplikat EVM (case/0x/0X/whitespace); Solana beda huruf; lintas chain; NULL; duplikat nama | Sesuai tabel §4.3b/3e | Satu pun menyimpang |
| H-CAT-13 | JS == DB canonical | Semua 12 baris seed + korpus edge (whitespace, tanpa prefix, `0X`, Solana trim) | 100% cocok | Satu ketidakcocokan |
| H-TEN-11 | listChecks fail-closed | Principal A (2 baris), B (1 baris), legacy NULL (2 baris), satu DB | B hanya melihat baris B; legacy tidak terlihat siapa pun; predikat lama terbukti bocor | Satu baris lintas principal terlihat |
| H-TEN-12 | deleteCheck | DELETE lintas principal + legacy + sendiri + id tak ada | Lintas principal/legacy = 0 baris; sendiri = 1; tak ada = 0; baris korban tetap ada | Satu baris terhapus oleh bukan pemilik |
| H-TEN-13 | askGibran scope | Subquery checks untuk principal A, limit 10 | Hanya baris A | Baris B/legacy masuk |
| H-TEN-14 | Export legacy (admin-gated) | Predikat `owner_user_id IS NULL` | Tepat 2 baris NULL; gate §5 TIDAK diuji di sini | Jumlah berbeda |
| H-TEN-15 | Isolasi saved_projects pasca-rebuild | State A vs B proyek sama; baris `'<LEGACY>'` | State independen; legacy utuh; duplikat composite key ditolak DB | State tertimpa |

Bukti VM untuk H-MIG-00..09, H-CAT-11..13, H-TEN-11..15 sudah
ada: `evidence/v2321/test-f044-f045-f046-migration-v2321.txt`
(109 assert PASS) + `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451.txt`
(25 assert PASS). Bukti VM atas MEKANISME + ARTEFAK, bukan atas
migrasi staging — H-MIG-01..09, H-CAT-11..13, H-TEN-11..15 di
staging tetap wajib.

**Kriteria penerimaan F-004 + F-018 (diperbarui):** hitung baris di
DB setelah tiap run cocok dengan yang dinyatakan (H-CAT-01..13),
isolasi tenant terbukti dua arah (H-TEN-01..05 + H-TEN-08..15),
migrasi gagal aman pada H-CAT-05/06 + H-MIG-03/04/05/07, katalog
tetap 12 baris (repo) dan GLOBAL (tidak ter-backfill ke satu owner),
migrasi v3 + down teruji pada artefak aktual di DUA versi SQLite,
di staging.

### 4.6 Dependensi staging, rollback, risiko tersisa

Tetap berlaku v2.3.19 §4.6 + v2.3.20 §4.6, DITAMBAH:
- **Dependensi staging:** STAGE-P01..P12 (DB staging + runtime
  staging), keputusan G-C (ratifikasi model global), K-9 (service
  principal), K-10 (kebijakan legacy — §5), backup katalog sebelum
  migrasi, **versi SQLite runtime produksi tercatat (U-90)**.
- **Rollback:** down migration (§4.3) bila belum ada insert/state
  baru; bila sudah ada → restore dari backup Fase 0. Rollback
  TIDAK menghapus data katalog. **Peringatan:** teks migrasi
  v2.3.19 (backfill) dan v2.3.20 (ALTER ADD STORED + typo) TIDAK
  BOLEH dipakai sebagai rollback maupun sebagai migrasi.
- **Risiko tersisa:** U-80 + U-82 + U-86 (tetap, v2.3.20 §4.6);
  **U-87** (koreksi jumlah baris — jumlah DB live tidak
  terverifikasi); **U-90** (versi SQLite runtime produksi tidak
  terverifikasi); **U-93** (validasi di file SQL tidak self-aborting
  di luar runner — penegakan ada pada runner; harness adalah runner
  referensi); **U-94** (typo DDL v2 — sudah diperbaiki di v3, tetapi
  menunjukkan DDL proposal harus selalu dieksekusi harness sebelum
  diklaim siap); **U-95** (kesamaan himpunan input app-vs-DB —
  diperbaiki di v3, harus dijaga tiap kali aturan kanonik berubah);
  **U-96** (ALTER ADD STORED bergantung isi tabel — jebakan dev/prod).

### 4.7 Cabang alternatif — bila owner MENOLAK model global (dicatat, bukan dikerjakan)

Tetap berlaku v2.3.19 §4.7 + v2.3.20 §4.7 (tidak berubah).

---

## §5. F-005 + F-018 + F-046 — Kebijakan legacy checks fail-closed (DITULIS ULANG)

### 5.1 Status scope database/action (F-046 — dinyatakan eksplisit)

**Scope database/action (single-user vs multi-user): NOT VERIFIED.**
Tidak ada dokumentasi provider atau pernyataan tertulis yang
membuktikan apakah `ctx.db` (app.db) dipakai oleh satu principal
saja atau bersama oleh banyak principal, dan tidak ada bukti
identitas principal di runtime saat ini (mekanisme identitas adalah
keputusan K-4 yang belum diputuskan). Karena itu desain ini
**MENGASUMSIKAN MULTI-USER** sampai terbukti sebaliknya — asumsi
yang paling aman. Bila bukti provider tersedia nanti, kebijakan
dapat dilonggarkan HANYA melalui keputusan owner K-10 + revisi
desain, bukan diam-diam.

### 5.2 Kebijakan (menggantikan v2.3.20 §4.3 langkah 1 + pseudodiff baca)

**Default (L-A, berlaku bila owner diam): FAIL-CLOSED.**
- `owner_user_id = NULL` berarti **"tanpa pemilik tercatat"** —
  BUKAN "publik", BUKAN "milik admin", BUKAN "milik semua orang".
- Baris legacy NULL **tidak pernah** dikembalikan ke principal
  biasa oleh query apa pun. Satu-satunya jalan membaca baris NULL
  adalah fungsi export legacy yang digerbang otorisasi §5 (admin /
  service principal) — lihat bawah.
- Alasan: riwayat check memuat URL yang diperiksa, domain, waktu,
  dan detail sinyal — membocorkannya ke semua principal adalah
  kebocoran aktivitas/tautan privat bila runtime ternyata shared.

**Opsi kebijakan legacy (keputusan owner K-10):**

| Opsi | Isi | Syarat | Status |
| --- | --- | --- | --- |
| L-A (default desain) | NULL tidak terlihat principal biasa; export legacy hanya via fungsi admin-gated | Tidak butuh apa pun (berlaku sekarang) | **Dipilih sebagai default** |
| L-B | Deployment TERBUKTI single-user: satu principal boleh membaca baris NULL miliknya | Bukti provider tertulis tentang scope `ctx.db` + keputusan owner eksplisit | NOT VERIFIED — tidak dapat dipilih sekarang |
| L-C | Owner mapping berbasis bukti: baris legacy dipetakan ke principal tertentu | Bukti pemetaan (mis. log sesi/IP) per baris; tanpa bukti, TIDAK ADA pemetaan | Tidak tersedia — tidak ada bukti pemetaan |

**Migrasi TIDAK menulis ulang kepemilikan:** baris legacy tetap
NULL (tidak ditebak pemiliknya, tidak di-backfill ke sentinel —
berbeda dengan `savedProjects` yang memakai sentinel `'<LEGACY>'`
karena PK composite tidak boleh NULL). Kebijakan ditegakkan pada
PREDIKAT query, bukan dengan menulis ulang data.

**Konsekuensi produk yang dicatat jujur (U-89):** sampai identitas
principal ada (K-4), check yang dibuat pengunjung anonim (owner
NULL) menjadi write-only — tersimpan tetapi tidak terlihat kembali
oleh pembuatnya. Itu harga fail-closed. Alternatif (principal anonim
per-browser) adalah mekanisme baru yang belum dirancang dan butuh
keputusan K-4/K-10 — TIDAK ditebak di sini.

### 5.3 Pseudodiff — baca/tulis checks (menggantikan v2.3.20 §4.3 pseudodiff baca)

```diff
 // listChecks — v2.3.20: WHERE owner_user_id = <principal>
 //   OR owner_user_id IS NULL (BOCOR — F-046; DIHAPUS).
+  listChecks: WHERE owner_user_id = <principal> SAJA.
+    Baris NULL tidak pernah cocok dengan `=` — legacy tidak
+    terlihat oleh konstruksi query, bukan hanya oleh filter.
+    Bila <principal> tidak diketahui (anonim): kembalikan HANYA
+    baris dengan owner = <principal anonim sesi itu> bila mekanisme
+    K-4 menyediakannya; bila tidak ada principal sama sekali,
+    kembalikan daftar KOSONG (bukan semua baris, bukan baris NULL).
 // deleteCheck — v2.3.20: DELETE WHERE id = ? (tanpa filter owner).
+  deleteCheck: DELETE FROM checks
+    WHERE id = ? AND owner_user_id = <principal>;
+    affected-rows HARUS tepat 1 — bila 0, respons "tidak ditemukan"
+    (bukan "dilarang" — tidak membocorkan keberadaan baris milik
+    orang lain). Baris NULL tidak dapat dihapus principal biasa
+    (0 baris — H-TEN-12c).
 // askGibran — v2.3.20: membaca checks milik principal (+ NULL legacy).
+  askGibran: subquery checks HANYA
+    WHERE owner_user_id = <principal> ORDER BY id DESC LIMIT 10.
+    Riwayat legacy NULL TIDAK masuk prompt. Katalog (projects)
+    tetap dibaca GLOBAL (F-040) — katalog bukan data per-principal.
 // setProjectState / savedProjects: TETAP (composite key).
 // addProject: TETAP (gerbang §5; katalog global).
 // runCheck (penulis checkLink): INSERT baru menulis
 //   owner_user_id = <principal> bila diketahui, NULL bila anonim.
 //   NULL di sini berarti "dibuat tanpa principal tercatat" dan
 //   tunduk pada kebijakan L-A di atas.
+// exportLegacyChecks (BARU, fungsi terpisah — BUKAN bagian dari
+//   listChecks): SELECT ... WHERE owner_user_id IS NULL — HANYA
+//   untuk admin/service principal lewat gerbang §5 (audit/migrasi
+//   data legacy). TIDAK PERNAH dipanggil dari UI pengguna biasa.
+//   Gate §5-nya sendiri belum diimplementasikan/diuji (F-005 tetap
+//   OPEN) — predikat SQL-nya diuji (H-TEN-14), gerbangnya tidak.
```

### 5.4 Threat model (F-046)

| Penyerang | Kemampuan | Yang harus tetap mustahil |
| --- | --- | --- |
| Principal B | Mengetahui id check milik A / menebak id legacy | Membaca/menghapus riwayat A atau legacy (predikat owner + affected-rows; H-TEN-11/12) |
| Principal B | Enumerasi: memanggil listChecks dengan limit besar / id berurutan | Menginferensi keberadaan riwayat A/legacy (respons "tidak ditemukan" generik; tidak ada perbedaan error) |
| Pengunjung anonim | Memanggil listChecks tanpa principal | Melihat riwayat siapa pun, termasuk legacy (daftar kosong bila tanpa principal) |
| Admin export | Memanggil exportLegacyChecks | Dipakai pengguna biasa — fungsi terpisah + gerbang §5; bukan bagian listChecks |

---

## §6. Verifikasi baru v2.3.21 (fakta yang diukur, bukan diklaim)

| # | Fakta | Cara verifikasi | Hasil |
| --- | --- | --- | --- |
| 1 | Katalog repo = 12 baris | Bangun DB dari 0001–0005, `SELECT count(*)` | 12 (U-87) |
| 2 | §D.4.31 tidak ada badannya | `grep` heading §D.4.31 di desain | 0 heading; 9 referensi di changelog/header (U-88) |
| 3 | DDL v2.3.20 gagal pada tabel berisi | H-MIG-00a (3.53.4 + 3.45.1) | `cannot add a STORED column` (F-044) |
| 4 | DDL v2.3.20 berhasil pada tabel kosong | H-MIG-00e (3.53.4) + CLI (3.45.1) | Berhasil (U-96) |
| 5 | DDL v2 mengandung typo sintaks | Harness run1 gagal di statement #1 | `lower(trim(`contract_address'))` (U-94) |
| 6 | Ekspresi v2 mishandle `0X` | H-CAT-12d2 + H-CAT-13b | `'0X...'` → `'0x0x...'` di v2; benar di v3 (U-95) |
| 7 | CHECK format v3 awal ≠ fungsi aplikasi | Harness run2, H-CAT-12c | CHECK menolak alamat tanpa prefix yang diterima aplikasi; diperbaiki (U-95) |
| 8 | DROP COLUMN gagal bila index merujuk kolom | Harness run2, H-MIG-08a | `error in index checks_owner_idx after drop column`; diperbaiki dengan DROP INDEX dulu |
| 9 | Versi SQLite VM | `SELECT sqlite_version()` | Bun 3.53.4; CLI 3.45.1; runtime produksi NOT VERIFIED (U-90) |
| 10 | Scope `ctx.db` | Pencarian dokumen provider di repo | Tidak ada bukti → NOT VERIFIED (F-046) |

---

## §7. Log perubahan v2.3.21 + Decision Log

### Log perubahan (vs v2.3.20)

| # | Lokasi | Perubahan |
| --- | --- | --- |
| 1 | §4.1, §4.3 Fase 1 | **Koreksi U-87:** katalog 12 baris (bukan 15); pre-check memakai jumlah aktual, bukan hardcode |
| 2 | §4.3 (keseluruhan) | **Migrasi 0006 teks v3:** rebuild gantikan ALTER ADD STORED; CHECK bernama; format CHECK menerima 40-hex tanpa prefix + `0X`; ekspresi generated memakai `lower(substr(...))`; down migration dengan DROP INDEX dulu |
| 3 | §4.3b | **Koreksi U-95:** aturan kanonik EVM menerima prefix `0x`/`0X` + 40 hex, atau 40 hex tanpa prefix; himpunan input app == DB |
| 4 | §5 (baru) | **F-046:** kebijakan legacy fail-closed L-A (default); opsi L-B/L-C + keputusan K-10; pseudodiff `listChecks`/`deleteCheck`/`askGibran`/`exportLegacyChecks` |
| 5 | §4.5 | Test ID baru H-MIG-00..09, H-CAT-11..13, H-TEN-11..15 |
| 6 | §6 (baru) | Tabel verifikasi baru (fakta yang diukur) |
| 7 | Lampiran B | Risiko baru U-87..U-96 |

### Decision Log (pilihan desain + alternatif ditolak + keputusan owner yang masih dibutuhkan)

| # | Pilihan | Alternatif ditolak + alasan | Keputusan owner yang masih dibutuhkan |
| --- | --- | --- | --- |
| D-1 | Rebuild STORED (F-044) | VIRTUAL (butuh rebuild juga untuk CHECK; ubah semantik read-path tanpa keuntungan); kolom biasa (sumber kebenaran pindah ke aplikasi); ALTER ADD STORED (gagal pada tabel berisi + typo) | — (pilihan desain; ratifikasi ikut G-K) |
| D-2 | CHECK bernama + format CHECK (F-045) | Hanya pre-check migrasi + validasi aplikasi (tidak menegakkan di DB — itulah temuan F-045); CHECK tanpa nama (tidak dapat diperiksa/dikenali di error) | — |
| D-3 | Format CHECK menerima 40-hex tanpa prefix + `0X` | Hanya 42-char `0x` (bertentangan dengan fungsi aplikasi yang menerima tanpa prefix/`0X` — ketidakcocokan app-vs-DB) | — |
| D-4 | Fail-closed L-A sebagai default (F-046) | Predikat lama `OR owner IS NULL` (membocorkan legacy — dibuktikan H-TEN-11d); backfill NULL ke satu owner (menebak pemilik); sentinel legacy untuk checks (tidak perlu — NULL + predikat sudah cukup; sentinel hanya untuk PK composite) | K-10: pilih L-A/L-B/L-C; L-B butuh bukti provider scope; L-C butuh bukti pemetaan |
| D-5 | Validasi SQL ditegakkan runner, bukan self-aborting (U-93) | RAISE() di SELECT biasa (tidak valid di SQLite — hanya trigger/CHECK); CHECK pada tabel temp (hack, tidak transparan) | — (keterbatasan dicatat; runner referensi = harness) |
| D-6 | Angka baris tidak di-hardcode (U-87) | Hardcode 15 (salah) / hardcode 12 (rapuh bila seed berubah) | Operator mencatat jumlah aktual DB live saat migrasi |
| D-7 | Versi minimum SQLite 3.31.0 (up) / 3.35.0 (down) | Tanpa lantai versi (migrasi dapat dijalankan di runtime yang tidak mendukung generated columns/DROP COLUMN) | STAGE-P01 mencatat versi runtime produksi (U-90) |

---

## §8. Status F-001..F-005 + hard gates (TETAP)

F-001, F-002, F-003, F-004, F-005 tetap **OPEN/BLOCKED** — revisi
ini memperbaiki DESAIN migrasi + kebijakan privasi dan membuktikannya
di VM atas artefak aktual; bukan implementasi. F-019, F-028, F-030
tetap BLOCKED/NOT VERIFIED. F-038..F-043 tetap addressed di level
desain/VM (v2.3.20); F-044, F-045, F-046 kini addressed di level
desain + bukti VM atas artefak (lihat matriks §2) — status
F-001..F-005 TIDAK berubah karenanya. `checkLink` TIDAK di-invoke;
Link Scanner TIDAK diaktifkan; tidak ada perubahan `site/**`,
package/lockfile, migration aktual, CI, deployment, database/katalog
live, atau live artifact dalam revisi ini.

**No Implementation Confirmation:** revisi v2.3.21 mengubah HANYA
dokumen desain/proposal/matriks/readiness dan artefak evidence
(dokumen + harness + log). Tidak ada source aplikasi, schema,
migration aktual, database, deployment, atau live artifact yang
diubah. Status tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED**.

---

## Lampiran A — (tetap v2.3.19/v2.3.20; tidak berubah)

## Lampiran B — Risk register (DITAMBAH U-87..U-96)

| ID | Risiko | Sumber | Status |
| --- | --- | --- | --- |
| U-78..U-86 | (tetap v2.3.20) | — | OPEN |
| U-87 | Klaim jumlah baris katalog v2.3.20 salah (15 vs 12); jumlah DB live tidak terverifikasi | §6 butir 1 | OPEN — migrasi v3 memakai jumlah aktual; operator mencatat jumlah live |
| U-88 | §D.4.31 dirujuk 9× tetapi badannya tidak pernah ditulis | §6 butir 2 | OPEN — v2.3.21 menambahkan §D.4.32; §D.4.31 tidak difabrikasi retroaktif |
| U-89 | Check anonim menjadi write-only di bawah fail-closed sampai identitas principal ada (K-4) | §5.2 | OPEN — butuh keputusan K-4/K-10 |
| U-90 | Versi SQLite runtime artifact produksi TIDAK TERVERIFIKASI | §6 butir 9 | OPEN — gate STAGE-P01; lantai versi 3.31.0/3.35.0 |
| U-91 | Preservasi AUTOINCREMENT `sqlite_sequence` saat rebuild | H-MIG-01h | ADDRESSED (desain + bukti VM) — pemulihan eksplisit + tes id lanjut |
| U-92 | Pemetaan Drizzle 0.45.2 atas schema hasil rebuild (generatedAlwaysAs mode, CHECK bernama, composite PK) belum diverifikasi — codegen Drizzle tidak dijalankan di VM ini | — | OPEN — gate staging (schema.ts pseudodiff saja) |
| U-93 | Validasi di file SQL tidak self-aborting di luar runner | §4.3 | OPEN — penegakan pada runner; harness adalah runner referensi |
| U-94 | DDL proposal v2 mengandung typo sintaks (tanda kutip tidak cocok) — DDL proposal harus selalu dieksekusi harness sebelum diklaim siap | §6 butir 5 | ADDRESSED di v3 (diperbaiki + teruji); pelajaran proses tercatat |
| U-95 | Himpunan input app-vs-DB dapat menyimpang (prefix `0X`, tanpa prefix) | §6 butir 6–7 | ADDRESSED di v3 (disamakan + teruji H-CAT-12/13); harus dijaga tiap perubahan aturan |
| U-96 | ALTER ADD STORED bergantung isi tabel (gagal bila berisi, berhasil bila kosong) — jebakan dev/prod | §6 butir 4 | ADDRESSED (desain: rebuild tidak bergantung isi tabel; didokumentasikan) |

## Lampiran C — §9 Aturan raw log (tetap v2.3.20) + aturan artefak (baru)

Aturan raw log v2.3.20 tetap berlaku. DITAMBAH: artefak migrasi
yang diuji harus file yang sama dengan yang ditinjau (SHA-256
tercatat di header log); tes TIDAK BOLEH memakai copy-paste SQL
"versi test-only". Setiap run gagal disimpan terpisah (v2.3.21:
run1-fail, run2-fail, sqlite3451-run1-fail — lihat README evidence).
