# Evidence v2.3.23 — README (provenance)

**Revisi:** v2.3.23 (jawaban atas audit independen V16, commit
`7e82818`) — implementasi D-01..D-04 di branch `dev`.
**Tanggal run:** 2026-11-08 (WIB).
**Runtime VM:** Bun 1.4.4, Node v24.22.1, sqlite3 CLI 3.45.1
(2024-01-30), SQLite Bun 3.53.4, drizzle-kit 0.31.4 +
drizzle-orm 0.45.2.
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED FOR
RELEASE. Semua bukti di sini adalah bukti **VM**, BUKAN bukti
staging dan BUKAN bukti produksi. Tidak ada `app.db` live yang
disentuh; semua DB pengujian disposable di `/tmp` (mkdtemp).
Tidak ada request ke metadata/internal network atau host publik
selama pengujian (stub resolver/connector + server HTTP lokal
disposable saja).

## Cara menjalankan ulang harness

Dari root worktree branch `dev`:

```sh
bun evidence/v2323/test-migration-v2323.ts   # 232 test, ~1 detik
bun evidence/v2323/test-ssrf-guard-v2323.ts  # 32 test, ~10 detik
bun evidence/v2323/test-resource-v2323.ts    # 15 test, ~21 detik (H-RES-15: deadline 20 detik)
bun evidence/v2323/test-lease-v2323.ts       # 8 test, ~1 detik
```

Exit code 0 = semua PASS. Setiap harness gagal pada
`unhandledRejection` mana pun. Log disimpan sebagai `.txt`
(repo meng-ignore `*.log` — konvensi v2321).

## Isi direktori

| File | SHA-256 | Isi |
| --- | --- | --- |
| `0006_down.sql` | `beb65c07…` | Down migration 0006 (operator-run via sqlite3 CLI; BUKAN via migrator drizzle) |
| `0007_down.sql` | `d4553c76…` | Down migration 0007 (baru; DROP `scan_leases` + `rate_limits` + VALIDATION V-D7..D9) |
| `run-clean-clone-build.sh` | `9ae1b18b…` | Driver clean-clone portabel (perbaikan U-103): argumen `--repo`/`--ref`, default remote, mktemp+trap, output dari lokasi script, status setup exit 2 |
| `check-setup-hidden.txt` | `54516c79…` | Log `--check-setup-only` (hidden): clone remote shallow ref `dev` @ `f25bb24` + unshare OK, exit 0; mktemp dir terhapus |
| `t-01-verification.txt` | `90bed48d…` | Upaya verifikasi T-01 via tooling yang tersedia — tetap BLOCKED (tanpa jalur create/publish) |
| `landing-page-status.txt` | `045ba28f…` | Status landing page (parent-reported): dibangun, verifikasi internal lulus, BELUM ADA URL publik |
| `test-migration-v2323.ts` | `d18f5a31…` | Harness H-MIG/H-CAT/H-TEN/DK (1558 baris) |
| `test-migration-v2323.txt` | `123ec878…` | Log kanonik run-4: **232 PASS / 0 FAIL, exit 0** |
| `test-migration-v2323-run1-fail.txt` | `f3fcf663…` | Run gagal 1 (dipertahankan terpisah) |
| `test-migration-v2323-run2-fail.txt` | `c50948b7…` | Run gagal 2 (dipertahankan terpisah) |
| `test-migration-v2323-run3-fail.txt` | `60bd0176…` | Run gagal 3 (dipertahankan terpisah) |
| `test-migration-v2323-run5-verify.txt` | `fa5552cd…` | Re-run verifikasi koordinator atas state final: **232 PASS / 0 FAIL, exit 0** |
| `test-migration-v2323.sha256` | `a37d1d52…` | SHA-256 harness + log kanonik + run-5 |
| `test-ssrf-guard-v2323.ts` | `91770ee7…` | Harness H-SSRF (32 test) |
| `test-ssrf-guard-v2323.txt` | `03676864…` | Log final: **32 PASS / 0 FAIL, exit 0** (run pertama 29/32 — 3 temuan diperbaiki commit `514352b`) |
| `test-ssrf-guard-v2323.sha256` | `ae90f7d6…` | SHA-256 harness + log |
| `test-resource-v2323.ts` | `671ace5e…` | Harness H-RES (15 test) |
| `test-resource-v2323.txt` | `b2a9f207…` | Log final: **15 PASS / 0 FAIL, exit 0** (run pertama 14/15 — H-RES-07 diperbaiki commit `24de11e`) |
| `test-resource-v2323.sha256` | `9cdfc92a…` | SHA-256 harness + log |
| `test-lease-v2323.ts` | `67e893b4…` | Harness H-LEASE (8 test) |
| `test-lease-v2323.txt` | `de5a3a4d…` | Log final: **8 PASS / 0 FAIL, exit 0** (run pertama 4/8 — H-LEASE diperbaiki commit `24de11e`) |
| `test-lease-v2323.sha256` | `2baf54a2…` | SHA-256 harness + log |
| `drizzle-kit-generated/0000_ambitious_firelord.sql` | `2cfe202e…` | DDL dari `schema.ts` asli (drizzle-kit 0.31.4) — DK-01..07 PASS, tanpa divergensi semantik |
| `drizzle-kit-generated/0000_snapshot.json` | `ed2ad065…` | Snapshot drizzle-kit |
| `drizzle-kit-generated/README.md` | `850dd957…` | Catatan generasi DDL (termasuk: `bun x drizzle-kit` gagal resolve di VM — dipakai binary lokal 0.31.4 yang sama) |

(SHA lengkap 64 hex ada di file `.sha256` masing-masing; tabel
di atas memakai 8 hex pertama + `…` sesuai konvensi matriks.)

## Catatan kejujuran (U-106)

Log mentah run-pertama harness guard (29/32), resource (14/15),
dan lease (4/8) TIDAK dipertahankan sebagai file terpisah —
tertimpa/dihapus saat rename `.log`→`.txt` oleh koordinator.
Yang tersisa: laporan subagent (temuan + diagnosis) + commit
perbaikan (`514352b`, `24de11e`) + log final hijau di atas.
Run gagal harness migrasi (run 1–3) dipertahankan terpisah.
Aturan ke depan (DL-23-08): simpan run-pertama dengan nama
berbeda SEBELUM re-run.

## Yang TIDAK diuji ulang (protokol handoff butir 6)

Bukti v2.3.21 (109 assert Bun + 25 assert CLI 3.45.1) tetap
berdiri — tidak ada perubahan material pada artefak itu.
Harness v2.3.23 menjalankan FILE AKTUAL yang baru (migrasi
0006+0007, guard, limits, actions) — pengulangan dibenarkan
karena implementasi berubah material. Clean-clone build TIDAK
di-re-run (dilarang tanpa perubahan material; U-103 hanya
memperbaiki driver).
