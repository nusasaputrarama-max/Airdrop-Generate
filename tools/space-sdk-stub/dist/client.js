// STUB — NOT the real @hatch/space-sdk/client (see ../README.md).
//
// Minimal re-implementation of the client surface AIRDROP GENERATE uses:
// createActionClient (typed RPC over POST ./actions), spaceQueryClient
// (a plain TanStack QueryClient), SafeAreaTopScrim (minimal safe-area
// div), SpaceActionError + retry helpers. Written from observed usage in
// site/client/src/* + the installed .d.ts signatures; no SDK source was
// copied. Retry/backoff defaults are reasonable minimal approximations,
// NOT verified copies of the real SDK's policy. For clean-clone
// build/test evidence only (D-06/F-030/F-047).
import { QueryClient } from "@tanstack/react-query";
import { createElement } from "react";

/** Error thrown when the daemon returns a non-OK HTTP response. */
export class SpaceActionError extends Error {
  constructor(message, status, retryAfterMs, retrySafe = false, code) {
    super(message);
    this.name = "SpaceActionError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.retrySafe = retrySafe;
    this.code = code;
  }
}

export const PERMANENT_ACTION_STATUSES = new Set([400, 401, 403, 404, 422]);

/** Retries after the first failure for a retryable action error. */
export const MAX_ACTION_RETRIES = 3;

/** Retry only non-permanent failures, bounded by MAX_ACTION_RETRIES. */
export function shouldRetryAction(failureCount, error) {
  if (failureCount >= MAX_ACTION_RETRIES) return false;
  if (error instanceof SpaceActionError) {
    return !PERMANENT_ACTION_STATUSES.has(error.status);
  }
  return true;
}

/** Exponential backoff with full jitter, honoring Retry-After as a floor. */
export function actionRetryDelay(failureCount, error) {
  const base = Math.min(1000 * 2 ** failureCount, 30000);
  const jittered = Math.random() * base;
  const floor =
    error instanceof SpaceActionError && typeof error.retryAfterMs === "number"
      ? error.retryAfterMs
      : 0;
  return Math.max(jittered, floor);
}

/**
 * Shared TanStack Query client for the space. Conservative defaults:
 * bounded retries (see shouldRetryAction), no stale-while-revalidate
 * surprises, refetch on window focus. Exact production defaults are NOT
 * claimed to match the real SDK — this only has to behave sanely.
 */
export const spaceQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryAction,
      retryDelay: actionRetryDelay,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Typed RPC client: returns a proxy whose methods POST `{action, args}`
 * to `./actions` (or `options.endpoint`) and return the typed response.
 * Throws SpaceActionError on a non-OK HTTP response.
 */
export function createActionClient(options = {}) {
  const endpoint = options.endpoint ?? "./actions";
  const fetchImpl = options.fetch ?? globalThis.fetch;
  return new Proxy(
    {},
    {
      get(_target, actionName) {
        if (typeof actionName !== "string") return undefined;
        return async (args) => {
          const res = await fetchImpl(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: actionName, args }),
          });
          if (!res.ok) {
            let retryAfterMs;
            const retryAfter = res.headers?.get?.("retry-after");
            if (retryAfter) {
              const n = Number(retryAfter);
              if (Number.isFinite(n)) retryAfterMs = n * 1000;
            }
            throw new SpaceActionError(
              `Action ${actionName} failed with HTTP ${res.status}`,
              res.status,
              retryAfterMs,
              res.status >= 500,
            );
          }
          return res.json();
        };
      },
    },
  );
}

/**
 * Minimal top safe-area scrim: a zero-height div reserving the notch /
 * status-bar inset. Visual parity with the real SDK scrim is NOT claimed.
 */
export function SafeAreaTopScrim({ backgroundColor }) {
  return createElement("div", {
    "aria-hidden": true,
    style: {
      backgroundColor,
      paddingTop: "env(safe-area-inset-top, 0px)",
      height: 0,
    },
  });
}
