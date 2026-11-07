# SSRF RESPONSE MATRIX v2.3.12 — Jawaban atas Audit Independen ChatGPT V5

**Dokumen:** matriks respons revisi desain v2.3.12
**Tanggal:** 2026-11-08 (WIB)
**Status:** DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED
**Menjawab:**

- `SSRF_INDEPENDENT_AUDIT_V5.md` (commit `854d3fc`, 2026-11-08 ~03:46 WIB)
  — temuan baru F-021, F-022 + Muse Handoff §8 (9 butir)
- Protokol: `MUSE_HANDOFF_CHATGPT_AUDIT_PROTOCOL.md` (commit `73876cf`)

**Dokumen pendamping v2.3.12:** `SSRF_REMEDIATION_DESIGN.md` (diperbarui
ke v2.3.12 — §D.4.23 ringkasan revisi, risiko baru U-55..U-58 di §G,
gerbang G6 diperluas dengan oracle H-CACHE/H-RES yang dikoreksi +
kriteria latensi alert ST-12, paragraf penutup diperbarui). Matriks
v2.3.11 (`SSRF_RESPONSE_MATRIX_V2311.md`) dipertahankan utuh sebagai
catatan sejarah revisi itu. Temuan F-001..F-020 dibawa ke sini dengan
status terbarunya; yang baru di v2.3.12 hanyalah F-021, F-022 dan
kesembilan jawaban handoff V5.

**Yang TIDAK dilakukan v2.3.12:** tidak ada kode aplikasi yang diubah
(tidak ada file `.ts`/`.tsx` yang disentuh), tidak ada perubahan
database/katalog, tidak ada production build, tidak ada pemanggilan
action produksi apa pun (termasuk `checkLink` — tidak di-invoke),
Link Scanner tidak diaktifkan, public tester tidak disentuh.
Bukti yang dipakai adalah read-only: pembacaan kode mirror, `git show`,
inspeksi tarball SDK di `/tmp` (bukan repo), dan `artifact.list_actions`
+ `artifact.status` (read-only) yang kini dipublikasikan sebagai paket
bukti mentah (F-021).

## §0. Pemisahan tiga tahap — dibaca dulu, mengikat seluruh v2.3.12

Sesuai keputusan pemilik proyek (2026-11-07 ~23:56 WIB, dikonfirmasi
~00:11 WIB 2026-11-08), tiga tahap berikut **berbeda dan tidak boleh
dicampur**:

| Tahap | Isi | Status saat ini |
| --- | --- | --- |
| **(a) Desain remediasi** | Menulis desain perbaikan + spesifikasi harness + bukti. Boleh dilanjutkan dan ditinjau. | **DIIZINKAN — inilah yang dikerjakan v2.3.12.** |
| **(b) Implementasi pada source code** | Mengubah kode sumber (live artifact maupun mirror) untuk menerapkan desain. | **BUTUH persetujuan eksplisit terpisah dari pemilik proyek. TIDAK diberikan saat ini.** v2.3.12 TIDAK mengimplementasikan apa pun. **HOLD perubahan source tetap berlaku (F-020, §2, §6).** |
| **(c) Penerapan ke situs live** | Deploy kode yang sudah diimplementasikan ke situs live AIRDROP GENERATE. | **BUTUH persetujuan dan prosedur deployment tersendiri.** Bukan bagian v2.3.12. |

**Perubahan pada source mirror GitHub TIDAK otomatis berarti situs live
berubah.**

## Cara membaca status

| Status | Arti |
| --- | --- |
| **addressed** | Respons selesai pada level yang diizinkan tahap (a); tidak ada sisa pekerjaan desain/bukti untuk butir itu. |
| **partially addressed** | Sebagian terjawab dengan bukti; sisanya tercatat eksplisit sebagai NOT VERIFIED / tidak dapat dipulihkan / butuh tahap (b)/(c). |
| **blocked** | Tidak dapat diselesaikan pada tahap (a); butuh persetujuan pemilik (tahap b) atau lingkungan staging (tahap 3) atau keduanya. |
| **rejected** | Respons menolak klaim/permintaan audit dengan dasar teknis + bukti. Tidak ada butir yang berstatus ini di v2.3.12 — semua temuan V5 diterima sebagai sah. |

## §1. Ringkasan status F-001..F-022

| ID | Severity | Status v2.3.12 | Inti |
| --- | --- | --- | --- |
| F-001 | Critical — SSRF di checkLink | **blocked** | Tidak berubah: desain + harness H-SSRF-01..20 selesai; implementasi menunggu otorisasi tahap (b). |
| F-002 | High — cap setelah buffering | **blocked** | Tidak berubah pada implementasi; **oracle tes DIKOREKSI v2.3.12** (F-022 §2): cap didefinisikan dalam raw bytes di lapisan stream; H-RES-01..03 ditulis ulang agar membuktikan streaming berhenti di cap. |
| F-003 | High — tanpa total deadline | **blocked** | Kode mirror PARTIALLY MITIGATED (deadline total 30 detik di `analyze()`, d85a1e2) — tanpa tes regresi, status penutupan TIDAK berubah: tetap OPEN sampai H-RES-04..06 PASS di staging. |
| F-004 | Medium — addProject duplicate race | **blocked** | Tidak berubah: desain unique constraint selesai; implementasi (termasuk migrasi DB) menunggu otorisasi. |
| F-005 | Medium — otorisasi addProject tidak jelas | **blocked** | Tidak berubah: auth di dalam kode TERBUKTI TIDAK ADA; scoping endpoint runtime NOT VERIFIED; mekanisme otorisasi butuh keputusan pemilik. |
| F-006a | Medium — redaksi dokumen mirror `site/DATA-PLAN.md` | **addressed** | Tidak berubah. |
| F-006b | Medium — narasi insiden di string kode | **blocked (OPEN)** | **BARU v2.3.12:** lokasi diverifikasi ulang pada mirror commit `d85a1e2` — nomor baris bergeser vs v2.3.11 (lihat §2 F-006b); cleanup tetap butuh edit source + otorisasi terpisah. |
| F-006c | Medium — DATA-PLAN.md di live artifact | **partially addressed** | **BARU v2.3.12:** bukti versi/diff live yang dapat diaudit TIDAK tersedia dari tool read-only (sama seperti F-019/F-021); status tetap "reported by Muse, not independently verified". |
| F-007 | Medium — log mentah v2.3.6 tidak ada di repo | **partially addressed** | Tidak berubah (lihat §3 V5 §6.1). |
| F-008 | Medium — penjelasan SU-T5 v2.3.7 tidak akurat | **addressed** | Tidak berubah. |
| F-009 | Medium — mirror tidak dapat direproduksi | **partially addressed** | **BARU v2.3.12:** keputusan Bun didokumentasikan (pin ke deklarasi 1.3.10); provenance SDK tetap NOT VERIFIED; status keseluruhan tetap NOT REPRODUCIBLE untuk clean external builder. |
| F-010 | Medium — bundle SU asli mengulang RUN=1 di tiga file | **addressed** (sebagai koreksi bukti) | Tidak berubah; koreksi V5 §6.1 diterima dan dipertahankan terlihat. |
| F-011 | Medium — matriks fitur tester statis tidak cocok dengan client | **addressed** (sebagai koreksi dokumen) | Tidak berubah; tester tetap ON HOLD. |
| F-012 | Medium — F-006 dinyatakan addressed padahal residu masih ada | **addressed** (sebagai pemisahan status) | Tidak berubah. |
| F-013 | Medium — owner gate staging tidak lengkap | **partially addressed** | **BARU v2.3.12:** kriteria latensi alert ditambahkan ke ST-12 (handoff V5 butir 9); operator/kanal alert/egress/DB tetap UNASSIGNED/BLOCKED; tidak ada gate READY. |
| F-014 | Medium — catatan reproduksibilitas basi | **partially addressed** | Tidak ada fakta baru v2.3.12 selain keputusan Bun (§2 handoff butir 7). |
| F-015 | Low/Medium — DATA-PLAN mengklaim same-origin yang tidak diberlakukan kode | **addressed** (mirror) / **blocked** (live) | Tidak berubah; teks koreksi live sudah disiapkan, belum diterapkan. |
| F-016 | Medium — cache hasil scan basi (false-negative) | **partially addressed** | **BARU v2.3.12:** cabang implementasi DINYATAKAN eksplisit (F-022): cabang pilihan = hapus cache fetch dari SEMUA jalur security-scan; H-CACHE-01..04 tetap berlaku untuk cabang itu. Implementasi + tes menunggu tahap (b) + HOLD F-020. |
| F-017 | Medium — cache key mengabaikan cap | **partially addressed** | **BARU v2.3.12:** F-017 + H-CACHE-05/06 dinyatakan **NOT APPLICABLE untuk jalur security-scan** pada cabang pilihan (cache dihapus); keduanya tetap berlaku HANYA bila owner memilih cabang alternatif (cache dipertahankan). |
| F-018 | High bila DB shared — isolasi data antar-pengguna belum terbukti | **partially addressed** | **BARU v2.3.12:** kutipan `.d.ts` minimal `PortableCtx`/`Viewer`/`LocalViewer`/`CloudflareViewer` kini DIPUBLIKASIKAN di matriks ini (§2 F-018) + provenance tarball dicatat; semantik tenancy runtime tetap **NOT VERIFIED**; tidak ada kesimpulan dari nama tipe saja. |
| F-019 | High — status Link Scanner nonaktif tanpa bukti kontrol runtime | **blocked (NOT VERIFIED)** | **BARU v2.3.12:** paket bukti read-only F-021 dipublikasikan (`evidence/f021-artifact-state-20261108/`, digest SHA-256 tercatat); hasilnya sama — `checklink` MASIH TERDAFTAR, tidak ada versi/digest terekspos, tidak ada kontrol disabled yang terbukti. Deployment tetap BLOCKED. |
| F-020 | Medium — scope refactoring source mirror perlu klarifikasi otorisasi | **partially addressed** | **BARU v2.3.12:** HOLD dipertahankan; tidak ada perubahan source di v2.3.12; tidak ada revert d85a1e2; tidak ada artefak approval terpisah di repo. |
| F-021 | Medium — bukti artifact-state tidak auditable | **partially addressed** | **BARU v2.3.12:** paket bukti read-only yang disanitasi dipublikasikan dengan capture timestamp + digest per respons; tool/API version + request/response IDs + artifact version/digest TIDAK terekspos → dicatat NOT PROVIDED. |
| F-022 | Medium — keputusan cache + oracle tes cap tidak koheren | **partially addressed** | **BARU v2.3.12:** cabang implementasi dinyatakan eksplisit; H-CACHE-05/06 NOT APPLICABLE pada cabang pilihan; oracle H-CACHE/H-RES dikoreksi ke raw bytes + multibyte UTF-8 + compressed/decompressed + redirect chains + aggregate per-scan limit; `res.text().slice()` dinyatakan BUKAN bukti byte cap. Implementasi + tes menunggu tahap (b). |

**Keputusan akhir tidak berubah: DESIGN REVIEW ONLY — IMPLEMENTATION NOT
APPROVED. Link Scanner tetap nonaktif. Tidak ada public deployment yang
diotorisasi.**

## §2. Respons per temuan baru V5

### F-021 — Medium: bukti artifact-state tidak dapat diaudit independen — **partially addressed** (paket bukti read-only dipublikasikan; version/digest tetap NOT PROVIDED karena tidak diekspos tool)

**Temuan (diterima):** matriks v2.3.11 §2 F-019 merangkum hasil
`artifact.list_actions` + `artifact.status` dalam prosa, tetapi respons
mentah yang disanitasi, metadata request, versi/digest artifact, dan
request/response ID tidak di-commit — klaim tidak dapat direproduksi
independen dari repo.

**Bukti yang dikumpulkan v2.3.12 (2026-11-08 03:47 WIB / 2026-11-07
20:47 UTC):** `artifact.list_actions` + `artifact.status` untuk slug
`cek-link-airdrop` dipanggil ulang (read-only; `checkLink` TIDAK
di-invoke; tidak ada perubahan runtime state; tidak ada public share
yang dibuat) dan responsnya dipublikasikan apa adanya di
`evidence/f021-artifact-state-20261108/`:

| File | Isi | SHA-256 |
| --- | --- | --- |
| `list_actions.json` | Respons `artifact.list_actions` apa adanya | `dbe989b520de47bc031602e164096ef75b3805d35968a0b6f9e1343fca4436d9` |
| `status.json` | Respons `artifact.status` apa adanya | `3b343a27720ef3aa156845a98c7c8cb26ded566de5808fdbaae950ce3d230019` |
| `README.md` | Metadata capture, yang terbukti/tidak terbukti, keterbatasan pencatatan | — (dokumen ini) |

Hasilnya konsisten dengan v2.3.11: `checklink` MASIH TERDAFTAR sebagai
published action; tidak ada build berjalan (`build: null`);
`share.shared=false`, `share.url=null`.

**Yang TIDAK dapat disediakan (dicatat jujur, bukan disembunyikan):**

- **Artifact version/digest: NOT PROVIDED** — kedua tool read-only
  tidak mengekspos versi/digest artifact apa pun. Tidak ada nilai yang
  ditebak atau direkonstruksi.
- **Tool/API version: NOT PROVIDED** — respons tool tidak memuat
  nomor versi tool/API.
- **Request/response IDs: NOT PROVIDED** — respons tool tidak memuat
  ID request/response (kecuali `card.widget_id` pada respons status,
  yang dipertahankan apa adanya di `status.json` karena merupakan
  pengenal artifact, bukan kredensial).
- **Keterbatasan pencatatan:** deskripsi action `addproject` dan
  `askgibran` dalam `list_actions.json` terpotong di ujung persis
  seperti dikembalikan tool saat capture — pemotongan ini adalah artefak
  respons tool, bukan redaksi Muse; isi yang terpotong tidak
  direkonstruksi. Pemotongan tidak memengaruhi kesimpulan F-019
  (nama action + keberadaan `checklink` lengkap dan tidak terpotong).

**Risiko tersisa:** paket ini menutup celah provenance F-021, tetapi
TIDAK menutup F-019 — kontrol runtime (a)–(e) (§2 F-019) tetap belum
satu pun terpenuhi.
**Aksi berikutnya:** bila tersedia jalur read-only baru yang mengekspos
versi/digest artifact, capture diulang melalui jalur itu dan paket
diperbarui; sampai ada, F-019 tetap BLOCKED.

### F-022 — Medium: keputusan cache + oracle tes cap belum koheren — **partially addressed** (cabang dinyatakan eksplisit; oracle dikoreksi; implementasi + tes menunggu tahap b)

**Temuan (diterima):** (1) rekomendasi F-016 (hapus cache untuk
security scan) dan persyaratan F-017 (key cache wajib menyertakan cap)
tidak dinyatakan sebagai cabang yang saling eksklusif; (2) H-CACHE-05/06
mendeskripsikan batas "300 KB"/"400 KB" sementara implementasi saat ini
memakai `(await res.text()).slice(0, cap)` — slicing string JS
menghitung UTF-16 code unit, bukan byte UTF-8, dan terjadi SETELAH
seluruh body di-buffer — sehingga nilai 300.000/400.000 saat ini TIDAK
menegakkan byte cap atau memory cap apa pun.

#### Keputusan cabang implementasi (mengikat, §D.4.23, U-55)

**Cabang pilihan (preferred branch): HAPUS cache fetch dari SEMUA jalur
security-scan** — yaitu halaman utama (`fetchText(..., 400_000)`) DAN
script (`fetchText(..., 300_000)`), karena keduanya memakai helper
`fetchText` yang sama dan keduanya adalah jalur vonis keamanan.

Konsekuensi yang dinyatakan eksplisit:

- **F-017 (cache key menyertakan cap) dan H-CACHE-05/06 menjadi
  NOT APPLICABLE untuk jalur security-scan** pada cabang ini — tidak
  ada cache di jalur itu, sehingga tidak ada key yang perlu
  diperbaiki. Status F-017 di §1 dicatat sesuai cabang ini.
- **F-002 (streamed byte cap) tetap berlaku secara terpisah dan TIDAK
  tersentuh oleh keputusan ini** — penghapusan cache tidak menggantikan
  streamed cap; keduanya adalah kontrol yang berbeda (freshness vs
  batas resource) dan diuji oleh harness yang berbeda (H-CACHE vs
  H-RES).
- **H-CACHE-01..04 tetap berlaku** pada cabang ini: mereka menguji
  bahwa TIDAK ADA cache di jalur scan (benign→malicious terlihat,
  failure tidak terkunci, freshness + bypass re-check).
- **Cache RDAP dipertahankan apa adanya** (hanya sukses yang di-cache,
  TTL 1 jam) — RDAP bukan jalur vonis konten; catatan freshness yang
  sama berlaku.

**Cabang alternatif (hanya bila owner secara eksplisit memilih
mempertahankan cache):** cache dipertahankan HANYA dengan seluruh
syarat berikut, sekaligus:

- (a) enumerasi lengkap SEMUA caller cache yang tersisa (halaman,
  script, dan caller lain bila ada) — tidak ada caller tersembunyi;
- (b) key cache = `url + "|" + cap + "|" + policy-version` (cap DAN
  versi kebijakan vonis, agar perubahan kebijakan tidak memakai hasil
  lama);
- (c) kegagalan TIDAK PERNAH di-cache;
- (d) TTL eksplisit + setiap baris `checks` menyimpan `fetchedAt`,
  `cacheHit`, umur data, ditampilkan di UI;
- (e) re-check dari history WAJIB melewati cache (jalur fresh) dan
  menyimpan baris baru;
- (f) H-CACHE-01..06 SEMUA berlaku pada cabang ini (termasuk 05/06).

Cabang alternatif BUKAN rekomendasi dan TIDAK dipilih oleh revisi ini —
ia hanya didokumentasikan agar keputusan owner kelak memiliki dua opsi
lengkap. **Sampai owner memilih, cabang pilihan adalah keputusan desain
yang berlaku.**

#### Koreksi oracle tes H-CACHE / H-RES (mengikat, §D.4.23, U-56)

**Definisi cap yang benar:** cap adalah **raw bytes pada lapisan
response stream**, diukur SEBELUM decoding ke string dan SEBELUM
dekompresi selesai dibaca ke memori. Satuan yang dipakai oracle adalah
**byte**, bukan UTF-16 code unit, bukan code point Unicode, bukan
karakter JS.

**`res.text().slice()` dinyatakan BUKAN bukti byte cap** — dalam
dokumen ini, dalam matriks ini, dan dalam implementasi kelak, pemotongan
string setelah `res.text()` tidak boleh dikutip sebagai bukti
penegakan cap. Bukti cap yang sah hanya berasal dari instrumentasi
stream (byte yang dibaca dari stream ≤ cap + overhead yang dinyatakan)
atau dari abort koneksi pada cap.

**Spesifikasi oracle yang dikoreksi (DESAIN tes staging — TIDAK
dijalankan di v2.3.12; tidak ada staging, tidak ada implementasi):**

| ID | Skenario (dikoreksi) | Oracle / kriteria PASS |
| --- | --- | --- |
| H-CACHE-01 | URL sama: benign lalu malicious dalam TTL | Request kedua melihat konten baru (vonis kedua = malicious); byte yang dibaca dari network pada request kedua > 0 |
| H-CACHE-02 | Fetch pertama gagal, server pulih dalam TTL | Request kedua berhasil — bukan `null` terkunci |
| H-CACHE-03 | Retry segera setelah pemulihan | Tidak ada hasil `null` yang bertahan melewati satu retry pasca-pemulihan |
| H-CACHE-04 | Freshness terlihat + bypass re-check | Setiap baris `checks` membawa `fetchedAt` + `cacheHit` + umur; re-check dari history memakai jalur fresh dan menyimpan baris baru dengan `fetchedAt` baru |
| H-CACHE-05 | **NOT APPLICABLE pada cabang pilihan.** Hanya pada cabang alternatif: cache URL dengan cap 300.000 (raw bytes) lalu minta URL sama dengan cap 400.000 (raw bytes) | Hasil kedua TIDAK terpotong oleh hasil pertama (konten setelah byte ke-300.000 hadir, dihitung dalam raw bytes) |
| H-CACHE-06 | **NOT APPLICABLE pada cabang pilihan.** Hanya pada cabang alternatif: cache URL dengan cap 400.000 lalu minta dengan cap 300.000 | Hasil kedua menghormati cap 300.000 raw bytes (tidak melebihi kebijakan cap caller) |
| H-RES-01 | Body 50 MB, payload ASCII | Stream abort pada cap; byte ter-buffer ≤ cap + overhead yang dinyatakan; memori proses dalam anggaran |
| H-RES-02 | **BARU v2.3.12:** payload multibyte UTF-8 — konten berbahaya ditempatkan SETELAH batas yang setara dengan 300.000 UTF-16 code unit tetapi SEBELUM 300.000 raw bytes (dan sebaliknya) | Oracle menghitung raw bytes, bukan `string.length`: vonis cocok dengan batas byte, bukan batas code unit. Tes ini MEMBEDAKAN oracle byte vs oracle code-unit — tes ASCII saja tidak cukup |
| H-RES-03 | **BARU v2.3.12:** payload terkompresi (gzip/br) yang mengembang melewati cap saat didekompresi; decompressed-size limit ditegakkan di stream | Abort saat ukuran TERDEKOMPRESI melewati cap, meskipun ukuran terkompresi di bawah cap; byte ter-buffer ≤ cap + overhead |
| H-RES-04 | **BARU v2.3.12:** redirect chain (3+ hop) dengan payload besar di hop terakhir + total deadline | Setiap hop divalidasi (F-001); byte ter-buffer kumulatif dihitung per scan; total ≤ aggregate per-scan limit |
| H-RES-05 | **BARU v2.3.12:** aggregate per-scan limit — halaman 400.000 + N script 300.000 masing-masing | Total byte ter-buffer per pemeriksaan ≤ aggregate limit yang dinyatakan (bukan hanya per-request); kelebihan → abort fail-closed |
| H-RES-06 | Total deadline (sebelumnya H-RES-04..06, dinomori ulang — lihat catatan) | Total waktu ≤ deadline 30 detik + toleransi; hasil parsial dibuang |

**Catatan penomoran:** H-RES-01..03 pada v2.3.11 adalah spesifikasi
ringkas (body 50 MB, byte ter-buffer, memori). v2.3.12 MEMPERTAHANKAN
H-RES-01 sebagai kasus ASCII dan MENAMBAH H-RES-02..05 sebagai kasus
oracle yang dikoreksi; H-RES-06 adalah total-deadline yang sebelumnya
bernopol H-RES-04..06 di v2.3.11 (deadline, konkurensi, fail-closed)
— digabung ke satu ID agar penomoran tidak bentrok dengan kasus baru.
Isi kriteria deadline tidak berubah, hanya penomorannya.

**Risiko tersisa:** belum diimplementasikan; H-CACHE-01..04 dan
H-RES-01..06 belum dijalankan di staging mana pun.
**Aksi berikutnya:** owner memilih cabang (pilihan vs alternatif);
implementasi tahap (b) setelah otorisasi + klarifikasi F-020;
H-CACHE-01..04 + H-RES-01..06 PASS di staging.

### F-018 — High bila DB shared: isolasi data antar-pengguna belum terbukti — **partially addressed** (kutipan `.d.ts` minimal kini dipublikasikan; semantik tenancy tetap NOT VERIFIED)

**Temuan (diterima):** matriks v2.3.11 mendeskripsikan deklarasi SDK
tetapi tarball dan kutipan deklarasi tidak ada di repo, sehingga audit
V5 tidak dapat memeriksa bukti itu secara independen. Audit meminta
kutipan `.d.ts` minimal `PortableCtx`/`Viewer`/`LocalViewer`/
`CloudflareViewer` + provenance + pernyataan resmi provider tentang
scope `ctx.db` + principal key stabil per varian runtime + penanganan
`viewer` yang hilang (fail closed bila ownership dibutuhkan).

**Verifikasi sendiri — kutipan `.d.ts` (2026-11-08 ~03:47 WIB):**
tarball `@hatch/space-sdk` 0.14.0 dibaca ulang read-only (ekstrak ke
`/tmp/sdk-v2312`, BUKAN ke repo; SHA-256 tarball
`f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e` —
SAMA dengan yang tercatat v2.3.11; ukuran 2.051.070 byte; mtime
1 Jan 1980). Kutipan minimal berikut disalin VERBATIM dari
`package/dist/server-contract.d.ts` (baris 20–44 dan 123–129):

```ts
export type SpaceDb<TSchema extends Record<string, unknown> = Record<string, never>> =
  Pick<LibSQLDatabase<TSchema>, "select" | "insert" | "update" | "delete" | "run" | "all" | "get" | "batch">;
/** Per-invocation typed DB accessor. */
export type SpaceDbAccessor = <TSchema extends Record<string, unknown> = Record<string, never>>() => SpaceDb<TSchema>;
/** User identity verified by the local daemon, without a share token. */
export type LocalViewer = {
    source: "local";
    authenticated: true;
    spaceSlug: string;
    userId: string;
    ownerUserId: string;
    isOwner: boolean;
    /** Native Muse delegation, distinct from the owner's browser. */
    delegate?: "agent" | "schedule";
};
export type CloudflareViewer = {
    source: "cloudflare";
    authenticated: true;
    shareId: string;
    spaceSlug: string;
    spaceId?: string;
    isOwner: boolean;
    tokenExpiresAt: number;
    tokenId: string;
};
export type Viewer = LocalViewer | CloudflareViewer;
```

```ts
/** Runtime-neutral context fields available to portable Space actions. */
export interface PortableCtx extends PrivilegedExecutor {
    readonly slug: string;
    readonly invocationId: string;
    readonly spaceDir: string;
    readonly db: SpaceDbAccessor;
    readonly viewer?: Viewer;
    readonly blobs: BlobClient;
}
```

**Yang dinyatakan dan yang TIDAK dinyatakan oleh kutipan ini (dicatat
jujur):**

- `db` adalah **accessor per-invocation** (`SpaceDbAccessor`) — kata
  "per-invocation" menggambarkan pemanggilan accessor, BUKAN scope
  data di baliknya. Kutipan ini TIDAK menyatakan apakah database di
  balik accessor itu per-user, per-space, atau shared per artifact.
- `viewer` adalah **opsional** (`viewer?: Viewer`) — handler yang
  mengandalkan `viewer` untuk ownership harus menangani kasus
  `viewer` tidak ada.
- Grep `tenant|per-user|multi-user|isolated|principal` pada
  `server-contract.d.ts` dan `index.d.ts` mengembalikan nol hit untuk
  semantik tenancy (satu-satunya hit relevan adalah definisi `Viewer`
  itu sendiri); grep `tenant|per-user|per user|shared db|isolated`
  pada `package/README.md` juga nol. **Tidak ada pernyataan tenancy
  di SDK maupun README-nya.**
- **Tidak ada kesimpulan tenancy yang ditarik dari nama tipe saja**
  — nama `LocalViewer`/`CloudflareViewer`/`SpaceDb` tidak dipakai
  sebagai bukti scope data. Ini diterima dari audit V5.

**Provenance tarball (dicatat, bukan dibuktikan):** tarball berada di
`/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` (builder-local,
bukan di repo); SHA-256 di atas; `site/package.json` +
`site/bun.lock` merujuk `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`.
Tidak ada source/signature yang dapat diambil clean builder — provenance
tetap NOT VERIFIED (F-009).

**Principal key stabil per varian runtime (DESAIN, bukan fakta
runtime):**

| Varian | Principal key yang diusulkan | Catatan |
| --- | --- | --- |
| Local | `ownerUserId` (fallback `userId` bila `ownerUserId` tidak ada) + `spaceSlug` | `isOwner` membedakan owner vs delegate; `delegate: "agent" \| "schedule"` dicatat sebagai pemanggil berbeda dari browser owner |
| Cloudflare | `shareId` + `tokenId` | `tokenId` memiliki `tokenExpiresAt` — key yang kedaluwarsa TIDAK boleh dipakai sebagai identitas stabil lintas sesi |

**Penanganan `viewer` hilang (fail closed):** bila ownership
dibutuhkan (cabang DB shared), handler yang menerima pemanggilan tanpa
`viewer` WAJIB menolak operasi baca/tulis data milik principal lain
dan HANYA boleh melayani data yang tidak teratribusi bila kebijakan
eksplisit mengizinkannya — default adalah TOLAK, bukan "perlakukan
sebagai owner". Bila runtime terbukti tidak punya jalur anonim, fakta
itu dicatat sebagai bagian dari scoping (H-TEN-05).

**Risiko tersisa:** pernyataan resmi runtime provider tentang scope
`ctx.db` tetap BELUM ADA; exploitability TIDAK diklaim.
**Aksi berikutnya:** minta pernyataan resmi provider; owner memilih
cabang desain; H-TEN-01..05 PASS di staging. Sampai itu ada, public
tester TIDAK BOLEH memuat data pengguna.

### F-019 — High: status Link Scanner nonaktif tanpa bukti kontrol runtime — **blocked (NOT VERIFIED)**

**Temuan (diterima):** tidak berubah sejak v2.3.11 — klaim nonaktif
hanya bersandar pada dokumen, bukan bukti runtime.

**Bukti baru v2.3.12:** paket F-021 (§2 F-021) — `checklink` MASIH
TERDAFTAR; tidak ada build berjalan; `share.shared=false`,
`share.url=null`; **tidak ada versi/digest yang terekspos**.

**Kontrol runtime yang DIBUTUHKAN untuk menutup F-019 (belum satu pun
terpenuhi):** (a) versi/digest artifact live yang dapat dikutip;
(b) bukti read-only bahwa endpoint action `checkLink` tidak dapat
dipanggil publik (tidak ada di dispatch table runtime, atau ditolak di
gerbang sebelum handler); (c) bukti bahwa UI checker tidak dapat
memanggil `checkLink` (feature gate / UI dinonaktifkan pada build
live); (d) kontrol yang mencegah pemanggilan publik (bukan sekadar
"tidak ada link publik"); (e) log egress yang menunjukkan nol fetch
keluar dari `checkLink` pada periode pengamatan.

**Risiko tersisa:** scanner masih dapat dipanggil (jalur owner/agent)
tanpa kontrol yang terbukti.
**Aksi berikutnya:** owner/operator artifact menyediakan bukti (a)–(e);
sampai ada, status deployment tetap **BLOCKED**.

### F-020 — Medium: scope refactoring source mirror perlu klarifikasi otorisasi — **partially addressed** (HOLD dipertahankan; tidak ada perubahan source di v2.3.12)

**Temuan (diterima):** tidak ada artefak approval terpisah di repo;
HOLD Muse atas perubahan source lanjutan adalah langkah yang tepat.

**Yang dilakukan v2.3.12:** revisi ini TIDAK mengubah satu pun file
source aplikasi (hanya dokumen desain, matriks respons, dan paket bukti
read-only). **Tidak ada revert d85a1e2** melalui revisi ini (sesuai
instruksi V4 §4.6 — jangan melakukan revert melalui audit; instruksi
yang sama dipertahankan V5 §8 butir 5). HOLD tetap berlaku penuh:
tidak ada perubahan `.ts`/`.tsx`, skema, migrasi, client, build, atau
live artifact sampai ada keputusan scope tertulis terpisah.

**Risiko tersisa:** klarifikasi scope menunggu keputusan owner.
**Aksi berikutnya:** owner menjawab 3 pertanyaan scope di §6 butir 1.

### F-001..F-005 — spesifikasi implementasi dipertahankan + oracle dikoreksi — **blocked** (desain selesai; implementasi + bukti staging menunggu tahap b)

Desain §D.4.18 tetap menjadi spesifikasi, dengan koreksi oracle v2.3.12
(§2 F-022):

| Temuan | Kontrol implementasi (tahap b) | Harness | Test ID / bukti yang dibutuhkan | Lingkungan |
| --- | --- | --- | --- | --- |
| F-001 Critical | Validasi URL awal + tiap hop redirect + tiap script; resolve SEMUA jawaban A/AAAA; tolak-set; pinning IP ke koneksi; TLS terhadap hostname | H-SSRF-01..20 | Tiap kasus PASS/FAIL + raw log + commit + runtime + environment; log egress 0 koneksi untuk kasus blokir | Staging terisolasi |
| F-002 High | Streamed byte cap dalam RAW BYTES di lapisan stream (compressed + decompressed); cap per request DAN aggregate per pemeriksaan; abort saat cap terlampaui; `res.text().slice()` BUKAN bukti cap | H-RES-01..05 (dikoreksi) | Byte ter-buffer ≤ cap + overhead yang dinyatakan; oracle membedakan byte vs UTF-16 code unit (H-RES-02); decompressed limit (H-RES-03); redirect chains (H-RES-04); aggregate limit (H-RES-05) | Staging |
| F-003 High | Satu total deadline per pemeriksaan (RDAP + page + redirect + script); satu sinyal batal bersama; hasil parsial dibuang | H-RES-06 | Total waktu ≤ deadline + toleransi; konkurensi dalam batas; kelebihan ditolak fail-closed | Staging |
| F-004 Medium | Unique constraint (nama + alamat kontrak ternormalisasi) + insert atomik + migrasi yang gagal dengan laporan bila duplikat ada | H-CAT-01..03 | Hitung baris DB setelah tiap run = yang dinyatakan | Staging |
| F-005 Medium | Otorisasi `addProject` dari jalur terotorisasi yang didokumentasikan + provenance wajib; `checkLink` bukan jalur mutasi katalog | H-AUTH-01..03 | Keputusan otorisasi cocok dengan kebijakan pada tiap kasus | Staging |

**Keterkaitan yang dipertahankan dari v2.3.11:** perbaikan cache
F-016/F-022 berada di jalur kode yang sama dengan guard F-001
(`fetchText`) — keduanya wajib dikirim bersama dalam satu implementasi
tahap (b); unique constraint F-004 dan kolom ownership F-018 adalah
pekerjaan migrasi yang sama — wajib didesain sebagai SATU migrasi;
`ctx.viewer` SDK adalah kandidat sumber identitas untuk F-005
(keputusan mekanisme tetap di tangan owner; principal key per varian
kini didefinisikan di §2 F-018).

VM tidak dapat menggantikan staging untuk satu pun baris tabel di
atas. **Risiko tersisa:** implementasi + bukti staging belum ada.
**Aksi berikutnya:** otorisasi tahap (b) + klarifikasi F-020 +
staging tersedia (gate G-A/G-E).

### Reproducibility + ownership staging (handoff V5 butir 7) — **blocked** (keputusan Bun didokumentasikan; fakta lain tidak berubah)

**Reproducibility (F-009/F-014):**

- **Keputusan Bun v2.3.12 (BARU, desain):** `site/package.json`
  mendeklarasikan `packageManager` Bun 1.3.10, sedangkan bukti VM
  (frozen install + typecheck) memakai Bun 1.4.4. Keputusan yang
  dicatat: **versi kanonik untuk build bersih kelak adalah 1.3.10
  (yang dideklarasikan)**; bukti VM dengan 1.4.4 dicatat sebagai
  bukti dengan versi yang BERBEDA dan tidak boleh dikutip sebagai
  bukti build 1.3.10. Bila owner memilih 1.4.4, deklarasi
  `packageManager` harus diubah eksplisit (perubahan source — masuk
  HOLD F-020, tidak dilakukan di v2.3.12). Sampai ada build bersih
  dengan versi kanonik, status tetap NOT REPRODUCIBLE untuk clean
  external builder.
- SDK provenance tetap NOT VERIFIED (tarball builder-local, mtime
  1 Jan 1980; inspeksi `.d.ts` v2.3.11/v2.3.12 membuktikan permukaan
  API SDK, BUKAN provenance); tidak ada test suite site; tidak ada CI
  (tidak ada file `.github/workflows/*` — dikonfirmasi ulang V5 §2.3,
  diterima); build penuh TIDAK dicoba.
- Jalur retrievable SDK source/provenance: BELUM ADA — tarball hanya
  tersedia di path builder-local `/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`;
  tidak ada URL paket publik atau signature yang dapat diverifikasi
  clean builder. Ini dicatat sebagai kekurangan terbuka, bukan
  sebagai klaim.

**Ownership staging (F-013):** staging operator, kanal alert, egress
policy, staging DB+runtime tetap **UNASSIGNED/BLOCKED**; ST-01..ST-16
dan STAGE-P01..P12 tetap BLOCKED; tidak ada gate READY; tidak ada tes
staging yang dijalankan. Penugasan peran v2.3.10 (§D.4.19a) berdiri —
penugasan peran di atas kertas bukan bukti lingkungan/operator
tersedia. **BARU v2.3.12:** kriteria latensi alert ditambahkan ke
ST-12 (lihat §2 handoff butir 9).

### F-006b — narasi insiden di string kode — **blocked (OPEN)**

**Verifikasi ulang lokasi pada mirror commit `d85a1e2` (2026-11-08):**
nomor baris BERGESER dibandingkan yang dicatat v2.3.11, karena commit
`d85a1e2` mengubah file yang sama:

| Lokasi | v2.3.11 | v2.3.12 (terverifikasi) | Isi (disebutkan hanya sebagai pengenal lokasi, TANPA mengutip narasi) |
| --- | --- | --- | --- |
| `site/server/src/actions.ts` | baris 51 | **baris 52** | Deklarasi `KNOWN_BAD_DOMAINS` + helper `isKnownBadDomain` (baris 53) |
| `site/server/src/actions.ts` | baris 1088–1089 | **baris 1245** | Deklarasi `GIBRAN_SITE_KNOWLEDGE` (string pengetahuan situs Gibran); dipakai di baris 1333 |
| `site/server/src/actions.ts` | — (belum dicatat) | **baris 483** | String detail user-facing yang merujuk insiden yang sama (ditemukan saat verifikasi ulang v2.3.12) |

Tidak satu pun isi narasi, nilai, atau detail insiden dikutip dalam
matriks ini — hanya nama pengenal + nomor baris, agar lokasi cleanup
dapat ditemukan tanpa mereproduksi data sensitif.

**Proposal cleanup (tetap berlaku, butuh otorisasi terpisah):** ganti
ketiga lokasi di atas dengan teks generik tanpa narasi insiden
(rujukan netral ke daftar domain yang diblokir + alasan keamanan
generik); perubahan ini adalah edit source live tahap (b) + otorisasi
owner terpisah; TIDAK diedit diam-diam di mirror. Commit `d85a1e2`
sengaja tidak menyentuh string narasi.

### F-006c — DATA-PLAN.md di live artifact — **partially addressed**

Tidak ada bukti independen baru v2.3.12. Redaksi live SUDAH dilakukan
dan diverifikasi nol kecocokan 2026-11-08 ~00:59 WIB (artifact v13),
tetapi status kejujuran tetap: **"reported by Muse, not independently
verified"**.

**Bukti versi/diff live yang DIBUTUHKAN (didefinisikan v2.3.12,
belum tersedia):** (a) versi/digest artifact live yang dapat dikutip
pada saat verifikasi; (b) diff isi DATA-PLAN live sebelum vs sesudah
redaksi, atau hash konten sebelum/sesudah; (c) timestamp capture.
**Yang tersedia saat ini: TIDAK SATU PUN dari (a)–(c)** — tool
read-only yang tersedia (`list_actions`/`status`) tidak mengekspos
versi/digest atau isi file live (celah yang sama dengan F-019/F-021);
`artifact.inspect` TIDAK dipakai karena inspect adalah delegasi
diagnosis atas laporan malfungsi pengguna, bukan pembaca state
read-only. Sampai jalur bukti (a)–(c) tersedia, F-006c tetap
NOT VERIFIED — dan revisi ini tidak mengklaim sebaliknya.

## §3. Response to Previous Handoff — status temuan V4 menurut audit V5 §3 (dicatat, bukan diklaim ulang)

Bagian ini mencatat bagaimana V5 menilai respons v2.3.11 — sebagai
catatan rekonsiliasi, bukan sebagai klaim baru Muse:

| Butir V4 | Penilaian V5 §3 | Catatan Muse v2.3.12 |
| --- | --- | --- |
| F-019: buktikan scanner nonaktif | NOT VERIFIED / BLOCKED | Diterima. Paket bukti F-021 kini dipublikasikan, tetapi kontrol runtime (a)–(e) tetap belum terpenuhi — F-019 tetap BLOCKED. |
| F-016: cache freshness | PARTIALLY ADDRESSED — design only | Diterima. v2.3.12 menyatakan cabang implementasi eksplisit (F-022); tetap tanpa kode dan tanpa tes. |
| F-017: cache cap key | PARTIALLY ADDRESSED — design only | Diterima. v2.3.12 menyatakan H-CACHE-05/06 NOT APPLICABLE pada cabang pilihan (F-022); tetap tanpa implementasi. |
| F-018: tenancy | PARTIALLY ADDRESSED — runtime semantics NOT VERIFIED | Diterima. Kutipan `.d.ts` kini dipublikasikan di matriks ini; pernyataan provider tetap belum ada. |
| F-020: scope d85a1e2 | PARTIALLY ADDRESSED | Diterima. HOLD dipertahankan; tidak ada artefak approval terpisah di repo. |
| F-001..F-005 + staging | OPEN / BLOCKED | Diterima. Tidak ada implementasi; tidak ada staging. |
| Reproducibility + staging ownership | NOT SATISFIED | Diterima. Keputusan Bun didokumentasikan v2.3.12; clean external build tetap NOT REPRODUCIBLE; peran staging tetap UNASSIGNED. |
| F-006c live privacy | NOT VERIFIED | Diterima. Bukti versi/diff live didefinisikan (§2 F-006c) tetapi tetap belum tersedia. |

**Koreksi bukti SU (V5 §6.1, diterima dan dipertahankan terlihat):**
klaim asli "SU-T1..SU-T9 9/9 × 4" tetap NOT VERIFIED dari bundle asli
(su-run1/2/3 byte-identik RUN=1; su-run4 hanya ekor 2 baris); suplemen
v2.3.9 (4 run lengkap berlabel RUN=1..4) tetap bukti VM suplemen, bukan
rekonstruksi log asli. Koreksi ini tidak ditulis ulang.

## §4. Jawaban atas Handoff V5 §8 (9 butir)

1. **F-021 — publikasikan bukti read-only artifact yang dapat diaudit**
   — Dijawab §2 F-021: `evidence/f021-artifact-state-20261108/`
   (`list_actions.json` SHA-256
   `dbe989b520de47bc031602e164096ef75b3805d35968a0b6f9e1343fca4436d9`,
   `status.json` SHA-256
   `3b343a27720ef3aa156845a98c7c8cb26ded566de5808fdbaae950ce3d230019`,
   capture 2026-11-08 03:47 WIB); tool/API version, request/response
   IDs, dan artifact version/digest dicatat NOT PROVIDED karena tidak
   diekspos tool; `checkLink` TIDAK di-invoke; tidak ada perubahan
   runtime state; tidak ada public share yang dibuat.
2. **F-022 — buat F-016/F-017 saling koheren** — Dijawab §2 F-022:
   cabang pilihan DINYATAKAN (hapus cache dari semua jalur security-scan);
   F-017 + H-CACHE-05/06 NOT APPLICABLE untuk jalur itu pada cabang
   pilihan; F-002 streamed byte cap dipertahankan terpisah; cabang
   alternatif didokumentasikan lengkap dengan 6 syarat sekaligus.
3. **Koreksi oracle tes H-CACHE/H-RES** — Dijawab §2 F-022: cap
   didefinisikan dalam raw bytes di lapisan stream; H-RES-02 (multibyte
   UTF-8), H-RES-03 (compressed/decompressed), H-RES-04 (redirect
   chains), H-RES-05 (aggregate per-scan limit) ditambahkan; H-RES-06
   adalah total-deadline (penomoran ulang dari H-RES-04..06 v2.3.11);
   `res.text().slice()` dinyatakan BUKAN bukti byte cap. Tidak ada tes
   yang dijalankan di produksi.
4. **F-018 — publikasikan bukti SDK + tenancy yang dapat diperiksa** —
   Dijawab §2 F-018: kutipan `.d.ts` minimal `PortableCtx`/`Viewer`/
   `LocalViewer`/`CloudflareViewer` disalin verbatim dari
   `server-contract.d.ts` (tarball SHA-256
   `f2cb7b25d35a7ade70a59ddbc5a3b7aefc727306d570d2356eaeb91d120ad49e`);
   provenance tarball dicatat (builder-local, NOT VERIFIED); pernyataan
   resmi provider tentang scope `ctx.db` tetap BELUM ADA; principal key
   stabil per varian didefinisikan (local: `ownerUserId`/`userId` +
   `spaceSlug`; cloudflare: `shareId` + `tokenId`); `viewer` hilang
   ditangani fail-closed; H-TEN-01..05 dipertahankan sebagai tes
   staging; tidak ada kesimpulan dari nama tipe saja.
5. **F-020 — pertahankan HOLD perubahan source** — Dijawab §2 F-020:
   tidak ada perubahan `.ts`/`.tsx`, skema, migrasi, client, build,
   atau live artifact di v2.3.12; d85a1e2 TIDAK di-revert; desain +
   bukti read-only boleh berlanjut.
6. **F-001..F-005 — pertahankan spesifikasi implementasi keamanan** —
   Dijawab §2 F-001..F-005: validasi URL di input awal + tiap redirect
   + tiap script; DNS/IP policy + pinning; streamed byte limit dalam
   raw bytes (oracle dikoreksi); satu total deadline; atomic unique
   constraints; otorisasi action — masing-masing dipetakan ke tes +
   bukti staging eksplisit; bukti yang hilang ditandai NOT PROVIDED /
   NOT VERIFIED; scanner TIDAK diaktifkan.
7. **F-009/F-013/F-014 — perbaiki reproducibility + inventaris staging
   tanpa mengubah kode aplikasi** — Dijawab §2 (bagian reproducibility/
   staging): jalur retrievable SDK source/provenance dicatat BELUM ADA
   (tarball builder-local saja); keputusan Bun didokumentasikan (kanonik
   1.3.10 yang dideklarasikan; bukti VM 1.4.4 dicatat sebagai versi
   berbeda); perintah tes/build dienumerasi ulang (hanya `typecheck`,
   `build`, `build:server`, `build:client` — tidak ada test script);
   inventaris staging lengkap dengan operator/DB+runtime/egress/alert/
   rollback tetap UNASSIGNED; tidak ada gate yang dilabeli READY.
8. **F-006b/F-006c — tutup bukti privacy dengan aman** — Dijawab §2
   F-006b/c: lokasi source F-006b diverifikasi ulang (baris 52, 483,
   1245 pada mirror `d85a1e2`) dan disebutkan hanya sebagai pengenal
   lokasi TANPA mengutip narasi, nilai wallet, atau kredensial apa pun;
   bukti versi/diff live F-006c didefinisikan (a)–(c) tetapi tetap
   belum tersedia; status tetap NOT VERIFIED.
9. **U-38/U-33/U-45/U-46 — pertahankan risk register** — Dijawab §5:
   status VM vs staging tetap dipisah; residu U-41/U-43/U-44/U-45
   dipertahankan; U-38-C, U-33-C/D/F dan U-46 TIDAK ditandai selesai;
   kriteria latensi alert DITAMBAHKAN ke ST-12 (lihat §5).

## §5. Risk register — U-38/U-33/U-45/U-46 + risiko baru (v2.3.12)

Status VM vs staging tetap dipisah ketat. Tidak ada perubahan status
tanpa bukti staging atau keputusan tertulis owner.

| Risiko | Status v2.3.12 | Catatan |
| --- | --- | --- |
| U-38-A PID reuse antara cek procfs dan kill numerik | ANSWERED di VM | Residual U-41; bukti identitas/namespace staging tetap dibutuhkan |
| U-38-B PID sudah ter-reuse sebelum akuisisi pidfd | PARTIAL | U-41 + namespace mapping; ST-06 |
| U-38-C FFI/syscall Bun tidak tersedia di sandbox artifact | OPEN | ST-02 |
| U-38-D kebenaran FFI ABI/simbol/errno | PARTIAL | Review implementasi + ST-02/ST-03 |
| U-33-A pathname lock ter-unlink saat inode lama terkunci | PARTIAL | Residual U-43 (privileged actor); kontrol operasional |
| U-33-B inode pengganti terkunci saat holder lama bertahan | PARTIAL | Residual U-45 (latensi deteksi); ST-11/ST-12 |
| U-33-C proses non-kooperatif mengabaikan flock advisory | OPEN | Inventaris partisipan + desain enforcement |
| U-33-D semantik filesystem/flock/NFS | OPEN | ST-04/ST-05/ST-09 |
| U-33-E tooling operator mengubah inode lock | PARTIAL | Residual U-43/U-44 (privileged/runbook) |
| U-33-F perilaku supervisor/process-group | OPEN | SUP-01 / ST-07 |
| U-41 residual PID/namespace | OPEN | Lihat U-38-A/B |
| U-43 residual privileged actor | OPEN | Lihat U-33-A/E |
| U-44 residual runbook | OPEN | Lihat U-33-E |
| U-45 latensi deteksi | OPEN | Lihat U-33-B; kriteria latensi kini eksplisit di ST-12 (di bawah) |
| U-46 divergensi fallback numeric-kill | **OPEN — keputusan owner belum ada** | Kedua opsi + trade-off terkuantifikasi dipertahankan; tidak ada opsi yang dipilih atau diimplementasikan atas nama owner; scope blokir tetap sempit (hanya worker-signaling fallback path) |
| U-55 (BARU) F-022 — cabang cache tidak dinyatakan | **partially addressed (desain)** | Cabang pilihan dinyatakan v2.3.12 (§2 F-022); implementasi + tes menunggu tahap (b) |
| U-56 (BARU) F-022 — oracle cap mengukur string, bukan byte | **partially addressed (desain)** | Oracle dikoreksi ke raw bytes + kasus multibyte/kompresi/redirect/aggregate (H-RES-02..05); implementasi + tes menunggu tahap (b) |
| U-57 (BARU) F-021 — bukti artifact-state tidak auditable | **partially addressed** | Paket bukti + digest dipublikasikan v2.3.12; version/digest artifact tetap NOT PROVIDED (tidak diekspos tool) |
| U-58 (BARU) F-018 — kutipan `.d.ts` tidak ada di repo | **partially addressed** | Kutipan minimal dipublikasikan di matriks ini; pernyataan provider tentang scope `ctx.db` tetap belum ada |

**Kriteria latensi alert ST-12 (BARU v2.3.12, handoff V5 butir 9):**
ST-12 (observabilitas + audit trail) kini memiliki kriteria penerimaan
latensi yang eksplisit, selain kriteria jejak yang sudah ada:

- **ST-12-LAT-01:** alert atas penghapusan/inkonsistensi lock uji HARUS
  terkirim ke kanal alert yang dinamai dalam **≤ 5 menit** sejak
  kejadian (batas ini adalah kriteria DESAIN — kanal alert sendiri
  masih UNASSIGNED, sehingga kriteria ini belum dapat diuji).
- **ST-12-LAT-02:** setiap alert HARUS memuat timestamp kejadian,
  lock path, dan identitas proses yang terdeteksi; alert tanpa ketiganya
  = FAIL.
- **ST-12-LAT-03:** bila kanal alert tidak tersedia saat uji, ST-12 =
  NOT RUN (bukan PASS, bukan FAIL) — ketidakhadiran kanal tidak boleh
  ditulis sebagai lolos.
- Kriteria ini masuk gerbang G6 bersama ST-12 yang sudah ada; tidak ada
  perubahan pada ST-01..ST-11 atau ST-13..ST-16.

## §6. Hard gates — ditegaskan kembali (v2.3.12)

Tidak satu pun dari yang berikut diizinkan oleh revisi ini:

- **No Link Scanner activation** — scanner tetap nonaktif; mitigasi G0
  (tolak semua URL arbitrer) tetap menjadi penahan. F-019 tetap
  NOT VERIFIED / BLOCKED.
- **No public deployment** — public tester tetap ON HOLD (Rama,
  2026-11-08 00:28 WIB); tidak ada deploy dari revisi ini.
- **No production build** — build penuh tidak dicoba di VM ini (house
  rules); tidak ada klaim build.
- **No DB/catalog change** — tidak ada migrasi, tidak ada perubahan
  katalog, tidak ada perubahan `app.db`.
- **No source implementation** — F-001..F-005, F-016/F-017/F-022, F-018
  tetap OPEN/BLOCKED sampai otorisasi eksplisit tahap (b) dari pemilik
  + harness staging PASS + review independen. **HOLD perubahan source
  (F-020) tetap berlaku.**
- **No production testing** — tidak ada pemanggilan action produksi
  (termasuk `checkLink`) sebagai bagian revisi ini.

## §7. Yang butuh keputusan Rama (pemilik proyek)

1. **Scope perubahan source (F-020) — paling mendesak:**
   (a) Apakah arahan "tetap tingkatkan kualitas web" (2026-11-08
   ~02:11 WIB) mencakup perubahan source mirror repo-only untuk
   performa seperti d85a1e2? (b) Apakah perubahan source mirror
   memerlukan approval terpisah yang sama dengan perubahan live?
   (c) Batas mana yang berlaku untuk pekerjaan kualitas web
   berikutnya? Sampai ada jawaban tertulis, HOLD perubahan source
   tetap berlaku.
2. **Otorisasi implementasi tahap (b) untuk F-001..F-005** — TIDAK
   diberikan saat ini.
3. **Keputusan U-46** — opsi (a) terima fallback terkuantifikasi ATAU
   opsi (b) larang mutlak + ganti fallback. Tanpa ini, implementasi
   pensinyalan worker (cabang fallback) tetap diblokir — tetapi
   F-001 guard, F-002..F-005, cache, dan tenancy TIDAK diblokir
   oleh U-46.
4. **Keputusan tenancy F-018:** per-user vs shared untuk `ctx.db`
   (butuh pernyataan resmi runtime provider); cabang desain
   ownership yang dipilih.
5. **Keputusan cache F-016/F-022:** cabang pilihan (hapus cache untuk
   security scan) vs cabang alternatif ber-syarat (cache dipertahankan
   dengan 6 syarat sekaligus).
6. **Mekanisme otorisasi addProject (F-005)** — pilih mekanisme +
   fakta scoping endpoint runtime artifact. Kandidat: `ctx.viewer`
   (`isOwner`/`ownerUserId`/`shareId`+`tokenId`) sebagai sumber
   identitas.
7. **Proposal privacy cleanup F-006b (§2 F-006b)** — setujui/tolak
   edit source live untuk `actions.ts` baris 52, 483, dan 1245.
8. **Koreksi teks DATA-PLAN live (F-015)** — ajukan via artifact
   workflow (`docs/deployment/LIVE_DATA_PLAN_CORRECTION_F015.md`
   sudah disiapkan).
9. **Bukti runtime F-019:** siapa yang dapat menyediakan
   versi/digest artifact + bukti kontrol disabled (butir (a)–(e)
   §2 F-019)? Sampai ada, deployment tetap BLOCKED.
10. **Keputusan Bun (F-009/F-014, BARU):** kanonik 1.3.10 (yang
    dideklarasikan) vs 1.4.4 (yang dipakai bukti VM)? Bila 1.4.4,
    deklarasi `packageManager` harus diubah eksplisit (perubahan
    source — masuk HOLD F-020).
11. **Staging (tahap 3)** — lingkungan staging belum ada; peran
    UNASSIGNED (operator, kanal alert, egress policy, DB+runtime)
    butuh penamaan oleh pemilik sebelum ST-01..ST-16 dapat
    dijadwalkan. Kanal alert yang dinamai adalah prasyarat
    ST-12-LAT-01..03.
12. **Public tester** — tetap ON HOLD; pencabutan hold + pilihan
    bentuk rilis (visual preview vs functional tester) adalah
    keputusan pemilik.

## §8. Yang TIDAK diklaim v2.3.12

- Tidak ada implementasi kode F-001..F-005, F-016, F-017, F-018, atau
  F-022; tidak ada perubahan perilaku aplikasi live; tidak ada perubahan
  database/katalog; tidak ada production build; Link Scanner tidak
  diaktifkan; public tester tidak disentuh di luar status ON HOLD.
- Tidak ada klaim "F-016/F-017/F-022 selesai" — ketiganya partially
  addressed pada level desain; penutupan butuh implementasi tahap (b)
  + H-CACHE-01..04 + H-RES-01..06 PASS di staging.
- Tidak ada klaim "F-018 aman" atau "F-018 rentan" — semantik tenancy
  NOT VERIFIED; yang ada adalah kutipan `.d.ts` + fakta skema + desain
  untuk kedua cabang.
- Tidak ada klaim "scanner nonaktif terbukti" — F-019 NOT VERIFIED /
  BLOCKED; paket bukti F-021 justru mengonfirmasi action `checklink`
  masih ter-publish dan tidak ada versi/digest yang terekspos.
- Tidak ada klaim "d85a1e2 terotorisasi penuh" — dasar otorisasi yang
  tercatat sudah didokumentasikan, tetapi tidak ada artefak approval
  terpisah di repo; klarifikasi scope menunggu owner.
- Redaksi live F-006c dicatat sebagai "reported by Muse, not
  independently verified" — bukan sebagai fakta yang sudah diaudit.
- Sampai commit v2.3.12 masuk `main`, tidak ada kemajuan teknis yang
  dapat diverifikasi dari repo.

## §9. Gate konkret berikutnya (v2.3.12 → v2.3.13)

| Gate | Isi | Prasyarat | Pemicu revisi berikutnya |
| --- | --- | --- | --- |
| G-A | Keputusan owner atas scope perubahan source (F-020) | Jawaban atas 3 pertanyaan scope (§7 butir 1) | Keputusan tertulis owner |
| G-B | Bukti runtime F-019 | Versi/digest artifact + kontrol disabled yang dapat diverifikasi (butir (a)–(e) §2 F-019) | Bukti dari operator artifact |
| G-C | Keputusan tenancy F-018 | Pernyataan resmi runtime provider tentang scope `ctx.db` | Pernyataan provider / keputusan owner |
| G-D | Keputusan U-46 | Keputusan tertulis owner opsi (a)/(b) | Keputusan tertulis owner |
| G-E | Staging tersedia + peran UNASSIGNED terisi | Penamaan operator, kanal alert, egress policy, DB+runtime oleh owner | Lingkungan staging tersedia |
| G-F | **BARU:** Keputusan cache F-022 | Owner memilih cabang pilihan vs alternatif (§2 F-022) | Keputusan tertulis owner |
| G-G | **BARU:** Keputusan Bun F-009 | Owner memilih kanonik 1.3.10 vs 1.4.4 (§7 butir 10) | Keputusan tertulis owner |

Pemicu revisi v2.3.13: keputusan owner atas G-A/G-C/G-D/G-F/G-G, ATAU
bukti runtime G-B, ATAU audit independen V6 — mana pun yang datang
dulu. Tidak ada revisi baru yang hanya mengulang status v2.3.12.

## §10. Hambatan, percobaan, dan hasil (dicatat agar tidak diulang)

| # | Hambatan / percobaan | Hasil |
| --- | --- | --- |
| 1 | Tool read-only tidak mengekspos artifact version/digest, tool/API version, atau request/response IDs (F-021) | Dicatat NOT PROVIDED di paket bukti + matriks; TIDAK ditebak nilainya. Percobaan ulang dengan tool yang sama tidak akan mengubah hasil — butuh jalur read-only baru dari provider. |
| 2 | Deskripsi `addproject`/`askgibran` terpotong dalam respons `list_actions` | Dicatat sebagai artefak respons tool di `evidence/f021-artifact-state-20261108/README.md`; isi terpotong tidak direkonstruksi. |
| 3 | Pernyataan resmi provider tentang scope `ctx.db` belum ada (F-018) | Kutipan `.d.ts` dipublikasikan sebagai gantinya; kutipan membuktikan permukaan API saja, BUKAN tenancy. Tidak ada kesimpulan dari nama tipe. |
| 4 | Nomor baris lokasi F-006b bergeser vs v2.3.11 | Diverifikasi ulang pada mirror `d85a1e2` (baris 52, 483, 1245); tabel koreksi di §2 F-006b. |
| 5 | Tidak ada staging, tidak ada operator, tidak ada kanal alert | Semua tes H-CACHE/H-RES/H-TEN tetap spesifikasi desain; ST-12-LAT-01..03 didefinisikan tetapi belum dapat diuji. |
| 6 | HOLD F-020 memblokir semua perubahan source | Dipatuhi: v2.3.12 hanya menyentuh dokumen + paket bukti read-only. |
