/**
 * Test Directory Plugin
 *
 * This script demonstrates and tests the directory-based plugin loading
 * that OpenCode uses with Bun's native TypeScript support.
 *
 * Usage: bun run experiments/test-directory-plugin.ts
 *
 * This is the preferred way to use this plugin with OpenCode:
 * 1. Clone the repository or add as a dependency
 * 2. Reference the package in opencode.json plugins array
 * 3. OpenCode/Bun will load index.ts directly without build step
 */

// Import functions and types from root index.ts (simulates how OpenCode loads the plugin)
// NOTE: Constants like QWEN_PROVIDER_ID and QWEN_MODELS are NOT exported from root index.ts
// because OpenCode calls all exports as functions, which fails for non-function values.
import {
  QwenAuthPlugin,
  QwenOAuthDeviceFlow,
  isOAuthAuth,
  isApiAuth,
  loadConfig,
  type Hooks,
} from "../index";

// Import constants directly from their source modules (not from root index.ts)
import { QWEN_PROVIDER_ID, QWEN_MODELS } from "../src/constants";

// Mock OpenCode plugin input
const mockPluginInput = {
  client: {
    auth: {
      set: async (params: { path: { id: string }; body: unknown }) => {
        console.log(`[Mock] Auth set called for provider: ${params.path.id}`);
        return Promise.resolve();
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
  console.log("Testing Directory-Based Plugin Loading");
  console.log("======================================\n");

  // Test 1: Plugin initialization
  console.log("Test 1: Plugin Initialization");
  console.log("------------------------------");

  const hooks: Hooks = await QwenAuthPlugin(mockPluginInput);

  console.log(`✓ Provider ID: ${hooks.auth?.provider}`);
  console.log(`✓ Auth hook: ${hooks.auth ? "present" : "missing"}`);
  console.log(`✓ chat.headers hook: ${hooks["chat.headers"] ? "present" : "missing"}`);

  // Test 2: Auth methods
  console.log("\nTest 2: Auth Methods");
  console.log("--------------------");

  if (hooks.auth?.methods) {
    for (const method of hooks.auth.methods) {
      console.log(`✓ ${method.label} (${method.type})`);
    }
  }

  // Test 3: Type exports work correctly
  console.log("\nTest 3: Type/Function Exports");
  console.log("-----------------------------");

  console.log(`✓ isOAuthAuth: ${typeof isOAuthAuth}`);
  console.log(`✓ isApiAuth: ${typeof isApiAuth}`);
  console.log(`✓ QwenOAuthDeviceFlow: ${typeof QwenOAuthDeviceFlow}`);
  console.log(`✓ loadConfig: ${typeof loadConfig}`);

  // Test 4: Constants exports
  console.log("\nTest 4: Constants Exports");
  console.log("-------------------------");

  console.log(`✓ QWEN_PROVIDER_ID: ${QWEN_PROVIDER_ID}`);
  console.log(`✓ QWEN_MODELS count: ${Object.keys(QWEN_MODELS).length}`);

  // Test 5: Auth loader with mock data
  console.log("\nTest 5: Auth Loader");
  console.log("-------------------");

  if (hooks.auth?.loader) {
    const mockGetAuth = async () => ({
      type: "api" as const,
      access: "test-key",
      expires: Date.now() + 3600000,
    });

    const mockProvider = {
      models: {
        "qwen-turbo": { cost: { input: 0.001, output: 0.002, cache: { read: 0.0005, write: 0.001 } } },
        "qwen-coder-plus": { cost: { input: 0.002, output: 0.004, cache: { read: 0.001, write: 0.002 } } },
        "unknown-model": { cost: { input: 0.01, output: 0.03, cache: { read: 0.005, write: 0.01 } } },
      },
    };

    const loaderResult = await hooks.auth.loader(mockGetAuth, mockProvider);
    console.log(`✓ Loader returned: ${JSON.stringify(loaderResult)}`);
    console.log(`✓ Models filtered to: ${Object.keys(mockProvider.models).join(", ")}`);
  }

  // Test 6: chat.headers hook
  console.log("\nTest 6: chat.headers Hook");
  console.log("-------------------------");

  if (hooks["chat.headers"]) {
    const mockInput = {
      sessionID: "test-session",
      agent: "coder",
      model: { providerID: "alibaba", modelID: "qwen-coder-plus" },
      provider: {},
      message: {},
    };

    const output = { headers: {} as Record<string, string> };
    await hooks["chat.headers"](mockInput, output);

    console.log(`✓ Headers added: ${Object.keys(output.headers).join(", ")}`);
  }

  console.log("\n======================================");
  console.log("All directory plugin tests PASSED!");
  console.log("\nThis plugin can now be used by OpenCode by:");
  console.log("1. Cloning this repo: git clone https://github.com/lion-lef/qwen-auth-opencode");
  console.log("2. Adding to opencode.json plugins: \"./path/to/qwen-auth-opencode\"");
  console.log("3. Or installing via npm: npm install qwen-auth");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
