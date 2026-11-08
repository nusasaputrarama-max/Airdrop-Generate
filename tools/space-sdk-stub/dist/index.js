// STUB — NOT the real @hatch/space-sdk (see ../README.md).
//
// Minimal re-implementation of the small surface AIRDROP GENERATE uses:
// defineAction / z / isAction / actionDescription / ACTION_BRAND.
// Written from observed usage in site/ + the installed .d.ts signatures;
// no SDK source was copied. For clean-clone build/test evidence only
// (D-06/F-030/F-047). NEVER a runtime replacement: no daemon, no ctx.db,
// no inference, no privileged execution, no worker dispatch.
import { z } from "zod";

export { z };

export const ACTION_BRAND = "@hatch/space-sdk/action/v1";

/**
 * Define a single action. Returns the spec carrying the brand string
 * the worker uses to recognize action definitions. The schemas drive
 * runtime validation (in the worker) and static typing (on the client);
 * this stub performs no validation itself — it only preserves the shape.
 */
export function defineAction(spec) {
  return { ...spec, __brand: ACTION_BRAND };
}

/** Runtime check used by workers to filter module exports. */
export function isAction(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    value.__brand === ACTION_BRAND &&
    typeof value.handler === "function"
  );
}

/** The one-sentence description of an action definition, if any. */
export function actionDescription(definition) {
  return definition?.description;
}

export const INFERENCE_SCHEMA_ERROR_BRAND = "@hatch/space-sdk/InferenceSchemaError/v1";

/**
 * Thrown when the model's structured response does not satisfy the Zod
 * schema passed to `complete()`. Recognize via `InferenceSchemaError.is(e)`,
 * not `instanceof` (separate bundles have separate class identities).
 * Included for type/runtime shape parity; the site never throws it, and
 * this stub has no inference backend to throw it from.
 */
export class InferenceSchemaError extends Error {
  constructor(issues) {
    super("Inference response did not match the schema.");
    this.name = "InferenceSchemaError";
    this.__brand = INFERENCE_SCHEMA_ERROR_BRAND;
    this.issues = issues;
  }
  static is(value) {
    return (
      value instanceof InferenceSchemaError ||
      (typeof value === "object" &&
        value !== null &&
        value.__brand === INFERENCE_SCHEMA_ERROR_BRAND)
    );
  }
}
