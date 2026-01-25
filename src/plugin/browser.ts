/**
 * Browser opening utilities
 * Platform-aware browser launching for OAuth flows
 */

import { exec } from "node:child_process";

/**
 * Open a URL in the default system browser
 * @param url The URL to open
 */
export function openBrowser(url: string): void {
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS
    exec(`open "${url}"`);
  } else if (platform === "win32") {
    // Windows
    exec(`start "" "${url}"`);
  } else {
    // Linux and others
    exec(`xdg-open "${url}"`);
  }
}

/**
 * Check if running in a headless environment (SSH, CI, etc.)
 * @returns true if the environment appears to be headless
 */
export function isHeadlessEnvironment(): boolean {
  return !!(
    process.env.SSH_CONNECTION ||
    process.env.SSH_CLIENT ||
    process.env.SSH_TTY ||
    process.env.OPENCODE_HEADLESS ||
    process.env.CI
  );
}
