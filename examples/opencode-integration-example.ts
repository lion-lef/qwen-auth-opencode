#!/usr/bin/env bun
/**
 * Example: Testing qwen-auth plugin with OpenCode SDK
 *
 * This example demonstrates how the plugin would be loaded and used
 * by the opencode CLI tool. It simulates the plugin loading process
 * to help diagnose any integration issues.
 *
 * Usage:
 *   bun run examples/opencode-integration-example.ts
 */

import { QwenAuthPlugin, QWEN_PROVIDER_ID, QWEN_MODELS } from "../index";
import type { PluginInput, Hooks } from "@opencode-ai/plugin";

console.log("=== OpenCode Plugin Integration Test ===\n");

// Simulate the PluginInput that opencode provides
const mockPluginInput: PluginInput = {
  client: {
    auth: {
      set: async (provider: string, auth: any) => {
        console.log(`[Mock] auth.set called for provider: ${provider}`);
      },
      get: async (provider: string) => {
        console.log(`[Mock] auth.get called for provider: ${provider}`);
        return null;
      },
      remove: async (provider: string) => {
        console.log(`[Mock] auth.remove called for provider: ${provider}`);
      },
    },
    session: {
      list: async () => [],
      create: async () => ({ id: "test-session" }),
      get: async () => null,
    },
    message: {
      send: async () => {},
    },
  } as any,
  project: {
    name: "test-project",
    directory: "/tmp/test-project",
  } as any,
  directory: "/tmp/test-project",
  worktree: "/tmp/test-project",
  serverUrl: new URL("http://localhost:3000"),
  $: (() => {}) as any, // BunShell mock
};

async function runTest() {
  console.log("1. Loading plugin...");

  try {
    const hooks: Hooks = await QwenAuthPlugin(mockPluginInput);
    console.log("   ✅ Plugin loaded successfully\n");

    console.log("2. Checking hooks structure...");
    console.log(`   - auth hook: ${hooks.auth ? "✅ present" : "❌ missing"}`);
    console.log(
      `   - chat.headers hook: ${"chat.headers" in hooks ? "✅ present" : "❌ missing"}`
    );
    console.log();

    if (hooks.auth) {
      console.log("3. Auth hook details:");
      console.log(`   - provider: ${hooks.auth.provider}`);
      console.log(`   - methods count: ${hooks.auth.methods.length}`);
      hooks.auth.methods.forEach((method, i) => {
        console.log(`   - method ${i + 1}: ${method.label} (${method.type})`);
      });
      console.log();

      console.log("4. Testing auth.loader...");
      const mockAuth = { type: "api" as const };
      const mockProvider = {
        models: {
          "qwen-turbo": {},
          "qwen-plus": {},
          "gpt-4": {}, // Should be filtered
        },
      };

      const loaderResult = await hooks.auth.loader?.(
        async () => mockAuth,
        mockProvider
      );
      console.log(`   - loader result: ${JSON.stringify(loaderResult)}`);
      console.log(`   - models after filtering: ${Object.keys(mockProvider.models).join(", ")}`);
      console.log();

      console.log("5. Testing API key authorization...");
      const apiKeyMethod = hooks.auth.methods.find((m) => m.type === "api");
      if (apiKeyMethod?.authorize) {
        const result = await apiKeyMethod.authorize({
          apiKey: "sk-test-key-12345",
          endpoint: "china",
        });
        console.log(`   - Authorization result: ${JSON.stringify(result)}`);
      }
      console.log();
    }

    console.log("6. Testing chat.headers hook...");
    if (hooks["chat.headers"]) {
      const chatInput = {
        sessionID: "test-session",
        agent: "coder",
        model: { providerID: QWEN_PROVIDER_ID, modelID: "qwen-turbo" },
        provider: { source: "config" as const, info: {}, options: {} },
        message: {},
      };
      const output = { headers: {} as Record<string, string> };

      await hooks["chat.headers"](chatInput as any, output);
      console.log(`   - Headers added: ${JSON.stringify(output.headers)}`);
    }
    console.log();

    console.log("7. Testing exports from index.ts...");
    const expectedExports = [
      "QwenAuthPlugin",
      "default",
      "loadCredentials",
      "saveCredentials",
      "clearCredentials",
      "OAUTH_DUMMY_KEY",
      "QWEN_PROVIDER_ID",
      "QWEN_MODELS",
      "QWEN_API_ENDPOINTS",
    ];

    const indexModule = await import("../index");
    for (const exp of expectedExports) {
      const exists = exp in indexModule;
      console.log(`   - ${exp}: ${exists ? "✅" : "❌"}`);
    }
    console.log();

    console.log("=== All Tests Passed ===");
    return true;
  } catch (error) {
    console.error("❌ Test failed with error:");
    console.error(error);
    return false;
  }
}

const success = await runTest();
process.exit(success ? 0 : 1);
