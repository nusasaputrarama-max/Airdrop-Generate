// STUB — NOT the real @hatch/space-sdk/client (see ../README.md).
import { QueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import type { ActionRequest, ActionResponse } from "./index";

/** Error thrown when the daemon returns a non-OK HTTP response. */
export declare class SpaceActionError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number | undefined;
  readonly retrySafe: boolean;
  readonly code?: string | undefined;
  constructor(
    message: string,
    status: number,
    retryAfterMs?: number | undefined,
    retrySafe?: boolean,
    code?: string | undefined,
  );
}

export declare const PERMANENT_ACTION_STATUSES: Set<number>;

/** Retries after the first failure for a retryable action error. */
export declare const MAX_ACTION_RETRIES: 3;

/** Retry only non-permanent failures, bounded by MAX_ACTION_RETRIES. */
export declare function shouldRetryAction(failureCount: number, error: unknown): boolean;

/** Exponential backoff with full jitter, honoring Retry-After as a floor. */
export declare function actionRetryDelay(failureCount: number, error: unknown): number;

/** Shared TanStack Query client for the space. */
export declare const spaceQueryClient: QueryClient;

/**
 * Request shape for an action on a typed action client, by name.
 *
 *     import { api } from "./api";
 *     import type { ApiRequest } from "@hatch/space-sdk/client";
 *     type Filter = ApiRequest<typeof api, "listArticles">;
 */
export type ApiRequest<C extends Record<string, (args: never) => Promise<unknown>>, K extends keyof C> =
  Parameters<C[K]>[0];

/**
 * Response shape for an action on a typed action client, by name.
 *
 *     import { api } from "./api";
 *     import type { ApiResponse } from "@hatch/space-sdk/client";
 *     type Article = ApiResponse<typeof api, "listArticles">["articles"][number];
 */
export type ApiResponse<C extends Record<string, (args: never) => Promise<unknown>>, K extends keyof C> =
  Awaited<ReturnType<C[K]>>;

type ClientActionShape = {
  request: ZodType;
  response: ZodType;
};

export type ActionClient<A extends Record<string, ClientActionShape>> = {
  [K in keyof A]: (args: ActionRequest<A[K]>) => Promise<ActionResponse<A[K]>>;
};

interface ClientOptions {
  /** Override the action endpoint (defaults to `./actions` resolved against `location.href`). */
  endpoint?: string;
  /** Inject a custom fetch (mostly for tests). */
  fetch?: typeof globalThis.fetch;
}

export declare function createActionClient<A extends Record<string, ClientActionShape>>(
  options?: ClientOptions,
): ActionClient<A>;

/** Props for the minimal top safe-area scrim. */
export interface SafeAreaTopScrimProps {
  backgroundColor?: string;
}

/** Minimal top safe-area scrim. Visual parity with the real SDK is NOT claimed. */
export declare function SafeAreaTopScrim(props: SafeAreaTopScrimProps): unknown;
