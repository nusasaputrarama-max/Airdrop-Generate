# MANIFEST — Bukti Reproduksibilitas v2.3.9/v2.3.10 (evidence/v239-repro/)

**Direktori:** `evidence/v239-repro/`
**Tanggal run:** 2026-11-08 ~01:49 WIB (2026-11-07T18:49:04Z)
**Menjawab:** F-009 / F-014 (audit V2 + V3) — rekonsiliasi
`SSRF_REPRODUCIBILITY_V238.md` dengan hasil v2.3.9
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED

## Lingkungan run (dicatat persis, bukan diselaraskan)

| Butir | Nilai |
| --- | --- |
| Host / VM | `htch-runtime` (x86_64) |
| Kernel | Linux 7.0.0-43-generic x86_64 (`Linux htch-runtime 7.0.0-43-generic #1 SMP PREEMPT_DYNAMIC Fri Oct 23 11:56:57 UTC 2026 x86_64`) |
| Bun | **1.4.4** (`bun v1.4.4 (38afee6c8)`) — BUKAN 1.3.10 yang dideklarasikan `packageManager` |
| Node | v24.22.1 |
| Tanggal/jam run | 2026-11-07T18:49:04Z = 2026-11-08 01:49:04 WIB |
| Salinan kerja | `/tmp/scratch-site-v239` (salinan `site/` dari repo, commit `b42b02a`); dihapus setelah run |
| Perintah | `bun install --frozen-lockfile`, lalu `bun run typecheck` |

**Catatan koreksi:** baris kedua output mentah berbunyi
`2026-11-07 18:49:04 UTC (WIB)` — label "(WIB)" itu SALAH (TZ shell
adalah UTC saat run). Waktu yang benar adalah 18:49:04 UTC =
01:49:04 WIB. Label yang salah dipertahankan apa adanya di file output
mentah (tidak diedit); koreksi ini yang berlaku.

## Hasil (output mentah: `repro-run1.txt`)

| Perintah | Exit status | Hasil |
| --- | --- | --- |
| `bun install --frozen-lockfile` | **0** | 79 paket terinstal (6,43 dtk); `bun.lock` TIDAK berubah — SHA-256 `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f` sebelum dan sesudah |
| `bun run typecheck` (= `bun x tsc --noEmit -p client/tsconfig.json && bun x tsc --noEmit -p server/tsconfig.json`, TypeScript 5.6.3) | **0** | client exit 0, server exit 0 |

- SHA-256 file output mentah: `b14f98428fdb23514cc2d470c246cf49197cd2338d0e6348f4c0abc04bf67385`
  (`repro-run1.txt`, 29 baris).

## Yang TERBUKTI dan yang TIDAK

**Terbukti (di VM ini, Bun 1.4.4):** frozen install berhasil dari
`site/bun.lock` yang di-mirror; typecheck client+server lolos. Ini
mereproduksi klaim v2.3.9 dengan output mentah yang kini tersimpan —
v2.3.9 hanya melaporkannya di matriks tanpa file bukti.

**Tetap NOT VERIFIED / NOT REPRODUCIBLE untuk clean external builder:**

- **SDK `@hatch/space-sdk` via `file:/opt/hatch/...` TIDAK ada di repo.**
  Tarball terverifikasi ADA di builder (`/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`,
  2.051.070 byte, SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`,
  versi 0.14.0) — tetapi provenance-nya **NOT VERIFIED** (path
  builder-local, mtime 1 Jan 1980, tidak ada sumber/commit/signature
  yang dapat diperiksa dari repo). Builder eksternal tidak dapat
  mengambilnya.
- **Bun 1.4.4 vs deklarasi 1.3.10 — mismatch.** Hasil di atas TIDAK
  membuktikan perilaku di bawah Bun 1.3.10 yang dideklarasikan
  `packageManager`. Konsistensi di bawah 1.3.10 tetap NOT VERIFIED.
- **Full build TIDAK dicoba / TIDAK diklaim PASS.** `bun run build`
  tidak dijalankan (house rules `site/AGENTS.md`: build/ship hanya via
  artifact tools). Tidak ada klaim build dari VM ini.
- **Tidak ada test suite site, tidak ada CI.** Status v2.3.8 berdiri.

**Status keseluruhan: NOT REPRODUCIBLE untuk clean external builder.**
Seorang reviewer independen di luar builder Hatch tetap tidak dapat
membangun mirror dari nol. Perbaikan penuh (vendoring SDK / registry
internal / sumber SDK yang dapat diambil / CI) adalah keputusan di luar
revisi ini dan butuh pemilik + penyedia runtime.

## Verifikasi ulang

```sh
cd ~/workspace/airdrop-generate-foundation
sha256sum evidence/v239-repro/repro-run1.txt   # harus b14f9842…
cat evidence/v239-repro/repro-run1.txt         # baca output mentah
```
