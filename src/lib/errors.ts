/**
 * Errors — AIRDROP GENERATE (AG-001)
 *
 * STATUS: IMPLEMENTED.
 * Error terstruktur: kode mesin + pesan aman untuk klien + detail internal
 * (tidak pernah dikirim ke klien).
 */

export type ErrorCode =
  | "INVALID_URL"
  | "SSRF_BLOCKED"
  | "FETCH_TIMEOUT"
  | "RESPONSE_TOO_LARGE"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Pesan yang aman ditampilkan ke pengguna. */
  readonly safeMessage: string;

  constructor(code: ErrorCode, safeMessage: string, internalDetail?: string) {
    super(internalDetail ?? safeMessage);
    this.name = "AppError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

export function notImplemented(feature: string): AppError {
  return new AppError(
    "NOT_IMPLEMENTED",
    `Fitur ${feature} belum tersedia.`,
    `STUB: ${feature} belum diimplementasikan.`,
  );
}
