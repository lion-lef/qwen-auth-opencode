/**
 * Integration tests for OpenCode SDK compatibility
 *
 * This test suite verifies that the qwen-auth plugin works correctly
 * with the @opencode-ai/plugin types and SDK.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import type { Plugin, PluginInput, Hooks, AuthHook } from "@opencode-ai/plugin";
import { QWEN_PROVIDER_ID, QWEN_MODELS } from "../src/constants";

// Mock fs/promises before importing plugin
mock.module("fs/promises", () => ({
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve(undefined)),
  mkdir: mock(() => Promise.resolve(undefined)),
  unlink: mock(() => Promise.resolve(undefined)),
}));

// Import plugin after mocking
const { QwenAuthPlugin, default: defaultExport } = await import("../src/opencode-plugin");

describe("OpenCode SDK Integration", () => {
  // Create a mock PluginInput that matches the SDK types
  const createMockPluginInput = (): PluginInput => ({
    client: {
      // Mock the OpencodeClient interface
      auth: {
        set: mock(() => Promise.resolve()),
        get: mock(() => Promise.resolve(null)),
        remove: mock(() => Promise.resolve()),
      },
      session: {
        list: mock(() => Promise.resolve([])),
        create: mock(() => Promise.resolve({ id: "test-session" })),
        get: mock(() => Promise.resolve(null)),
      },
      message: {
        send: mock(() => Promise.resolve()),
      },
    } as any, // Using any to match flexible SDK client interface
    project: {
      name: "test-project",
      directory: "/test/project",
    } as any,
    directory: "/test/project",
    worktree: "/test/project",
    serverUrl: new URL("http://localhost:3000"),
    $: (() => {}) as any, // BunShell mock
  });

  describe("Plugin Function Signature", () => {
    it("should be callable as an async function returning Hooks", async () => {
      const input = createMockPluginInput();
      const result = await QwenAuthPlugin(input);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("should have a default export matching the named export", () => {
      expect(defaultExport).toBe(QwenAuthPlugin);
    });

    it("should return valid Hooks interface", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      // Check that returned object matches Hooks interface
      expect(hooks).toHaveProperty("auth");
      // Use bracket notation since the key contains a dot
      expect("chat.headers" in hooks).toBe(true);
      expect(hooks["chat.headers"]).toBeDefined();
    });
  });

  describe("Auth Hook Structure", () => {
    it("should have auth hook with correct provider string", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      expect(hooks.auth).toBeDefined();
      expect(typeof hooks.auth?.provider).toBe("string");
      expect(hooks.auth?.provider).toBe(QWEN_PROVIDER_ID);
    });

    it("should have auth hook with loader function", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      expect(hooks.auth?.loader).toBeDefined();
      expect(typeof hooks.auth?.loader).toBe("function");
    });

    it("should have auth hook with methods array", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      expect(Array.isArray(hooks.auth?.methods)).toBe(true);
      expect(hooks.auth?.methods.length).toBeGreaterThan(0);
    });
  });

  describe("OAuth Method Structure", () => {
    it("should have OAuth method with correct type and label", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const oauthMethod = hooks.auth?.methods.find(m => m.type === "oauth");
      expect(oauthMethod).toBeDefined();
      expect(oauthMethod?.type).toBe("oauth");
      expect(typeof oauthMethod?.label).toBe("string");
    });

    it("should have OAuth authorize function returning correct structure", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const oauthMethod = hooks.auth?.methods.find(m => m.type === "oauth");
      expect(oauthMethod).toBeDefined();
      expect(typeof oauthMethod?.authorize).toBe("function");

      // Verify the method type structure matches SDK expectations
      if (oauthMethod?.type === "oauth") {
        expect(oauthMethod.authorize).toBeDefined();
      }
    });
  });

  describe("API Key Method Structure", () => {
    it("should have API method with correct type and label", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");
      expect(apiMethod).toBeDefined();
      expect(apiMethod?.type).toBe("api");
      expect(typeof apiMethod?.label).toBe("string");
    });

    it("should have API method with prompts array", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");
      expect(apiMethod).toBeDefined();
      expect(Array.isArray(apiMethod?.prompts)).toBe(true);
    });

    it("should have text prompt for API key", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");
      const apiKeyPrompt = apiMethod?.prompts?.find(p => p.key === "apiKey");

      expect(apiKeyPrompt).toBeDefined();
      expect(apiKeyPrompt?.type).toBe("text");
      expect(apiKeyPrompt?.key).toBe("apiKey");
      expect(typeof apiKeyPrompt?.message).toBe("string");
    });

    it("should have select prompt for endpoint", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");
      const endpointPrompt = apiMethod?.prompts?.find(p => p.key === "endpoint");

      expect(endpointPrompt).toBeDefined();
      expect(endpointPrompt?.type).toBe("select");
      expect(Array.isArray((endpointPrompt as any)?.options)).toBe(true);
    });

    it("should have API key validation function", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");
      const apiKeyPrompt = apiMethod?.prompts?.find(p => p.key === "apiKey");

      expect(typeof apiKeyPrompt?.validate).toBe("function");

      // Test validation
      expect(apiKeyPrompt?.validate?.("")).toBeDefined(); // Empty should fail
      expect(apiKeyPrompt?.validate?.("invalid")).toBeDefined(); // Wrong format should fail
      expect(apiKeyPrompt?.validate?.("sk-valid-key")).toBeUndefined(); // Valid should pass
    });

    it("should authorize successfully with valid API key", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");

      if (apiMethod?.authorize) {
        const result = await apiMethod.authorize({ apiKey: "sk-test-key-12345" });

        expect(result).toBeDefined();
        expect(result.type).toBe("success");
        if (result.type === "success") {
          expect(result.key).toBe("sk-test-key-12345");
        }
      }
    });

    it("should fail authorization with missing API key", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const apiMethod = hooks.auth?.methods.find(m => m.type === "api");

      if (apiMethod?.authorize) {
        const result = await apiMethod.authorize({});

        expect(result).toBeDefined();
        expect(result.type).toBe("failed");
      }
    });
  });

  describe("Loader Function", () => {
    it("should accept auth getter and provider object", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const mockAuth = { type: "api" as const };
      const mockProvider = { models: {} };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      const result = await hooks.auth?.loader?.(getAuth, mockProvider);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("should return empty object for API key auth", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const mockAuth = { type: "api" as const };
      const mockProvider = { models: { "qwen-turbo": {} } };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      const result = await hooks.auth?.loader?.(getAuth, mockProvider);

      expect(result).toEqual({});
    });

    it("should return apiKey and fetch for OAuth auth", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const mockAuth = {
        type: "oauth" as const,
        access: "test-access-token",
        expires: Date.now() + 3600000,
        refresh: "test-refresh-token",
      };
      const mockProvider = { models: { "qwen-turbo": {} } };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      const result = await hooks.auth?.loader?.(getAuth, mockProvider);

      expect(result).toBeDefined();
      expect(result?.apiKey).toBeDefined();
      expect(result?.fetch).toBeDefined();
      expect(typeof result?.fetch).toBe("function");
    });

    it("should filter non-Qwen models from provider", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const mockAuth = { type: "api" as const };
      const mockProvider = {
        models: {
          "qwen-turbo": {},
          "qwen-plus": {},
          "gpt-4": {},
          "claude-3": {},
        },
      };
      const getAuth = mock(() => Promise.resolve(mockAuth));

      await hooks.auth?.loader?.(getAuth, mockProvider);

      // Check that non-Qwen models are removed
      expect(mockProvider.models).not.toHaveProperty("gpt-4");
      expect(mockProvider.models).not.toHaveProperty("claude-3");
    });
  });

  describe("Chat Headers Hook", () => {
    it("should be a function", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      expect(typeof hooks["chat.headers"]).toBe("function");
    });

    it("should add headers for Qwen provider requests", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const chatInput = {
        sessionID: "test-session",
        agent: "coder",
        model: { providerID: QWEN_PROVIDER_ID, modelID: "qwen-turbo" },
        provider: { source: "config" as const, info: {}, options: {} },
        message: {},
      };
      const output = { headers: {} as Record<string, string> };

      await hooks["chat.headers"]?.(chatInput as any, output);

      expect(output.headers["User-Agent"]).toBeDefined();
      expect(output.headers["User-Agent"]).toContain("qwen-auth");
      expect(output.headers["X-DashScope-Client"]).toBe("qwen-auth-opencode");
    });

    it("should not modify headers for non-Qwen provider requests", async () => {
      const input = createMockPluginInput();
      const hooks = await QwenAuthPlugin(input);

      const chatInput = {
        sessionID: "test-session",
        agent: "coder",
        model: { providerID: "openai", modelID: "gpt-4" },
        provider: { source: "config" as const, info: {}, options: {} },
        message: {},
      };
      const output = { headers: {} as Record<string, string> };

      await hooks["chat.headers"]?.(chatInput as any, output);

      expect(output.headers["User-Agent"]).toBeUndefined();
      expect(output.headers["X-DashScope-Client"]).toBeUndefined();
    });
  });

  describe("Plugin Type Compatibility", () => {
    it("should be compatible with Plugin type signature", async () => {
      // Verify that QwenAuthPlugin matches the Plugin type from @opencode-ai/plugin
      const plugin: Plugin = QwenAuthPlugin;

      expect(plugin).toBeDefined();
      expect(typeof plugin).toBe("function");
    });

    it("should return Hooks compatible with SDK Hooks interface", async () => {
      const input = createMockPluginInput();
      const hooks: Hooks = await QwenAuthPlugin(input);

      // Verify hooks structure matches SDK expectations
      expect(hooks).toBeDefined();

      // auth is optional in Hooks
      if (hooks.auth) {
        expect(typeof hooks.auth.provider).toBe("string");
        expect(Array.isArray(hooks.auth.methods)).toBe(true);
      }
    });
  });
});

describe("Module Exports", () => {
  it("should export QwenAuthPlugin as named export", async () => {
    const { QwenAuthPlugin } = await import("../src/opencode-plugin");
    expect(QwenAuthPlugin).toBeDefined();
    expect(typeof QwenAuthPlugin).toBe("function");
  });

  it("should export default as default export", async () => {
    const module = await import("../src/opencode-plugin");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });

  it("should export credential storage functions", async () => {
    const { loadCredentials, saveCredentials, clearCredentials, OAUTH_DUMMY_KEY, getCredentialsPath } =
      await import("../src/opencode-plugin");

    expect(typeof loadCredentials).toBe("function");
    expect(typeof saveCredentials).toBe("function");
    expect(typeof clearCredentials).toBe("function");
    expect(typeof getCredentialsPath).toBe("function");
    expect(typeof OAUTH_DUMMY_KEY).toBe("string");
  });
});
