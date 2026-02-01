/**
 * Credential storage module
 * Handles loading and saving credentials to the filesystem
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import type { StoredCredentials } from "./types";

/**
 * Credential storage directory name
 */
const QWEN_CREDENTIALS_DIR = ".qwen-auth";

/**
 * Credential storage file name
 */
const QWEN_CREDENTIALS_FILE = "credentials.json";

/**
 * Get the full path to the credentials file
 */
export function getCredentialsPath(): string {
  return path.join(os.homedir(), QWEN_CREDENTIALS_DIR, QWEN_CREDENTIALS_FILE);
}

/**
 * Get the credentials directory path
 */
export function getCredentialsDir(): string {
  return path.join(os.homedir(), QWEN_CREDENTIALS_DIR);
}

/**
 * Load credentials from storage
 * @returns The stored credentials or null if not found
 */
export async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const credPath = getCredentialsPath();
    const data = await fs.readFile(credPath, "utf-8");
    return JSON.parse(data) as StoredCredentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to storage
 * Creates the directory if it doesn't exist
 * @param credentials The credentials to save
 */
export async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  const credPath = getCredentialsPath();
  const dir = path.dirname(credPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(credPath, JSON.stringify(credentials, null, 2));
}

/**
 * Clear stored credentials
 * Removes the credentials file if it exists
 */
export async function clearCredentials(): Promise<void> {
  try {
    const credPath = getCredentialsPath();
    await fs.unlink(credPath);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Check if credentials exist
 * @returns true if credentials file exists and is readable
 */
export async function hasStoredCredentials(): Promise<boolean> {
  try {
    const credPath = getCredentialsPath();
    await fs.access(credPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
