/**
 * Basic usage example for qwen-auth plugin
 *
 * This example demonstrates how to use the qwen-auth plugin
 * with OpenCode for authenticating with Qwen models.
 */

import { load, AuthManager, createDefaultApiKeyConfig } from "qwen-auth";

/**
 * Example 1: Using the plugin loader (recommended for OpenCode integration)
 */
async function examplePluginLoader() {
  console.log("Example 1: Plugin Loader");
  console.log("========================");

  try {
    // Load the plugin with context
    const result = await load({
      workingDir: process.cwd(),
      debug: true,
    });

    console.log("Plugin loaded successfully!");
    console.log(`Provider: ${result.provider}`);
    console.log(`Base URL: ${result.baseUrl}`);
    console.log("Headers:", Object.keys(result.headers));

    // Use the result to make API calls
    const response = await fetch(`${result.baseUrl}/services/aigc/text-generation/generation`, {
      method: "POST",
      headers: result.headers,
      body: JSON.stringify({
        model: "qwen-turbo",
        input: {
          messages: [
            { role: "user", content: "Hello, how are you?" }
          ]
        }
      }),
    });

    const data = await response.json();
    console.log("Response:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 2: Direct AuthManager usage
 */
async function exampleAuthManager() {
  console.log("\nExample 2: Direct AuthManager Usage");
  console.log("====================================");

  // Create configuration
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.log("Set QWEN_API_KEY environment variable to run this example");
    return;
  }

  const config = createDefaultApiKeyConfig(apiKey);

  // Create and initialize the auth manager
  const authManager = new AuthManager(config);
  await authManager.initialize();

  // Check authentication status
  console.log(`Authenticated: ${authManager.isAuthenticated()}`);

  // Get token
  const token = await authManager.getToken();
  console.log(`Token obtained: ${token ? "Yes" : "No"}`);

  // Get request configuration
  const requestConfig = authManager.getRequestConfig();
  console.log(`Base URL: ${requestConfig.baseUrl}`);

  // Clean up
  await authManager.revoke();
  console.log("Authentication revoked");
}

/**
 * Example 3: Error handling and retry logic
 */
async function exampleErrorHandling() {
  console.log("\nExample 3: Error Handling");
  console.log("=========================");

  const apiKey = process.env.QWEN_API_KEY || "invalid-key-for-demo";
  const config = createDefaultApiKeyConfig(apiKey);

  const authManager = new AuthManager(config);

  try {
    await authManager.initialize();

    // Attempt authentication with rate limiting
    const result = await authManager.authenticate("user-123");

    if (result.success) {
      console.log("Authentication successful!");
    } else {
      console.log(`Authentication failed: ${result.error}`);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

/**
 * Example 4: Token refresh handling
 */
async function exampleTokenRefresh() {
  console.log("\nExample 4: Token Refresh");
  console.log("========================");

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.log("Set QWEN_API_KEY environment variable to run this example");
    return;
  }

  const config = createDefaultApiKeyConfig(apiKey);
  const authManager = new AuthManager(config);
  await authManager.initialize();

  // Simulate periodic token refresh
  console.log("Initial authentication...");
  await authManager.authenticate();

  // API keys don't need refresh, but for JWT/OAuth this would work:
  console.log("Refreshing token...");
  const refreshed = await authManager.refresh();
  console.log(`Token refresh result: ${refreshed}`);

  await authManager.revoke();
}

// Run examples
async function main() {
  console.log("qwen-auth Examples\n");

  // Example 2 works without making actual API calls
  await exampleAuthManager();

  // Example 3 demonstrates error handling
  await exampleErrorHandling();

  // Example 4 demonstrates token refresh
  await exampleTokenRefresh();

  // Example 1 makes actual API calls - uncomment to test
  // await examplePluginLoader();
}

main().catch(console.error);
