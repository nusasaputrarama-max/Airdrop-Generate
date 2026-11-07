/**
 * Config — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — membaca environment variables.
 * Secret TIDAK PERNAH punya nilai default dan TIDAK PERNAH di-commit.
 * Lihat `.env.example` untuk daftar variabel yang dibutuhkan.
 */

export interface AppConfig {
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
  /** Service-role key HANYA dipakai di server — tidak pernah di sini untuk klien. */
  readonly supabaseServiceRoleKey: string | null;
  readonly nodeEnv: string;
}

/** STUB — implementasi membaca process.env saat runtime Next.js tersedia. */
export function loadConfig(): AppConfig {
  throw new Error(
    "STUB: loadConfig belum diimplementasikan — butuh runtime Next.js + .env.local pemilik.",
  );
}
