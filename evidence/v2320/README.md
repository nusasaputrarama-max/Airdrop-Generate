# Bukti v2.3.20 — jawaban atas audit independen V13 (F-038..F-043)

**Revisi:** v2.3.20 — jawaban atas `SSRF_INDEPENDENT_AUDIT_V13.md`
(commit `fe84a4b`, audit 2026-11-08 12:16–12:20 WIB atas v2.3.19
commit `f2f928f`)
**Tanggal run:** 2026-11-08 (WIB)
**Lingkungan bukti: VM LOKAL SAJA — BUKAN staging, BUKAN produksi.**
Bun 1.4.4, uid 0 (root — lihat catatan di bawah). Tidak ada jaringan
luar (server uji hanya 127.0.0.1), tidak ada `checkLink`, tidak ada
artifact live, tidak ada DB/katalog nyata (F-043 memakai
`bun:sqlite` in-memory).

## Catatan uid 0

Tes-tes di paket ini berjalan sebagai root (uid 0) — BERBEDA dengan
paket F-035/U-72 v2.3.19 yang berjalan sebagai uid 65534. Alasannya
tercatat jujur: keempat tes ini TIDAK membuat assertion yang
bergantung pada privilege — tidak ada fixture di `/tmp` yang
dibuat/dihapus, tidak ada path yang ditimpa, tidak ada proses
lain yang di-signal. Yang diuji adalah fungsi murni, perilaku
`fetch`/stream Bun, dan SQLite in-memory. Menjalankan ulang
sebagai non-root tidak mengubah satu pun assertion (tidak ada
yang membaca `/proc`, uid, atau permission). Bila auditor
menginginkan run non-root, pola stage + verifikasi sha256 dari
matriks v2.3.19 §10 butir 1 tetap berlaku.

## Aturan raw log (baru, jawaban V13 §8 butir 7)

Setiap run gagal dan run ulang disimpan sebagai file TERPISAH dan
tidak pernah ditimpa. Paket ini mempraktikkannya:
- `test-f038-layers-v2320-run1-label.txt` — run 12:54:27 WIB, 8 PASS,
  tetapi label satu assertion menyebut "max 16 KiB" padahal chunk
  teramati 483.616 byte. Skrip diperbaiki (label), re-run ke file
  kanonik. Run 1 dipertahankan.
- `test-f043-canonical-v2320-run1-fail.txt` — run 12:54:45 WIB, GAGAL
  (exit 1): varian "lowercase seluruh alamat Solana" ternyata BUKAN
  alamat Solana yang valid (`'l'` bukan karakter base58) — cacat
  pada TES, bukan pada fungsi yang diuji. Skrip diperbaiki (varian
  satu huruf), re-run PASS.
- `test-f039-tryreserve-v2320-run1-noisy.txt` — run 12:54:45 WIB,
  22 PASS tetapi 3 unhandled AbortError dari `reader.cancel()` tanpa
  await (Bun mencetak stack trace, tetap exit 0 — false green).
- `test-f039-tryreserve-v2320-run2-fail.txt` — run 12:57:35 WIB,
  22 PASS + 1 FAIL: handler unhandledRejection yang baru menangkap
  3 AbortError yang sama. Akar masalah ditemukan: `reader.cancel()`
  tanpa await di `finally`. Diperbaiki (`await` + try/catch), re-run PASS.

## Tes + log kanonik

| File tes | Log kanonik | Hasil | Menjawab |
| --- | --- | --- | --- |
| `test-f038-layers-v2320.ts` (`f78335d8…`) | `test-f038-layers-v2320.txt` (`001c24a6…`, 19 baris, 12:54:41 WIB) | **8 PASS, 0 FAIL** | F-038 |
| `test-f042-guard-v2320.ts` (`80332a6f…`) | `test-f042-guard-v2320.txt` (`3108312f…`, 53 baris, 12:54:41 WIB) | **47 PASS, 0 FAIL** | F-042 |
| `test-f043-canonical-v2320.ts` (`6923db5a…`) | `test-f043-canonical-v2320.txt` (`6cb5ddcf…`, 33 baris, 12:57:35 WIB) | **27 PASS, 0 FAIL** | F-043 |
| `test-f039-tryreserve-v2320.ts` (`2b16ea32…`) | `test-f039-tryreserve-v2320.txt` (`a94ad487…`, 39 baris, 12:58:21 WIB) | **23 PASS, 0 FAIL** | F-039 |

Total: **105 assertion PASS, 0 FAIL** pada log kanonik.

## Yang dibuktikan tiap tes

- **F-038** (`test-f038-layers-v2320.ts`): fixture gzip 520 byte wire
  → 500.000 byte decoded (rasio 961,5x). Chunk `Response.body` Bun
  berjumlah 500.000 (decoded) — menghitungnya sebagai "wire" berarti
  overstate ~962x. Transport mentah (`node:http`) mengukur 520 byte
  (wire sebenarnya). `fetch()` dengan `Accept-Encoding: identity`
  TETAP mendekompresi (500.000 byte, bukan gzip magic) — aplikasi
  tidak dapat memperoleh raw bytes lewat Bun fetch.
- **F-042** (`test-f042-guard-v2320.ts`): cermin pseudodiff
  `validateDestination` v2.3.20 — empty/null/undefined set → deny;
  NODATA/NXDOMAIN/resolver error/timeout → deny; jawaban campuran →
  deny; 19 alamat terlarang/malformed/non-kanonik/zone → deny;
  mapped publik → ok dengan IPv4 hasil ekstraksi; port hanya
  80/443 (81/8080/8443/22/443-di-http/80-di-https/ftp/userinfo →
  deny); DNS lambat → deny timeout dalam 100 ms; late result tiba
  tetapi tidak dipakai; connect hanya dipanggil bila guard ok.
- **F-043** (`test-f043-canonical-v2320.ts`): fungsi kanonikalisasi
  JS vs generated column + unique index SQLite (teks migrasi 0006
  v2, `bun:sqlite` in-memory) — hasilnya IDENTIK untuk semua 7
  baris. EVM case-insensitive (varian case/prefix/whitespace →
  collision); Solana case-sensitive (satu huruf beda case = alamat
  berbeda; full-lowercase ditolak karena `'l'` bukan base58); alamat
  sama di chain berbeda → OK; NULL → boleh >1 baris; chain tak
  dikenal → reject aplikasi + CHECK constraint DB.
- **F-039** (`test-f039-tryreserve-v2320.ts`): (1) simulasi lockstep
  deterministik — logika baru `tryReserve`: A1 = 989.824 ≤ cap;
  logika lama v2.3.19 (append-dulu): A1 = 1.186.432 > cap, overshoot
  186.432 = 3 chunk (klaim "cap + satu chunk" SALAH); varian serial:
  A1 = tepat 1.000.000. (2) jaringan lokal nyata — paralel dan
  serial: A1 ≤ cap, abort terjadi, 0 append setelah abort, hasil
  parsial dibuang; latensi paralel 19–22 ms vs serial 25–28 ms
  (trade-off terukur, jauh di bawah deadline 20 detik).

## Cara menjalankan ulang

Dari direktori ini:

```sh
bun test-f038-layers-v2320.ts > test-f038-layers-v2320.txt 2>&1
bun test-f042-guard-v2320.ts > test-f042-guard-v2320.txt 2>&1
bun test-f043-canonical-v2320.ts > test-f043-canonical-v2320.txt 2>&1
bun test-f039-tryreserve-v2320.ts > test-f039-tryreserve-v2320.txt 2>&1
```

Bila ada run yang gagal: JANGAN timpa file log di atas. Simpan log
gagal dengan nama `*-run<N>-fail.txt`, perbaiki penyebabnya, lalu
re-run ke nama kanonik. Exit 0 = semua assertion PASS.
