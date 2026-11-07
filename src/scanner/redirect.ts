/**
 * Redirect follower — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN.
 * Mengikuti redirect secara manual hop demi hop (maks 6) dan mencatat
 * seluruh rantai sebagai bukti. Setiap hop WAJIB melewati SSRF guard
 * (checkUrlAllowed + resolveAndCheck) sebelum fetch berikutnya.
 */

import type { SsrfCheckResult } from "./ssrf-guard";

export interface RedirectHop {
  readonly url: string;
  readonly status: number;
  readonly ssrfCheck: SsrfCheckResult;
}

export interface RedirectResult {
  readonly hops: readonly RedirectHop[];
  readonly finalUrl: string;
  /** True bila rantai berhenti karena aturan (bukan karena selesai normal). */
  readonly stoppedByGuard: boolean;
}

/** STUB — implementasi memakai fetch manual (redirect: "manual"). */
export async function followRedirects(_url: string): Promise<RedirectResult> {
  throw new Error(
    "STUB: followRedirects belum diimplementasikan — maks 6 hop, tiap hop melewati SSRF guard.",
  );
}
