/**
 * Link Scanner — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN.
 * File ini hanya mendefinisikan kontrak (tipe + alur) scanner target.
 * Implementasi nyata mengikuti perilaku `checkLink` di artifact live, ditambah
 * SSRF guard penuh. Jangan menganggap file ini sebagai scanner yang berfungsi.
 */

import type { Classification } from "../intelligence/classification";

export interface ScanSignal {
  readonly key: string;
  readonly label: string;
  /** Bukti konkret — wajib ada; sinyal tanpa bukti tidak sah. */
  readonly evidence: string;
  /** Dampak terhadap skor (0–100). */
  readonly scoreImpact: number;
  /** Sumber intelijen sinyal ini, mis. "RDAP", "threat_intelligence:internal". */
  readonly source: string;
}

export interface ScanResult {
  readonly url: string;
  readonly normalizedUrl: string;
  readonly classification: Classification;
  /** Vonis lama — dipertahankan selama masa migrasi (uji paralel M3). */
  readonly legacyVerdict: "BAHAYA" | "WASPADA" | "LEBIH AMAN";
  readonly score: number;
  readonly signals: readonly ScanSignal[];
  readonly intelSources: readonly string[];
  readonly limitations: readonly string[];
  readonly checkedAt: string; // ISO 8601
}

export interface ScanOptions {
  /** Batas redirect — default dari ssrf-guard (6). */
  readonly maxRedirects?: number;
  /** Timeout total ms — default dari ssrf-guard (30_000). */
  readonly totalTimeoutMs?: number;
}

/**
 * STUB. Implementasi harus:
 *  1. Validasi URL + SSRF guard (checkUrlAllowed) untuk URL awal dan tiap redirect.
 *  2. Resolve DNS + periksa ulang hasil resolve (resolveAndCheck).
 *  3. Fetch dengan timeout + batas ukuran respons.
 *  4. Jalankan semua sinyal (lihat signals.ts) dan hitung skor.
 *  5. Petakan ke klasifikasi 4 tingkat (classification.ts).
 *  6. Simpan ke scan_history + scanned_urls.
 */
export async function scanLink(
  _url: string,
  _options: ScanOptions = {},
): Promise<ScanResult> {
  throw new Error(
    "STUB: scanLink belum diimplementasikan — port dari checkLink artifact + SSRF guard penuh (lihat TECHNICAL_ARCHITECTURE.md M3).",
  );
}
