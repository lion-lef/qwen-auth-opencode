/**
 * OpenCode Plugin Example
 *
 * This example demonstrates how the qwen-auth plugin integrates
 * with OpenCode's plugin system.
 */

import { QwenAuthPlugin, QWEN_PROVIDER_ID, QWEN_MODELS } from "../src";

// Mock OpenCode plugin input
const mockPluginInput = {
  client: {
    auth: {
      set: async (params: { path: { id: string }; body: unknown }) => {
        console.log(`Auth set called for provider: ${params.path.id}`);
        console.log(`Body:`, params.body);
      },
    },
  },
  project: {},
  directory: process.cwd(),
  worktree: process.cwd(),
  serverUrl: new URL("http://localhost:3000"),
};

async function main() {
  console.log("OpenCode Plugin Integration Example\n");
  console.log("=====================================\n");

  // Initialize the plugin
  console.log("1. Initializing QwenAuthPlugin...\n");
  const hooks = await QwenAuthPlugin(mockPluginInput);

  console.log("Plugin hooks available:");
  console.log(`  - auth: ${hooks.auth ? "yes" : "no"}`);
  console.log(`  - chat.headers: ${hooks["chat.headers"] ? "yes" : "no"}`);

  if (hooks.auth) {
    console.log(`\n2. Auth Hook Configuration:`);
    console.log(`  Provider ID: ${hooks.auth.provider}`);
    console.log(`  Methods available: ${hooks.auth.methods.length}`);

    for (const method of hooks.auth.methods) {
      console.log(`\n  Method: ${method.label}`);
      console.log(`    Type: ${method.type}`);
      if (method.prompts) {
        console.log(`    Prompts: ${method.prompts.length}`);
        for (const prompt of method.prompts) {
          console.log(`      - ${prompt.key}: ${prompt.message}`);
        }
      }
    }
  }

  // Test chat.headers hook
  if (hooks["chat.headers"]) {
    console.log("\n3. Testing chat.headers hook...\n");

    const mockInput = {
      sessionID: "test-session",
      agent: "coder",
      model: { providerID: QWEN_PROVIDER_ID, modelID: "qwen-coder-plus" },
      provider: {},
      message: {},
    };

    const output = { headers: {} as Record<string, string> };

    await hooks["chat.headers"](mockInput, output);

    console.log("Headers added by plugin:");
    for (const [key, value] of Object.entries(output.headers)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  console.log("\n4. Supported Qwen Models:");
  for (const modelId of Object.keys(QWEN_MODELS)) {
    console.log(`  - ${modelId}`);
  }

  console.log("\n=====================================");
  console.log("Plugin example completed successfully!");
}

main().catch(console.error);
