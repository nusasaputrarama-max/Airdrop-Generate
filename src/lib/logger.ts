/**
 * Logger — AIRDROP GENERATE (AG-001)
 *
 * STATUS: IMPLEMENTED (sederhana, tanpa PII).
 * Log terstruktur ke stdout; jangan log URL mentah, IP mentah, atau secret.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Readonly<Record<string, string | number | boolean>> | undefined;
  readonly at: string;
}

export function log(
  level: LogLevel,
  message: string,
  context?: Readonly<Record<string, string | number | boolean>>,
): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    at: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
