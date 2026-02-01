/**
 * qwen-auth - OpenCode Authentication Plugin for Qwen Models
 *
 * This plugin provides authentication support for Qwen models through
 * the OpenCode platform. It supports:
 * - Qwen OAuth Device Flow (recommended, compatible with chat.qwen.ai)
 * - DashScope API Key authentication
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

// OpenCode Plugin (main export)
export { QwenAuthPlugin, default as QwenPlugin } from "./opencode-plugin";
export {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  OAUTH_DUMMY_KEY,
  getCredentialsPath,
} from "./opencode-plugin";

// Plugin module exports (new modular structure)
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
} from "./plugin";

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
} from "./qwen-oauth";
export type { QwenCredentials, QwenTokenResponse, DeviceAuthorizationResponse } from "./qwen-oauth";

// Configuration exports
export {
  loadConfig,
  validateConfig,
  createDefaultApiKeyConfig,
  QwenAuthConfigSchema,
} from "./config";
export type { QwenAuthConfig, ApiKeyConfig } from "./config";

// Authentication exports
export { ApiKeyAuthProvider, validateApiKeyFormat, maskApiKey } from "./auth";
export type { AuthProvider, AuthResult, TokenInfo, ApiRequestConfig } from "./auth";

// Utility exports
export { createLogger, getLogger } from "./utils";
export type { LogLevel } from "./utils";

// Constants exports
export {
  QWEN_PROVIDER_ID,
  QWEN_API_ENDPOINTS,
  QWEN_MODELS,
  AUTH_METHODS,
  TOKEN_SETTINGS,
  QWEN_OAUTH_CONFIG,
} from "./constants";
export type { QwenModelId, AuthMethod as AuthMethodType } from "./constants";
