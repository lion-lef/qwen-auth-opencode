/**
 * OpenCode Plugin Implementation for Qwen Authentication
 * Follows the OpenCode plugin architecture (similar to codex.ts, antigravity-auth, and gemini-auth)
 *
 * Provides:
 * - Qwen OAuth Device Flow (compatible with chat.qwen.ai)
 * - Headless environment support with appropriate instructions
 * - API Key authentication (for DashScope API)
 * - Request interception for authentication header injection
 * - Debug logging support (set QWEN_AUTH_DEBUG=1 to enable)
 */

import { QwenOAuthDeviceFlow } from "./qwen-oauth";
import { QWEN_PROVIDER_ID, QWEN_MODELS } from "./constants";
import {
  type PluginContext,
  type Hooks,
  type GetAuth,
  type Provider,
  type AuthOAuthResult,
  isOAuthAuth,
  saveCredentials,
  createOAuthFetch,
  OAUTH_DUMMY_KEY,
  applyQwenHeaders,
  openBrowser,
  isHeadlessEnvironment,
  logDebugMessage,
} from "./plugin";

// Re-export for backward compatibility
export { loadCredentials, saveCredentials, clearCredentials, OAUTH_DUMMY_KEY, getCredentialsPath } from "./plugin";

/**
 * Main Qwen Auth Plugin for OpenCode
 * @param input Plugin context from OpenCode
 * @returns Plugin hooks for auth and chat.headers
 */
export async function QwenAuthPlugin(input: PluginContext): Promise<Hooks> {
  return {
    auth: {
      provider: QWEN_PROVIDER_ID,

      /**
       * Loader function called when authentication is needed
       * Handles token refresh and request interception
       */
      async loader(getAuth: GetAuth, provider: Provider) {
        const auth = await getAuth();

        // Filter models to only include Qwen models
        const qwenModelIds = Object.keys(QWEN_MODELS);
        if (provider.models) {
          for (const modelId of Object.keys(provider.models)) {
            if (!qwenModelIds.includes(modelId)) {
              delete provider.models[modelId];
            }
          }
        }

        // If using API key authentication, no special handling needed
        if (!isOAuthAuth(auth)) {
          return {};
        }

        // Return OAuth fetch wrapper
        return {
          apiKey: OAUTH_DUMMY_KEY,
          fetch: createOAuthFetch(getAuth, input.client),
        };
      },

      /**
       * Available authentication methods
       */
      methods: [
        // Qwen OAuth (recommended, free tier)
        {
          label: "Qwen OAuth (Free)",
          type: "oauth" as const,
          async authorize(): Promise<AuthOAuthResult> {
            const flow = new QwenOAuthDeviceFlow();

            try {
              const authInfo = await flow.startAuthorization();

              // Check if running in headless environment
              const isHeadless = isHeadlessEnvironment();
              logDebugMessage(`[Qwen Auth] Headless environment: ${isHeadless}`);

              // Open browser automatically (non-headless only)
              if (!isHeadless) {
                openBrowser(authInfo.verificationUriComplete);
              }

              // Qwen uses device code flow (RFC 8628) - no callback server needed
              // Token exchange happens via polling, not OAuth redirect
              return {
                url: authInfo.verificationUriComplete,
                instructions: isHeadless
                  ? `Visit ${authInfo.verificationUri} and enter code: ${authInfo.userCode}\n\nOr open this URL directly: ${authInfo.verificationUriComplete}`
                  : "Complete the sign-in flow in your browser. We'll automatically detect when you're done.",
                method: "auto" as const,
                async callback() {
                  try {
                    // Poll for tokens using device code flow
                    const credentials = await flow.waitForAuthorization();

                    // Save credentials locally
                    await saveCredentials({
                      type: "oauth",
                      accessToken: credentials.accessToken,
                      refreshToken: credentials.refreshToken,
                      expiresAt: credentials.expiresAt,
                    });

                    logDebugMessage("[Qwen Auth] OAuth authorization successful");

                    return {
                      type: "success" as const,
                      refresh: credentials.refreshToken || "",
                      access: credentials.accessToken,
                      expires: credentials.expiresAt,
                    };
                  } catch (error) {
                    console.error("Qwen OAuth authorization failed:", error);
                    logDebugMessage(`[Qwen Auth] OAuth authorization failed: ${error}`);
                    return { type: "failed" as const };
                  }
                },
              };
            } catch (error) {
              console.error("Failed to start Qwen OAuth flow:", error);
              logDebugMessage(`[Qwen Auth] Failed to start OAuth flow: ${error}`);
              throw error;
            }
          },
        },

        // DashScope API Key
        {
          label: "DashScope API Key",
          type: "api" as const,
          prompts: [
            {
              type: "text" as const,
              key: "apiKey",
              message: "Enter your DashScope API Key",
              placeholder: "sk-...",
              validate(value: string) {
                if (!value || value.trim().length === 0) {
                  return "API key is required";
                }
                if (!value.startsWith("sk-")) {
                  return "Invalid API key format (should start with 'sk-')";
                }
                return undefined;
              },
            },
            {
              type: "select" as const,
              key: "endpoint",
              message: "Select API endpoint",
              options: [
                {
                  label: "China (dashscope.aliyuncs.com)",
                  value: "china",
                  hint: "Use for accounts in mainland China",
                },
                {
                  label: "International (dashscope-intl.aliyuncs.com)",
                  value: "international",
                  hint: "Use for international accounts",
                },
              ],
            },
          ],
          async authorize(inputs?: Record<string, string>) {
            if (!inputs?.apiKey) {
              return { type: "failed" as const };
            }

            // Validate API key format
            const apiKey = inputs.apiKey.trim();
            if (!apiKey.startsWith("sk-")) {
              return { type: "failed" as const };
            }

            // Save credentials locally
            await saveCredentials({
              type: "api_key",
              apiKey: apiKey,
            });

            logDebugMessage("[Qwen Auth] API key authentication successful");

            return {
              type: "success" as const,
              key: apiKey,
            };
          },
        },
      ],
    },

    /**
     * Hook to add custom headers to chat requests
     */
    "chat.headers": async (chatInput, output) => {
      if (chatInput.model.providerID !== QWEN_PROVIDER_ID) return;

      // Add custom headers for Qwen requests
      applyQwenHeaders(output.headers);
    },
  };
}

/**
 * Default export for OpenCode plugin system
 */
export default QwenAuthPlugin;
