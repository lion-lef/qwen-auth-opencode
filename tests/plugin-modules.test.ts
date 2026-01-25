/**
 * Tests for the new modular plugin structure
 */

import { describe, it, expect } from "bun:test";
import {
  // Auth helpers
  isOAuthAuth,
  isApiAuth,
  accessTokenExpired,
  tokenNeedsRefresh,
  calculateExpiresAt,
  ACCESS_TOKEN_EXPIRY_BUFFER_MS,
  // Browser helpers
  isHeadlessEnvironment,
  // Headers
  getUserAgent,
  getDashScopeClient,
  QWEN_HEADERS,
  applyQwenHeaders,
  // Fetch wrapper
  OAUTH_DUMMY_KEY,
} from "../src/plugin";

describe("Plugin Auth Helpers", () => {
  describe("isOAuthAuth", () => {
    it("should return true for OAuth auth", () => {
      const auth = {
        type: "oauth",
        refresh: "refresh-token",
        access: "access-token",
        expires: Date.now() + 3600000,
      };
      expect(isOAuthAuth(auth)).toBe(true);
    });

    it("should return false for API auth", () => {
      const auth = { type: "api", key: "sk-test" };
      expect(isOAuthAuth(auth)).toBe(false);
    });

    it("should return false for other auth types", () => {
      const auth = { type: "other" };
      expect(isOAuthAuth(auth)).toBe(false);
    });
  });

  describe("isApiAuth", () => {
    it("should return true for API auth", () => {
      const auth = { type: "api", key: "sk-test" };
      expect(isApiAuth(auth)).toBe(true);
    });

    it("should return false for OAuth auth", () => {
      const auth = {
        type: "oauth",
        refresh: "refresh-token",
        access: "access-token",
        expires: Date.now() + 3600000,
      };
      expect(isApiAuth(auth)).toBe(false);
    });
  });

  describe("accessTokenExpired", () => {
    it("should return true when access token is missing", () => {
      const auth = {
        type: "oauth" as const,
        refresh: "refresh",
        access: "",
        expires: Date.now() + 3600000,
      };
      expect(accessTokenExpired(auth)).toBe(true);
    });

    it("should return true when expires is missing", () => {
      const auth = {
        type: "oauth" as const,
        refresh: "refresh",
        access: "access",
        expires: undefined as unknown as number,
      };
      expect(accessTokenExpired(auth)).toBe(true);
    });

    it("should return true when token is expired", () => {
      const auth = {
        type: "oauth" as const,
        refresh: "refresh",
        access: "access",
        expires: Date.now() - 1000, // Already expired
      };
      expect(accessTokenExpired(auth)).toBe(true);
    });

    it("should return true when token expires within buffer time", () => {
      const auth = {
        type: "oauth" as const,
        refresh: "refresh",
        access: "access",
        expires: Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS - 1000, // Within buffer
      };
      expect(accessTokenExpired(auth)).toBe(true);
    });

    it("should return false when token is valid", () => {
      const auth = {
        type: "oauth" as const,
        refresh: "refresh",
        access: "access",
        expires: Date.now() + 3600000, // Valid for an hour
      };
      expect(accessTokenExpired(auth)).toBe(false);
    });
  });

  describe("tokenNeedsRefresh", () => {
    it("should return true when expires is undefined", () => {
      expect(tokenNeedsRefresh(undefined)).toBe(true);
    });

    it("should return true when token is about to expire", () => {
      const expires = Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS - 1000;
      expect(tokenNeedsRefresh(expires)).toBe(true);
    });

    it("should return false when token is valid", () => {
      const expires = Date.now() + 3600000;
      expect(tokenNeedsRefresh(expires)).toBe(false);
    });
  });

  describe("calculateExpiresAt", () => {
    it("should calculate expiration timestamp correctly", () => {
      const expiresInSeconds = 3600;
      const before = Date.now();
      const result = calculateExpiresAt(expiresInSeconds);
      const after = Date.now();

      // Result should be approximately now + 3600 seconds
      expect(result).toBeGreaterThanOrEqual(before + expiresInSeconds * 1000);
      expect(result).toBeLessThanOrEqual(after + expiresInSeconds * 1000);
    });
  });
});

describe("Plugin Headers", () => {
  describe("getUserAgent", () => {
    it("should return a user agent string", () => {
      const ua = getUserAgent();
      expect(ua).toContain("qwen-auth/");
      expect(ua.length).toBeGreaterThan(10);
    });
  });

  describe("getDashScopeClient", () => {
    it("should return the DashScope client identifier", () => {
      expect(getDashScopeClient()).toBe("qwen-auth-opencode");
    });
  });

  describe("QWEN_HEADERS", () => {
    it("should have User-Agent header", () => {
      expect(QWEN_HEADERS["User-Agent"]).toBeDefined();
    });

    it("should have X-DashScope-Client header", () => {
      expect(QWEN_HEADERS["X-DashScope-Client"]).toBeDefined();
    });
  });

  describe("applyQwenHeaders", () => {
    it("should add Qwen headers to an object", () => {
      const headers: Record<string, string> = {};
      applyQwenHeaders(headers);

      expect(headers["User-Agent"]).toBeDefined();
      expect(headers["X-DashScope-Client"]).toBe("qwen-auth-opencode");
    });
  });
});

describe("Plugin Browser Helpers", () => {
  describe("isHeadlessEnvironment", () => {
    it("should return false in normal environment", () => {
      // Clean up any environment variables
      const originalSSH = process.env.SSH_CONNECTION;
      const originalCI = process.env.CI;
      delete process.env.SSH_CONNECTION;
      delete process.env.CI;

      expect(isHeadlessEnvironment()).toBe(false);

      // Restore
      if (originalSSH) process.env.SSH_CONNECTION = originalSSH;
      if (originalCI) process.env.CI = originalCI;
    });
  });
});

describe("Plugin Constants", () => {
  describe("OAUTH_DUMMY_KEY", () => {
    it("should have the correct value", () => {
      expect(OAUTH_DUMMY_KEY).toBe("sk-oauth-qwen-auth");
    });
  });

  describe("ACCESS_TOKEN_EXPIRY_BUFFER_MS", () => {
    it("should be 5 minutes in milliseconds", () => {
      expect(ACCESS_TOKEN_EXPIRY_BUFFER_MS).toBe(5 * 60 * 1000);
    });
  });
});
