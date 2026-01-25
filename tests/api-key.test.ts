/**
 * Tests for API Key authentication provider
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ApiKeyAuthProvider, validateApiKeyFormat, maskApiKey } from "../src/auth/api-key";
import { AUTH_METHODS } from "../src/constants";

describe("ApiKeyAuthProvider", () => {
  const validApiKey = "sk-1234567890abcdefghijklmnop";
  let provider: ApiKeyAuthProvider;

  beforeEach(() => {
    provider = new ApiKeyAuthProvider({ apiKey: validApiKey });
  });

  describe("getMethod", () => {
    it("should return API_KEY method", () => {
      expect(provider.getMethod()).toBe(AUTH_METHODS.API_KEY);
    });
  });

  describe("authenticate", () => {
    it("should successfully authenticate with valid API key", async () => {
      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(result.method).toBe(AUTH_METHODS.API_KEY);
      expect(result.token).toBe(validApiKey);
    });

    it("should fail with invalid API key format", async () => {
      const invalidProvider = new ApiKeyAuthProvider({ apiKey: "short" });
      const result = await invalidProvider.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getToken", () => {
    it("should return the API key after authentication", async () => {
      await provider.authenticate();
      const token = await provider.getToken();

      expect(token).toBe(validApiKey);
    });

    it("should return the API key even without explicit authentication", async () => {
      const token = await provider.getToken();

      expect(token).toBe(validApiKey);
    });
  });

  describe("isAuthenticated", () => {
    it("should return false before authentication", () => {
      expect(provider.isAuthenticated()).toBe(false);
    });

    it("should return true after authentication", async () => {
      await provider.authenticate();
      expect(provider.isAuthenticated()).toBe(true);
    });
  });

  describe("refresh", () => {
    it("should return true when authenticated", async () => {
      await provider.authenticate();
      const result = await provider.refresh();

      expect(result).toBe(true);
    });
  });

  describe("revoke", () => {
    it("should clear authentication state", async () => {
      await provider.authenticate();
      expect(provider.isAuthenticated()).toBe(true);

      await provider.revoke();
      expect(provider.isAuthenticated()).toBe(false);
    });
  });

  describe("getTokenInfo", () => {
    it("should return null before authentication", () => {
      expect(provider.getTokenInfo()).toBeNull();
    });

    it("should return token info after authentication", async () => {
      await provider.authenticate();
      const info = provider.getTokenInfo();

      expect(info).not.toBeNull();
      expect(info?.token).toBe(validApiKey);
      expect(info?.tokenType).toBe("Bearer");
      expect(info?.expiresAt).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("getRequestConfig", () => {
    it("should return proper headers and base URL", async () => {
      await provider.authenticate();
      const config = provider.getRequestConfig();

      expect(config.headers["Authorization"]).toBe(`Bearer ${validApiKey}`);
      expect(config.headers["Content-Type"]).toBe("application/json");
      expect(config.baseUrl).toContain("dashscope");
    });

    it("should use international endpoint when configured", async () => {
      const intlProvider = new ApiKeyAuthProvider({ apiKey: validApiKey }, true);
      await intlProvider.authenticate();
      const config = intlProvider.getRequestConfig();

      expect(config.baseUrl).toContain("intl");
    });
  });
});

describe("validateApiKeyFormat", () => {
  it("should return true for valid API key format", () => {
    expect(validateApiKeyFormat("sk-1234567890abcdefghijklmnop")).toBe(true);
    expect(validateApiKeyFormat("abcdefghij1234567890")).toBe(true);
  });

  it("should return false for invalid API key format", () => {
    expect(validateApiKeyFormat("short")).toBe(false);
    expect(validateApiKeyFormat("has spaces in it")).toBe(false);
    expect(validateApiKeyFormat("")).toBe(false);
  });
});

describe("maskApiKey", () => {
  it("should mask API key showing first and last 4 characters", () => {
    expect(maskApiKey("sk-1234567890abcdefghijklmnop")).toBe("sk-1...mnop");
  });

  it("should return **** for short keys", () => {
    expect(maskApiKey("short")).toBe("****");
    expect(maskApiKey("12345678")).toBe("****");
  });
});
