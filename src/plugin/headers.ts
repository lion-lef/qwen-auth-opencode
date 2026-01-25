/**
 * Custom headers module
 * Provides headers for Qwen API requests
 */

import * as os from "os";

/**
 * Package version (should match package.json)
 */
const VERSION = "1.0.0";

/**
 * Get the User-Agent string for Qwen API requests
 */
export function getUserAgent(): string {
  return `qwen-auth/${VERSION} (${os.platform()} ${os.release()}; ${os.arch()})`;
}

/**
 * Get the X-DashScope-Client header value
 */
export function getDashScopeClient(): string {
  return "qwen-auth-opencode";
}

/**
 * Default headers for Qwen API requests
 */
export const QWEN_HEADERS = {
  "User-Agent": getUserAgent(),
  "X-DashScope-Client": getDashScopeClient(),
} as const;

/**
 * Apply Qwen headers to an output headers object
 */
export function applyQwenHeaders(headers: Record<string, string>): void {
  headers["User-Agent"] = getUserAgent();
  headers["X-DashScope-Client"] = getDashScopeClient();
}
