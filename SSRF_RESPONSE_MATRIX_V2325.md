# SSRF Response Matrix v2.3.25 — Jawaban atas Audit Independen V19

**Tanggal run:** 2026-11-08 ~17:47–17:54 WIB
**Branch:** `development` (terisolasi; `main` tidak disentuh source-nya)
**Audit yang dijawab:** `SSRF_INDEPENDENT_AUDIT_V19.md` (`cfb55a6`)
**Status rilis:** tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Regresi penuh VM:** **375/375 PASS** (baseline terkoreksi 363 + 12 tes baru), tsc server+client exit 0

## 0. Sinkronisasi (V19 item 3)

| Item | Hasil |
| --- | --- |
| main HEAD saat re-read | `cfb55a6` (audit V19; mencakup `6167749` yang disebut handoff V19 §6 butir 3) |
| Merge commit | `37a23a2` — merge origin/main (V19) ke development |
| Konflik merge (2 file dokumen, diselesaikan — bukan di-skip) | `SSRF_RESPONSE_MATRIX_V2324.md` (add/add): dipakai versi **main** (koreksi total 363/363, DL-24-01); `SSRF_REMEDIATION_DESIGN.md`: dipertahankan **kedua** seksi — §D.4.34 (dev, v2.3.23) + §D.4.35 (main, v2.3.24) — dan kedua seksi changelog v2.3.23/v2.3.24, dalam urutan kronologis |
| HEAD development setelah merge | `37a23a2`; `git log origin/main --not HEAD` = 0 (tidak ada behind) |
| Push merge | OK, terverifikasi `git ls-remote origin development` = 37a23a2 |

## 1. Matriks respons per temuan V19

| ID | Respons | Bukti (file, test, log, SHA, commit) | Sisa risiko / aksi berikut |
| --- | --- | --- | --- |
| F-057 | **ADDRESSED** (dev + VM evidence; staging pending) | `site/server/src/actions.ts` (`savedPrincipal` baru + `LOCAL_SINGLE_OWNER_MODE` default OFF + `setLocalSingleOwnerMode` test-only); harness `evidence/v2325/test-anon-saved-v2325.ts` H-AN-01..05 **5/5 PASS** (log SHA `764c1f88…`); commit `2eb5a2a` | Mode single-owner eksplisit belum punya bukti runtime (STAGE-P02 extension, U-115). `ctx.viewer` terisi di runtime NOT VERIFIED (STAGE-P02). |
| F-058 | **PARTIALLY ADDRESSED** (kode + tes VM selesai; bukti kontrak provider BLOCKED) | `site/server/src/actions.ts` (`resolvePrincipal` local → `local:{userId}`; delegate → `local:delegate:{delegate}:{userId}`; userId kosong → null); harness `evidence/v2325/test-principal-local-v2325.ts` H-PL-01..07 **7/7 PASS** (log SHA `ccf0b0f4…`); bukti kontrak: SDK 0.14.0 `server-contract.d.ts` asli (tarball SHA `f2cb7b25…ad49e`) — hanya nama field + komentar doc, BUKAN pernyataan populasi runtime; commit `2eb5a2a` | Semantik populasi runtime (`userId`/`ownerUserId`/`delegate` di invocation nyata) NOT VERIFIED — butuh pernyataan provider atau staging trace (U-113). Baris lama berkunci `local:{ownerUserId}` menjadi orphan (U-114). |
| V19 item 3 | **ADDRESSED** | Merge `37a23a2` (lihat §0); tidak ada merge balik development→main | — |
| V19 item 4 | **ADDRESSED** | Rekonsiliasi §3: total **375/375 PASS**; koreksi 363/363 dipertahankan (DL-25-01); 18/18 sidecar `.sha256` cocok dengan byte mentah; tsc exit 0 | 8 log re-run byte-identik dengan v2.3.24 — dijelaskan di DL-25-02, bukan disembunyikan |
| V19 item 5 | **DIPATUHI** | T-01 tidak dicoba ulang; landing page tidak disentuh; tidak ada perubahan workflow/deployment config, live artifact, DB, atau scanner; H-KILL 5/5 PASS di regresi | — |
| D-06 | **TIDAK DIUBAH (tetap IN PROGRESS/BLOCKED)** | Stub SDK tidak disentuh; tidak ada klaim baru | Butuh SDK redistributable yang sah / pernyataan provider (keputusan owner) |
| T-01 | **TETAP BLOCKED** | Tidak dicoba ulang; tidak ada perintah create/publish di Hatch CLI | Jawaban harus datang dari platform |

## 2. Keputusan eksplisit

### F-057 — anonymous fail-closed, legacy hanya di balik opt-in eksplisit

`savedPrincipal()` kini mengembalikan null untuk context tanpa viewer
(default), sehingga `listProjects` memakai sentinel
`DISABLED_SAVED_PRINCIPAL` (tidak pernah cocok) dan `setProjectState`
no-op — perlakuan yang sama dengan viewer share Cloudflare non-owner
(F-051). Sentinel `'<LEGACY>'` hanya dikembalikan bila
`LOCAL_SINGLE_OWNER_MODE === true`: module flag default OFF dengan
pola yang sama seperti `CHECKLINK_ENABLED` (tidak ada env var di
runtime ini; mengaktifkan butuh perubahan kode + review, bukan toggle
diam-diam). `setLocalSingleOwnerMode` test-only; production code tidak
pernah memanggilnya. H-AN-03 membuktikan opt-in itu bekerja (baca +
update baris `<LEGACY>` yang sama) dan H-AN-04 membuktikan mode ON
tidak bocor ke viewer share. Migrasi legacy tetap lulus: H-MIG re-run
232/232 termasuk H-MIG-01b-8 (baris saved `<LEGACY>` utuh) dan H-LEG
8/8.

### F-058 — `userId` adalah identitas pemanggil; kontrak provider TIDAK terbukti

**Yang dibaca (bukan dikarang):** file SDK asli
`/opt/hatch/skills/spaces/ts-runtime/dist/space-ts-deps/node_modules/@hatch/space-sdk/dist/server-contract.d.ts`
(paket `@hatch/space-sdk` 0.14.0, tarball SHA-256
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`):

```ts
/** User identity verified by the local daemon, without a share token. */
export type LocalViewer = {
    source: "local";
    authenticated: true;
    spaceSlug: string;
    userId: string;
    ownerUserId: string;
    isOwner: boolean;
    /** Native Muse delegation, distinct from the owner's browser. */
    delegate?: "agent" | "schedule";
};
```

Yang terbukti dari sumber ini: (a) ada DUA field identitas terpisah,
`userId` dan `ownerUserId`; (b) komentar doc menyebut `userId` sebagai
bagian dari "user identity"; (c) `delegate` didokumentasikan sebagai
delegasi yang "distinct from the owner's browser". Yang TIDAK dibuktikan
sumber ini — dan tidak ditemukan pernyataan provider lain di repo
(pencarian: `userId`/`ownerUserId`/`delegate` di seluruh `*.md` repo
hanya menemukan stub yang diturunkan dari `.d.ts` ini, audit V5/V6
yang mengutipnya, dan desain §D.4.34; tidak ada pernyataan tertulis
provider tentang semantik populasi): apakah runtime dapat memberikan
dua viewer dengan `ownerUserId` sama dan `userId` berbeda; userId apa
yang dibawa invokasi delegate; apakah `isOwner` dapat berbeda untuk
`userId` yang sama.

**Keputusan kode (pembacaan paling defensif dari tipe yang
dideklarasikan):** principal local = `local:{userId}`; delegate =
namespace terpisah `local:delegate:{delegate}:{userId}`; `isOwner`
adalah otorisasi, bukan identitas (H-PL-05 membuktikan keduanya:
userId sama berbagi principal/history, tetapi `addProject` tetap
menolak non-owner dan menerima owner). Karena itu respons F-058
adalah **partially addressed**, bukan addressed: kriteria penerimaan
V19 (dua viewer `ownerUserId` sama + `userId` beda tidak berbagi
history/saved state; owner/non-owner dan delegate diuji) LOLOS di VM
(H-PL 7/7), tetapi bukti "provider contract atau staging trace yang
aman" yang diminta audit TIDAK ADA — dicatat sebagai U-113, bukan
dipalsukan.

**Konsekuensi migrasi data (U-114):** baris yang sudah ada dengan kunci
`local:{ownerUserId}` (kolom `checks.owner_user_id`,
`saved_projects.principal_id`, `projects.provenance_submitted_by`
dari v2.3.23/v2.3.24) TIDAK LAGI cocok dengan principal mana pun
setelah perubahan ini — baris itu menjadi orphan (tidak terlihat,
tidak dihapus). Tidak ada DB produksi yang disentuh putaran ini
(live `app.db` tidak diubah), tetapi SEBELUM deployment apa pun yang
membawa perubahan ini menyentuh DB berisi baris lama, operator harus
memutuskan: rename kunci lama ke `local:{userId}` yang sesuai, atau
terima kehilangan visibilitas history/bookmark lama. Keputusan itu
butuh data runtime (pemetaan `userId`↔`ownerUserId` nyata) dan belum
dapat dibuat dari VM.

## 3. Tabel hasil tes (regresi penuh v2.3.25, 2026-11-08 ~17:47–17:54 WIB)

Baseline terkoreksi 363 + baru 12 = **375/375 PASS**. Semua log di
`evidence/v2325/` + `.sha256` per log. Lingkungan: Bun 1.4.4,
bun:sqlite 3.53.4, sqlite3 CLI 3.45.1. `tsc` server+client exit 0.

| Harness | PASS/FAIL | Log (SHA-256) |
| --- | --- | --- |
| H-MIG/H-CAT/H-TEN/DK (migrasi, 8 migrasi) | 232/0 | `test-migration-v2323-v2325.txt` (`9a7e8f8b…`) |
| H-SSRF (guard) | 32/0 | `test-ssrf-guard-v2323-v2325.txt` (`5e1901d7…`) |
| H-RES | 15/0 | `test-resource-v2323-v2325.txt` (`b060f5b3…`) |
| H-LEASE | 8/0 | `test-lease-v2323-v2325.txt` (`779e09be…`) |
| H-CACHE | 12/0 | `test-cache-v2323-v2325.txt` (`cc55c09f…`) |
| H-LEG | 8/0 | `test-legacy-export-v2323-v2325.txt` (`49995d5c…`) |
| H-KILL | 5/0 | `test-checklink-killswitch-v2323-v2325.txt` (`ffc6690e…`) |
| H-RD | 10/0 | `test-registrable-domain-v2323-v2325.txt` (`ca020129…`) |
| H-IP (F-049) | 8/0 | `test-ip-registry-v2324-v2325.txt` (`3bda3f83…`) |
| H-AUTH (F-050) | 6/0 | `test-auth-addproject-v2324-v2325.txt` (`ff3fda64…`) |
| H-PRIN (F-051) | 6/0 | `test-principal-share-v2324-v2325.txt` (`f0a46719…`) |
| H-DL (F-052) | 6/0 | `test-deadline-v2324-v2325.txt` (`3ce18117…`) |
| H-TO (F-053) | 1/0 | `test-timeout-persist-v2324-v2325.txt` (`ca255ec9…`, elapsed 20018 ms) |
| H-CB (F-054) | 4/0 | `test-cache-budget-v2324-v2325.txt` (`2b30e455…`) |
| H-B58 (F-055) | 5/0 | `test-solana-check-v2324-v2325.txt` (`d7704e8f…`) |
| H-SO (F-056) | 5/0 | `test-same-origin-redirect-v2324-v2325.txt` (`9dc6878e…`) |
| H-AN (F-057, baru) | 5/0 | `test-anon-saved-v2325-v2325.txt` (`764c1f88…`) |
| H-PL (F-058, baru) | 7/0 | `test-principal-local-v2325-v2325.txt` (`ccf0b0f4…`) |

SHA-256 lengkap per log: file `.txt.sha256` di samping tiap log
(18/18 terverifikasi cocok dengan byte mentah via `sha256sum -c`).

**Pengulangan yang dijelaskan (protokol butir 6):** seluruh 16
harness lama diulang karena implementasi berubah material
(`actions.ts` — pemetaan principal dipakai SEMUA handler
ber-principal — dan ekspektasi harness yang meng-hardcode principal
lama diperbarui mengikuti perubahan itu, preseden H-SSRF-04 v2.3.24).
D-06 clean-clone TIDAK diulang (tidak ada perubahan material).

## Decision Log v2.3.25

- **DL-25-01 (total):** regresi penuh v2.3.25 = **375/375 PASS**
  (363 baseline terkoreksi v2.3.24 + 12 baru: H-AN 5 + H-PL 7).
  Koreksi main 363/363 (DL-24-01) dipertahankan; matriks development
  v2.3.24 yang menulis 353/353 tetap menjadi catatan sejarah dan
  tidak ditulis ulang.
- **DL-25-02 (log byte-identik):** 8 log re-run byte-identik dengan
  v2.3.24 (H-AUTH `ff3fda64…`, H-CB `2b30e455…`, H-DL `3ce18117…`,
  H-IP `3bda3f83…`, H-PRIN `f0a46719…`, H-RD `ca020129…`, H-SO
  `9dc6878e…`, H-B58 `d7704e8f…`). Ini WAJAR, bukan anomali: output
  harness hanya berisi baris PASS/FAIL + ringkasan, dan string
  principal tidak pernah tercetak di log. Jalur kode baru TETAP
  dieksekusi di setiap re-run (bun mengimpor `actions.ts` yang sudah
  diubah); buktinya tes dengan ekspektasi principal yang diperbarui
  — H-AUTH-04, H-PRIN-03, H-TEN-11/15 — LULUS dan akan GAGAL pada
  kode lama (provenance/seed `local:owner-1` tidak lagi cocok dengan
  principal `local:u-owner-1`).
- **DL-25-03 (konflik merge):** lihat §0. Tidak ada konten yang
  dibuang diam-diam: matriks main diambil utuh; desain
  mempertahankan kedua seksi §D.4.34 + §D.4.35.
- **DL-25-04 (`isOwner` bukan identitas):** dua viewer dengan userId
  sama berbagi principal `local:{userId}` meskipun `isOwner` berbeda
  (H-PL-05). Ini disengaja: `isOwner` adalah atribut otorisasi
  per-invocation yang diverifikasi runtime; semua operasi sensitif
  (`addProject`, `exportLegacyChecks`) meng-gate `isOwner` langsung,
  bukan lewat principal — jadi berbagi history tidak memberi
  eskalasi hak.
- **DL-25-05 (delegate namespace):** delegate mendapat principal
  sendiri (`local:delegate:{delegate}:{userId}`) karena komentar doc
  SDK menyebut delegasi "distinct from the owner's browser" dan tidak
  ada bukti bahwa invokasi delegate membawa identitas pemanggil
  langsung. Bila provider kelak membuktikan delegate membawa userId
  pemilik, pemetaan ini harus direvisi — dicatat sebagai bagian U-113.
- **DL-25-06 (pencarian pernyataan provider):** yang dicari —
  `server-contract.d.ts` SDK 0.14.0 asli, stub README +
  `tools/space-sdk-stub/dist/index.d.ts`, seluruh `*.md` repo untuk
  `userId`/`ownerUserId`/`delegate`, audit V5/V6, desain §D.4.34.
  Hasil: hanya deklarasi tipe + komentar doc (dikutip di §2). TIDAK
  ADA pernyataan tertulis provider tentang semantik populasi runtime.
  Karena itu F-058 partially addressed, bukan addressed.

## 4. Daftar commit development (putaran ini)

| SHA | Pesan |
| --- | --- |
| `37a23a2` | merge(main): sync V19 audit (cfb55a6) into development |
| `2eb5a2a` | fix(security): F-057 anon fail-closed + F-058 local principal userId (H-AN/H-PL) |
| `d864fd0` | test(dev): harness baru F-057/F-058 (H-AN 5/5, H-PL 7/7) |
| `…` (menyusul) | test(dev): regresi penuh v2.3.25 — 375/375 PASS + matriks respons V19 + BACKLOG D-13 |

Semua commit di-push segera setelah selesai; 0 push gagal.
Verifikasi akhir `git ls-remote origin development` (lihat laporan).

## 5. Yang gagal selama putaran ini (diperbaiki, bukan disembunyikan)

1. **Merge `origin/main` berkonflik** pada 2 file dokumen
   (`SSRF_RESPONSE_MATRIX_V2324.md` add/add,
   `SSRF_REMEDIATION_DESIGN.md` 3 hunk). Diselesaikan dengan
   mempertahankan versi main untuk matriks dan mempertahankan KEDUA
   seksi desain (§D.4.34 + §D.4.35); tidak ada konten yang dibuang.
   Re-merge tidak diperlukan; verifikasi: 0 conflict marker tersisa,
   `git log origin/main --not HEAD` = 0.
2. **Tidak ada kegagalan harness.** Kedua harness baru lulus 5/5 dan
   7/7 pada run pertama; regresi penuh 18/18 harness lulus pada run
   pertama (tidak ada re-run perbaikan).

## 6. Konfirmasi batasan

- `main` tidak disentuh source aplikasinya oleh revisi ini (hanya
  merge DARI main; dokumen revisi v2.3.25 masuk `main` sebagai commit
  terpisah, 0 file `site/`).
- Live artifact slug `cek-link-airdrop` tidak disentuh.
- Link Scanner tetap nonaktif (`CHECKLINK_ENABLED=false` default; H-KILL 5/5).
- Tidak ada merge development→main; tidak ada perubahan database/katalog produksi.
- 2 file untracked build artifact (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) dibiarkan apa adanya — tidak
  di-commit, tidak dihapus (sudah ada sebelum putaran ini).
- D-06 stub SDK tidak disentuh; T-01 tetap BLOCKED.
- Semua bukti baru di putaran ini adalah bukti VM — dilabeli demikian.
  Staging tetap NOT VERIFIED.

## 7. Gate berikutnya (untuk audit independen V20)

1. Review independen atas diff putaran ini (file + bukti di atas),
   terutama kejujuran F-058 partially addressed dan keputusan
   DL-25-04/DL-25-05.
2. Staging: STAGE-P01 (egress/pinning runtime), STAGE-P02 (`ctx.viewer`
   terisi di runtime + semantik `userId`/`ownerUserId`/`delegate` +
   bukti mode single-owner eksplisit), U-90 (versi SQLite produksi),
   U-113 (kontrak provider F-058), U-114 (keputusan migrasi data
   kunci principal lama), K-4, T-01, D-06 (SDK asli), 6 peran staging.
3. Registry-diff test berkala untuk korpus IANA (F-049 tindak lanjut,
   U-108).
