/**
 * qwen-auth - OpenCode Authentication Plugin for Qwen Models
 *
 * Root entry point for directory-based plugin loading.
 * This file enables OpenCode to load this plugin directly from
 * the cloned repository directory using Bun's TypeScript support.
 *
 * IMPORTANT: This file ONLY exports the main plugin function and default.
 * OpenCode iterates through all exports and calls them as functions without arguments.
 * Exporting other functions causes errors like:
 * - "Cannot call a class constructor without |new|" (for classes)
 * - "The 'data' argument must be of type string..." (for functions requiring args)
 * - "fn3 is not a function" (for constants)
 *
 * For other utilities, import from sub-modules:
 * @example
 * ```typescript
 * // Main plugin (for OpenCode)
 * import { QwenAuthPlugin } from 'qwen-auth';
 *
 * // Classes (import from sub-modules)
 * import { QwenOAuthDeviceFlow } from 'qwen-auth/src/qwen-oauth';
 * import { ApiKeyAuthProvider } from 'qwen-auth/src/auth';
 *
 * // Functions (import from sub-modules)
 * import { generateCodeVerifier, generatePKCEPair } from 'qwen-auth/src/qwen-oauth';
 * import { loadCredentials, saveCredentials } from 'qwen-auth/src/plugin';
 *
 * // Constants (import from sub-modules)
 * import { QWEN_PROVIDER_ID, QWEN_MODELS } from 'qwen-auth/src/constants';
 * import { ACCESS_TOKEN_EXPIRY_BUFFER_MS } from 'qwen-auth/src/plugin/auth';
 * ```
 */

// Main plugin export - the ONLY function OpenCode should call
export { QwenAuthPlugin, default } from "./src/opencode-plugin";

// Type-only exports (erased at runtime, safe to export)
// These don't cause issues because they don't exist at runtime
export type {
  // Plugin types
  AuthDetails,
  OAuthAuthDetails,
  ApiKeyAuthDetails,
  GetAuth,
  Provider,
  ProviderModel,
  LoaderResult,
  PluginClient,
  PluginContext,
  PluginResult,
  AuthOAuthResult,
  AuthApiResult,
  AuthPrompt,
  AuthMethod,
  AuthHook,
  Hooks,
  StoredCredentials,
  // Debug types
  QwenDebugContext,
  QwenDebugRequestMeta,
  QwenDebugResponseMeta,
} from "./src/plugin";

export type {
  // OAuth types
  QwenCredentials,
  QwenTokenResponse,
  DeviceAuthorizationResponse,
} from "./src/qwen-oauth";

export type {
  // Config types
  QwenAuthConfig,
  ApiKeyConfig,
} from "./src/config";

export type {
  // Auth types
  AuthProvider,
  AuthResult,
  TokenInfo,
  ApiRequestConfig,
} from "./src/auth";

export type {
  // Utility types
  LogLevel,
} from "./src/utils";

export type {
  // Constants types
  QwenModelId,
  AuthMethod as AuthMethodType,
} from "./src/constants";
