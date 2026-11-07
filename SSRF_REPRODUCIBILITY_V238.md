# SSRF REPRODUCIBILITY MANIFEST v2.3.8

**Dokumen:** manifest reproduksibilitas mirror sumber + bukti spike
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:** F-009 (audit V2) — sejauh yang dapat diverifikasi
**Rekonsiliasi v2.3.10 (F-009/F-014, audit V3):** lihat bagian
"Rekonsiliasi v2.3.10" di bawah — hasil v2.3.9 kini dibuktikan dengan
output mentah (`evidence/v239-repro/`); status keseluruhan tetap
**NOT REPRODUCIBLE untuk clean external builder**.

## Ringkasan

| Butir | Status | Keterangan |
| --- | --- | --- |
| Bun site | ✅ tercatat | `1.3.10` (deklarasi `packageManager`) |
| Bun spike/VM | ✅ tercatat | `1.4.4` (versi yang benar-benar menjalankan harness) |
| Dependensi `package.json` | ✅ tercatat | Daftar lengkap di bawah |
| `site/bun.lock` | ✅ di-mirror | SHA-256 terverifikasi di bawah |
| SDK tarball — identitas/path | ⚠️ tercatat, provenance NOT VERIFIED | Path absolut builder-local; tarball tidak dapat diambil independen |
| Test suite site | ❌ tidak ada | Tidak ada file test/spec, tidak ada script `test` |
| CI | ❌ tidak ada | Tidak ada `.github/workflows` |
| Hasil typecheck | ✅ terverifikasi di scratch v2.3.10 | `evidence/v239-repro/repro-run1.txt`: client exit 0, server exit 0 (Bun 1.4.4, TS 5.6.3, 2026-11-07T18:49:04Z). BUKAN di bawah Bun 1.3.10 yang dideklarasikan |
| Hasil build | ❌ NOT VERIFIED | Full build TIDAK dicoba (house rules); tidak ada klaim build |
| Status keseluruhan | ❌ **NOT REPRODUCIBLE untuk clean external builder** | SDK tarball builder-local + Bun mismatch 1.4.4 vs 1.3.10 (lihat "Rekonsiliasi v2.3.10") |

## Versi runtime — dicatat apa adanya

Perbedaan versi **tidak diselaraskan secara palsu**:

| Komponen | Site (deklarasi) | Spike / VM ini (terverifikasi) |
| --- | --- | --- |
| Bun | `1.3.10` (`package.json` → `packageManager`) | `1.4.4` (`bun --version`, 2026-11-08) |
| Node | tidak dinyatakan di `package.json` | `v24.22.1` |
| Python | — | `3.12.3` |
| Kernel | — | Linux 7.0.0-43-generic x86_64 |
| Host | — | `htch-runtime`, x86_64, uid 0 (root) |

Implikasi: bukti spike (Bun 1.4.4) TIDAK membuktikan perilaku di Bun
1.3.10. Bila implementasi tahap (b) berjalan, runtime yang dipakai
harus dicatat dan harness diulang di runtime itu (STAGE-P01).

## Dependensi — `site/package.json`

Sumber: `site/package.json` (mirror commit `c68c727`, dibaca ulang
2026-11-08). Nama paket: `hatch-ts-space-cek-link-airdrop`, `private:
true`, `type: module`.

Scripts (tidak ada `test`):

| Script | Perintah |
| --- | --- |
| `typecheck` | `bun x tsc --noEmit -p client/tsconfig.json && bun x tsc --noEmit -p server/tsconfig.json` |
| `build` | `bun run build:server && bun run build:client` |
| `build:server` | `cd server && bun build ./src/actions.ts --target=bun --outfile=./dist/actions.js` |
| `build:client` | `bun ./client/build.mjs` |

Dependencies:

| Paket | Versi |
| --- | --- |
| `@hatch/space-sdk` | `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` |
| `@tanstack/react-query` | `5.100.10` |
| `drizzle-orm` | `0.45.2` |
| `react` | `19.2.5` |
| `react-dom` | `19.2.5` |
| `recharts` | `2.15.3` |
| `zod` | `4.4.3` |

DevDependencies:

| Paket | Versi |
| --- | --- |
| `@types/bun` | `1.4.2` |
| `@types/react` | `19.2.14` |
| `@types/react-dom` | `19.2.3` |
| `tailwindcss` | `4.1.13` |
| `tailwindcss-safe-area` | `1.3.0` |
| `typescript` | `5.6.3` |

## Lockfile — kini di-mirror (perbaikan v2.3.8)

- File: `site/bun.lock` (19.190 byte, lockfileVersion 2)
- SHA-256: `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f`
- Verifikasi: disalin dari live artifact
  (`~/workspace/ts-spaces/cek-link-airdrop/bun.lock`) dan diverifikasi
  byte-identik (`sha256sum` kedua file sama, 2026-11-08).
- Isi lockfile mencatat `@hatch/space-sdk` dengan sha512
  `Q/jCTu/HlF3TRgWVdYvs8wSqu4J5eZ2nxtLxIbpOaGJ1j0oKkCLHT4r1DZkkMTDbdvr12YZUGL4KX9pzyNB+Xw==`.
- Lockfile menyelesaikan resolusi dependensi — tetapi TIDAK
  menyelesaikan provenance SDK (lihat bawah).

## SDK tarball — identitas tercatat, provenance NOT VERIFIED

- Path yang dideklarasikan: `/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`
  (path absolut, builder-local).
- Tarball itu sendiri TIDAK ADA di repo dan TIDAK ADA di mirror —
  path tersebut hanya bermakna di dalam builder Hatch.
- Seorang reviewer independen di luar builder TIDAK DAPAT mengambil
  tarball ini, TIDAK DAPAT memverifikasi hash-nya terhadap sumber
  independen, dan TIDAK DAPAT membangun mirror dari nol.
- Status: **NOT VERIFIED**. Perbaikan penuh (vendoring SDK / registry
  internal / sumber SDK yang dapat diambil publik) adalah keputusan di
  luar v2.3.8 dan butuh pemilik + penyedia runtime.

## Yang tidak ada — dinyatakan, bukan disembunyikan

- **Test suite site:** tidak ada file `*.test.*` / `*.spec.*` di
  `site/` (pencarian 2026-11-08); tidak ada script `test` di
  `package.json`. Harness SSRF (H-SSRF-01..20, H-RES-01..06,
  H-CAT-01..03, H-AUTH-01..03) adalah SPESIFIKASI di
  `SSRF_RESPONSE_MATRIX_V238.md` §2 — belum ada implementasi harness
  yang dapat dijalankan.
- **CI:** tidak ada `.github/workflows` di repo; tidak ada file
  `*.yml`/`*.yaml` workflow di kedalaman repo yang diperiksa;
  GitHub combined status checks mengembalikan nol status untuk commit
  mirror dan audit (dicatat V2 §9).
- **Hasil typecheck:** TERBUKTI di salinan scratch v2.3.10
  (`evidence/v239-repro/repro-run1.txt` — client exit 0, server exit 0,
  Bun 1.4.4, TS 5.6.3). **Hasil build: tetap NOT VERIFIED.**
  Menjalankan build butuh `node_modules` dan, untuk build, melanggar
  house rules mirror (`site/AGENTS.md`: build/ship hanya via artifact
  tools, tidak pernah `bun build`). Hasil build yang sah hanya dapat
  diperoleh lewat artifact workflow — bukan dari VM ini. Konsistensi di
  bawah Bun 1.3.10 yang dideklarasikan tetap NOT VERIFIED.
- **`.gitignore`:** `node_modules/`, `.next/`, `out/`, `dist/`,
  `.env*`, `*.log`, `.DS_Store` — `*.log` adalah penyebab F-007;
  bukti v2.3.6 kini diterbitkan sebagai `.txt` di `evidence/v236/`
  agar ter-track.

## Rekonsiliasi v2.3.10 (F-009/F-014 — audit V3)

Audit V3 (F-014) menemukan manifest ini basi: matriks v2.3.9 melaporkan
`bun install --frozen-lockfile` + typecheck exit 0 di salinan scratch,
tetapi manifest ini masih menyatakan typecheck/build NOT VERIFIED dan
tidak ada output mentah yang di-commit. Rekonsiliasi ini menutup celah
itu — dengan menjalankan ulang sendiri, bukan dengan menyalin klaim lama.

**Run v2.3.10 (baru, output mentah tersimpan):**
`evidence/v239-repro/repro-run1.txt` (SHA-256
`b14f98428fdb23514cc2d470c246cf49197cd2338d0e6348f4c0abc04bf67385`,
29 baris) + `evidence/v239-repro/MANIFEST.md`. Lingkungan persis:
host `htch-runtime`, kernel Linux 7.0.0-43-generic x86_64, **Bun 1.4.4**,
Node v24.22.1, tanggal 2026-11-07T18:49:04Z (= 2026-11-08 01:49:04
WIB), salinan kerja `/tmp/scratch-site-v239` (salinan `site/` dari repo
pada commit `b42b02a`, dihapus setelah run — BUKAN repo, BUKAN live).

| Perintah | Exit | Hasil |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | 79 paket (6,43 dtk); `bun.lock` TIDAK berubah (SHA-256 `a7e1457e…` sebelum dan sesudah) |
| `bun run typecheck` (client + server, TS 5.6.3) | 0 | client exit 0, server exit 0 |

Hasil ini **mereproduksi** klaim v2.3.9 (install + typecheck exit 0 di
bawah Bun 1.4.4) dan kini didukung output mentah. Ini BUKAN run yang
sama dengan run v2.3.9 — ini run baru yang independen, dijalankan untuk
rekonsiliasi ini (justifikasi: klaim v2.3.9 tidak punya file bukti).

**Yang tetap NOT VERIFIED (tidak berubah oleh run ini):**

- SDK `@hatch/space-sdk` via `file:/opt/hatch/...` **TIDAK ada di repo**;
  tarball terverifikasi ADA di builder (0.14.0, 2.051.070 byte, SHA-256
  `f2cb7b25…`), provenance **NOT VERIFIED**. Builder eksternal tidak
  dapat mengambilnya.
- **Bun 1.4.4 vs deklarasi 1.3.10 — mismatch.** Hasil di atas TIDAK
  membuktikan konsistensi di bawah Bun 1.3.10 yang dideklarasikan
  `packageManager`.
- **Full build TIDAK dicoba / TIDAK diklaim PASS** (house rules
  `site/AGENTS.md`).
- Tidak ada test suite site; tidak ada CI.

**Status keseluruhan: NOT REPRODUCIBLE untuk clean external builder.**
Kriteria penerimaan F-014 (clean authorized build environment dapat
install frozen + typecheck/build dari pinned commit tanpa hidden
builder-local path) **TIDAK terpenuhi** — path SDK builder-local masih
menghalangi. Jangan klaim full-build PASS.

## Cara memverifikasi ulang manifest ini

```sh
cd ~/workspace/airdrop-generate-foundation
cat site/package.json            # dependensi + script + packageManager
sha256sum site/bun.lock          # harus a7e1457e…
find site -name '*.test.*' -o -name '*.spec.*'   # harus kosong
ls .github/workflows             # harus: tidak ada
git status --short               # evidence/ + site/bun.lock ter-track
```
