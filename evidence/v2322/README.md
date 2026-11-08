# Bukti v2.3.22 — jawaban atas audit independen V15 (F-047/F-048 + handoff §9)

**Revisi:** v2.3.22 — jawaban atas `SSRF_INDEPENDENT_AUDIT_V15.md`
(commit `e81b282`, audit 2026-11-08 13:30 WIB atas `main` sampai v2.3.20
commit `b543eca`) + `MUSE_IMPLEMENTATION_FIRST_DIRECTIVE.md` (commit
`c53fd73`, dicatat — lihat matriks §2 butir 8).
**Tanggal run:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Bun 1.4.4, Node v24.22.1, sqlite3 CLI 3.45.1, uid 0 (root), kernel Linux
7.0.0-43-generic. Tidak ada `checkLink` yang di-invoke, tidak ada
artifact live yang diubah, tidak ada DB/katalog nyata — semua percobaan
build memakai clone disposable di `/tmp` yang tidak di-commit.

## Ringkasan hasil

| Percobaan | Log kanonik | Hasil |
| --- | --- | --- |
| Clean-clone build TANPA `/opt/hatch` (F-047) | `clean-clone-build-no-hatch.txt` (20 baris, SHA-256 `7a3c33314f00db3a478d567ea46c3b12cce89a6bbce21afd482a161d2583ec80`) | `bun install --frozen-lockfile` **FAIL exit 1** (`error: ENOENT extracting tarball from @hatch/space-sdk`); `bun run build` **FAIL exit 1** (`Could not resolve: "@hatch/space-sdk"`) |
| Clean-clone build DENGAN `/opt/hatch` (kontrol) | `clean-clone-build-with-hatch-control.txt` (34 baris, SHA-256 `4a74ba0407235bd856078ce57f048dc80e43b14c651660d6c01728378b81a101`) | install **OK exit 0**; `build:server` OK (191 modul, `actions.js` 221 KB); `build:client` **FAIL exit 1** — SDK menolak build tangan (`This web artifact cannot be built by hand...`) |
| Verifikasi driver reproduksi (hidden, ulang) | `clean-clone-build-no-hatch-driver-verify.txt` (23 baris, SHA-256 `6912b8fdad0cc968f5f4a431b18a0c9db73cbb94d8e6cf5c07c79105cba2e4e4`) | INSTALL_EXIT=1, BUILD_EXIT=1 — sama dengan log kanonik; beda hanya 3 baris akhir (listing `server/dist` + `client/dist` yang tidak ada) |
| Verifikasi klaim v2.3.21 (F-044/45/46) | Cross-reference (bukan tes ulang) | SHA-256 kelima file kanonik v2.3.21 COCOK dengan yang diklaim matriks v2.3.21 (lihat § "Verifikasi v2.3.21" di bawah); log tail: 109 PASS 0 FAIL + H-MIG-09 ALL PASS |
| Verifikasi paket beta (branch `beta-readiness`) | Cross-reference | 5 file ada di branch `beta-readiness` @ `fd4441a`; keputusan BLOCKED; SHA paket `850592a` tercatat di `RELEASE_EVIDENCE.md` |
| Verifikasi fakta provider | Dokumen resmi, dicek 2026-11-08 ~13:43–13:44 WIB | Vercel Hobby, Supabase billing + pausing, Cloudflare Workers limits, D1 pricing — lihat `DEPLOYMENT_FEASIBILITY_V2322.md` §3 |

## Yang dibuktikan tiap percobaan

- **F-047 (1) — install gagal tanpa `/opt/hatch`:** clone bersih
  `file://` dari repo @ `c53fd73` ke `/tmp/v2322-clean-clone`, lalu
  `unshare -rm` + `mount --bind <dir kosong> /opt/hatch` (namespace
  user+mount; sanity `ls -A /opt/hatch` = kosong). `bun install
  --frozen-lockfile` gagal pada dependensi
  `@hatch/space-sdk: file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`
  (`site/package.json:13`, `site/bun.lock:8,29`). Ini membuktikan
  kegagalan BUKAN karena jaringan atau lockfile lain: kontrol dengan
  `/opt/hatch` terlihat menginstal SDK yang sama dengan exit 0.
- **F-047 (2) — build:client ditolak SDK meski SDK ada:** pada run
  kontrol, `build:server` sukses (bundle `actions.js` 221 KB) tetapi
  `build:client` (`bun ./client/build.mjs` → `buildClient` dari
  `@hatch/space-sdk/build`) menolak dengan pesan SDK sendiri:
  "This web artifact cannot be built by hand. To make this change, call
  the `artifact.edit` tool..." — exit 1, tanpa `client/dist/`. Artinya
  portabilitas terhalang DUA lapis independen: (a) tarball tak
  terdistribusi, (b) build client digerbangi ke tooling artifact Hatch.
  Temuan (b) ini BARU di v2.3.22 (U-97).
- **F-047 (3) — tidak ada sumber redistributable yang sah:** `npm view
  @hatch/space-sdk version` → 404 Not Found di registry npm
  (2026-11-08). SDK TIDAK dipublikasikan di npm. Tarball HANYA ada di
  path builder-local `/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`
  (2.051.070 byte; SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`;
  versi 0.14.0 dibaca dari metadata `package.json` hasil install lokal
  di `/tmp` — metadata saja, TIDAK diekstrak/didistribusikan ulang).
  SHA-512 tarball yang tercatat di `site/bun.lock:29`:
  `Q/jCTu/HlF3TRgWVdYvs8wSqu4J5eZ2nxtLxIbpOaGJ1j0oKkCLHT4r1DZkkMTDbdvr12YZUGL4KX9pzyNB+Xw==`.
- **F-048 — README:** diperbaiki langsung (file dokumentasi, bukan
  source aplikasi). Sebelum/sesudah dicatat di matriks v2.3.22 §2
  butir 4. Klaim "Repo GitHub: Belum ada" dihapus; status kini
  dibedakan empat artefak (live Hatch artifact / mirror repo / paket
  fondasi migrasi / deployment standalone masa depan) dengan tanggal
  verifikasi 2026-11-08 + bukti atau label NOT VERIFIED eksplisit.

## Verifikasi v2.3.21 (cross-reference, bukan pengulangan tes)

Atas perintah tugas: F-044/F-045/F-046 TIDAK diuji ulang (tidak ada
perubahan material pada implementasi, lingkungan, harness, atau risiko
sejak v2.3.21). Yang dilakukan adalah verifikasi klaim:

| File | SHA-256 terukur | Cocok dengan klaim matriks v2.3.21? |
| --- | --- | --- |
| `evidence/v2321/0006_unified_ownership_and_uniqueness_v2321.sql` | `6c5bcbdc4082497f682dd4d2908e71fa0f89a26bdb933c1d84b85e12edf2640c` | YA |
| `evidence/v2321/0006_down_v2321.sql` | `1f1bf2a260174d5a424cfb855b74fd06f16d5e74bfd0f114104d9f5c9eac46cf` | YA |
| `evidence/v2321/test-f044-f045-f046-migration-v2321.ts` | `6fb8bd905726b0c88d9933fe7fd4390863588360cffbb752364f60b305def040` | YA |
| `evidence/v2321/test-f044-f045-f046-migration-v2321.txt` | `24c314b57bbcfc665cc80d91cbbff4842cb48fc0c1ff9a29972ee2491a579167` | YA — tail: `=== RESULT: 109 PASS, 0 FAIL ===` |
| `evidence/v2321/test-f044-f045-f046-migration-v2321-sqlite3451.txt` | `3f3cecc313f7a700e3899e20b8a62559da58ca72f046b25d6a61d6231b8d5831` | YA — tail: `=== RESULT H-MIG-09 (sqlite3 CLI 3.45.1): ALL PASS ===` |

Tidak ditemukan cacat pada v2.3.21 dari verifikasi ini. Status
F-044/F-045/F-046 di matriks v2.3.22: **addressed in v2.3.21, carried
forward and verified by cross-reference** (desain + bukti VM; F-004
tetap OPEN/BLOCKED).

## Verifikasi paket beta (cross-reference, bukan duplikasi)

Branch `beta-readiness` @ `fd4441a` (fetch 2026-11-08): kelima file ada
(`CLOSED_BETA_READINESS.md`, `CLOSED_BETA_TEST_PLAN.md`,
`DEPLOYMENT_FREE_TIER.md`, `TESTER_QUICKSTART.md`,
`RELEASE_EVIDENCE.md`); keputusan **BLOCKED**; SHA paket `850592a`
tercatat di `RELEASE_EVIDENCE.md` §2; commit pencatat SHA `fd4441a`.
Kelima file TIDAK diduplikasi ke `main` (menghindari drift); sebagai
gantinya `main` mendapat pointer singkat
`CLOSED_BETA_PACKAGE_POINTER.md`. Klaim V15 "no beta package found"
adalah gap visibilitas branch (V15 hanya me-review `main` dan ditulis
sebelum paket di-push ~13:34 WIB), bukan paket hilang.

## Cara menjalankan ulang

Dari root repo:

```sh
sh evidence/v2322/run-clean-clone-build.sh hidden   # tanpa /opt/hatch
sh evidence/v2322/run-clean-clone-build.sh visible  # kontrol, dengan /opt/hatch
```

Kedua mode menulis log ke `evidence/v2322/clean-clone-build-*.txt`.
JANGAN timpa log kanonik di atas. Bila run ulang menghasilkan hasil
berbeda, simpan sebagai `*-rerun-<tanggal>.txt` dan catat penyebabnya.
Exit 0 driver BUKAN hasil percobaan — baca INSTALL_EXIT / BUILD_EXIT
di dalam log.
