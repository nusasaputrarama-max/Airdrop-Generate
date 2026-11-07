/**
 * Domain (RDAP) — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN.
 * Mengambil data registrasi domain (umur, registrar) via RDAP.
 * Perilaku yang harus ditiru: `checkLink` artifact memakai RDAP untuk sinyal
 * umur domain.
 */

export interface DomainInfo {
  readonly domain: string;
  readonly registrar: string | null;
  readonly registeredAt: string | null; // ISO 8601 date
  /** Umur domain dalam hari, dihitung dari registeredAt. */
  readonly ageDays: number | null;
}

/** STUB — implementasi memakai fetch RDAP (https://rdap.org/domain/<domain>). */
export async function lookupDomain(_domain: string): Promise<DomainInfo> {
  throw new Error(
    "STUB: lookupDomain belum diimplementasikan — memakai RDAP, dengan timeout + batas ukuran respons.",
  );
}
