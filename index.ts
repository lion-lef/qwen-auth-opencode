/**
 * qwen-auth - OpenCode Authentication Plugin for Qwen Models
 *
 * Root entry point for directory-based plugin loading.
 * This file enables OpenCode to load this plugin directly from
 * the cloned repository directory using Bun's TypeScript support.
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

// Main plugin export
export { QwenAuthPlugin, default } from "./src/opencode-plugin";
export {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  OAUTH_DUMMY_KEY,
  getCredentialsPath,
} from "./src/opencode-plugin";

// Plugin module exports
export {
  // Type exports
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
  // Auth helpers
  isOAuthAuth,
  isApiAuth,
  accessTokenExpired,
  tokenNeedsRefresh,
  calculateExpiresAt,
  ACCESS_TOKEN_EXPIRY_BUFFER_MS,
  // Browser helpers
  openBrowser,
  isHeadlessEnvironment,
  // Fetch wrapper
  createOAuthFetch,
  // Headers
  getUserAgent,
  getDashScopeClient,
  QWEN_HEADERS,
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

// Qwen OAuth Device Flow
export {
  QwenOAuthDeviceFlow,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  requestDeviceAuthorization,
  pollDeviceToken,
  refreshAccessToken,
  QWEN_OAUTH_CONSTANTS,
} from "./src/qwen-oauth";
export type {
  QwenCredentials,
  QwenTokenResponse,
  DeviceAuthorizationResponse,
} from "./src/qwen-oauth";

// Configuration exports
export {
  loadConfig,
  validateConfig,
  createDefaultApiKeyConfig,
  QwenAuthConfigSchema,
} from "./src/config";
export type { QwenAuthConfig, ApiKeyConfig } from "./src/config";

// Authentication exports
export {
  ApiKeyAuthProvider,
  validateApiKeyFormat,
  maskApiKey,
} from "./src/auth";
export type {
  AuthProvider,
  AuthResult,
  TokenInfo,
  ApiRequestConfig,
} from "./src/auth";

// Utility exports
export { createLogger, getLogger } from "./src/utils";
export type { LogLevel } from "./src/utils";

// Constants exports
export {
  QWEN_PROVIDER_ID,
  QWEN_API_ENDPOINTS,
  QWEN_MODELS,
  AUTH_METHODS,
  TOKEN_SETTINGS,
  QWEN_OAUTH_CONFIG,
} from "./src/constants";
export type { QwenModelId, AuthMethod as AuthMethodType } from "./src/constants";
