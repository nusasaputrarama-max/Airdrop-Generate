/**
 * Wallet Analyzer — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN (Phase 4).
 * Yang sudah ada hari ini: investigasi MANUAL via RPC publik saat insiden
 * 7 Nov 2026 (bukan fitur produk). File ini adalah kerangka fitur tersebut.
 */

export interface WalletAnalysis {
  readonly address: string;
  readonly chain: string;
  /** Pola yang terdeteksi, mis. "collector" bila banyak incoming kecil. */
  readonly patterns: readonly string[];
  readonly notes: readonly string[];
}

/** STUB — implementasi Phase 4 (baca riwayat alamat via RPC/explorer publik). */
export async function analyzeWallet(
  _address: string,
  _chain: string,
): Promise<WalletAnalysis> {
  throw new Error(
    "STUB: analyzeWallet belum diimplementasikan — Phase 4 (Web3 Analysis).",
  );
}
