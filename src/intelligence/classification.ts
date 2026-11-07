/**
 * Classification — AIRDROP GENERATE (AG-001)
 *
 * STATUS: IMPLEMENTED (pure logic, no external dependencies)
 * Pemetaan vonis lama (BAHAYA/WASPADA/LEBIH AMAN) ke klasifikasi 4 tingkat,
 * sesuai CLASSIFICATION.md §3. Logika ini nyata dan dapat diuji.
 */

export type LegacyVerdict = "BAHAYA" | "WASPADA" | "LEBIH AMAN";

export type Classification =
  | "MALICIOUS"
  | "SUSPICIOUS"
  | "UNVERIFIED"
  | "NO_KNOWN_THREAT";

export const CLASSIFICATION_LABEL_ID: Record<Classification, string> = {
  MALICIOUS: "BERBAHAYA",
  SUSPICIOUS: "MENCURIGAKAN",
  UNVERIFIED: "BELUM TERVERIFIKASI",
  NO_KNOWN_THREAT: "TIDAK ADA ANCAMAN DIKENAL",
};

/** Sinyal risiko yang terkonfirmasi cocok dengan threat intelligence. */
export interface ConfirmedIndicator {
  readonly type: "domain" | "url" | "wallet_address" | "contract_address" | "ip";
  readonly value: string;
  readonly threatType: string;
}

export interface MapVerdictInput {
  readonly legacyVerdict: LegacyVerdict;
  readonly score: number; // 0-100
  readonly confirmedIndicator: ConfirmedIndicator | null;
  /** True bila satu-satunya sinyal adalah "tidak ada tautan resmi"/data kurang. */
  readonly onlyMissingOfficialLinks?: boolean;
}

/**
 * Petakan vonis lama + skor + indikator terkonfirmasi ke klasifikasi 4 tingkat.
 * Aturan mengikat: keberadaan indikator terkonfirmasi mengalahkan skor.
 */
export function mapLegacyVerdictToClassification(
  input: MapVerdictInput,
): Classification {
  if (input.confirmedIndicator !== null) {
    return "MALICIOUS";
  }
  if (input.legacyVerdict === "LEBIH AMAN") {
    return "NO_KNOWN_THREAT";
  }
  if (input.legacyVerdict === "WASPADA" && input.onlyMissingOfficialLinks === true) {
    return "UNVERIFIED";
  }
  // BAHAYA atau WASPADA tanpa indikator terkonfirmasi -> SUSPICIOUS.
  return "SUSPICIOUS";
}

/** Keterbatasan yang wajib menyertai setiap hasil pemeriksaan. */
export const STANDARD_LIMITATIONS: readonly string[] = [
  "Pemeriksaan tidak mensimulasikan transaksi",
  "Kontrak tidak dibaca mendalam (bukan audit)",
  "Tidak ada ancaman yang ditemukan bukan berarti link aman",
];
