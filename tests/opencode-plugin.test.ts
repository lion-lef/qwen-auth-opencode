/**
 * Tests for OpenCode Plugin
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { QWEN_PROVIDER_ID, QWEN_MODELS } from "../src/constants";

// Mock fs/promises module
mock.module("fs/promises", () => ({
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve(undefined)),
  mkdir: mock(() => Promise.resolve(undefined)),
  unlink: mock(() => Promise.resolve(undefined)),
}));

// Import after mocking
const {
  QwenAuthPlugin,
  loadCredentials,
  saveCredentials,
  clearCredentials,
  OAUTH_DUMMY_KEY,
} = await import("../src/opencode-plugin");

describe("OpenCode Plugin", () => {
  const mockPluginInput = {
    client: {
      auth: {
        set: mock(() => Promise.resolve(undefined)),
      },
    },
    project: {},
    directory: "/test/project",
    worktree: "/test/project",
    serverUrl: new URL("http://localhost:3000"),
  };

  describe("QwenAuthPlugin", () => {
    it("should return hooks object with auth and chat.headers", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      expect(hooks).toHaveProperty("auth");
      expect(hooks["chat.headers"]).toBeDefined();
    });

    it("should have correct provider ID in auth hook", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      expect(hooks.auth?.provider).toBe(QWEN_PROVIDER_ID);
    });

    it("should have two authentication methods", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      expect(hooks.auth?.methods).toHaveLength(2);
    });

    it("should have Qwen OAuth method as first option", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const oauthMethod = hooks.auth?.methods[0];
      expect(oauthMethod?.label).toBe("Qwen OAuth (Free)");
      expect(oauthMethod?.type).toBe("oauth");
    });

    it("should have DashScope API Key method as second option", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const apiKeyMethod = hooks.auth?.methods[1];
      expect(apiKeyMethod?.label).toBe("DashScope API Key");
      expect(apiKeyMethod?.type).toBe("api");
    });

    it("should have API key prompts for DashScope method", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const apiKeyMethod = hooks.auth?.methods[1];
      expect(apiKeyMethod?.prompts).toBeDefined();
      expect(apiKeyMethod?.prompts?.length).toBeGreaterThan(0);

      const apiKeyPrompt = apiKeyMethod?.prompts?.[0];
      expect(apiKeyPrompt?.key).toBe("apiKey");
      expect(apiKeyPrompt?.type).toBe("text");
    });

    it("should validate API key format in prompts", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const apiKeyMethod = hooks.auth?.methods[1];
      const apiKeyPrompt = apiKeyMethod?.prompts?.[0];

      expect(apiKeyPrompt?.validate).toBeDefined();
      expect(apiKeyPrompt?.validate?.("")).toBeDefined(); // Should return error
      expect(apiKeyPrompt?.validate?.("invalid")).toBeDefined(); // Should return error (no sk- prefix)
      expect(apiKeyPrompt?.validate?.("sk-valid-key-12345")).toBeUndefined(); // Should pass
    });
  });

  describe("chat.headers hook", () => {
    it("should add custom headers for Qwen provider", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const input = {
        sessionID: "test-session",
        agent: "coder",
        model: { providerID: QWEN_PROVIDER_ID, modelID: "qwen-turbo" },
        provider: {},
        message: {},
      };

      const output = { headers: {} as Record<string, string> };

      await hooks["chat.headers"]?.(input, output);

      expect(output.headers["User-Agent"]).toContain("qwen-auth");
      expect(output.headers["X-DashScope-Client"]).toBe("qwen-auth-opencode");
    });

    it("should not add headers for non-Qwen provider", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const input = {
        sessionID: "test-session",
        agent: "coder",
        model: { providerID: "openai", modelID: "gpt-4" },
        provider: {},
        message: {},
      };

      const output = { headers: {} as Record<string, string> };

      await hooks["chat.headers"]?.(input, output);

      expect(output.headers["User-Agent"]).toBeUndefined();
      expect(output.headers["X-DashScope-Client"]).toBeUndefined();
    });
  });

  describe("auth.loader", () => {
    it("should filter models to only Qwen models", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const mockProvider = {
        models: {
          "qwen-turbo": {},
          "qwen-plus": {},
          "gpt-4": {}, // Should be filtered out
          "claude-3": {}, // Should be filtered out
        },
      };

      const mockAuth = { type: "api" as const };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      await hooks.auth?.loader?.(getAuth, mockProvider);

      const qwenModelIds = Object.keys(QWEN_MODELS);
      expect(mockProvider.models).not.toHaveProperty("gpt-4");
      expect(mockProvider.models).not.toHaveProperty("claude-3");
    });

    it("should return empty object for API key auth", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const mockProvider = { models: { "qwen-turbo": {} } };
      const mockAuth = { type: "api" as const };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      const result = await hooks.auth?.loader?.(getAuth, mockProvider);

      expect(result).toEqual({});
    });

    it("should return custom fetch for OAuth auth", async () => {
      const hooks = await QwenAuthPlugin(mockPluginInput);

      const mockProvider = { models: { "qwen-turbo": {} } };
      const mockAuth = {
        type: "oauth" as const,
        access: "test-access-token",
        expires: Date.now() + 3600000,
        refresh: "test-refresh-token",
      };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      const result = await hooks.auth?.loader?.(getAuth, mockProvider);

      expect(result?.apiKey).toBe(OAUTH_DUMMY_KEY);
      expect(result?.fetch).toBeDefined();
    });
  });
});

describe("Credential Storage", () => {
  it("should export OAUTH_DUMMY_KEY constant from opencode-plugin module", () => {
    expect(OAUTH_DUMMY_KEY).toBe("sk-oauth-qwen-auth");
  });

  it("should export loadCredentials function", () => {
    expect(typeof loadCredentials).toBe("function");
  });

  it("should export saveCredentials function", () => {
    expect(typeof saveCredentials).toBe("function");
  });

  it("should export clearCredentials function", () => {
    expect(typeof clearCredentials).toBe("function");
  });
});

describe("Root index.ts exports - OpenCode compatibility", () => {
  /**
   * This test verifies that the root index.ts only exports functions and classes.
   * OpenCode iterates through all module exports and calls them as functions.
   * Exporting non-function values (numbers, strings, objects) causes runtime errors:
   * "fn3 is not a function. (In 'fn3(input)', 'fn3' is 300000)"
   *
   * The value 300000 was ACCESS_TOKEN_EXPIRY_BUFFER_MS (5 minutes in ms).
   * Fixes: https://github.com/lion-lef/qwen-auth-opencode/issues/9
   */
  it("should only export functions and classes from root index.ts (not constants)", async () => {
    const rootModule = await import("../index");

    const nonFunctionExports: string[] = [];

    for (const [key, value] of Object.entries(rootModule)) {
      // Skip 'default' export (it's the QwenAuthPlugin function)
      if (key === "default") continue;

      // Check if export is NOT a function or class
      if (typeof value !== "function") {
        nonFunctionExports.push(`${key}: ${typeof value} (value: ${JSON.stringify(value)})`);
      }
    }

    // This test should pass - no non-function exports
    expect(nonFunctionExports).toEqual([]);
  });

  it("should export QwenAuthPlugin as default and named export", async () => {
    const rootModule = await import("../index");

    expect(typeof rootModule.default).toBe("function");
    expect(typeof rootModule.QwenAuthPlugin).toBe("function");
    expect(rootModule.default).toBe(rootModule.QwenAuthPlugin);
  });

  it("should export credential storage functions", async () => {
    const rootModule = await import("../index");

    expect(typeof rootModule.loadCredentials).toBe("function");
    expect(typeof rootModule.saveCredentials).toBe("function");
    expect(typeof rootModule.clearCredentials).toBe("function");
    expect(typeof rootModule.getCredentialsPath).toBe("function");
  });

  it("should export auth helper functions", async () => {
    const rootModule = await import("../index");

    expect(typeof rootModule.isOAuthAuth).toBe("function");
    expect(typeof rootModule.isApiAuth).toBe("function");
    expect(typeof rootModule.accessTokenExpired).toBe("function");
    expect(typeof rootModule.tokenNeedsRefresh).toBe("function");
    expect(typeof rootModule.calculateExpiresAt).toBe("function");
  });

  it("should export OAuth flow functions and class", async () => {
    const rootModule = await import("../index");

    expect(typeof rootModule.QwenOAuthDeviceFlow).toBe("function"); // Class
    expect(typeof rootModule.generateCodeVerifier).toBe("function");
    expect(typeof rootModule.generateCodeChallenge).toBe("function");
    expect(typeof rootModule.generatePKCEPair).toBe("function");
    expect(typeof rootModule.requestDeviceAuthorization).toBe("function");
    expect(typeof rootModule.pollDeviceToken).toBe("function");
    expect(typeof rootModule.refreshAccessToken).toBe("function");
  });

  it("should NOT export numeric constants that would cause OpenCode errors", async () => {
    const rootModule = await import("../index");

    // These constants should NOT be exported from root index.ts
    // They can be imported from sub-modules if needed
    expect(rootModule).not.toHaveProperty("ACCESS_TOKEN_EXPIRY_BUFFER_MS");
    expect(rootModule).not.toHaveProperty("QWEN_OAUTH_PORT");
  });

  it("should NOT export object constants that would cause OpenCode errors", async () => {
    const rootModule = await import("../index");

    // These object constants should NOT be exported from root index.ts
    expect(rootModule).not.toHaveProperty("QWEN_PROVIDER_ID");
    expect(rootModule).not.toHaveProperty("QWEN_MODELS");
    expect(rootModule).not.toHaveProperty("QWEN_API_ENDPOINTS");
    expect(rootModule).not.toHaveProperty("AUTH_METHODS");
    expect(rootModule).not.toHaveProperty("TOKEN_SETTINGS");
    expect(rootModule).not.toHaveProperty("QWEN_OAUTH_CONFIG");
    expect(rootModule).not.toHaveProperty("QWEN_OAUTH_CONSTANTS");
    expect(rootModule).not.toHaveProperty("QWEN_HEADERS");
    expect(rootModule).not.toHaveProperty("OAUTH_DUMMY_KEY");
    expect(rootModule).not.toHaveProperty("QwenAuthConfigSchema");
  });
});
