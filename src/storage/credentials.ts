/**
 * Credential storage for secure persistence of authentication data
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncrypted,
  type EncryptedData,
} from "../security/encryption";
import type { TokenInfo } from "../auth/types";
import { STORAGE_KEYS } from "../constants";

/**
 * Stored credential structure
 */
export interface StoredCredentials {
  /** API key (if using API key auth) */
  apiKey?: string;
  /** OAuth tokens */
  oauth?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    scopes?: string[];
  };
  /** JWT configuration */
  jwt?: {
    privateKey: string;
    keyId: string;
    issuer: string;
  };
  /** Last update timestamp */
  updatedAt: number;
  /** Credential version for migration */
  version: number;
}

/**
 * Storage file structure
 */
interface StorageFile {
  credentials?: EncryptedData | StoredCredentials;
  metadata: {
    createdAt: number;
    updatedAt: number;
    encrypted: boolean;
  };
}

/**
 * Get the storage directory path
 */
function getStorageDir(): string {
  const xdgData = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdgData, "qwen-auth");
}

/**
 * Get the credentials file path
 */
function getCredentialsPath(): string {
  return join(getStorageDir(), "credentials.json");
}

/**
 * Ensure the storage directory exists
 */
function ensureStorageDir(): void {
  const dir = getStorageDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load credentials from storage
 */
export function loadCredentials(encryptionKey?: string): StoredCredentials | null {
  const path = getCredentialsPath();

  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const storage: StorageFile = JSON.parse(content);

    if (!storage.credentials) {
      return null;
    }

    // Check if encrypted
    if (storage.metadata.encrypted && isEncrypted(storage.credentials)) {
      return decryptObject<StoredCredentials>(storage.credentials, encryptionKey);
    }

    return storage.credentials as StoredCredentials;
  } catch (error) {
    console.error("Failed to load credentials:", error);
    return null;
  }
}

/**
 * Save credentials to storage
 */
export function saveCredentials(
  credentials: StoredCredentials,
  encrypt: boolean = true,
  encryptionKey?: string
): void {
  ensureStorageDir();

  const path = getCredentialsPath();
  const now = Date.now();

  // Update timestamp and version
  credentials.updatedAt = now;
  credentials.version = credentials.version || 1;

  let storedCredentials: EncryptedData | StoredCredentials = credentials;

  if (encrypt) {
    storedCredentials = encryptObject(credentials, encryptionKey);
  }

  const storage: StorageFile = {
    credentials: storedCredentials,
    metadata: {
      createdAt: existsSync(path)
        ? JSON.parse(readFileSync(path, "utf-8")).metadata?.createdAt || now
        : now,
      updatedAt: now,
      encrypted: encrypt,
    },
  };

  writeFileSync(path, JSON.stringify(storage, null, 2), { mode: 0o600 });
}

/**
 * Delete credentials from storage
 */
export function deleteCredentials(): void {
  const path = getCredentialsPath();

  if (existsSync(path)) {
    // Overwrite with empty data before deletion for security
    writeFileSync(path, JSON.stringify({ deleted: true }), { mode: 0o600 });

    const { unlinkSync } = require("node:fs");
    unlinkSync(path);
  }
}

/**
 * Check if credentials exist
 */
export function hasCredentials(): boolean {
  return existsSync(getCredentialsPath());
}

/**
 * Convert TokenInfo to stored OAuth credentials
 */
export function tokenInfoToStoredCredentials(tokenInfo: TokenInfo): StoredCredentials {
  return {
    oauth: {
      accessToken: tokenInfo.token,
      refreshToken: tokenInfo.refreshToken,
      expiresAt: tokenInfo.expiresAt,
      scopes: tokenInfo.scopes,
    },
    updatedAt: Date.now(),
    version: 1,
  };
}

/**
 * Create stored credentials from API key
 */
export function apiKeyToStoredCredentials(apiKey: string): StoredCredentials {
  return {
    apiKey,
    updatedAt: Date.now(),
    version: 1,
  };
}

/**
 * Create stored credentials from JWT config
 */
export function jwtConfigToStoredCredentials(
  privateKey: string,
  keyId: string,
  issuer: string
): StoredCredentials {
  return {
    jwt: {
      privateKey,
      keyId,
      issuer,
    },
    updatedAt: Date.now(),
    version: 1,
  };
}

/**
 * Migrate credentials to a new version
 */
export function migrateCredentials(
  credentials: StoredCredentials,
  targetVersion: number
): StoredCredentials {
  let current = { ...credentials };

  // Version migrations
  while (current.version < targetVersion) {
    switch (current.version) {
      case 1:
        // Migration from v1 to v2 (example)
        // Add any needed fields or transformations
        current.version = 2;
        break;
      default:
        // Unknown version, can't migrate
        throw new Error(`Cannot migrate from version ${current.version}`);
    }
  }

  return current;
}
