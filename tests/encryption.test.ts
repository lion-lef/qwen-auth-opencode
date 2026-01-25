/**
 * Tests for encryption module
 */

import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncrypted,
  generateSecureToken,
  hashSensitiveData,
} from "../src/security/encryption";

describe("Encryption", () => {
  const testPassword = "test-password-123";

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt text successfully", () => {
      const plaintext = "Hello, World! This is a secret message.";

      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "Same message";

      const encrypted1 = encrypt(plaintext, testPassword);
      const encrypted2 = encrypt(plaintext, testPassword);

      // Different IVs should produce different ciphertext
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it("should fail decryption with wrong password", () => {
      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext, testPassword);

      expect(() => decrypt(encrypted, "wrong-password")).toThrow();
    });

    it("should handle unicode characters", () => {
      const plaintext = "Hello 世界! 🎉 Привет!";

      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty string", () => {
      const plaintext = "";

      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long text", () => {
      const plaintext = "A".repeat(10000);

      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("encryptObject and decryptObject", () => {
    it("should encrypt and decrypt objects", () => {
      const obj = {
        apiKey: "sk-12345",
        userId: 123,
        settings: {
          enabled: true,
          options: ["a", "b", "c"],
        },
      };

      const encrypted = encryptObject(obj, testPassword);
      const decrypted = decryptObject<typeof obj>(encrypted, testPassword);

      expect(decrypted).toEqual(obj);
    });

    it("should handle nested objects", () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: "deep value",
            },
          },
        },
      };

      const encrypted = encryptObject(obj, testPassword);
      const decrypted = decryptObject<typeof obj>(encrypted, testPassword);

      expect(decrypted.level1.level2.level3.value).toBe("deep value");
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3, { key: "value" }];

      const encrypted = encryptObject(arr, testPassword);
      const decrypted = decryptObject<typeof arr>(encrypted, testPassword);

      expect(decrypted).toEqual(arr);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted data", () => {
      const encrypted = encrypt("test", testPassword);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for non-encrypted data", () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted("string")).toBe(false);
      expect(isEncrypted(123)).toBe(false);
      expect(isEncrypted({})).toBe(false);
      expect(isEncrypted({ data: "test" })).toBe(false);
      expect(isEncrypted({ data: "test", iv: "test", authTag: "test" })).toBe(false);
    });

    it("should return true for complete encrypted structure", () => {
      const encrypted = {
        data: "encrypted",
        iv: "iv",
        authTag: "tag",
        salt: "salt",
        version: 1,
      };

      expect(isEncrypted(encrypted)).toBe(true);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate token of specified length", () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);

      // base64url encoding increases length
      expect(token16.length).toBeGreaterThan(16);
      expect(token32.length).toBeGreaterThan(32);
      expect(token64.length).toBeGreaterThan(64);
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it("should generate URL-safe tokens", () => {
      const token = generateSecureToken();

      // base64url should not contain + or /
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe("hashSensitiveData", () => {
    it("should produce consistent hash for same input", () => {
      const data = "sensitive-data";

      const hash1 = hashSensitiveData(data);
      const hash2 = hashSensitiveData(data);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different input", () => {
      const hash1 = hashSensitiveData("data1");
      const hash2 = hashSensitiveData("data2");

      expect(hash1).not.toBe(hash2);
    });

    it("should return truncated hash", () => {
      const hash = hashSensitiveData("test");

      expect(hash.length).toBe(16);
    });

    it("should be one-way (cannot reverse)", () => {
      const hash = hashSensitiveData("secret");

      // Hash should not contain the original value
      expect(hash).not.toContain("secret");
    });
  });
});
