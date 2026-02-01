/**
 * Debug logging module for Qwen Auth
 * Provides detailed request/response logging when QWEN_AUTH_DEBUG is enabled
 * Similar to opencode-gemini-auth pattern
 */

import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { cwd, env } from "node:process";

/**
 * Environment variable to enable debug logging
 */
const DEBUG_FLAG = env.QWEN_AUTH_DEBUG ?? "";

/**
 * Maximum characters to include in body preview
 */
const MAX_BODY_PREVIEW_CHARS = 2000;

/**
 * Whether debug mode is enabled
 */
const debugEnabled = DEBUG_FLAG.trim() === "1" || DEBUG_FLAG.trim().toLowerCase() === "true";

/**
 * Path to the debug log file (only set when debugging is enabled)
 */
const logFilePath = debugEnabled ? defaultLogFilePath() : undefined;

/**
 * Log writer function
 */
const logWriter = createLogWriter(logFilePath);

/**
 * Request counter for unique IDs
 */
let requestCounter = 0;

/**
 * Debug context for tracking a request
 */
export interface QwenDebugContext {
  id: string;
  streaming: boolean;
  startedAt: number;
}

/**
 * Request metadata for debug logging
 */
export interface QwenDebugRequestMeta {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  streaming?: boolean;
}

/**
 * Response metadata for debug logging
 */
export interface QwenDebugResponseMeta {
  body?: string;
  note?: string;
  error?: unknown;
  headersOverride?: HeadersInit;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Get the debug log file path (if logging is enabled)
 */
export function getDebugLogPath(): string | undefined {
  return logFilePath;
}

/**
 * Begins a debug trace for a Qwen request, logging request metadata when debugging is enabled.
 *
 * @param meta Request metadata
 * @returns Debug context or null if debugging is disabled
 */
export function startQwenDebugRequest(meta: QwenDebugRequestMeta): QwenDebugContext | null {
  if (!debugEnabled) {
    return null;
  }

  const id = `QWEN-${++requestCounter}`;
  const method = meta.method ?? "GET";
  const streaming = meta.streaming ?? false;

  logDebug(`[Qwen Debug ${id}] ${method} ${meta.url}`);
  logDebug(`[Qwen Debug ${id}] Streaming: ${streaming ? "yes" : "no"}`);
  logDebug(`[Qwen Debug ${id}] Headers: ${JSON.stringify(maskHeaders(meta.headers))}`);

  const bodyPreview = formatBodyPreview(meta.body);
  if (bodyPreview) {
    logDebug(`[Qwen Debug ${id}] Body Preview: ${bodyPreview}`);
  }

  return { id, streaming, startedAt: Date.now() };
}

/**
 * Logs response details for a previously started debug trace when debugging is enabled.
 *
 * @param context Debug context from startQwenDebugRequest
 * @param response The fetch Response object
 * @param meta Additional response metadata
 */
export function logQwenDebugResponse(
  context: QwenDebugContext | null | undefined,
  response: Response,
  meta: QwenDebugResponseMeta = {},
): void {
  if (!debugEnabled || !context) {
    return;
  }

  const durationMs = Date.now() - context.startedAt;

  logDebug(
    `[Qwen Debug ${context.id}] Response ${response.status} ${response.statusText} (${durationMs}ms)`,
  );
  logDebug(
    `[Qwen Debug ${context.id}] Response Headers: ${JSON.stringify(
      maskHeaders(meta.headersOverride ?? response.headers),
    )}`,
  );

  if (meta.note) {
    logDebug(`[Qwen Debug ${context.id}] Note: ${meta.note}`);
  }

  if (meta.error) {
    logDebug(`[Qwen Debug ${context.id}] Error: ${formatError(meta.error)}`);
  }

  if (meta.body) {
    logDebug(`[Qwen Debug ${context.id}] Response Body Preview: ${truncateForLog(meta.body)}`);
  }
}

/**
 * Log a debug message directly
 *
 * @param message Message to log
 */
export function logDebugMessage(message: string): void {
  if (!debugEnabled) {
    return;
  }
  logDebug(message);
}

/**
 * Obscures sensitive headers and returns a plain object for logging
 */
function maskHeaders(headers?: HeadersInit | Headers): Record<string, string> {
  if (!headers) {
    return {};
  }

  const result: Record<string, string> = {};
  const parsed = headers instanceof Headers ? headers : new Headers(headers);

  parsed.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "authorization" || lowerKey === "x-api-key") {
      result[key] = "[redacted]";
    } else {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Produces a short, type-aware preview of a request/response body for logs
 */
function formatBodyPreview(body?: BodyInit | null): string | undefined {
  if (body == null) {
    return undefined;
  }

  if (typeof body === "string") {
    return truncateForLog(body);
  }

  if (body instanceof URLSearchParams) {
    return truncateForLog(body.toString());
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return `[Blob size=${body.size}]`;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return "[FormData payload omitted]";
  }

  return `[${body.constructor?.name ?? typeof body} payload omitted]`;
}

/**
 * Truncates long strings to a fixed preview length for logging
 */
function truncateForLog(text: string): string {
  if (text.length <= MAX_BODY_PREVIEW_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_BODY_PREVIEW_CHARS)}... (truncated ${text.length - MAX_BODY_PREVIEW_CHARS} chars)`;
}

/**
 * Writes a single debug line using the configured writer
 */
function logDebug(line: string): void {
  logWriter(line);
}

/**
 * Converts unknown error-like values into printable strings
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Builds a timestamped log file path in the current working directory
 */
function defaultLogFilePath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(cwd(), `qwen-auth-debug-${timestamp}.log`);
}

/**
 * Creates a line writer that appends to a file when provided
 */
function createLogWriter(filePath?: string): (line: string) => void {
  if (!filePath) {
    return () => {};
  }

  const stream = createWriteStream(filePath, { flags: "a" });
  return (line: string) => {
    stream.write(`${line}\n`);
  };
}
