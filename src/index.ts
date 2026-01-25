/**
 * qwen-auth - Authentication plugin for OpenCode
 *
 * This plugin provides authentication support for Qwen models through
 * the OpenCode platform. It supports multiple authentication methods:
 * - Qwen OAuth Device Flow (recommended, compatible with chat.qwen.ai)
 * - API Key authentication (for DashScope API)
 * - JWT authentication (for service-to-service)
 *
 * @example
 * ```typescript
 * // For OpenCode integration (recommended)
 * import { QwenAuthPlugin } from 'qwen-auth';
 *
 * // Register the plugin with OpenCode
 * const hooks = await QwenAuthPlugin(pluginInput);
 *
 * // For standalone usage
 * import { load, AuthManager } from 'qwen-auth';
 *
 * const result = await load({ workingDir: process.cwd() });
 * const response = await fetch(`${result.baseUrl}/chat/completions`, {
 *   headers: result.headers,
 *   body: JSON.stringify({ model: 'qwen-turbo', messages: [...] }),
 * });
 * ```
 */

// OpenCode Plugin (recommended)
export { QwenAuthPlugin, default as QwenPlugin } from "./opencode-plugin";
export {
  loadCredentials as loadPluginCredentials,
  saveCredentials as savePluginCredentials,
  clearCredentials as clearPluginCredentials,
  OAUTH_DUMMY_KEY,
} from "./opencode-plugin";

// Qwen OAuth Device Flow
export {
  QwenOAuthDeviceFlow,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  requestDeviceAuthorization,
  pollDeviceToken,
  refreshAccessToken,
  openBrowser,
  QWEN_OAUTH_CONSTANTS,
  QWEN_OAUTH_PORT,
  QWEN_OAUTH_REDIRECT_PATH,
} from "./qwen-oauth";
export type {
  QwenCredentials,
  QwenTokenResponse,
  DeviceAuthorizationResponse,
} from "./qwen-oauth";

// Legacy plugin exports (for backward compatibility)
export { load, unload, initPlugin, getAuthManager, AuthManager } from "./plugin";
export type { PluginContext, PluginResult } from "./plugin";

// Configuration exports
export {
  loadConfig,
  validateConfig,
  createDefaultApiKeyConfig,
  createDefaultJwtConfig,
  createDefaultOAuthConfig,
  QwenAuthConfigSchema,
} from "./config";
export type {
  QwenAuthConfig,
  ApiKeyConfig,
  JwtConfig,
  OAuthConfig,
  RateLimitConfig,
  SecurityConfig,
} from "./config";

// Authentication exports
export {
  ApiKeyAuthProvider,
  JwtAuthProvider,
  OAuthAuthProvider,
  validateApiKeyFormat,
  maskApiKey,
  validateJwtConfig,
  validateOAuthConfig,
} from "./auth";
export type {
  AuthProvider,
  AuthResult,
  TokenInfo,
  ApiRequestConfig,
  OAuthAuthorizationResponse,
  OAuthTokenResponse,
  JwtClaims,
  AuthEvent,
  AuthEventType,
  AuthEventHandler,
} from "./auth";

// Security exports
export {
  RateLimiter,
  getGlobalRateLimiter,
  encrypt,
  decrypt,
  generateSecureToken,
} from "./security";
export type { EncryptedData } from "./security";

// Storage exports
export {
  loadCredentials,
  saveCredentials,
  deleteCredentials,
  hasCredentials,
} from "./storage";
export type { StoredCredentials } from "./storage";

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
  RATE_LIMIT_CONFIG,
  QWEN_OAUTH_CONFIG,
} from "./constants";
export type { QwenModelId, AuthMethod } from "./constants";
