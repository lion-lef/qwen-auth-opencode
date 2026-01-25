/**
 * Encryption utilities for secure credential storage
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "node:crypto";
import { hostname, userInfo } from "node:os";

/** Encryption algorithm */
const ALGORITHM = "aes-256-gcm";

/** Key derivation salt length */
const SALT_LENGTH = 32;

/** IV length for GCM */
const IV_LENGTH = 16;

/** Auth tag length */
const AUTH_TAG_LENGTH = 16;

/** Key length for AES-256 */
const KEY_LENGTH = 32;

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Base64 encoded encrypted data */
  data: string;
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded auth tag */
  authTag: string;
  /** Base64 encoded salt (for key derivation) */
  salt: string;
  /** Version for future compatibility */
  version: number;
}

/**
 * Generate a machine-specific encryption key
 * Uses hostname, username, and machine ID to create a unique key
 */
export function generateMachineKey(): string {
  const components = [
    hostname(),
    userInfo().username,
    process.arch,
    process.platform,
  ];

  // Add machine ID if available
  try {
    const { execSync } = require("node:child_process");
    let machineId = "";

    if (process.platform === "linux") {
      machineId = execSync("cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null || echo ''", { encoding: "utf-8" }).trim();
    } else if (process.platform === "darwin") {
      machineId = execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep -E 'UUID' | awk '{print $3}' | tr -d '\"'", { encoding: "utf-8" }).trim();
    } else if (process.platform === "win32") {
      machineId = execSync("wmic csproduct get UUID", { encoding: "utf-8" }).split("\n")[1]?.trim() || "";
    }

    if (machineId) {
      components.push(machineId);
    }
  } catch {
    // Ignore errors, continue without machine ID
  }

  // Create a deterministic hash from components
  return createHash("sha256")
    .update(components.join(":"))
    .digest("hex");
}

/**
 * Derive an encryption key from a password/passphrase
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string, password?: string): EncryptedData {
  const key = password || generateMachineKey();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const derivedKey = deriveKey(key, salt);

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
    version: 1,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData, password?: string): string {
  const key = password || generateMachineKey();

  if (encryptedData.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
  }

  const salt = Buffer.from(encryptedData.salt, "base64");
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");
  const encrypted = Buffer.from(encryptedData.data, "base64");
  const derivedKey = deriveKey(key, salt);

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Decryption failed: invalid key or corrupted data");
  }
}

/**
 * Encrypt an object (serializes to JSON first)
 */
export function encryptObject<T>(obj: T, password?: string): EncryptedData {
  const json = JSON.stringify(obj);
  return encrypt(json, password);
}

/**
 * Decrypt to an object (deserializes from JSON)
 */
export function decryptObject<T>(encryptedData: EncryptedData, password?: string): T {
  const json = decrypt(encryptedData, password);
  return JSON.parse(json) as T;
}

/**
 * Check if data is encrypted
 */
export function isEncrypted(data: unknown): data is EncryptedData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.data === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.authTag === "string" &&
    typeof obj.salt === "string" &&
    typeof obj.version === "number"
  );
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Hash sensitive data for logging/comparison (one-way)
 */
export function hashSensitiveData(data: string): string {
  return createHash("sha256")
    .update(data)
    .digest("hex")
    .substring(0, 16);
}
