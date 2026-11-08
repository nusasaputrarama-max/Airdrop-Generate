// STUB — NOT the real @hatch/space-sdk (see ../README.md).
//
// Type declarations for the small surface AIRDROP GENERATE uses, written
// from the installed SDK 0.14.0 .d.ts signatures. Only the members the
// site actually touches are fully specified; the rest (agent/tool/blobs
// internals, privileged contracts, PDF, icons) are omitted or typed
// opaquely and documented as such. No SDK file was copied.
import { z } from "zod";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export { z };

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Per-invocation typed DB accessor (subset of the Drizzle libsql DB). */
export type SpaceDb<TSchema extends Record<string, unknown> = Record<string, never>> = Pick<
  LibSQLDatabase<TSchema>,
  "select" | "insert" | "update" | "delete" | "run" | "all" | "get" | "batch"
>;
export type SpaceDbAccessor = <TSchema extends Record<string, unknown> = Record<string, never>>() => SpaceDb<TSchema>;

/** User identity verified by the local daemon, without a share token. */
export type LocalViewer = {
  source: "local";
  authenticated: true;
  spaceSlug: string;
  userId: string;
  ownerUserId: string;
  isOwner: boolean;
  /** Native Muse delegation, distinct from the owner's browser. */
  delegate?: "agent" | "schedule";
};

/** User identity verified via a shared (Cloudflare) link. */
export type CloudflareViewer = {
  source: "cloudflare";
  authenticated: true;
  shareId: string;
  spaceSlug: string;
  spaceId?: string;
  isOwner: boolean;
  tokenExpiresAt: number;
  tokenId: string;
};

export type Viewer = LocalViewer | CloudflareViewer;

/**
 * Blob storage client. Typed opaquely on purpose: the site never touches
 * ctx.blobs, and this stub ships no blob backend.
 */
export type BlobClient = {
  [key: string]: unknown;
};

/** Options for `ctx.agent.spawnTask` / `send`. */
export interface AgentSendOptions {
  readonly expectsAction?: string;
  readonly dedupeKey?: string;
  readonly allowParallel?: boolean;
}

export type AgentSendResult =
  | { ok: true; taskId: string; agentId: string; messageId: string }
  | { ok: false; error: string };

export interface AgentStatusResult {
  readonly taskId: string;
  readonly status: "queued" | "running" | "completed" | "failed" | "not_found";
  readonly returnContractStatus?: "not_expected" | "pending" | "satisfied" | "unsatisfied";
  readonly agentStatus?: string;
  readonly agentId?: string;
  readonly messageId?: string;
  readonly finalResponse?: string;
  readonly statusMessage?: string;
  readonly failureReason?: string;
  readonly expectedAction?: string;
  readonly completedAction?: string;
}

/** Client for talking back to the main Muse agent that owns this space. */
export interface AgentClient {
  spawnTask(message: string, options?: AgentSendOptions): Promise<AgentSendResult>;
  /** @deprecated Prefer {@link spawnTask}. Stays functional for compatibility. */
  send(message: string, options?: AgentSendOptions): Promise<AgentSendResult>;
  status(taskId: string): Promise<AgentStatusResult>;
}

export interface InferenceCompleteOptions<T extends z.ZodType = z.ZodType> {
  /** Zod schema the model output is validated against. Required. */
  readonly schema: T;
  readonly timeout_secs?: number;
  readonly system?: string;
  readonly images?: readonly { dataBase64: string; mimeType?: "image/jpeg" | "image/png"; filename?: string; caption?: string }[];
}

/**
 * Thrown when the model's structured response does not satisfy the Zod
 * schema passed to `complete()`. Recognize via `InferenceSchemaError.is(e)`,
 * not `instanceof` (separate bundles have separate class identities).
 */
export declare const INFERENCE_SCHEMA_ERROR_BRAND: "@hatch/space-sdk/InferenceSchemaError/v1";
export declare class InferenceSchemaError extends Error {
  readonly __brand: typeof INFERENCE_SCHEMA_ERROR_BRAND;
  readonly issues: readonly z.core.$ZodIssue[];
  constructor(issues: readonly z.core.$ZodIssue[]);
  static is(value: unknown): value is InferenceSchemaError;
}

/** Direct completion for bounded model-only work. */
export interface InferenceClient {
  complete<T extends z.ZodType>(prompt: string, options: InferenceCompleteOptions<T>): Promise<z.infer<T>>;
}

/**
 * Tool client (web search, finance, weather, sports). Typed opaquely on
 * purpose: the site never touches ctx.tool, and this stub ships no tools.
 */
export type SpaceToolClient = {
  [key: string]: unknown;
};

/** Runtime-neutral context fields available to portable Space actions. */
export interface PortableCtx {
  readonly slug: string;
  readonly invocationId: string;
  readonly spaceDir: string;
  readonly db: SpaceDbAccessor;
  readonly viewer?: Viewer;
  readonly blobs: BlobClient;
}

/** Per-invocation context passed to every action handler. */
export interface Ctx extends PortableCtx {
  readonly agent: AgentClient;
  readonly inference: InferenceClient;
  readonly tool: SpaceToolClient;
  /** Emit a streaming frame. No-op on non-streaming actions. */
  emit(data: JsonValue): void;
  /** Signal every open client for this Space to refetch React Query data. */
  invalidateQueries(invalidation?: SpaceQueryKey | { queryKey: SpaceQueryKey } | { queryKeys: readonly SpaceQueryKey[] }): void;
}

/** React Query key that can be invalidated across open clients. */
export type SpaceQueryKey = readonly JsonValue[];

/**
 * Versioned brand. Identifies a value as an action definition produced by
 * `defineAction(...)`. The string shape is stable across independently
 * bundled SDK copies; avoid Symbol identity here.
 */
export declare const ACTION_BRAND: "@hatch/space-sdk/action/v1";

export interface ActionDefinition<
  TCtx extends PortableCtx = PortableCtx,
  Req extends z.ZodType = z.ZodType,
  Res extends z.ZodType = z.ZodType,
> {
  readonly __brand: typeof ACTION_BRAND;
  readonly request: Req;
  readonly response: Res;
  readonly description?: string;
  readonly handler: (ctx: TCtx, args: z.infer<Req>) => Promise<z.infer<Res>>;
}

export type ActionFactoryInput<
  TCtx extends PortableCtx,
  Req extends z.ZodType,
  Res extends z.ZodType,
> = {
  request: Req;
  response: Res;
  /** One sentence telling the user's agent what the action does. */
  description?: string;
  handler: (ctx: TCtx, args: z.infer<Req>) => Promise<z.infer<Res>>;
};

/**
 * Define a single action. The schemas drive both runtime validation (in the
 * worker) and static typing (on the client via `createActionClient`).
 */
export declare const defineAction: <Req extends z.ZodType, Res extends z.ZodType>(
  spec: ActionFactoryInput<Ctx, Req, Res>,
) => ActionDefinition<Ctx, Req, Res>;

/** Runtime check used by workers to filter module exports. */
export declare function isAction(value: unknown): value is ActionDefinition;

/** The one-sentence description of an action definition, if any. */
export declare function actionDescription(definition: Pick<ActionDefinition, "description">): string | undefined;

/**
 * The shape every space's `actions.ts` must satisfy. Use as
 * `} satisfies ActionsModule;` to flag stray non-action values without
 * widening the inferred type.
 */
export type ActionsModule = Record<
  string,
  Omit<ActionDefinition<Ctx>, "handler"> & {
    handler: (ctx: Ctx, args: any) => Promise<any>;
  }
>;

/** Extract the request payload type for a given action. */
export type ActionRequest<A extends { request: z.ZodType }> = z.infer<A["request"]>;

/** Extract the response payload type for a given action. */
export type ActionResponse<A extends { response: z.ZodType }> = z.infer<A["response"]>;
