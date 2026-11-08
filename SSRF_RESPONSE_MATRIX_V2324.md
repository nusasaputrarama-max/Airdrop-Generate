# SSRF Response Matrix v2.3.24 — Jawaban atas Audit Independen V18

**Tanggal run:** 2026-11-08 ~16:25–16:41 WIB
**Branch:** `development` (terisolasi; `main` tidak disentuh)
**Audit yang dijawab:** `SSRF_INDEPENDENT_AUDIT_V18.md` (75fc5ee + klarifikasi 1699706)
**Status rilis:** tetap **DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**
**Regresi penuh VM:** **353/353 PASS** (baseline 312 + 41 tes baru), tsc server+client exit 0

## 0. Sinkronisasi (V18 item 1)

| Item | Hasil |
| --- | --- |
| main HEAD saat re-read | `1699706` (tidak ada audit lebih baru) |
| Merge commit | `32731defe190694fc49efad6ca259c5a5e03b905` — merge origin/main (V17+V18) ke development, tanpa konflik |
| HEAD development setelah merge | `32731de`; `git log origin/main --not HEAD` = 0 (tidak ada behind) |
| Push merge | OK, terverifikasi `git ls-remote origin development` = 32731de |

## 1. Matriks respons per temuan V18

| ID | Respons | Bukti (file, test, log, SHA, commit) | Sisa risiko / aksi berikut |
| --- | --- | --- | --- |
| F-049 | **ADDRESSED** | `site/server/src/ssrf-guard.ts` (classifyIPv4/IPv6); korpus `evidence/v2324/iana-registry-corpus-v2324.md` (fetch live IANA 2026-11-08, last updated 2025-10-09); harness `evidence/v2324/test-ip-registry-v2324.ts` H-IP-01..08 **8/8 PASS** (log SHA `3bda3f83…`); H-SSRF-04 diperbaiki (ekspektasi 2001:20 usang dihapus); commit `1863c1f` | Registry bisa berubah — perlu registry-diff test berkala (belum dibuat; dicatat sebagai tindak lanjut, bukan blocker). Runtime reachability tetap NOT VERIFIED (staging). |
| F-050 | **ADDRESSED** | `site/server/src/actions.ts` (`isAddProjectAuthorized` + gate di `addProject`, sebelum akses DB); harness `evidence/v2324/test-auth-addproject-v2324.ts` H-AUTH-01..06 **6/6 PASS** (log SHA `ff3fda64…`); commit `56d4a66` | Tidak ada service principal terjadwal di codebase/runtime — gate = owner-only; job terjadwal hanya bisa menambah bila jalan sebagai owner. Definisi service identity terjadwal tetap butuh keputusan + staging proof bila diinginkan. Dispatch-layer runtime NOT VERIFIED (handler tidak mengandalkannya). |
| F-051 | **ADDRESSED** | `site/server/src/actions.ts` (`resolvePrincipal`/`savedPrincipal` baru + `DISABLED_SAVED_PRINCIPAL`; `listProjects`/`setProjectState`); harness `evidence/v2324/test-principal-share-v2324.ts` H-PRIN-01..06 **6/6 PASS** (log SHA `f0a46719…`); commit `56d4a66` | Viewer share kehilangan saved state (by design — tidak ada identitas per-user). `ctx.viewer` terisi di runtime NOT VERIFIED (STAGE-P02). |
| F-052 | **ADDRESSED** | `site/server/src/ssrf-guard.ts` (`validateUrlForFetch` race DNS vs deadline; `fetchGuardedOnce` teruskan deadline); `site/server/src/actions.ts` (`fetchText`/`lookupRdap` cek deadline sebelum cache read; cek sebelum tiap script); `site/server/src/scan-limits.ts` (dokumentasi invarian TTL); harness H-DL-01..06 **6/6 PASS** (log SHA `3ce18117…`) + H-TO-01 (lihat F-053); commit `1863c1f` (guard) + `56d4a66` (actions) | Timing runtime NOT VERIFIED (staging): unwind pasca-deadline diukur <1 dtk di VM (elapsed H-TO-01 = 20015 ms). Lease TTL 25 dtk dipertahankan dengan alasan tertulis (bukan diperpanjang). |
| F-053 | **ADDRESSED** | `site/server/src/actions.ts` (`ScanTimeoutError` + `throwIfDeadlineAborted` di 3 checkpoint analyze; `runCheck` konversi ke error retryable, tanpa insert); harness `evidence/v2324/test-timeout-persist-v2324.ts` H-TO-01 **1/1 PASS**, elapsed 20015 ms, 0 baris, lease 0 (log SHA `836ba979…`); commit `56d4a66` | Catatan: kegagalan DNS 5 dtk (bukan deadline) tetap menghasilkan vonis "unreachable" yang lengkap — itu perilaku yang benar, bukan timeout deadline. |
| F-054 | **ADDRESSED** | `site/server/src/actions.ts` (`FetchResult.decodedBytes` + reserve di cache-hit via `tryReserve`); pilihan mitigasi: simpan panjang eksak + reserve (bukan bypass cache); harness `evidence/v2324/test-cache-budget-v2324.ts` H-CB-01..04 **4/4 PASS** (log SHA `2b30e455…`); commit `56d4a66` | RDAP cache tetap berbudget sendiri (by design — bukan bagian agregat scan page+script). |
| F-055 | **ADDRESSED** | Migrasi `site/drizzle/0008_solana_base58_check.sql` + journal idx 7 (when 1794130567244); `site/server/src/schema.ts` + `site/server/src/catalog.ts` diselaraskan; down `evidence/v2324/0008_down.sql`; DDL drizzle-kit diregenerasi (`evidence/v2324/drizzle-kit-generated/` — diff vs v2.3.23 hanya cabang CHECK Solana); harness `evidence/v2324/test-solana-check-v2324.ts` H-B58-01..05 **5/5 PASS** (log SHA `d7704e8f…`); H-MIG re-run 232/232 (log SHA `24b5ffcb…`); commit `8344055` | Versi SQLite runtime produksi NOT VERIFIED (U-90). Pre-check operator V1 wajib sebelum migrate di DB berisi data. |
| F-056 | **ADDRESSED** | `site/server/src/actions.ts` (`fetchText`/`fetchTextOnce` `opts.allowedOrigin`, dicek tiap hop sebelum koneksi); `analyze` teruskan `pageOrigin`; harness `evidence/v2324/test-same-origin-redirect-v2324.ts` H-SO-01..05 **5/5 PASS** (log SHA `9dc6878e…`); commit `56d4a66` | Script fetch di `analyze` tetap memakai jalur produksi (tanpa testHooks) — perilaku lama yang dipertahankan; H-SO menguji `fetchText` langsung. |
| D-06 | **TIDAK DIUBAH (tetap IN PROGRESS/BLOCKED)** | Stub SDK tidak disentuh; tidak ada klaim baru | Butuh SDK redistributable yang sah / pernyataan provider (keputusan owner). |
| T-01 | **TETAP BLOCKED** | Tidak dicoba ulang; tidak ada perintah create/publish di Hatch CLI | Jawaban harus datang dari platform. |
| V18 item 9–10 | **DIPATUHI** | Link Scanner tetap DISABLED (`CHECKLINK_ENABLED=false` default; H-KILL 5/5 PASS di regresi); landing page tidak disentuh; tidak ada merge development→main | — |

## 2. Keputusan eksplisit F-049 — 2001:20::/28

**ALLOW, mengikuti IANA** (Globally Reachable=True). ORCHIDv2 adalah
identifier kriptografis, bukan host routable; tidak ada alasan produk
untuk memblokir rentang yang IANA nyatakan reachable sementara entry
anycast GR=True tetangganya di-allow. Kebijakan produk yang sengaja
lebih ketat TIDAK diadopsi. Test lama H-SSRF-04 yang mengharapkan DENY
diperbaiki; H-IP-06 membuktikan ALLOW (2001:20::1, 2001:2f:ffff::1).

## 3. Tabel hasil tes (regresi penuh v2.3.24, 2026-11-08)

Baseline 312 + baru 41 = **353/353 PASS**. Semua log di `evidence/v2324/`.

| Harness | PASS/FAIL | Log (SHA-256) |
| --- | --- | --- |
| H-MIG/H-CAT/H-TEN/DK (migrasi, 8 migrasi) | 232/0 | `test-migration-v2323-v2324.txt` (`24b5ffcb…`) |
| H-SSRF (guard, ekspektasi 2001:20 diperbaiki) | 32/0 | `test-ssrf-guard-v2323-v2324.txt` (`2b8decc5…`) |
| H-RES | 15/0 | `test-resource-v2323-v2324.txt` (`b2a9f207…`) |
| H-LEASE | 8/0 | `test-lease-v2323-v2324.txt` (`b27f1ace…`) |
| H-CACHE | 12/0 | `test-cache-v2323-v2324.txt` (`2dfb2dec…`) |
| H-LEG | 8/0 | `test-legacy-export-v2323-v2324.txt` (`51c6b49a…`) |
| H-KILL | 5/0 | `test-checklink-killswitch-v2323-v2324.txt` (`e04bf199…`) |
| H-RD | 10/0 | `test-registrable-domain-v2323-v2324.txt` (`ca020129…`) |
| H-IP (F-049, baru) | 8/0 | `test-ip-registry-v2324-v2324.txt` (`3bda3f83…`) |
| H-AUTH (F-050, baru) | 6/0 | `test-auth-addproject-v2324-v2324.txt` (`ff3fda64…`) |
| H-PRIN (F-051, baru) | 6/0 | `test-principal-share-v2324-v2324.txt` (`f0a46719…`) |
| H-DL (F-052, baru) | 6/0 | `test-deadline-v2324-v2324.txt` (`3ce18117…`) |
| H-TO (F-053, baru) | 1/0 | `test-timeout-persist-v2324-v2324.txt` (`836ba979…`) |
| H-CB (F-054, baru) | 4/0 | `test-cache-budget-v2324-v2324.txt` (`2b30e455…`) |
| H-B58 (F-055, baru) | 5/0 | `test-solana-check-v2324-v2324.txt` (`d7704e8f…`) |
| H-SO (F-056, baru) | 5/0 | `test-same-origin-redirect-v2324-v2324.txt` (`9dc6878e…`) |

SHA-256 lengkap per log: file `.txt.sha256` di samping tiap log.
`tsc` server + client: exit 0.

## 4. Daftar commit development (putaran ini)

| SHA | Pesan |
| --- | --- |
| `32731defe190694fc49efad6ca259c5a5e03b905` | merge(main): sync V17 + V18 audit (1699706) into development |
| `1863c1f2698f34e928428ba50d11893a26597096` | fix(ssrf): F-049 IANA corpus + F-052 deadline ke DNS (H-IP 8/8, H-SSRF 32/32) |
| `56d4a6622bf428add874c7f615f9c178562160cf` | fix(security): F-050/F-051/F-052/F-053/F-054/F-056 (H-AUTH 6/6, H-PRIN 6/6, H-DL 6/6, H-TO 1/1, H-CB 4/4, H-SO 5/5) |
| `8344055edbc9751607dc023096b91d9213711739` | feat(db): F-055 migrasi 0008 — CHECK Solana base58 penuh (H-B58 5/5) |
| `811561bc2b9e0393e5a4d3313b99cf2b41b2a8f6` | test(dev): regresi penuh v2.3.24 — 353/353 PASS + matriks respons V18 + BACKLOG D-12 |

Semua commit di-push segera setelah selesai; 0 push gagal.
Verifikasi akhir `git ls-remote origin development` (lihat laporan).

## 5. Yang gagal selama putaran ini (diperbaiki, bukan disembunyikan)

1. **H-SSRF-24 gagal di tengah jalan** — refactor `validateUrlForFetch`
   memanggil `resolve()` saat membangun array race, sehingga resolver
   terpanggil untuk IP literal. Diperbaiki: race hanya dibangun untuk
   hostname. Re-run: 32/32 PASS.
2. **H-TO-01 gagal di percobaan pertama** — fixture "resolver tak pernah
   settle" TIDAK memicu deadline (race DNS 5 dtk memotongnya menjadi
   kegagalan DNS biasa → vonis "unreachable" yang sah). Diperbaiki:
   fixture diganti resolver 4 dtk/query sehingga kerja serial
   terakumulasi melewati 20 dtk. Hasil: elapsed 20015 ms, error timeout
   eksplisit, 0 baris.
3. **H-MIG-07b-6 gagal** — re-run langsung file 0006 kini MENGEMBALIKAN
   DIAM-DIAM CHECK Solana ke versi lemah (0008 → 0006). Ini perilaku
   yang benar untuk diuji: tes diperbarui untuk menegaskan tepat satu
   diff (teks CHECK tabel projects). Re-run: 232/232 PASS.
4. **H-LEASE-00 gagal** — ekspektasi hardcoded 7 migrasi. Diperbarui ke 8.
   Re-run: 8/8 PASS.
5. **H-CB-04 / H-SO-01 gagal pertama** — bug stub tes (pola URL, retry
   fetchText). Diperbaiki ekspektasinya; kode tidak diubah.

## 6. Konfirmasi batasan

- `main` tidak disentuh (HEAD main tetap 1699706; semua kerja di `development`).
- Live artifact slug `cek-link-airdrop` tidak disentuh.
- Link Scanner tetap nonaktif (`CHECKLINK_ENABLED=false` default; H-KILL 5/5).
- Tidak ada merge development→main; tidak ada perubahan database/katalog produksi.
- 2 file untracked build artifact (`site/client/.tsbuildinfo.client`,
  `site/server/.tsbuildinfo.server`) dibiarkan apa adanya — tidak
  di-commit, tidak dihapus.
- D-06 stub SDK tidak disentuh; T-01 tetap BLOCKED.

## 7. Gate berikutnya (untuk audit independen V19)

1. Review independen atas diff putaran ini (file + bukti di atas).
2. Staging: STAGE-P01 (egress/pinning runtime), STAGE-P02 (`ctx.viewer`
   terisi di runtime), U-90 (versi SQLite produksi), K-4 (provenance
   verifier), T-01, D-06 (SDK asli), 6 peran staging.
3. Registry-diff test berkala untuk korpus IANA (F-049 tindak lanjut).
4. Definisi service identity terjadwal bila job auto-discovery harus
   menambah katalog tanpa owner (F-050 tindak lanjut).
