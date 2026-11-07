/**
 * Contract Analyzer — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN (Phase 4).
 * Yang sudah ada hari ini: validasi FORMAT alamat kontrak di dalam Link Scanner
 * (EVM 0x+40 hex, Solana base58 32–44). Analisis fungsi/bytecode belum ada.
 */

export interface ContractAnalysis {
  readonly address: string;
  readonly chain: string;
  readonly verifiedOnExplorer: boolean | null;
  /** Fungsi berisiko yang terdeteksi — null bila belum dianalisis. */
  readonly riskyFunctions: readonly string[] | null;
  readonly notes: readonly string[];
}

/** STUB — implementasi Phase 4 (baca kontrak via explorer/RPC publik). */
export async function analyzeContract(
  _address: string,
  _chain: string,
): Promise<ContractAnalysis> {
  throw new Error(
    "STUB: analyzeContract belum diimplementasikan — Phase 4 (Web3 Analysis).",
  );
}
