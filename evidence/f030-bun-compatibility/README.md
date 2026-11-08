# Bukti F-030 — Matriks kompatibilitas Bun / lockfile / SDK path

**Revisi:** v2.3.15 — jawaban atas audit independen V8 (F-030)
**Tanggal:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Percobaan dijalankan pada **SALINAN SEMENTARA** `site/` di
`/tmp/scratch-site-f030-144` (bukan `site/` di repo, bukan live
artifact). Repo TIDAK diubah oleh percobaan ini. Bukti 1.3.10
dikutip dari paket F-009 v2.3.14
(`evidence/f009-bun1310-install-typecheck/`) — TIDAK diulang di
revisi ini (bukti valid yang sudah ada; tidak ada perubahan
material pada implementasi, lingkungan, harness, atau risiko yang
membenarkan pengulangan).

## Pertanyaan (F-030)

Audit V8 benar: `packageManager` menyatakan Bun 1.3.10, tetapi
lockfile ter-commit versi 2 ditolak Bun 1.3.10 pada frozen install —
clean builder yang mengikuti `packageManager` gagal sebelum build.
Selain itu `site/package.json` menunjuk SDK melalui absolute local
path `file:/opt/hatch/...` yang tidak ada pada clean external
builder. Revisi ini menyajikan matriks kompatibilitas yang
terverifikasi dan trade-off kedua opsi — TANPA mengubah source,
`package.json`, atau `bun.lock` (HOLD sampai persetujuan
implementasi terpisah).

## Fakta yang terverifikasi

| Fakta | Nilai | Sumber |
| --- | --- | --- |
| `packageManager` | `bun@1.3.10` | `site/package.json:4` (repo, tidak diubah) |
| `lockfileVersion` ter-commit | `2` | `site/bun.lock:2` (repo, tidak diubah) |
| SHA-256 `site/bun.lock` di repo | `a7e1457ee5cb6423d6e2a08c4058fd63c1c05f5a17b01f5bd8d1aebe1d89405f` | dicatat v2.3.9, dikonfirmasi ulang di sini |
| SDK path | `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` | `site/package.json:13` (repo, tidak diubah) |
| Tarball SDK di VM ini | ada, 2.051.070 byte, SHA-256 `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`, mtime 1 Jan 1980 | diverifikasi ulang 2026-11-08 (SAMA dengan v2.3.9) |
| Provenance SDK | NOT VERIFIED (tarball builder-local; tidak ada registry/digest resmi yang dapat diambil builder) | v2.3.9–v2.3.14, dipertahankan |

## Matriks kompatibilitas (terverifikasi)

| Dimensi | Bun 1.3.10 (kanonik, `packageManager`) | Bun 1.4.4 (`1.4.4+38afee6c8`) |
| --- | --- | --- |
| Membaca lockfile v2 ter-commit | **TIDAK** — `Unknown lockfile version`, frozen install exit 1 | **YA** — frozen install membaca lockfile v2 |
| Frozen install (`--frozen-lockfile`) | **GAGAL exit 1** (log F-009: `run-1310-install.txt`, SHA-256 `75641b13…`) | **BERHASIL exit 0**, 79 paket, lockfile TIDAK berubah (hash tetap `a7e1457e…`) — log baru `run-144-frozen-install-typecheck.txt` |
| Install non-frozen | Berhasil exit 0 (79 paket) tetapi **menulis ulang lockfile ke v1** di scratch — resolusi di bawah 1.3.10 berbeda format dari lockfile ter-commit (log F-009) | Tidak diuji di revisi ini (tidak diperlukan untuk matriks; frozen sudah lolos) |
| Typecheck (`bun run typecheck`, client + server) | **NOT VERIFIED terhadap lockfile ter-commit v2** — typecheck exit 0 hanya berlaku terhadap lockfile hasil regenerasi v1 di scratch (log F-009) | **BERHASIL exit 0** terhadap lockfile ter-commit v2 (log baru `run-144-frozen-install-typecheck.txt`) |
| Build penuh (`bun run build`) | **NOT RUN** — house rules v2.3.9 tetap berlaku (tidak ada `bun run build` dari `site/`); bukan bukti build | **NOT RUN** — sama; build penuh tetap NOT VERIFIED pada kedua versi |
| SDK path `file:/opt/hatch/...` | Install berhasil HANYA karena path itu ada di VM ini | Install berhasil HANYA karena path itu ada di VM ini |
| Clean external builder (tanpa `/opt/hatch`) | **TIDAK DAPAT install sama sekali** — gagal di lockfile v2 SEBELUM mencapai SDK path | **TIDAK DAPAT install sama sekali** — lockfile lolos, tetapi SDK path absolut tidak ada |
| Dependency digest / provenance | NOT VERIFIED (tidak ada digest dependency yang tercatat dari lockfile; provenance SDK NOT VERIFIED) | NOT VERIFIED (sama) |
| CI / workflow | Tidak ada `.github/workflows/` di repo (audit V8 §4.5) — tidak ada CI pada kedua versi | sama |

**Versi Bun minimum yang menerima lockfile v2: NOT VERIFIED.**
Hanya dua versi yang terverifikasi dari bukti repo (1.3.10 menolak,
1.4.4 menerima). Sweep versi di antara keduanya (mis. 1.3.x akhir /
1.4.0–1.4.3) TIDAK dilakukan di revisi ini — keputusan G-G hanya
membutuhkan satu versi kompatibel yang terverifikasi (1.4.4) versus
kanonik yang dinyatakan (1.3.10). Sweep versi adalah pekerjaan
lanjutan bila owner memilih opsi yang membutuhkannya.

## Trade-off Opsi A vs Opsi B (keduanya PROPOSAL — HOLD)

### Opsi A — Naikkan Bun kanonik ke versi yang kompatibel lockfile v2 (mis. 1.4.4)

| Aspek | Penilaian |
| --- | --- |
| Yang berubah | `packageManager` di `site/package.json` (`bun@1.3.10` → versi baru); kemungkinan penyesuaian dokumentasi versi kanonik |
| Yang TIDAK berubah | `site/bun.lock` tetap v2 (sudah kompatibel); resolusi dependensi tidak berubah |
| Bukti yang sudah ada | Frozen install + typecheck 1.4.4 exit 0 terhadap lockfile ter-commit (v2.3.9 + log baru revisi ini) |
| Keuntungan | Tidak ada regenerasi lockfile; tidak ada risiko resolusi dependensi berubah; bukti 1.4.4 sudah dua kali terkonfirmasi |
| Kerugian/risiko | Versi runtime berubah — SEMUA bukti VM yang memakai 1.3.10 sebagai "kanonik" harus dibaca ulang sebagai bukti versi lama (U-62 dan eksperimen F-024/F-026/F-027/F-029 memakai 1.3.10); perilaku runtime 1.4.4 pada chunk/dekompresi/GC berbeda dari 1.3.10 (terbukti di F-026/F-029); runtime artifact staging harus memakai versi baru itu — belum terverifikasi |
| Prasyarat | Keputusan owner (G-G) + otorisasi tahap (b) terpisah; verifikasi ulang perilaku `Response.body`/chunk/GC pada versi baru di staging; build penuh pada versi baru |

### Opsi B — Regenerasi lockfile dengan Bun 1.3.10 (v1), kunci kanonik tetap 1.3.10

| Aspek | Penilaian |
| --- | --- |
| Yang berubah | `site/bun.lock` ditulis ulang ke v1 oleh Bun 1.3.10 |
| Yang TIDAK berubah | `packageManager` tetap `bun@1.3.10`; source aplikasi tidak berubah |
| Bukti yang sudah ada | Install non-frozen 1.3.10 berhasil di scratch (79 paket) + typecheck exit 0 terhadap lockfile hasil regenerasi (log F-009) |
| Keuntungan | Kanonik tidak berubah — semua bukti VM 1.3.10 tetap berlaku pada versi yang dinyatakan; tidak ada migrasi runtime |
| Kerugian/risiko | Resolusi dependensi HARUS diverifikasi ulang (lockfile v1 hasil regenerasi belum dibandingkan paket-per-paket dengan lockfile v2 ter-commit — perbedaan versi dependensi transitif mungkin ada dan belum diperiksa); frozen install + typecheck terhadap lockfile hasil regenerasi belum dibuktikan sebagai satu alur bersih (typecheck F-009 dilakukan setelah install non-frozen di scratch yang sama); lockfile v1 adalah format lama — dukungan masa depan tidak dijamin |
| Prasyarat | Keputusan owner (G-G) + otorisasi tahap (b) terpisah; diff resolusi dependensi v1 vs v2 diperiksa paket-per-paket; frozen install + typecheck + build dari lockfile hasil regenerasi pada clean builder; SDK path tetap harus diganti (lihat bawah) |

### Penggantian absolute local SDK path (wajib di KEDUA opsi)

Opsi A maupun B TIDAK menyelesaikan blocker SDK path. Clean builder
tanpa `/opt/hatch` tetap gagal pada `file:/opt/hatch/...` apa pun
versi Bun-nya. Pengganti yang diusulkan (dipilih owner + runtime
provider, perubahan source — HOLD):

1. **Paket ter-publish berversi** (registry / URL bertanda digest)
   yang dapat diambil clean builder; versi dikunci di
   `package.json` + `bun.lock`. Paling kuat provenance-nya bila
   registry menyediakan digest + tanda tangan.
2. **Vendorkan artefak SDK berversi ke dalam repo** dengan digest
   SHA-256 yang tercatat dan diverifikasi saat install (tarball
   yang sama dengan yang ada di VM ini, SHA-256 `f2cb7b25…` —
   tetapi provenance tarball itu sendiri tetap harus dinyatakan
   provider, bukan diasumsikan dari keberadaannya di VM).
3. **Artefak SDK dari sumber resmi runtime provider** dengan
   provenance yang dapat diverifikasi (URL + digest + rujukan
   rilis resmi).

Acceptance penggantian SDK path: frozen install + typecheck pada
Bun kanonik dari clean external builder (tanpa `/opt/hatch`),
raw output + dependency digest tercatat, lockfile tidak berubah.
Sampai ketiganya (keputusan Bun + penggantian SDK path +
pembuktian clean-builder) selesai, **F-009 tetap
NOT REPRODUCIBLE** dan **F-030 tetap CONFIRMED BLOCKER**.

## Metode (revisi ini)

- Salin `site/` → `/tmp/scratch-site-f030-144` (salinan penuh,
  termasuk `bun.lock` ter-commit, hash `a7e1457e…` sebelum dan
  sesudah).
- Bun 1.4.4: `/opt/hatch-image/bin/bun` (`1.4.4+38afee6c8`).
- Langkah 1: `bun install --frozen-lockfile` → log
  `run-144-frozen-install-typecheck.txt` (exit 0, 79 paket,
  lockfile tidak berubah).
- Langkah 2: `bun run typecheck` pada salinan yang sama → log
  yang sama (exit 0, client + server, tanpa diagnostik).
- SDK tarball diverifikasi ulang: ada, SHA-256 SAMA dengan v2.3.9
  (`f2cb7b25…`).
- Bukti 1.3.10 TIDAK diulang: log F-009 v2.3.14 sudah membuktikan
  kegagalan frozen install (`Unknown lockfile version`) dan
  keberhasilan non-frozen + regenerasi v1; tidak ada perubahan
  material yang membenarkan pengulangan (protokol butir 6).
- Build penuh TIDAK dicoba pada versi mana pun (house rules
  v2.3.9 + `site/AGENTS.md`: jangan `bun run build` dari `site/`).

## SHA-256

| File | SHA-256 |
| --- | --- |
| `run-144-frozen-install-typecheck.txt` | `549c0c1a4614c9818f55a4bcf7c56562e99b43200188d1d345dcec59ecd3e160` |

## Batasan (dicatat jujur)

- Percobaan memakai salinan scratch di `/tmp`; direktori itu
  ephemeral — log mentah di paket ini adalah bukti yang
  dipertahankan, bukan salinan scratch itu.
- Install mengunduh paket dari registry publik (jaringan tersedia
  di VM ini); clean external builder tanpa akses registry yang
  sama akan gagal karena alasan berbeda.
- Tidak ada build penuh yang dicoba; tidak ada CI.
- Versi Bun minimum yang menerima lockfile v2 NOT VERIFIED
  (hanya 1.3.10 dan 1.4.4 yang terverifikasi).
- Matriks ini TIDAK mengubah status F-009/F-030 menjadi
  reproducible — ia hanya mendokumentasikan keputusan yang
  dibutuhkan dan bukti yang sudah ada.
