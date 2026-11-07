# API — AIRDROP GENERATE (AG-001)

Rute API target (Next.js API Routes). Semuanya masih **stub** kecuali dinyatakan lain.

| Rute | Fungsi | Status |
| --- | --- | --- |
| `POST /api/scan` | Link Scanner | STUB (`scan.ts`) — port dari `checkLink` saat M3 |
| `GET /api/projects` | Daftar katalog | STUB — belum ada file |
| `POST /api/projects` | Tambah proyek (admin/otomasi) | STUB — belum ada file |
| `GET /api/threats` | Daftar threat intelligence | STUB — belum ada file |
| `POST /api/reports` | Pelaporan komunitas | STUB — belum ada file |
| `POST /api/assistant` | Asisten Gibran | STUB — belum ada file |

Aturan: validasi input (zod) + rate limiting di semua rute tulis; error tidak
membocorkan detail internal.
