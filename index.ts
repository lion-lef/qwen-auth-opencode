/**
 * qwen-auth - OpenCode Authentication Plugin for Qwen Models
 *
 * Root entry point for directory-based plugin loading.
 * This file enables OpenCode to load this plugin directly from
 * the cloned repository directory using Bun's TypeScript support.
 *
 * IMPORTANT: This file ONLY exports functions and types.
 * OpenCode iterates through all exports and calls them as functions.
 * Exporting non-function values (numbers, strings, objects) causes errors like:
 * "fn3 is not a function. (In 'fn3(input)', 'fn3' is 300000)"
 *
 * For constants, use the sub-module imports:
 * - import { ACCESS_TOKEN_EXPIRY_BUFFER_MS } from "qwen-auth/src/plugin/auth"
 * - import { QWEN_PROVIDER_ID, QWEN_MODELS } from "qwen-auth/src/constants"
 *
 * @example
 * ```typescript
 * // For OpenCode plugin registration (recommended)
 * import { QwenAuthPlugin } from 'qwen-auth';
 *
 * // In your opencode.json plugins section:
 * // { "plugins": { "qwen-auth": {} } }
 *
 * // Or for programmatic use:
 * const hooks = await QwenAuthPlugin(pluginInput);
 * ```
 */

// Main plugin export - the primary function OpenCode will call
export { QwenAuthPlugin, default } from "./src/opencode-plugin";

// Credential storage functions
export {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  getCredentialsPath,
} from "./src/opencode-plugin";

// Plugin module exports - ONLY functions and types
export {
  // Type exports (erased at runtime, safe to export)
  type AuthDetails,
  type OAuthAuthDetails,
  type ApiKeyAuthDetails,
  type GetAuth,
  type Provider,
  type ProviderModel,
  type LoaderResult,
  type PluginClient,
  type PluginContext,
  type PluginResult,
  type AuthOAuthResult,
  type AuthApiResult,
  type AuthPrompt,
  type AuthMethod,
  type AuthHook,
  type Hooks,
  type StoredCredentials,
  // Auth helper functions
  isOAuthAuth,
  isApiAuth,
  accessTokenExpired,
  tokenNeedsRefresh,
  calculateExpiresAt,
  // Browser helper functions
  openBrowser,
  isHeadlessEnvironment,
  // Fetch wrapper function
  createOAuthFetch,
  // Header functions
  getUserAgent,
  getDashScopeClient,
  applyQwenHeaders,
  // Debug utilities
  isDebugEnabled,
  getDebugLogPath,
  startQwenDebugRequest,
  logQwenDebugResponse,
  logDebugMessage,
} from "./src/plugin";

// Debug types
export type {
  QwenDebugContext,
  QwenDebugRequestMeta,
  QwenDebugResponseMeta,
} from "./src/plugin";

// Qwen OAuth Device Flow - ONLY functions and types
// NOTE: QwenOAuthDeviceFlow class is NOT exported here because OpenCode calls all exports as functions.
// Import the class directly from the sub-module if needed: import { QwenOAuthDeviceFlow } from "qwen-auth/src/qwen-oauth"
export {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  requestDeviceAuthorization,
  pollDeviceToken,
  refreshAccessToken,
} from "./src/qwen-oauth";
export type {
  QwenCredentials,
  QwenTokenResponse,
  DeviceAuthorizationResponse,
} from "./src/qwen-oauth";

// Configuration exports - ONLY functions and types
export {
  loadConfig,
  validateConfig,
  createDefaultApiKeyConfig,
} from "./src/config";
export type { QwenAuthConfig, ApiKeyConfig } from "./src/config";

// Authentication exports - ONLY functions and types
// NOTE: ApiKeyAuthProvider class is NOT exported here because OpenCode calls all exports as functions.
// Import the class directly from the sub-module if needed: import { ApiKeyAuthProvider } from "qwen-auth/src/auth"
export {
  validateApiKeyFormat,
  maskApiKey,
} from "./src/auth";
export type {
  AuthProvider,
  AuthResult,
  TokenInfo,
  ApiRequestConfig,
} from "./src/auth";

// Utility exports - ONLY functions and types
export { createLogger, getLogger } from "./src/utils";
export type { LogLevel } from "./src/utils";

// Type exports from constants (types are safe, erased at runtime)
export type { QwenModelId, AuthMethod as AuthMethodType } from "./src/constants";
