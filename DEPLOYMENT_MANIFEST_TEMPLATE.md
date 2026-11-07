# Deployment Manifest — Template (NON-SECRET)

**Status dokumen:** TEMPLATE DESAIN v2.3.14 — **belum terisi.**
**Status LIVE VERSION / DEPLOYMENT APPROVAL: NOT VERIFIED** (temuan F-028,
audit independen V7).

Dokumen ini adalah **skema** manifest deployment yang diminta audit V7
§10 butir 3. Manifest ini sendiri **TETAP KOSONG** sampai operator
menyediakan artefak yang dapat diaudit. **Jangan menebak nilai apa pun.**
Bila suatu field tidak tersedia, isi dengan `NOT PROVIDED` beserta
alasan — jangan dikosongkan diam-diam dan jangan diisi dari ingatan.

Manifest yang terisi adalah tanggung jawab **artifact operator +
project owner**; Muse tidak mengisi manifest ini dari catatan repo
atau dari ingatan chat. Satu manifest per deployment (per environment,
per artifact version). Manifest disimpan di repo sebagai bukti yang
dapat diaudit; field rahasia (token, kredensial, URL internal) TIDAK
BOLEH masuk manifest — bila suatu bukti hanya tersedia secara privat,
cantumkan rujukan non-secret-nya (mis. "disimpan di X, dapat
ditunjukkan auditor atas permintaan") tanpa menyalin isinya.

## Skema

| # | Field | Isi yang diharapkan | Status saat ini |
| --- | --- | --- | --- |
| 1 | `environment` | Nama environment (mis. `production`, `staging`) + artifact slug (mis. `cek-link-airdrop`) | NOT PROVIDED |
| 2 | `artifact_version` | Versi artifact live yang berjalan (mis. `v15`) — harus dapat diverifikasi dari tool/status artifact, bukan dari ingatan | NOT PROVIDED |
| 3 | `artifact_digest` | Digest/hash artifact yang di-deploy (bila diekspos provider) | NOT PROVIDED |
| 4 | `source_commit` | Commit SHA repo yang menjadi sumber build ini (hash penuh, bukan pendek) | NOT PROVIDED |
| 5 | `source_tree_status` | Apakah tree pada commit itu bersih saat build (ya/tidak + deskripsi bila ada patch lokal) | NOT PROVIDED |
| 6 | `deployed_at` | Timestamp deployment (tanggal + jam + zona waktu) | NOT PROVIDED |
| 7 | `deployed_by` | Operator yang melakukan deployment (identitas yang dapat diaudit) | NOT PROVIDED |
| 8 | `release_id` / `workflow_id` | ID release / run workflow / catatan provider yang menghubungkan source commit ke artifact yang berjalan | NOT PROVIDED |
| 9 | `diff_vs_previous` | Diff terhadap deployment sebelumnya (commit sebelumnya → commit ini; file yang berubah) atau rujukan ke diff itu | NOT PROVIDED |
| 10 | `rollback_target` | Artifact version + source commit tujuan rollback bila deployment ini bermasalah | NOT PROVIDED |
| 11 | `rollback_verified` | Apakah rollback pernah diuji untuk jalur ini (ya/tidak + tanggal + hasil) | NOT PROVIDED |
| 12 | `approval_ref` | Rujukan approval yang dapat ditelusuri: siapa menyetujui, kapan, dalam bentuk apa (pesan/catatan/artefak — bukan "disetujui di chat" tanpa tautan/kutipan yang dapat diperiksa) | NOT PROVIDED |
| 13 | `approval_scope` | Apa yang disetujui: hanya deployment ini, atau termasuk perubahan source di dalamnya | NOT PROVIDED |
| 14 | `post_deploy_verification` | Hasil verifikasi pasca-deploy (mis. smoke test, versi yang teramati live, tanggal/jam pengecekan) | NOT PROVIDED |
| 15 | `notes` | Catatan lain yang relevan dengan deployment ini | NOT PROVIDED |

## Contoh terisi — KOSONG (jangan dipakai sebagai bukti)

```yaml
# DEPLOYMENT MANIFEST — CONTOH KOSONG v2.3.14 (F-028)
# Seluruh field di bawah ini BELUM terisi. Manifest ini bukan bukti deployment apa pun.
environment: NOT PROVIDED
artifact_version: NOT PROVIDED
artifact_digest: NOT PROVIDED
source_commit: NOT PROVIDED
source_tree_status: NOT PROVIDED
deployed_at: NOT PROVIDED
deployed_by: NOT PROVIDED
release_id: NOT PROVIDED
workflow_id: NOT PROVIDED
diff_vs_previous: NOT PROVIDED
rollback_target: NOT PROVIDED
rollback_verified: NOT PROVIDED
approval_ref: NOT PROVIDED
approval_scope: NOT PROVIDED
post_deploy_verification: NOT PROVIDED
notes: NOT PROVIDED
```

## Aturan pengisian (mengikat)

1. **Satu manifest per deployment.** Jangan menimpa manifest deployment
   lama dengan yang baru — tambahkan file baru (mis.
   `evidence/deployments/<tanggal>-<artifact_version>.md`).
2. **Nilai ditebak = manifest tidak sah.** Bila operator tidak yakin,
   tulis `NOT PROVIDED` + alasan.
3. **Approval harus dapat ditelusuri.** "Disetujui Rama" tanpa tanggal,
   tanpa kutipan/tautan artefak, TIDAK memenuhi `approval_ref`.
   Persetujuan lisan yang tidak tercatat = `NOT PROVIDED`.
4. **Klaim versi live (mis. "live sudah v15") tetap NOT VERIFIED**
   sampai ada manifest terisi yang memenuhi field 2, 4, 6, 8, dan 12
   di atas untuk deployment itu.
5. Manifest yang terisi TIDAK mengubah status DESIGN REVIEW ONLY dan
   TIDAK memberi otorisasi implementasi/deployment berikutnya — ia
   hanya membuktikan deployment yang sudah terjadi.
