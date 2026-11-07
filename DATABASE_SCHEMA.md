# DATABASE SCHEMA — AIRDROP GENERATE (AG-001)

Dokumen ini berisi dua skema: **skema saat ini** (SQLite/Drizzle di artifact live,
didokumentasikan dari perilaku yang teramati) dan **skema target** (PostgreSQL di
Supabase, untuk migrasi M2).

> Semua nama tabel dan kolom di skema target memakai `snake_case`. Semua tabel target
> memakai `id uuid PK default gen_random_uuid()`, `created_at timestamptz default now()`,
> dan `updated_at timestamptz default now()` kecuali dinyatakan lain.

## 1. Skema saat ini (SQLite + Drizzle, artifact `cek-link-airdrop`)

Didokumentasikan dari aksi yang tersedia dan perilaku yang terverifikasi. Struktur
kolom persisnya berada di migrasi Drizzle artifact; tabel di bawah adalah
rekonstruksi fungsionalnya — **bukan hasil intip source artifact**.

### `projects` — katalog airdrop terverifikasi

| Kolom | Tipe (fungsional) | Keterangan |
| --- | --- | --- |
| `id` | integer PK | Urutan katalog |
| `name` | text, unique | Nama proyek |
| `ticker` | text, nullable | Simbol token bila ada |
| `description` | text | Deskripsi (Bahasa Indonesia) |
| `chain` | text | mis. BNB Chain, Ethereum, Robinhood Chain |
| `category` | text | DeFi, NFT, Gaming, AI & Web3, Layer 1/2, Testnet |
| `contract_address` | text, unique, nullable | Alamat kontrak utama |
| `official_url` | text, nullable | Situs resmi |
| `x_handle` | text, nullable | Handle X resmi, dinormalisasi `@handle` |
| `segment` | text | `live` / `upcoming` / `ended` |
| `status_label` | text | Label status tampil (Bahasa Indonesia) |
| `difficulty` | text | `Easy` / `Medium` / `Hard` (tampil: Mudah/Sedang/Sulit) |
| `reward_note` | text, nullable | Hanya bila ada sumber terverifikasi |
| `verified_at` | text (tanggal) | Tanggal verifikasi |
| `verified_note` | text | Catatan verifikasi |
| `sort` | integer | Urutan tampil |

Aturan di `addProject`: tolak nama dobel, tolak kontrak dobel, tolak tanpa URL resmi
yang valid, tolak alamat kontrak berformat salah. Saat ini **13 baris**.

### `checks` — riwayat pemeriksaan link

| Kolom | Tipe (fungsional) | Keterangan |
| --- | --- | --- |
| `id` | integer PK | |
| `url` | text | URL yang ditempel pengguna |
| `verdict` | text | `BAHAYA` / `WASPADA` / `LEBIH AMAN` |
| `score` | integer | Skor risiko 0–100 |
| `signals` | json/text | Daftar sinyal + bukti + dampak skor per sinyal |
| `checked_at` | timestamp | Waktu pemeriksaan |

Saat ini **3 baris** di database produksi (uji sandbox tidak dihitung).

### `saved_projects` — bookmark + status tugas pengguna

| Kolom | Tipe (fungsional) | Keterangan |
| --- | --- | --- |
| `project_id` | integer FK → `projects.id` | |
| `bookmarked` | boolean | |
| `task_status` | text | `not_started` / `in_progress` / `completed` |

Belum ada `user_id`: belum ada autentikasi, jadi status tersimpan per instalasi
artifact, bukan per akun. Ini adalah keterbatasan yang diperbaiki skema target.

## 2. Skema target (PostgreSQL, Supabase)

### 2.1 `users` — profil pengguna (terhubung ke Supabase Auth)

```sql
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  x_handle text,
  telegram_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.2 `airdrop_projects` — katalog proyek (pengganti `projects`)

```sql
create table public.airdrop_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ticker text,
  description text not null,
  chain text not null,
  category text not null,
  contract_address text,
  official_url text,
  x_handle text,
  segment text not null check (segment in ('live', 'upcoming', 'ended')),
  status_label text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  reward_note text,
  verified_at date not null,
  verified_note text not null,
  sort integer not null default 0,
  added_by text not null default 'system',  -- 'system' | 'auto-discovery' | 'manual:<nama>' | uuid user
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_airdrop_projects_name unique (name),
  constraint uq_airdrop_projects_contract unique (contract_address)
);
create index idx_airdrop_projects_segment on public.airdrop_projects (segment);
create index idx_airdrop_projects_chain on public.airdrop_projects (chain);
```

Aturan unik nama + kontrak **mempertahankan** perilaku `addProject` saat ini.
`added_by` mencatat asal penambahan (otomasi vs manual) untuk audit.

### 2.3 `scanned_urls` — URL yang pernah dipindai

```sql
create table public.scanned_urls (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  normalized_url text not null,
  domain text not null,
  first_seen_at timestamptz not null default now(),
  last_scanned_at timestamptz not null default now(),
  scan_count integer not null default 1,
  constraint uq_scanned_urls_normalized unique (normalized_url)
);
create index idx_scanned_urls_domain on public.scanned_urls (domain);
```

### 2.4 `scan_history` — setiap hasil pemeriksaan (pengganti `checks`)

```sql
create table public.scan_history (
  id uuid primary key default gen_random_uuid(),
  scanned_url_id uuid not null references public.scanned_urls (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  classification text not null check (classification in
    ('MALICIOUS', 'SUSPICIOUS', 'UNVERIFIED', 'NO_KNOWN_THREAT')),
  legacy_verdict text check (legacy_verdict in ('BAHAYA', 'WASPADA', 'LEBIH AMAN')),
  score integer not null check (score >= 0 and score <= 100),
  signals jsonb not null default '[]'::jsonb,
  -- tiap sinyal: { key, label, evidence, score_impact, source }
  intel_sources text[] not null default '{}',
  limitations text[] not null default '{}',
  checked_at timestamptz not null default now()
);
create index idx_scan_history_url on public.scan_history (scanned_url_id);
create index idx_scan_history_classification on public.scan_history (classification);
create index idx_scan_history_checked_at on public.scan_history (checked_at desc);
```

`legacy_verdict` dipertahankan selama masa migrasi agar hasil lama tetap bisa
dibandingkan (uji paralel M3). `signals` wajib menyimpan `evidence` dan
`score_impact` per sinyal — tanpa bukti, sinyal tidak sah.

### 2.5 `domains` — intelijen per domain

```sql
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  registrar text,
  registered_at date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  risk_notes text,
  constraint uq_domains_domain unique (domain)
);
create index idx_domains_domain on public.domains (domain);
```

### 2.6 `threat_intelligence` — daftar ancaman terstruktur

```sql
create table public.threat_intelligence (
  id uuid primary key default gen_random_uuid(),
  indicator_type text not null check (indicator_type in
    ('domain', 'url', 'wallet_address', 'contract_address', 'ip')),
  indicator_value text not null,
  threat_type text not null,  -- mis. 'wallet_drainer', 'phishing', 'fake_airdrop'
  confidence text not null check (confidence in ('confirmed', 'high', 'medium', 'low')),
  source text not null,       -- sumber bukti, mis. 'on-chain tx <hash>', 'official report'
  evidence_url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active boolean not null default true,
  constraint uq_threat_indicator unique (indicator_type, indicator_value)
);
create index idx_threat_value on public.threat_intelligence (indicator_value);
create index idx_threat_active_type on public.threat_intelligence (active, threat_type);
```

**Data awal yang WAJIB diisi saat migrasi (bukan dummy — semuanya terverifikasi):**

| indicator_type | indicator_value | threat_type | confidence | source |
| --- | --- | --- | --- | --- |
| domain | `solbarn.cc` | wallet_drainer | confirmed | Insiden 7 Nov 2026; halaman claim palsu $SCAMSEM |
| domain | `sharkmoon.tech` | wallet_drainer | confirmed | Insiden 7 Nov 2026; redirect drainer, tx `5mP1WgxW…LQMw` |
| wallet_address | `Bnc3iirJoUkgUsmhT9Qt4VbC73gF2FQ8nMAxDN2H4LvG` | wallet_drainer | confirmed | Penerima drain Solana 7 Nov 2026 (on-chain) |
| wallet_address | `6cwsqBqmRy22Qa2SEuZ8tWrpKoCS9M8S2r8ct8VuqFmj` | wallet_drainer | confirmed | Penerima drain Solana 7 Nov 2026 (on-chain) |

### 2.7 `security_reports` — pelaporan komunitas

```sql
create table public.security_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users (id) on delete set null,
  report_type text not null check (report_type in
    ('suspicious_link', 'false_positive', 'false_negative', 'impersonation', 'other')),
  url text,
  description text not null,
  status text not null default 'open' check (status in
    ('open', 'investigating', 'confirmed', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_reports_status on public.security_reports (status);
```

### 2.8 Relasi antar tabel

```
users 1───* scan_history (user_id, nullable — scan anonim diizinkan)
users 1───* security_reports (reporter_id, nullable)
users 1───* users.saved_projects → lihat 2.9
scanned_urls 1───* scan_history
domains 1───* scanned_urls (lewat kolom domain, bukan FK — domain bisa
           tercatat sebelum URL-nya dipindai)
threat_intelligence ── dipakai oleh ──► scan_history.intel_sources (array teks)
airdrop_projects ── berdiri sendiri (katalog kurasi)
```

### 2.9 `saved_projects` — bookmark per pengguna (pengganti tabel lama)

```sql
create table public.saved_projects (
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid not null references public.airdrop_projects (id) on delete cascade,
  bookmarked boolean not null default false,
  task_status text not null default 'not_started' check (task_status in
    ('not_started', 'in_progress', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
```

Perbedaan dari skema saat ini: ada `user_id` — bookmark menjadi milik akun,
bukan milik instalasi.

## 3. Row Level Security (RLS) — prinsip

- RLS **aktif** di semua tabel target.
- `airdrop_projects`, `domains`, `threat_intelligence`: baca publik; tulis hanya
  peran `service_role` (otomasi/admin), bukan pengguna biasa.
- `scan_history`: pengguna hanya membaca baris miliknya + baris anonim agregat;
  tulis lewat API server, bukan langsung dari klien.
- `security_reports`: pengguna menulis laporannya sendiri; membaca status
  laporannya sendiri; admin membaca semua.
- `saved_projects`: pengguna hanya mengakses baris dengan `user_id = auth.uid()`.

Kebijakan RLS persisnya ditulis saat implementasi M2 — dokumen ini menetapkan
prinsipnya, bukan SQL final yang belum diuji.

## 4. Catatan migrasi data (M2)

1. `projects` (13 baris) → `airdrop_projects`, dengan `added_by = 'system'`
   dan `verified_at`/`verified_note` asli dipertahankan.
2. `checks` (3 baris) → `scan_history` + `scanned_urls`, dengan
   `legacy_verdict` = vonis lama dan `classification` dari pemetaan
   `CLASSIFICATION.md`.
3. Daftar drainer (2 domain + 2 alamat wallet) → `threat_intelligence`
   dengan `confidence = 'confirmed'`.
4. `saved_projects` lama tidak dimigrasi per pengguna (tidak ada akun) — dicatat
   sebagai kehilangan yang diketahui, bukan diada-adakan.
