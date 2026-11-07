# Koreksi DATA-PLAN.md Live Artifact — F-015 (teks disiapkan, BELUM diterapkan)

**Dokumen:** teks koreksi yang disiapkan untuk parent (v2.3.10, 2026-11-08)
**Status:** DISIAPKAN SAJA — JANGAN diterapkan dengan mengedit file live
langsung. Perlu workflow artifact yang disetujui (parent mengajukan edit
ke builder artifact slug `cek-link-airdrop`, builder menerapkan, lalu
mirror `site/DATA-PLAN.md` di repo disinkronkan ulang).
**Menjawab:** F-015 (audit V3 §5) — klaim same-origin di DATA-PLAN yang
tidak diberlakukan kode.

## Yang salah di live artifact saat ini

`DATA-PLAN.md` di live artifact (dan, sebelum v2.3.10, mirror
`site/DATA-PLAN.md`) pada paragraf "Target page fetch + static signal
scan" berbunyi: scan HTML "plus up to 3 same-origin script files".
Klaim itu SALAH terhadap kode: `site/server/src/actions.ts` ~baris
373–386 mengekstrak sampai 3 URL `<script src>` dari HTML lalu memanggil
`fetchText` pada tiap URL yang di-resolve terhadap final URL — tanpa
pemeriksaan origin apa pun. Aturan same-origin-only adalah kontrol masa
depan yang belum diimplementasikan (desain remediasi F-001,
`SSRF_REMEDIATION_DESIGN.md` §D.4.18, harness H-SSRF-13/H-SSRF-14).

## Teks pengganti eksak (untuk diterapkan di live artifact)

Ganti kalimat Processing yang bersangkutan dengan teks berikut (sama
dengan yang sudah diterapkan di mirror `site/DATA-PLAN.md` v2.3.10):

> **Processing**: fetch with redirect following (record final URL +
> cross-domain redirect), cap body size, scan HTML plus up to 3 script
> files referenced by the page (resolved against the final URL — **no
> same-origin restriction is enforced by the current code**: any origin
> the page references is fetched, see `site/server/src/actions.ts`
> ~lines 373–386, which extracts up to 3 `<script src>` URLs and calls
> `fetchText` on each resolved URL without an origin check) for: EVM
> addresses (0x{40}), Solana base58 addresses, wallet-connect patterns
> (`connect wallet`, window.solana/ethereum, signTransaction,
> WalletConnect), claim/airdrop bait phrases, atob/eval obfuscation,
> presence of X/Telegram/social links, HTTPS. Each signal contributes
> to a transparent score; the verdict (BAHAYA / WASPADA / LEBIH AMAN)
> and every signal are shown individually so the user sees the evidence,
> not just a color.
>
> **Koreksi v2.3.10 (F-015):** kalimat di atas sebelumnya berbunyi "up
> to 3 same-origin script files" — klaim itu SALAH terhadap kode: tidak
> ada pembatasan same-origin di implementasi saat ini. Aturan
> same-origin-only adalah **kontrol masa depan yang belum
> diimplementasikan** (bagian dari desain remediasi F-001,
> `SSRF_REMEDIATION_DESIGN.md` §D.4.18, harness H-SSRF-13/H-SSRF-14),
> bukan perilaku saat ini.

## Verifikasi setelah diterapkan (oleh parent/builder)

1. Buka DATA-PLAN.md live artifact; pastikan frasa "same-origin script
   files" sebagai klaim perilaku saat ini sudah tidak ada.
2. Pastikan tidak ada nilai sensitif yang ikut berubah — edit ini hanya
   teks perilaku fetch, bukan redaksi F-006 (redaksi live F-006 sudah
   dilakukan terpisah 2026-11-08 ~00:59 WIB, lihat matriks v2.3.10
   F-006c).
3. Setelah live diperbarui, sinkronkan mirror `site/DATA-PLAN.md` dari
   live artifact dan catat commit sinkronisasi di matriks berikutnya.
