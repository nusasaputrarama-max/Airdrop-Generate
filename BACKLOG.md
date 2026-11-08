# BACKLOG — Development Branch `dev` (AIRDROP GENERATE)

**Branch:** `dev` (dari `main` @ `c53fd73`, 2026-11-08)
**Tanggal dibuat:** 2026-11-08 (WIB)
**Status proyek:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED untuk
produksi/rilis. Branch ini adalah cabang pengembangan terisolasi
(non-produksi). Perubahan di sini TIDAK menyentuh `main`, database/katalog
produksi, live artifact, atau Link Scanner.
**Menjawab:** `CLOSED_BETA_FREE_TIER_DIRECTIVE.md` §F (pengembangan paralel
di isolated branch + visible backlog) dan `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md`
(commit `c53fd73`).

## Catatan otorisasi — baca dulu

1. Revisi ini (v2.3.22) membuat branch `dev` berisi **backlog awal saja,
   tanpa perubahan kode**. Itu batas otorisasi tugas terjadwal yang
   membuat branch ini.
2. `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md` (`c53fd73`) mengotorisasi
   implementasi di branch pengembangan. **KONFIRMASI TERCATAT
   (v2.3.23):** audit independen V16 (`SSRF_INDEPENDENT_AUDIT_V16.md`,
   commit `7e82818`, §1 keputusan 1 + §2 penilaian U-99 + §6) menutup
   U-99 sebagai blocker proses — implementasi di branch `dev` HARUS
   DIMULAI SEKARANG dan TIDAK PERLU konfirmasi owner tambahan untuk
   pekerjaan dev-branch yang sudah diotorisasi. U-98 terjawab: branch
   bernama `dev` dipakai sebagai development branch terisolasi.
   D-01..D-06 kini IN PROGRESS (bukan lagi menunggu konfirmasi).
   Batas keras tetap: HANYA branch `dev`; JANGAN PERNAH ubah `main`,
   produksi, live artifact, deployment config, atau database/katalog
   live; Link Scanner tetap tidak diaktifkan.
3. **Perbedaan nama branch:** tugas terjadwal menamai branch ini `dev`;
   `c53fd73` §1 meminta nama `development`. Branch yang dibuat adalah
   `dev` (sesuai tugas terjadwal). Rename ke `development` adalah
   keputusan satu perintah (`git branch -m dev development`) yang
   diserahkan ke agen induk/pemilik — isi backlog tidak berubah oleh
   rename itu.
4. Batas keras yang tetap berlaku di branch ini: tidak ada deployment,
   tidak ada perubahan `main`/produksi/live artifact, tidak ada
   pengaktifan Link Scanner, tidak ada wallet/signing/transaksi, tidak
   ada tes destruktif produksi, tidak ada secret di commit/log.

## Cara membaca kolom

- **Prioritas:** P0 = blocker rilis/beta; P1 = dibutuhkan sebelum staging;
  P2 = persiapan/paralel.
- **Owner:** nama hanya bila sudah ditunjuk resmi; bila belum, tertulis
  **UNASSIGNED** — tidak ada nama yang dikarang.
- **Status:** PLANNED / IN PROGRESS / BLOCKED / DONE (dengan bukti).
- **Bukti tes:** file log + test ID + SHA-256 bila ada; **NONE** bila
  belum ada — bukan klaim.

## Backlog (terurut)

| # | Tugas | Prioritas | Owner | Branch / commit | Status | Bukti tes | Blocker | Aksi berikutnya |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-01 | Implementasi F-044/F-045/F-046 di file migrasi/schema aktual: migrasi 0006 teks v3 (rebuild create/copy/validate/swap), CHECK `projects_chain_allowlist_ck` + `projects_contract_format_ck`, `checks.owner_user_id`, composite key `saved_projects`, fail-closed legacy di `listChecks`/`deleteCheck`/`askGibran` + `exportLegacyChecks` terpisah. Tes: migrasi up/down + failure injection + dua principal. | P0 | Muse | `dev` / `e022869` (migrasi 0006 + journal + down) + commit implementasi schema/actions (menyusul di bawah) | IN PROGRESS — migrasi + schema + owner-scoping TER-COMMIT; harness H-MIG/H-CAT/H-TEN atas file aktual MASIH DITULIS (evidence/v2323) | Versi SQLite runtime produksi NOT VERIFIED (U-90); keputusan owner K-10 (L-A/L-B/L-C) — default L-A dipakai; `ctx.viewer` terisi di runtime NOT VERIFIED (STAGE-P02) | Selesaikan harness v2.3.23 → tandai DONE dengan log + SHA-256 |
| D-02 | Implementasi F-001 di jalur fetch nyata (`site/server/src/actions.ts`): tolak IP loopback/privat/link-local/reserved IPv4+IPv6, validasi resolusi DNS, revalidasi tiap hop redirect, strategi anti-rebinding/TOCTOU, validasi fetch script/resource. | P0 | Muse | `dev` / — | IN PROGRESS | Implementasi: `site/server/src/ssrf-guard.ts` (baru: canonicalizeHost/port, resolveAll, validateDestination, nodeConnector pinned lookup, fetchGuardedOnce, validateUrlForFetch) + wiring di `site/server/src/actions.ts` (fetchTextOnce/fetchText/lookupRdapOnce/analyze, script same-origin serial); tsc bersih; bukti tes: PENDING (`evidence/v2323/test-ssrf-guard-v2323.ts`) | Egress/topologi produksi NOT VERIFIED (STAGE-P01/P03); pinning runtime NOT VERIFIED | Tes H-SSRF atas kode aktual, lalu staging egress |
| D-03 | Implementasi F-002/F-003/F-022/F-025/F-026/F-027: streamed byte cap sebelum buffering, akuntansi byte konsisten (L0/L1), aggregate budget, total deadline 20 detik, cancellation, concurrency/resource limits. | P0 | Muse | `dev` / — | IN PROGRESS | Implementasi: `readCappedStream` + `ScanBudget`/`createScanBudget` di `ssrf-guard.ts`; deadline analyze 30s -> 20s (TOTAL_DEADLINE_MS); script serial R=1; wiring actions.ts; tsc bersih; bukti tes: PENDING (`evidence/v2323/test-resource-v2323.ts`); lease/rate (F-003c) PENDING D-06 | C_max runtime-dependent (dilaporkan per deployment); memori bounded TIDAK diklaim dari slice/model VM | Tes H-RES atas kode aktual; lease/rate di D-06 |
| D-04 | Implementasi F-004/F-005/F-018 + otorisasi: uniqueness DB transaksional, validasi official URL konsisten, owner-scoped read/write/delete di semua action, verifikasi auth boundary aktual (bukan asumsi framework). | P0 | Muse | `dev` / commit implementasi schema/actions (menyusul di bawah) | IN PROGRESS — owner scoping + addProject constraint TER-COMMIT; principal `ctx.viewer` DITEMUKAN di tipe SDK 0.14.0 (`LocalViewer.ownerUserId` / `CloudflareViewer.shareId`); tes dua principal MASIH DITULIS (evidence/v2323) | Keputusan owner K-4/K-10; `ctx.viewer` terisi di runtime live NOT VERIFIED (STAGE-P02); SpaceDb TANPA API `transaction` (D1 menolak BEGIN/SAVEPOINT — atomicity via unique index, bukan transaksi app) | Selesaikan harness v2.3.23 → tandai DONE dengan log + SHA-256 |
| D-05 | Perbaiki F-016/F-017 + regresi terkonfirmasi lain: correctness/isolasi cache hanya di mana code review mengonfirmasi isu + tes regresi. | P1 | UNASSIGNED | `dev` / — | PLANNED | Desain: proposal v2.3.21; bukti implementasi: NONE | Butuh konfirmasi code review per isu (G-F → K-1) | Review kode → implementasi + tes regresi |
| D-06 | Build/CI reproducible di luar Hatch (F-030/F-047 lanjutan): manifest/lockfile + skrip build/test + CI yang dapat berjalan tanpa `/opt/hatch`; JANGAN hapus/ganti integrasi runtime tanpa compatibility plan teruji. | P1 | UNASSIGNED | `dev` / — | PLANNED | Bukti v2.3.22: `evidence/v2322/clean-clone-build-no-hatch.txt` (install FAIL exit 1, build FAIL exit 1) + `...-with-hatch-control.txt` (install OK, build:server OK, build:client FAIL — SDK menolak build tangan); SDK `@hatch/space-sdk` 0.14.0, tarball SHA-256 `f2cb7b25…ad49e`, tidak ada di npm registry (404) | Butuh sumber SDK redistributable yang sah ATAU pernyataan provider ATAU adapter/port teruji — ketiganya belum ada | Minta pernyataan provider (aksi owner minimal) → prototipe adapter di `dev` → clean-clone build ulang |
| D-07 | Verifikasi T-01: apakah second Hatch space dapat dipublikasikan di subdomain gratis dengan data terisolasi? | P1 | Owner proyek + platform Hatch | — | BLOCKED — OWNER ACTION REQUIRED | NONE — `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` §8 mencatat T-01 NOT VERIFIED | Jawaban harus datang dari platform; tidak dapat dibuktikan dari repo | Owner menanyakan T-01 ke platform; catat jawaban tertulis + bukti |
| D-08 | Workstream beta — dibatasi ke plan/compat check (per `c53fd73` §4) sampai kode aplikasi siap. | P2 | UNASSIGNED | `beta-readiness` / `850592a` + `fd4441a` | DONE (paket) — BLOCKED (deployment) | Paket 5 file di branch `beta-readiness`; keputusan BLOCKED (G1 FAIL, G2 FAIL, G3 BLOCKED, G4 FAIL, G5 PASS, G6 FAIL, G7 FAIL, G8 BLOCKED) | Semua gate keamanan (lihat `CLOSED_BETA_READINESS.md` di branch itu) | Jangan poles dokumen deployment selama D-01..D-05 belum jalan; perbarui paket hanya bila gate berubah |
| D-09 | Diskusi "link jadi" dengan ChatGPT (jalur A–D menuju URL yang bisa diklik owner). **DIJAWAB GPT 2026-11-08 13:47 WIB** (`GPT_RESPONSE_LINK_JADI.md`, commit `59b02d0`, branch `discussion-link-jadi`): rangking C/A/D/B — C landing page statis informasional tercepat (bukan scanner), A verifikasi T-01 paralel, D implementation-first jalur utama, B owner-only trial BUKAN jalan pintas (scanner tidak boleh jalan bahkan untuk URL sendiri sebelum F-001 + kontrol resource diperbaiki, diuji di staging, ditinjau). Definisi: "project link" vs "application trial link". | P2 | Muse + ChatGPT | `discussion-link-jadi` / `6d743cc` + `59b02d0` | ANSWERED — tindak lanjut OPEN | `MUSE_DISCUSSION_LINK_JADI.md` + `GPT_RESPONSE_LINK_JADI.md`; ringkasan di `DEPLOYMENT_FEASIBILITY_V2322.md` §4.1 (main) | T-01 diverifikasi Muse + ditinjau GPT (D-07); landing page terpisah bila owner memutuskan; D setelah U-99 diputuskan |
| D-10 | Keputusan owner yang tertunda: K-1..K-5, K-7..K-10 (termasuk K-10 kebijakan legacy L-A/L-B/L-C) + penunjukan 6 peran staging (STAGING_READINESS_V2322.md baris 1–6). | P0 (keputusan) | Rama (owner) | — | BLOCKED — menunggu owner | NONE | Tidak ada keputusan tertulis | Owner memutuskan; catat keputusan + tanggal di matriks revisi berikutnya |

## Aturan pemeliharaan backlog

- Setiap commit kode di `dev` memperbarui baris backlog-nya (branch/commit,
  status, bukti tes, blocker, aksi berikutnya) dalam commit yang sama.
- Tidak ada baris yang ditandai DONE tanpa bukti (file log + test ID +
  SHA-256 + commit SHA). Dokumentasi saja bukan DONE untuk D-01..D-06.
- Bila satu tugas blocked, kerjakan tugas lain yang aman dan catat
  blocker-nya (prinsip keberlanjutan 2026-11-07) — jangan diam.
- Backlog ini adalah SATU-SATUNYA daftar tugas `dev`; jangan buat
  dokumen status duplikat.
