/**
 * Database client — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN.
 * Klien Supabase dibuat di sini setelah proyek Supabase + kredensial tersedia
 * (lihat README.md "Yang dibutuhkan dari pemilik"). Jangan hardcode URL/key.
 */

export interface DbClient {
  readonly kind: "supabase";
}

/** STUB — membutuhkan SUPABASE_URL + SUPABASE_ANON_KEY dari environment. */
export function getDbClient(): DbClient {
  throw new Error(
    "STUB: getDbClient belum diimplementasikan — butuh proyek Supabase + kredensial pemilik.",
  );
}
