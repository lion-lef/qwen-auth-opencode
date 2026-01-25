/**
 * Tests for configuration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateConfig,
  createDefaultApiKeyConfig,
  createDefaultJwtConfig,
  createDefaultOAuthConfig,
  QwenAuthConfigSchema,
} from "../src/config/schema";
import { loadFromEnvironment } from "../src/config/loader";
import { AUTH_METHODS } from "../src/constants";

describe("Configuration Schema", () => {
  describe("validateConfig", () => {
    it("should validate API key config", () => {
      const config = {
        method: AUTH_METHODS.API_KEY,
        apiKey: { apiKey: "test-api-key-12345678" },
      };

      const validated = validateConfig(config);

      expect(validated.method).toBe(AUTH_METHODS.API_KEY);
      expect(validated.apiKey?.apiKey).toBe("test-api-key-12345678");
    });

    it("should validate JWT config", () => {
      const config = {
        method: AUTH_METHODS.JWT,
        jwt: {
          privateKey: "-----BEGIN PRIVATE KEY-----...",
          keyId: "key-123",
          issuer: "test-issuer",
        },
      };

      const validated = validateConfig(config);

      expect(validated.method).toBe(AUTH_METHODS.JWT);
      expect(validated.jwt?.keyId).toBe("key-123");
    });

    it("should validate OAuth config", () => {
      const config = {
        method: AUTH_METHODS.OAUTH,
        oauth: {
          clientId: "client-123",
          clientSecret: "secret-456",
        },
      };

      const validated = validateConfig(config);

      expect(validated.method).toBe(AUTH_METHODS.OAUTH);
      expect(validated.oauth?.clientId).toBe("client-123");
    });

    it("should fail when auth config missing for method", () => {
      const config = {
        method: AUTH_METHODS.API_KEY,
        // Missing apiKey config
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should apply default values", () => {
      const config = {
        method: AUTH_METHODS.API_KEY,
        apiKey: { apiKey: "test-key" },
      };

      const validated = validateConfig(config);

      expect(validated.debug).toBe(false);
      expect(validated.useInternationalEndpoint).toBe(false);
    });
  });

  describe("createDefaultApiKeyConfig", () => {
    it("should create valid API key config", () => {
      const config = createDefaultApiKeyConfig("my-api-key");

      expect(config.method).toBe(AUTH_METHODS.API_KEY);
      expect(config.apiKey?.apiKey).toBe("my-api-key");
      expect(config.debug).toBe(false);
    });
  });

  describe("createDefaultJwtConfig", () => {
    it("should create valid JWT config", () => {
      const config = createDefaultJwtConfig("private-key", "key-id", "issuer");

      expect(config.method).toBe(AUTH_METHODS.JWT);
      expect(config.jwt?.privateKey).toBe("private-key");
      expect(config.jwt?.keyId).toBe("key-id");
      expect(config.jwt?.issuer).toBe("issuer");
      expect(config.jwt?.algorithm).toBe("RS256");
    });
  });

  describe("createDefaultOAuthConfig", () => {
    it("should create valid OAuth config", () => {
      const config = createDefaultOAuthConfig("client-id", "client-secret");

      expect(config.method).toBe(AUTH_METHODS.OAUTH);
      expect(config.oauth?.clientId).toBe("client-id");
      expect(config.oauth?.clientSecret).toBe("client-secret");
      expect(config.oauth?.redirectUri).toBe("http://localhost:8765/callback");
    });
  });
});

describe("Configuration Loader", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadFromEnvironment", () => {
    it("should load API key from environment", () => {
      process.env.QWEN_API_KEY = "env-api-key-123";

      const config = loadFromEnvironment();

      expect(config).not.toBeNull();
      expect(config?.method).toBe(AUTH_METHODS.API_KEY);
      expect(config?.apiKey?.apiKey).toBe("env-api-key-123");
    });

    it("should load JWT config from environment", () => {
      process.env.QWEN_JWT_PRIVATE_KEY = "private-key";
      process.env.QWEN_JWT_KEY_ID = "key-id";
      process.env.QWEN_JWT_ISSUER = "issuer";

      const config = loadFromEnvironment();

      expect(config).not.toBeNull();
      expect(config?.method).toBe(AUTH_METHODS.JWT);
      expect(config?.jwt?.privateKey).toBe("private-key");
    });

    it("should load OAuth config from environment", () => {
      process.env.QWEN_OAUTH_CLIENT_ID = "client-id";
      process.env.QWEN_OAUTH_CLIENT_SECRET = "client-secret";

      const config = loadFromEnvironment();

      expect(config).not.toBeNull();
      expect(config?.method).toBe(AUTH_METHODS.OAUTH);
      expect(config?.oauth?.clientId).toBe("client-id");
    });

    it("should return null when no config in environment", () => {
      const config = loadFromEnvironment();

      expect(config).toBeNull();
    });

    it("should read debug flag from environment", () => {
      process.env.QWEN_API_KEY = "api-key";
      process.env.QWEN_AUTH_DEBUG = "true";

      const config = loadFromEnvironment();

      expect(config?.debug).toBe(true);
    });

    it("should read international endpoint flag", () => {
      process.env.QWEN_API_KEY = "api-key";
      process.env.QWEN_USE_INTERNATIONAL = "true";

      const config = loadFromEnvironment();

      expect(config?.useInternationalEndpoint).toBe(true);
    });
  });
});

describe("Security Config Schema", () => {
  it("should validate rate limit config", () => {
    const config = {
      method: AUTH_METHODS.API_KEY,
      apiKey: { apiKey: "test-key" },
      security: {
        rateLimit: {
          maxAttempts: 10,
          windowMs: 120000,
          lockoutMs: 600000,
          enabled: true,
        },
      },
    };

    const validated = validateConfig(config);

    expect(validated.security?.rateLimit?.maxAttempts).toBe(10);
    expect(validated.security?.rateLimit?.windowMs).toBe(120000);
  });

  it("should apply rate limit defaults", () => {
    const config = {
      method: AUTH_METHODS.API_KEY,
      apiKey: { apiKey: "test-key" },
      security: {
        rateLimit: {},
      },
    };

    const validated = validateConfig(config);

    expect(validated.security?.rateLimit?.maxAttempts).toBe(5);
    expect(validated.security?.rateLimit?.enabled).toBe(true);
  });

  it("should validate encryption settings", () => {
    const config = {
      method: AUTH_METHODS.API_KEY,
      apiKey: { apiKey: "test-key" },
      security: {
        encryptCredentials: true,
        auditLogging: true,
      },
    };

    const validated = validateConfig(config);

    expect(validated.security?.encryptCredentials).toBe(true);
    expect(validated.security?.auditLogging).toBe(true);
  });
});
