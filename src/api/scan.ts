/**
 * API route: POST /api/scan — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN.
 * Handler Next.js API Route yang memanggil `scanLink` (scanner/link-scanner.ts)
 * dengan rate limiting + validasi input (zod). Rate limit target awal:
 * 20 scan/menit/IP (lihat SECURITY_REQUIREMENTS.md §2.4).
 *
 * Kontrak request/response mengikuti `ScanResult` di scanner/link-scanner.ts.
 * Error tidak boleh membocorkan stack trace ke klien.
 */

/** STUB — implementasi saat M3 (port checkLink ke Next.js API). */
export async function handleScanRequest(_request: unknown): Promise<unknown> {
  throw new Error(
    "STUB: handleScanRequest belum diimplementasikan — M3 (port checkLink + SSRF guard + rate limit).",
  );
}
