/**
 * Tests for configuration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateConfig,
  createDefaultApiKeyConfig,
  QwenAuthConfigSchema,
} from "../src/config/schema";
import { loadFromEnvironment } from "../src/config/loader";

describe("Configuration Schema", () => {
  describe("validateConfig", () => {
    it("should validate API key config", () => {
      const config = {
        apiKey: { apiKey: "test-api-key-12345678" },
      };

      const validated = validateConfig(config);

      expect(validated.apiKey?.apiKey).toBe("test-api-key-12345678");
    });

    it("should validate config with base URL override", () => {
      const config = {
        apiKey: {
          apiKey: "test-api-key-12345678",
          baseUrl: "https://custom.endpoint.com/v1",
        },
      };

      const validated = validateConfig(config);

      expect(validated.apiKey?.apiKey).toBe("test-api-key-12345678");
      expect(validated.apiKey?.baseUrl).toBe("https://custom.endpoint.com/v1");
    });

    it("should apply default values", () => {
      const config = {
        apiKey: { apiKey: "test-key" },
      };

      const validated = validateConfig(config);

      expect(validated.debug).toBe(false);
      expect(validated.useInternationalEndpoint).toBe(false);
    });

    it("should validate empty config (OAuth will be used)", () => {
      const config = {};

      const validated = validateConfig(config);

      expect(validated.debug).toBe(false);
      expect(validated.useInternationalEndpoint).toBe(false);
    });

    it("should validate config with debug enabled", () => {
      const config = {
        apiKey: { apiKey: "test-key" },
        debug: true,
      };

      const validated = validateConfig(config);

      expect(validated.debug).toBe(true);
    });

    it("should validate config with international endpoint", () => {
      const config = {
        apiKey: { apiKey: "test-key" },
        useInternationalEndpoint: true,
      };

      const validated = validateConfig(config);

      expect(validated.useInternationalEndpoint).toBe(true);
    });
  });

  describe("createDefaultApiKeyConfig", () => {
    it("should create valid API key config", () => {
      const config = createDefaultApiKeyConfig("my-api-key");

      expect(config.apiKey?.apiKey).toBe("my-api-key");
      expect(config.debug).toBe(false);
      expect(config.useInternationalEndpoint).toBe(false);
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
    it("should load QWEN_API_KEY from environment", () => {
      process.env.QWEN_API_KEY = "env-api-key-123";

      const config = loadFromEnvironment();

      expect(config).not.toBeNull();
      expect(config?.apiKey?.apiKey).toBe("env-api-key-123");
    });

    it("should load DASHSCOPE_API_KEY from environment", () => {
      process.env.DASHSCOPE_API_KEY = "dashscope-api-key-456";

      const config = loadFromEnvironment();

      expect(config).not.toBeNull();
      expect(config?.apiKey?.apiKey).toBe("dashscope-api-key-456");
    });

    it("should prefer QWEN_API_KEY over DASHSCOPE_API_KEY", () => {
      process.env.QWEN_API_KEY = "qwen-key";
      process.env.DASHSCOPE_API_KEY = "dashscope-key";

      const config = loadFromEnvironment();

      expect(config?.apiKey?.apiKey).toBe("qwen-key");
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

    it("should set debug to false when env var is not 'true'", () => {
      process.env.QWEN_API_KEY = "api-key";
      process.env.QWEN_AUTH_DEBUG = "false";

      const config = loadFromEnvironment();

      expect(config?.debug).toBe(false);
    });
  });
});
