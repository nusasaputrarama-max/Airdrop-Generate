# Bukti F-009 — Frozen install + typecheck pada Bun 1.3.10 (kanonik)

**Revisi:** v2.3.14 — jawaban atas audit independen V7 (butir handoff 6:
clean build provenance) dan risiko U-62
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Percobaan dijalankan pada **SALINAN SEMENTARA** `site/` di
`/tmp/scratch-site-1310` (bukan `site/` di repo, bukan live artifact).
Repo TIDAK diubah oleh percobaan ini: `site/bun.lock` di repo tetap
SHA-256 `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f`
(sama dengan yang tercatat v2.3.9).

## Pertanyaan

Apakah pohon yang ter-commit dapat di-install secara frozen dan
di-typecheck pada **Bun 1.3.10** — versi kanonik yang dideklarasikan
`packageManager` di `site/package.json`? v2.3.9 membuktikan frozen
install + typecheck hanya pada Bun 1.4.4. Audit V7 (B-05) meminta
frozen install + typecheck pada 1.3.10 dari clean external builder.

## Metode

- Salin `site/` → `/tmp/scratch-site-1310` (salinan penuh, termasuk
  `bun.lock` yang ter-commit).
- Bun 1.3.10: `/tmp/bun1310/bun-linux-x64/bun` (diunduh dari rilis
  resmi oven-sh/bun `bun-v1.3.10`, revisi `1.3.10+30e609e08`).
- Langkah 1: `bun install --frozen-lockfile` → log
  `run-1310-install.txt`.
- Langkah 2: `bun run typecheck` (tanpa install) → log
  `run-1310-typecheck.txt` (hanya mengukur efek turunan dari
  kegagalan langkah 1).
- Langkah 3 (diagnostik, salinan scratch saja): `bun install`
  tanpa `--frozen-lockfile` → log `run-1310-install-nofrozen.txt`;
  lalu `bun run typecheck` → log
  `run-1310-typecheck-after-install.txt`.
- Hash `bun.lock` dicatat sebelum/sesudah setiap langkah.

## Hasil

| Langkah | Hasil |
| --- | --- |
| 1. Frozen install, Bun 1.3.10, lockfile ter-commit | **GAGAL, exit 1.** `error: Unknown lockfile version` pada `bun.lock:2` — lockfile ter-commit memakai `"lockfileVersion": 2`, yang tidak dikenali Bun 1.3.10. Bun mengabaikan lockfile lalu menolak karena frozen (`lockfile had changes, but lockfile is frozen`). `bun.lock` TIDAK berubah (hash tetap `a7e1457e…`). |
| 2. Typecheck tanpa install, Bun 1.3.10 | **GAGAL, exit 1** — hanya efek turunan: tidak ada `node_modules`, `tsc` tidak menemukan type definition `bun-types` / `react` / `react-dom`. Bukan bukti typecheck gagal pada pohon yang ter-install. |
| 3a. Install TANPA frozen, Bun 1.3.10 (scratch saja) | **BERHASIL, exit 0** — 79 paket ter-install dalam 26,03 detik. Tetapi lockfile **ditulis ulang ke `"lockfileVersion": 1`** di salinan scratch — resolusi dependensi di bawah 1.3.10 berbeda formatnya dari lockfile ter-commit. |
| 3b. Typecheck setelah install non-frozen, Bun 1.3.10 | **BERHASIL, exit 0** — `tsc --noEmit` client + server tanpa diagnostik. Berlaku HANYA terhadap lockfile hasil regenerasi v1 di scratch, BUKAN terhadap lockfile ter-commit v2. |

## Temuan

1. **Frozen install pada kanonik 1.3.10 GAGAL.** Lockfile ter-commit
   (v2) evidentemente dihasilkan/dimigrasi oleh Bun yang lebih baru
   (1.4.x). Versi kanonik yang dideklarasikan dan lockfile yang
   ter-commit **tidak kompatibel** — clean builder yang memakai
   1.3.10 tidak dapat mereproduksi install dari pohon ter-commit.
   Ini temuan BARU v2.3.14 (risiko U-66) yang memperkeras F-009:
   status tetap **NOT REPRODUCIBLE** untuk clean external builder.
2. **Typecheck 1.3.10 exit 0 hanya berlaku bersyarat** (setelah
   regenerasi lockfile v1). Typecheck terhadap lockfile ter-commit
   v2 di bawah 1.3.10 tetap **NOT VERIFIED** — tidak ada jalur
   frozen yang berhasil.
3. **Keputusan G-G kini punya bukti konkret.** Dua opsi:
   - (a) **Adopsi Bun yang lebih baru sebagai kanonik** (mis.
     1.4.4, yang membaca lockfile v2 dan terbukti frozen install +
     typecheck di v2.3.9) — butuh keputusan owner + pembaruan
     `packageManager` (perubahan source, butuh otorisasi tahap b).
   - (b) **Regenerasi lockfile di bawah 1.3.10** (v1) dan kunci
     kanonik tetap 1.3.10 — butuh regenerasi + verifikasi ulang
     resolusi dependensi + keputusan owner (perubahan lockfile
     adalah perubahan source, butuh otorisasi tahap b).
   Sampai salah satu diputuskan dan dibuktikan, F-009 tetap
   NOT REPRODUCIBLE dan clean external builder tetap NOT VERIFIED.
4. **Absolute local SDK path tetap menjadi blocker terpisah.**
   `site/package.json` masih menunjuk
   `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`.
   Install di VM ini berhasil karena path itu ada di VM ini; clean
   external builder tanpa `/opt/hatch` tetap TIDAK dapat meng-install
   sama sekali. Rencana desain penggantian jalur ada di §D.4.25
   desain v2.3.14 (registry/paket ter-publish, atau artefak SDK
   berversi dengan digest + sumber yang dapat diambil builder) —
   rencana saja; tidak ada perubahan `package.json`/`bun.lock` di
   revisi ini.

## SHA-256

| File | SHA-256 |
| --- | --- |
| `run-1310-install.txt` | `75641b138c5e293b6c14d125c4eb0054d807e5ce640ecb30792b598e06f4b33b` |
| `run-1310-typecheck.txt` | `2ce3714060c688bbb36dd4c0470d37c5ef6780ff55963824fa9496b8913bb353` |
| `run-1310-install-nofrozen.txt` | `d765037d8a70a070b6b8cebca17c7defa0cfdd516f52ac9271a961156d175bfb` |
| `run-1310-typecheck-after-install.txt` | `772c40b94a86a71230bdb7860f156c7362ae5aa39aa205d3455613b495816786` |

## Batasan (dicatat jujur)

- Percobaan memakai salinan scratch di `/tmp`; direktori itu
  ephemeral dan dapat dibersihkan antar sesi — log mentah di paket
  ini adalah bukti yang dipertahankan, bukan salinan scratch itu.
- Install non-frozen mengunduh paket dari registry publik (jaringan
  tersedia di VM ini); clean external builder tanpa akses registry
  yang sama akan gagal karena alasan berbeda.
- Tidak ada build penuh yang dicoba (house rules v2.3.9 tetap
  berlaku); hanya install + typecheck.
- SDK tarball terbukti ada di VM ini (`@hatch/space-sdk`, SHA-256
  `f2cb7b25…` tercatat v2.3.9) — provenance-nya tetap NOT VERIFIED.
