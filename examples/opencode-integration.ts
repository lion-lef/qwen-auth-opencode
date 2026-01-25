/**
 * OpenCode Integration Example
 *
 * This example shows how qwen-auth integrates with OpenCode's
 * plugin system and provider configuration.
 */

import { load, unload, getAuthManager } from "qwen-auth";

/**
 * OpenCode plugin integration example
 *
 * When used as an OpenCode plugin, qwen-auth follows the standard
 * plugin lifecycle:
 *
 * 1. Plugin is loaded via the load() function
 * 2. Plugin provides authentication headers and base URL
 * 3. OpenCode uses these for API requests
 * 4. Plugin is unloaded via unload() when done
 */
async function opencodePluginIntegration() {
  console.log("OpenCode Plugin Integration Example\n");

  // Step 1: Load the plugin
  // OpenCode calls this with the working directory context
  const pluginResult = await load({
    workingDir: process.cwd(),
    debug: process.env.DEBUG === "true",
  });

  console.log("Plugin Result:");
  console.log(`  Provider: ${pluginResult.provider}`);
  console.log(`  Base URL: ${pluginResult.baseUrl}`);
  console.log(`  Headers: Authorization, Content-Type`);

  // Step 2: Use the authentication for API calls
  // OpenCode would use these headers for Qwen model requests
  const authManager = getAuthManager();

  if (authManager) {
    console.log(`\nAuth Status: ${authManager.isAuthenticated() ? "Authenticated" : "Not Authenticated"}`);

    // Get the config for inspection
    const config = authManager.getConfig();
    console.log(`Auth Method: ${config.method}`);
    console.log(`Debug Mode: ${config.debug}`);
    console.log(`International Endpoint: ${config.useInternationalEndpoint}`);
  }

  // Step 3: Unload when done
  await unload();
  console.log("\nPlugin unloaded successfully");
}

/**
 * Example opencode.json configuration for qwen-auth:
 *
 * {
 *   "$schema": "./opencode-schema.json",
 *   "providers": {
 *     "qwen": {
 *       "apiKey": "your-api-key",
 *       // Or use environment variable: process.env.QWEN_API_KEY
 *     }
 *   },
 *   "agents": {
 *     "coder": {
 *       "model": "qwen-coder-plus"
 *     },
 *     "task": {
 *       "model": "qwen-turbo"
 *     }
 *   }
 * }
 */

/**
 * Making requests to Qwen models through OpenCode
 */
async function makeQwenRequest() {
  console.log("\nMaking Qwen API Request Example\n");

  const pluginResult = await load({
    workingDir: process.cwd(),
  });

  // Example: Chat completion request
  const chatRequest = {
    model: "qwen-turbo",
    input: {
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Explain how authentication works in REST APIs."
        }
      ]
    },
    parameters: {
      temperature: 0.7,
      max_tokens: 1024,
    }
  };

  console.log("Request Configuration:");
  console.log(`  URL: ${pluginResult.baseUrl}/services/aigc/text-generation/generation`);
  console.log(`  Method: POST`);
  console.log(`  Model: ${chatRequest.model}`);

  // In actual use, you would make the fetch call:
  // const response = await fetch(url, {
  //   method: 'POST',
  //   headers: pluginResult.headers,
  //   body: JSON.stringify(chatRequest),
  // });

  await unload();
}

// Run if executed directly
if (require.main === module) {
  opencodePluginIntegration()
    .then(() => makeQwenRequest())
    .catch(console.error);
}

export { opencodePluginIntegration, makeQwenRequest };
