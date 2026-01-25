/**
 * qwen-auth - Authentication plugin for OpenCode
 *
 * This plugin provides authentication support for Qwen models through
 * the OpenCode platform. It supports multiple authentication methods:
 * - API Key authentication (simplest)
 * - JWT authentication (for service-to-service)
 * - OAuth 2.0 authentication (for user authorization)
 *
 * @example
 * ```typescript
 * import { load, AuthManager } from 'qwen-auth';
 *
 * // Initialize the plugin
 * const result = await load({ workingDir: process.cwd() });
 *
 * // Use the authentication headers
 * const response = await fetch(`${result.baseUrl}/chat/completions`, {
 *   headers: result.headers,
 *   body: JSON.stringify({ model: 'qwen-turbo', messages: [...] }),
 * });
 * ```
 */

// Main plugin exports
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
} from "./constants";
export type { QwenModelId, AuthMethod } from "./constants";
