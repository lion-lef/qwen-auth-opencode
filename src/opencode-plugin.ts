/**
 * OpenCode Plugin Implementation for Qwen Authentication
 * Follows the OpenCode plugin architecture (similar to codex.ts)
 *
 * Provides:
 * - Qwen OAuth Device Flow (compatible with chat.qwen.ai)
 * - API Key authentication (for DashScope API)
 * - Request interception for authentication header injection
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import {
  QwenOAuthDeviceFlow,
  refreshAccessToken,
  openBrowser,
  type QwenCredentials,
} from "./qwen-oauth";
import { QWEN_PROVIDER_ID, QWEN_MODELS } from "./constants";

// Type definitions matching @opencode-ai/plugin
// These are defined locally to avoid module resolution issues

interface PluginInput {
  client: {
    auth: {
      set(params: { path: { id: string }; body: unknown }): Promise<void>;
    };
  };
  project: unknown;
  directory: string;
  worktree: string;
  serverUrl: URL;
}

interface Provider {
  models: Record<string, { cost?: { input: number; output: number; cache: { read: number; write: number } } }>;
}

interface Auth {
  type: "oauth" | "api";
  refresh?: string;
  access?: string;
  expires?: number;
}

interface AuthOAuthResult {
  url: string;
  instructions: string;
  method: "auto" | "code";
  callback(): Promise<
    | { type: "success"; refresh: string; access: string; expires: number }
    | { type: "success"; key: string }
    | { type: "failed" }
  >;
}

interface AuthApiResult {
  type: "success";
  key: string;
}

interface AuthMethod {
  label: string;
  type: "oauth" | "api";
  prompts?: Array<{
    type: "text" | "select";
    key: string;
    message: string;
    placeholder?: string;
    validate?: (value: string) => string | undefined;
    options?: Array<{ label: string; value: string; hint?: string }>;
  }>;
  authorize?: (inputs?: Record<string, string>) => Promise<AuthOAuthResult | AuthApiResult | { type: "failed" }>;
}

interface AuthHook {
  provider: string;
  loader?: (getAuth: () => Promise<Auth>, provider: Provider) => Promise<{
    apiKey?: string;
    fetch?: (requestInput: Request | URL | string, init?: RequestInit) => Promise<Response>;
  }>;
  methods: AuthMethod[];
}

interface Model {
  providerID: string;
  modelID: string;
}

interface ChatHeadersInput {
  sessionID: string;
  agent: string;
  model: Model;
  provider: unknown;
  message: unknown;
}

interface ChatHeadersOutput {
  headers: Record<string, string>;
}

interface Hooks {
  auth?: AuthHook;
  "chat.headers"?: (input: ChatHeadersInput, output: ChatHeadersOutput) => Promise<void>;
}

// Credential storage path
const QWEN_CREDENTIALS_DIR = ".qwen-auth";
const QWEN_CREDENTIALS_FILE = "credentials.json";

// OAuth dummy key used for OAuth authentication (OpenCode convention)
export const OAUTH_DUMMY_KEY = "sk-oauth-qwen-auth";

/**
 * Stored credentials interface
 */
interface StoredCredentials {
  type: "oauth" | "api_key";
  // OAuth fields
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  // API Key fields
  apiKey?: string;
}

/**
 * Get the credentials file path
 */
function getCredentialsPath(): string {
  return path.join(os.homedir(), QWEN_CREDENTIALS_DIR, QWEN_CREDENTIALS_FILE);
}

/**
 * Load credentials from storage
 */
export async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const credPath = getCredentialsPath();
    const data = await fs.readFile(credPath, "utf-8");
    return JSON.parse(data) as StoredCredentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to storage
 */
export async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  const credPath = getCredentialsPath();
  const dir = path.dirname(credPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(credPath, JSON.stringify(credentials, null, 2));
}

/**
 * Clear stored credentials
 */
export async function clearCredentials(): Promise<void> {
  try {
    const credPath = getCredentialsPath();
    await fs.unlink(credPath);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Main Qwen Auth Plugin for OpenCode
 */
export async function QwenAuthPlugin(input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: QWEN_PROVIDER_ID,

      /**
       * Loader function called when authentication is needed
       * Handles token refresh and request interception
       */
      async loader(getAuth: () => Promise<Auth>, provider: Provider) {
        const auth = await getAuth();

        // Filter models to only include Qwen models
        const qwenModelIds = Object.keys(QWEN_MODELS);
        for (const modelId of Object.keys(provider.models)) {
          if (!qwenModelIds.includes(modelId)) {
            delete provider.models[modelId];
          }
        }

        // If using API key authentication, no special handling needed
        if (auth.type !== "oauth") {
          return {};
        }

        return {
          apiKey: OAUTH_DUMMY_KEY,

          /**
           * Custom fetch function that handles OAuth token refresh and header injection
           */
          async fetch(requestInput: Request | URL | string, init?: RequestInit): Promise<Response> {
            // Remove dummy API key authorization header
            if (init?.headers) {
              if (init.headers instanceof Headers) {
                init.headers.delete("authorization");
                init.headers.delete("Authorization");
              } else if (Array.isArray(init.headers)) {
                init.headers = init.headers.filter(
                  ([key]) => key.toLowerCase() !== "authorization"
                );
              } else {
                delete (init.headers as Record<string, string>)["authorization"];
                delete (init.headers as Record<string, string>)["Authorization"];
              }
            }

            let currentAuth = await getAuth();
            if (currentAuth.type !== "oauth") return fetch(requestInput, init);

            // Check if token needs refresh (5 minutes buffer)
            const refreshBuffer = 5 * 60 * 1000;
            if (!currentAuth.access || !currentAuth.expires || currentAuth.expires < Date.now() + refreshBuffer) {
              if (currentAuth.refresh) {
                try {
                  const tokens = await refreshAccessToken(currentAuth.refresh);
                  await input.client.auth.set({
                    path: { id: QWEN_PROVIDER_ID },
                    body: {
                      type: "oauth",
                      refresh: tokens.refresh_token || currentAuth.refresh,
                      access: tokens.access_token,
                      expires: Date.now() + tokens.expires_in * 1000,
                    },
                  });
                  currentAuth = await getAuth();
                } catch (error) {
                  console.error("Failed to refresh Qwen OAuth token:", error);
                  throw new Error("Qwen OAuth token refresh failed. Please re-authenticate.");
                }
              }
            }

            // Build headers with OAuth token
            const headers = new Headers();
            if (init?.headers) {
              if (init.headers instanceof Headers) {
                init.headers.forEach((value, key) => headers.set(key, value));
              } else if (Array.isArray(init.headers)) {
                for (const [key, value] of init.headers) {
                  if (value !== undefined) headers.set(key, String(value));
                }
              } else {
                for (const [key, value] of Object.entries(init.headers)) {
                  if (value !== undefined) headers.set(key, String(value));
                }
              }
            }

            // Set authorization header with access token
            if (currentAuth.type === "oauth" && currentAuth.access) {
              headers.set("authorization", `Bearer ${currentAuth.access}`);
            }

            return fetch(requestInput, { ...init, headers });
          },
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

              // Open browser automatically
              openBrowser(authInfo.verificationUriComplete);

              return {
                url: authInfo.verificationUriComplete,
                instructions: `Visit ${authInfo.verificationUri} and enter code: ${authInfo.userCode}\n\nOr click the link that opened in your browser.`,
                method: "auto" as const,
                async callback() {
                  try {
                    const credentials = await flow.waitForAuthorization();

                    // Save credentials locally
                    await saveCredentials({
                      type: "oauth",
                      accessToken: credentials.accessToken,
                      refreshToken: credentials.refreshToken,
                      expiresAt: credentials.expiresAt,
                    });

                    return {
                      type: "success" as const,
                      refresh: credentials.refreshToken || "",
                      access: credentials.accessToken,
                      expires: credentials.expiresAt,
                    };
                  } catch (error) {
                    console.error("Qwen OAuth authorization failed:", error);
                    return { type: "failed" as const };
                  }
                },
              };
            } catch (error) {
              console.error("Failed to start Qwen OAuth flow:", error);
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
    "chat.headers": async (chatInput: ChatHeadersInput, output: ChatHeadersOutput) => {
      if (chatInput.model.providerID !== QWEN_PROVIDER_ID) return;

      // Add custom headers for Qwen requests
      output.headers["User-Agent"] = `qwen-auth/1.0.0 (${os.platform()} ${os.release()}; ${os.arch()})`;
      output.headers["X-DashScope-Client"] = "qwen-auth-opencode";
    },
  };
}

/**
 * Default export for OpenCode plugin system
 */
export default QwenAuthPlugin;

/**
 * Export helper functions for external use
 */
export { getCredentialsPath };
