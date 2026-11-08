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
   implementasi di branch pengembangan — TETAPI butir D-01..D-06 di bawah
   tetap berstatus **PLANNED — menunggu konfirmasi eksplisit** dari
   agen induk/pemilik bahwa run berikutnya boleh mulai menulis kode di
   branch ini. Alasannya: otorisasi `c53fd73` masuk lewat repo, sementara
   otorisasi kerja run ini (tugas terjadwal) hanya mencakup revisi desain
   + bukti. Jangan mulai D-01 sebelum konfirmasi itu tercatat.
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
| D-01 | Implementasi F-044/F-045/F-046 di file migrasi/schema aktual: migrasi 0006 teks v3 (rebuild create/copy/validate/swap), CHECK `projects_chain_allowlist_ck` + `projects_contract_format_ck`, `checks.owner_user_id`, composite key `saved_projects`, fail-closed legacy di `listChecks`/`deleteCheck`/`askGibran` + `exportLegacyChecks` terpisah. Tes: migrasi up/down + failure injection + dua principal. | P0 | UNASSIGNED (Muse — perancang) | `dev` / — (belum ada commit kode) | PLANNED — menunggu konfirmasi otorisasi run berikutnya (lihat § Catatan butir 2) | Desain + harness VM: `SSRF_PROPOSAL_F001_F005_V2321.md` + `evidence/v2321/` (109 + 25 assert PASS) — BUKAN bukti implementasi | Konfirmasi otorisasi; versi SQLite runtime produksi NOT VERIFIED (U-90); keputusan owner K-10 (L-A/L-B/L-C) | Konfirmasi otorisasi → implementasi di `dev` dalam commit kecil + tes H-MIG/H-CAT/H-TEN atas file aktual |
| D-02 | Implementasi F-001 di jalur fetch nyata (`site/server/src/actions.ts`): tolak IP loopback/privat/link-local/reserved IPv4+IPv6, validasi resolusi DNS, revalidasi tiap hop redirect, strategi anti-rebinding/TOCTOU, validasi fetch script/resource. | P0 | UNASSIGNED | `dev` / — | PLANNED | Desain: `SSRF_PROPOSAL_F001_F005_V2321.md` §3 + `SSRF_REMEDIATION_DESIGN.md` §D.4.32; bukti implementasi: NONE | Bergantung D-01 (skema/tes dasar); bukti egress/topologi NOT VERIFIED | Setelah D-01: implementasi + tes H-SSRF atas kode aktual |
| D-03 | Implementasi F-002/F-003/F-022/F-025/F-026/F-027: streamed byte cap sebelum buffering, akuntansi byte konsisten (L0/L1), aggregate budget, total deadline 20 detik, cancellation, concurrency/resource limits. | P0 | UNASSIGNED | `dev` / — | PLANNED | Desain + bukti VM model: `evidence/v2320/` (F-038/F-039); bukti implementasi: NONE | Model A vs B (K-7) butuh bukti egress/transport mentah runtime (NOT VERIFIED) | Setelah D-01/D-02: implementasi + tes H-RES atas kode aktual |
| D-04 | Implementasi F-004/F-005/F-018 + otorisasi: uniqueness DB transaksional, validasi official URL konsisten, owner-scoped read/write/delete di semua action, verifikasi auth boundary aktual (bukan asumsi framework). | P0 | UNASSIGNED | `dev` / — | PLANNED | Desain: proposal v2.3.21 §4–§5; bukti implementasi: NONE | Keputusan owner K-4/K-10; scope `ctx.db` + identitas principal NOT VERIFIED (butuh pernyataan provider) | Keputusan K-4/K-10 → implementasi + tes dua principal atas kode aktual |
| D-05 | Perbaiki F-016/F-017 + regresi terkonfirmasi lain: correctness/isolasi cache hanya di mana code review mengonfirmasi isu + tes regresi. | P1 | UNASSIGNED | `dev` / — | PLANNED | Desain: proposal v2.3.21; bukti implementasi: NONE | Butuh konfirmasi code review per isu (G-F → K-1) | Review kode → implementasi + tes regresi |
| D-06 | Build/CI reproducible di luar Hatch (F-030/F-047 lanjutan): manifest/lockfile + skrip build/test + CI yang dapat berjalan tanpa `/opt/hatch`; JANGAN hapus/ganti integrasi runtime tanpa compatibility plan teruji. | P1 | UNASSIGNED | `dev` / — | PLANNED | Bukti v2.3.22: `evidence/v2322/clean-clone-build-no-hatch.txt` (install FAIL exit 1, build FAIL exit 1) + `...-with-hatch-control.txt` (install OK, build:server OK, build:client FAIL — SDK menolak build tangan); SDK `@hatch/space-sdk` 0.14.0, tarball SHA-256 `f2cb7b25…ad49e`, tidak ada di npm registry (404) | Butuh sumber SDK redistributable yang sah ATAU pernyataan provider ATAU adapter/port teruji — ketiganya belum ada | Minta pernyataan provider (aksi owner minimal) → prototipe adapter di `dev` → clean-clone build ulang |
| D-07 | Verifikasi T-01: apakah second Hatch space dapat dipublikasikan di subdomain gratis dengan data terisolasi? | P1 | Owner proyek + platform Hatch | — | BLOCKED — OWNER ACTION REQUIRED | NONE — `docs/deployment/PUBLIC_TESTER_PROPOSAL_V1.md` §8 mencatat T-01 NOT VERIFIED | Jawaban harus datang dari platform; tidak dapat dibuktikan dari repo | Owner menanyakan T-01 ke platform; catat jawaban tertulis + bukti |
| D-08 | Workstream beta — dibatasi ke plan/compat check (per `c53fd73` §4) sampai kode aplikasi siap. | P2 | UNASSIGNED | `beta-readiness` / `850592a` + `fd4441a` | DONE (paket) — BLOCKED (deployment) | Paket 5 file di branch `beta-readiness`; keputusan BLOCKED (G1 FAIL, G2 FAIL, G3 BLOCKED, G4 FAIL, G5 PASS, G6 FAIL, G7 FAIL, G8 BLOCKED) | Semua gate keamanan (lihat `CLOSED_BETA_READINESS.md` di branch itu) | Jangan poles dokumen deployment selama D-01..D-05 belum jalan; perbarui paket hanya bila gate berubah |
| D-09 | Diskusi "link jadi" dengan ChatGPT (jalur A–D menuju URL yang bisa diklik owner). | P2 | Muse + ChatGPT | `discussion-link-jadi` / `6d743cc` | IN PROGRESS — menunggu tanggapan ChatGPT | `MUSE_DISCUSSION_LINK_JADI.md` (branch diskusi) | Tanggapan audit/direktif ChatGPT berikutnya | Setelah GPT menjawab: rangking jalur → putuskan langkah berikutnya bersama owner |
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
