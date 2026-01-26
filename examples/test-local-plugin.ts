/**
 * Test Local Plugin Example
 *
 * This script tests the bundled one-file plugin by simulating
 * an OpenCode plugin environment.
 *
 * Usage: bun run examples/test-local-plugin.ts
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";

// Path to the bundled plugin
const PLUGIN_PATH = path.join(import.meta.dirname, "../dist/qwen-auth-plugin.js");

// Mock OpenCode plugin input
const mockPluginInput = {
  client: {
    auth: {
      set: async (params: { path: { id: string }; body: unknown }) => {
        console.log(`[Mock] Auth set called for provider: ${params.path.id}`);
        console.log(`[Mock] Body:`, JSON.stringify(params.body, null, 2));
      },
    },
  },
  project: {
    name: "test-project",
  },
  directory: process.cwd(),
  worktree: process.cwd(),
  serverUrl: new URL("http://localhost:3000"),
};

async function main() {
  console.log("Testing Local One-File Plugin");
  console.log("===============================\n");

  // Check if plugin file exists
  try {
    await fs.access(PLUGIN_PATH);
  } catch {
    console.error("Error: Plugin file not found at", PLUGIN_PATH);
    console.error("Run 'bun run build:plugin' first to generate the bundled plugin.");
    process.exit(1);
  }

  console.log(`Loading plugin from: ${PLUGIN_PATH}\n`);

  // Dynamically import the bundled plugin
  const pluginModule = await import(PLUGIN_PATH);

  // Check exports
  console.log("Plugin exports:");
  for (const key of Object.keys(pluginModule)) {
    console.log(`  - ${key}: ${typeof pluginModule[key]}`);
  }

  // Get the main plugin function
  const QwenAuthPlugin = pluginModule.QwenAuthPlugin || pluginModule.default;

  if (!QwenAuthPlugin) {
    console.error("Error: Could not find QwenAuthPlugin export");
    process.exit(1);
  }

  console.log("\n--- Initializing Plugin ---\n");

  // Initialize the plugin
  const hooks = await QwenAuthPlugin(mockPluginInput);

  console.log("Plugin hooks returned:");
  console.log(`  - auth: ${hooks.auth ? "present" : "not present"}`);
  console.log(`  - chat.headers: ${hooks["chat.headers"] ? "present" : "not present"}`);

  // Test auth hook structure
  if (hooks.auth) {
    console.log("\n--- Auth Hook Configuration ---\n");
    console.log(`Provider: ${hooks.auth.provider}`);
    console.log(`Methods count: ${hooks.auth.methods.length}`);

    for (const method of hooks.auth.methods) {
      console.log(`\nMethod: ${method.label}`);
      console.log(`  Type: ${method.type}`);
      if (method.prompts) {
        console.log(`  Prompts:`);
        for (const prompt of method.prompts) {
          console.log(`    - ${prompt.key}: ${prompt.message}`);
        }
      }
      console.log(`  authorize: ${typeof method.authorize === "function" ? "function" : "not defined"}`);
    }

    // Test loader function
    if (hooks.auth.loader) {
      console.log("\n--- Testing Auth Loader ---\n");

      const mockGetAuth = async () => ({
        type: "api" as const,
        access: "test-access-token",
        expires: Date.now() + 3600000,
      });

      const mockProvider = {
        models: {
          "qwen-turbo": { cost: { input: 0.001, output: 0.002, cache: { read: 0.0005, write: 0.001 } } },
          "qwen-coder-plus": { cost: { input: 0.002, output: 0.004, cache: { read: 0.001, write: 0.002 } } },
          "gpt-4": { cost: { input: 0.01, output: 0.03, cache: { read: 0.005, write: 0.01 } } }, // Should be filtered
        },
      };

      const loaderResult = await hooks.auth.loader(mockGetAuth, mockProvider);
      console.log("Loader result:", loaderResult);
      console.log("Models after filtering:", Object.keys(mockProvider.models));
    }
  }

  // Test chat.headers hook
  if (hooks["chat.headers"]) {
    console.log("\n--- Testing chat.headers Hook ---\n");

    const mockInput = {
      sessionID: "test-session-123",
      agent: "coder",
      model: { providerID: "alibaba", modelID: "qwen-coder-plus" },
      provider: {},
      message: {},
    };

    const output = { headers: {} as Record<string, string> };

    await hooks["chat.headers"](mockInput, output);

    console.log("Headers added by plugin:");
    for (const [key, value] of Object.entries(output.headers)) {
      console.log(`  ${key}: ${value}`);
    }

    // Test with non-qwen provider (should not add headers)
    const nonQwenInput = {
      ...mockInput,
      model: { providerID: "openai", modelID: "gpt-4" },
    };
    const nonQwenOutput = { headers: {} as Record<string, string> };

    await hooks["chat.headers"](nonQwenInput, nonQwenOutput);

    console.log("\nHeaders for non-qwen provider:");
    console.log(`  Count: ${Object.keys(nonQwenOutput.headers).length} (should be 0)`);
  }

  // Test credential storage functions
  console.log("\n--- Testing Credential Storage ---\n");

  const { saveCredentials, loadCredentials, clearCredentials, getCredentialsPath } = pluginModule;

  if (saveCredentials && loadCredentials && clearCredentials) {
    console.log(`Credentials path: ${getCredentialsPath()}`);

    // Note: We don't actually save credentials in the test to avoid side effects
    console.log("Credential functions are available and properly exported.");
  }

  console.log("\n===============================");
  console.log("Local plugin test completed successfully!");
  console.log("\nTo use this plugin with OpenCode:");
  console.log("  1. Copy dist/qwen-auth-plugin.js to ~/.config/opencode/plugins/");
  console.log("  2. Or copy to .opencode/plugins/ in your project");
  console.log("  3. Restart OpenCode");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
