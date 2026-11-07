/**
 * Threat Intelligence — AIRDROP GENERATE (AG-001)
 *
 * STATUS: IMPLEMENTED (data) — daftar indikator terverifikasi.
 * Data di bawah ini NYATA dan terkonfirmasi (insiden 7 Nov 2026, on-chain).
 * Bukan data dummy. Daftar ini adalah seed untuk tabel `threat_intelligence`
 * (lihat DATABASE_SCHEMA.md §2.6).
 */

export type IndicatorType =
  | "domain"
  | "url"
  | "wallet_address"
  | "contract_address"
  | "ip";

export type Confidence = "confirmed" | "high" | "medium" | "low";

export interface ThreatIndicator {
  readonly type: IndicatorType;
  readonly value: string;
  readonly threatType: string;
  readonly confidence: Confidence;
  readonly source: string;
  readonly evidenceUrl: string | null;
}

/** Indikator terkonfirmasi — JANGAN diubah tanpa bukti baru. */
export const CONFIRMED_INDICATORS: readonly ThreatIndicator[] = [
  {
    type: "domain",
    value: "solbarn.cc",
    threatType: "wallet_drainer",
    confidence: "confirmed",
    source:
      "Insiden 7 Nov 2026: halaman claim palsu $SCAMSEM, mengarah ke sharkmoon.tech",
    evidenceUrl: null,
  },
  {
    type: "domain",
    value: "sharkmoon.tech",
    threatType: "wallet_drainer",
    confidence: "confirmed",
    source:
      "Insiden 7 Nov 2026: redirect drainer; tx Solana 5mP1WgxWq5qEWii4QMK8GK8T8pP482hmDTCMtHkSbYA3z29hoRQVHmfzBSWNGa9qU9sp1RS22bJ56GoCqudzLQMw",
    evidenceUrl: null,
  },
  {
    type: "wallet_address",
    value: "Bnc3iirJoUkgUsmhT9Qt4VbC73gF2FQ8nMAxDN2H4LvG",
    threatType: "wallet_drainer",
    confidence: "confirmed",
    source:
      "Penerima drain Solana 7 Nov 2026 (0.012978525 SOL + 4.686,23505 token SCAMSEM), terkonfirmasi on-chain",
    evidenceUrl: null,
  },
  {
    type: "wallet_address",
    value: "6cwsqBqmRy22Qa2SEuZ8tWrpKoCS9M8S2r8ct8VuqFmj",
    threatType: "wallet_drainer",
    confidence: "confirmed",
    source:
      "Penerima drain Solana 7 Nov 2026 (0.004326272 SOL + 1.562,078363 token SCAMSEM), terkonfirmasi on-chain",
    evidenceUrl: null,
  },
];

/** Cocokkan sebuah nilai (domain/URL/alamat) dengan indikator terkonfirmasi. */
export function findConfirmedIndicator(
  type: IndicatorType,
  value: string,
): ThreatIndicator | null {
  const needle = value.toLowerCase();
  for (const ind of CONFIRMED_INDICATORS) {
    if (ind.type !== type) continue;
    if (ind.value.toLowerCase() === needle) return ind;
    // Domain: cocok juga bila value adalah subdomain dari indikator.
    if (
      type === "domain" &&
      needle.endsWith(`.${ind.value.toLowerCase()}`)
    ) {
      return ind;
    }
  }
  return null;
}
